import { Problem, Settings } from '@/types';
import { chat } from './ai';

export function buildNotePrompt(problem: Problem): string {
  return `题目：${problem.title}（${problem.difficulty}）
链接：${problem.url}

请根据以下要求生成简洁的刷题笔记，每个部分用 ## 标题分隔，内容精炼不啰嗦：

- 核心知识点：这道题考察的核心算法/数据结构是什么，为什么适用，用1-2句话说明
- 解题思路：用通俗易懂的语言分步骤描述解题思路，避免晦涩术语，让初学者也能理解
- 核心代码讲解：讲解代码中最关键的几行逻辑，说明为什么这样写
- 复杂度分析：分析时间复杂度和空间复杂度，简要说明原因

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
  const { ai } = settings;
  if (!ai.apiKey) return '';

  const prompt = buildNotePrompt(problem);

  const content = await chat(
    [{ role: 'user', content: prompt }],
    ai
  );

  return content;
}
