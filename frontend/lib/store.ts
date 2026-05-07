import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: 'super_admin' | 'admin' | 'gym_admin' | 'trainer' | 'member';
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
    if (typeof window !== 'undefined') {
      localStorage.setItem('gymbuddy_token', token);
      localStorage.setItem('gymbuddy_user', JSON.stringify(user));
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
    if (typeof window === 'undefined') return;
    const state = useAuthStore.getState();
    // Only init from storage if store is empty (avoid overwriting fresh auth)
    if (state.user && state.token) {
      set({ isLoading: false });
      return;
    }

    const token = localStorage.getItem('gymbuddy_token');
    const userStr = localStorage.getItem('gymbuddy_user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        set({ user, token, isLoading: false });
      } catch {
        set({ user: null, token: null, isLoading: false });
      }
    } else {
      set({ user: null, token: null, isLoading: false });
    }
  },
}));
