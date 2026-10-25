import apiClient from "../api/axios";

/**
 * The import endpoints return `Response<T>` (see Core/Bases/Response.cs) with
 * default System.Text.Json camelCase serialization:
 *
 *   { statusCode, succeeded, message, code, errors, errorsBag, data: { ... } }
 *
 * `StudentImportPreviewResult`:
 *   { sessionId, totalRows, validRows, duplicateInFile, duplicateInDb,
 *     errorRows, rows: StudentImportRow[], headers: string[] }
 *
 * `StudentImportRow` has NO status field. Its state must be derived:
 *   - duplicate  → isDuplicateInFile || isDuplicateInDb
 *   - error      → !isValid (and not a duplicate)
 *   - valid      → isValid
 * and its reasons live in `errors: string[]`.
 *
 * Normalizing here keeps the wizard free of response-shape knowledge.
 */

const importRowStatus = (row) => {
  if (row.isDuplicateInFile === true || row.isDuplicateInDb === true) {
    return "duplicate";
  }
  if (row.isValid === true) return "valid";
  return "error";
};

export const mapImportRow = (row = {}) => {
  const errors = Array.isArray(row.errors) ? row.errors.filter(Boolean) : [];
  const status = importRowStatus(row);
  return {
    rowNumber: row.rowNumber ?? null,
    fullName: row.fullName ?? "",
    phone: row.phone ?? "",
    phoneParent: row.phoneParent ?? "",
    groupName: row.groupName ?? "",
    groupId: row.groupId ?? null,
    subscriptionType: row.subscriptionType ?? "",
    customMonthlyPrice: row.customMonthlyPrice ?? "",
    school: row.school ?? "",
    notes: row.notes ?? "",
    errors,
    errorMessage: errors.join(" • "),
    isValid: row.isValid === true,
    isDuplicateInFile: row.isDuplicateInFile === true,
    isDuplicateInDb: row.isDuplicateInDb === true,
    canUpdate: row.isDuplicateInDb === true && row.canUpdate === true,
    groupWillBeCreated: row.groupWillBeCreated === true,
    status,
  };
};

export const mapImportPreview = (payload) => {
  const wrapper = payload && typeof payload === "object" ? payload : {};
  const data =
    wrapper.data && typeof wrapper.data === "object" ? wrapper.data : {};

  const rows = (Array.isArray(data.rows) ? data.rows : []).map(mapImportRow);

  // The aggregate counts from the backend are authoritative when present; rows
  // are only used as a fallback so a partial/legacy response still renders.
  const valid = rows.filter((row) => row.status === "valid").length;
  const duplicate = rows.filter((row) => row.status === "duplicate").length;
  const error = rows.filter((row) => row.status === "error").length;

  return {
    succeeded: wrapper.succeeded !== false,
    message: wrapper.message ?? null,
    data: {
      sessionId: data.sessionId ?? null,
      total: data.totalRows ?? rows.length,
      valid: data.validRows ?? valid,
      duplicate: rows.length ? duplicate : (data.duplicateInFile ?? 0) + (data.duplicateInDb ?? 0),
      duplicateInFile: data.duplicateInFile ?? 0,
      duplicateInDb: data.duplicateInDb ?? 0,
      error: rows.length ? error : (data.errorRows ?? 0),
      errorRows: data.errorRows ?? error,
      rows,
      headers: Array.isArray(data.headers) ? data.headers : [],
      hasGroupWillBeCreated: rows.some((row) => row.groupWillBeCreated),
    },
  };
};

const mapStudentAccounts = (accounts) =>
  (Array.isArray(accounts) ? accounts : []).map((account) => ({
    kind: "student",
    studentName: account.fullName ?? "",
    phone: account.phone ?? "",
    username: account.username ?? "",
    temporaryPassword: account.temporaryPassword ?? "",
    passwordChanged: false,
    reason: account.reason ?? null,
    status: account.username ? "Created" : "NotCreated",
  }));

const mapParentAccounts = (accounts) =>
  (Array.isArray(accounts) ? accounts : []).map((account) => ({
    kind: "parent",
    studentName: account.studentName ?? "",
    phone: account.parentPhone ?? "",
    username: account.parentPhone ?? "",
    temporaryPassword: account.temporaryPassword ?? "",
    passwordChanged: account.passwordChanged === true,
    reason: account.reason ?? null,
    status: account.status ?? "",
  }));

