import { getAppConfig } from '@/lib/appConfig';

export interface AIProviderMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIProviderResult {
  content: string;
  provider: 'local' | 'cloud';
  model: string;
}

export interface AIInvokeOptions {
  timeoutMs?: number;
  maxTokens?: number;
  allowCloudFallback?: boolean;
}

export async function* streamAI(messages: AIProviderMessage[], options: AIInvokeOptions = {}): AsyncGenerator<string> {
  const config = await getAppConfig();
  if (!config.aiEnabled) {
    throw new Error('AI is not enabled.');
  }

  try {
    yield* streamOpenAICompatible({
      baseUrl: config.aiBaseUrl,
      apiKey: config.aiApiKey,
      model: config.aiModel,
      timeoutMs: options.timeoutMs || config.aiTimeoutMs,
      temperature: config.aiTemperature,
      maxTokens: options.maxTokens,
      messages,
      provider: 'local',
    });
  } catch (localError) {
    if (options.allowCloudFallback === false || !canUseCloud(config)) {
      throw localError;
    }
    yield* streamOpenAICompatible({
      baseUrl: config.cloudAiBaseUrl,
      apiKey: config.cloudAiApiKey,
      model: config.cloudAiModel,
      timeoutMs: options.timeoutMs || config.aiTimeoutMs,
      temperature: config.aiTemperature,
      maxTokens: options.maxTokens,
      messages,
      provider: 'cloud',
    });
  }
}

export async function invokeAI(messages: AIProviderMessage[], options: AIInvokeOptions = {}): Promise<AIProviderResult> {
  const config = await getAppConfig();
  if (!config.aiEnabled) {
    throw new Error('AI is not enabled. Set AI_ENABLED=true and configure a local model.');
  }

  try {
    return await invokeOpenAICompatible({
      baseUrl: config.aiBaseUrl,
      apiKey: config.aiApiKey,
      model: config.aiModel,
      timeoutMs: options.timeoutMs || config.aiTimeoutMs,
      temperature: config.aiTemperature,
      maxTokens: options.maxTokens,
      messages,
      provider: 'local',
    });
  } catch (localError) {
    if (options.allowCloudFallback === false || !canUseCloud(config)) {
      throw localError;
    }
    try {
      if (config.cloudAiProtocol === 'claude') {
        return await invokeClaude({
          baseUrl: config.cloudAiBaseUrl,
          apiKey: config.cloudAiApiKey,
          model: config.cloudAiModel,
          timeoutMs: options.timeoutMs || config.aiTimeoutMs,
          temperature: config.aiTemperature,
          maxTokens: options.maxTokens,
          messages,
        });
      }
      return await invokeOpenAICompatible({
        baseUrl: config.cloudAiBaseUrl,
        apiKey: config.cloudAiApiKey,
        model: config.cloudAiModel,
        timeoutMs: options.timeoutMs || config.aiTimeoutMs,
        temperature: config.aiTemperature,
        maxTokens: options.maxTokens,
        messages,
        provider: 'cloud',
      });
    } catch (cloudError) {
      throw new Error(`本地模型失败：${String(localError)}；云端 fallback 失败：${String(cloudError)}`);
    }
  }
}

async function invokeOpenAICompatible(options: {
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
  temperature: number;
  maxTokens?: number;
  messages: AIProviderMessage[];
  provider: 'local' | 'cloud';
}): Promise<AIProviderResult> {
  if (!options.model) throw new Error('AI_MODEL is not configured');
  if (!options.baseUrl) throw new Error('AI_BASE_URL is not configured');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (options.apiKey) headers.Authorization = `Bearer ${options.apiKey}`;

    const response = await fetch(`${options.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model: options.model,
        messages: options.messages,
        temperature: options.temperature,
        ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`AI request failed: ${response.status} ${detail}`);
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      throw new Error('AI response did not include message content');
    }
    return { content: content.trim(), provider: options.provider, model: options.model };
  } finally {
    clearTimeout(timeout);
  }
}

async function invokeClaude(options: {
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
  temperature: number;
  maxTokens?: number;
  messages: AIProviderMessage[];
}): Promise<AIProviderResult> {
  const system = options.messages.filter(item => item.role === 'system').map(item => item.content).join('\n\n');
  const messages = options.messages
    .filter(item => item.role !== 'system')
    .map(item => ({ role: item.role === 'assistant' ? 'assistant' : 'user', content: item.content }));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    const response = await fetch(`${options.baseUrl.replace(/\/$/, '')}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': options.apiKey,
        'anthropic-version': '2023-06-01',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: options.model,
        max_tokens: options.maxTokens || 2048,
        temperature: options.temperature,
        system,
        messages,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`Claude request failed: ${response.status} ${detail}`);
    }

    const payload = await response.json();
    const content = payload?.content?.map((item: any) => item?.text || '').join('').trim();
    if (!content) throw new Error('Claude response did not include text content');
    return { content, provider: 'cloud', model: options.model };
  } finally {
    clearTimeout(timeout);
  }
}

function canUseCloud(config: Awaited<ReturnType<typeof getAppConfig>>): boolean {
  return Boolean(
    config.cloudAiEnabled &&
    config.cloudAiBaseUrl &&
    config.cloudAiApiKey &&
    config.cloudAiModel
  );
}

type StreamOptions = {
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
  temperature: number;
  maxTokens?: number;
  messages: AIProviderMessage[];
  provider: 'local' | 'cloud';
};

async function* streamOpenAICompatible(options: StreamOptions): AsyncGenerator<string> {
  if (!options.model) throw new Error('AI_MODEL is not configured');
  if (!options.baseUrl) throw new Error('AI_BASE_URL is not configured');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (options.apiKey) headers.Authorization = `Bearer ${options.apiKey}`;

    const response = await fetch(`${options.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model: options.model,
        messages: options.messages,
        temperature: options.temperature,
        stream: true,
        ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`AI stream request failed: ${response.status} ${detail}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body for stream');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);
        if (data === '[DONE]') return;
        try {
          const json = JSON.parse(data);
          const content = json.choices?.[0]?.delta?.content;
          if (content) yield content;
        } catch { /* skip malformed SSE lines */ }
      }
    }
  } finally {
    clearTimeout(timeout);
  }
}
