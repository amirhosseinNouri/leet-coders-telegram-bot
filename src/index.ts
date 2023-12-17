import dotenv from 'dotenv';
import Chat from './models/chat';
import type { Difficulty, TitleSlug } from './types';
import cron from 'node-cron';
import bot, { difficultyInlineKeyboard, setupBotCommands } from './telegram';
import db from './db';
import leetcode from './leetcode';

dotenv.config();

// Telegram bot configurations
setupBotCommands();

bot.command('start', (ctx) => {
  ctx.replyWithMarkdownV2('Choose difficulty', difficultyInlineKeyboard);
});

bot.command('difficulty', (ctx) => {
  ctx.replyWithMarkdownV2('Choose difficulty', difficultyInlineKeyboard);
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
      leetcode.generateQuestionURL(question),
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

db.connect();
