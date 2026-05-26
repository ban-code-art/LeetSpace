import { create } from 'zustand';
import { Settings } from '@/types';
import * as storage from '@/services/storage';

const STORAGE_KEY = 'leetspace:settings';

const DEFAULT_NOTE_PROMPTS = [
  { key: 'knowledge', label: '核心知识点', prompt: '这道题考察的核心算法/数据结构是什么，为什么适用，用1-2句话说明', enabled: true },
  { key: 'approach', label: '解题思路', prompt: '用通俗易懂的语言分步骤描述解题思路，避免晦涩术语，让初学者也能理解', enabled: true },
  { key: 'code', label: '核心代码讲解', prompt: '讲解代码中最关键的几行逻辑，说明为什么这样写', enabled: true },
  { key: 'complexity', label: '复杂度分析', prompt: '分析时间复杂度和空间复杂度，简要说明原因', enabled: true },
];

const defaultSettings: Settings = {
  dailyGoal: 3,
  theme: 'system',
  ai: {
    provider: 'openai',
    apiKey: '',
    model: 'gpt-4o-mini',
  },
  floatingWidget: {
    enabled: true,
    showMode: 'unfinished',
    quotes: ['坚持就是胜利', '每天进步一点点', '算法之路，贵在坚持'],
  },
  notePrompts: DEFAULT_NOTE_PROMPTS,
};

interface SettingsState {
  settings: Settings;
  loaded: boolean;
  load: () => Promise<void>;
  update: (partial: Partial<Settings>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: defaultSettings,
  loaded: false,

  load: async () => {
    const saved = await storage.get<Settings>(STORAGE_KEY);
    const settings = saved ? { ...defaultSettings, ...saved } : defaultSettings;
    if (!saved) {
      await storage.set(STORAGE_KEY, settings);
    }
    set({ settings, loaded: true });
  },

  update: async (partial) => {
    const settings = { ...get().settings, ...partial };
    await storage.set(STORAGE_KEY, settings);
    set({ settings });
  },
}));
