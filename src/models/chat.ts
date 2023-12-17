import mongoose from 'mongoose';
import type { Model } from 'mongoose';
import type { Difficulty } from '../types';

interface ChatType {
  id: number;
  solvedQuestions: string[];
  difficulty: Difficulty;
}

interface ChatModel extends Model<ChatType> {
  changeDifficulty(chatId: number | undefined, difficulty: Difficulty): void;
}

const chatSchema = new mongoose.Schema<ChatType, ChatModel>({
  id: { type: Number, unique: true },
  solvedQuestions: {
    type: [String],
    default: [],
  },
  difficulty: {
    type: String,
    enum: ['EASY', 'MEDIUM', 'HARD'],
    default: 'EASY',
  },
});

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
