import { useState } from 'react';
import { usePlanStore } from '@/stores/planStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useNoteStore } from '@/stores/noteStore';
import { PlanGroup, Problem } from '@/types';
import PlanItem from '../components/PlanItem';
import AddPlanButton from '../components/AddPlanButton';
import BatchImport from '../components/BatchImport';
import { fetchAcceptedTitleSlugs } from '@/services/leetcodeProgress';

const groupIcons = [
  { icon: '🗄️', className: 'from-sky-300 to-cyan-400' },
  { icon: '</>', className: 'from-sky-400 to-blue-600' },
  { icon: '🏆', className: 'from-amber-300 to-orange-500' },
  { icon: '📘', className: 'from-emerald-300 to-teal-500' },
];

function PlanGroupCard({ group, index, onOpenNote }: { group: PlanGroup; index: number; onOpenNote: (problem: Problem) => void }) {
  const toggleGroup = usePlanStore((s) => s.toggleGroup);
  const removeGroup = usePlanStore((s) => s.removeGroup);
  const markAccepted = usePlanStore((s) => s.markAccepted);
  const importFromPlanGroup = useNoteStore((s) => s.importFromPlanGroup);
  const [importing, setImporting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [importResult, setImportResult] = useState('');
  const [syncResult, setSyncResult] = useState('');
  const doneCount = group.items.filter((item) => item.status === 'done').length;
  const progress = group.items.length > 0 ? Math.round((doneCount / group.items.length) * 100) : 0;
  const visual = groupIcons[index % groupIcons.length];

  const handleImportNotes = async () => {
    if (importing || group.items.length === 0) return;
    setImporting(true);
    setImportResult('');
    try {
      const result = await importFromPlanGroup(group);
      setImportResult(`新增 ${result.created} · 更新 ${result.updated} · 跳过 ${result.skipped}`);
    } finally {
      setImporting(false);
    }
  };

  const handleSyncProgress = async () => {
    if (syncing || group.items.length === 0) return;
    setSyncing(true);
    setSyncResult('');
    try {
      const slugs = group.items.map((item) => item.problem.titleSlug).filter(Boolean);
      const remote = await fetchAcceptedTitleSlugs(slugs);
      const local = await markAccepted(remote.accepted, group.id);
      setSyncResult(`AC ${remote.accepted.size}/${remote.checked} · 新完成 ${local.updated}`);
    } catch {
      setSyncResult('同步失败，请确认已登录 leetcode.cn');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <section className="glass-card overflow-hidden p-4 list-item-enter">
      <div className="flex items-start gap-3">
        <button
          onClick={() => toggleGroup(group.id)}
          className="flex min-w-0 flex-1 items-start gap-3 text-left"
        >
          <span className={`icon-tile bg-gradient-to-br ${visual.className}`}>{visual.icon}</span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-secondary)]">{group.collapsed ? '▶' : '▼'}</span>
              <h2 className="truncate text-base font-bold tracking-tight">{group.title}</h2>
            </span>
            <span className="mt-2 block text-sm text-[var(--text-secondary)]">
              {doneCount}/{group.items.length} 已完成 · {progress}%
            </span>
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={handleSyncProgress}
            disabled={syncing || group.items.length === 0}
            className="rounded-full bg-emerald-500/12 px-2.5 py-1 text-[10px] font-semibold text-emerald-600 transition-colors hover:bg-emerald-500 hover:text-white disabled:opacity-50"
            title="同步该题单在力扣账号中的 AC 完成状态"
          >
            {syncing ? '同步中' : '同步'}
          </button>
          <button
            onClick={handleImportNotes}
            disabled={importing || group.items.length === 0}
            className="rounded-full bg-blue-500/10 px-2.5 py-1 text-[10px] font-semibold text-blue-600 transition-colors hover:bg-blue-500 hover:text-white disabled:opacity-50"
            title="把该题单所有题目导入笔记，并用题单名分类"
          >
            {importing ? '导入中' : '导入笔记'}
          </button>
          <button
            onClick={() => removeGroup(group.id)}
            className="h-7 w-7 rounded-full text-[var(--text-secondary)] transition-colors hover:bg-red-500/10 hover:text-[var(--danger)]"
            title="删除分组"
          >
            ×
          </button>
        </div>
      </div>

      {(importResult || syncResult) && (
        <div className="mt-3 space-y-1">
          {syncResult && <p className="rounded-xl bg-emerald-500/10 px-3 py-1.5 text-[10px] text-emerald-600">进度同步：{syncResult}</p>}
          {importResult && <p className="rounded-xl bg-blue-500/10 px-3 py-1.5 text-[10px] text-blue-600">笔记导入：{importResult}</p>}
        </div>
      )}

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200/55">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-300 transition-all duration-500 progress-bar"
          style={{ width: `${progress}%` }}
        />
      </div>

      {!group.collapsed && (
        <div className="mt-4 max-h-72 overflow-y-auto rounded-2xl border border-[var(--border-glass)] bg-white/45 p-2 space-y-1.5">
          {group.items.map((item) => (
            <PlanItem key={item.id} item={item} onOpenNote={onOpenNote} />
          ))}
        </div>
      )}
    </section>
  );
}

