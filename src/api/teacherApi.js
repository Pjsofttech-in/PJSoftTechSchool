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
          email: email,
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

  // Get all ClassRooms
  getClassRooms: async (id, email) => {
    try {
      const response = await api.get(`/getClassRoomByTeacherId/${id}`, {
        params: {
          role: 'teacher',
          email: email,
        },
      });
      return response.data;
    } catch (error) {
      console.error('[TeacherApi] getClassRooms failed:', error.message);
      throw error;
    }
  },

  // Get Attendance by Class
  getAttendanceByClass: async (classroomId, timeFrame = 'today') => {
    try {
      const response = await api.post(`/getAttendaceByClassroom`, null, {
        params: {
          classroomId: classroomId,
          timeFrame: timeFrame,
          page: 0,
          size: 500,
        },
      });
      return response.data;
    } catch (error) {
      console.error('[TeacherApi] getAttendanceByClass failed:', error.message);
      throw error;
    }
  },

  // Get Students by classRoomId to list particular class students
  getStudentsByClass: async (email, classRoomId) => {
    const response = await api.get(`/getStudentByClassRoomId`, {
      params: {
        role: 'teacher',
        email: email,
        classRoomId: classRoomId,
      },
    });
    return response.data;
  },

  // Get Time-Table for particular class room
  getTimeTableByClassId: async (email, classId) => {
    const response = await api.get(`/getTimeTableByClassId`, {
      params: {
        role: 'teacher',
        email: email,
        classId: classId,
      },
    });
    return response.data;
  },

  // Get assignments by class
  getAssignmentsByClass: async (email, classId) => {
    const response = await api.get(`/getAssignmentByClassroom/${classId}`, {
      params: {
        role: 'teacher',
        email: email,
      },
    });
    return response.data;
  },

  // Get submissions for a particular assignment
  getSubmissionsByAssignmentId: async (email, assignmentId) => {
    try {
      const response = await api.get(`/getSubmissionsByAssignmentId`, {
        params: {
          role: 'teacher',
          email: email,
          assignmentId: assignmentId,
        },
      });
      return response.data;
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        'Failed to fetch submissions.';
      console.error(`[TeacherApi] getSubmissionsByAssignmentId failed: ${message}`);
      throw new Error(message);
    }
  },

  // Create a new assignment with image upload
  // API: POST /createAssignment?role=teacher&email=<email>
  // Body: multipart/form-data → assignment (JSON string) + image (binary)
  createAssignment: async (formData, email) => {
    try {
      const response = await api.post(`/createAssignment`, formData, {
        params: {
          role: 'teacher',
          email: email,
        },
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        'Failed to create assignment.';
      console.error(`[TeacherApi] createAssignment failed: ${message}`);
      throw new Error(message);
    }
  },

  // Update an existing assignment
  updateAssignment: async (id, formData, email) => {
    try {
      const assignmentPart = formData._parts.find(p => p[0] === 'assignment');
      const assignmentData = assignmentPart ? JSON.parse(assignmentPart[1]) : {};
      const response = await api.put(`/updateAssignment/${id}`, assignmentData, {
        params: {
          role: 'teacher',
          email: email,
        },
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        'Failed to update assignment.';
      console.error(`[TeacherApi] updateAssignment failed: ${message}`);
      throw new Error(message);
    }
  },

  // Get all exams for a particular classroom
  // API: GET /getExamByClassId?classId=2&role=teacher&email=...
  getExamByClassId: async (email, classId) => {
    try {
      const response = await api.get(`/getExamByClassId`, {
        params: {
          role: 'teacher',
          email: email,
          classId: classId,
        },
      });
      return response.data;
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        'Failed to fetch exams.';
      console.error(`[TeacherApi] getExamByClassId failed: ${message}`);
      throw new Error(message);
    }
  },

  // Get student results for a particular classroom and exam
  // API: GET /getResultByClassroom?classRoomId=2&role=teacher&email=...&examId=2
  getResultByClassroom: async (email, classRoomId, examId) => {
    try {
      const response = await api.get(`/getResultByClassroom`, {
        params: {
          role: 'teacher',
          email: email,
          classRoomId: classRoomId,
          examId: examId,
        },
      });
      return response.data;
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        'Failed to fetch results.';
      console.error(`[TeacherApi] getResultByClassroom failed: ${message}`);
      throw new Error(message);
    }
  },

  // Get notifications/notices from branch
  getNotifications: async (email) => {
    try {
      const response = await api.get('/getNotificationByBranchCode', {
        params: {
          role: 'teacher',
          email: email,
        },
      });

      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error(`[TeacherApi] getNotifications failed: ${error.message}`);
      return []; // Return empty array to keep Dashboard stable
    }
  },

};