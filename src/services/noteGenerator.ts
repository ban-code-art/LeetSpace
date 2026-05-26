import { Problem, NotePromptOption, Settings } from '@/types';
import { chat } from './ai';

export function buildNotePrompt(problem: Problem, prompts: NotePromptOption[]): string {
  const enabledPrompts = prompts.filter((p) => p.enabled);
  if (enabledPrompts.length === 0) return '';

  const sections = enabledPrompts.map((p) => `- ${p.label}：${p.prompt}`).join('\n');

  return `题目：${problem.title}（${problem.difficulty}）
链接：${problem.url}

请根据以下要求生成简洁的刷题笔记，每个部分用 ## 标题分隔，内容精炼不啰嗦：

${sections}

要求：
1. 语言通俗易懂，避免晦涩术语
2. 每个部分控制在3-5句话以内
3. 重点突出核心知识点
4. 使用 Markdown 格式`;
}

export async function generateNote(
  problem: Problem,
  settings: Settings
): Promise<string> {
  const { ai, notePrompts } = settings;
  if (!ai.apiKey || !notePrompts.some((p) => p.enabled)) return '';

  const prompt = buildNotePrompt(problem, notePrompts);
  if (!prompt) return '';

  const content = await chat(
    [{ role: 'user', content: prompt }],
    ai
  );

  return content;
}
