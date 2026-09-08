import { db } from '@/lib/dataService';

export interface AppConfig {
  siteTitle: string;
  siteDescription: string;
  projectIntro: string;
  contactInfo: string;
  footerText: string;
  aiEnabled: boolean;
  aiBaseUrl: string;
  aiApiKey: string;
  aiModel: string;
  aiTimeoutMs: number;
  aiTemperature: number;
  cloudAiEnabled: boolean;
  cloudAiBaseUrl: string;
  cloudAiApiKey: string;
  cloudAiModel: string;
  cloudAiProtocol: 'claude' | string;
  sourceImportDir: string;
  adminUsername: string;
  adminPassword: string;
  adminRegistrationKey: string;
  adminName: string;
  adminGender: 'male' | 'female' | 'other';
  adminPhone: string;
  adminEmail: string;
}

export async function getAppConfig(): Promise<AppConfig> {
  const settings = (await db.settings.getAll())[0] as any || {};

  return {
    siteTitle: value(settings.siteTitle, settings.siteName, process.env.SITE_TITLE, '金陵工脉'),
    siteDescription: value(settings.siteDescription, settings.subtitle, ''),
    projectIntro: value(settings.projectIntro, settings.aboutText, ''),
    contactInfo: value(settings.contactInfo, settings.contactEmail, ''),
    footerText: value(settings.footerText, ''),
    aiEnabled: booleanValue(settings.aiEnabled, process.env.AI_ENABLED === 'true'),
    aiBaseUrl: value(settings.aiBaseUrl, process.env.AI_BASE_URL, 'http://localhost:11434/v1'),
    aiApiKey: value(settings.aiApiKey, process.env.AI_API_KEY, ''),
    aiModel: value(settings.aiModel, process.env.AI_MODEL, 'qwen2.5:7b'),
    aiTimeoutMs: numberValue(settings.aiTimeoutMs, process.env.AI_TIMEOUT_MS, 60000),
    aiTemperature: numberValue(settings.aiTemperature, process.env.AI_TEMPERATURE, 0.2),
    cloudAiEnabled: booleanValue(settings.cloudAiEnabled, process.env.CLOUD_AI_ENABLED === 'true'),
    cloudAiBaseUrl: value(settings.cloudAiBaseUrl, process.env.CLOUD_AI_BASE_URL, ''),
    cloudAiApiKey: value(settings.cloudAiApiKey, process.env.CLOUD_AI_API_KEY, ''),
    cloudAiModel: value(settings.cloudAiModel, process.env.CLOUD_AI_MODEL, ''),
    cloudAiProtocol: value(settings.cloudAiProtocol, process.env.CLOUD_AI_PROTOCOL, 'claude'),
    sourceImportDir: value(settings.sourceImportDir, process.env.SOURCE_IMPORT_DIR, ''),
    adminUsername: value(settings.adminUsername, process.env.ADMIN_USERNAME, 'admin'),
    adminPassword: value(settings.adminPassword, process.env.ADMIN_PASSWORD, ''),
    adminRegistrationKey: value(settings.adminRegistrationKey, process.env.ADMIN_REGISTRATION_KEY, 'JLMZGY_TSL'),
    adminName: value(settings.adminName, settings.adminUsername, process.env.ADMIN_USERNAME, 'admin'),
    adminGender: settings.adminGender === 'female' || settings.adminGender === 'other' ? settings.adminGender : 'male',
    adminPhone: value(settings.adminPhone, ''),
    adminEmail: value(settings.adminEmail, ''),
  };
}

export async function getSettingsRecordId(): Promise<string | null> {
  const settings = await db.settings.getAll();
  return settings[0]?.id || null;
}

function value(...items: Array<string | undefined | null>): string {
  for (const item of items) {
    if (typeof item === 'string' && item.length > 0) return item;
  }
  return '';
}

function numberValue(...items: Array<string | number | undefined | null>): number {
  for (const item of items) {
    if (typeof item === 'number' && Number.isFinite(item)) return item;
    if (typeof item === 'string' && item.trim()) {
      const parsed = Number(item);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return 0;
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value === 'true';
  return fallback;
}
