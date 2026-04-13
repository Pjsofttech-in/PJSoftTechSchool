import api from './index';

export const teacherApi = {
   // Get teacher profile by id and email
   // The 'role' is hardcoded to 'teacher' to satisfy backend permissions.
  getTeacherById: async (id, email) => {
    try {
      if (!id || !email) {
        throw new Error('Teacher ID or Email is missing.');
      }

      const response = await api.get(`/getTeacherById/${id}`, {
        params: { 
          role: 'teacher', 
          email: email 
        },
      });

      return response.data;

    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        'Failed to fetch teacher profile.';

      console.error(`[TeacherApi] getTeacherById failed: ${message}`);
      throw new Error(message);
    }
  },
};