import axios, { AxiosInstance, AxiosResponse, AxiosRequestConfig } from 'axios';

export const apiUrl = (import.meta.env.VITE_API_URL as string) || 'http://localhost:8080/api/v1';
export const wsBaseUrl = apiUrl.replace(/^http/, 'ws');

export const buildApiUrl = (endpoint: string): string => {
  const clean = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  if (clean.startsWith('http')) return clean;
  return `${apiUrl}/${clean}`;
};

const ApiClient: AxiosInstance = axios.create({ baseURL: apiUrl });

ApiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.set('Authorization', `Bearer ${token}`);
  const isFormData = typeof FormData !== 'undefined' && config.data instanceof FormData;
  if (isFormData) {
    config.headers.delete('Content-Type');
  } else if (!config.headers.has('Content-Type')) {
    config.headers.set('Content-Type', 'application/json; charset=UTF-8');
  }
  return config;
});

ApiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const api = {
  getEvents(url: string, config?: AxiosRequestConfig) { return ApiClient.get(url, config); },
  postEvents(url: string, data: unknown, config?: AxiosRequestConfig) { return ApiClient.post(url, data, config); },
  deleteEvents(url: string) { return ApiClient.delete(url); },
  patchEvent(url: string, data: unknown, config?: AxiosRequestConfig) { return ApiClient.patch(url, data, config); },
  putEvent(url: string, data: unknown, config?: AxiosRequestConfig) { return ApiClient.put(url, data, config); },
};

export { ApiClient };
