export function parseLooseJsonObject(raw: unknown): Record<string, unknown> | null {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }

  const text = String(raw ?? '').trim();
  if (!text) return null;

  const candidates = buildJsonCandidates(text);
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // Continue through progressively looser candidates.
    }
  }

  return null;
}

function buildJsonCandidates(text: string): string[] {
  const withoutFence = stripMarkdownFence(text);
  const objectText = extractBalancedObject(withoutFence) || extractGreedyObject(withoutFence) || withoutFence;
  const normalized = normalizeJsonText(objectText);
  const escaped = escapeRawStringControls(normalized);
  const withoutTrailingCommas = escaped.replace(/,\s*([}\]])/g, '$1');

  return uniqueNonEmpty([
    withoutFence,
    objectText,
    normalized,
    escaped,
    withoutTrailingCommas,
  ]);
}

function stripMarkdownFence(text: string): string {
  return text
    .replace(/^\s*```(?:json|JSON)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
}

function extractBalancedObject(text: string): string | null {
  const start = text.indexOf('{');
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i += 1) {
    const char = text[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;
    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;
    if (depth === 0) return text.slice(start, i + 1).trim();
  }

  return null;
}

function extractGreedyObject(text: string): string | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  return text.slice(start, end + 1).trim();
}

function normalizeJsonText(text: string): string {
  return text
    .replace(/^\uFEFF/, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
}

function escapeRawStringControls(text: string): string {
  let output = '';
  let inString = false;
  let escaped = false;

  for (const char of text) {
    if (escaped) {
      output += char;
      escaped = false;
      continue;
    }

    if (char === '\\') {
      output += char;
      escaped = true;
      continue;
    }

    if (char === '"') {
      output += char;
      inString = !inString;
      continue;
    }

    if (inString) {
      if (char === '\n') {
        output += '\\n';
      } else if (char === '\t') {
        output += '\\t';
      } else if (char.charCodeAt(0) < 32) {
        output += ' ';
      } else {
        output += char;
      }
      continue;
    }

    output += char;
  }

  return output;
}

function uniqueNonEmpty(values: string[]): string[] {
  return Array.from(new Set(values.map(value => value.trim()).filter(Boolean)));
}
