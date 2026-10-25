import apiClient from "../api/axios";

export const expenseCategoryService = {
  getAllPaged: async ({ pageNumber = 1, pageSize = 10 }) => {
    const params = new URLSearchParams({
      pageNumber,
      pageSize,
    });

    const response = await apiClient.get(
      `/ExpenseCategory/Paginated?${params.toString()}`,
    );

    return response.data;
  },

  getAll: async () => {
    const response = await apiClient.get("/ExpenseCategory/get-all");
    return response.data;
  },
  create: async (groupData) => {
    const response = await apiClient.post("/ExpenseCategory/Create", groupData);
    return response.data;
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/ExpenseCategory/${id}`);
    return response.data;
  },

  update: async (groupData) => {
    const response = await apiClient.put(`/ExpenseCategory/Edit`, groupData);
    return response.data;
  },
};
