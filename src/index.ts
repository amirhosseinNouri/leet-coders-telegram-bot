import dotenv from 'dotenv';
dotenv.config();

import Chat from './models/chat';
import type { Difficulty, TitleSlug } from './types';
import cron from 'node-cron';
import bot from './telegram';
import mongoose from 'mongoose';
import leetcode from './leetcode';
import { getHumanReadableCronExpression } from './cron';
import logger from './logger';

/**
 * Telegram bot configurations
 */
bot.setupBotCommands();

/**
 * Telegram bot handlers
 */
bot.telegraf.command('start', (ctx) => {
  try {
    ctx.replyWithMarkdownV2('Choose difficulty', bot.difficultyInlineKeyboard);
  } catch (error) {
    logger.error(`Failed to run /start command: ${error}`);
    bot.sendGeneralErrorMessage();
  }
});

bot.telegraf.command('difficulty', (ctx) => {
  try {
    ctx.replyWithMarkdownV2('Choose difficulty', bot.difficultyInlineKeyboard);
  } catch (error) {
    logger.error(`Failed to run /difficulty command: ${error}`);
    bot.sendGeneralErrorMessage();
  }
});

bot.telegraf.command('total', async (ctx) => {
  const { id } = ctx.chat;

  try {
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
  } catch (error) {
    logger.error(`Failed to run /total command: ${error}`);
    bot.sendGeneralErrorMessage();
  }
});

bot.telegraf.command('another', async (ctx) => {
  const { id } = ctx.chat;

  try {
    const chat = await Chat.findOne({ id });

    const hasPreviousMessages = chat?.latestPollId && chat?.latestQuestionId;

    if (chat && hasPreviousMessages) {
      await ctx.deleteMessage(chat.latestPollId);
      await ctx.deleteMessage(chat.latestQuestionId);
    }

    sendAQuestion(id);
  } catch (error) {
    logger.error(`Failed to run /another command: ${error}`);
    bot.sendGeneralErrorMessage();
  }
});

bot.telegraf.command('next', async (ctx) => {
  const { id } = ctx.chat;

  try {
    const chat = await Chat.findOne({ id });

    sendAQuestion(id);
  } catch (error) {
    logger.error(`Failed to run /another command: ${error}`);
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
    ctx.telegram.sendMessage(
      chatId,
      `I will send ${difficulty} questions ${getHumanReadableCronExpression()}`,
    );
    ctx.telegram.sendMessage(chatId, `Difficulty changed to ${difficulty}`);
    ctx.deleteMessage(ctx.update.callback_query.message?.message_id);
    logger.info(`Difficulty level change to ${difficulty} for ${chatId} chat`);
  } catch (error) {
    logger.error(`Failed to change difficulty level: ${error}`);
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

  logger.info(`Going to send a new question for ${chats.length} chats.`);

  for (let i = 0; i < chats.length; i++) {
    const currentChat = chats[i];
    const { difficulty, id } = currentChat;

    try {
      const solvedQuestions = currentChat.getSolvedQuestions(difficulty);

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
          ['✅', '❌'],
          {
            is_anonymous: false,
            reply_to_message_id: questionMessageId,
          },
        );

      currentChat.updateLatestIds(questionMessageId, pollMessageId);
    } catch (error) {
      logger.error(`Failed to send a question: ${error}`);
      bot.sendErrorMessage(
        currentChat.id,
        `Failed to send a new question. Please try /another command.`,
      );
    }
  }
};

logger.info(getHumanReadableCronExpression());

const run = async () => {
  try {
    // DB connection
    await mongoose.connect(String(process.env.DB_URL));
    logger.info('DB connected successfully');

    // Launch Telegram bot
    bot.telegraf.launch();
    logger.info('Telegram bot launched successfully.');

    // Schedule cron job
    cron.schedule(String(process.env.CRON_REGEX), () => sendAQuestion(), {
      timezone: String(process.env.TIMEZONE),
    });
  } catch (error) {
    logger.error(`An error has happened: ${error}`);
  }
};

process.on('unhandledRejection', (err: Error) => {
  logger.error(`🔥 UNHANDLED REJECTION: ${err.name}.`);
});

run();
