import { useEffect, useMemo, useState } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { useNoteStore } from '@/stores/noteStore';
import { Note } from '@/types';

type ViewMode = 'preview' | 'source';
type SortMode = 'updated' | 'created' | 'title';
type DetailMode = 'view' | 'edit';

const difficultyLabels = ['', '很简单', '简单', '中等', '较难', '很难'];

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function noteMatches(note: Note, keyword: string, tag: string, difficulty: string) {
  const normalized = keyword.trim().toLowerCase();
  if (normalized) {
    const haystack = [note.problem.title, note.approach, note.content, ...note.tags]
      .join(' ')
      .toLowerCase();
    if (!haystack.includes(normalized)) return false;
  }
  if (tag && !note.tags.includes(tag)) return false;
  if (difficulty && String(note.difficulty) !== difficulty) return false;
  return true;
}

function parseTags(value: string) {
  return value
    .split(/[，,\n]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export default function NotesLibrary() {
  const { notes, loaded, load, update, remove } = useNoteStore();
  const [keyword, setKeyword] = useState('');
  const [activeTag, setActiveTag] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('updated');
  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  const [detailMode, setDetailMode] = useState<DetailMode>('view');
  const [selectedId, setSelectedId] = useState('');
  const [titleDraft, setTitleDraft] = useState('');
  const [urlDraft, setUrlDraft] = useState('');
  const [difficultyDraft, setDifficultyDraft] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [tagsDraft, setTagsDraft] = useState('');
  const [approachDraft, setApproachDraft] = useState('');
  const [contentDraft, setContentDraft] = useState('');

  useEffect(() => {
    if (!loaded) load();
  }, [loaded, load]);

  const tags = useMemo(() => {
    return [...new Set(notes.flatMap((note) => note.tags))].sort((a, b) => a.localeCompare(b, 'zh-CN'));
  }, [notes]);

  const filteredNotes = useMemo(() => {
    return notes
      .filter((note) => noteMatches(note, keyword, activeTag, difficulty))
      .sort((a, b) => {
        if (sortMode === 'title') return a.problem.title.localeCompare(b.problem.title, 'zh-CN');
        if (sortMode === 'created') return b.createdAt - a.createdAt;
        return b.updatedAt - a.updatedAt;
      });
  }, [notes, keyword, activeTag, difficulty, sortMode]);

  const selectedNote = filteredNotes.find((note) => note.id === selectedId) || filteredNotes[0] || null;

  useEffect(() => {
    if (!selectedNote) {
      setSelectedId('');
      return;
    }
    if (selectedNote.id !== selectedId) setSelectedId(selectedNote.id);
  }, [selectedNote, selectedId]);

  useEffect(() => {
    if (!selectedNote) return;
    setTitleDraft(selectedNote.problem.title);
    setUrlDraft(selectedNote.problem.url || '');
    setDifficultyDraft(selectedNote.difficulty);
    setTagsDraft(selectedNote.tags.join('，'));
    setApproachDraft(selectedNote.approach);
    setContentDraft(selectedNote.content);
    setDetailMode('view');
  }, [selectedNote?.id]);

  const clearFilters = () => {
    setKeyword('');
    setActiveTag('');
    setDifficulty('');
  };

  const handleSave = async () => {
    if (!selectedNote || !titleDraft.trim()) return;
    await update(selectedNote.id, {
      problem: {
        ...selectedNote.problem,
        title: titleDraft.trim(),
        url: urlDraft.trim(),
      },
      difficulty: difficultyDraft,
      tags: parseTags(tagsDraft),
      approach: approachDraft,
      content: contentDraft,
    });
    setDetailMode('view');
  };

  const handleDelete = async () => {
    if (!selectedNote) return;
    await remove(selectedNote.id);
    setDetailMode('view');
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <header className="sticky top-0 z-20 border-b border-sky-200/90 bg-[var(--bg-primary)]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1680px] items-center justify-between px-8 py-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--accent)] to-cyan-300 text-xl text-white shadow-lg shadow-blue-500/20">
              📝
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">LeetSpace</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight">笔记库</h1>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
            <span className="rounded-full bg-white/60 px-4 py-2 shadow-sm">共 {notes.length} 条</span>
            <span className="rounded-full bg-white/60 px-4 py-2 shadow-sm">当前 {filteredNotes.length} 条</span>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1680px] grid-cols-[240px_440px_minmax(680px,1fr)] gap-5 px-8 py-6">
        <aside className="glass-card h-[calc(100vh-132px)] overflow-hidden border border-sky-300/80 p-4 shadow-[0_18px_44px_rgba(56,189,248,0.16)]">
          <div className="mb-4 rounded-2xl bg-gradient-to-br from-sky-300/18 via-cyan-200/14 to-emerald-200/12 p-4">
            <p className="text-sm font-semibold">分类导航</p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">按算法标签快速定位笔记</p>
          </div>
          <div className="h-[calc(100%-92px)] overflow-y-auto pr-1">
            <button
              onClick={() => setActiveTag('')}
              className={`mb-2 flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${!activeTag ? 'bg-[var(--accent)] text-white shadow-lg shadow-blue-500/20' : 'hover:bg-[var(--bg-secondary)]'}`}
            >
              <span>全部笔记</span>
              <span className="text-xs opacity-75">{notes.length}</span>
            </button>
            {tags.map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveTag(tag)}
                className={`mb-1 flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm transition ${activeTag === tag ? 'bg-[var(--accent)] text-white shadow-lg shadow-blue-500/20' : 'hover:bg-[var(--bg-secondary)]'}`}
              >
                <span className="truncate">{tag}</span>
                <span className="text-xs opacity-70">{notes.filter((note) => note.tags.includes(tag)).length}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="glass-card h-[calc(100vh-132px)] overflow-hidden border border-sky-300/80 p-5 shadow-[0_18px_44px_rgba(56,189,248,0.16)]">
          <div className="rounded-3xl bg-white/45 p-4 shadow-sm">
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索题目、思路或笔记内容..."
              className="w-full rounded-2xl border border-transparent bg-white/80 px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-blue-500/10"
            />
            <div className="mt-3 grid grid-cols-2 gap-3">
              <select
                value={difficulty}
                onChange={(event) => setDifficulty(event.target.value)}
                className="rounded-2xl border border-transparent bg-white/80 px-4 py-3 text-sm outline-none"
              >
                <option value="">全部难度</option>
                <option value="1">很简单</option>
                <option value="2">简单</option>
                <option value="3">中等</option>
                <option value="4">较难</option>
                <option value="5">很难</option>
              </select>
              <select
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as SortMode)}
                className="rounded-2xl border border-transparent bg-white/80 px-4 py-3 text-sm outline-none"
              >
                <option value="updated">最近更新</option>
                <option value="created">创建时间</option>
                <option value="title">题目名称</option>
              </select>
            </div>
            {(keyword || activeTag || difficulty) && (
              <button onClick={clearFilters} className="mt-3 text-xs text-[var(--accent)] hover:underline">
                清空筛选
              </button>
            )}
          </div>

          <div className="mt-4 h-[calc(100%-154px)] space-y-3 overflow-y-auto pr-1">
            {filteredNotes.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-sky-300/90 p-10 text-center text-sm text-[var(--text-secondary)]">
                没有匹配的笔记
              </div>
            ) : (
              filteredNotes.map((note) => (
                <button
                  key={note.id}
                  onClick={() => setSelectedId(note.id)}
                  className={`w-full rounded-3xl border p-5 text-left transition ${selectedNote?.id === note.id ? 'border-sky-400 bg-sky-100/70 shadow-lg shadow-sky-300/20' : 'border-sky-200/70 bg-white/65 hover:border-sky-400 hover:bg-white/90'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="line-clamp-1 text-lg font-bold">{note.problem.title}</h2>
                    <span className="shrink-0 text-xs text-[var(--text-secondary)]">{formatDate(note.updatedAt)}</span>
                  </div>
                  {note.approach && <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--text-secondary)]">{note.approach}</p>}
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[var(--bg-primary)] px-3 py-1 text-xs text-[var(--text-secondary)]">
                      {difficultyLabels[note.difficulty]}
                    </span>
                    {note.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="rounded-full bg-[var(--bg-primary)] px-3 py-1 text-xs text-[var(--text-secondary)]">
                        {tag}
                      </span>
                    ))}
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="glass-card h-[calc(100vh-132px)] overflow-hidden border border-sky-300/80 p-6 shadow-[0_18px_44px_rgba(56,189,248,0.16)]">
          {selectedNote ? (
            <div className="flex h-full flex-col">
              <div className="mb-5 flex items-start justify-between gap-5 border-b border-sky-200/90 pb-5">
                <div className="min-w-0">
                  <h2 className="truncate text-3xl font-bold tracking-tight">{selectedNote.problem.title}</h2>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-[var(--text-secondary)]">
                    <span className="rounded-full bg-white/60 px-3 py-1">难度：{difficultyLabels[selectedNote.difficulty]}</span>
                    <span className="rounded-full bg-white/60 px-3 py-1">更新：{formatDate(selectedNote.updatedAt)}</span>
                    {selectedNote.problem.url && (
                      <a href={selectedNote.problem.url} target="_blank" rel="noreferrer" className="rounded-full bg-blue-500/10 px-3 py-1 text-[var(--accent)] hover:bg-blue-500/15">
                        打开题目
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {detailMode === 'view' ? (
                    <>
                      <div className="rounded-2xl bg-white/60 p-1 shadow-sm">
                        <button
                          onClick={() => setViewMode('preview')}
                          className={`rounded-xl px-4 py-2 text-sm ${viewMode === 'preview' ? 'bg-[var(--accent)] text-white shadow-sm' : 'text-[var(--text-secondary)]'}`}
                        >
                          预览
                        </button>
                        <button
                          onClick={() => setViewMode('source')}
                          className={`rounded-xl px-4 py-2 text-sm ${viewMode === 'source' ? 'bg-[var(--accent)] text-white shadow-sm' : 'text-[var(--text-secondary)]'}`}
                        >
                          源码
                        </button>
                      </div>
                      <button
                        onClick={() => setDetailMode('edit')}
                        className="rounded-2xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 hover:bg-[var(--accent-hover)]"
                      >
                        编辑
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setDetailMode('view')}
                        className="rounded-2xl bg-white/60 px-5 py-2.5 text-sm font-semibold text-[var(--text-secondary)] hover:bg-white/80"
                      >
                        取消
                      </button>
                      <button
                        onClick={handleSave}
                        className="rounded-2xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 hover:bg-[var(--accent-hover)]"
                      >
                        保存
                      </button>
                    </>
                  )}
                  <button
                    onClick={handleDelete}
                    className="rounded-2xl px-4 py-2.5 text-sm text-[var(--danger)] hover:bg-red-500/10"
                  >
                    删除
                  </button>
                </div>
              </div>

              {detailMode === 'edit' ? (
                <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                  <div className="grid grid-cols-2 gap-4">
                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold text-[var(--text-secondary)]">题目名称</span>
                      <input
                        value={titleDraft}
                        onChange={(event) => setTitleDraft(event.target.value)}
                        className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 text-sm outline-none focus:border-[var(--accent)]"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold text-[var(--text-secondary)]">题目链接</span>
                      <input
                        value={urlDraft}
                        onChange={(event) => setUrlDraft(event.target.value)}
                        className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 text-sm outline-none focus:border-[var(--accent)]"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold text-[var(--text-secondary)]">个人难度</span>
                      <select
                        value={difficultyDraft}
                        onChange={(event) => setDifficultyDraft(Number(event.target.value) as 1 | 2 | 3 | 4 | 5)}
                        className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 text-sm outline-none focus:border-[var(--accent)]"
                      >
                        <option value={1}>很简单</option>
                        <option value={2}>简单</option>
                        <option value={3}>中等</option>
                        <option value={4}>较难</option>
                        <option value={5}>很难</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold text-[var(--text-secondary)]">标签（逗号分隔）</span>
                      <input
                        value={tagsDraft}
                        onChange={(event) => setTagsDraft(event.target.value)}
                        className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 text-sm outline-none focus:border-[var(--accent)]"
                      />
                    </label>
                  </div>
                  <label className="mt-4 block">
                    <span className="mb-2 block text-xs font-semibold text-[var(--text-secondary)]">解题思路</span>
                    <textarea
                      value={approachDraft}
                      onChange={(event) => setApproachDraft(event.target.value)}
                      rows={3}
                      className="w-full resize-none rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 text-sm leading-6 outline-none focus:border-[var(--accent)]"
                    />
                  </label>
                  <div className="mt-4" data-color-mode="light">
                    <div className="mb-2 text-xs font-semibold text-[var(--text-secondary)]">详细笔记</div>
                    <MDEditor value={contentDraft} onChange={(value) => setContentDraft(value || '')} height={420} preview="live" />
                  </div>
                </div>
              ) : (
                <>
                  {selectedNote.approach && (
                    <div className="mb-5 rounded-3xl border border-sky-200/80 bg-white/70 p-5 shadow-sm">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[var(--text-secondary)]">解题思路</p>
                      <p className="text-sm leading-7">{selectedNote.approach}</p>
                    </div>
                  )}
                  <div className="min-h-0 flex-1 overflow-y-auto rounded-3xl border border-sky-200/80 bg-white/70 p-7 shadow-inner shadow-sky-100/70">
                    {viewMode === 'preview' ? (
                      <div data-color-mode="light" className="leetspace-note-markdown">
                        <MDEditor.Markdown source={selectedNote.content || '暂无详细笔记'} />
                      </div>
                    ) : (
                      <pre className="whitespace-pre-wrap break-words text-sm leading-7 text-[var(--text-primary)]">
                        {selectedNote.content || '暂无详细笔记'}
                      </pre>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-sky-300/90 text-sm text-[var(--text-secondary)]">
              选择一条笔记查看详情
            </div>
          )}
        </section>
      </main>
    </div>
  );
}


