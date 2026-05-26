import type { ReactElement } from 'react';

type Page = 'plan' | 'notes' | 'ai' | 'settings';

interface Props {
  current: Page;
  onChange: (page: Page) => void;
}

type IconProps = {
  active: boolean;
};

const iconClass = 'h-6 w-6 transition-transform duration-200';

function PlanIcon({ active }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={iconClass} fill="none" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="5" className={active ? 'fill-sky-100' : 'fill-white'} stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 12.2l2.7 2.7L16.4 9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      {active && <path d="M5.6 5.6h12.8" stroke="url(#plan-rainbow)" strokeWidth="2" strokeLinecap="round" />}
      <defs>
        <linearGradient id="plan-rainbow" x1="5" y1="5" x2="19" y2="5" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38bdf8" />
          <stop offset="0.5" stopColor="#86efac" />
          <stop offset="1" stopColor="#f9a8d4" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function NotesIcon({ active }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={iconClass} fill="none" aria-hidden="true">
      <path d="M6 18.2l1.1-4.1L16.7 4.5a2.2 2.2 0 013.1 3.1l-9.6 9.6L6 18.2z" className={active ? 'fill-cyan-100' : 'fill-white'} stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M14.8 6.4l2.8 2.8M5.5 20h13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      {active && <circle cx="18.6" cy="5.4" r="2.1" fill="url(#notes-rainbow)" opacity="0.9" />}
      <defs>
        <linearGradient id="notes-rainbow" x1="16" y1="3" x2="21" y2="8" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38bdf8" />
          <stop offset="0.5" stopColor="#fde68a" />
          <stop offset="1" stopColor="#f9a8d4" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function AiIcon({ active }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={iconClass} fill="none" aria-hidden="true">
      <rect x="5" y="7" width="14" height="11" rx="4" className={active ? 'fill-sky-100' : 'fill-white'} stroke="currentColor" strokeWidth="1.8" />
      <path d="M9.5 6V4.5M14.5 6V4.5M12 18v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="10" cy="12.3" r="1" fill="currentColor" />
      <circle cx="14" cy="12.3" r="1" fill="currentColor" />
      <path d="M10 15h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      {active && <path d="M7.4 8.3c2.6-1.8 6.7-1.8 9.2 0" stroke="url(#ai-rainbow)" strokeWidth="2" strokeLinecap="round" />}
      <defs>
        <linearGradient id="ai-rainbow" x1="7" y1="8" x2="17" y2="8" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38bdf8" />
          <stop offset="0.5" stopColor="#86efac" />
          <stop offset="1" stopColor="#f9a8d4" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function SettingsIcon({ active }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={iconClass} fill="none" aria-hidden="true">
      <path d="M12 8.4a3.6 3.6 0 100 7.2 3.6 3.6 0 000-7.2z" className={active ? 'fill-cyan-100' : 'fill-white'} stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 3.5v2M12 18.5v2M4.5 12h2M17.5 12h2M6.7 6.7l1.4 1.4M15.9 15.9l1.4 1.4M17.3 6.7l-1.4 1.4M8.1 15.9l-1.4 1.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      {active && <circle cx="12" cy="12" r="7.8" stroke="url(#settings-rainbow)" strokeWidth="1.5" opacity="0.9" />}
      <defs>
        <linearGradient id="settings-rainbow" x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38bdf8" />
          <stop offset="0.5" stopColor="#fde68a" />
          <stop offset="1" stopColor="#f9a8d4" />
        </linearGradient>
      </defs>
    </svg>
  );
}

const tabs: { key: Page; label: string; Icon: (props: IconProps) => ReactElement }[] = [
  { key: 'plan', label: '计划', Icon: PlanIcon },
  { key: 'notes', label: '笔记', Icon: NotesIcon },
  { key: 'ai', label: 'AI', Icon: AiIcon },
  { key: 'settings', label: '设置', Icon: SettingsIcon },
];

export default function Navigation({ current, onChange }: Props) {
  return (
    <nav className="glass-nav relative grid grid-cols-4 gap-1 overflow-hidden">
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-[var(--gradient-rainbow)] opacity-80" />
      {tabs.map((tab) => {
        const active = current === tab.key;
        const Icon = tab.Icon;

        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`group relative flex flex-col items-center rounded-2xl px-2 py-2.5 text-xs transition-all duration-200 ${
              active
                ? 'bg-white/90 text-sky-500 font-semibold shadow-[0_12px_28px_rgba(56,189,248,0.18)]'
                : 'text-[var(--text-secondary)] hover:bg-white/55 hover:text-sky-500'
            }`}
          >
            {active && <span className="absolute inset-x-4 top-1 h-0.5 rounded-full bg-[var(--gradient-rainbow)]" />}
            <span className={`mb-1 flex h-9 w-9 items-center justify-center rounded-2xl border transition-all duration-200 ${
              active
                ? 'border-sky-200 bg-sky-50 text-sky-500 shadow-inner shadow-sky-100 scale-105'
                : 'border-transparent bg-transparent text-slate-500 group-hover:bg-sky-50 group-hover:text-sky-500'
            }`}
            >
              <Icon active={active} />
            </span>
            <span className="leading-none">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
