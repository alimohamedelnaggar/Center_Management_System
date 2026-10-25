import apiClient from "../api/axios";

export const questionExamService = {
  getPaged: async ({
    pageNumber = 1,
    pageSize = 10,
    search = "",
    groupId = "",
    academicYearId = "",
    mode = "",
    isPublished = "",
    from = "",
    to = "",
  }) => {
    const params = new URLSearchParams({ pageNumber, pageSize });

    if (search) params.append("search", search);
    if (groupId) params.append("groupId", groupId);
    if (academicYearId) params.append("academicYearId", academicYearId);
    if (mode) params.append("mode", mode);
    if (isPublished !== "") params.append("isPublished", isPublished);
    if (from) params.append("from", from);
    if (to) params.append("to", to);

    const response = await apiClient.get(
      `/QuestionExam/Paginated?${params.toString()}`,
    );

    return response.data;
  },

  getById: async (id) => {
    const response = await apiClient.get(`/QuestionExam/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await apiClient.post("/QuestionExam/Create", data);
    return response.data;
  },

  update: async (data) => {
    const response = await apiClient.put("/QuestionExam/Edit", data);
    return response.data;
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/QuestionExam/${id}`);
    return response.data;
  },

  getResults: async (id) => {
    const response = await apiClient.get(`/QuestionExam/${id}/Results`);
    return response.data;
  },

  publishResults: async (id, publish = true) => {
    const response = await apiClient.post(
      `/QuestionExam/${id}/Publish?publish=${publish}`,
    );
    return response.data;
  },

  getAttemptDetail: async (attemptId) => {
    const response = await apiClient.get(
      `/QuestionExam/Attempts/${attemptId}`,
    );
    return response.data;
  },

  gradeAttempt: async (attemptId, grades) => {
    const response = await apiClient.post(
      `/QuestionExam/Attempts/${attemptId}/Grade`,
      grades,
    );
    return response.data;
  },
};
