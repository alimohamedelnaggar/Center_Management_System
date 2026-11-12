// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";

/**
 * Batch 5 proof for the finance screens (screen-only receipt):
 *   - the payments tab renders the mobile cards AND the desktop table from the
 *     same data, with the shared 44px pagination;
 *   - switching to the students tab loads the subscription statuses;
 *   - opening the receipt shows the untouched 80mm print node and the
 *     screen-only toolbar (print / close) above it.
 */

const financeServiceMock = vi.hoisted(() => ({
  getPayments: vi.fn(),
  getPaymentsPaginated: vi.fn(),
  getStudentsFinance: vi.fn(),
  getPaymentReceipt: vi.fn(),
  deletePayment: vi.fn(),
}));

const examServiceMock = vi.hoisted(() => ({
  getGroups: vi.fn(),
}));

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("../services/financeService", () => ({
  financeService: financeServiceMock,
}));

vi.mock("../services/examService", () => ({
  examService: examServiceMock,
}));

vi.mock("../services/signalr/financeSignalR", () => ({
  startFinanceConnection: vi.fn(),
}));

vi.mock("../components/common/AddPaymentModal", () => ({
  default: () => null,
}));

vi.mock("react-hot-toast", () => ({
  __esModule: true,
  default: toastMock,
  toast: toastMock,
}));

import FinancePage from "./FinancePage";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const PAYMENTS = [
  {
    paymentId: "p1",
    studentName: "أحمد محمد",
    groupName: "مجموعة أ",
    subscriptionType: 2,
    amount: 300,
    paymentDate: "2026-11-01",
    receivedByName: "سارة",
    billingPeriod: "2026-11-01",
  },
  {
    paymentId: "p2",
    studentName: "منى علي",
    groupName: "مجموعة ب",
    subscriptionType: 1,
    amount: 150,
    paymentDate: "2026-11-02",
    receivedByName: "سارة",
    sessionName: "حصة 1",
  },
];

const STUDENTS = [
  {
    studentId: "s1",
    studentName: "أحمد محمد",
    groupName: "مجموعة أ",
    subscriptionType: 2,
    paidAmount: 0,
    remainingAmount: 300,
    lastPaymentAmount: 0,
    lastPaymentDate: null,
    isPaidAlways: false,
  },
  {
    studentId: "s2",
    studentName: "منى علي",
    groupName: "مجموعة ب",
    subscriptionType: 2,
    paidAmount: 100,
    remainingAmount: 200,
    lastPaymentAmount: 100,
    lastPaymentDate: "2026-11-01",
    isPaidAlways: false,
  },
  {
    studentId: "s3",
    studentName: "سعيد حسن",
    groupName: "مجموعة ج",
    subscriptionType: 2,
    paidAmount: 300,
    remainingAmount: 0,
    lastPaymentAmount: 300,
    lastPaymentDate: "2026-11-02",
    isPaidAlways: false,
  },
  {
    studentId: "s4",
    studentName: "ليلى إبراهيم",
    groupName: "مجموعة د",
    subscriptionType: 2,
    joinedAfterBillingPeriod: true,
    joinDate: "2026-11-05",
    paidAmount: 0,
    remainingAmount: 0,
    isPaidAlways: false,
  },
];

const RECEIPT = {
  receiptNumber: 42,
  centerName: "مركز النور",
  centerPhone: "01000000000",
  studentName: "أحمد محمد",
  groupName: "مجموعة أ",
  subscriptionType: 2,
  billingMonth: 11,
  billingYear: 2026,
  amount: 300,
  paymentDate: "2026-11-01T10:00:00",
  receivedByName: "سارة",
};

let container;
let root;

const flush = async (ms = 0) => {
  for (let i = 0; i < 10; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, ms));
    });
  }
};

const render = async (element) => {
  await act(async () => {
    root.render(element);
  });
  await flush();
};

