import { create } from 'zustand';
import { PlanGroup, PlanItem, Problem } from '@/types';
import * as storage from '@/services/storage';
import { v4 as uuid } from 'uuid';

const STORAGE_KEY = 'leetspace:plans';
const MANUAL_GROUP_KEY = 'manual';

interface AddToGroupInput {
  title: string;
  sourceType: PlanGroup['sourceType'];
  sourceSlug?: string;
  date: string;
  problems: Problem[];
}

interface PlanState {
  groups: PlanGroup[];
  items: PlanItem[];
  loaded: boolean;
  load: () => Promise<void>;
  add: (item: Omit<PlanItem, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  addGroupItems: (input: AddToGroupInput) => Promise<void>;
  toggle: (id: string) => Promise<void>;
  markAccepted: (acceptedTitleSlugs: Set<string>, groupId?: string) => Promise<{ updated: number; alreadyDone: number; total: number }>;
  remove: (id: string) => Promise<void>;
  toggleGroup: (id: string) => Promise<void>;
  removeGroup: (id: string) => Promise<void>;
}

function flattenItems(groups: PlanGroup[]): PlanItem[] {
  return groups.flatMap((group) => group.items);
}

function isPlanGroupArray(value: unknown): value is PlanGroup[] {
  return Array.isArray(value) && (value.length === 0 || 'items' in (value[0] as object));
}

function makePlanItem(problem: Problem, date: string): PlanItem {
  return {
    id: uuid(),
    problem,
    status: 'todo',
    date,
    createdAt: Date.now(),
  };
}

function migrateStoredPlans(value: unknown): PlanGroup[] {
  if (!Array.isArray(value) || value.length === 0) return [];
  if (isPlanGroupArray(value)) return value;

  const items = value as PlanItem[];
  const date = items[0]?.date || new Date().toISOString().slice(0, 10);
  const now = Date.now();
  return [
    {
      id: uuid(),
      title: '旧今日计划',
      sourceSlug: 'legacy',
      sourceType: 'legacy',
      date,
      collapsed: false,
      createdAt: now,
      updatedAt: now,
      items,
    },
  ];
}

function groupKey(group: Pick<PlanGroup, 'sourceType' | 'sourceSlug' | 'date'>): string {
  return `${group.date}:${group.sourceType}:${group.sourceSlug || MANUAL_GROUP_KEY}`;
}

export const usePlanStore = create<PlanState>((set, get) => ({
  groups: [],
  items: [],
  loaded: false,

  load: async () => {
    const saved = await storage.get<unknown>(STORAGE_KEY);
    const groups = migrateStoredPlans(saved);
    await storage.set(STORAGE_KEY, groups);
    set({ groups, items: flattenItems(groups), loaded: true });
  },

  add: async (item) => {
    await get().addGroupItems({
      title: '手动添加',
      sourceType: 'manual',
      sourceSlug: MANUAL_GROUP_KEY,
      date: item.date,
      problems: [item.problem],
    });
  },

  addGroupItems: async ({ title, sourceType, sourceSlug, date, problems }) => {
    const now = Date.now();
    const targetKey = groupKey({ sourceType, sourceSlug, date });
    let found = false;

    const groups = get().groups.map((group) => {
      if (groupKey(group) !== targetKey) return group;
      found = true;

      const existing = new Set(group.items.map((item) => item.problem.titleSlug || item.problem.title || item.problem.url));
      const newItems = problems
        .filter((problem) => !existing.has(problem.titleSlug || problem.title || problem.url))
        .map((problem) => makePlanItem(problem, date));

      return {
        ...group,
        title,
        collapsed: false,
        updatedAt: now,
        items: [...group.items, ...newItems],
      };
    });

    if (!found) {
      groups.push({
        id: uuid(),
        title,
        sourceType,
        sourceSlug,
        date,
        collapsed: false,
        createdAt: now,
        updatedAt: now,
        items: problems.map((problem) => makePlanItem(problem, date)),
      });
    }

    await storage.set(STORAGE_KEY, groups);
    set({ groups, items: flattenItems(groups) });
  },

  toggle: async (id) => {
    const groups = get().groups.map((group) => ({
      ...group,
      items: group.items.map((item) =>
        item.id === id
          ? {
              ...item,
              status: (item.status === 'todo' ? 'done' : 'todo') as 'todo' | 'done',
              completedAt: item.status === 'todo' ? Date.now() : undefined,
            }
          : item
      ),
    }));
    await storage.set(STORAGE_KEY, groups);
    set({ groups, items: flattenItems(groups) });
  },

  markAccepted: async (acceptedTitleSlugs, groupId) => {
    let updated = 0;
    let alreadyDone = 0;
    let total = 0;

    const groups = get().groups.map((group) => {
      if (groupId && group.id !== groupId) return group;

      return {
        ...group,
        items: group.items.map((item) => {
          if (!item.problem.titleSlug) return item;
          total += 1;
          if (!acceptedTitleSlugs.has(item.problem.titleSlug)) return item;
          if (item.status === 'done') {
            alreadyDone += 1;
            return item;
          }
          updated += 1;
          return {
            ...item,
            status: 'done' as const,
            completedAt: Date.now(),
          };
        }),
      };
    });

    await storage.set(STORAGE_KEY, groups);
    set({ groups, items: flattenItems(groups) });
    return { updated, alreadyDone, total };
  },

  remove: async (id) => {
    const groups = get().groups
      .map((group) => ({ ...group, items: group.items.filter((item) => item.id !== id) }))
      .filter((group) => group.items.length > 0);
    await storage.set(STORAGE_KEY, groups);
    set({ groups, items: flattenItems(groups) });
  },

  toggleGroup: async (id) => {
    const groups = get().groups.map((group) =>
      group.id === id ? { ...group, collapsed: !group.collapsed } : group
    );
    await storage.set(STORAGE_KEY, groups);
    set({ groups, items: flattenItems(groups) });
  },

  removeGroup: async (id) => {
    const groups = get().groups.filter((group) => group.id !== id);
    await storage.set(STORAGE_KEY, groups);
    set({ groups, items: flattenItems(groups) });
  },
}));
