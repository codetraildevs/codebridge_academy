import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const safeStorage = {
  getItem: (name: string) => {
    try {
      const storage = typeof window !== 'undefined' ? window.localStorage : undefined;
      return storage ? storage.getItem(name) : null;
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string) => {
    try {
      const storage = typeof window !== 'undefined' ? window.localStorage : undefined;
      if (storage) storage.setItem(name, value);
    } catch {
      // Ignore storage failures in restricted or server-rendered contexts.
    }
  },
  removeItem: (name: string) => {
    try {
      const storage = typeof window !== 'undefined' ? window.localStorage : undefined;
      if (storage) storage.removeItem(name);
    } catch {
      // Ignore storage failures in restricted or server-rendered contexts.
    }
  },
};

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  role: string;
  userType?: string;
  organizationId?: string;
  organizationName?: string;
  candidateId?: string | null;
  isActive: boolean;
  mfaEnabled: boolean;
  createdAt?: string;
  subscriptionStatus?: string;
  subscriptionEndAt?: string;
  freeAssessmentsUsed?: number;
  maxFreeAssessments?: number;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      setAuth: (user, accessToken, refreshToken) =>
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          isLoading: false,
        }),

      setUser: (user) => set({ user }),

      setLoading: (isLoading) => set({ isLoading }),

      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'qualexas-auth',
      storage: createJSONStorage(() => safeStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

export default useAuthStore;
