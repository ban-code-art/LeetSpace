import { Message, Settings } from '@/types';

type StreamChunkHandler = (chunk: string) => void;

function getDefaultBaseUrl(provider: string): string {
  switch (provider) {
    case 'claude': return 'https://api.anthropic.com';
    case 'deepseek': return 'https://api.deepseek.com';
    default: return 'https://api.openai.com';
  }
}

export async function chat(
  messages: Message[],
  aiSettings: Settings['ai']
): Promise<string> {
  const { provider, apiKey, model, baseUrl } = aiSettings;

  if (!apiKey) throw new Error('请先在设置中配置 API Key');

  const url = baseUrl || getDefaultBaseUrl(provider);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (provider === 'claude') {
    headers['x-api-key'] = apiKey;
    headers['anthropic-version'] = '2023-06-01';

    const response = await fetch(`${url}/v1/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        messages: messages.filter((m) => m.role !== 'system').map((m) => ({
          role: m.role,
          content: m.content,
        })),
        system: messages.find((m) => m.role === 'system')?.content,
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.content[0].text;
  }

  headers['Authorization'] = `Bearer ${apiKey}`;

  const response = await fetch(`${url}/v1/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 2048,
    }),
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  return data.choices[0].message.content;
}

function parseOpenAIStreamLine(line: string): string {
  if (!line.startsWith('data:')) return '';

  const payload = line.replace(/^data:\s*/, '').trim();
  if (!payload || payload === '[DONE]') return '';

  try {
    const data = JSON.parse(payload);
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
    return data.choices?.[0]?.delta?.content || '';
  } catch (error) {
    if (error instanceof Error && error.message) throw error;
    return '';
  }
}

function parseClaudeStreamLine(line: string): string {
  if (!line.startsWith('data:')) return '';

  const payload = line.replace(/^data:\s*/, '').trim();
  if (!payload || payload === '[DONE]') return '';

  try {
    const data = JSON.parse(payload);
    if (data.type === 'error') throw new Error(data.error?.message || 'Claude 请求失败');
    if (data.type === 'content_block_delta') return data.delta?.text || '';
    return '';
  } catch (error) {
    if (error instanceof Error && error.message) throw error;
    return '';
  }
}

async function readTextStream(
  response: Response,
  parseLine: (line: string) => string,
  onChunk: StreamChunkHandler
): Promise<string> {
  if (!response.body) {
    throw new Error('当前浏览器不支持流式响应');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || '';

    for (const line of lines) {
      const chunk = parseLine(line.trim());
      if (!chunk) continue;
      fullText += chunk;
      onChunk(chunk);
    }
  }

  const remaining = decoder.decode();
  if (remaining) buffer += remaining;

  for (const line of buffer.split(/\r?\n/)) {
    const chunk = parseLine(line.trim());
    if (!chunk) continue;
    fullText += chunk;
    onChunk(chunk);
  }

  return fullText;
}

export async function streamChat(
  messages: Message[],
  aiSettings: Settings['ai'],
  onChunk: StreamChunkHandler
): Promise<string> {
  const { provider, apiKey, model, baseUrl } = aiSettings;

  if (!apiKey) throw new Error('请先在设置中配置 API Key');

  const url = baseUrl || getDefaultBaseUrl(provider);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (provider === 'claude') {
    headers['x-api-key'] = apiKey;
    headers['anthropic-version'] = '2023-06-01';

    const response = await fetch(`${url}/v1/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        stream: true,
        messages: messages.filter((m) => m.role !== 'system').map((m) => ({
          role: m.role,
          content: m.content,
        })),
        system: messages.find((m) => m.role === 'system')?.content,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.error?.message || `请求失败：${response.status}`);
    }

    return readTextStream(response, parseClaudeStreamLine, onChunk);
  }

  headers['Authorization'] = `Bearer ${apiKey}`;

  const response = await fetch(`${url}/v1/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 2048,
      stream: true,
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error?.message || `请求失败：${response.status}`);
  }

  return readTextStream(response, parseOpenAIStreamLine, onChunk);
}

export const SYSTEM_PROMPT = `你是一个算法学习助手。你的职责是辅助用户理解算法题目，而不是直接给出答案。

规则：
1. 当用户请求"思路提示"时，只给出解题方向和关键思路，不给完整代码
2. 当用户请求"复杂度分析"时，分析时间和空间复杂度
3. 当用户请求"解法对比"时，列出不同解法的优劣
4. 回答简洁明了，使用中文
5. 适当使用 Markdown 格式`;
