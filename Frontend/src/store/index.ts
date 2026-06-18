import { configureStore } from '@reduxjs/toolkit';
import chatBotReducer from './slices/chatBotSlice';

export const store = configureStore({
  reducer: {
    chatBot: chatBotReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
