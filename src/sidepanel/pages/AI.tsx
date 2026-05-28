import { useState, useRef, useEffect } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { useSettingsStore } from '@/stores/settingsStore';
import { streamChat, SYSTEM_PROMPT } from '@/services/ai';
import * as storage from '@/services/storage';
import { Message } from '@/types';

type ProblemContext = {
  id: string;
  title: string;
  titleSlug: string;
  difficulty: string;
  url: string;
  tags: string[];
  content: string;
  hints: string[];
  examples: string;
};

const QUICK_ACTIONS = [
  { label: '思路提示', prompt: '请基于当前题面列举 2-3 种可行解题思路，并用「推荐」明确标记最适合的方案。每种思路只写 1-2 句话，不给完整代码。' },
  { label: '解题方法', prompt: '请基于当前题面讲解推荐解法：用 3-5 步说明算法流程，保持简洁，不输出完整代码。' },
  { label: '复杂度', prompt: '请基于当前题面给出推荐解法的时间复杂度和空间复杂度，并各用一句话解释原因。' },
  { label: '避坑点', prompt: '请基于当前题面列出 3 个最容易出错的点，每点一句话。' },
];

const CHAT_STORAGE_PREFIX = 'leetspace:ai-chat:';

function getProblemSlug(url?: string): string | null {
  const match = url?.match(/leetcode\.(?:cn|com)\/problems\/([\w-]+)/);
  return match?.[1] || null;
}

function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
}

async function fetchProblemContextFromGraphQL(slug: string, url: string): Promise<ProblemContext | null> {
  const response = await fetch('https://leetcode.cn/graphql/', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      operationName: 'questionData',
      variables: { titleSlug: slug },
      query: `query questionData($titleSlug: String!) {
        question(titleSlug: $titleSlug) {
          questionId
          questionFrontendId
          title
          titleSlug
          translatedTitle
          translatedContent
          difficulty
          topicTags { name translatedName slug }
          hints
          exampleTestcases
        }
      }`,
    }),
  });

  if (!response.ok) return null;

  const data = await response.json() as {
    data?: {
      question?: {
        questionId?: string;
        questionFrontendId?: string;
        title?: string;
        titleSlug?: string;
        translatedTitle?: string;
        translatedContent?: string;
        difficulty?: string;
        topicTags?: { name?: string; translatedName?: string; slug?: string }[];
        hints?: string[];
        exampleTestcases?: string;
      };
    };
  };

  const question = data.data?.question;
  if (!question?.titleSlug) return null;

  return {
    id: question.questionFrontendId || question.questionId || '',
    title: question.translatedTitle || question.title || question.titleSlug,
    titleSlug: question.titleSlug,
    difficulty: question.difficulty || 'Medium',
    url,
    tags: question.topicTags?.map((tag) => tag.translatedName || tag.name || tag.slug || '').filter(Boolean) || [],
    content: stripHtml(question.translatedContent || ''),
    hints: question.hints || [],
    examples: question.exampleTestcases || '',
  };
}

function buildProblemContextText(problem: ProblemContext): string {
  return `当前 LeetCode 题目：${problem.id ? `${problem.id}. ` : ''}${problem.title}（${problem.difficulty}）
链接：${problem.url}
题目 Slug：${problem.titleSlug}
标签：${problem.tags.length > 0 ? problem.tags.join('、') : '未知'}

题面：
${problem.content || '暂无题面文本'}

示例测试用例：
${problem.examples || '暂无'}

官方提示：
${problem.hints.length > 0 ? problem.hints.join('\n') : '暂无'}

回答要求：
1. 默认使用中文。
2. 默认不超过 150 字，除非用户明确要求详细讲。
3. 优先使用 bullet，先给结论，再给理由。
4. 不重复题面，不输出完整代码，除非用户明确要求。
5. 对经典题直接给主流最优思路。
6. 如果用户代码有明显问题，只指出关键修正方向。`;
}

