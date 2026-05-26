import { useState } from 'react';
import { usePlanStore } from '@/stores/planStore';
import { PlanGroup, Problem } from '@/types';

type StudyPlanQuestion = {
  translatedTitle?: string;
  title?: string;
  titleSlug: string;
  questionFrontendId?: string;
  difficulty?: string;
  topicTags?: { name?: string; nameTranslated?: string }[];
};

type StudyPlanResponse = {
  data?: {
    studyPlanV2Detail?: {
      name?: string;
      planSubGroups?: { questions?: StudyPlanQuestion[] }[];
    };
  };
};

type ScanSource = {
  title: string;
  sourceType: PlanGroup['sourceType'];
  sourceSlug?: string;
};

type ProblemsetResponse = {
  data?: {
    problemsetQuestionListV2?: {
      questions?: StudyPlanQuestion[];
      hasMore?: boolean;
    };
  };
};

function normalizeDifficulty(value?: string): Problem['difficulty'] {
  const text = (value || '').toLowerCase();
  if (text.includes('easy')) return 'Easy';
  if (text.includes('hard')) return 'Hard';
  return 'Medium';
}

function getStudyPlanSlug(url?: string): string | null {
  const match = url?.match(/leetcode\.(?:cn|com)\/studyplan\/([\w-]+)/);
  return match?.[1] || null;
}

function getProblemsetSlug(url?: string): string | null {
  const match = url?.match(/leetcode\.(?:cn|com)\/problemset\/([\w-]+)/);
  return match?.[1] || null;
}

function normalizeQuestions(questions: StudyPlanQuestion[]): Problem[] {
  const seen = new Set<string>();

  return questions.reduce<Problem[]>((items, question) => {
    if (!question.titleSlug || seen.has(question.titleSlug)) return items;
    seen.add(question.titleSlug);

    items.push({
      id: question.questionFrontendId || '',
      title: question.translatedTitle || question.title || question.titleSlug,
      titleSlug: question.titleSlug,
      difficulty: normalizeDifficulty(question.difficulty),
      tags: question.topicTags?.map((tag) => tag.nameTranslated || tag.name || '').filter(Boolean) || [],
      url: `https://leetcode.cn/problems/${question.titleSlug}/`,
    });

    return items;
  }, []);
}

