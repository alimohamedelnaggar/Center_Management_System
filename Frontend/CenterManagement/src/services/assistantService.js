import apiClient from "../api/axios";

export const assistantService = {
  getPaginated: async (
    pageNumber = 1,
    pageSize = 10,
    search = "",
    isActive = null,
  ) => {
    const params = { PageNumber: pageNumber, PageSize: pageSize };
    if (search) params.Search = search;
    if (isActive !== null) params.IsActive = isActive;

    const response = await apiClient.get("/Assistant/Paginated", { params });
    return response.data?.data || response.data;
  },

  create: async (data) => {
    const response = await apiClient.post("/Assistant/Create", data);
    return response.data;
  },

  edit: async (data) => {
    const response = await apiClient.put("/Assistant/Edit", data);
    return response.data;
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/Assistant/${id}`);
    return response.data;
  },

  paySalary: async (data) => {
    const response = await apiClient.post("/Assistant/Pay-Salary", data);
    return response.data;
  },

  updateSalaryPayment: async (data) => {
    const response = await apiClient.put("/Assistant/Pay-Salary/Edit", data);
    return response.data;
  },

  deleteSalaryPayment: async (paymentId) => {
    const response = await apiClient.delete(
      "/Assistant/Pay-Salary/Delete",
      { params: { paymentId } },
    );
    return response.data;
  },

  resetPassword: async (assistantId) => {
    const response = await apiClient.post(`/Assistant/${assistantId}/Reset-Password`);
    return response.data;
  },
// سجل مرتبات مساعد واحد (كل الأشهر بدون تحديد شهر)
getSalaryInfo: async (assistantId) => {
  if (!assistantId) {
    return;
  }

  const response = await apiClient.get(
    `/Assistant/${assistantId}/salary-info`,
  );

  return response.data;
},

// حالة صرف المرتب لكل المساعدين خلال شهر محدد
getSalaryStatus: async ({ month, year, search = "", status = "all" } = {}) => {
  const response = await apiClient.get("/Assistant/Salary-Status", {
    params: {
      Month: month,
      Year: year,
      Search: search || undefined,
      Status: status || undefined,
    },
  });

  return response.data?.data || response.data || [];
},
};
