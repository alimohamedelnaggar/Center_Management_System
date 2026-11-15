import apiClient from "../api/axios";
import { normalizePaginated } from "../utils/paginated";

export const teacherService = {
  getPaginated: async (pageNumber = 1, pageSize = 10, search = "", centerId) => {
    const params = { PageNumber: pageNumber, PageSize: pageSize };
    if (search) params.Search = search;
    if (centerId) params.CenterId = centerId;

    const response = await apiClient.get("/Teacher/Paginated", { params });
    // Same Response<PaginatedResult<T>> envelope as the assistant list.
    return normalizePaginated(response.data);
  },

  create: async (data) => {
    const response = await apiClient.post("/Teacher/Create", data);
    return response.data;
  },

  edit: async (data) => {
    const response = await apiClient.put("/Teacher/Edit", data);
    return response.data;
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/Teacher/${id}`);
    return response.data;
  },
};
