import { create } from 'zustand';
import { authApi } from './api';

interface User {
  id: string;
  email: string;
  name: string;
  cedula?: string;
  institution?: string;
}

interface AuthStore {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

export const useAuth = create<AuthStore>((set) => ({
  user: null,
  loading: true,

  login: async (email, password) => {
    const { data } = await authApi.login({ email, password });
    localStorage.setItem('token', data.access_token);
    const { data: me } = await authApi.me();
    set({ user: me });
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null });
    window.location.href = '/auth/login';
  },

  fetchMe: async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) { set({ loading: false }); return; }
      const { data } = await authApi.me();
      set({ user: data, loading: false });
    } catch {
      localStorage.removeItem('token');
      set({ user: null, loading: false });
    }
  },
}));
