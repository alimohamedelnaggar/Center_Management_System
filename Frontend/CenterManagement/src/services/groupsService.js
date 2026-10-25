import apiClient from "../api/axios";

export const groupsService = {
  getAll: async (pageNumber = 1, pageSize = 10) => {
    const response = await apiClient.get(
      `/Group/Paginated?pageNumber=${pageNumber}&pageSize=${pageSize}`,
    );
    return response.data;
  },
  getAllGroups: async () => {
    const response = await apiClient.get(`/Group/get-all`);
    return response.data;
  },

  create: async (groupData) => {
    const response = await apiClient.post("/Group/Create", groupData);
    return response.data;
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/Group/delete/${id}`);
    return response.data;
  },

  update: async (groupData) => {
    const response = await apiClient.put(`/Group/Edit`, groupData);
    return response.data;
  },
};
