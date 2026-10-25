import apiClient from "../api/axios";

export const centerService = {
  create: async (data) => {
    const response = await apiClient.post("/Center/Create", data);
    return response.data;
  },
  createWithOwner: async (data) => {
    const response = await apiClient.post("/Center/CreateWithOwner", data);
    return response.data;
  },
  getMyCenters: async () => {
    const response = await apiClient.get("/Center/MyCenters");
    return response.data;
  },
  getMyCenter: async () => {
    const response = await apiClient.get("/Center/MyCenter");
    return response.data;
  },
  updateMyCenter: async (data) => {
    const response = await apiClient.put("/Center/UpdateMyCenter", data);
    return response.data;
  },
  uploadLogo: async (file) => {
    const formData = new FormData();
    formData.append("logo", file);
    const response = await apiClient.post("/Center/UploadLogo", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },
  getPaginated: async (pageNumber = 1, pageSize = 10) => {
    const response = await apiClient.get("/Center/Paginated", {
      params: { pageNumber, pageSize },
    });
    return response.data;
  },
  // SuperAdmin: paginated list of every center with optional filters.
  getCentersPaged: async ({
    pageNumber = 1,
    pageSize = 10,
    search,
    status,
    type,
  } = {}) => {
    const response = await apiClient.get("/Center/Paginated", {
      params: { pageNumber, pageSize, search, status, type },
    });
    return response.data;
  },
  getById: async (id) => {
    const response = await apiClient.get(`/Center/${id}`);
    return response.data;
  },
  // SuperAdmin: edit a center's details + subscription.
  update: async (data) => {
    const response = await apiClient.put("/Center/Edit", data);
    return response.data;
  },
  // SuperAdmin: suspend (2) / activate (1) a center.
  setStatus: async (id, status) => {
    const response = await apiClient.put(`/Center/${id}/Status`, { status });
    return response.data;
  },
  // SuperAdmin: soft delete a center.
  softDelete: async (id) => {
    const response = await apiClient.delete(`/Center/${id}`);
    return response.data;
  },
  // SuperAdmin: upgrade a (solo) center to multi-teacher.
  upgradeToMultiTeacher: async (centerId = null) => {
    const response = await apiClient.post(
      "/Center/Upgrade-To-Multi-Teacher",
      centerId ? { centerId } : {},
    );
    return response.data;
  },
  // SuperAdmin: reset any user's password to a generated temporary one.
  resetUserPassword: async (userId) => {
    const response = await apiClient.post("/User/Reset-Password", { userId });
    return response.data;
  },
};
