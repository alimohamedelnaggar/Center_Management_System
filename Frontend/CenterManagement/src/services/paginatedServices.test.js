import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/api/axios", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
  getAccessToken: vi.fn(() => null),
  setAccessToken: vi.fn(),
}));

import apiClient from "@/api/axios";
import { centerService } from "@/services/centerService";
import { groupsService } from "@/services/groupsService";
import { questionBankService } from "@/services/questionBankService";
import { questionExamService } from "@/services/questionExamService";
import { studyNotesService } from "@/services/studyNotesService";
import { auditLogService } from "@/services/platformService";
import { incomeService } from "@/services/incomeService";
import { expenseService } from "@/services/expenseService";
import { incomeCategoryService } from "@/services/incomeCategoryService";
import { expenseCategoryService } from "@/services/expenseCategoryService";
import { studentsService } from "@/services/studentService";
import { financeService } from "@/services/financeService";

// Bodies below copy the property names of the backend wrappers:
// Core/Wrappers/PaginatedResult.cs -> data/data/currentPage/totalPages/totalCount/pageSize/meta/messages
// Data/Results/PagedResult.cs      -> data/items/pageIndex/pageSize/totalCount/totalPages
const ROW = { id: "11111111-1111-1111-1111-111111111111", name: "عنصر اختبار" };

const SHAPES = [
  {
    label: "Response<PaginatedResult>",
    body: {
      statusCode: 200,
      succeeded: true,
      message: null,
      data: {
        data: [ROW],
        currentPage: 1,
        totalPages: 2,
        totalCount: 12,
        pageSize: 6,
        meta: null,
        messages: [],
        succeeded: true,
        hasPreviousPage: false,
        hasNextPage: true,
      },
    },
    expected: { totalCount: 12, totalPages: 2, currentPage: 1, pageSize: 6 },
  },
  {
    label: "Response<PagedResult>",
    body: {
      statusCode: 200,
      succeeded: true,
      message: null,
      data: {
        items: [ROW],
        pageIndex: 2,
        pageSize: 10,
        totalCount: 21,
        totalPages: 3,
        hasPreviousPage: true,
        hasNextPage: true,
      },
    },
    expected: { totalCount: 21, totalPages: 3, currentPage: 2, pageSize: 10 },
  },
  {
    label: "unwrapped PaginatedResult",
    body: {
      data: [ROW],
      currentPage: 1,
      totalPages: 1,
      totalCount: 1,
      pageSize: 10,
      meta: null,
      messages: [],
      succeeded: true,
      hasPreviousPage: false,
      hasNextPage: false,
    },
    expected: { totalCount: 1, totalPages: 1, currentPage: 1, pageSize: 10 },
  },
];

const SERVICES = [
  {
    name: "centerService.getPaginated",
    path: "/Center/Paginated",
    call: () => centerService.getPaginated(1, 10),
  },
  {
    name: "centerService.getCentersPaged",
    path: "/Center/Paginated",
    call: () => centerService.getCentersPaged({ pageNumber: 1, pageSize: 10 }),
  },
  {
    name: "groupsService.getAll",
    path: "/Group/Paginated",
    call: () => groupsService.getAll(1, 10),
  },
  {
    name: "questionBankService.getBanksPaged",
    path: "/QuestionBank/Paginated",
    call: () => questionBankService.getBanksPaged({ pageNumber: 1, pageSize: 10 }),
  },
  {
    name: "questionExamService.getPaged",
    path: "/QuestionExam/Paginated",
    call: () => questionExamService.getPaged({ pageNumber: 1, pageSize: 10 }),
  },
  {
    name: "studyNotesService.getPaged",
    path: "/StudyNote/Paginated",
    call: () => studyNotesService.getPaged({ pageNumber: 1, pageSize: 10 }),
  },
  {
    name: "auditLogService.getPaginated",
    path: "/AuditLogs/Paginated",
    call: () => auditLogService.getPaginated({ pageNumber: 1, pageSize: 20 }),
  },
  {
    name: "incomeService.getAllPaged",
    path: "/Income/Paginated",
    call: () => incomeService.getAllPaged({ pageNumber: 1, pageSize: 10 }),
  },
  {
    name: "incomeService.getAll",
    path: "/Income/Paginated",
    call: () => incomeService.getAll(1, 10, ""),
  },
  {
    name: "expenseService.getAllPaged",
    path: "/Expense/Paginated",
    call: () => expenseService.getAllPaged({ pageNumber: 1, pageSize: 10 }),
  },
  {
    name: "expenseService.getAll",
    path: "/Expense/Paginated",
    call: () => expenseService.getAll(1, 10, ""),
  },
  {
    name: "incomeCategoryService.getAllPaged",
    path: "/IncomeCategory/Paginated",
    call: () => incomeCategoryService.getAllPaged({ pageNumber: 1, pageSize: 10 }),
  },
  {
    name: "expenseCategoryService.getAllPaged",
    path: "/ExpenseCategory/Paginated",
    call: () => expenseCategoryService.getAllPaged({ pageNumber: 1, pageSize: 10 }),
  },
  {
    name: "studentsService.getAllPaged",
    path: "/Student/Paginated",
    call: () => studentsService.getAllPaged({ pageIndex: 1, pageSize: 10 }),
  },
  {
    name: "studentsService.getAll",
    path: "/Student/Paginated",
    call: () => studentsService.getAll(1, 10, ""),
  },
  {
    name: "financeService.getPaymentsPaginated",
    path: "/Payments/Paginated",
    call: () => financeService.getPaymentsPaginated({ pageNumber: 1, pageSize: 10 }),
  },
  {
    name: "financeService.getStudentsFinance",
    path: "/Payments/students-finance",
    call: () => financeService.getStudentsFinance({ pageNumber: 1, pageSize: 10 }),
  },
  {
    name: "financeService.getOverdueStudents",
    path: "/Payments/overdue-students",
    call: () => financeService.getOverdueStudents({ pageNumber: 1, pageSize: 10 }),
  },
];

describe.each(SERVICES)("$name", ({ call, path }) => {
  beforeEach(() => {
    apiClient.get.mockReset();
  });

  describe.each(SHAPES)("$label", ({ body, expected }) => {
    it("normalizes rows and counts while keeping the backend envelope", async () => {
      apiClient.get.mockResolvedValueOnce({ data: body });

      const result = await call();

      expect(apiClient.get).toHaveBeenCalledTimes(1);
      expect(String(apiClient.get.mock.calls[0][0])).toContain(path);
      expect(result.items).toEqual([ROW]);
      expect(result.totalCount).toBe(expected.totalCount);
      expect(result.totalPages).toBe(expected.totalPages);
      expect(result.currentPage).toBe(expected.currentPage);
      expect(result.pageSize).toBe(expected.pageSize);
      // Existing screens read the original envelope; it must stay unchanged.
      expect(result.data).toEqual(body.data);
      if ("succeeded" in body) expect(result.succeeded).toBe(body.succeeded);
    });
  });
});
