import apiClient from "../api/axios";

export const sessionsService = {
  getByGroup: async (groupId) => {
    const response = await apiClient.get(`/SessionRolesRole-By-Group/${groupId}`);
    return response.data;
  },

  getById: async (sessionId) => {
    const response = await apiClient.get(`/SessionRolesRole-By-Id/${sessionId}`);
    return response.data;
  },

  create: async (sessionData) => {
    const response = await apiClient.post("/Session/Create", sessionData);
    return response.data;
  },

  update: async (sessionData) => {
    const response = await apiClient.put("/Session/Edit", sessionData);
    return response.data;
  },

  delete: async (sessionId) => {
    const response = await apiClient.delete(`/SessionRolesDelete/${sessionId}`);
    return response.data;
  }
};