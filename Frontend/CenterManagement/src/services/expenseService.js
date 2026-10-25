import apiClient from "../api/axios";

export const expenseService = {
  getAllPaged: async ({
    pageNumber = 1,
    pageSize = 10,
    search = null,
    categoryId = null,
    startDate = null,
    endDate = null,
  }) => {
    const params = new URLSearchParams({
      pageNumber,
      pageSize,
    });

    if (search) params.append("search", search);
    if (categoryId) params.append("categoryId", categoryId);
    if (endDate) params.append("endDate", endDate);
    if (startDate) params.append("startDate", startDate);

    const response = await apiClient.get(
      `/Expense/Paginated?${params.toString()}`,
    );

    return response.data;
  },

  getAll: async (pageIndex = 1, pageSize = 7, search = "") => {
    const response = await apiClient.get("/Expense/Paginated", {
      params: {
        pageIndex,
        pageSize,
        search,
      },
    });
    return response.data?.data || response.data;
  },
  getById: async (id) => {
    const response = await apiClient.get(`/Expense/get-by-id/${id}`);
    return response.data?.data || response.data;
  },
  create: async (groupData) => {
    const response = await apiClient.post("/Expense/Create", groupData);
    return response.data;
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/Expense/${id}`);
    return response.data;
  },

  update: async (groupData) => {
    const response = await apiClient.put(`/Expense/Edit`, groupData);
    return response.data;
  },
};
