import { useState, useEffect } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import { usePlanStore } from '@/stores/planStore';
import { useNoteStore } from '@/stores/noteStore';
import { generateNote } from '@/services/noteGenerator';
import * as storage from '@/services/storage';
import Navigation from './components/Navigation';
import Plan from './pages/Plan';
import Notes from './pages/Notes';
import AI from './pages/AI';
import Settings from './pages/Settings';
import { Problem } from '@/types';

type Page = 'plan' | 'notes' | 'ai' | 'settings';

export default function App() {
  const [page, setPage] = useState<Page>('plan');
  const [generating, setGenerating] = useState(false);
  const [noteProblem, setNoteProblem] = useState<Problem | null>(null);
  const loadSettings = useSettingsStore((s) => s.load);
  const loadPlans = usePlanStore((s) => s.load);
  const loadNotes = useNoteStore((s) => s.load);
  const settings = useSettingsStore((s) => s.settings);
  const addNote = useNoteStore((s) => s.add);

  useEffect(() => {
    loadSettings();
    loadPlans();
    loadNotes();
  }, [loadSettings, loadPlans, loadNotes]);

  useEffect(() => {
    const checkPendingNote = async () => {
      const pending = await storage.get<{ problem: Problem; timestamp: number }>('leetspace:pending-note');
      if (!pending || generating) return;
      if (Date.now() - pending.timestamp > 60000) {
        await storage.remove('leetspace:pending-note');
        return;
      }

      setGenerating(true);
      try {
        const content = await generateNote(pending.problem, settings);
        if (content) {
          await addNote(pending.problem, content, '', [], 3);
          setPage('notes');
        }
      } finally {
        await storage.remove('leetspace:pending-note');
        setGenerating(false);
      }
    };

    checkPendingNote();
    const interval = setInterval(checkPendingNote, 3000);
    return () => clearInterval(interval);
  }, [settings, addNote, generating]);

  return (
    <div className="relative flex h-screen flex-col overflow-hidden">
      {generating && (
        <div className="px-4 py-2 bg-gradient-to-r from-[var(--accent)] to-purple-500 text-white text-xs text-center animate-pulse">
          AI 正在生成笔记...
        </div>
      )}
      <main className="relative z-10 flex-1 overflow-y-auto px-5 pb-3 pt-5">
        {page === 'plan' && <Plan onOpenNote={(problem) => { setNoteProblem(problem); setPage('notes'); }} />}
        {page === 'notes' && <Notes initialProblem={noteProblem} onInitialProblemHandled={() => setNoteProblem(null)} />}
        {page === 'ai' && <AI />}
        {page === 'settings' && <Settings />}
      </main>
      <div className="relative z-20">
        <Navigation current={page} onChange={setPage} />
      </div>
    </div>
  );
}
