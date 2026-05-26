import { FloatingWidgetConfig, PlanGroup, PlanItem, Settings } from '@/types';

type TimerState = {
  date: string;
  elapsedMs: number;
  running: boolean;
  startedAt?: number;
};

const TIMER_KEY = 'leetspace:focus-timer';

let widgetEl: HTMLElement | null = null;
let isDragging = false;
let offsetX = 0;
let offsetY = 0;
let timerTick: number | null = null;
let currentTimer: TimerState | null = null;

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

function normalizeTimer(timer?: TimerState): TimerState {
  const date = todayKey();
  if (!timer || timer.date !== date) {
    return { date, elapsedMs: 0, running: false };
  }
  return {
    date,
    elapsedMs: Number(timer.elapsedMs) || 0,
    running: Boolean(timer.running),
    startedAt: timer.startedAt,
  };
}

function getVisibleElapsed(timer: TimerState): number {
  if (!timer.running || !timer.startedAt) return timer.elapsedMs;
  return timer.elapsedMs + Date.now() - timer.startedAt;
}

function placeWidget(inner: HTMLElement, left: number, top: number): void {
  const margin = 8;
  const rect = inner.getBoundingClientRect();
  const maxLeft = Math.max(margin, window.innerWidth - rect.width - margin);
  const maxTop = Math.max(margin, window.innerHeight - rect.height - margin);

  inner.style.left = `${clamp(left, margin, maxLeft)}px`;
  inner.style.top = `${clamp(top, margin, maxTop)}px`;
  inner.style.right = 'auto';
}

function updateTimerDisplay(): void {
  if (!currentTimer) return;
  const timeEl = document.getElementById('leetspace-timer-time');
  const playEl = document.getElementById('leetspace-timer-toggle');
  if (timeEl) timeEl.textContent = formatTime(getVisibleElapsed(currentTimer));
  if (playEl) playEl.textContent = currentTimer.running ? '⏸' : '▶';
}

async function saveTimer(timer: TimerState): Promise<void> {
  currentTimer = timer;
  await chrome.storage.local.set({ [TIMER_KEY]: timer });
  updateTimerDisplay();
}

function startTick(): void {
  if (timerTick !== null) window.clearInterval(timerTick);
  timerTick = window.setInterval(updateTimerDisplay, 1000);
}

function stopTick(): void {
  if (timerTick !== null) {
    window.clearInterval(timerTick);
    timerTick = null;
  }
}

async function toggleTimer(): Promise<void> {
  const timer = normalizeTimer(currentTimer || undefined);
  if (timer.running) {
    await saveTimer({
      date: timer.date,
      elapsedMs: getVisibleElapsed(timer),
      running: false,
    });
    stopTick();
    return;
  }

  await saveTimer({
    date: timer.date,
    elapsedMs: timer.elapsedMs,
    running: true,
    startedAt: Date.now(),
  });
  startTick();
}

