import apiClient from "../api/axios";

export const parentPortalService = {
  getChildren: async () => {
    const response = await apiClient.get("/ParentPortal/Children");
    return response.data;
  },
  getChildSummary: async (studentId) => {
    const response = await apiClient.get(`/ParentPortal/Children/${studentId}`);
    return response.data;
  },
  getChildAttendance: async (studentId) => {
    const response = await apiClient.get(
      `/ParentPortal/Children/${studentId}/Attendance`,
    );
    return response.data;
  },
  getChildGrades: async (studentId) => {
    const response = await apiClient.get(
      `/ParentPortal/Children/${studentId}/Grades`,
    );
    return response.data;
  },
  getChildExams: async (studentId) => {
    const response = await apiClient.get(
      `/ParentPortal/Children/${studentId}/Exams`,
    );
    return response.data;
  },
  getChildPayments: async (studentId) => {
    const response = await apiClient.get(
      `/ParentPortal/Children/${studentId}/Payments`,
    );
    return response.data;
  },
  getNotifications: async ({ pageNumber = 1, pageSize = 10 } = {}) => {
    const response = await apiClient.get(
      `/ParentPortal/Notifications?pageNumber=${pageNumber}&pageSize=${pageSize}`,
    );
    return response.data;
  },
  getUnreadCount: async () => {
    const response = await apiClient.get(
      "/ParentPortal/Notifications/Unread-Count",
    );
    return response.data;
  },
  markRead: async (id) => {
    const response = await apiClient.put(
      `/ParentPortal/Notifications/${id}/Read`,
    );
    return response.data;
  },
  markAllRead: async () => {
    const response = await apiClient.post(
      "/ParentPortal/Notifications/Read-All",
    );
    return response.data;
  },
};
