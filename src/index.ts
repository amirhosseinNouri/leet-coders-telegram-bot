import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { z } from 'zod';
import { Markup, Telegraf } from 'telegraf';
import Chat from './models/chat';
import type { Difficulty } from './models/chat';
import cron from 'node-cron';

const LEET_CODE_BASE_URL = 'https://leetcode.com/problems';

dotenv.config();

const bot = new Telegraf(String(process.env.TELEGRAM_API_TOKEN));

bot.telegram.deleteMyCommands();
bot.telegram.setMyCommands([
  { command: '/start', description: 'start the bot' },
  { command: '/difficulty', description: 'Change difficulty' },
  { command: '/total', description: 'Get the total of solved questions' },
]);

const buttons = Markup.inlineKeyboard([
  Markup.button.callback('EASY', 'EASY'),
  Markup.button.callback('MEDIUM', 'MEDIUM'),
  Markup.button.callback('HARD', 'HARD'),
]);

bot.command('start', (ctx) => {
  ctx.replyWithMarkdownV2('Choose difficulty', buttons);
});

bot.command('difficulty', (ctx) => {
  ctx.replyWithMarkdownV2('Choose difficulty', buttons);
});

const handleSetDifficulty = async (
  chatId: number | undefined,
  difficulty: Difficulty,
) => {
  if (!chatId) {
    return;
  }

  return Chat.findOneAndUpdate(
    { id: chatId },
    { id: chatId, difficulty },
    { upsert: true },
  );
};

bot.command('total', async (ctx) => {
  const { id } = ctx.chat;
  const chat = await Chat.findOne({ id });
  ctx.sendMessage(`You have solved ${chat?.solvedQuestions.length}`);
});

const sendGeneralErrorMessage = (chatId?: number) => {
  if (!chatId) {
    return;
  }

  bot.telegram.sendMessage(chatId, 'An error has occurred. Please try again');
};

bot.action(/^(HARD|EASY|MEDIUM)$/, async (ctx) => {
  const { id: chatId } = ctx.chat || {};

  if (!chatId) {
    return;
  }

  const difficulty = ctx.match[0] as Difficulty;

  try {
    await handleSetDifficulty(chatId, difficulty);
    ctx.telegram.sendMessage(chatId, `Difficulty changed to ${difficulty}`);
    ctx.deleteMessage(ctx.update.callback_query.message?.message_id);
  } catch (error) {
    console.log(error);
    sendGeneralErrorMessage(chatId);
  }
});

bot.launch();

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

type LeetCodeQuestion = z.infer<typeof LeetCodeQuestionSchema>;
type LeetCodeResponse = z.infer<typeof LeetCodeResponseSchema>;

type TitleSlug = string;

const limit = 1000;

type FetchQuestions = (difficulty: Difficulty) => Promise<TitleSlug[]>;

const fetchQuestions: FetchQuestions = async (difficulty) => {
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

  return response.data.problemsetQuestionList.questions.map(
    (question) => question.titleSlug,
  );
};

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

const generateLeetCodeQuestionURL = (slug: TitleSlug): string =>
  `${LEET_CODE_BASE_URL}/${slug}`;

cron.schedule(String(process.env.CRON_REGEX), async () => {
  const mapDifficultyToQuestions: Record<Difficulty, TitleSlug[]> = {
    EASY: [],
    MEDIUM: [],
    HARD: [],
  };

  const chats = await Chat.find();

  for (let i = 0; i < chats.length; i++) {
    const { difficulty, id, solvedQuestions } = chats[i];

    console.log({ difficulty });

    const nominateQuestions =
      mapDifficultyToQuestions[difficulty].length > 0
        ? mapDifficultyToQuestions[difficulty]
        : await fetchQuestions(difficulty);

    const question = pickUnsolvedQuestion(solvedQuestions, nominateQuestions);

    if (!question) {
      bot.telegram.sendMessage(
        id,
        `There is no unsolved ${difficulty} questions.`,
      );
      return;
    }

    await Chat.findOneAndUpdate(
      { id },
      { solvedQuestions: [...solvedQuestions, question] },
    );

    const { message_id } = await bot.telegram.sendMessage(
      id,
      generateLeetCodeQuestionURL(question),
    );

    bot.telegram.sendPoll(
      id,
      `Did you solve ${question}?`,
      ['Yes ✅', 'No ❌'],
      {
        is_anonymous: false,
        reply_to_message_id: message_id,
      },
    );
  }
});

mongoose
  .connect(String(process.env.DB_URL))
  .then(() => console.log('db connected successfully'));
