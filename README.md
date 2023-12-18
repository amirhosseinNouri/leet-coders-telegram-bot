# LeetCoders Telegram Bot

Solve LeetCode algorithm problems with your friends using a Telegram bot!

### Introduction

This Telegram bot is designed to make solving LeetCode problems a collaborative and fun experience. Whether you're working solo or with a group of friends in a Telegram group, this bot provides a set of commands to manage and track your progress in solving algorithmic challenges.

The key features of this bot include:

**Difficulty Selection**: Choose from Easy, Medium, and Hard difficulty levels for LeetCode questions.

**Progress Report**: Get a report on the number of questions solved in each difficulty level.

**Persistent Database**: Solved questions persist in the database, making it easy to resume or track progress over time.

**Customizable Cron Job**: Change the interval for receiving new questions by setting a Cron job expression.

**Telegram Polls**: Engage with friends by sending polls to track progress and collaborate on solving questions.

**Skip Functionality**: Skip questions that have been previously solved.

### Bot Commands

`/start`: Begin the LeetCode challenge and receive your first question.

`/difficulty`: Choose the difficulty level for the next question (Easy, Medium, Hard). Selected difficulty will be persist.

`/total`: Get a report on the total number of questions solved in each difficulty level.

`/another`: Skip the current question and receive another one.

### How to Deploy

#### Prerequisites

Docker installed on your machine or server.
A Telegram bot token obtained from the BotFather on Telegram. Read more [here](https://core.telegram.org/bots/features#botfather).

#### Steps

##### Clone the repository:

```bash
git clone https://github.com/amirhosseinNouri/leet-coders-telegram-bot.git
```

##### Navigate to the project directory:

```bash
cd leet-coders-telegram-bot
```

##### Create a .env or .env.production file in the root directory with the following content:

```bash
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
DATABASE_URL=mongodb://mongodb_host:27017/leet-coders-bot # or mongodb://localhost:27017/leet-coders-bot for running the bot on localhost
CRON_REGEX=00 00 * * 0,1,2,3,6 # At 12:00 AM, only on Sunday, Monday, Tuesday, Wednesday, and Saturday
```

Note that the content of .env.production can override the variables with the same name in the .env file.

Replace `your_telegram_bot_token` with your actual Telegram bot token.

Build and run the Docker containers:

```bash
docker-compose up -d
```

Your LeetCode Challenge Bot is now running and ready to use!

Feel free to explore and enhance this project. Happy coding! 🚀
