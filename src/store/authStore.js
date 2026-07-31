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
        restoreSession(token, user, role); // restore sync cache for axios interceptor
        set({
          token,
          user,
          role,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        // If session is partial or invalid, reset storage completely
        await clearSession();
        set({
          token: null,
          user: null,
          role: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    } catch (e) {
      await clearSession();
      set({
        token: null,
        user: null,
        role: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  // Login — saves credentials and sets state
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

  // Logout called manually or automatically by Axios interceptor on 401
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