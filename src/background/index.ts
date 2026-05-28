import { PlanGroup, PlanItem, Problem } from '@/types';

const PLANS_KEY = 'leetspace:plans';

function problemKey(problem: Problem) {
  return problem.titleSlug || problem.id || problem.title || problem.url;
}

function isPlanGroupArray(value: unknown): value is PlanGroup[] {
  return Array.isArray(value) && (value.length === 0 || 'items' in (value[0] as object));
}

async function markProblemDone(problem: Problem): Promise<number> {
  const targetKey = problemKey(problem);
  if (!targetKey) return 0;

  const result = await chrome.storage.local.get([PLANS_KEY]);
  const plans = result[PLANS_KEY] as unknown;
  let updated = 0;

  if (isPlanGroupArray(plans)) {
    const groups = plans.map((group) => ({
      ...group,
      items: group.items.map((item) => {
        if (problemKey(item.problem) !== targetKey || item.status === 'done') return item;
        updated += 1;
        return { ...item, status: 'done' as const, completedAt: Date.now() };
      }),
    }));
    if (updated > 0) await chrome.storage.local.set({ [PLANS_KEY]: groups });
    return updated;
  }

  if (Array.isArray(plans)) {
    const items = (plans as PlanItem[]).map((item) => {
      if (problemKey(item.problem) !== targetKey || item.status === 'done') return item;
      updated += 1;
      return { ...item, status: 'done' as const, completedAt: Date.now() };
    });
    if (updated > 0) await chrome.storage.local.set({ [PLANS_KEY]: items });
  }

  return updated;
}

chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id) {
    await chrome.sidePanel.open({ tabId: tab.id });
  }
});

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

chrome.runtime.onMessage.addListener((msg, _sender, _sendResponse) => {
  if (msg.type === 'SUBMISSION_SUCCESS' && msg.problem) {
    void markProblemDone(msg.problem as Problem);
  }
  return true;
});
