import { PlanItem as PlanItemType } from '@/types';
import { usePlanStore } from '@/stores/planStore';
import { useNoteStore } from '@/stores/noteStore';

interface Props {
  item: PlanItemType;
  onOpenNote?: (problem: PlanItemType['problem']) => void;
}

const difficultyStyles = {
  Easy: 'border-emerald-500/15 bg-emerald-500/5 text-emerald-600',
  Medium: 'border-amber-500/15 bg-amber-500/5 text-amber-600',
  Hard: 'border-rose-500/15 bg-rose-500/5 text-rose-600',
};

const difficultyDots = {
  Easy: 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]',
  Medium: 'bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.5)]',
  Hard: 'bg-rose-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]',
};

export default function PlanItem({ item, onOpenNote }: Props) {
  const { toggle, remove } = usePlanStore();
  const notes = useNoteStore((s) => s.notes);
  const problemKey = item.problem.titleSlug || item.problem.id || item.problem.title;
  const hasNote = notes.some((note) => {
    const noteKey = note.problem.titleSlug || note.problem.id || note.problem.title;
    return noteKey === problemKey;
  });

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-white/80 bg-white/60 px-3 py-2 shadow-sm transition-all duration-300 hover:bg-white/95 hover:shadow-[0_4px_16px_rgba(56,189,248,0.06)] list-item-enter hover:translate-y-[-0.5px]">
      <button
        onClick={() => toggle(item.id)}
        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 spring-transition ${
          item.status === 'done'
            ? 'bg-[var(--success)] border-[var(--success)] text-white scale-110 shadow-[0_2px_8px_rgba(16,185,129,0.35)]'
            : 'border-sky-100 bg-white hover:border-[var(--accent)] hover:scale-115'
        }`}
      >
        {item.status === 'done' && <span className="text-[9px] font-bold leading-none">✓</span>}
      </button>

      <div className="flex-1 min-w-0 flex items-center gap-2">
        <a
          href={item.problem.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`min-w-0 flex-1 truncate text-sm font-medium hover:text-[var(--accent)] transition-colors ${
            item.status === 'done' ? 'line-through text-[var(--text-secondary)] opacity-60' : 'text-[var(--text-primary)]'
          }`}
        >
          {item.problem.id ? `${item.problem.id}. ` : ''}{item.problem.title}
        </a>
        <span className={`shrink-0 flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-bold ${difficultyStyles[item.problem.difficulty]}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${difficultyDots[item.problem.difficulty]}`} />
          {item.problem.difficulty}
        </span>
      </div>

      <button
        onClick={() => onOpenNote?.(item.problem)}
        className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold spring-transition ${
          hasNote
            ? 'bg-sky-500/10 text-sky-600 hover:bg-sky-500/20 shadow-sm'
            : 'bg-white border border-slate-200 text-[var(--text-secondary)] hover:text-sky-500 hover:border-sky-300 hover:scale-[1.05]'
        }`}
        title={hasNote ? '查看笔记' : '创建笔记'}
      >
        {hasNote ? '📝 已记' : '✏️ 笔记'}
      </button>

      <button
        onClick={() => remove(item.id)}
        className="h-6 w-6 flex-shrink-0 rounded-full text-sm text-[var(--text-secondary)] spring-transition hover:bg-red-500/10 hover:text-[var(--danger)] hover:scale-110"
      >
        ✕
      </button>
    </div>
  );
}
