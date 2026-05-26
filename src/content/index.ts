import { Problem } from '@/types';

type ProblemLike = {
  titleSlug?: unknown;
  title?: unknown;
  translatedTitle?: unknown;
  questionFrontendId?: unknown;
  id?: unknown;
  difficulty?: unknown;
  topicTags?: unknown;
};

type JsonObject = Record<string, unknown>;
type ScanSource = 'api' | 'hydration' | 'dom';
type ScannedProblem = Problem & { source?: ScanSource; hasExplicitDifficulty?: boolean };

function parseDifficulty(el: Element | null): 'Easy' | 'Medium' | 'Hard' {
  if (!el) return 'Medium';
  const text = el.textContent?.trim().toLowerCase() || '';
  if (text.includes('easy') || text.includes('简单')) return 'Easy';
  if (text.includes('hard') || text.includes('困难')) return 'Hard';
  return 'Medium';
}

function extractTags(): string[] {
  const tagEls = document.querySelectorAll('a[href*="/tag/"]');
  return Array.from(tagEls)
    .map((el) => el.textContent?.trim() || '')
    .filter(Boolean);
}

function extractProblemInfo(): Problem | null {
  const match = location.pathname.match(/\/problems\/([\w-]+)/);
  if (!match) return null;

  const slug = match[1];

  const titleEl =
    document.querySelector('[data-cy="question-title"]') ||
    document.querySelector('.text-title-large') ||
    document.querySelector('div[class*="title"] > a') ||
    document.querySelector('h4[data-cypress]');

  const diffEl =
    document.querySelector('[diff]') ||
    document.querySelector('[class*="difficulty"]') ||
    document.querySelector('.text-difficulty-easy, .text-difficulty-medium, .text-difficulty-hard');

  const idMatch = titleEl?.textContent?.match(/^(\d+)\./);

  return {
    id: idMatch ? idMatch[1] : '',
    title: titleEl?.textContent?.replace(/^\d+\.\s*/, '').trim() || slug,
    titleSlug: slug,
    difficulty: parseDifficulty(diffEl),
    tags: extractTags(),
    url: location.href,
  };
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function getExplicitDifficultyFromText(text: string): 'Easy' | 'Medium' | 'Hard' | null {
  const matches = Array.from(text.matchAll(/困难|中等|简单|Hard|Medium|Easy/gi));
  const last = matches.length > 0 ? matches[matches.length - 1][0] : '';
  if (/困难|Hard/i.test(last)) return 'Hard';
  if (/中等|Medium/i.test(last)) return 'Medium';
  if (/简单|Easy/i.test(last)) return 'Easy';
  return null;
}

function getDifficultyFromClassName(el: Element | null): 'Easy' | 'Medium' | 'Hard' | null {
  if (!el) return null;
  const text = String((el as HTMLElement).className || '').toLowerCase();
  if (/difficulty[-_\s]?hard|text-difficulty-hard|\bhard\b/.test(text)) return 'Hard';
  if (/difficulty[-_\s]?medium|text-difficulty-medium|\bmedium\b/.test(text)) return 'Medium';
  if (/difficulty[-_\s]?easy|text-difficulty-easy|\beasy\b/.test(text)) return 'Easy';
  return null;
}

function inferDifficulty(row: Element | null, linkEl: Element): 'Easy' | 'Medium' | 'Hard' {
  const candidates = [
    linkEl,
    row,
    ...(row ? Array.from(row.querySelectorAll('[class*="difficulty"], [class*="Difficulty"], [class*="easy"], [class*="medium"], [class*="hard"]')) : []),
  ].filter(Boolean) as Element[];

  for (const candidate of candidates) {
    const fromClass = getDifficultyFromClassName(candidate);
    if (fromClass) return fromClass;
  }

  const rowText = normalizeText(row?.textContent || linkEl.textContent || '');
  return getExplicitDifficultyFromText(rowText) || 'Medium';
}

function findProblemRow(linkEl: Element): Element | null {
  let current: Element | null = linkEl;

  for (let depth = 0; current && depth < 8; depth += 1) {
    const text = normalizeText(current.textContent || '');
    const hasDifficulty = /简单|中等|困难|Easy|Medium|Hard/i.test(text);
    const hasAcceptRate = /\d+(?:\.\d+)?%/.test(text);
    const problemLinks = Array.from(current.querySelectorAll('a[href*="/problems/"]'));
    const distinctProblemLinks = new Set(
      problemLinks
        .map((link) => link.getAttribute('href')?.match(/\/problems\/([\w-]+)/)?.[1])
        .filter(Boolean)
    );
    const isSingleProblemScope = distinctProblemLinks.size <= 1;
    const isReasonableSize = text.length > 0 && text.length < 180;

    if (isSingleProblemScope && isReasonableSize && (hasDifficulty || hasAcceptRate)) {
      return current;
    }

    current = current.parentElement;
  }

  return linkEl.closest('[role="row"], tr, li') || linkEl.parentElement;
}

function cleanProblemTitle(text: string, slug: string): string {
  const normalized = normalizeText(text);
  const structuredMatch = normalized.match(/^\d+\.\s*(.+?)(?:\d+(?:\.\d+)?%|简单|中等|困难|Easy|Medium|Hard|$)/i);
  const source = structuredMatch?.[1] || normalized;
  const title = source
    .replace(/^\d+\.\s*/, '')
    .replace(/\d+(?:\.\d+)?%/g, '')
    .replace(/\b(?:Easy|Medium|Hard)\b/gi, '')
    .replace(/简单|中等|困难/g, '')
    .replace(/[🔒锁]/g, '')
    .trim();

  return title || slug;
}

function extractTitleSource(linkEl: Element, row: Element | null): string {
  const linkText = normalizeText(linkEl.textContent || '');
  const rowText = normalizeText(row?.textContent || '');
  const looksLikeOnlySlug = /^[a-z0-9-]+$/i.test(linkText);

  if (!linkText || looksLikeOnlySlug || linkText.length < 2) {
    return rowText;
  }

  if (/\d+(?:\.\d+)?%|简单|中等|困难|Easy|Medium|Hard/i.test(linkText)) {
    return linkText;
  }

  return linkText;
}

function parseRawDifficulty(value: unknown): 'Easy' | 'Medium' | 'Hard' | null {
  const text = String(value || '').toLowerCase();
  if (text.includes('easy') || text.includes('简单')) return 'Easy';
  if (text.includes('medium') || text.includes('中等')) return 'Medium';
  if (text.includes('hard') || text.includes('困难')) return 'Hard';
  return null;
}

function normalizeProblem(raw: ProblemLike, source: ScanSource = 'hydration'): ScannedProblem | null {
  if (typeof raw.titleSlug !== 'string' || !raw.titleSlug) return null;

  const title =
    typeof raw.translatedTitle === 'string' && raw.translatedTitle
      ? raw.translatedTitle
      : typeof raw.title === 'string' && raw.title
        ? raw.title
        : raw.titleSlug;

  const tags = Array.isArray(raw.topicTags)
    ? raw.topicTags
        .map((tag) => {
          if (!tag || typeof tag !== 'object') return '';
          const item = tag as JsonObject;
          return String(item.nameTranslated || item.name || '').trim();
        })
        .filter(Boolean)
    : [];

  const explicitDifficulty = parseRawDifficulty(raw.difficulty);

  return {
    id: String(raw.questionFrontendId || raw.id || ''),
    title: normalizeText(title),
    titleSlug: raw.titleSlug,
    difficulty: explicitDifficulty || 'Medium',
    tags,
    url: `https://leetcode.cn/problems/${raw.titleSlug}/`,
    source,
    hasExplicitDifficulty: Boolean(explicitDifficulty),
  };
}

function collectProblemsFromJson(value: unknown, collect: Map<string, ScannedProblem>, source: ScanSource = 'hydration'): void {
  if (!value || typeof value !== 'object') return;

  if (Array.isArray(value)) {
    value.forEach((item) => collectProblemsFromJson(item, collect, source));
    return;
  }

  const object = value as JsonObject;
  const problem = normalizeProblem(object as ProblemLike, source);
  if (problem) collect.set(problem.titleSlug, problem);

  Object.values(object).forEach((child) => collectProblemsFromJson(child, collect, source));
}

function extractProblemListFromHydration(): ScannedProblem[] {
  const script = document.querySelector<HTMLScriptElement>('#__NEXT_DATA__');
  if (!script?.textContent) return [];

  try {
    const collected = new Map<string, ScannedProblem>();
    collectProblemsFromJson(JSON.parse(script.textContent), collected);
    return Array.from(collected.values());
  } catch {
    return [];
  }
}

function getStudyPlanSlug(): string | null {
  const match = location.pathname.match(/\/studyplan\/([\w-]+)/);
  return match?.[1] || null;
}

function isProblemsetPage(): boolean {
  return /\/problemset\//.test(location.pathname);
}

async function extractProblemListFromGraphQL(): Promise<ScannedProblem[]> {
  const slug = getStudyPlanSlug();
  if (!slug) return [];

  const response = await fetch('https://leetcode.cn/graphql/', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      operationName: 'studyPlanV2Detail',
      variables: { slug },
      query: `query studyPlanV2Detail($slug: String!) {
        studyPlanV2Detail(planSlug: $slug) {
          slug
          name
          planSubGroups {
            slug
            name
            questions {
              translatedTitle
              title
              titleSlug
              questionFrontendId
              difficulty
              topicTags { name nameTranslated slug }
            }
          }
        }
      }`,
    }),
  });

  if (!response.ok) return [];

  const data = await response.json();
  const collected = new Map<string, ScannedProblem>();
  collectProblemsFromJson(data, collected, 'api');
  return Array.from(collected.values());
}

