// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";

/**
 * Batch 5 proof for the overdue screen:
 *   - the same row set renders as mobile cards and as the desktop table;
 *   - large amounts and long names do not break the row rendering;
 *   - "إضافة دفعة" prefills the payment dialog with the row's student / group
 *     and the billing period currently selected in the filters;
 *   - the WhatsApp reminder keeps using the saved backend template.
 */

const financeServiceMock = vi.hoisted(() => ({
  getOverdueStudents: vi.fn(),
}));

const examServiceMock = vi.hoisted(() => ({
  getGroups: vi.fn(),
}));

const teacherServiceMock = vi.hoisted(() => ({
  getPaginated: vi.fn(),
}));

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

const paymentModalProps = vi.hoisted(() => ({ current: null }));

vi.mock("../context/useAuth", () => ({
  useAuth: () => ({
    isCenterAdmin: true,
    isSoloCenter: false,
    centerTypeLoaded: true,
    hasModule: () => true,
    accessToken: "test-token",
  }),
}));

vi.mock("../context/useBranding", () => ({
  useBranding: () => ({ center: { name: "مركز النور" } }),
}));

vi.mock("../hooks/useMessageTemplates", () => ({
  useMessageTemplates: () => ({
    bodies: {
      feesReminder:
        "مرحباً {student}، المتبقي {amount} لشهر {month}. — {center}",
    },
  }),
}));

vi.mock("../services/financeService", () => ({
  financeService: financeServiceMock,
}));

vi.mock("../services/examService", () => ({
  examService: examServiceMock,
}));

vi.mock("../services/teacherService", () => ({
  teacherService: teacherServiceMock,
}));

vi.mock("../components/common/AddPaymentModal", () => ({
  default: (props) => {
    paymentModalProps.current = props;
    return null;
  },
}));

vi.mock("react-hot-toast", () => ({
  __esModule: true,
  default: toastMock,
  toast: toastMock,
}));

import OverduePage from "./OverduePage";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const OVERDUE_ROW = {
  studentId: "s1",
  groupId: "g1",
  studentName: "أحمد محمد عبد الرحمن السيد الطويل جداً للاختبار",
  groupName: "مجموعة الصف الثالث الثانوي - علمي علوم",
  teacherName: "أ. محمد عبد الله",
  parentPhoneNumber: "01012345678",
  totalAmount: 1234567.89,
  paidAmount: 100000,
  remainingAmount: 1134567.89,
  status: 1,
  lastPaymentDate: "2026-10-05",
};

const OVERDUE_RESPONSE = {
  data: [OVERDUE_ROW],
  meta: {
    totalStudents: 1,
    totalDue: 1234567.89,
    totalPaid: 100000,
    totalRemaining: 1134567.89,
  },
  totalCount: 1,
  totalPages: 1,
};

let container;
let root;
let openSpy;

const flush = async () => {
  for (let i = 0; i < 10; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
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

const buttonByText = (scope, label) =>
  [...scope.querySelectorAll("button")].find((button) =>
    button.textContent.trim().includes(label),
  );

const renderPage = () =>
  render(
    h(
      MemoryRouter,
      { initialEntries: ["/overdue?month=11&year=2026"] },
      h(OverduePage),
    ),
  );

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  paymentModalProps.current = null;

  financeServiceMock.getOverdueStudents.mockResolvedValue(OVERDUE_RESPONSE);
  examServiceMock.getGroups.mockResolvedValue({
    data: [{ id: "g1", name: "مجموعة الصف الثالث الثانوي - علمي علوم" }],
  });
  teacherServiceMock.getPaginated.mockResolvedValue({
    data: [{ id: "t1", fullName: "أ. محمد عبد الله" }],
  });

  openSpy = vi.fn();
  window.open = openSpy;
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
  });
  container.remove();
});

describe("overdue batch 5", () => {
  it("renders the cards and the table with long names and large amounts", async () => {
    await renderPage();

    const cards = container.querySelector('[data-testid="overdue-cards"]');
    const table = container.querySelector('[data-testid="overdue-table"]');

    expect(cards).toBeTruthy();
    expect(table).toBeTruthy();
    expect(cards.textContent).toContain(OVERDUE_ROW.studentName);
    expect(table.textContent).toContain(OVERDUE_ROW.studentName);
    expect(cards.textContent).toContain("1,134,567.89 ج.م");
    expect(table.textContent).toContain("1,134,567.89 ج.م");
    expect(table.textContent).toContain("1,234,567.89 ج.م");

    expect(container.textContent).toContain("عدد المتأخرين");
    expect(container.textContent).toContain("إجمالي المستحق");
    expect(container.textContent).toContain("إجمالي المدفوع");
    expect(container.textContent).toContain("إجمالي المتبقي");
    expect(container.textContent).toContain("نوفمبر 2026");
  });

  it("prefills the payment dialog from the overdue row", async () => {
    await renderPage();

    const cards = container.querySelector('[data-testid="overdue-cards"]');
    await click(buttonByText(cards, "إضافة دفعة"));

    expect(paymentModalProps.current).toBeTruthy();
    expect(paymentModalProps.current.prefill).toEqual({
      studentId: "s1",
      groupId: "g1",
      billingPeriod: "2026-11",
    });
    expect(paymentModalProps.current.isOpen).toBe(true);
  });

  it("builds the fees reminder from the saved backend template", async () => {
    await renderPage();

    const cards = container.querySelector('[data-testid="overdue-cards"]');
    await click(buttonByText(cards, "تذكير واتساب"));

    expect(openSpy).toHaveBeenCalledTimes(1);

    const url = openSpy.mock.calls[0][0];
    const expectedMessage =
      "مرحباً أحمد محمد عبد الرحمن السيد الطويل جداً للاختبار، المتبقي 1,134,567.89 ج.م لشهر نوفمبر 2026. — مركز النور";

    expect(url).toBe(
      `https://wa.me/201012345678?text=${encodeURIComponent(expectedMessage)}`,
    );
  });

  it("keeps the empty-state message when nothing matches the filters", async () => {
    financeServiceMock.getOverdueStudents.mockResolvedValue({
      data: [],
      meta: {
        totalStudents: 0,
        totalDue: 0,
        totalPaid: 0,
        totalRemaining: 0,
      },
      totalCount: 0,
      totalPages: 0,
    });

    await renderPage();

    expect(container.querySelector('[data-testid="overdue-cards"]')).toBeFalsy();
    expect(container.textContent).toContain(
      "لا يوجد طلاب متأخرون مطابقون للفلترة الحالية 🎉",
    );
  });
});
