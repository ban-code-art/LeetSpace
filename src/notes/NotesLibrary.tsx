import { useEffect, useMemo, useState } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { useNoteStore } from '@/stores/noteStore';
import { Note } from '@/types';

type ViewMode = 'preview' | 'source';
type SortMode = 'updated' | 'created' | 'title';
type DetailMode = 'view' | 'edit';

const difficultyLabels = ['', '很简单', '简单', '中等', '较难', '很难'];

const difficultyPills = [
  '',
  'bg-emerald-500/8 text-emerald-600 border border-emerald-500/15', // 很简单
  'bg-teal-500/8 text-teal-600 border border-teal-500/15',       // 简单
  'bg-amber-500/8 text-amber-600 border border-amber-500/15',     // 中等
  'bg-orange-500/8 text-orange-600 border border-orange-500/15',   // 较难
  'bg-rose-500/8 text-rose-600 border border-rose-500/15',       // 很难
];

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
    <div className="min-h-screen bg-slate-50 text-[var(--text-primary)]">
      <header className="sticky top-0 z-20 border-b border-sky-100/80 bg-white/80 backdrop-blur-xl shadow-sm">
        <div className="mx-auto flex max-w-[1680px] items-center justify-between px-8 py-4">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-500 text-lg text-white shadow-lg shadow-blue-500/25">
              📝
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-sky-500">LeetSpace</p>
              <h1 className="mt-0.5 text-2xl font-black tracking-tight text-[#06324d]">大智慧笔记库</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="rounded-xl bg-sky-50 border border-sky-100/60 px-4 py-2 text-sky-600 shadow-sm">共 {notes.length} 条笔记</span>
            <span className="rounded-xl bg-emerald-50 border border-emerald-100/60 px-4 py-2 text-emerald-600 shadow-sm">当前筛选 {filteredNotes.length} 条</span>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1680px] grid-cols-[250px_450px_minmax(680px,1fr)] gap-6 px-8 py-6">
        {/* Left Column: Tag Categories */}
        <aside className="glass-card h-[calc(100vh-120px)] overflow-hidden border border-white p-4 bg-white/70 shadow-md">
          <div className="mb-4 rounded-2xl bg-gradient-to-br from-sky-300/15 via-cyan-200/10 to-emerald-200/10 p-4 border border-sky-100/40">
            <p className="text-sm font-bold text-[#06324d]">分类导航</p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">按算法标签快速定位笔记</p>
          </div>
          <div className="h-[calc(100%-92px)] overflow-y-auto pr-1 space-y-1">
            <button
              onClick={() => setActiveTag('')}
              className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-xs font-bold spring-transition ${
                !activeTag
                  ? 'bg-gradient-to-r from-sky-400 to-blue-500 text-white shadow-lg shadow-blue-500/15 scale-[1.02]'
                  : 'text-slate-600 bg-white/55 border border-transparent hover:border-slate-200/60 hover:bg-white hover:text-sky-500'
              }`}
            >
              <span>全部笔记</span>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${!activeTag ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{notes.length}</span>
            </button>
            {tags.map((tag) => {
              const isSelected = activeTag === tag;
              const count = notes.filter((note) => note.tags.includes(tag)).length;
              return (
                <button
                  key={tag}
                  onClick={() => setActiveTag(tag)}
                  className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-xs font-semibold spring-transition ${
                    isSelected
                      ? 'bg-gradient-to-r from-sky-400 to-blue-500 text-white shadow-lg shadow-blue-500/15 scale-[1.02]'
                      : 'text-slate-600 bg-white/55 border border-transparent hover:border-slate-200/60 hover:bg-white hover:text-sky-500'
                  }`}
                >
                  <span className="truncate">{tag}</span>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Middle Column: Notes List */}
        <section className="glass-card h-[calc(100vh-120px)] overflow-hidden border border-white p-5 bg-white/70 shadow-md">
          <div className="rounded-2xl bg-white border border-slate-100 p-4 shadow-sm">
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索题目、思路或笔记内容..."
              className="w-full rounded-xl border border-slate-200/60 bg-slate-50 px-4 py-3 text-xs font-semibold outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-400/10"
            />
            <div className="mt-3 grid grid-cols-2 gap-3">
              <select
                value={difficulty}
                onChange={(event) => setDifficulty(event.target.value)}
                className="rounded-xl border border-slate-200/60 bg-slate-50 px-4 py-2.5 text-xs font-semibold outline-none focus:border-sky-400 focus:bg-white"
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
                className="rounded-xl border border-slate-200/60 bg-slate-50 px-4 py-2.5 text-xs font-semibold outline-none focus:border-sky-400 focus:bg-white"
              >
                <option value="updated">最近更新</option>
                <option value="created">创建时间</option>
                <option value="title">题目名称</option>
              </select>
            </div>
            {(keyword || activeTag || difficulty) && (
              <button onClick={clearFilters} className="mt-2.5 text-xs font-bold text-sky-500 hover:text-sky-600 hover:underline">
                ✕ 清空所有筛选
              </button>
            )}
          </div>

          <div className="mt-4 h-[calc(100%-145px)] space-y-3 overflow-y-auto pr-1">
            {filteredNotes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-sky-300/40 p-10 text-center text-xs font-semibold text-slate-400 bg-white/40">
                没有匹配的笔记
              </div>
            ) : (
              filteredNotes.map((note) => {
                const isSelected = selectedNote?.id === note.id;
                return (
                  <button
                    key={note.id}
                    onClick={() => setSelectedId(note.id)}
                    className={`w-full rounded-2xl border p-4 text-left spring-transition hover:translate-y-[-1px] ${
                      isSelected
                        ? 'border-sky-300 bg-sky-50/70 shadow-md shadow-sky-300/10'
                        : 'border-slate-100 bg-white/80 hover:border-sky-200 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h2 className={`line-clamp-1 text-sm font-extrabold ${isSelected ? 'text-[#06324d]' : 'text-slate-800'}`}>{note.problem.title}</h2>
                      <span className="shrink-0 text-[10px] font-bold text-slate-400">{formatDate(note.updatedAt)}</span>
                    </div>
                    {note.approach && <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500 bg-slate-50/40 p-2 rounded-lg">{note.approach}</p>}
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${difficultyPills[note.difficulty] || ''}`}>
                        {difficultyLabels[note.difficulty]}
                      </span>
                      {note.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="rounded-full bg-slate-100/80 border border-slate-200/50 px-2 py-0.5 text-[9px] font-bold text-slate-500">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        {/* Right Column: Note Reader/Editor */}
        <section className="glass-card h-[calc(100vh-120px)] overflow-hidden border border-white p-6 bg-white/70 shadow-md">
          {selectedNote ? (
            <div className="flex h-full flex-col">
              <div className="mb-5 flex items-start justify-between gap-5 border-b border-slate-200/60 pb-5">
                <div className="min-w-0">
                  <h2 className="truncate text-2xl font-black text-[#06324d] tracking-tight">{selectedNote.problem.title}</h2>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
                    <span className="rounded-xl bg-white/80 border border-slate-200/60 px-3 py-1">难度：{difficultyLabels[selectedNote.difficulty]}</span>
                    <span className="rounded-xl bg-white/80 border border-slate-200/60 px-3 py-1">更新：{formatDate(selectedNote.updatedAt)}</span>
                    {selectedNote.problem.url && (
                      <a href={selectedNote.problem.url} target="_blank" rel="noreferrer" className="rounded-xl bg-sky-500/10 px-3 py-1 text-sky-600 border border-sky-200/30 hover:bg-sky-500/15 spring-transition">
                        打开力扣 🔗
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {detailMode === 'view' ? (
                    <>
                      <div className="rounded-xl bg-slate-100/80 p-0.5 border border-slate-200/50 flex">
                        <button
                          onClick={() => setViewMode('preview')}
                          className={`rounded-lg px-3 py-1.5 text-xs font-bold spring-transition ${viewMode === 'preview' ? 'bg-white text-sky-600 shadow-sm border border-slate-200/20' : 'text-slate-500'}`}
                        >
                          预览
                        </button>
                        <button
                          onClick={() => setViewMode('source')}
                          className={`rounded-lg px-3 py-1.5 text-xs font-bold spring-transition ${viewMode === 'source' ? 'bg-white text-sky-600 shadow-sm border border-slate-200/20' : 'text-slate-500'}`}
                        >
                          源码
                        </button>
                      </div>
                      <button
                        onClick={() => setDetailMode('edit')}
                        className="rounded-xl bg-gradient-to-r from-sky-400 to-blue-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/15 hover:from-sky-500 hover:to-blue-600 spring-transition active:scale-95"
                      >
                        编辑
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setDetailMode('view')}
                        className="rounded-xl bg-white border border-slate-200/80 px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 spring-transition active:scale-95"
                      >
                        取消
                      </button>
                      <button
                        onClick={handleSave}
                        className="rounded-xl bg-gradient-to-r from-sky-400 to-blue-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/15 hover:from-sky-500 hover:to-blue-600 spring-transition active:scale-95"
                      >
                        保存
                      </button>
                    </>
                  )}
                  <button
                    onClick={handleDelete}
                    className="rounded-xl px-3 py-2 text-xs font-semibold text-[var(--danger)] hover:bg-red-500/10 spring-transition active:scale-95"
                  >
                    删除
                  </button>
                </div>
              </div>

              {detailMode === 'edit' ? (
                <div className="min-h-0 flex-1 overflow-y-auto pr-1 pb-10 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <label className="block">
                      <span className="mb-2 block text-xs font-bold text-[var(--text-secondary)]">题目名称</span>
                      <input
                        value={titleDraft}
                        onChange={(event) => setTitleDraft(event.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-2.5 text-xs outline-none focus:border-[var(--accent)]"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-xs font-bold text-[var(--text-secondary)]">题目链接</span>
                      <input
                        value={urlDraft}
                        onChange={(event) => setUrlDraft(event.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-2.5 text-xs outline-none focus:border-[var(--accent)]"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-xs font-bold text-[var(--text-secondary)]">个人难度</span>
                      <select
                        value={difficultyDraft}
                        onChange={(event) => setDifficultyDraft(Number(event.target.value) as 1 | 2 | 3 | 4 | 5)}
                        className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-2.5 text-xs outline-none focus:border-[var(--accent)]"
                      >
                        <option value={1}>很简单</option>
                        <option value={2}>简单</option>
                        <option value={3}>中等</option>
                        <option value={4}>较难</option>
                        <option value={5}>很难</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-xs font-bold text-[var(--text-secondary)]">标签（逗号分隔）</span>
                      <input
                        value={tagsDraft}
                        onChange={(event) => setTagsDraft(event.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-2.5 text-xs outline-none focus:border-[var(--accent)]"
                      />
                    </label>
                  </div>
                  <label className="block">
                    <span className="mb-2 block text-xs font-bold text-[var(--text-secondary)]">解题思路</span>
                    <textarea
                      value={approachDraft}
                      onChange={(event) => setApproachDraft(event.target.value)}
                      rows={3}
                      className="w-full resize-none rounded-xl border border-slate-200 bg-white/80 px-4 py-2.5 text-xs leading-relaxed outline-none focus:border-[var(--accent)]"
                    />
                  </label>
                  <div className="mt-4" data-color-mode="light">
                    <div className="mb-2 text-xs font-bold text-[var(--text-secondary)]">详细笔记</div>
                    <MDEditor value={contentDraft} onChange={(value) => setContentDraft(value || '')} height={420} preview="live" />
                  </div>
                </div>
              ) : (
                <div className="min-h-0 flex-1 overflow-y-auto pr-1 pb-10 space-y-5">
                  {selectedNote.approach && (
                    <div className="rounded-2xl border border-sky-100 bg-sky-50/40 p-5 shadow-sm relative overflow-hidden">
                      <div className="absolute -right-4 -top-4 text-5xl opacity-[0.06] select-none pointer-events-none">💡</div>
                      <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-sky-600">💡 解题思路摘要</p>
                      <p className="text-xs leading-relaxed text-slate-700 font-medium">{selectedNote.approach}</p>
                    </div>
                  )}
                  <div className="rounded-2xl border border-slate-200/60 bg-white/80 p-6 shadow-sm min-h-[300px]">
                    {viewMode === 'preview' ? (
                      <div data-color-mode="light" className="leetspace-note-markdown">
                        <MDEditor.Markdown source={selectedNote.content || '暂无详细笔记'} />
                      </div>
                    ) : (
                      <pre className="whitespace-pre-wrap break-words text-xs leading-relaxed font-mono text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100">
                        {selectedNote.content || '暂无详细笔记'}
                      </pre>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 p-10 text-center text-xs font-semibold text-slate-400 bg-white/40">
              <span className="text-4xl mb-3">📂</span>
              选择左侧或中栏列表的一条笔记查看详情
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
