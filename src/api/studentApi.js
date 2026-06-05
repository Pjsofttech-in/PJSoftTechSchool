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
  
  // Submit assignment by student
  submitAssignment: async (role, email, assignmentId, studentId, remarks, fileUrl = '') =>{
    try {
      if (!role || !email || !assignmentId || !studentId) {
        throw new Error('Required fields are missing.');
      }
      const response = await api.post(
        '/submitAssignmentByStudent',
        {
          submission: JSON.stringify({
            remarks,
            fileUrl,
            student: {id: String(studentId)},
            assignment: {id: assignmentId},
          }),
        },
        {
          params: {role, email},
          headers: {'Content-Type': 'multipart/form-data'},
        },
      );
      return response.data;
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        'Failed to submit assignment.';
      console.error(`[StudentApi] submitAssignment failed: ${message}`);
      throw new Error(message);
    }
  },

  // Get timetable for student's classroom
  getTimeTableByClassId: async (role, email, classId) => {
    try {
      if (!role || !email || !classId) {
        throw new Error('Required fields are missing.');
      }
      const response = await api.get('/getTimeTableByClassId', {
        params: {
          role: role,
          email: email,
          classId: classId,
        },
      });
      return response.data;
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        'Failed to fetch timetable.';
      console.error(`[StudentApi] getTimeTableByClassId failed: ${message}`);
      throw new Error(message);
    }
  },
   
  // 1. Get notifications by branch code
  getNotifications: async (role, email, branchCode) => {
    try {
      if (!role || !email || !branchCode) {
        throw new Error('Role, email, and branchCode are required.');
      }
      const response = await api.get('/getNotificationByBranchCode', {
        params: { role, email, branchCode },
      });
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to fetch branch notifications.';
      console.error(`[StudentApi] getNotifications failed: ${message}`);
      throw new Error(message);
    }
  },

  // 2. Get notifications by classroom ID
  getNotificationByClassroom: async (role, email, classId) => {
    try {
      if (!role || !email || !classId) {
        throw new Error('Role, email, and classId are required.');
      }
      const response = await api.get('/getNotificationByClassRoom', {
        params: { role, email, classId },
      });
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to fetch classroom notifications.';
      console.error(`[StudentApi] getNotificationByClassroom failed: ${message}`);
      throw new Error(message);
    }
  },
  
};