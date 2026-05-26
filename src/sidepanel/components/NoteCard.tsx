import { Note } from '@/types';
import { useNoteStore } from '@/stores/noteStore';

interface Props {
  note: Note;
  onEdit: () => void;
}

const difficultyLabels = ['', '很简单', '简单', '中等', '较难', '很难'];

export default function NoteCard({ note, onEdit }: Props) {
  const remove = useNoteStore((s) => s.remove);

  return (
    <div
      className="glass-card p-3 cursor-pointer list-item-enter"
      onClick={onEdit}
    >
      <div className="flex items-start justify-between mb-1">
        <h3 className="text-sm font-medium truncate flex-1">
          {note.problem.title}
        </h3>
        <button
          onClick={(e) => { e.stopPropagation(); remove(note.id); }}
          className="text-[var(--text-secondary)] hover:text-[var(--danger)] hover:scale-110 text-xs ml-2 flex-shrink-0 transition-all duration-150"
        >
          ✕
        </button>
      </div>

      {note.approach && (
        <p className="text-xs text-[var(--text-secondary)] mb-2 line-clamp-2">{note.approach}</p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-[var(--text-secondary)]">
          难度: {difficultyLabels[note.difficulty]}
        </span>
        {note.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="tag-chip px-1.5 py-0.5 rounded-full bg-[var(--bg-primary)] text-xs text-[var(--text-secondary)]">
            {tag}
          </span>
        ))}
        {note.tags.length > 3 && (
          <span className="text-xs text-[var(--text-secondary)]">+{note.tags.length - 3}</span>
        )}
      </div>

      <div className="text-xs text-[var(--text-secondary)] mt-2">
        {new Date(note.updatedAt).toLocaleDateString()}
      </div>
    </div>
  );
}
