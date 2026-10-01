import {create} from 'zustand';

import {
  saveSession,
  clearSession,
  getSessionAsync,
  restoreSession,
  getSession,
} from '@utils/storage';

import deviceApi from '@api/deviceApi';

import {getFirebaseFid} from '@utils/deviceUtils';

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
        restoreSession(token, user, role);

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

  // Logout called manually or automatically when session expires
  logout: async () => {
    try {
      // Get current session before clearing it
      const currentSession = getSession();
      const currentToken = currentSession?.token;

      if (currentToken) {
        try {
          const fid = await getFirebaseFid();

          if (fid) {
            console.log('====================================');
            console.log('DEACTIVATING DEVICE');
            console.log('FID:', fid);
            console.log('====================================');

            const response = await deviceApi.deactivateDevice(fid);

            console.log(
              'Device deactivation successful:',
              response,
            );
          }
        } catch (deviceError) {
          // Device deactivation failure should NEVER block logout
          console.error(
            'Device deactivation failed:',
            deviceError?.response?.data ||
              deviceError?.message ||
              deviceError,
          );
        }
      }
    } catch (error) {
      // Any unexpected error should NEVER block logout
      console.error('Error during device deactivation:', error);
    } finally {
      // Always clear the local session
      await clearSession();

      // Update Zustand state
      set({
        token: null,
        user: null,
        role: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  // Update user data
  updateUser: async user => {
    const {token, role} = useAuthStore.getState();

    await saveSession(token, user, role);

    set({user});
  },
}));

export default useAuthStore;