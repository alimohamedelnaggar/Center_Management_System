// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";

/**
 * The one-time credentials dialog must expose temporary passwords exactly once
 * and then forget them: nothing in storage, nothing in the console, and nothing
 * left in the DOM after close.
 */

const printApi = vi.hoisted(() => ({ printStudentAccounts: vi.fn(() => true) }));

vi.mock("../../utils/credentialsPrint", () => printApi);
vi.mock("react-hot-toast", () => {
  const toast = vi.fn();
  toast.success = vi.fn();
  toast.error = vi.fn();
  return { default: toast };
});

import StudentAccountsModal from "./StudentAccountsModal";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const CREDENTIALS = [
  {
    studentId: "s1",
    studentName: "أحمد علي",
    username: "01012345678",
    temporaryPassword: "Temp-Pass-One-123",
  },
  {
    studentId: "s2",
    studentName: "منى حسن",
    username: "01212345678",
    temporaryPassword: "Temp-Pass-Two-456",
  },
];

const SKIPPED = [
  {
    studentId: "s3",
    studentName: "سارة محمد",
    reason: "رقم الهاتف مسجل بالفعل",
  },
];

let container;
let root;

const flush = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

const renderModal = async (props = {}) => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  const onClose = vi.fn();

  const render = async (next) => {
    await act(async () => {
      root.render(
        h(StudentAccountsModal, {
          open: true,
          onClose,
          credentials: CREDENTIALS,
          skipped: SKIPPED,
          centerName: "مركز الاختبار",
          ...props,
          ...next,
        }),
      );
    });
  };

  await render({});

  return { container, onClose, render };
};

const click = async (element) => {
  expect(element, "element to click").toBeTruthy();
  await act(async () => {
    element.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }),
    );
  });
  await flush();
};

beforeEach(() => {
  printApi.printStudentAccounts.mockClear();

  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});

afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  container = null;
  root = null;
});

describe("StudentAccountsModal", () => {
  it("shows every temporary password once in a labelled dialog", async () => {
    const page = await renderModal();

    const dialog = page.container.querySelector(
      '[data-testid="accounts-modal"]',
    );
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute("role")).toBe("dialog");
    expect(page.container.textContent).toContain(
      "تظهر كلمة المرور المؤقتة مرة واحدة فقط",
    );

    expect(
      page.container.querySelector('[data-testid="accounts-password-s1"]')
        .textContent,
    ).toBe("Temp-Pass-One-123");
    expect(
      page.container.querySelector('[data-testid="accounts-password-s2"]')
        .textContent,
    ).toBe("Temp-Pass-Two-456");
    expect(page.container.textContent).toContain("رقم الهاتف مسجل بالفعل");
  });

  it("copies and prints through the existing helpers without logging secrets", async () => {
    const page = await renderModal();

    const storageSpies = [
      vi.spyOn(Storage.prototype, "setItem"),
      vi.spyOn(Storage.prototype, "getItem"),
    ];
    const consoleSpies = [
      vi.spyOn(console, "log").mockImplementation(() => {}),
      vi.spyOn(console, "info").mockImplementation(() => {}),
      vi.spyOn(console, "debug").mockImplementation(() => {}),
    ];

    await click(
      page.container.querySelector('[data-testid="accounts-copy-s1"]'),
    );

    expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
    const copied = navigator.clipboard.writeText.mock.calls[0][0];
    expect(copied).toContain("01012345678");
    expect(copied).toContain("Temp-Pass-One-123");

    await click(page.container.querySelector('[data-testid="accounts-print"]'));
    expect(printApi.printStudentAccounts).toHaveBeenCalledWith({
      credentials: CREDENTIALS,
      skipped: SKIPPED,
      centerName: "مركز الاختبار",
    });

    for (const spy of [...storageSpies, ...consoleSpies]) {
      for (const call of spy.mock.calls) {
        expect(JSON.stringify(call)).not.toContain("Temp-Pass-One-123");
        expect(JSON.stringify(call)).not.toContain("Temp-Pass-Two-456");
      }
      spy.mockRestore();
    }
  });

  it("removes the passwords from the DOM after close", async () => {
    const page = await renderModal();

    expect(page.container.textContent).toContain("Temp-Pass-One-123");

    await click(page.container.querySelector('[data-testid="accounts-close"]'));
    expect(page.onClose).toHaveBeenCalledTimes(1);

    await page.render({ open: false });

    expect(page.container.textContent).not.toContain("Temp-Pass-One-123");
    expect(page.container.textContent).not.toContain("Temp-Pass-Two-456");
    expect(page.container.querySelector('[data-testid="accounts-modal"]')).toBeNull();
  });
});
