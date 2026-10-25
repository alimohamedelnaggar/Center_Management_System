import apiClient from "../api/axios";

export const attendanceService = {
  getByGroupAndSession: async (groupId, sessionId) => {
    const response = await apiClient.get("/Attendance/get-by-group-session", {
      params: { GroupId: groupId, SessionId: sessionId },
    });
    return response.data;
  },

  getStudentsForAttendance: async ({
    pageIndex = 1,
    pageSize = 100,
    groupId,
    sessionId,
    attendanceDate,
    search = "",
  }) => {
    const response = await apiClient.get("/Attendance/student-attendence", {
      params: {
        PageIndex: pageIndex,
        PageSize: pageSize,
        GroupId: groupId,
        SessionId: sessionId,
        AttendanceDate: attendanceDate,
        Search: search,
      },
    });
    return response.data;
  },

  getStats: async () => {
    const response = await apiClient.get("/Attendance/stats");
    return response.data;
  },
  getSessionsByGroupId: async (groupId) => {
    const response = await apiClient.get(
      `/SessionRolesRole-By-Group/${groupId}`,
    );
    return response.data;
  },
  saveAttendance: async (payload) => {
    const response = await apiClient.post("/Attendance/Create", payload);
    return response.data;
  },

  scanAttendance: async ({ code, sessionId, attendanceDate }) => {
    const response = await apiClient.post("/Attendance/scan", {
      code,
      sessionId,
      attendanceDate,
    });
    return response.data;
  },

  getRunningSessions: async (date) => {
    const response = await apiClient.get("/Attendance/running-sessions", {
      params: date ? { Date: date } : {},
    });
    return response.data;
  },
};
