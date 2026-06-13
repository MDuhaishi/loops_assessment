import OpenAI from 'openai';
import http from 'http';
import https from 'https';
import { z } from 'zod';

const DASHSCOPE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
const OLLAMA_URL = 'http://localhost:11434/v1';

function getBaseURL(): string {
  return process.env.QWEN_BASE_URL ?? (process.env.OLLAMA_MODE === 'true' ? OLLAMA_URL : DASHSCOPE_URL);
}

function isOllama(): boolean {
  const base = process.env.QWEN_BASE_URL ?? '';
  return process.env.OLLAMA_MODE === 'true' || base.includes('11434');
}

function getOllamaHost(): string {
  const base = process.env.QWEN_BASE_URL ?? OLLAMA_URL;
  const match = base.match(/^(https?:\/\/[^/]+)/);
  return match ? match[1] : 'http://localhost:11434';
}

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    const apiKey = process.env.QWEN_API_KEY ?? (isOllama() ? 'ollama' : undefined);
    if (!apiKey) throw new Error('QWEN_API_KEY is not set');
    _client = new OpenAI({ apiKey, baseURL: getBaseURL() });
  }
  return _client;
}

export function isQwenAvailable(): boolean {
  if (isOllama()) return true;
  return !!(process.env.QWEN_API_KEY);
}

export function getVisionModel(): string {
  return process.env.QWEN_VISION_MODEL ?? (isOllama() ? 'qwen3.5:9b-q4_K_M' : 'qwen-vl-plus');
}

export function getTextModel(): string {
  return process.env.QWEN_TEXT_MODEL ?? (isOllama() ? 'qwen2.5:7b-instruct' : 'qwen-plus');
}

function parseJsonWithRepair(raw: string): unknown {
  const cleaned = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, '')  // strip qwen3 thinking blocks
    .replace(/^```(?:json)?\s*/i, '')            // strip markdown code fences
    .replace(/\s*```$/, '')
    .trim();
  return JSON.parse(cleaned);
}

// ─── Ollama native vision API (avoids thinking-mode token exhaustion) ─────────
// qwen3.5 uses all tokens on thinking in the OpenAI-compat endpoint;
// the native /api/chat endpoint supports think:false which disables it.

interface OllamaMessage {
  role: string;
  content: string;
  images?: string[];
}

function ollamaPost(host: string, path: string, body: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = new URL(host);
    const transport = url.protocol === 'https:' ? https : http;
    const bodyBuf = Buffer.from(body, 'utf-8');
    const req = transport.request({
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': bodyBuf.length,
      },
    }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf-8');
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`Ollama API error: ${res.statusCode} — ${text.slice(0, 300)}`));
        } else {
          resolve(text);
        }
      });
    });
    req.on('error', reject);
    req.write(bodyBuf);
    req.end();
  });
}

async function callOllamaNativeVision<T>(
  schema: z.ZodType<T>,
  systemPrompt: string,
  userText: string,
  imageBase64: string,
  model: string,
): Promise<T> {
  const host = getOllamaHost();
  const messages: OllamaMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userText, images: [imageBase64] },
  ];

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await ollamaPost(
      host,
      '/api/chat',
      JSON.stringify({ model, messages, think: false, stream: false, options: { num_ctx: 16384 } }),
    );

    const data = JSON.parse(raw) as { message?: { content?: string } };
    const content = data.message?.content ?? '';

    try {
      const parsed = parseJsonWithRepair(content);
      return schema.parse(parsed);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error(`[qwen vision] Parse attempt ${attempt + 1} failed: ${lastError.message}`);
      console.error(`[qwen vision] Raw content (first 500 chars): ${content.slice(0, 500)}`);
      if (attempt === 0) {
        messages.push(
          { role: 'assistant', content },
          { role: 'user', content: `Your response was not valid JSON matching the required schema. Error: ${lastError.message}. Respond with ONLY valid JSON, strictly following the schema shown in the system prompt.` },
        );
      }
    }
  }

  throw lastError ?? new Error('Failed to get valid vision response from Ollama');
}

// Pre-warms the vision model at 16384 context so the first real request doesn't race the reload.
export async function warmupVisionModel(): Promise<void> {
  if (!isOllama()) return;
  const host = getOllamaHost();
  const model = getVisionModel();
  try {
    await ollamaPost(host, '/api/chat', JSON.stringify({
      model, messages: [{ role: 'user', content: 'Ready.' }],
      think: false, stream: false, options: { num_ctx: 16384 },
    }));
    console.log(`[qwen] Vision model warmed up at num_ctx=16384`);
  } catch (err) {
    console.warn('[qwen] Vision warm-up failed (non-fatal):', err instanceof Error ? err.message : err);
  }
}

// ─── OpenAI-compatible text calls ─────────────────────────────────────────────

async function callWithRetry<T>(
  schema: z.ZodType<T>,
  messages: OpenAI.ChatCompletionMessageParam[],
  model: string,
  temperature = 0.1,
): Promise<T> {
  const client = getClient();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const completion = await client.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: 8192,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content ?? '';
    try {
      const parsed = parseJsonWithRepair(content);
      return schema.parse(parsed);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error(`[qwen] Parse attempt ${attempt + 1} failed: ${lastError.message}`);
      console.error(`[qwen] Raw content (first 500 chars): ${content.slice(0, 500)}`);
      if (attempt === 0) {
        messages = [
          ...messages,
          { role: 'assistant', content },
          {
            role: 'user',
            content: `Your response was not valid JSON matching the required schema. Error: ${lastError.message}. Please respond with ONLY valid JSON.`,
          },
        ];
      }
    }
  }

  throw lastError ?? new Error('Failed to get valid response from Qwen');
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function runVisionExtraction<T>(
  schema: z.ZodType<T>,
  systemPrompt: string,
  userText: string,
  imageBase64: string,
  _mimeType: 'image/png' | 'image/jpeg' = 'image/png',
): Promise<T> {
  const model = getVisionModel();

  // Ollama native API handles vision + think:false correctly;
  // the OpenAI-compat endpoint causes qwen3.5 to exhaust tokens in thinking mode
  if (isOllama()) {
    return callOllamaNativeVision(schema, systemPrompt, userText, imageBase64, model);
  }

  return callWithRetry(
    schema,
    [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:image/png;base64,${imageBase64}` },
          },
          { type: 'text', text: userText },
        ],
      },
    ],
    model,
    0.1,
  );
}

export async function runTextCompletion<T>(
  schema: z.ZodType<T>,
  systemPrompt: string,
  userPrompt: string,
  temperature = 0.2,
): Promise<T> {
  return callWithRetry(
    schema,
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    getTextModel(),
    temperature,
  );
}
