import apiClient from "../api/axios";

export const incomeCategoryService = {
  getAllPaged: async ({ pageNumber = 1, pageSize = 10 }) => {
    const params = new URLSearchParams({
      pageNumber,
      pageSize,
    });

    const response = await apiClient.get(
      `/IncomeCategory/Paginated?${params.toString()}`,
    );

    return response.data;
  },

  getAll: async () => {
    const response = await apiClient.get("/IncomeCategory/get-all");
    return response.data;
  },

  create: async (groupData) => {
    const response = await apiClient.post("/IncomeCategory/Create", groupData);
    return response.data;
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/IncomeCategory/${id}`);
    return response.data;
  },

  update: async (groupData) => {
    const response = await apiClient.put(`/IncomeCategory/Edit`, groupData);
    return response.data;
  },
};