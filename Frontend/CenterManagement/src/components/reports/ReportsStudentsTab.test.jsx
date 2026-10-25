// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";

const state = vi.hoisted(() => ({
  modules: new Set(),
  students: [],
}));

const serviceMock = vi.hoisted(() => ({
  getAll: vi.fn(),
  getStudentGroupsHistory: vi.fn(),
  getAttendanceReport: vi.fn(),
  getFinancialReport: vi.fn(),
  getGradesReport: vi.fn(),
}));

vi.mock("@/context/useAuth", () => ({
  useAuth: () => ({ hasModule: (key) => state.modules.has(key) }),
}));

vi.mock("@/services/studentService", () => ({
  studentsService: { getAll: serviceMock.getAll },
}));

vi.mock("@/services/reportsService", () => ({
  reportsService: {
    getStudentGroupsHistory: serviceMock.getStudentGroupsHistory,
    getAttendanceReport: serviceMock.getAttendanceReport,
    getFinancialReport: serviceMock.getFinancialReport,
    getGradesReport: serviceMock.getGradesReport,
  },
}));

vi.mock("@/services/signalr/financeSignalR", () => ({
  startFinanceConnection: vi.fn(),
  financeConnection: { on: vi.fn(), off: vi.fn() },
}));

vi.mock("@/components/common/ReportDetailsModal", () => ({
  default: ({ isOpen, reportData }) =>
    isOpen
      ? h(
          "div",
          { "data-testid": "report-modal" },
          `REPORT_MODAL:${reportData?.studentName ?? ""}`,
        )
      : null,
}));

import ReportsStudentsTab from "./ReportsStudentsTab";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const ALL_MODULES = ["attendance", "payments", "grades"];

let container;
let root;

const flush = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

const renderTab = async () => {
  await act(async () => {
    root.render(h(ReportsStudentsTab));
  });

  await flush();
};

const buttonByLabel = (label) =>
  [...container.querySelectorAll("button")].find(
    (button) => button.getAttribute("aria-label") === label,
  );

const click = (element) => {
  act(() => {
    element.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true }),
    );
  });
};

beforeEach(() => {
  state.modules = new Set(ALL_MODULES);
  state.students = [
    { id: "s1", fullName: "أحمد محمد", groupName: "مجموعة أ" },
    { id: "s2", fullName: "سارة علي", groupName: "مجموعة ب" },
  ];

  serviceMock.getAll.mockResolvedValue({
    items: state.students,
    totalPages: 1,
    totalCount: 2,
  });
  serviceMock.getStudentGroupsHistory.mockResolvedValue([]);
  serviceMock.getAttendanceReport.mockResolvedValue({
    data: { studentId: "s1", studentName: "أحمد محمد", totalSessions: 4 },
  });
  serviceMock.getFinancialReport.mockResolvedValue([]);
  serviceMock.getGradesReport.mockResolvedValue({
    data: { studentId: "s1", studentName: "أحمد محمد", exams: [] },
  });

  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });

  container.remove();
  container = null;
  root = null;
  vi.clearAllMocks();
});

describe("the student reports page for teachers", () => {
  it("lists the students of the caller's scope", async () => {
    await renderTab();

    expect(container.textContent).toContain("تقارير الطلاب");
    expect(container.textContent).toContain("أحمد محمد");
    expect(container.textContent).toContain("سارة علي");
    expect(serviceMock.getAll).toHaveBeenCalled();
  });

  it("shows the accounts, attendance, exams and full report columns", async () => {
    await renderTab();

    expect(buttonByLabel("تقرير الحضور والغياب")).toBeTruthy();
    expect(buttonByLabel("التقرير المالي والتسديدات")).toBeTruthy();
    expect(buttonByLabel("نتائج الامتحانات")).toBeTruthy();
    expect(buttonByLabel("التقرير الشامل للطالب")).toBeTruthy();
  });

  it("titles the exams column with the exam results", async () => {
    await renderTab();

    const headers = [...container.querySelectorAll("th")].map(
      (th) => th.textContent.trim(),
    );

    expect(headers).toContain("نتائج الامتحانات");
    expect(headers).not.toContain("الدرجات");
  });

  it("hides the columns of the modules the center did not buy", async () => {
    state.modules = new Set(["attendance"]);

    await renderTab();

    expect(buttonByLabel("تقرير الحضور والغياب")).toBeTruthy();
    expect(buttonByLabel("التقرير المالي والتسديدات")).toBeFalsy();
    expect(buttonByLabel("نتائج الامتحانات")).toBeFalsy();
    // The full report needs all three modules.
    expect(buttonByLabel("التقرير الشامل للطالب")).toBeFalsy();
  });

  it("explains itself when the center bought no report module", async () => {
    state.modules = new Set();

    await renderTab();

    expect(container.textContent).toContain(
      "تقارير الطلاب محتاجة اشتراك وحدة الحضور أو المدفوعات أو الدرجات",
    );
    expect(container.querySelector("table")).toBeFalsy();
  });

  it("opens the attendance report of the student in a modal", async () => {
    await renderTab();

    click(buttonByLabel("تقرير الحضور والغياب"));
    await flush();

    expect(serviceMock.getAttendanceReport).toHaveBeenCalledWith("s1", null);
    expect(container.querySelector('[data-testid="report-modal"]')).toBeTruthy();
    expect(container.textContent).toContain("REPORT_MODAL:أحمد محمد");
  });
});
