import mongoose from 'mongoose';

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

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
