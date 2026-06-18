import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface JoinedChat {
  chatId: number;
  joinedBy: number;
  joinedAs: number | string;
}

interface ChatBotState {
  joinedChats: JoinedChat[];
}

const loadJoinedChats = (): JoinedChat[] => {
  try {
    const saved = localStorage.getItem('joinedChats');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

const saveJoinedChats = (chats: JoinedChat[]) => {
  try {
    localStorage.setItem('joinedChats', JSON.stringify(chats));
  } catch {
    // ignore
  }
};

const initialState: ChatBotState = {
  joinedChats: loadJoinedChats(),
};

const chatBotSlice = createSlice({
  name: 'chatBot',
  initialState,
  reducers: {
    joinChat: (state, action: PayloadAction<JoinedChat>) => {
      state.joinedChats = state.joinedChats.filter(c => c.chatId !== action.payload.chatId);
      state.joinedChats.push(action.payload);
      saveJoinedChats(state.joinedChats);
    },
    leaveChat: (state, action: PayloadAction<number>) => {
      state.joinedChats = state.joinedChats.filter(c => c.chatId !== action.payload);
      saveJoinedChats(state.joinedChats);
    },
  },
});

export const { joinChat, leaveChat } = chatBotSlice.actions;
export default chatBotSlice.reducer;
