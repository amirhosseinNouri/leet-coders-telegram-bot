import dotenv from 'dotenv';
import TelegramBot from 'node-telegram-bot-api';

dotenv.config();

const bot = new TelegramBot(String(process.env.TELEGRAM_API_TOKEN), {
  polling: true,
});

bot.setMyCommands([{ command: '/start', description: 'start the bot' }]);

bot.onText(/\/start/, async (message, match) => {
  const chatId = message.chat.id;
  bot.sendPoll(chatId, "Did you solve today's question?", ['Yes ✅', 'No ❌'], {
    is_anonymous: false,
    type: 'regular',
  });
});
