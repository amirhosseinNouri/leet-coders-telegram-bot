import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { z } from 'zod';
import { Markup, Telegraf } from 'telegraf';

dotenv.config();

const bot = new Telegraf(String(process.env.TELEGRAM_API_TOKEN));

bot.telegram.setMyCommands([
  { command: '/start', description: 'start the bot' },
  { command: '/stop', description: 'stop' },
]);

const buttons = Markup.inlineKeyboard([
  Markup.button.callback('EASY', 'EASY'),
  Markup.button.callback('MEDIUM', 'MEDIUM'),
  Markup.button.callback('HARD', 'HARD'),
]);

bot.command('start', async (ctx) => {
  ctx.replyWithMarkdownV2('Choose difficulty', buttons);

  // ctx.sendPoll("Did you solve today's question?", ['Yes ✅', 'No ❌'], {
  //   is_anonymous: false,
  // });
});

bot.action('EASY', (ctx) => {
  console.log(ctx.match[0]);
  ctx.deleteMessage(ctx.update.callback_query.message?.message_id);
});

bot.action('MEDIUM', (ctx) => {
  console.log(ctx.match[0]);
});

bot.action('HARD', (ctx) => {
  console.log(ctx.match[0]);
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

const limit = 1000;
const difficulty = 'EASY';

fetch('https://leetcode.com/graphql/', {
  headers: {
    'Content-Type': 'application/json',
  },
  body: `{"query":"\\n    query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {\\n  problemsetQuestionList: questionList(\\n    categorySlug: $categorySlug\\n    limit: $limit\\n    skip: $skip\\n    filters: $filters\\n  ) {\\n    total: totalNum\\n    questions: data {\\n      acRate\\n      difficulty\\n      freqBar\\n      frontendQuestionId: questionFrontendId\\n      isFavor\\n      paidOnly: isPaidOnly\\n      status\\n      title\\n      titleSlug\\n      topicTags {\\n        name\\n        id\\n        slug\\n      }\\n      hasSolution\\n      hasVideoSolution\\n    }\\n  }\\n}\\n    ","variables":{"categorySlug":"algorithms","skip":0,"limit":${limit},"filters":{"difficulty":"${difficulty}"}},"operationName":"problemsetQuestionList"}`,
  method: 'POST',
  credentials: 'include',
})
  .then((res) => res.json())
  .then((data) => {
    const res = LeetCodeResponseSchema.parse(data);
    console.log(res.data.problemsetQuestionList.total);
  })
  .catch((e) => console.error(e));

mongoose
  .connect(String(process.env.DB_URL))
  .then(() => console.log('db connected successfully'));
