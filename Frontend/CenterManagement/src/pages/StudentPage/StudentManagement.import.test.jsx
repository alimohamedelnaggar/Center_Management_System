// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";

const authState = vi.hoisted(() => ({
  auth: {
    isCenterAdmin: true,
    role: "CenterOwner",
    hasModule: () => true,
  },
}));

vi.mock("@/context/useAuth", () => ({ useAuth: () => authState.auth }));

vi.mock("@/context/useBranding", () => ({ useBranding: () => ({ center: { name: "Test" } }) }));

const studentsList = vi.hoisted(() => ({
  data: {
    search: "",
    setSearch: vi.fn(),
    group: "",
    setGroup: vi.fn(),
    status: "",
    setStatus: vi.fn(),
    resetFilters: vi.fn(),
    page: 1,
    handlePageChange: vi.fn(),
    students: { items: [], totalCount: 0, pageIndex: 1, totalPages: 1, pageSize: 10 },
    setStudents: vi.fn(),
    groups: [],
    loading: false,
    loadStudents: vi.fn(),
    studentStats: {},
    loadingStats: false,
  },
}));

vi.mock("../../hooks/students/useStudentsList", () => ({
  useStudentsList: () => studentsList.data,
}));

vi.mock("../../hooks/students/useStudentForm", () => ({
  useStudentForm: () => ({
    isOpen: false,
    addOrEdit: true,
    form: {},
    setForm: vi.fn(),
    errors: {},
    loadingBtn: false,
    openAddModal: vi.fn(),
    openEditModal: vi.fn(),
    closeModal: vi.fn(),
    submit: vi.fn(),
  }),
}));

vi.mock("../../hooks/students/useStudentActions", () => ({
  useStudentActions: () => ({
    selectedStudent: null,
    setViewOpen: vi.fn(),
    viewOpen: false,
    openView: vi.fn(),
    confirmOpen: false,
    deleteLoading: false,
    openConfirmDeleteToggle: vi.fn(),
    closeConfirmDeleteToggle: vi.fn(),
    confirmDeleteToggle: vi.fn(),
    confirmChangeStatusOpen: false,
    changeStatusLoading: false,
    openConfirmChangeStatusToggle: vi.fn(),
    closeConfirmChangeStatusToggle: vi.fn(),
    confirmChangeStatusToggle: vi.fn(),
    confirmPaymentStatusOpen: false,
    changePaymentStatusLoading: false,
    openConfirmToggle: vi.fn(),
    closeConfirmToggle: vi.fn(),
    confirmToggle: vi.fn(),
  }),
}));

vi.mock("../../services/studentService", () => ({
  studentsService: {
    generateAccounts: vi.fn(),
    bulkCreateParentAccounts: vi.fn(),
    createParentAccount: vi.fn(),
    downloadImportTemplate: vi.fn(),
    importPreview: vi.fn(),
    importCommit: vi.fn(),
    downloadImportErrorsReport: vi.fn(),
  },
}));

vi.mock("../../utils/bulkCredentialsExport", () => ({
  exportBothFormats: vi.fn(() => ({ excel: true, pdf: false })),
}));

vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

import StudentManagement from "./StudentManagement";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

const renderPage = async () => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  await act(async () => {
    root.render(h(StudentManagement));
  });

  return container;
};

const flush = async () => {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
};

beforeEach(() => {
  authState.auth = {
    isCenterAdmin: true,
    role: "CenterOwner",
    hasModule: () => true,
  };
  vi.clearAllMocks();
});

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  container = null;
  root = null;
});

describe("StudentManagement import button", () => {
  it("يظهر زر استيراد من Excel ويُفتح المعالج عند الضغط", async () => {
    const page = await renderPage();
    await flush();
    const btn = Array.from(page.querySelectorAll("button")).find((b) => b.textContent.includes("استيراد من Excel"));
    expect(btn).toBeTruthy();
    await act(async () => {
      btn.click();
    });
    await flush();
    expect(document.body.textContent).toContain("معالج استيراد الطلاب من Excel");
  });
});
