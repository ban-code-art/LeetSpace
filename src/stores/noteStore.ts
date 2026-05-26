import { create } from 'zustand';
import { Note, PlanGroup, Problem } from '@/types';
import * as storage from '@/services/storage';
import { v4 as uuid } from 'uuid';

const STORAGE_KEY = 'leetspace:notes';

interface NoteState {
  notes: Note[];
  loaded: boolean;
  load: () => Promise<void>;
  add: (problem: Problem, content: string, approach: string, tags: string[], difficulty: 1 | 2 | 3 | 4 | 5) => Promise<Note>;
  update: (id: string, partial: Partial<Pick<Note, 'problem' | 'content' | 'approach' | 'tags' | 'difficulty'>>) => Promise<void>;
  importFromPlanGroup: (group: PlanGroup) => Promise<{ created: number; updated: number; skipped: number }>;
  remove: (id: string) => Promise<void>;
}

function problemKey(problem: Problem) {
  return problem.titleSlug || problem.id || problem.title;
}

function noteTemplate(problem: Problem, groupTitle: string) {
  return `# ${problem.title}

> 来源题单：${groupTitle}

## 解题思路


## 复杂度

- 时间复杂度：
- 空间复杂度：

## 易错点
`;
}

function mapDifficulty(problem: Problem): 1 | 2 | 3 | 4 | 5 {
  if (problem.difficulty === 'Easy') return 2;
  if (problem.difficulty === 'Hard') return 4;
  return 3;
}

export const useNoteStore = create<NoteState>((set, get) => ({
  notes: [],
  loaded: false,

  load: async () => {
    const notes = await storage.get<Note[]>(STORAGE_KEY);
    set({ notes: notes || [], loaded: true });
  },

  add: async (problem, content, approach, tags, difficulty) => {
    const now = Date.now();
    const note: Note = {
      id: uuid(),
      problemId: problem.id || problem.titleSlug,
      problem,
      content,
      approach,
      tags,
      difficulty,
      createdAt: now,
      updatedAt: now,
    };
    const notes = [...get().notes, note];
    await storage.set(STORAGE_KEY, notes);
    set({ notes });
    return note;
  },

  update: async (id, partial) => {
    const notes = get().notes.map((n) =>
      n.id === id ? { ...n, ...partial, updatedAt: Date.now() } : n
    );
    await storage.set(STORAGE_KEY, notes);
    set({ notes });
  },

  importFromPlanGroup: async (group) => {
    const now = Date.now();
    let created = 0;
    let updated = 0;
    let skipped = 0;
    const seenProblems = new Set<string>();
    const notes = [...get().notes];
    const noteIndex = new Map(notes.map((note, index) => [problemKey(note.problem), index]));

    for (const item of group.items) {
      const key = problemKey(item.problem);
      if (!key || seenProblems.has(key)) {
        skipped += 1;
        continue;
      }
      seenProblems.add(key);

      const existingIndex = noteIndex.get(key);
      if (existingIndex !== undefined) {
        const existing = notes[existingIndex];
        if (existing.tags.includes(group.title)) {
          skipped += 1;
          continue;
        }
        notes[existingIndex] = {
          ...existing,
          tags: [...existing.tags, group.title],
          updatedAt: now,
        };
        updated += 1;
        continue;
      }

      const note: Note = {
        id: uuid(),
        problemId: item.problem.id || item.problem.titleSlug,
        problem: item.problem,
        content: noteTemplate(item.problem, group.title),
        approach: '',
        tags: [group.title],
        difficulty: mapDifficulty(item.problem),
        createdAt: now,
        updatedAt: now,
      };
      noteIndex.set(key, notes.length);
      notes.push(note);
      created += 1;
    }

    await storage.set(STORAGE_KEY, notes);
    set({ notes });
    return { created, updated, skipped };
  },

  remove: async (id) => {
    const notes = get().notes.filter((n) => n.id !== id);
    await storage.set(STORAGE_KEY, notes);
    set({ notes });
  },
}));
