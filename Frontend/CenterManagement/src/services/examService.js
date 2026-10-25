import apiClient from "../api/axios";

export const examService = {
  create: async (examData) => {
    if (!examData) {
      return;
    }

    const response = await apiClient.post("/Exam/Create", examData);
    return response.data;
  },

  edit: async (examData) => {
    if (!examData) {
      return;
    }

    const response = await apiClient.put("/Exam/Edit", examData);
    return response.data;
  },

  delete: async (examId) => {
    if (!examId) {
      return;
    }

    const response = await apiClient.delete(`/Exam/Delete/${examId}`);
    return response.data;
  },

  getGroups: async () => {
    const response = await apiClient.get("/Group/get-all");
    return response.data;
  },

  getStudentsByGroup: async (groupId) => {
    if (!groupId) {
      return;
    }

    const response = await apiClient.get("/Attendance/student-attendence", {
      params: {
        GroupId: groupId,
        PageSize: 500,
      },
    });

    return response.data;
  },

  getSessionsByGroup: async (groupId) => {
    if (!groupId) {
      return;
    }

    const response = await apiClient.get(
      `/SessionRolesRole-By-Group/${groupId}`,
    );

    return response.data;
  },

  getStats: async ({ groupId, sessionId, examId }) => {
    if (!groupId || !sessionId || !examId) {
      return;
    }

    const response = await apiClient.get("/Attendance/stats", {
      params: {
        groupId,
        sessionId,
        examId,
      },
    });

    return response.data;
  },

  getGroupExams: async ({ groupId, sessionId }) => {
    if (!groupId || !sessionId) {
      return;
    }

    const response = await apiClient.get(
      `/Exam/groups/${groupId}/sessions/${sessionId}/exams`,
    );

    return response.data;
  },

  getExamGrades: async ({ groupId, sessionId, examId }) => {
    if (!groupId || !sessionId || !examId) {
      return;
    }

    const response = await apiClient.get(
      `/Exam/groups/${groupId}/sessions/${sessionId}/exams/${examId}/grades`,
    );

    return response.data;
  },

  updateParentContact: async ({ studentId, examId }) => {
    if (!studentId || !examId) {
      return;
    }

    const response = await apiClient.put("/Exam/ParentContact", {
      studentId,
      examId,
    });

    return response.data;
  },
};