async function resetTimer(): Promise<void> {
  await saveTimer({ date: todayKey(), elapsedMs: 0, running: false });
  stopTick();
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function pickQuote(quotes: string[]): string {
  const validQuotes = quotes.map((quote) => quote.trim()).filter(Boolean);
  if (validQuotes.length === 0) return '算法之路，贵在坚持';
  const index = Math.floor(Date.now() / 86400000) % validQuotes.length;
  return validQuotes[index];
}

function createWidget(config: FloatingWidgetConfig, todayItems: PlanItem[], timer: TimerState): void {
  if (widgetEl) widgetEl.remove();
  stopTick();
  currentTimer = normalizeTimer(timer);

  const doneCount = todayItems.filter((i) => i.status === 'done').length;
  const totalCount = todayItems.length;
  const showProgress = config.showProgress !== false;
  const showTimer = config.showTimer !== false;
  const showQuote = config.showQuote !== false;
  const quote = escapeHtml(pickQuote(config.quotes || []));

  if (config.showMode === 'unfinished' && doneCount >= totalCount && totalCount > 0) return;
  if (!config.enabled) return;
  if (!showProgress && !showTimer && !showQuote) return;

  const progressPercent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const quoteHeight = showTimer ? 24 : showProgress ? 54 : 72;
  const quoteFontSize = showTimer ? 10 : showProgress ? 16 : 18;
  const quoteMarginTop = showProgress ? (showTimer ? 7 : 9) : 0;
  const progressSection = showProgress ? `
    <section style="position:relative; z-index:2;">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:6px;">
        <div style="display:flex; align-items:center; gap:5px; min-width:0;">
          <span style="display:inline-flex; width:16px; height:16px; align-items:center; justify-content:center; border-radius:999px; background:#ffffff; box-shadow:0 4px 10px rgba(118,129,255,0.14); font-size:10px;">🎯</span>
          <span style="font-size:12px; font-weight:950; color:#10224a; white-space:nowrap;">今日进度</span>
        </div>
        <strong style="position:relative; z-index:3; font-size:13px; line-height:1; color:#1db9ff; font-weight:950; white-space:nowrap;">${doneCount}/${totalCount}</strong>
      </div>
      <div style="position:relative; margin-top:6px; height:4px; border-radius:999px; background:#e6ebf5; overflow:hidden; box-shadow:inset 0 1px 2px rgba(15,35,75,0.08);">
        <div style="height:100%; width:${progressPercent}%; min-width:${progressPercent > 0 ? '8px' : '0'}; border-radius:999px; background:linear-gradient(90deg,#35d7ff 0%,#5aa6ff 54%,#6a68ff 100%); transition:width 0.3s;"></div>
      </div>
    </section>
  ` : '';
  const quoteSection = showQuote ? `
    <section style="position:relative; z-index:2; margin-top:${quoteMarginTop}px; height:${quoteHeight}px; display:flex; align-items:center; padding:0 ${showTimer ? 13 : 18}px; border-radius:${showTimer ? 13 : 18}px; background:rgba(255,255,255,0.58); border:1px solid rgba(197,215,247,0.86); overflow:hidden;">
      <span style="position:absolute; left:${showTimer ? 7 : 10}px; top:${showTimer ? -4 : -2}px; color:#bdceff; font-size:${showTimer ? 14 : 24}px; line-height:1; font-family:Georgia,serif; font-weight:900;">“</span>
      <div style="width:100%; color:#0f1f48; font-size:${quoteFontSize}px; line-height:${showTimer ? 1.1 : 1.35}; font-weight:900; letter-spacing:${showTimer ? 0.06 : 0.08}em; ${showTimer ? 'white-space:nowrap; overflow:hidden; text-overflow:ellipsis;' : 'display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;'} font-family:'KaiTi','STKaiti','FangSong','Segoe UI',sans-serif;">${quote}</div>
      <span style="position:absolute; right:${showTimer ? 8 : 11}px; bottom:${showTimer ? 1 : 5}px; color:#bdceff; font-size:${showTimer ? 12 : 20}px; line-height:1; font-family:Georgia,serif; font-weight:900;">”</span>
    </section>
  ` : '';
  const timerSection = showTimer ? `
    <section style="position:relative; z-index:2; margin-top:${showProgress || showQuote ? '7px' : '0'}; display:grid; grid-template-columns:18px 1fr 24px 22px; align-items:center; gap:5px;">
      <span style="display:inline-flex; width:18px; height:18px; align-items:center; justify-content:center; border-radius:7px; background:#ffffff; box-shadow:0 4px 9px rgba(40,58,110,0.09); color:#14baff; font-size:10px;">◷</span>
      <div id="leetspace-timer-time" style="font-size:14px; font-weight:950; line-height:1; letter-spacing:0; color:#13244f; font-variant-numeric:tabular-nums; white-space:nowrap;">
        ${formatTime(getVisibleElapsed(currentTimer))}
      </div>
      <button id="leetspace-timer-toggle" style="width:24px; height:24px; border:1px solid rgba(42,154,242,0.32); border-radius:9px; background:#e9f8ff; color:#0ea5e9; font-size:11px; font-weight:900; cursor:pointer; box-shadow:0 4px 9px rgba(44,166,255,0.16); display:flex; align-items:center; justify-content:center; padding-left:${currentTimer.running ? '0' : '1px'};">${currentTimer.running ? 'Ⅱ' : '▶'}</button>
      <button id="leetspace-timer-reset" style="width:22px; height:22px; border:1px solid rgba(42,154,242,0.16); border-radius:8px; background:#ffffff; color:#18baff; font-size:13px; font-weight:900; cursor:pointer; box-shadow:0 4px 8px rgba(40,58,110,0.08); display:flex; align-items:center; justify-content:center;" title="重置计时">↻</button>
    </section>
  ` : '';

  widgetEl = document.createElement('div');
  widgetEl.id = 'leetspace-floating-widget';
  widgetEl.innerHTML = `
    <div style="
      position: fixed;
      top: 80px;
      right: 20px;
      z-index: 99999;
      width: 200px;
      height: 100px;
      max-width: calc(100vw - 24px);
      background:linear-gradient(145deg,#fbfdff 0%,#f7faff 50%,#eef8ff 100%);
      color:#0e244d;
      padding:12px 12px 9px;
      border-radius:18px;
      border:1px solid rgba(205,218,245,0.92);
      box-shadow:0 12px 28px rgba(113,128,190,0.20), 0 5px 14px rgba(56,189,248,0.11), inset 0 1px 0 rgba(255,255,255,0.92);
      cursor:move;
      user-select:none;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
      transition:opacity 0.2s;
      overflow:hidden;
      backdrop-filter:blur(14px);
    " id="leetspace-widget-inner">
      <div style="position:absolute; left:-8px; top:-4px; width:56px; height:13px; transform:rotate(-29deg); background:rgba(181,190,255,0.18); border-radius:4px;"></div>
      <div style="position:absolute; right:9px; top:13px; width:33px; height:33px; border-radius:999px; border:3px solid rgba(121,128,255,0.14);"></div>
      <div style="position:absolute; right:18px; top:45px; width:36px; height:2px; transform:rotate(-32deg); transform-origin:right center; background:linear-gradient(90deg,transparent,rgba(121,128,255,0.18)); border-radius:999px;"></div>
      ${progressSection}
      ${quoteSection}
      ${timerSection}
      <div style="position:absolute; left:18px; bottom:-12px; width:30px; height:30px; border-radius:999px; background:rgba(226,232,255,0.80);"></div>
      <div style="position:absolute; left:30px; right:24px; bottom:-1px; height:8px; background:repeating-radial-gradient(circle at 6px 0, transparent 0 5px, rgba(226,232,255,0.92) 6px 10px); opacity:0.66;"></div>
    </div>
  `;
  document.body.appendChild(widgetEl);

  const inner = document.getElementById('leetspace-widget-inner')!;
  const toggle = document.getElementById('leetspace-timer-toggle');
  const reset = document.getElementById('leetspace-timer-reset');

  const savedPos = localStorage.getItem('leetspace-widget-pos');
  if (savedPos) {
    try {
      const { top, left } = JSON.parse(savedPos) as { top?: string; left?: string };
      placeWidget(inner, parseFloat(left || `${window.innerWidth - inner.offsetWidth - 20}`), parseFloat(top || '80'));
    } catch {
      placeWidget(inner, window.innerWidth - inner.offsetWidth - 20, 80);
    }
  } else {
    placeWidget(inner, window.innerWidth - inner.offsetWidth - 20, 80);
  }

  toggle?.addEventListener('mousedown', (event) => event.stopPropagation());
  reset?.addEventListener('mousedown', (event) => event.stopPropagation());
  toggle?.addEventListener('click', (event) => {
    event.stopPropagation();
    void toggleTimer();
  });
  reset?.addEventListener('click', (event) => {
    event.stopPropagation();
    void resetTimer();
  });

  inner.addEventListener('mousedown', (event) => {
    isDragging = true;
    const rect = inner.getBoundingClientRect();
    offsetX = event.clientX - rect.left;
    offsetY = event.clientY - rect.top;
    inner.style.opacity = '0.8';
  });

  document.addEventListener('mousemove', (event) => {
    if (!isDragging) return;
    placeWidget(inner, event.clientX - offsetX, event.clientY - offsetY);
  });

  document.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    inner.style.opacity = '1';
    localStorage.setItem('leetspace-widget-pos', JSON.stringify({
      top: inner.style.top,
      left: inner.style.left,
    }));
  });

  window.addEventListener('resize', () => {
    const rect = inner.getBoundingClientRect();
    placeWidget(inner, rect.left, rect.top);
  });

  if (showTimer && currentTimer.running) startTick();
}