function formatSlugTitle(slug: string): string {
  if (slug === 'database') return '数据库题库';
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

async function fetchStudyPlanProblems(slug: string): Promise<{ title: string; problems: Problem[] }> {
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
          name
          planSubGroups {
            questions {
              translatedTitle
              title
              titleSlug
              questionFrontendId
              difficulty
              topicTags { name nameTranslated }
            }
          }
        }
      }`,
    }),
  });

  if (!response.ok) return { title: formatSlugTitle(slug), problems: [] };

  const data = await response.json() as StudyPlanResponse;
  const detail = data.data?.studyPlanV2Detail;
  const questions = detail?.planSubGroups?.flatMap((group) => group.questions || []) || [];
  return { title: detail?.name || formatSlugTitle(slug), problems: normalizeQuestions(questions) };
}

function getProblemsetVariables(slug: string, skip: number, limit: number) {
  if (slug === 'database') {
    return {
      categorySlug: 'all-code-essentials',
      skip,
      limit,
      searchKeyword: '',
      sortBy: null,
      filters: {
        filterCombineType: 'ALL',
        topicFilter: {
          topicSlugs: ['database'],
          operator: 'IS',
        },
      },
    };
  }

  return {
    categorySlug: slug === 'all' ? 'all-code-essentials' : slug,
    skip,
    limit,
    searchKeyword: '',
    sortBy: null,
    filters: null,
  };
}

async function fetchProblemsetProblems(slug: string): Promise<Problem[]> {
  const limit = 100;
  const questions: StudyPlanQuestion[] = [];

  for (let skip = 0; skip < 1000; skip += limit) {
    const response = await fetch('https://leetcode.cn/graphql/', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        operationName: 'problemsetQuestionListV2',
        variables: getProblemsetVariables(slug, skip, limit),
        query: `query problemsetQuestionListV2($filters: QuestionFilterInput, $limit: Int, $searchKeyword: String, $skip: Int, $sortBy: QuestionSortByInput, $categorySlug: String) {
          problemsetQuestionListV2(
            filters: $filters
            limit: $limit
            searchKeyword: $searchKeyword
            skip: $skip
            sortBy: $sortBy
            categorySlug: $categorySlug
          ) {
            questions {
              id
              titleSlug
              title
              translatedTitle
              questionFrontendId
              paidOnly
              difficulty
              topicTags { name slug nameTranslated }
            }
            hasMore
          }
        }`,
      }),
    });

    if (!response.ok) break;

    const data = await response.json() as ProblemsetResponse;
    const page = data.data?.problemsetQuestionListV2;
    const pageQuestions = page?.questions || [];
    questions.push(...pageQuestions);

    if (!page?.hasMore || pageQuestions.length === 0) break;
  }

  return normalizeQuestions(questions);
}

export default function BatchImport() {
  const [mode, setMode] = useState<'idle' | 'scan' | 'url'>('idle');
  const [problems, setProblems] = useState<Problem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [urlInput, setUrlInput] = useState('');
  const [searchText, setSearchText] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | Problem['difficulty']>('all');
  const [showSelection, setShowSelection] = useState(false);
  const [scanSource, setScanSource] = useState<ScanSource>({ title: '扫描题单', sourceType: 'manual' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const addGroupItems = usePlanStore((s) => s.addGroupItems);

  const normalizeUrl = (url: string) => url.trim().replace(/\/$/, '');

  const showScannedProblems = (list: Problem[], source: ScanSource) => {
    setProblems(list);
    setScanSource(source);
    setSelected(new Set(list.map((p) => p.titleSlug)));
    setSearchText('');
    setDifficultyFilter('all');
    setShowSelection(list.length <= 80);
    setMode('scan');
  };

  const filteredProblems = problems.filter((problem) => {
    const keyword = searchText.trim().toLowerCase();
    const matchesKeyword = !keyword ||
      problem.title.toLowerCase().includes(keyword) ||
      problem.titleSlug.toLowerCase().includes(keyword) ||
      problem.id.includes(keyword);
    const matchesDifficulty = difficultyFilter === 'all' || problem.difficulty === difficultyFilter;
    return matchesKeyword && matchesDifficulty;
  });

  const visibleSelectedCount = filteredProblems.filter((problem) => selected.has(problem.titleSlug)).length;

  const handleScanPage = async () => {
    setLoading(true);
    setError('');
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;

      const slug = getStudyPlanSlug(tab.url);
      if (slug) {
        const result = await fetchStudyPlanProblems(slug);
        if (result.problems.length > 0) {
          showScannedProblems(result.problems, {
            title: result.title,
            sourceType: 'studyplan',
            sourceSlug: slug,
          });
          return;
        }
      }

      const problemsetSlug = getProblemsetSlug(tab.url);
      if (problemsetSlug) {
        const list = await fetchProblemsetProblems(problemsetSlug);
        if (list.length > 0) {
          showScannedProblems(list, {
            title: formatSlugTitle(problemsetSlug),
            sourceType: 'problemset',
            sourceSlug: problemsetSlug,
          });
          return;
        }
      }

      const isStudyPlan = await chrome.tabs.sendMessage(tab.id, { type: 'IS_STUDY_PLAN_PAGE' });
      if (!isStudyPlan) {
        setError('当前不是题单/题库页面，请先打开力扣题单页面');
        return;
      }

      const list = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PROBLEM_LIST' }) as Problem[];
      if (!list || list.length === 0) {
        setError('未检测到题目列表，请确认页面已加载完成，或手动向下滚动题单后重试');
        return;
      }

      showScannedProblems(list, {
        title: '页面扫描题单',
        sourceType: 'manual',
        sourceSlug: tab.url || 'page-scan',
      });
    } catch {
      setError('获取失败：请确认扩展已重新加载，并刷新当前力扣页面后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleUrlParse = async () => {
    if (!urlInput.trim()) return;
    setLoading(true);
    setError('');

    try {
      const slugMatch = urlInput.match(/leetcode\.cn\/(?:studyplan|list|problemset)\/([\w-]+)/);
      if (!slugMatch) {
        setError('无法识别链接，请粘贴力扣题单/学习计划链接');
        return;
      }

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        if (tab.url && normalizeUrl(tab.url) === normalizeUrl(urlInput)) {
          setMode('idle');
          setLoading(false);
          await handleScanPage();
          return;
        }

        await chrome.tabs.update(tab.id, { url: urlInput.trim() });
        setError('已跳转到题单页面，请等待加载完成后点击「扫描当前页面」');
      }
    } catch {
      setError('解析失败');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (slug: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const handleImport = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const toImport = problems.filter((p) => selected.has(p.titleSlug));
    await addGroupItems({
      title: scanSource.title,
      sourceType: scanSource.sourceType,
      sourceSlug: scanSource.sourceSlug,
      date: today,
      problems: toImport,
    });
    setMode('idle');
    setProblems([]);
    setSelected(new Set());
    setSearchText('');
    setDifficultyFilter('all');
    setShowSelection(false);
  };

  if (mode === 'scan' && problems.length > 0) {
    return (
      <div className="mt-4 glass-card overflow-hidden slide-up-enter">
        <div className="p-3 border-b border-[var(--border-glass)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold truncate">{scanSource.title}</p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">已选 {selected.size} 题 · 当前筛选 {filteredProblems.length} 题</p>
            </div>
            <button
              onClick={() => setShowSelection((value) => !value)}
              className="shrink-0 text-xs px-3 py-1.5 rounded-full bg-[var(--bg-secondary)] text-[var(--accent)] hover:bg-[var(--glass-bg)] transition-colors"
            >
              {showSelection ? '收起' : '展开选择'}
            </button>
          </div>

          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setSelected(new Set(problems.map((p) => p.titleSlug)))}
              className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border-glass)] text-[var(--accent)]"
            >
              全选
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border-glass)] text-[var(--text-secondary)]"
            >
              清空
            </button>
            <button
              onClick={() => setSelected(new Set(filteredProblems.map((p) => p.titleSlug)))}
              className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border-glass)] text-[var(--text-secondary)]"
            >
              选中筛选
            </button>
          </div>
        </div>

        {showSelection && (
          <div className="p-3 space-y-2">
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="搜索题号、名称或 slug"
              className="w-full px-3 py-2 rounded-xl border border-[var(--border-glass)] bg-[var(--glass-bg)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-opacity-30"
            />

            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {(['all', 'Easy', 'Medium', 'Hard'] as const).map((difficulty) => (
                <button
                  key={difficulty}
                  onClick={() => setDifficultyFilter(difficulty)}
                  className={`shrink-0 px-2.5 py-1 rounded-full text-xs border transition-colors ${
                    difficultyFilter === difficulty
                      ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                      : 'border-[var(--border-glass)] text-[var(--text-secondary)] bg-[var(--bg-secondary)]'
                  }`}
                >
                  {difficulty === 'all' ? '全部' : difficulty}
                </button>
              ))}
            </div>

            <div className="max-h-72 overflow-y-auto rounded-xl border border-[var(--border-glass)] bg-[var(--bg-secondary)]">
              {filteredProblems.length === 0 ? (
                <p className="py-8 text-center text-xs text-[var(--text-secondary)]">没有匹配的题目</p>
              ) : (
                filteredProblems.map((p) => (
                  <label key={p.titleSlug} className="flex items-center gap-2 px-2.5 py-2 text-xs cursor-pointer border-b border-[var(--border-glass)] last:border-b-0 hover:bg-[var(--glass-bg)]">
                    <input
                      type="checkbox"
                      checked={selected.has(p.titleSlug)}
                      onChange={() => toggleSelect(p.titleSlug)}
                      className="rounded"
                    />
                    <span className="min-w-0 flex-1 truncate text-[var(--text-primary)]">{p.id ? `${p.id}. ` : ''}{p.title}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      p.difficulty === 'Easy'
                        ? 'bg-green-500/10 text-green-500'
                        : p.difficulty === 'Hard'
                          ? 'bg-red-500/10 text-red-500'
                          : 'bg-yellow-500/10 text-yellow-500'
                    }`}>{p.difficulty}</span>
                  </label>
                ))
              )}
            </div>
            <p className="text-[11px] text-[var(--text-secondary)]">当前列表已选 {visibleSelectedCount}/{filteredProblems.length} 题</p>
          </div>
        )}

        <div className="sticky bottom-0 flex gap-2 border-t border-[var(--border-glass)] bg-white/80 p-3 backdrop-blur-xl">
          <button
            onClick={handleImport}
            disabled={selected.size === 0}
            className="btn-glass btn-primary-gradient flex-1 rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            导入 {selected.size} 题
          </button>
          <button
            onClick={() => { setMode('idle'); setProblems([]); setSearchText(''); setDifficultyFilter('all'); setShowSelection(false); }}
            className="btn-glass btn-secondary-soft rounded-xl px-3 py-2.5 text-sm"
          >
            取消
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'url') {
    return (
      <div className="glass-card space-y-3 p-4 slide-up-enter">
        <input
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder="粘贴力扣题单链接，如 https://leetcode.cn/studyplan/top-100-liked/"
          className="w-full px-3 py-2 rounded-lg border border-[var(--border-glass)] bg-[var(--glass-bg)] backdrop-blur-sm text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-opacity-30 transition-all duration-200"
        />
        {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={handleUrlParse}
            disabled={loading || !urlInput.trim()}
            className="btn-glass btn-primary-gradient flex-1 rounded-xl py-2 text-sm font-semibold disabled:opacity-50"
          >
            {loading ? '解析中...' : '解析链接'}
          </button>
          <button
            onClick={handleScanPage}
            disabled={loading}
            className="btn-glass btn-secondary-soft flex-1 rounded-xl py-2 text-sm disabled:opacity-50"
          >
            扫描当前页面
          </button>
          <button
            onClick={() => { setMode('idle'); setError(''); }}
            className="btn-glass btn-secondary-soft rounded-xl px-3 py-2 text-sm"
          >
            取消
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleScanPage}
          disabled={loading}
          className="btn-glass btn-secondary-soft rounded-2xl px-3 py-3 text-sm font-medium disabled:opacity-50"
        >
          {loading ? '深度扫描中...' : '⌗ 扫描题单页面'}
        </button>
        <button
          onClick={() => { setMode('url'); setError(''); }}
          className="btn-glass btn-secondary-soft rounded-2xl px-3 py-3 text-sm font-medium"
        >
          🔗 粘贴题单链接
        </button>
      </div>
    </div>
  );
}
