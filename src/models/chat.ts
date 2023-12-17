import mongoose from 'mongoose';
import type { Model } from 'mongoose';
import type { Difficulty } from '../types';

type SolvedQuestions = string[];

interface ChatType {
  id: number;
  easySolvedQuestions: SolvedQuestions;
  mediumSolvedQuestions: SolvedQuestions;
  hardSolvedQuestions: SolvedQuestions;
  difficulty: Difficulty;
}

interface ChatInstanceMethods {
  getSolvedQuestions(difficulty: Difficulty): SolvedQuestions;
  updateSolvedQuestions(difficulty: Difficulty, question: string): void;
}

interface ChatModel extends Model<ChatType, {}, ChatInstanceMethods> {
  changeDifficulty(chatId: number | undefined, difficulty: Difficulty): void;
}

const chatSchema = new mongoose.Schema<ChatType, ChatModel>({
  id: { type: Number, unique: true },
  easySolvedQuestions: {
    type: [String],
    default: [],
  },
  mediumSolvedQuestions: {
    type: [String],
    default: [],
  },
  hardSolvedQuestions: {
    type: [String],
    default: [],
  },
  difficulty: {
    type: String,
    enum: ['EASY', 'MEDIUM', 'HARD'],
    default: 'EASY',
  },
});

// Instance Methods
chatSchema.method('getSolvedQuestions', function (difficulty: Difficulty) {
  switch (difficulty) {
    case 'MEDIUM':
      return this.mediumSolvedQuestions;
      break;

    case 'HARD':
      return this.hardSolvedQuestions;

    case 'EASY':
    default:
      return this.easySolvedQuestions;
  }
});

chatSchema.method(
  'updateSolvedQuestions',
  async function (difficulty: Difficulty, question: string) {
    if (difficulty === 'EASY') {
      await this.updateOne({
        easySolvedQuestions: [...this.easySolvedQuestions, question],
      });
      return;
    }

    if (difficulty === 'MEDIUM') {
      await this.updateOne({
        mediumSolvedQuestions: [...this.mediumSolvedQuestions, question],
      });
      return;
    }

    if (difficulty === 'HARD') {
      await this.updateOne({
        hardSolvedQuestions: [...this.hardSolvedQuestions, question],
      });
      return;
    }
  },
);

// Static methods
chatSchema.static(
  'changeDifficulty',
  async function (chatId: number | undefined, difficulty: Difficulty) {
    if (!chatId) {
      return;
    }

    return this.findOneAndUpdate(
      { id: chatId },
      { id: chatId, difficulty },
      { upsert: true },
    );
  },
);

const ChatModel = mongoose.model<ChatType, ChatModel>('Chat', chatSchema);

export default ChatModel;
