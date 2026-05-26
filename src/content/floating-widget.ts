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

function createWidget(config: FloatingWidgetConfig, todayItems: PlanItem[], timer: TimerState): void {
  if (widgetEl) widgetEl.remove();
  stopTick();
  currentTimer = normalizeTimer(timer);

  const doneCount = todayItems.filter((i) => i.status === 'done').length;
  const totalCount = todayItems.length;

  if (config.showMode === 'unfinished' && doneCount >= totalCount && totalCount > 0) return;
  if (!config.enabled) return;

  widgetEl = document.createElement('div');
  widgetEl.id = 'leetspace-floating-widget';
  widgetEl.innerHTML = `
    <div style="
      position: fixed;
      top: 80px;
      right: 20px;
      z-index: 99999;
      width: 190px;
      background: linear-gradient(135deg, #2563eb, #8b5cf6);
      color: white;
      padding: 12px 14px;
      border-radius: 16px;
      box-shadow: 0 10px 28px rgba(37,99,235,0.28);
      cursor: move;
      user-select: none;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      transition: opacity 0.2s;
    " id="leetspace-widget-inner">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
        <div style="font-size: 13px; font-weight: 700;">今日进度</div>
        <div style="font-size: 13px; font-weight: 800;">${doneCount}/${totalCount}</div>
      </div>
      <div style="
        margin-top: 7px;
        height: 4px;
        background: rgba(255,255,255,0.25);
        border-radius: 999px;
        overflow: hidden;
      ">
        <div style="
          height: 100%;
          width: ${totalCount > 0 ? (doneCount / totalCount) * 100 : 0}%;
          background: white;
          border-radius: 999px;
          transition: width 0.3s;
        "></div>
      </div>
      <div style="margin-top: 10px; display:flex; align-items:center; justify-content:space-between; gap:8px;">
        <div id="leetspace-timer-time" style="font-size: 18px; font-weight: 800; letter-spacing: 0.04em; font-variant-numeric: tabular-nums;">
          ${formatTime(getVisibleElapsed(currentTimer))}
        </div>
        <div style="display:flex; align-items:center; gap:6px;">
          <button id="leetspace-timer-toggle" style="
            width: 30px;
            height: 30px;
            border: 0;
            border-radius: 999px;
            background: rgba(255,255,255,0.95);
            color: #2563eb;
            font-size: 13px;
            font-weight: 800;
            cursor: pointer;
          ">${currentTimer.running ? '⏸' : '▶'}</button>
          <button id="leetspace-timer-reset" style="
            width: 30px;
            height: 30px;
            border: 0;
            border-radius: 999px;
            background: rgba(255,255,255,0.16);
            color: white;
            font-size: 13px;
            font-weight: 800;
            cursor: pointer;
          " title="重置计时">↺</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(widgetEl);

  const inner = document.getElementById('leetspace-widget-inner')!;
  const toggle = document.getElementById('leetspace-timer-toggle')!;
  const reset = document.getElementById('leetspace-timer-reset')!;

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

  toggle.addEventListener('mousedown', (event) => event.stopPropagation());
  reset.addEventListener('mousedown', (event) => event.stopPropagation());
  toggle.addEventListener('click', (event) => {
    event.stopPropagation();
    void toggleTimer();
  });
  reset.addEventListener('click', (event) => {
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

  if (currentTimer.running) startTick();
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
