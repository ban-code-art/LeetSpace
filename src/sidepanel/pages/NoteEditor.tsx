import { useState } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { useNoteStore } from '@/stores/noteStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { generateNote } from '@/services/noteGenerator';
import { Note, Problem } from '@/types';

interface Props {
  note: Note | null;
  initialProblem?: Problem | null;
  onClose: () => void;
}

const COMMON_TAGS = ['数组', '字符串', '哈希表', '双指针', '二分查找', '动态规划', '贪心', '回溯', 'BFS', 'DFS', '栈', '队列', '链表', '树', '图', '排序', '滑动窗口', '前缀和', '单调栈', '并查集'];
const difficultyLabels = ['', '很简单', '简单', '中等', '较难', '很难'];

type EditorPreviewMode = 'edit' | 'preview' | 'live';

export default function NoteEditor({ note, initialProblem, onClose }: Props) {
  const { add, update } = useNoteStore();
  const settings = useSettingsStore((s) => s.settings);

  const [title, setTitle] = useState(note?.problem.title || initialProblem?.title || '');
  const [url, setUrl] = useState(note?.problem.url || initialProblem?.url || '');
  const [difficulty, setDifficulty] = useState<1 | 2 | 3 | 4 | 5>(note?.difficulty || 3);
  const [approach] = useState(note?.approach || '');
  const [content, setContent] = useState(note?.content || '');
  const [tags, setTags] = useState<string[]>(note?.tags || []);
  const [customTag, setCustomTag] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [previewMode, setPreviewMode] = useState<EditorPreviewMode>('edit');
  const [showDetails, setShowDetails] = useState(false);

  const toggleTag = (tag: string) => {
    setTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  };

  const addCustomTag = () => {
    const t = customTag.trim();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
    }
    setCustomTag('');
  };

  const handleSave = async () => {
    if (!title.trim()) return;

    if (note) {
      await update(note.id, { content, approach, tags, difficulty });
    } else {
      const problem: Problem = {
        id: initialProblem?.id || '',
        title: title.trim(),
        titleSlug: initialProblem?.titleSlug || '',
        difficulty: initialProblem?.difficulty || 'Medium',
        tags: initialProblem?.tags || [],
        url,
      };
      await add(problem, content, approach, tags, difficulty);
    }
    onClose();
  };

  const handleAddFromPage = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PROBLEM_INFO' });
      if (response) {
        setTitle(response.title);
        setUrl(response.url);
      }
    } catch { /* not on leetcode page */ }
  };

  const handleAiGenerate = async () => {
    if (!title.trim() || aiGenerating) return;
    if (!settings.ai.apiKey) return;

    setAiGenerating(true);
    try {
      const problem: Problem = {
        id: '',
        title: title.trim(),
        titleSlug: '',
        difficulty: 'Medium',
        tags: [],
        url,
      };
      const result = await generateNote(problem, settings);
      if (result) {
        setContent(content ? content + '\n\n' + result : result);
      }
    } finally {
      setAiGenerating(false);
    }
  };

  const editorHeight = showDetails ? 420 : 620;

  return (
    <div className="flex h-full min-h-0 flex-col slide-up-enter">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button onClick={onClose} className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
          ← 返回
        </button>
        <div className="flex shrink-0 gap-2">
          {settings.ai.apiKey && (
            <button
              onClick={handleAiGenerate}
              disabled={aiGenerating || !title.trim()}
              className="px-3 py-1.5 rounded-lg bg-sky-400 text-white text-sm font-medium hover:bg-sky-500 disabled:opacity-50"
            >
              {aiGenerating ? 'AI 生成中...' : 'AI 生成笔记'}
            </button>
          )}
          <button
            onClick={handleSave}
            className="px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:bg-[var(--accent-hover)]"
          >
            保存
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="rounded-2xl border border-[var(--border-glass)] bg-[var(--glass-bg)] p-3">
          <button
            onClick={() => setShowDetails((value) => !value)}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold">{title || '未命名题目'}</h2>
              <p className="mt-1 truncate text-xs text-[var(--text-secondary)]">
                {difficultyLabels[difficulty]} · {tags.length > 0 ? tags.join(' / ') : '未分类'}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-[var(--bg-secondary)] px-2 py-1 text-xs text-[var(--text-secondary)]">
              {showDetails ? '收起' : '基础信息'}
            </span>
          </button>
        </div>

        {showDetails && (
          <div className="space-y-3 rounded-2xl border border-[var(--border-glass)] bg-[var(--glass-bg)] p-3">
            <div className="flex gap-2">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="题目名称"
                className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)]"
              />
              {!note && (
                <button
                  onClick={handleAddFromPage}
                  className="rounded-xl border border-[var(--border)] px-3 py-2 text-xs hover:bg-[var(--bg-secondary)]"
                  title="从当前页面获取"
                >
                  📄
                </button>
              )}
            </div>

            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="题目链接（可选）"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)]"
            />

            <div>
              <label className="mb-1 block text-xs text-[var(--text-secondary)]">个人难度评分</label>
              <div className="flex gap-1">
                {([1, 2, 3, 4, 5] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`h-8 w-8 rounded-lg text-sm font-medium ${
                      d <= difficulty ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs text-[var(--text-secondary)]">算法标签</label>
              <div className="mb-2 flex gap-1 overflow-x-auto pb-1 whitespace-nowrap">
                {COMMON_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`shrink-0 rounded-full px-3 py-1 text-xs ${
                      tags.includes(tag) ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <div className="flex gap-1">
                <input
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomTag())}
                  placeholder="自定义标签"
                  className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-xs text-[var(--text-primary)]"
                />
                <button onClick={addCustomTag} className="rounded-xl bg-[var(--bg-secondary)] px-3 py-2 text-xs">+</button>
              </div>
            </div>
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="mb-1 flex items-center justify-between">
            <label className="block text-xs text-[var(--text-secondary)]">详细笔记</label>
            <div className="flex rounded-lg bg-[var(--bg-secondary)] p-0.5">
              {([
                ['edit', '源码'],
                ['preview', '预览'],
                ['live', '分屏'],
              ] as const).map(([mode, label]) => (
                <button
                  key={mode}
                  onClick={() => setPreviewMode(mode)}
                  className={`rounded-md px-2 py-1 text-xs transition ${previewMode === mode ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)]'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div data-color-mode="light" className="min-h-0 flex-1">
            <MDEditor
              value={content}
              onChange={(val) => setContent(val || '')}
              height={editorHeight}
              preview={previewMode}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

