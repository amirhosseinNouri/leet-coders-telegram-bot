import { z } from 'zod';
import type { Difficulty, TitleSlug } from './types';
import logger from './logger';

const DEFAULT_LIMIT = 1000;
const LEET_CODE_BASE_URL = 'https://leetcode.com/problems';

const LeetCodeQuestionSchema = z.object({
  titleSlug: z.string(),
});

const LeetCodeResponseSchema = z.object({
  data: z.object({
    problemsetQuestionList: z.object({
      total: z.number(),
      questions: z.array(LeetCodeQuestionSchema),
    }),
  }),
});

type FetchQuestions = (
  difficulty: Difficulty,
  limit?: number,
) => Promise<TitleSlug[]>;

const fetchQuestions: FetchQuestions = async (
  difficulty,
  limit = DEFAULT_LIMIT,
) => {
  const data = await fetch('https://leetcode.com/graphql/', {
    headers: {
      'Content-Type': 'application/json',
    },
    body: `{"query":"\\n    query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {\\n  problemsetQuestionList: questionList(\\n    categorySlug: $categorySlug\\n    limit: $limit\\n    skip: $skip\\n    filters: $filters\\n  ) {\\n    total: totalNum\\n    questions: data {\\n      acRate\\n      difficulty\\n      freqBar\\n      frontendQuestionId: questionFrontendId\\n      isFavor\\n      paidOnly: isPaidOnly\\n      status\\n      title\\n      titleSlug\\n      topicTags {\\n        name\\n        id\\n        slug\\n      }\\n      hasSolution\\n      hasVideoSolution\\n    }\\n  }\\n}\\n    ","variables":{"categorySlug":"algorithms","skip":0,"limit":${limit},"filters":{"difficulty":"${difficulty}"}},"operationName":"problemsetQuestionList"}`,
    method: 'POST',
    credentials: 'include',
  });
  const payload = await data.json();
  const response = LeetCodeResponseSchema.parse(payload);
  const questionTitles = response.data.problemsetQuestionList.questions.map(
    (question) => question.titleSlug,
  );

  logger.info(`Got ${questionTitles.length} questions from LeetCode.`);

  return questionTitles;
};

const generateQuestionURL = (slug: TitleSlug): string =>
  `${LEET_CODE_BASE_URL}/${slug}`;

const pickUnsolvedQuestion = (
  solvedQuestions: TitleSlug[],
  nominatedQuestions: TitleSlug[],
): TitleSlug | null => {
  for (let i = 0; i < nominatedQuestions.length; i++) {
    const currentNominatedQuestion = nominatedQuestions[i];
    if (!solvedQuestions.includes(currentNominatedQuestion)) {
      return currentNominatedQuestion;
    }
  }

  return null;
};

export default { fetchQuestions, generateQuestionURL, pickUnsolvedQuestion };
