import { Message, Settings } from '@/types';

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

export const SYSTEM_PROMPT = `你是一个算法学习助手。你的职责是辅助用户理解算法题目，而不是直接给出答案。

规则：
1. 当用户请求"思路提示"时，只给出解题方向和关键思路，不给完整代码
2. 当用户请求"复杂度分析"时，分析时间和空间复杂度
3. 当用户请求"解法对比"时，列出不同解法的优劣
4. 回答简洁明了，使用中文
5. 适当使用 Markdown 格式`;