export default function AI() {
  const aiSettings = useSettingsStore((s) => s.settings.ai);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [problemContext, setProblemContext] = useState<ProblemContext | null>(null);
  const [contextStatus, setContextStatus] = useState<'idle' | 'loading' | 'ready' | 'empty' | 'error'>('idle');
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const chatStorageKey = problemContext?.titleSlug
    ? `${CHAT_STORAGE_PREFIX}${problemContext.titleSlug}`
    : contextStatus === 'empty' || contextStatus === 'error'
      ? `${CHAT_STORAGE_PREFIX}general`
      : '';

  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, autoScroll]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setAutoScroll(isNearBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!chatStorageKey) return;

    let cancelled = false;
    setHistoryLoaded(false);
    storage.get<Message[]>(chatStorageKey).then((saved) => {
      if (cancelled) return;
      setMessages(saved || []);
      setHistoryLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, [chatStorageKey]);

  useEffect(() => {
    if (!chatStorageKey || !historyLoaded) return;
    storage.set(chatStorageKey, messages);
  }, [chatStorageKey, historyLoaded, messages]);

  useEffect(() => {
    (async () => {
      setContextStatus('loading');
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const slug = getProblemSlug(tab?.url);
        if (slug && tab?.url) {
          const detail = await fetchProblemContextFromGraphQL(slug, tab.url);
          if (detail) {
            setProblemContext(detail);
            setContextStatus('ready');
            return;
          }
        }

        if (tab?.id) {
          const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PROBLEM_INFO' });
          if (response) {
            setProblemContext({
              id: response.id || '',
              title: response.title,
              titleSlug: response.titleSlug,
              difficulty: response.difficulty,
              url: response.url,
              tags: response.tags || [],
              content: '',
              hints: [],
              examples: '',
            });
            setContextStatus('ready');
            return;
          }
        }

        setContextStatus('empty');
      } catch {
        setContextStatus('error');
      }
    })();
  }, []);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const systemContent = problemContext
        ? `${SYSTEM_PROMPT}\n\n${buildProblemContextText(problemContext)}`
        : `${SYSTEM_PROMPT}\n\n当前没有自动识别到题面。请先提示用户打开 LeetCode 题目页面，或让用户粘贴题面后再分析。`;

      const apiMessages: Message[] = [
        { role: 'system', content: systemContent },
        ...newMessages,
      ];

      const assistantIndex = newMessages.length;
      setMessages([...newMessages, { role: 'assistant', content: '' }]);

      await streamChat(apiMessages, aiSettings, (chunk) => {
        setMessages((current) => current.map((message, index) => (
          index === assistantIndex
            ? { ...message, content: message.content + chunk }
            : message
        )));
      });
    } catch (err) {
      const errorMessage = `错误：${err instanceof Error ? err.message : '请求失败'}`;
      setMessages((current) => {
        const assistantIndex = newMessages.length;
        if (current[assistantIndex]?.role === 'assistant') {
          return current.map((message, index) => (
            index === assistantIndex ? { ...message, content: errorMessage } : message
          ));
        }
        return [...newMessages, { role: 'assistant', content: errorMessage }];
      });
    } finally {
      setLoading(false);
    }
  };

  const clearCurrentChat = async () => {
    setMessages([]);
    if (chatStorageKey) {
      await storage.remove(chatStorageKey);
    }
  };

  if (!aiSettings.apiKey) {
    return (
      <div className="page-enter text-center py-8">
        <p className="text-[var(--text-secondary)] mb-2">请先在设置中配置 API Key</p>
        <p className="text-xs text-[var(--text-secondary)]">支持 OpenAI / Claude / DeepSeek</p>
      </div>
    );
  }

  return (
    <div className="page-enter flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-lg font-semibold">AI 辅助</h1>
        {messages.length > 0 && (
          <button
            onClick={clearCurrentChat}
            disabled={loading}
            className="text-xs px-2 py-1 rounded-lg border border-[var(--border-glass)] text-[var(--text-secondary)] hover:text-[var(--danger)] hover:bg-[var(--bg-secondary)] disabled:opacity-50"
          >
            清空对话
          </button>
        )}
      </div>

      {contextStatus !== 'idle' && (
        <div className="glass-card px-3 py-2 text-xs text-[var(--text-secondary)] mb-3">
          {contextStatus === 'loading' && '正在识别当前题目...'}
          {contextStatus === 'ready' && problemContext && (
            <span>已识别：{problemContext.id ? `${problemContext.id}. ` : ''}{problemContext.title}（{problemContext.difficulty}）</span>
          )}
          {contextStatus === 'empty' && '未识别到题目：请打开 LeetCode 题目详情页'}
          {contextStatus === 'error' && '题目信息读取失败：可刷新页面或重新加载扩展后重试'}
        </div>
      )}

      <div className="flex gap-1 mb-3 flex-wrap">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.label}
            onClick={() => sendMessage(action.prompt)}
            disabled={loading || contextStatus === 'loading'}
            className="btn-glass px-2 py-1 rounded-lg text-xs bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-glass)] disabled:opacity-50"
          >
            {action.label}
          </button>
        ))}
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto space-y-3 mb-3">
        {messages.length === 0 && (
          <p className="text-center text-[var(--text-secondary)] text-sm py-4">
            点击快捷操作或输入问题开始对话
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`text-sm p-3 rounded-2xl whitespace-pre-wrap list-item-enter shadow-sm ${
              msg.role === 'user'
                ? 'ml-10 bg-[#dff6ff] text-[#06324d] border border-sky-100'
                : 'mr-8 bg-white/90 text-[#06324d] border border-sky-100'
            }`}
          >
            {msg.role === 'assistant' ? (
              <div data-color-mode="light" className="leetspace-ai-markdown">
                {msg.content ? (
                  <MDEditor.Markdown source={msg.content} />
                ) : (
                  <span className="inline-block animate-pulse text-[var(--text-secondary)]">正在生成...</span>
                )}
              </div>
            ) : (
              msg.content
            )}
          </div>
        ))}
        {loading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="mr-8 rounded-2xl border border-sky-100 bg-white/90 p-3 text-sm text-[var(--text-secondary)] shadow-sm">
            <span className="inline-block animate-pulse">思考中...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage(input))}
          placeholder="输入问题..."
          disabled={loading}
          className="flex-1 px-3 py-2 rounded-lg border border-[var(--border-glass)] bg-[var(--glass-bg)] backdrop-blur-sm text-sm text-[var(--text-primary)] disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-opacity-30 transition-all duration-200"
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
          className="btn-glass px-3 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:bg-[var(--accent-hover)] disabled:opacity-50"
        >
          发送
        </button>
      </div>
    </div>
  );
}

