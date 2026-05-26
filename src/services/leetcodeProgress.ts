type QuestionStatusResponse = {
  data?: {
    question?: {
      status?: string | null;
    } | null;
  };
};

const QUESTION_STATUS_QUERY = `query questionData($titleSlug: String!) {
  question(titleSlug: $titleSlug) {
    status
  }
}`;

async function fetchQuestionStatus(titleSlug: string): Promise<string | null> {
  const response = await fetch('https://leetcode.cn/graphql/', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      operationName: 'questionData',
      variables: { titleSlug },
      query: QUESTION_STATUS_QUERY,
    }),
  });

  if (!response.ok) return null;
  const data = await response.json() as QuestionStatusResponse;
  return data.data?.question?.status || null;
}

function isAcceptedStatus(status: string | null) {
  const normalized = (status || '').toLowerCase();
  return normalized === 'ac' || normalized === 'accepted';
}

export async function fetchAcceptedTitleSlugs(titleSlugs: string[]) {
  const uniqueSlugs = [...new Set(titleSlugs.filter(Boolean))];
  const accepted = new Set<string>();
  const failed: string[] = [];
  const batchSize = 8;

  for (let index = 0; index < uniqueSlugs.length; index += batchSize) {
    const batch = uniqueSlugs.slice(index, index + batchSize);
    const results = await Promise.all(
      batch.map(async (titleSlug) => {
        try {
          const status = await fetchQuestionStatus(titleSlug);
          return { titleSlug, status };
        } catch {
          return { titleSlug, status: null, failed: true };
        }
      })
    );

    for (const result of results) {
      if (isAcceptedStatus(result.status)) accepted.add(result.titleSlug);
      if ('failed' in result && result.failed) failed.push(result.titleSlug);
    }
  }

  return {
    accepted,
    checked: uniqueSlugs.length,
    failed: failed.length,
  };
}