async function extractProblemsetFromGraphQL(limit = 200): Promise<ScannedProblem[]> {
  if (!isProblemsetPage()) return [];

  const response = await fetch('https://leetcode.cn/graphql/', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      operationName: 'problemsetQuestionList',
      variables: {
        categorySlug: '',
        skip: 0,
        limit,
        filters: {},
      },
      query: `query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
        problemsetQuestionList(categorySlug: $categorySlug, limit: $limit, skip: $skip, filters: $filters) {
          questions {
            frontendQuestionId
            title
            titleSlug
            translatedTitle
            difficulty
            topicTags { name nameTranslated slug }
          }
        }
      }`,
    }),
  });

  if (!response.ok) return [];

  const data = await response.json();
  const questions = data?.data?.problemsetQuestionList?.questions;
  if (!Array.isArray(questions)) return [];

  return questions
    .map((question) => normalizeProblem({
      ...(question as JsonObject),
      questionFrontendId: (question as JsonObject).frontendQuestionId,
    } as ProblemLike, 'api'))
    .filter(Boolean) as ScannedProblem[];
}

function extractProblemList(): ScannedProblem[] {
  const problems: ScannedProblem[] = [];
  const seen = new Set<string>();

  const links = document.querySelectorAll('a[href*="/problems/"]');

  links.forEach((linkEl) => {
    const href = linkEl.getAttribute('href') || '';
    const slugMatch = href.match(/\/problems\/([\w-]+)/);
    if (!slugMatch) return;

    const slug = slugMatch[1];
    if (seen.has(slug)) return;
    seen.add(slug);

    const row = findProblemRow(linkEl);
    const titleText = extractTitleSource(linkEl, row);
    if (!titleText || titleText.length > 200) return;

    const idMatch = titleText.match(/^(\d+)\.\s*/);
    const difficulty = inferDifficulty(row, linkEl);

    problems.push({
      id: idMatch ? idMatch[1] : '',
      title: cleanProblemTitle(linkEl.textContent || titleText, slug),
      titleSlug: slug,
      difficulty,
      tags: [],
      url: `https://leetcode.cn/problems/${slug}/`,
      source: 'dom',
      hasExplicitDifficulty: true,
    });
  });

  return problems;
}

