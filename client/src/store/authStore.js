import { create } from 'zustand';
import api from '../lib/api';

const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  isAuthenticated: !!localStorage.getItem('accessToken'),
  loading: false,
  error: null,

  register: async (data) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post('/auth/register', data);
      const { user, accessToken, refreshToken, pending, message } = res.data;
      // Self-registrations after the first user are PENDING and get no tokens —
      // they must be approved by an admin before they can log in.
      if (pending || !accessToken) {
        return { pending: true, message };
      }
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      set({ user, isAuthenticated: true });
      return { pending: false };
    } finally {
      set({ loading: false });
    }
  },

  login: async (data) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post('/auth/login', data);
      const { user, accessToken, refreshToken } = res.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      set({ user, isAuthenticated: true });
    } finally {
      set({ loading: false });
    }
  },

  logout: async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    try { await api.post('/auth/logout', { refreshToken }); } catch {}
    localStorage.clear();
    set({ user: null, isAuthenticated: false });
  },

  updateProfile: async (data) => {
    set({ loading: true });
    try {
      const res = await api.put('/auth/profile', data);
      const { user } = res.data;
      localStorage.setItem('user', JSON.stringify(user));
      set({ user });
      return user;
    } finally {
      set({ loading: false });
    }
  },

  changePassword: async (data) => {
    set({ loading: true });
    try {
      await api.put('/auth/change-password', data);
    } finally {
      set({ loading: false });
    }
  },

  // Update user in store after admin changes (e.g. role changed for current user)
  refreshMe: async () => {
    try {
      const res = await api.get('/auth/me');
      const { user } = res.data;
      localStorage.setItem('user', JSON.stringify(user));
      set({ user });
    } catch {}
  },
}));

export default useAuthStore;
