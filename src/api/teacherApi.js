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

  // Get all ClassRooms
  getClassRooms: async (id, email) => {
  try {
    const response = await api.get(`/getClassRoomByTeacherId/${id}`, {
      params: { 
        role: 'teacher', 
        email: email 
      },
    });
    return response.data; // This is an array []
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
        size: 500, // Increased size to show more students at once
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
      classRoomId: classRoomId
    }
  });
  return response.data;
},

// Get Time-Table for particular class room
getTimeTableByClassId: async (email, classId) => {
  const response = await api.get(`/getTimeTableByClassId`, {
    params: {
      role: 'teacher',
      email: email,
      classId: classId
    }
  });
  return response.data;
},
};