export const mapImportCommit = (payload) => {
  const wrapper = payload && typeof payload === "object" ? payload : {};
  const data =
    wrapper.data && typeof wrapper.data === "object" ? wrapper.data : {};

  const studentAccounts = mapStudentAccounts(data.studentAccounts);
  const parentAccounts = mapParentAccounts(data.parentAccounts);

  return {
    succeeded: wrapper.succeeded !== false,
    message: wrapper.message ?? null,
    data: {
      created: data.created ?? 0,
      updated: data.updated ?? 0,
      skipped: data.skipped ?? 0,
      failed: data.failed ?? 0,
      errors: (Array.isArray(data.errors) ? data.errors : []).map((item) => ({
        rowNumber: item.rowNumber ?? null,
        fullName: item.fullName ?? "",
        reason: item.reason ?? "",
      })),
      createdGroups: Array.isArray(data.createdGroups)
        ? data.createdGroups
        : [],
      studentAccounts,
      parentAccounts,
      createdAccounts: [...studentAccounts, ...parentAccounts],
      alreadyCompleted: data.alreadyCompleted === true,
    },
  };
};

export const studentsService = {
  getAllPaged: async ({
    pageIndex = 1,
    pageSize = 10,
    search = null,
    groupId = null,
    isActive = null,
  }) => {
    const params = new URLSearchParams({
      pageIndex,
      pageSize,
    });

    if (search) params.append("search", search);
    if (groupId) params.append("groupId", groupId);

    if (isActive !== null && isActive !== undefined && isActive !== "") {
      params.append("isActive", isActive);
    }

    const response = await apiClient.get(
      `/Student/Paginated?${params.toString()}`,
    );

    return response.data;
  },

  getAll: async (pageIndex = 1, pageSize = 7, search = "") => {
    const response = await apiClient.get("/Student/Paginated", {
      params: {
        pageIndex,
        pageSize,
        search,
      },
    });
    return response.data?.data || response.data;
  },

  getStats: async () => {
    const response = await apiClient.get("/Student/stats");
    return response.data;
  },
  create: async (groupData) => {
    const response = await apiClient.post("/Student/Create", groupData);
    return response.data;
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/Student/delete/${id}`);
    return response.data;
  },
  togglePaymentStatus: async (id) => {
    const response = await apiClient.put(
      `/Student/change-payment-status/${id}`,
    );
    return response.data;
  }, 
  toggleStatus: async (id) => {
    const response = await apiClient.put(
      `/Student/change-status/${id}`,
    );
    return response.data;
  },

  update: async (groupData) => {
    const response = await apiClient.put(`/Student/Edit`, groupData);
    return response.data;
  },

  generateMissingQrCodes: async () => {
    const response = await apiClient.post(`/Student/generate-qr-codes`);
    return response.data;
  },

  generateAccounts: async () => {
    const response = await apiClient.post(`/Student/Generate-Accounts`);
    return response.data;
  },

  downloadImportTemplate: async () => {
    const response = await apiClient.get("/Student/Import/Template", {
      responseType: "blob",
    });
    return response;
  },

  importPreview: async (file) => {
    const formData = new FormData();
    formData.append("File", file);
    const response = await apiClient.post("/Student/Import/Preview", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return mapImportPreview(response?.data);
  },

  importCommit: async ({
    sessionId,
    duplicateMode = "skip",
    createMissingGroups = false,
    createStudentAccounts = true,
    createParentAccounts = true,
  }) => {
    // Field names mirror CommitStudentImportCommand exactly.
    const response = await apiClient.post("/Student/Import/Commit", {
      sessionId,
      duplicateMode,
      createMissingGroups,
      createStudentAccounts,
      createParentAccounts,
    });
    return mapImportCommit(response?.data);
  },

  downloadImportErrorsReport: async (sessionId) => {
    const response = await apiClient.get(`/Student/Import/Errors/${encodeURIComponent(sessionId)}`, {
      responseType: "blob",
    });
    return response;
  },

  createParentAccount: async (id) => {
    const response = await apiClient.post(
      `/Student/${id}/Create-Parent-Account`,
    );
    return response.data;
  },

  // Creates (or reuses) the parent login accounts of many students at once.
  bulkCreateParentAccounts: async ({
    groupId = null,
    isActive = null,
    search = null,
    skipAlreadyLinked = false,
  } = {}) => {
    const body = { skipAlreadyLinked };

    if (groupId) body.groupId = groupId;
    if (search) body.search = search;
    if (isActive !== null && isActive !== undefined && isActive !== "") {
      body.isActive = isActive;
    }

    const response = await apiClient.post("/Student/Create-Parent-Accounts", body);
    return response.data;
  },

  resetPassword: async (id) => {
    const response = await apiClient.put(`/Student/reset-password/${id}`);
    return response.data;
  },

  getStudentCard: async (code) => {
    const response = await apiClient.get(
      `/StudentCard/by-code/${encodeURIComponent(code)}`,
    );
    return response.data;
  },
};