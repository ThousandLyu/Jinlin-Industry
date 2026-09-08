import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const dataFiles = [
  'sources.json',
  'sites.json',
  'people.json',
  'facts.json',
  'timeline.json',
  'map_points.json',
  'scenes.json',
  'courses.json',
  'activities.json',
  'media.json',
  'settings.json',
  'users.json',
  'source_submissions.json',
];
const uploadDirs = ['images', 'courses', 'documents', 'scenes'];
const sourceImportGrades = ['A', 'B', 'C'];

let hasError = false;

function pass(message) {
  console.log(`OK  ${message}`);
}

function warn(message) {
  console.log(`WARN ${message}`);
}

function fail(message) {
  hasError = true;
  console.log(`FAIL ${message}`);
}

function readEnvFile() {
  const envPath = path.join(root, '.env.local');
  if (!fs.existsSync(envPath)) {
    fail('Missing .env.local. Copy .env.example to .env.local and edit the admin password.');
    return new Map();
  }

  const env = new Map();
  const raw = fs.readFileSync(envPath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index === -1) continue;
    env.set(trimmed.slice(0, index), trimmed.slice(index + 1));
  }
  pass('.env.local exists');
  return env;
}

function readSettings() {
  const settingsPath = path.join(root, 'data', 'settings.json');
  if (!fs.existsSync(settingsPath)) return {};
  try {
    const rows = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    if (Array.isArray(rows) && rows[0]) return rows[0];
  } catch {
    return {};
  }
  return {};
}

function checkNode() {
  const major = Number(process.versions.node.split('.')[0]);
  if (major >= 18) pass(`Node.js ${process.versions.node}`);
  else fail(`Node.js ${process.versions.node} is too old. Please install Node.js 18 or newer.`);
}

function checkPackageInstall() {
  if (fs.existsSync(path.join(root, 'node_modules'))) pass('node_modules exists');
  else warn('node_modules is missing. Run: npm install');

  if (fs.existsSync(path.join(root, 'package-lock.json'))) pass('package-lock.json exists');
  else warn('package-lock.json is missing. Run: npm install');
}

function configValue(settings, env, settingsKey, envKey, fallback = '') {
  const setting = settings[settingsKey];
  if (typeof setting === 'string' && setting.length > 0) return setting;
  if (typeof setting === 'number' || typeof setting === 'boolean') return setting;
  return env.get(envKey) || fallback;
}

function checkRuntimeConfig(env, settings) {
  const adminUsername = configValue(settings, env, 'adminUsername', 'ADMIN_USERNAME');
  const adminPassword = configValue(settings, env, 'adminPassword', 'ADMIN_PASSWORD');

  if (adminUsername) pass('admin username is configured');
  else fail('admin username is missing. Configure it in Admin > System Settings or .env.local');

  if (adminPassword) pass('admin password is configured');
  else fail('admin password is missing. Configure it in Admin > System Settings or .env.local');

  if (String(adminPassword).toLowerCase().includes('change')) {
    warn('admin password still looks like a placeholder. Change it before sharing the project.');
  }

  const aiEnabled = typeof settings.aiEnabled === 'boolean' ? settings.aiEnabled : env.get('AI_ENABLED') === 'true';
  if (!aiEnabled) {
    pass('AI is disabled; no API key is required');
    return;
  }

  const baseUrl = configValue(settings, env, 'aiBaseUrl', 'AI_BASE_URL');
  const model = configValue(settings, env, 'aiModel', 'AI_MODEL');
  if (baseUrl) pass(`AI_BASE_URL is configured: ${baseUrl}`);
  else fail('AI_ENABLED=true but AI_BASE_URL is missing');

  if (model) pass(`AI_MODEL is configured: ${model}`);
  else fail('AI_ENABLED=true but AI_MODEL is missing');

  const isLocalModel = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');
  const apiKey = configValue(settings, env, 'aiApiKey', 'AI_API_KEY');
  if (apiKey) pass('AI_API_KEY is configured');
  else if (isLocalModel) pass('AI_API_KEY is empty; this is allowed for local OpenAI-compatible models');
  else warn('AI_API_KEY is empty. Cloud providers usually require an API key.');
}

function checkDataFiles() {
  const dataDir = path.join(root, 'data');
  if (!fs.existsSync(dataDir)) {
    fail('data directory is missing. Run: npm run seed');
    return;
  }
  pass('data directory exists');

  for (const file of dataFiles) {
    const filePath = path.join(dataDir, file);
    if (!fs.existsSync(filePath)) {
      fail(`Missing data/${file}. Run: npm run seed`);
      continue;
    }

    try {
      JSON.parse(fs.readFileSync(filePath, 'utf8'));
      pass(`data/${file} is valid JSON`);
    } catch {
      fail(`data/${file} is not valid JSON. Restore from backup or rerun npm run seed.`);
    }
  }
}

function checkUploadDirs() {
  const base = path.join(root, 'public', 'uploads');
  for (const dir of uploadDirs) {
    const fullPath = path.join(base, dir);
    if (fs.existsSync(fullPath)) pass(`public/uploads/${dir} exists`);
    else warn(`public/uploads/${dir} is missing. It will be created automatically on upload.`);
  }
}

function checkSourceImportDirs(env, settings) {
  const base = configValue(settings, env, 'sourceImportDir', 'SOURCE_IMPORT_DIR') || path.join(root, 'imports', 'sources');
  if (fs.existsSync(base)) pass(`source import directory exists: ${base}`);
  else warn(`source import directory is missing: ${base}. It will be created on first import.`);

  for (const grade of sourceImportGrades) {
    const fullPath = path.join(base, grade);
    if (fs.existsSync(fullPath)) pass(`source import folder ${grade} exists`);
    else warn(`source import folder ${grade} is missing. Create ${fullPath} before importing.`);
  }
}

console.log('Jinling Archive project doctor');
console.log('--------------------------------');

checkNode();
checkPackageInstall();
const env = readEnvFile();
const settings = readSettings();
checkDataFiles();
checkRuntimeConfig(env, settings);
checkUploadDirs();
checkSourceImportDirs(env, settings);

console.log('--------------------------------');
if (hasError) {
  console.log('Result: problems found. Fix the FAIL items above, then run npm run doctor again.');
  process.exit(1);
}

console.log('Result: ready. Start the app with npm run dev, then open http://localhost:3000');
