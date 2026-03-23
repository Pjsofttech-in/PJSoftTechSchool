import {create} from 'zustand';
import {saveSession, clearSession, getSessionAsync, restoreSession} from '@utils/storage';

const useAuthStore = create(set => ({
  user: null,
  token: null,
  role: null,
  isAuthenticated: false,
  isLoading: true,

  // Initialize from storage on app start
  initAuth: async () => {
    try {
      const {token, user, role} = await getSessionAsync();
      if (token && user && role) {
        restoreSession(token, user, role); // restore cache for axios interceptor
        set({
          token,
          user,
          role,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({isLoading: false});
      }
    } catch (e) {
      set({isLoading: false});
    }
  },

  // Login
  login: async (token, user, role) => {
    await saveSession(token, user, role);
    set({
      token,
      user,
      role,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  // Logout
  logout: async () => {
    await clearSession();
    set({
      token: null,
      user: null,
      role: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  // Update user data
  updateUser: async user => {
    const {token, role} = useAuthStore.getState();
    await saveSession(token, user, role);
    set({user});
  },
}));

export default useAuthStore;