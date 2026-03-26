import api from './index';

export const studentApi = {
  // Get student profile by id, role and email
  getStudentById: async (id, role, email) => {
    try {
      if (!id || !role || !email) {
        throw new Error('User credentials are missing.');
      }

      const response = await api.get(`/getStudentById/${id}`, {
        params: {role, email},
      });

      return response.data;

    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        'Failed to fetch student profile.';

      console.error(`[StudentApi] getStudentById failed: ${message}`);
      throw new Error(message);
    }
  },

  // Get student attendance
  getAttendance: async (studentId, filter, startDate, endDate, page = 0, size = 25) => {
    try {
      if (!studentId) {
        throw new Error('Student ID is missing.');
      }
      if (!filter || !startDate || !endDate) {
        throw new Error('Filter, startDate and endDate are required.');
      }
      const response = await api.get('/getAllAttendaceByStudentId', {
        params: {
          studentId,
          page,
          size,
          filter,
          startDate,
          endDate,
        },
      });
      return response.data;
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        'Failed to fetch attendance.';
        console.error(`[StudentApi] getAttendance failed: ${message}`);
        throw new Error(message);
    }
  },

  // Get student fees
  getStudentFees: async (studentId, role, email) => {
    try {
      if (!studentId || !role || !email) {
        throw new Error('User credentials are missing.');
      }
      const response = await api.get('/getStudentFeesByStudentId', {
        params: {studentId, role, email},
      });
      return response.data;
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        'Failed to fetch student fees.';
      console.error(`[StudentApi] getStudentFees failed: ${message}`);
      throw new Error(message);
    }
  },

  // Get student results by academic year
  getStudentResults: async (studentId, role, email) => {
    try {
      if (!studentId || !role || !email) {
        throw new Error('User credentials are missing.');
      }
      const response = await api.get('/getResultByStudentAndAcademicYear', {
        params: {studentId, role, email},
      });
      return response.data;
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        'Failed to fetch student results.';
      console.error(`[StudentApi] getStudentResults failed: ${message}`);
      throw new Error(message);
    }
  },
 
  // Get assignments by classroom
  // Uses classRoomId from user store user.classRoomId
  getAssignments: async (classRoomId, role, email) => {
    try {
      if (!classRoomId || !role || !email) {
        throw new Error('User credentials are missing.');
      }
      const response = await api.get(`/getAssignmentByClassroom/${classRoomId}`, {
        params: {role, email},
      });
      return response.data;
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        'Failed to fetch assignments.';
      console.error(`[StudentApi] getAssignments failed: ${message}`);
      throw new Error(message);
    }
  },
  
};