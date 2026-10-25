import apiClient from "../api/axios";

/**
 * SuperAdmin subscription management. Mirrors CenterSubscriptionController:
 * list centers with derived state, read/write a center's subscription, renew it,
 * and edit the enabled feature modules (with a server-side dependency preview).
 */
export const subscriptionService = {
  list: async (search) => {
    const response = await apiClient.get("/Center/Subscriptions", {
      params: { search: search?.trim() || undefined },
    });
    return response.data;
  },
  get: async (centerId) => {
    const response = await apiClient.get(`/Center/${centerId}/Subscription`);
    return response.data;
  },
  // Manual edit of the subscription window / price / grace days.
  update: async (data) => {
    const response = await apiClient.put("/Center/Subscription/Update", data);
    return response.data;
  },
  // Full subscription history: every recorded period plus its payment records.
  history: async (centerId) => {
    const response = await apiClient.get(
      `/Center/${centerId}/Subscription/History`,
    );
    return response.data;
  },
  // Record a payment against the center's current subscription.
  addPayment: async (centerId, data) => {
    const response = await apiClient.post("/Center/Subscription/Payment", {
      centerId,
      ...data,
    });
    return response.data;
  },
  // Renewal: resumes from the original end date when the center is in grace.
  renew: async (centerId, data) => {
    const response = await apiClient.post(
      `/Center/${centerId}/Subscription/Renew`,
      data,
    );
    return response.data;
  },
  updateModules: async ({ centerId, enabledModules, disableDependents }) => {
    const response = await apiClient.put("/Center/Modules/Update", {
      centerId,
      enabledModules,
      disableDependents: !!disableDependents,
    });
    return response.data;
  },
  // Resolve a proposed module set without persisting (auto-enabled + blocked).
  previewModules: async ({ centerId, enabledModules, disableDependents }) => {
    const query = new URLSearchParams();
    query.append("centerId", centerId);
    if (disableDependents) query.append("disableDependents", "true");
    (enabledModules ?? []).forEach((key) => query.append("enabledModules", key));

    const response = await apiClient.get(
      `/Center/Modules/Preview?${query.toString()}`,
    );
    return response.data;
  },
};

export default subscriptionService;
