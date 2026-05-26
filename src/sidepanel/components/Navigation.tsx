type Page = 'plan' | 'notes' | 'ai' | 'settings';

interface Props {
  current: Page;
  onChange: (page: Page) => void;
}

const tabs: { key: Page; label: string; icon: string }[] = [
  { key: 'plan', label: '计划', icon: '☑️' },
  { key: 'notes', label: '笔记', icon: '🖊️' },
  { key: 'ai', label: 'AI', icon: '🤖' },
  { key: 'settings', label: '设置', icon: '⚙️' },
];

export default function Navigation({ current, onChange }: Props) {
  return (
    <nav className="glass-nav relative grid grid-cols-4 gap-1">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`relative flex flex-col items-center rounded-2xl px-2 py-2.5 text-xs transition-all duration-200 ${
            current === tab.key
              ? 'bg-gradient-to-br from-blue-500/10 to-purple-500/10 text-[var(--accent)] font-semibold shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <span className={`mb-0.5 text-xl transition-transform duration-200 ${current === tab.key ? 'scale-110' : ''}`}>{tab.icon}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
