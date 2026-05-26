import { useState } from 'react';
import { usePlanStore } from '@/stores/planStore';
import { Problem } from '@/types';

export default function AddPlanButton() {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const add = usePlanStore((s) => s.add);

  const handleAddFromPage = async () => {
    setLoading(true);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;

      const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PROBLEM_INFO' });
      if (response) {
        const today = new Date().toISOString().slice(0, 10);
        await add({ problem: response as Problem, date: today });
        setShowForm(false);
      }
    } catch {
      setShowForm(true);
    } finally {
      setLoading(false);
    }
  };

  const handleManualAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const title = form.get('title') as string;
    const url = form.get('url') as string;
    const difficulty = form.get('difficulty') as 'Easy' | 'Medium' | 'Hard';

    if (!title.trim()) return;

    const today = new Date().toISOString().slice(0, 10);
    await add({
      problem: {
        id: '',
        title: title.trim(),
        titleSlug: '',
        difficulty,
        tags: [],
        url: url || '',
      },
      date: today,
    });
    setShowForm(false);
  };

  return (
    <div>
      {!showForm ? (
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <button
            onClick={handleAddFromPage}
            disabled={loading}
            className="btn-glass btn-primary-gradient rounded-2xl px-4 py-3 text-sm font-semibold disabled:opacity-50"
          >
            {loading ? '获取中...' : '⊕ 从当前页面添加'}
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="btn-glass btn-secondary-soft rounded-2xl px-4 py-3 text-sm font-semibold"
          >
            ＋ 手动添加
          </button>
        </div>
      ) : (
        <form onSubmit={handleManualAdd} className="slide-up-enter glass-card space-y-3 p-4">
          <input
            name="title"
            placeholder="题目名称"
            required
            className="w-full px-3 py-2 rounded-lg border border-[var(--border-glass)] bg-[var(--glass-bg)] backdrop-blur-sm text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-opacity-30 transition-all duration-200"
          />
          <input
            name="url"
            placeholder="题目链接（可选）"
            className="w-full px-3 py-2 rounded-lg border border-[var(--border-glass)] bg-[var(--glass-bg)] backdrop-blur-sm text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-opacity-30 transition-all duration-200"
          />
          <select
            name="difficulty"
            defaultValue="Medium"
            className="w-full px-3 py-2 rounded-lg border border-[var(--border-glass)] bg-[var(--glass-bg)] backdrop-blur-sm text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-opacity-30 transition-all duration-200"
          >
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
          <div className="flex gap-2">
            <button
              type="submit"
              className="btn-glass btn-primary-gradient flex-1 rounded-xl py-2 text-sm font-semibold"
            >
              添加
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="btn-glass btn-secondary-soft rounded-xl px-3 py-2 text-sm"
            >
              取消
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
