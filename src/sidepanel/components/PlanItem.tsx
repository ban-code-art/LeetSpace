import { PlanItem as PlanItemType } from '@/types';
import { usePlanStore } from '@/stores/planStore';
import { useNoteStore } from '@/stores/noteStore';

interface Props {
  item: PlanItemType;
  onOpenNote?: (problem: PlanItemType['problem']) => void;
}

const difficultyColors = {
  Easy: 'bg-green-500/10 text-green-500',
  Medium: 'bg-yellow-500/10 text-yellow-500',
  Hard: 'bg-red-500/10 text-red-500',
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
    <div className="flex items-center gap-2 rounded-2xl border border-white/70 bg-white/70 px-3 py-2.5 shadow-sm transition-colors hover:bg-white/90 list-item-enter">
      <button
        onClick={() => toggle(item.id)}
        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 ${
          item.status === 'done'
            ? 'bg-[var(--success)] border-[var(--success)] text-white scale-110'
            : 'border-blue-200 bg-white hover:border-[var(--accent)] hover:scale-110'
        }`}
      >
        {item.status === 'done' && <span className="text-[10px] leading-none">✓</span>}
      </button>

      <div className="flex-1 min-w-0 flex items-center gap-2">
        <a
          href={item.problem.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`min-w-0 flex-1 truncate text-sm font-medium hover:text-[var(--accent)] transition-colors ${
            item.status === 'done' ? 'line-through text-[var(--text-secondary)]' : ''
          }`}
        >
          {item.problem.id ? `${item.problem.id}. ` : ''}{item.problem.title}
        </a>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${difficultyColors[item.problem.difficulty]}`}>
          {item.problem.difficulty}
        </span>
      </div>

      <button
        onClick={() => onOpenNote?.(item.problem)}
        className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-medium transition-colors ${
          hasNote
            ? 'bg-blue-500/10 text-blue-600'
            : 'bg-white text-[var(--text-secondary)] hover:text-[var(--accent)]'
        }`}
        title={hasNote ? '查看笔记' : '创建笔记'}
      >
        {hasNote ? '已记' : '笔记'}
      </button>

      <button
        onClick={() => remove(item.id)}
        className="h-6 w-6 flex-shrink-0 rounded-full text-sm text-[var(--text-secondary)] transition-all duration-150 hover:bg-red-500/10 hover:text-[var(--danger)]"
      >
        ✕
      </button>
    </div>
  );
}
