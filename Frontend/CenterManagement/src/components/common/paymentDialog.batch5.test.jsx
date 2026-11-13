// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";

/**
 * Batch 5 proof for the payment dialog:
 *   - the amount is the emphasised field and the primary action lives in the
 *     sticky footer (never inside the scrolling body) so it stays reachable on
 *     a phone keyboard;
 *   - a prefilled monthly payment (from the overdue screen) loads the real
 *     remaining amount and posts the same payload shape the API already had;
 *   - editing a payment only changes the amount.
 */

const financeServiceMock = vi.hoisted(() => ({
  addPayment: vi.fn(),
  updatePayment: vi.fn(),
  getStudentPaymentInfo: vi.fn(),
}));

const examServiceMock = vi.hoisted(() => ({
  getGroups: vi.fn(),
  getSessionsByGroup: vi.fn(),
}));

const attendanceServiceMock = vi.hoisted(() => ({
  getStudentsForAttendance: vi.fn(),
}));

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("../../services/financeService", () => ({
  financeService: financeServiceMock,
}));

vi.mock("../../services/examService", () => ({
  examService: examServiceMock,
}));

vi.mock("../../services/attendanceService", () => ({
  attendanceService: attendanceServiceMock,
}));

vi.mock("react-hot-toast", () => ({
  __esModule: true,
  default: toastMock,
  toast: toastMock,
}));

import AddPaymentModal from "./AddPaymentModal";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const PAYMENT_INFO = {
  subscriptionType: 2,
  remainingAmount: 500,
  sessionsPerMonth: 8,
  attendedSessions: 4,
  receivedByName: "سارة",
};

let container;
let root;
let onClose;
let onSuccess;

const flush = async () => {
  for (let i = 0; i < 6; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
};

const wait = async (ms) => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
  await flush();
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

const submitForm = async () => {
  const form = container.querySelector("#payment-form");
  expect(form).toBeTruthy();

  await act(async () => {
    form.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
  });
  await flush();
};

const setInputValue = async (element, value) => {
  expect(element).toBeTruthy();

  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  ).set;

  await act(async () => {
    setter.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await flush();
};

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  onClose = vi.fn();
  onSuccess = vi.fn().mockResolvedValue(undefined);

  examServiceMock.getGroups.mockResolvedValue({
    data: [{ id: "g1", name: "مجموعة أ" }],
  });
  examServiceMock.getSessionsByGroup.mockResolvedValue({ data: [] });
  attendanceServiceMock.getStudentsForAttendance.mockResolvedValue({
    data: [{ studentId: "s1", studentName: "أحمد محمد" }],
  });
  financeServiceMock.getStudentPaymentInfo.mockResolvedValue({
    succeeded: true,
    data: PAYMENT_INFO,
  });
  financeServiceMock.addPayment.mockResolvedValue({
    succeeded: true,
    data: "pay-99",
  });
  financeServiceMock.updatePayment.mockResolvedValue({ succeeded: true });
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
  });
  container.remove();
});

describe("payment dialog batch 5", () => {
  it("keeps the primary action in the sticky footer, outside the scrolling body", async () => {
    await render(
      h(AddPaymentModal, {
        isOpen: true,
        onClose,
        onSuccess,
        prefill: { studentId: "s1", groupId: "g1", billingPeriod: "2026-11" },
      }),
    );

    const modal = container.querySelector('[data-testid="payment-modal"]');
    const body = container.querySelector('[data-testid="payment-modal-body"]');
    const footer = container.querySelector(
      '[data-testid="payment-modal-footer"]',
    );

    expect(modal).toBeTruthy();
    expect(body).toBeTruthy();
    expect(footer).toBeTruthy();

    const submit = container.querySelector('[data-testid="payment-submit"]');
    expect(submit).toBeTruthy();
    expect(footer.contains(submit)).toBe(true);
    expect(body.contains(submit)).toBe(false);
    expect(submit.getAttribute("type")).toBe("submit");
    expect(submit.getAttribute("form")).toBe("payment-form");

    const amount = container.querySelector('[data-testid="payment-amount"]');
    expect(amount).toBeTruthy();
    expect(amount.className).toContain("text-lg");
    expect(body.contains(amount)).toBe(true);

    const group = container.querySelector("#payment-group");
    expect(group.className).toContain("min-h-11");
  });

  it("loads the prefilled monthly remaining amount and keeps the payload shape", async () => {
    await render(
      h(AddPaymentModal, {
        isOpen: true,
        onClose,
        onSuccess,
        prefill: { studentId: "s1", groupId: "g1", billingPeriod: "2026-11" },
      }),
    );

    // The dialog debounces the payment-info lookup by 350ms.
    await wait(400);

    const amount = container.querySelector('[data-testid="payment-amount"]');
    expect(amount.value).toBe("500");

    expect(container.textContent).toContain("استلمها");
    expect(container.textContent).toContain("سارة");

    const billingPeriod = container.querySelector("#payment-billing-period");
    expect(billingPeriod.value).toBe("2026-11");

    const submit = container.querySelector('[data-testid="payment-submit"]');
    expect(submit.disabled).toBe(false);

    await click(submit);

    expect(financeServiceMock.addPayment).toHaveBeenCalledTimes(1);
    expect(financeServiceMock.addPayment).toHaveBeenCalledWith({
      studentId: "s1",
      groupId: "g1",
      amount: 500,
      notes: null,
      sessionId: null,
      billingPeriod: "2026-11-01",
      sessionsCount: null,
    });
    expect(onSuccess).toHaveBeenCalledWith("pay-99");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("edits only the amount of an existing payment", async () => {
    await render(
      h(AddPaymentModal, {
        isOpen: true,
        onClose,
        onSuccess,
        paymentToEdit: {
          paymentId: "p1",
          studentId: "s1",
          groupId: "g1",
          subscriptionType: 2,
          billingPeriod: "2026-11-01",
          amount: 300,
          paymentDate: "2026-10-05T10:00:00",
        },
      }),
    );

    const amount = container.querySelector('[data-testid="payment-amount"]');
    expect(amount.value).toBe("300");

    const billingPeriod = container.querySelector("#payment-billing-period");
    expect(billingPeriod.value).toBe("2026-11");

    await setInputValue(amount, "350");

    const submit = container.querySelector('[data-testid="payment-submit"]');
    expect(submit.textContent).toContain("حفظ التعديل");

    await click(submit);

    expect(financeServiceMock.updatePayment).toHaveBeenCalledWith({
      id: "p1",
      studentId: "s1",
      groupId: "g1",
      sessionId: null,
      billingPeriod: "2026-11-01",
      amount: 350,
      notes: null,
    });
    expect(onSuccess).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
