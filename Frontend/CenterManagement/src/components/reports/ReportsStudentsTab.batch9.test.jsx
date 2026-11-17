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

let container;
let root;

const flush = async () => {
  for (let i = 0; i < 5; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
};

const renderTab = async () => {
  await act(async () => {
    root.render(h(ReportsStudentsTab));
  });
  await flush();
};

const click = async (element) => {
  await act(async () => {
    element.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true }),
    );
  });
  await flush();
};

const cards = () =>
  [...container.querySelectorAll('[data-testid="reports-students-page"] ul li')];

beforeEach(() => {
  state.modules = new Set(["attendance", "payments", "grades"]);
  state.students = [
    {
      id: "s1",
      fullName: "أحمد محمد عبد الرحمن السيد الطويل جدًا",
      groupName: "مجموعة أ — الصف الثالث الإعدادي",
    },
  ];

  serviceMock.getAll.mockResolvedValue({
    items: state.students,
    totalPages: 1,
    totalCount: 1,
  });
  serviceMock.getStudentGroupsHistory.mockResolvedValue([]);
  serviceMock.getAttendanceReport.mockResolvedValue({
    data: { studentId: "s1", studentName: "أحمد محمد" },
  });
  serviceMock.getFinancialReport.mockResolvedValue([]);
  serviceMock.getGradesReport.mockResolvedValue({
    data: { studentId: "s1", studentName: "أحمد محمد", exams: [] },
  });

  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
  });
  container.remove();
  vi.clearAllMocks();
});

describe("the student reports tab on a phone (batch 9)", () => {
  it("turns every student into a card with labelled report actions", async () => {
    await renderTab();

    expect(cards()).toHaveLength(1);
    expect(cards()[0].textContent).toContain(
      "أحمد محمد عبد الرحمن السيد الطويل جدًا",
    );

    const labels = [...cards()[0].querySelectorAll("button")].map((button) =>
      button.textContent.trim(),
    );
    expect(labels).toEqual(["الحضور", "المالية", "الدرجات", "تقرير كامل"]);
  });

  it("opens the report from the card without the wide table", async () => {
    await renderTab();

    const attendance = [...cards()[0].querySelectorAll("button")].find(
      (button) => button.textContent.trim() === "الحضور",
    );
    await click(attendance);

    expect(serviceMock.getAttendanceReport).toHaveBeenCalledWith("s1", null);
    expect(container.querySelector('[data-testid="report-modal"]')).toBeTruthy();
  });

  it("keeps the full-report action locked until all three modules exist", async () => {
    state.modules = new Set(["attendance", "payments"]);
    await renderTab();

    expect(cards()[0].textContent).not.toContain("تقرير كامل");
    expect(cards()[0].textContent).toContain("الحضور");
    expect(cards()[0].textContent).toContain("المالية");
  });

  it("shows an explicit error and retries the list", async () => {
    serviceMock.getAll.mockRejectedValueOnce(new Error("network down"));

    await renderTab();

    const alert = container.querySelector('[data-testid="reports-students-error"]');
    expect(alert).toBeTruthy();
    expect(alert.getAttribute("role")).toBe("alert");
    expect(container.textContent).toContain("network down");
    expect(cards()).toHaveLength(0);

    serviceMock.getAll.mockResolvedValueOnce({
      items: state.students,
      totalPages: 1,
      totalCount: 1,
    });
    await click(container.querySelector('[data-testid="reports-students-retry"]'));

    expect(container.querySelector('[data-testid="reports-students-error"]')).toBeFalsy();
    expect(cards()).toHaveLength(1);
  });
});
