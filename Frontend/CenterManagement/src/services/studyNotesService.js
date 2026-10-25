import axios from "axios";
import apiClient, { getAccessToken } from "../api/axios";

// The API base without the "/api/V1" suffix, so we can build static file URLs.
const apiOrigin = () =>
  import.meta.env.VITE_API_BASE_URL.replace(/\/api\/V1\/?$/i, "");

export const studyNoteFileUrl = (fileName) =>
  fileName ? `${apiOrigin()}/notes/${fileName}` : null;

const uploadClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
});

uploadClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

export const studyNotesService = {
  getPaged: async ({
    pageNumber = 1,
    pageSize = 10,
    search = "",
    groupId = "",
  } = {}) => {
    const params = new URLSearchParams({ pageNumber, pageSize });
    if (search) params.append("search", search);
    if (groupId) params.append("groupId", groupId);

    const response = await apiClient.get(
      `/StudyNote/Paginated?${params.toString()}`,
    );

    return response.data;
  },

  create: async ({ title, description, groupIds, file }) => {
    const formData = new FormData();
    formData.append("Title", title);
    if (description) formData.append("Description", description);
    groupIds.forEach((id) => formData.append("GroupIds", id));
    formData.append("File", file);

    const response = await uploadClient.post("/StudyNote/Create", formData);
    return response.data;
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/StudyNote/${id}`);
    return response.data;
  },
};
