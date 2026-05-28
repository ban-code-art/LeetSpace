import { useState, useEffect } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import { usePlanStore } from '@/stores/planStore';
import { useNoteStore } from '@/stores/noteStore';
import Navigation from './components/Navigation';
import Plan from './pages/Plan';
import Notes from './pages/Notes';
import AI from './pages/AI';
import Settings from './pages/Settings';
import { Problem } from '@/types';

type Page = 'plan' | 'notes' | 'ai' | 'settings';

export default function App() {
  const [page, setPage] = useState<Page>('plan');
  const [noteProblem, setNoteProblem] = useState<Problem | null>(null);
  const loadSettings = useSettingsStore((s) => s.load);
  const loadPlans = usePlanStore((s) => s.load);
  const loadNotes = useNoteStore((s) => s.load);

  useEffect(() => {
    loadSettings();
    loadPlans();
    loadNotes();
  }, [loadSettings, loadPlans, loadNotes]);

  return (
    <div className="relative flex h-screen flex-col overflow-hidden">
      <main className="relative z-10 flex-1 overflow-y-auto px-5 pb-3 pt-5">
        <div className={page === 'plan' ? 'block h-full' : 'hidden h-full'}>
          <Plan onOpenNote={(problem) => { setNoteProblem(problem); setPage('notes'); }} />
        </div>
        <div className={page === 'notes' ? 'block h-full' : 'hidden h-full'}>
          <Notes initialProblem={noteProblem} onInitialProblemHandled={() => setNoteProblem(null)} />
        </div>
        <div className={page === 'ai' ? 'block h-full' : 'hidden h-full'}>
          <AI />
        </div>
        <div className={page === 'settings' ? 'block h-full' : 'hidden h-full'}>
          <Settings />
        </div>
      </main>
      <div className="relative z-20">
        <Navigation current={page} onChange={setPage} />
      </div>
    </div>
  );
}

