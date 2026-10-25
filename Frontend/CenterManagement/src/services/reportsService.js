import apiClient from "../api/axios";
const baseURL = import.meta.env.VITE_HUB_API_URL;

export const reportsService = {
  getAttendanceReport: async (studentId, groupId = null) => {
    const response = await apiClient.get(
      `/Payments/get-attendance-report/${studentId}`,
      { params: groupId ? { groupId } : {} },
    );
    return response.data;
  },

  getFinancialReport: async (studentId, groupId = null) => {
    const params = { StudentId: studentId };
    if (groupId) params.GroupId = groupId;

    const response = await apiClient.get(`${baseURL}student-financial-report`, {
      params,
    });
    return response.data;
  },

  getGradesReport: async (studentId, groupId = null) => {
    const response = await apiClient.get(
      `/Payments/get-grade-report/${studentId}`,
      { params: groupId ? { groupId } : {} },
    );
    return response.data;
  },

  getStudentGroupsHistory: async (studentId) => {
    const response = await apiClient.get(
      `/Payments/student-groups-history/${studentId}`,
    );
    return response.data;
  },

  getOverview: async ({ year, month } = {}) => {
    const params = {};
    if (year) params.year = year;
    if (month) params.month = month;

    const response = await apiClient.get("/Reports/Overview", { params });
    return response.data?.data || response.data;
  },

  // Center-wide report (owner / solo teacher only).
  // `from`..`to` drive the finance lines, attendance rates, the per-teacher
  // "collected in range" column and the 6-month trend.
  // `billingPeriod` drives the per-group expected / collected / outstanding.
  getCenterOverview: async ({ from, to, billingPeriod } = {}) => {
    const params = {};
    if (from) params.from = from;
    if (to) params.to = to;
    if (billingPeriod) params.billingPeriod = billingPeriod;

    const response = await apiClient.get("/Reports/Center-Overview", { params });
    return response.data?.data || response.data;
  },
};