interface Props {
  onOpenNote: (problem: Problem) => void;
}

export default function Plan({ onOpenNote }: Props) {
  const { groups, loaded } = usePlanStore();
  const markAccepted = usePlanStore((s) => s.markAccepted);
  const dailyGoal = useSettingsStore((s) => s.settings.dailyGoal);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncAllResult, setSyncAllResult] = useState('');

  if (!loaded) return <div className="text-center text-[var(--text-secondary)]">加载中...</div>;

  const today = new Date().toISOString().slice(0, 10);
  const todayGroups = groups.filter((group) => group.date === today);
  const todayItems = todayGroups.flatMap((group) => group.items);
  const doneCount = todayItems.filter((item) => item.status === 'done').length;
  const totalCount = todayItems.length;
  const overallProgress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const handleSyncAll = async () => {
    if (syncingAll || todayItems.length === 0) return;
    setSyncingAll(true);
    setSyncAllResult('');
    try {
      const slugs = todayItems.map((item) => item.problem.titleSlug).filter(Boolean);
      const remote = await fetchAcceptedTitleSlugs(slugs);
      const local = await markAccepted(remote.accepted);
      setSyncAllResult(`AC ${remote.accepted.size}/${remote.checked} · 新完成 ${local.updated}`);
    } catch {
      setSyncAllResult('同步失败，请确认已登录 leetcode.cn');
    } finally {
      setSyncingAll(false);
    }
  };

  return (
    <div className="page-enter space-y-5">
      <section className="relative overflow-hidden rounded-[28px] border border-white/80 bg-white/70 p-5 shadow-[0_24px_60px_rgba(83,88,170,0.14)] backdrop-blur-xl">
        <div className="pointer-events-none absolute -right-8 top-8 h-36 w-36 rounded-full bg-blue-500/10 blur-2xl" />
        <div className="pointer-events-none absolute right-8 top-16 text-7xl opacity-20">🎯</div>
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">今日计划 ✨</h1>
              <button
                onClick={handleSyncAll}
                disabled={syncingAll || todayItems.length === 0}
                className="mt-4 rounded-full border border-blue-200/70 bg-white/70 px-3 py-1.5 text-xs font-semibold text-blue-600 shadow-sm transition hover:bg-blue-50 disabled:opacity-50"
              >
                {syncingAll ? '同步中...' : '⚡ 同步力扣进度'}
              </button>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-[var(--text-primary)]">{doneCount}/{totalCount}</p>
              <p className="text-xs text-[var(--text-secondary)]">{dailyGoal > 0 ? `目标 ${dailyGoal}` : '今日进度'}</p>
            </div>
          </div>

          {syncAllResult && <p className="mt-3 text-xs text-emerald-600">{syncAllResult}</p>}

          <div className="mt-8 h-2.5 overflow-hidden rounded-full bg-slate-200/50">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-300 progress-bar"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
      </section>

      {todayGroups.length === 0 ? (
        <div className="glass-card p-8 text-center text-sm text-[var(--text-secondary)]">
          还没有今日计划，点击下方按钮添加
        </div>
      ) : (
        <div className="max-h-[49vh] space-y-3 overflow-y-auto pr-1 rounded-3xl">
          {todayGroups.map((group, index) => (
            <PlanGroupCard key={group.id} group={group} index={index} onOpenNote={onOpenNote} />
          ))}
        </div>
      )}

      <AddPlanButton />
      <BatchImport />
    </div>
  );
}

