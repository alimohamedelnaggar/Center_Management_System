import apiClient from "../api/axios";

export const studentPortalService = {
  getProfile: async () => {
    const response = await apiClient.get("/StudentPortal/Profile");
    return response.data;
  },

  getExams: async () => {
    const response = await apiClient.get("/StudentPortal/Exams");
    return response.data;
  },

  getNotes: async () => {
    const response = await apiClient.get("/StudentPortal/Notes");
    return response.data;
  },

  startExam: async (examId) => {
    const response = await apiClient.post(`/StudentPortal/Exams/${examId}/Start`);
    return response.data;
  },

  getAttempt: async (attemptId) => {
    const response = await apiClient.get(`/StudentPortal/Attempts/${attemptId}`);
    return response.data;
  },

  submitAttempt: async (attemptId, answers) => {
    const response = await apiClient.post(
      `/StudentPortal/Attempts/${attemptId}/Submit`,
      answers,
    );
    return response.data;
  },

  reportViolation: async (attemptId, type) => {
    const response = await apiClient.post(
      `/StudentPortal/Attempts/${attemptId}/Violation`,
      { type },
    );
    return response.data;
  },

  getResults: async () => {
    const response = await apiClient.get("/StudentPortal/Results");
    return response.data;
  },

  getExamPreview: async (examId) => {
    const response = await apiClient.get(
      `/StudentPortal/Exams/${examId}/Preview`,
    );
    return response.data;
  },

  getSubscriptions: async () => {
    const response = await apiClient.get("/StudentPortal/Subscriptions");
    return response.data;
  },

  getAttendance: async () => {
    const response = await apiClient.get("/StudentPortal/Attendance");
    return response.data;
  },

  getPayments: async () => {
    const response = await apiClient.get("/StudentPortal/Payments");
    return response.data;
  },

  getNotifications: async ({ pageNumber = 1, pageSize = 10 } = {}) => {
    const response = await apiClient.get(
      `/StudentPortal/Notifications?pageNumber=${pageNumber}&pageSize=${pageSize}`,
    );
    return response.data;
  },

  getUnreadCount: async () => {
    const response = await apiClient.get(
      "/StudentPortal/Notifications/Unread-Count",
    );
    return response.data;
  },

  markRead: async (id) => {
    const response = await apiClient.put(
      `/StudentPortal/Notifications/${id}/Read`,
    );
    return response.data;
  },

  markAllRead: async () => {
    const response = await apiClient.post(
      "/StudentPortal/Notifications/Read-All",
    );
    return response.data;
  },
};