const click = async (element) => {
  expect(element).toBeTruthy();
  await act(async () => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await flush();
};

const byText = (selector, label) =>
  [...container.querySelectorAll(selector)].find((element) =>
    element.textContent.trim().includes(label),
  );

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  financeServiceMock.getPayments.mockResolvedValue({ data: PAYMENTS });
  financeServiceMock.getPaymentsPaginated.mockResolvedValue({
    succeeded: true,
    data: PAYMENTS,
    totalCount: 12,
    totalPages: 2,
    pageSize: 10,
  });
  financeServiceMock.getStudentsFinance.mockResolvedValue({
    succeeded: true,
    data: STUDENTS,
    totalCount: STUDENTS.length,
    totalPages: 1,
    pageSize: 10,
  });
  financeServiceMock.getPaymentReceipt.mockResolvedValue({
    succeeded: true,
    data: RECEIPT,
  });
  examServiceMock.getGroups.mockResolvedValue({
    data: [{ id: "g1", name: "مجموعة أ" }],
  });
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
  });
  document.body.classList.remove("receipt-printing");
  container.remove();
});

describe("finance batch 5", () => {
  it("renders the payments cards and table, and pages with the shared pagination", async () => {
    await render(h(FinancePage));

    expect(container.textContent).toContain("إدارة المالية والاشتراكات");

    const cards = container.querySelector('[data-testid="payments-cards"]');
    const table = container.querySelector('[data-testid="payments-table"]');

    expect(cards).toBeTruthy();
    expect(table).toBeTruthy();
    expect(cards.textContent).toContain("أحمد محمد");
    expect(table.textContent).toContain("أحمد محمد");
    expect(table.textContent).toContain("300 ج.م");
    expect(table.textContent).toContain("شهر نوفمبر");

    const pagination = container.querySelector(
      '[data-testid="finance-pagination"]',
    );
    expect(pagination).toBeTruthy();
    expect(pagination.textContent).toContain("12");
    expect(pagination.textContent).toContain("دفعة");

    const pageTwo = [...pagination.querySelectorAll("button")].find(
      (button) => button.textContent.trim() === "2",
    );
    await click(pageTwo);

    expect(financeServiceMock.getPaymentsPaginated).toHaveBeenLastCalledWith(
      expect.objectContaining({ pageNumber: 2, pageSize: 10 }),
    );
  });

  it("loads the subscription statuses on the students tab", async () => {
    await render(h(FinancePage));

    const studentsTab = byText('[role="tab"]', "حالة دفع الطلاب");
    await click(studentsTab);

    expect(financeServiceMock.getStudentsFinance).toHaveBeenLastCalledWith(
      expect.objectContaining({ pageNumber: 1, pageSize: 10 }),
    );

    const cards = container.querySelector('[data-testid="students-cards"]');
    const table = container.querySelector('[data-testid="students-table"]');

    expect(cards).toBeTruthy();
    expect(table).toBeTruthy();
    expect(table.textContent).toContain("غير مدفوع");
    expect(table.textContent).toContain("دفع جزء");
    expect(table.textContent).toContain("تم الدفع");
    expect(table.textContent).toContain("لم يكن مشتركًا");
  });

  it("opens the receipt above the untouched 80mm print node", async () => {
    await render(h(FinancePage));

    const printButton = container.querySelector(
      'button[aria-label="Print receipt for أحمد محمد"]',
    );
    await click(printButton);

    expect(financeServiceMock.getPaymentReceipt).toHaveBeenCalledWith("p1");

    const printRoot = container.querySelector("#receipt-print-root");
    expect(printRoot).toBeTruthy();
    expect(printRoot.className).toContain("max-w-[80mm]");
    expect(printRoot.textContent).toContain("إيصال استلام نقدية");
    expect(printRoot.textContent).toContain("R-000042");
    expect(printRoot.textContent).toContain("أحمد محمد");
    expect(printRoot.textContent).toContain("300 ج.م");
    expect(printRoot.textContent).toContain("شهر نوفمبر 2026");
    expect(document.body.classList.contains("receipt-printing")).toBe(true);

    const printAction = byText("button", "طباعة");
    const closeAction = byText("button", "إغلاق");

    expect(printAction).toBeTruthy();
    expect(printAction.getAttribute("type")).toBe("button");
    expect(closeAction).toBeTruthy();

    await click(closeAction);

    expect(container.querySelector("#receipt-print-root")).toBeFalsy();
    expect(document.body.classList.contains("receipt-printing")).toBe(false);
  });
});
