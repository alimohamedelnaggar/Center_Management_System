import apiClient from "../api/axios";
const baseURL = import.meta.env.VITE_HUB_API_URL;

export const dashboardService = {
  getSummary: async ({ year, month }) => {
    const response = await apiClient.get(`${baseURL}dashboard-summary`, {
      params: { year, month },
    });
    return response.data?.data || response.data;
  },

  getStudentDistribution: async () => {
    const response = await apiClient.get(`${baseURL}student-distribution`);
    return response.data?.data || response.data;
  },

  getRevenueChart: async ({ year } = {}) => {
    const response = await apiClient.get(`${baseURL}revenue-chart`, {
      params: { year },
    });
    return response.data?.data || response.data;
  },

  getStudentMovement: async ({ year } = {}) => {
    const response = await apiClient.get(`${baseURL}student-movement`, {
      params: { year },
    });
    return response.data?.data || response.data;
  },

  getAttendanceChart: async () => {
    const response = await apiClient.get(`${baseURL}attendance-chart`);
    return response.data?.data || response.data;
  },

  getTopGroups: async () => {
    const response = await apiClient.get(`${baseURL}top-groups`);
    return response.data?.data || response.data;
  },

  getRecentActivity: async () => {
    const response = await apiClient.get(`${baseURL}recent-activity`);
    return response.data?.data || response.data;
  },
};