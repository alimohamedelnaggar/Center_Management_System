import apiClient from "../api/axios";

/**
 * WhatsApp quick-message templates.
 *
 * The backend is the single source of truth: every screen reads the body from
 * here (no default text lives in the frontend). These are manual wa.me links —
 * the operator still has to press send in WhatsApp.
 */
export const messageTemplateService = {
  list: async () => {
    const response = await apiClient.get("/MessageTemplate/List");
    return response.data;
  },

  update: async (key, body) => {
    const response = await apiClient.put("/MessageTemplate/Update", {
      key,
      body,
    });
    return response.data;
  },

  reset: async (key) => {
    const response = await apiClient.post(
      `/MessageTemplate/${encodeURIComponent(key)}/Reset`,
    );
    return response.data;
  },

  preview: async (key, body) => {
    const response = await apiClient.post("/MessageTemplate/Preview", {
      key,
      body,
    });
    return response.data;
  },
};
