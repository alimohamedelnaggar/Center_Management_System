import apiClient from "../api/axios";

export const platformService = {
  getStatistics: async () => {
    const response = await apiClient.get("/Platform/Statistics");
    return response.data;
  },
};

export const auditLogService = {
  getPaginated: async ({
    pageNumber = 1,
    pageSize = 20,
    search,
    action,
  } = {}) => {
    const response = await apiClient.get("/AuditLogs/Paginated", {
      params: { pageNumber, pageSize, search, action },
    });
    return response.data;
  },
};

export const impersonationService = {
  start: async (userId) => {
    const response = await apiClient.post("/Impersonation/Start", { userId });
    return response.data;
  },
  stop: async () => {
    const response = await apiClient.post("/Impersonation/Stop");
    return response.data;
  },
};
