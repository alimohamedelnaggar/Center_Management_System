import apiClient from "../api/axios";

const baseURL = import.meta.env.VITE_HUB_API_URL;

export const financeService = {
  // =========================================================
  // Get Student Payment Info
  // =========================================================
  getStudentPaymentInfo: async (
    studentId,
    { billingPeriod, sessionsCount } = {},
  ) => {
    const response = await apiClient.get(
      `${baseURL}student-payment-info/${studentId}`,
      {
        params: {
          billingPeriod: billingPeriod
            ? `${billingPeriod}-01`
            : null,
          sessionsCount: sessionsCount ?? null,
        },
      },
    );

    return response.data;
  },

  // =========================================================
  // Add Payment
  // =========================================================
  addPayment: async (paymentData) => {
    const response = await apiClient.post(
      `/Payments/Create`,
      paymentData,
    );

    return response.data;
  },

  // =========================================================
  // Get All Payments
  // =========================================================
  getPayments: async () => {
    const response = await apiClient.get(`/Payments/GetAll`);

    return response.data;
  },

  // =========================================================
  // Get Payments - Paginated
  // =========================================================
  getPaymentsPaginated: async ({
    groupId,
    search = "",
    subscriptionType,
    pageNumber = 1,
    pageSize = 10,
  }) => {
    const response = await apiClient.get(
      `/Payments/Paginated`,
      {
        params: {
          groupId: groupId || null,

          search: search || null,

          subscriptionType:
            subscriptionType === null ||
            subscriptionType === undefined
              ? null
              : subscriptionType,

          pageNumber,
          pageSize,
        },
      },
    );

    return response.data;
  },

  // =========================================================
  // Get Payment Receipt
  // =========================================================
  getPaymentReceipt: async (paymentId) => {
    const response = await apiClient.get(
      `/Payments/${paymentId}/receipt`,
    );

    return response.data;
  },

  // =========================================================
  // Update Payment
  // =========================================================
  updatePayment: async (paymentData) => {
    const response = await apiClient.put(
      `/Payments/Edit`,
      paymentData,
    );

    return response.data;
  },

  // =========================================================
  // Get Students Finance - Paginated
  // =========================================================
  getStudentsFinance: async ({
    groupId,
    search = "",
    subscriptionType,
    paymentStatus,
    billingPeriod,
    pageNumber = 1,
    pageSize = 10,
  }) => {
    const response = await apiClient.get(
      `/Payments/students-finance`,
      {
        params: {
          groupId: groupId || null,

          search: search || null,

          subscriptionType:
            subscriptionType === null ||
            subscriptionType === undefined
              ? null
              : subscriptionType,

          paymentStatus:
            paymentStatus === null ||
            paymentStatus === undefined
              ? null
              : paymentStatus,

          billingPeriod: billingPeriod || null,

          pageNumber,
          pageSize,
        },
      },
    );

    return response.data;
  },

  // =========================================================
  // Get Overdue Students - Paginated
  // =========================================================
  getOverdueStudents: async ({
    groupId,
    teacherId,
    search = "",
    month,
    year,
    pageNumber = 1,
    pageSize = 10,
  } = {}) => {
    const billingPeriod =
      month && year
        ? `${year}-${String(month).padStart(2, "0")}-01`
        : null;

    const response = await apiClient.get(
      `/Payments/overdue-students`,
      {
        params: {
          groupId: groupId || null,

          teacherId: teacherId || null,

          search: search || null,

          billingPeriod,

          pageNumber,
          pageSize,
        },
      },
    );

    return response.data;
  },

  // =========================================================
  // Delete Payment
  // =========================================================
  deletePayment: async (paymentId) => {
    const response = await apiClient.delete(
      `/PaymentsDelete/${paymentId}`,
    );

    return response.data;
  },
};