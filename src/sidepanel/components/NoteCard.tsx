import { Note } from '@/types';
import { useNoteStore } from '@/stores/noteStore';

interface Props {
  note: Note;
  onEdit: () => void;
}

const difficultyLabels = ['', '很简单', '简单', '中等', '较难', '很难'];

const difficultyPills = [
  '',
  'bg-emerald-500/8 text-emerald-600 border border-emerald-500/15', // 很简单
  'bg-teal-500/8 text-teal-600 border border-teal-500/15',       // 简单
  'bg-amber-500/8 text-amber-600 border border-amber-500/15',     // 中等
  'bg-orange-500/8 text-orange-600 border border-orange-500/15',   // 较难
  'bg-rose-500/8 text-rose-600 border border-rose-500/15',       // 很难
];

export default function NoteCard({ note, onEdit }: Props) {
  const remove = useNoteStore((s) => s.remove);

  return (
    <div
      className="glass-card p-4 cursor-pointer list-item-enter spring-transition hover:translate-y-[-1.5px] hover:shadow-[0_12px_28px_rgba(56,189,248,0.08)] bg-white/70 border border-white/90"
      onClick={onEdit}
    >
      <div className="flex items-start justify-between mb-1.5">
        <h3 className="text-sm font-bold truncate flex-1 text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors">
          {note.problem.title}
        </h3>
        <button
          onClick={(e) => { e.stopPropagation(); remove(note.id); }}
          className="text-[var(--text-secondary)] hover:text-[var(--danger)] hover:scale-115 text-xs ml-2 flex-shrink-0 transition-all duration-150"
        >
          ✕
        </button>
      </div>

      {note.approach && (
        <p className="text-xs text-[var(--text-secondary)] mb-3 line-clamp-2 leading-relaxed bg-slate-100/35 p-2 rounded-xl border border-slate-100/50">
          {note.approach}
        </p>
      )}

      <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100/60">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${difficultyPills[note.difficulty] || ''}`}>
            {difficultyLabels[note.difficulty]}
          </span>
          {note.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="tag-chip px-2 py-0.5 rounded-full bg-[var(--bg-primary)] border border-sky-100/60 text-[9px] font-bold text-[var(--text-secondary)]">
              {tag}
            </span>
          ))}
          {note.tags.length > 2 && (
            <span className="text-[9px] font-bold text-[var(--text-secondary)] bg-slate-100 px-1.5 py-0.5 rounded-full">+{note.tags.length - 2}</span>
          )}
        </div>
        <div className="text-[10px] text-[var(--text-secondary)] font-medium opacity-80">
          {new Date(note.updatedAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}
        </div>
      </div>
    </div>
  );
}
