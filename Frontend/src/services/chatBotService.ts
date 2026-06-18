import { api } from './EventServices';

export interface ChatBotWebSite {
  id: number;
  name: string;
  icon: string;
  website_id: string;
  script: string;
}

export interface ChatBotClient {
  id: number;
  name: string;
  email: string;
  chats: unknown;
}

export interface ChatBotChat {
  id: number;
  client_id: number;
  client: ChatBotClient;
  website_id: string;
  department: string;
  website: ChatBotWebSite;
  status: string;
  description: string;
  ip_address: string;
  country: string;
  browser: string;
  device: string;
  created_at: string;
  messages: unknown;
  preview: string;
  attended: string;
  message_count?: number;
  chat_id?: string;
  client_name?: string;
}

export interface PredefinedResponse {
  id: number;
  message: string;
}

export interface ChatBotListResponse {
  response: {
    chats: ChatBotChat[];
    limit: number;
    page: number;
    total_chats: number;
    total_pages: number;
  };
  success: boolean;
}

export interface ChatBotListParams {
  status?: string;
  website_id?: string;
  page?: number;
  limit?: number;
  search?: string;
  email?: string;
}

export const chatBotService = {
  async getChatList(userId: number, params?: ChatBotListParams): Promise<ChatBotListResponse> {
    const q = new URLSearchParams();
    if (params?.limit) q.append('limit', params.limit.toString());
    if (params?.page) q.append('page', params.page.toString());
    if (params?.status && params.status !== 'all') q.append('status', params.status.toLowerCase());
    if (params?.website_id && params.website_id !== 'all') q.append('website_id', params.website_id);
    if (params?.search) q.append('search', params.search);
    if (params?.email) q.append('email', params.email);
    const url = `/user/${userId}/chat/list${q.toString() ? `?${q.toString()}` : ''}`;
    const response = await api.getEvents(url);
    return response.data;
  },

  async getWebsites(userId: number): Promise<{ success: boolean; data: ChatBotWebSite[] }> {
    const response = await api.getEvents(`/user/${userId}/chatbot/script`);
    return response.data;
  },

  async createWebsite(userId: number, formData: FormData): Promise<{ success: boolean; message?: string }> {
    const response = await api.postEvents(`/user/${userId}/chatbot`, formData);
    return response.data;
  },

  async deleteWebsite(userId: number, id: number): Promise<{ success: boolean; message?: string }> {
    const response = await api.deleteEvents(`/user/${userId}/chatbot/script/${id}`);
    return response.data;
  },

  async getPredefinedResponses(userId: number, search?: string): Promise<{ success: boolean; data: PredefinedResponse[] }> {
    let url = `/user/${userId}/chatbot/response`;
    if (search) url += `?search=${encodeURIComponent(search)}`;
    const response = await api.getEvents(url);
    return response.data;
  },

  async createPredefinedResponse(userId: number, message: string): Promise<{ success: boolean; message?: string }> {
    const response = await api.postEvents(`/user/${userId}/chatbot/response`, { message });
    return response.data;
  },

  async updatePredefinedResponse(userId: number, id: number, message: string): Promise<{ success: boolean; message?: string }> {
    const response = await api.patchEvent(`/user/${userId}/chatbot/response/${id}`, { message });
    return response.data;
  },

  async deletePredefinedResponse(userId: number, id: number): Promise<{ success: boolean; message?: string }> {
    const response = await api.deleteEvents(`/user/${userId}/chatbot/response/${id}`);
    return response.data;
  },

  async updateChatStatus(userId: number, chatId: number, status: string): Promise<{ success: boolean; message?: string }> {
    const response = await api.patchEvent(`/user/${userId}/chat/${chatId}/status?status=${status}`, {});
    return response.data;
  },

  async getChatMessages(userId: number, chatId: number | string, params?: { page?: number; limit?: number }): Promise<{ success: boolean; data: ChatBotChat }> {
    const q = new URLSearchParams();
    if (params?.limit) q.append('limit', params.limit.toString());
    if (params?.page) q.append('page', params.page.toString());
    const url = `/user/${userId}/chat/${chatId}${q.toString() ? `?${q.toString()}` : ''}`;
    const response = await api.getEvents(url);
    return response.data;
  },

  async logChatAction(userId: number, chatId: number, action: 'join' | 'leave', messagedAs?: number, fakeName?: string): Promise<{ success: boolean; message?: string }> {
    let url = `/user/${userId}/chat/${chatId}/log?status=${action}`;
    if (messagedAs) url += `&messaged_as=${messagedAs}`;
    if (fakeName) url += `&fake_name=${encodeURIComponent(fakeName)}`;
    const response = await api.patchEvent(url, {});
    return response.data;
  },

  async getStaffList(userId: number): Promise<{ success: boolean; data: unknown[] }> {
    const response = await api.getEvents(`/user/${userId}/employee`);
    return response.data;
  },

  async updateMessageReadStatus(userId: number | string, chatId: number | string, messages: { message_id: number; is_read: boolean }[]): Promise<{ success: boolean; message?: string }> {
    const response = await api.patchEvent(`/user/${userId}/chat/${chatId}/read_status`, messages);
    return response.data;
  },

  async uploadFile(userId: number | string, chatId: number | string, formData: FormData): Promise<{ success: boolean; message?: string; data?: unknown; response?: unknown }> {
    const response = await api.postEvents(`/user/${userId}/chat/${chatId}/file`, formData);
    return response.data;
  },

  async getChatOverview(userId: number, params: { date_period: string; hour_split: number }): Promise<{ success: boolean; response: { data: unknown[] } }> {
    const q = new URLSearchParams({ date_period: params.date_period, hour_split: params.hour_split.toString() });
    const response = await api.getEvents(`/user/${userId}/chat/overview?${q.toString()}`);
    return response.data;
  },
};
