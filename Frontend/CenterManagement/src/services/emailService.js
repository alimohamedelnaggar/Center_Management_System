import apiClient from "../api/axios";

export const emailService = {
  sendEmail: async ({ email, subject, message }) => {
    const response = await apiClient.post("/EmailsRoute/SendEmail", null, {
      params: { email, subject, message },
    });
    return response.data;
  },
};