function getTodayItems(plans: unknown): PlanItem[] {
  if (!Array.isArray(plans)) return [];

  const today = todayKey();
  if (plans.length === 0) return [];

  if ('items' in (plans[0] as object)) {
    return (plans as PlanGroup[])
      .filter((group) => group.date === today)
      .flatMap((group) => group.items);
  }

  return (plans as PlanItem[]).filter((item) => item.date === today);
}

function loadAndCreateWidget(): void {
  chrome.storage.local.get(['leetspace:settings', 'leetspace:plans', TIMER_KEY], (result: Record<string, unknown>) => {
    const settings = result['leetspace:settings'] as Settings | undefined;
    const plans = result['leetspace:plans'] || [];
    const timer = normalizeTimer(result[TIMER_KEY] as TimerState | undefined);

    if (!settings?.floatingWidget?.enabled) return;

    createWidget(settings.floatingWidget, getTodayItems(plans), timer);
  });
}

export function initFloatingWidget(): void {
  loadAndCreateWidget();

  chrome.storage.onChanged.addListener((changes) => {
    if (changes['leetspace:plans'] || changes['leetspace:settings'] || changes[TIMER_KEY]) {
      chrome.storage.local.get(['leetspace:settings'], (result: Record<string, unknown>) => {
        const settings = result['leetspace:settings'] as Settings | undefined;
        if (!settings?.floatingWidget?.enabled) {
          if (widgetEl) widgetEl.remove();
          stopTick();
          return;
        }
        loadAndCreateWidget();
      });
    }
  });
}







