import mongoose from 'mongoose';
import type { Difficulty } from '../types';

type ChatType = {
  id: number;
  solvedQuestions: string[];
  difficulty: Difficulty;
};

const chatSchema = new mongoose.Schema<ChatType>({
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

const ChatModel = mongoose.model('Chat', chatSchema);

export default ChatModel;
