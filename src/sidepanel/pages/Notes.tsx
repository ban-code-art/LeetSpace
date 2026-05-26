import { useState, useEffect } from 'react';
import { useNoteStore } from '@/stores/noteStore';
import NoteCard from '../components/NoteCard';
import NoteEditor from './NoteEditor';
import { Note, Problem } from '@/types';

interface Props {
  initialProblem?: Problem | null;
  onInitialProblemHandled?: () => void;
}

export default function Notes({ initialProblem, onInitialProblemHandled }: Props) {
  const { notes, loaded, load } = useNoteStore();
  const [editing, setEditing] = useState<Note | null>(null);
  const [initialEditingProblem, setInitialEditingProblem] = useState<Problem | null>(null);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');

  const openFullNotes = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/notes/index.html') });
  };

  useEffect(() => {
    if (!loaded) load();
  }, [loaded, load]);

  useEffect(() => {
    if (!initialProblem || !loaded) return;
    const existing = notes.find((note) => {
      const noteKey = note.problem.titleSlug || note.problem.id || note.problem.title;
      const problemKey = initialProblem.titleSlug || initialProblem.id || initialProblem.title;
      return noteKey === problemKey;
    });
    if (existing) {
      setEditing(existing);
      setCreating(false);
      setInitialEditingProblem(null);
    } else {
      setEditing(null);
      setCreating(true);
      setInitialEditingProblem(initialProblem);
    }
    onInitialProblemHandled?.();
  }, [initialProblem, loaded, notes, onInitialProblemHandled]);

  if (editing || creating) {
    return (
      <NoteEditor
        note={editing}
        initialProblem={initialEditingProblem}
        onClose={() => { setEditing(null); setCreating(false); setInitialEditingProblem(null); }}
      />
    );
  }

  const allTags = [...new Set(notes.flatMap((n) => n.tags))].sort();

  const filtered = notes
    .filter((n) => {
      if (filter && !n.problem.title.toLowerCase().includes(filter.toLowerCase()) &&
          !n.approach.toLowerCase().includes(filter.toLowerCase())) return false;
      if (tagFilter && !n.tags.includes(tagFilter)) return false;
      return true;
    })
    .sort((a, b) => b.updatedAt - a.updatedAt);

  const recentNotes = filtered.slice(0, 5);

  return (
    <div className="page-enter">
      <div className="flex items-start justify-between mb-4 gap-3">
        <div>
          <h1 className="text-lg font-semibold">笔记</h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">最近熟悉的笔记 · 共 {notes.length} 条</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={openFullNotes}
            className="px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] text-sm font-medium hover:bg-white/80"
          >
            查看全部
          </button>
          <button
            onClick={() => setCreating(true)}
            className="btn-glass px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:bg-[var(--accent-hover)]"
          >
            新建
          </button>
        </div>
      </div>

      <div className="glass-card p-3 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">最近笔记</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">侧边栏仅展示最近 5 条，完整管理请打开笔记库</p>
          </div>
          <span className="text-xs text-[var(--text-secondary)]">{recentNotes.length}/{filtered.length}</span>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="搜索题目或思路..."
          className="w-full px-3 py-2 rounded-lg border border-[var(--border-glass)] bg-[var(--glass-bg)] backdrop-blur-sm text-sm text-[var(--text-primary)] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-opacity-30"
        />
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setTagFilter('')}
              className={`tag-chip px-2 py-0.5 rounded-full text-xs ${!tagFilter ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'}`}
            >
              全部
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setTagFilter(tag === tagFilter ? '' : tag)}
                className={`tag-chip px-2 py-0.5 rounded-full text-xs ${tag === tagFilter ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'}`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-[var(--text-secondary)] py-8">
          {notes.length === 0 ? '还没有笔记，点击「新建」开始记录' : '没有匹配的笔记'}
        </p>
      ) : (
        <div className="space-y-2 stagger-list">
          {recentNotes.map((note) => (
            <NoteCard key={note.id} note={note} onEdit={() => setEditing(note)} />
          ))}
          {filtered.length > recentNotes.length && (
            <button
              onClick={openFullNotes}
              className="w-full rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-secondary)] py-3 text-sm text-[var(--accent)] hover:border-[var(--accent)]/50"
            >
              查看剩余 {filtered.length - recentNotes.length} 条笔记
            </button>
          )}
        </div>
      )}
    </div>
  );
}
