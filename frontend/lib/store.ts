import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: 'super_admin' | 'admin' | 'member';
  photoUrl?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  initFromStorage: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,

  setAuth: (user, token) => {
    console.log('setAuth called with:', user, token);
    if (typeof window !== 'undefined') {
      localStorage.setItem('gymbuddy_token', token);
      localStorage.setItem('gymbuddy_user', JSON.stringify(user));
      console.log('Data saved to localStorage');
      console.log('Token in localStorage:', localStorage.getItem('gymbuddy_token'));
      console.log('User in localStorage:', localStorage.getItem('gymbuddy_user'));
    }
    set({ user, token, isLoading: false });
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('gymbuddy_token');
      localStorage.removeItem('gymbuddy_user');
    }
    set({ user: null, token: null, isLoading: false });
  },

  initFromStorage: () => {
    console.log('initFromStorage called');
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('gymbuddy_token');
    const userStr = localStorage.getItem('gymbuddy_user');
    console.log('localStorage token:', token);
    console.log('localStorage user:', userStr);
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        console.log('Parsed user from localStorage:', user);
        set({ user, token, isLoading: false });
      } catch (err) {
        console.error('Error parsing user from localStorage:', err);
        set({ isLoading: false });
      }
    } else {
      console.log('No token or user found in localStorage');
      set({ isLoading: false });
    }
  },
}));