function upsertScannedProblem(collect: Map<string, ScannedProblem>, problem: ScannedProblem): void {
  const existing = collect.get(problem.titleSlug);
  if (!existing) {
    collect.set(problem.titleSlug, problem);
    return;
  }

  const sourcePriority: Record<ScanSource, number> = {
    api: 3,
    dom: 2,
    hydration: 1,
  };

  if (sourcePriority[problem.source || 'hydration'] > sourcePriority[existing.source || 'hydration']) {
    collect.set(problem.titleSlug, { ...existing, ...problem });
    return;
  }

  if (!existing.hasExplicitDifficulty && problem.hasExplicitDifficulty) {
    collect.set(problem.titleSlug, { ...existing, ...problem });
    return;
  }

  if (problem.source === 'api' && existing.source !== 'api') {
    collect.set(problem.titleSlug, { ...existing, ...problem });
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getScrollableElements(): Element[] {
  return Array.from(document.querySelectorAll('main, [class*="overflow"], [class*="scroll"], div')).filter((el) => {
    const style = window.getComputedStyle(el);
    const canScroll = /(auto|scroll)/.test(`${style.overflowY}${style.overflow}`);
    return canScroll && el.scrollHeight > el.clientHeight + 80;
  });
}

async function scanByScrollingElement(element: Element | Window, collect: Map<string, ScannedProblem>): Promise<void> {
  const isWindow = element === window;
  const scrollTarget = isWindow ? document.scrollingElement || document.documentElement : element as HTMLElement;
  const originalTop = isWindow ? window.scrollY : (scrollTarget as HTMLElement).scrollTop;
  let stableRounds = 0;
  let previousCount = collect.size;
  let previousTop = -1;

  for (let i = 0; i < 35; i += 1) {
    extractProblemList().forEach((problem) => upsertScannedProblem(collect, problem));

    const nextTop = Math.min(
      scrollTarget.scrollHeight - scrollTarget.clientHeight,
      scrollTarget.scrollTop + Math.max(360, Math.floor(scrollTarget.clientHeight * 0.8))
    );

    if (nextTop <= scrollTarget.scrollTop || nextTop === previousTop) {
      stableRounds += 1;
    } else {
      stableRounds = collect.size === previousCount ? stableRounds + 1 : 0;
    }

    previousCount = collect.size;
    previousTop = nextTop;

    if (isWindow) window.scrollTo({ top: nextTop, behavior: 'auto' });
    else (scrollTarget as HTMLElement).scrollTop = nextTop;

    await wait(180);

    if (stableRounds >= 3) break;
  }

  extractProblemList().forEach((problem) => upsertScannedProblem(collect, problem));

  if (isWindow) window.scrollTo({ top: originalTop, behavior: 'auto' });
  else (scrollTarget as HTMLElement).scrollTop = originalTop;
}

async function extractProblemListDeep(): Promise<Problem[]> {
  const collected = new Map<string, ScannedProblem>();
  extractProblemListFromHydration().forEach((problem) => upsertScannedProblem(collected, problem));

  const hasReliableDifficulty = Array.from(collected.values()).some((problem) => problem.hasExplicitDifficulty);
  if (collected.size === 0 || !hasReliableDifficulty) {
    const graphQLProblems = await extractProblemListFromGraphQL();
    graphQLProblems.forEach((problem) => upsertScannedProblem(collected, problem));
  }

  if (isProblemsetPage()) {
    const problemsetProblems = await extractProblemsetFromGraphQL();
    problemsetProblems.forEach((problem) => upsertScannedProblem(collected, problem));
  }

  if (collected.size >= 50 && Array.from(collected.values()).some((problem) => problem.hasExplicitDifficulty)) {
    return Array.from(collected.values());
  }

  extractProblemList().forEach((problem) => upsertScannedProblem(collected, problem));

  await scanByScrollingElement(window, collected);

  for (const element of getScrollableElements().slice(0, 6)) {
    await scanByScrollingElement(element, collected);
  }

  return Array.from(collected.values());
}

function isStudyPlanPage(): boolean {
  return /\/(studyplan|list|problemset)/.test(location.pathname);
}

let lastAcceptedSlug = '';
let lastAcceptedAt = 0;

function isAcceptedText(text: string): boolean {
  return /\bAccepted\b|执行通过|通过|已通过|答案正确|Accepted/i.test(text);
}

function notifySubmissionAccepted(): void {
  const problem = extractProblemInfo();
  if (!problem) return;

  const now = Date.now();
  if (lastAcceptedSlug === problem.titleSlug && now - lastAcceptedAt < 8000) return;
  lastAcceptedSlug = problem.titleSlug;
  lastAcceptedAt = now;

  chrome.runtime.sendMessage({ type: 'SUBMISSION_SUCCESS', problem });
}

function detectSubmissionSuccess(): void {
  const observer = new MutationObserver(() => {
    const resultEls = document.querySelectorAll([
      '[data-e2e-locator="submission-result"]',
      '[class*="success"]',
      '[class*="accepted"]',
      '[class*="result"]',
      '[class*="submission"]',
    ].join(','));

    const matched = Array.from(resultEls).some((el) => isAcceptedText(el.textContent || ''));
    if (matched || isAcceptedText(document.body.innerText.slice(-3000))) {
      notifySubmissionAccepted();
    }
  });

  const target = document.querySelector('#app') || document.body;
  observer.observe(target, { childList: true, subtree: true });
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'GET_PROBLEM_INFO') {
    sendResponse(extractProblemInfo());
  }
  if (msg.type === 'GET_PROBLEM_LIST') {
    void extractProblemListDeep()
      .then(sendResponse)
      .catch(() => sendResponse(extractProblemList()));
  }
  if (msg.type === 'IS_STUDY_PLAN_PAGE') {
    sendResponse(isStudyPlanPage());
  }
  return true;
});

import { initFloatingWidget } from './floating-widget';

detectSubmissionSuccess();
initFloatingWidget();
