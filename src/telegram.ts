import { Markup, Telegraf } from 'telegraf';

const bot = new Telegraf(String(process.env.TELEGRAM_API_TOKEN));

const difficultyInlineKeyboard = Markup.inlineKeyboard([
  Markup.button.callback('EASY', 'EASY'),
  Markup.button.callback('MEDIUM', 'MEDIUM'),
  Markup.button.callback('HARD', 'HARD'),
]);

const setupBotCommands = () => {
  bot.telegram.deleteMyCommands();
  bot.telegram.setMyCommands([
    { command: '/start', description: 'start the bot' },
    { command: '/difficulty', description: 'Change difficulty' },
    { command: '/total', description: 'Get the total of solved questions' },
    { command: '/another', description: 'Send another question' },
  ]);
};

const sendGeneralErrorMessage = (chatId?: number) => {
  if (!chatId) {
    return;
  }

  bot.telegram.sendMessage(chatId, 'An error has occurred. Please try again');
};

// export default bot;

export default {
  telegraf: bot,
  difficultyInlineKeyboard,
  setupBotCommands,
  sendGeneralErrorMessage,
};
