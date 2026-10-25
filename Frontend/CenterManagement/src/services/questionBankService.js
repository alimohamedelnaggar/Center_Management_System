import axios from "axios";
import apiClient, { getAccessToken } from "../api/axios";

// The API base without the "/api/V1" suffix, so we can build static image URLs.
const apiOrigin = () =>
  import.meta.env.VITE_API_BASE_URL.replace(/\/api\/V1\/?$/i, "");

export const questionImageUrl = (imageName) =>
  imageName ? `${apiOrigin()}/images/questions/${imageName}` : null;

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

export const questionBankService = {
  // -------------------- Academic Years
  getAcademicYears: async () => {
    const response = await apiClient.get("/AcademicYear/List");
    return response.data;
  },

  createAcademicYear: async (data) => {
    const response = await apiClient.post("/AcademicYear/Create", data);
    return response.data;
  },

  updateAcademicYear: async (data) => {
    const response = await apiClient.put("/AcademicYear/Edit", data);
    return response.data;
  },

  deleteAcademicYear: async (id) => {
    const response = await apiClient.delete(`/AcademicYear/${id}`);
    return response.data;
  },

  // -------------------- Question Banks
  getBanksPaged: async ({
    pageNumber = 1,
    pageSize = 10,
    search = "",
    academicYearId = "",
  }) => {
    const params = new URLSearchParams({
      pageNumber,
      pageSize,
    });

    if (search) params.append("search", search);
    if (academicYearId) params.append("academicYearId", academicYearId);

    const response = await apiClient.get(
      `/QuestionBank/Paginated?${params.toString()}`,
    );

    return response.data;
  },

  createBank: async (data) => {
    const response = await apiClient.post("/QuestionBank/Create", data);
    return response.data;
  },

  updateBank: async (data) => {
    const response = await apiClient.put("/QuestionBank/Edit", data);
    return response.data;
  },

  deleteBank: async (id) => {
    const response = await apiClient.delete(`/QuestionBank/${id}`);
    return response.data;
  },

  // -------------------- Questions
  getBankQuestions: async (bankId) => {
    const response = await apiClient.get(`/QuestionBank/${bankId}/questions`);
    return response.data;
  },

  addQuestion: async (data) => {
    const response = await apiClient.post("/QuestionBank/questions", data);
    return response.data;
  },

  updateQuestion: async (data) => {
    const response = await apiClient.put("/QuestionBank/questions", data);
    return response.data;
  },

  deleteQuestion: async (id) => {
    const response = await apiClient.delete(`/QuestionBank/questions/${id}`);
    return response.data;
  },

  // -------------------- Image Upload (multipart)
  uploadQuestionImage: async (file) => {
    const formData = new FormData();
    formData.append("imageFile", file);

    const response = await uploadClient.post(
      "/QuestionBank/upload-image",
      formData,
    );

    return response.data;
  },
};