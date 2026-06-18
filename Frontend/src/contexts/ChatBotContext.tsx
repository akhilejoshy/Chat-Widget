import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { wsBaseUrl } from '@/services/EventServices';

interface ChatBotNotification {
  chat_id: number;
  title: string;
  type: 'chat-list-update';
  data?: unknown;
}

interface ChatBotContextType {
  unreadCounts: Record<number, number>;
  markAsRead: (chatId: number) => void;
  setInitialUnreadCounts: (counts: Record<number, number>) => void;
  lastUpdatedChatId: number | null;
  lastUpdatedChatData: unknown | null;
  activeChatId: number | null;
  setActiveChatId: (id: number | null) => void;
}

const ChatBotContext = createContext<ChatBotContextType | undefined>(undefined);

export const ChatBotProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [unreadCounts, setUnreadCounts] = useState<Record<number, number>>({});
  const [lastUpdatedChatId, setLastUpdatedChatId] = useState<number | null>(null);
  const [lastUpdatedChatData, setLastUpdatedChatData] = useState<unknown | null>(null);
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const joinedChats = useSelector((state: RootState) => state.chatBot.joinedChats);

  const markAsRead = useCallback((chatId: number) => {
    setUnreadCounts(prev => ({ ...prev, [chatId]: 0 }));
  }, []);

  const setInitialUnreadCounts = useCallback((counts: Record<number, number>) => {
    setUnreadCounts(prev => ({ ...prev, ...counts }));
  }, []);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) return;
    const userId = JSON.parse(userData).id;

    let isMounted = true;
    let reconnectTimeout: ReturnType<typeof setTimeout>;

    const connect = () => {
      const token = localStorage.getItem('token') || '';
      const ws = new WebSocket(`${wsBaseUrl}/user/${userId}/ws/chat/list?token=${token}`);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data: ChatBotNotification = JSON.parse(event.data);
          if (data.type === 'chat-list-update') {
            const cid = Number(data.chat_id);
            setLastUpdatedChatId(cid);
            if (data.data) setLastUpdatedChatData(data.data);
            if (activeChatId !== cid) {
              setUnreadCounts(prev => ({ ...prev, [cid]: (prev[cid] || 0) + 1 }));
            }
          }
        } catch (e) {
          console.error('WS parse error:', e);
        }
      };

      ws.onclose = () => {
        if (isMounted) reconnectTimeout = setTimeout(connect, 5000);
      };
    };

    connect();

    return () => {
      isMounted = false;
      clearTimeout(reconnectTimeout);
      wsRef.current?.close();
    };
  }, [activeChatId, joinedChats]);

  return (
    <ChatBotContext.Provider value={{ unreadCounts, markAsRead, setInitialUnreadCounts, lastUpdatedChatId, lastUpdatedChatData, activeChatId, setActiveChatId }}>
      {children}
    </ChatBotContext.Provider>
  );
};

export const useChatBot = () => {
  const context = useContext(ChatBotContext);
  if (context === undefined) throw new Error('useChatBot must be used within a ChatBotProvider');
  return context;
};
