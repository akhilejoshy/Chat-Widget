import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { ChatBotProvider } from './contexts/ChatBotContext';
import { Toaster } from './components/ui/toaster';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/auth/LoginPage';
import ChatBotPage from './pages/chat_bot/ChatBotPage';
import ChatBotDetailPage from './pages/chat_bot/ChatBotDetailPage';

export default function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <ChatBotProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/chat-bot" element={<ChatBotPage />} />
              <Route path="/chat-bot/:chatId" element={<ChatBotDetailPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/chat-bot" replace />} />
          </Routes>
          <Toaster />
        </ChatBotProvider>
      </BrowserRouter>
    </Provider>
  );
}
