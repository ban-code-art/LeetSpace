export interface Problem {
  id: string;
  title: string;
  titleSlug: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tags: string[];
  url: string;
}

export interface PlanItem {
  id: string;
  problem: Problem;
  status: 'todo' | 'done';
  date: string;
  createdAt: number;
  completedAt?: number;
}

export interface PlanGroup {
  id: string;
  title: string;
  sourceSlug?: string;
  sourceType: 'studyplan' | 'problemset' | 'manual' | 'legacy';
  date: string;
  collapsed: boolean;
  createdAt: number;
  updatedAt: number;
  items: PlanItem[];
}

export interface Note {
  id: string;
  problemId: string;
  problem: Problem;
  content: string;
  approach: string;
  tags: string[];
  difficulty: 1 | 2 | 3 | 4 | 5;
  createdAt: number;
  updatedAt: number;
}

export interface NotePromptOption {
  key: string;
  label: string;
  prompt: string;
  enabled: boolean;
}

export interface FloatingWidgetConfig {
  enabled: boolean;
  showMode: 'always' | 'unfinished';
  quotes: string[];
}

export interface Settings {
  dailyGoal: number;
  theme: 'light' | 'dark' | 'system';
  ai: {
    provider: 'openai' | 'claude' | 'deepseek' | 'custom';
    apiKey: string;
    model: string;
    baseUrl?: string;
  };
  floatingWidget: FloatingWidgetConfig;
  notePrompts: NotePromptOption[];
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}
