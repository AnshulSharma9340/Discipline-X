import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';
import { supabase } from './supabase';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export const api = axios.create({
  baseURL,
  timeout: 20_000,
});

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err: AxiosError<{ detail?: string }>) => {
    const status = err.response?.status;
    const detail = err.response?.data?.detail || err.message;

    if (status === 401) {
      toast.error('Session expired. Please log in again.');
      supabase.auth.signOut();
    } else if (status === 423) {
      toast.error('Account locked. Submit an emergency request to unlock.');
    } else if (status && status >= 500) {
      toast.error('Server error. Please try again.');
    } else if (detail) {
      toast.error(typeof detail === 'string' ? detail : 'Request failed');
    }
    return Promise.reject(err);
  },
);
