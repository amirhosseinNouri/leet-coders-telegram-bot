import dotenv from 'dotenv';
import Chat from './models/chat';
import type { Difficulty, TitleSlug } from './types';
import cron from 'node-cron';
import bot from './telegram';
import db from './db';
import leetcode from './leetcode';

dotenv.config();

// Telegram bot configurations
bot.setupBotCommands();

/**
 * Telegram bot handlers
 */
bot.telegraf.command('start', (ctx) => {
  ctx.replyWithMarkdownV2('Choose difficulty', bot.difficultyInlineKeyboard);
});

bot.telegraf.command('difficulty', (ctx) => {
  ctx.replyWithMarkdownV2('Choose difficulty', bot.difficultyInlineKeyboard);
});

bot.telegraf.command('total', async (ctx) => {
  const { id } = ctx.chat;
  const chat = await Chat.findOne({ id });
  ctx.sendMessage(`You have solved ${chat?.solvedQuestions.length}`);
});

bot.telegraf.action(/^(HARD|EASY|MEDIUM)$/, async (ctx) => {
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
    bot.sendGeneralErrorMessage(chatId);
  }
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

cron.schedule(String(process.env.CRON_REGEX), async () => {
  const mapDifficultyToQuestions: Record<Difficulty, TitleSlug[]> = {
    EASY: [],
    MEDIUM: [],
    HARD: [],
  };

  const chats = await Chat.find();

  for (let i = 0; i < chats.length; i++) {
    const { difficulty, id, solvedQuestions } = chats[i];

    const nominateQuestions =
      mapDifficultyToQuestions[difficulty].length > 0
        ? mapDifficultyToQuestions[difficulty]
        : await leetcode.fetchQuestions(difficulty);

    const question = leetcode.pickUnsolvedQuestion(
      solvedQuestions,
      nominateQuestions,
    );

    if (!question) {
      bot.telegraf.telegram.sendMessage(
        id,
        `There is no unsolved ${difficulty} questions.`,
      );
      return;
    }

    await Chat.findOneAndUpdate(
      { id },
      { solvedQuestions: [...solvedQuestions, question] },
    );

    const { message_id } = await bot.telegraf.telegram.sendMessage(
      id,
      leetcode.generateQuestionURL(question),
    );

    bot.telegraf.telegram.sendPoll(
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

bot.telegraf.launch();

db.connect();
