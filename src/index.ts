import dotenv from 'dotenv';
dotenv.config();

import Chat from './models/chat';
import type { Difficulty, TitleSlug } from './types';
import cron from 'node-cron';
import bot from './telegram';
import db from './db';
import leetcode from './leetcode';

/**
 * Telegram bot configurations
 */
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

  if (!chat) {
    return;
  }

  const easy = chat.easySolvedQuestions.length;
  const medium = chat.mediumSolvedQuestions.length;
  const hard = chat.hardSolvedQuestions.length;

  const message = `You have solved:
  😀 ${easy} EASY questions.
  👀 ${medium} MEDIUM questions.
  😰 ${hard} HARD questions.
  🧮 total: ${easy + medium + hard}
  `;
  ctx.sendMessage(message);
});

bot.telegraf.command('another', async (ctx) => {
  const { id } = ctx.chat;

  try {
    const chat = await Chat.findOne({ id });

    if (chat) {
      await ctx.deleteMessage(chat.latestPollId);
      await ctx.deleteMessage(chat.latestQuestionId);
    }

    sendAQuestion(id);
  } catch (error) {
    bot.sendGeneralErrorMessage();
  }
});

bot.telegraf.action(/^(HARD|EASY|MEDIUM)$/, async (ctx) => {
  const { id: chatId } = ctx.chat || {};

  if (!chatId) {
    return;
  }

  const difficulty = ctx.match[0] as Difficulty;

  try {
    await Chat.changeDifficulty(chatId, difficulty);
    ctx.telegram.sendMessage(chatId, `Difficulty changed to ${difficulty}`);
    ctx.deleteMessage(ctx.update.callback_query.message?.message_id);
  } catch (error) {
    console.log(error);
    bot.sendGeneralErrorMessage(chatId);
  }
});

const sendAQuestion = async (chatId?: number) => {
  const mapDifficultyToQuestions: Record<Difficulty, TitleSlug[]> = {
    EASY: [],
    MEDIUM: [],
    HARD: [],
  };
  const filter = chatId ? { id: chatId } : {};
  const chats = await Chat.find(filter);

  for (let i = 0; i < chats.length; i++) {
    const currentChat = chats[i];
    const { difficulty, id } = currentChat;
    const solvedQuestions = currentChat.getSolvedQuestions(difficulty);

    const nominateQuestions =
      mapDifficultyToQuestions[difficulty].length > 0
        ? mapDifficultyToQuestions[difficulty]
        : await leetcode.fetchQuestions(difficulty);

    const question = leetcode.pickUnsolvedQuestion(
      solvedQuestions,
      nominateQuestions,
    );

    try {
      if (!question) {
        bot.telegraf.telegram.sendMessage(
          id,
          `There is no unsolved ${difficulty} questions.`,
        );
        return;
      }

      currentChat.updateSolvedQuestions(difficulty, question);

      const { message_id: questionMessageId } =
        await bot.telegraf.telegram.sendMessage(
          id,
          leetcode.generateQuestionURL(question),
        );

      const { message_id: pollMessageId } =
        await bot.telegraf.telegram.sendPoll(
          id,
          `Did you solve ${question}?`,
          ['Yes ✅', 'No ❌'],
          {
            is_anonymous: false,
            reply_to_message_id: questionMessageId,
          },
        );

      currentChat.updateLatestIds(questionMessageId, pollMessageId);
    } catch (error) {
      console.error(error);
      bot.sendGeneralErrorMessage();
    }
  }
};

/**
 * Cron job
 */
cron.schedule(String(process.env.CRON_REGEX), () => sendAQuestion());

// Launch
db.connect();
bot.telegraf.launch();
