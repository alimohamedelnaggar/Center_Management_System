// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";

/**
 * The QR cards screen, wired with the real page and service hooks plus a
 * mocked HTTP layer whose payload mirrors `Response<PaginatedResult<Student>>`.
 *
 * The point of this file is the screen/print contract:
 *  - every actionable control lives inside a `qr-no-print` region,
 *  - printing a single card stages exactly one `qr-card-target`,
 *  - the printable `StudentCard` is never replaced by a redesign-only card.
 */

const authState = vi.hoisted(() => ({
  auth: { hasModule: () => true, role: "Teacher" },
}));

const studentsApi = vi.hoisted(() => ({
  getAllPaged: vi.fn(),
  generateMissingQrCodes: vi.fn(),
}));

const groupsApi = vi.hoisted(() => ({ getAllGroups: vi.fn() }));
const emailApi = vi.hoisted(() => ({ sendEmail: vi.fn() }));
const qrApi = vi.hoisted(() => ({
  buildStudentCardUrl: vi.fn((code) => `https://cards.test/${code}`),
  toQrDataUrl: vi.fn(async () => "data:image/png;base64,AAAA"),
  copyText: vi.fn(async () => true),
  isStudentCode: vi.fn((code) => Boolean(code)),
}));

vi.mock("@/context/useAuth", () => ({ useAuth: () => authState.auth }));
vi.mock("../../services/studentService", () => ({
  studentsService: studentsApi,
}));
vi.mock("../../services/groupsService", () => ({ groupsService: groupsApi }));
vi.mock("../../services/emailService", () => ({ emailService: emailApi }));
vi.mock("../../utils/qrCode", () => qrApi);
vi.mock("react-hot-toast", () => {
  const toast = vi.fn();
  toast.success = vi.fn();
  toast.error = vi.fn();
  return { default: toast };
});

import StudentQrCardsPage from "./StudentQrCardsPage";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const STUDENTS = [
  {
    id: "s1",
    fullName: "أحمد علي",
    phone: "01012345678",
    phoneParent: "01112345678",
    groupName: "مجموعة أ",
    subscriptionType: 2,
    isPaid: true,
    qrCode: "QA-001",
  },
  {
    id: "s2",
    fullName: "منى حسن",
    phone: "01212345678",
    phoneParent: "01512345678",
    groupName: "مجموعة ب",
    subscriptionType: 1,
    isPaid: false,
    qrCode: "",
  },
];

const pageOf = (items) => ({
  succeeded: true,
  message: null,
  data: {
    items,
    totalCount: items.length,
    pageIndex: 1,
    pageSize: 12,
    totalPages: 1,
  },
});

let container;
let root;

const flush = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

const waitFor = async (assertion, timeout = 3000) => {
  const start = Date.now();
  let lastError;

  while (Date.now() - start < timeout) {
    try {
      await flush();
      return assertion();
    } catch (error) {
      lastError = error;
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
      });
    }
  }

  throw lastError;
};

const renderPage = async () => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  await act(async () => {
    root.render(h(StudentQrCardsPage));
  });

  return container;
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

const setInputValue = async (element, value) => {
  Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  ).set.call(element, value);
  await act(async () => {
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

beforeEach(() => {
  studentsApi.getAllPaged.mockReset();
  studentsApi.generateMissingQrCodes.mockReset();
  groupsApi.getAllGroups.mockReset();
  emailApi.sendEmail.mockReset();
  qrApi.buildStudentCardUrl.mockClear();
  qrApi.toQrDataUrl.mockClear();
  qrApi.copyText.mockClear();

  studentsApi.getAllPaged.mockResolvedValue(pageOf(STUDENTS));
  groupsApi.getAllGroups.mockResolvedValue({
    data: [{ id: "g1", name: "مجموعة أ" }],
  });
  emailApi.sendEmail.mockResolvedValue({ succeeded: true, message: null });

  window.print = vi.fn();
});

afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  container = null;
  root = null;
});

describe("StudentQrCardsPage", () => {
  it("renders the real page payload as printable cards", async () => {
    const page = await renderPage();

    await waitFor(() => {
      expect(page.querySelector('[data-testid="qr-card-s1"]')).toBeTruthy();
      expect(page.querySelectorAll('[data-testid^="qr-card-"]')).toHaveLength(2);
    });

    expect(page.querySelector('[data-testid="qr-page"]')).toBeTruthy();
    expect(page.textContent).toContain("أحمد علي");
    expect(page.textContent).toContain("منى حسن");
    expect(page.textContent).toContain("1 طالب بدون كود");
    expect(page.textContent).toContain("عرض");
    expect(page.textContent).toContain("من 2 الطلاب");
    expect(studentsApi.getAllPaged).toHaveBeenCalledWith({
      pageIndex: 1,
      pageSize: 12,
      search: null,
      groupId: null,
    });
  });

  it("keeps every control out of print and stages a single card target", async () => {
    const page = await renderPage();

    await waitFor(() => {
      expect(page.querySelector('[data-testid="qr-card-s1"]')).toBeTruthy();
    });

    const style = page.querySelector("style");
    expect(style.textContent).toContain("@media print");
    expect(style.textContent).toContain(".qr-no-print");
    expect(style.textContent).toContain(".qr-card-target");

    expect(
      page.querySelector('[data-testid="qr-print-all"]').closest(".qr-no-print"),
    ).toBeTruthy();
    expect(
      page.querySelector('[data-testid="qr-pagination"]').closest(".qr-no-print"),
    ).toBeTruthy();

    await act(async () => {
      page.querySelector('[data-testid="qr-print-one-s1"]').click();
      await new Promise((resolve) => setTimeout(resolve, 80));
    });

    expect(window.print).toHaveBeenCalledTimes(1);
    expect(
      page.querySelector('[data-testid="qr-card-s1"]').className,
    ).toContain("qr-card-target");
    expect(
      page.querySelector('[data-testid="qr-card-s2"]').className,
    ).not.toContain("qr-card-target");
  });

  it("sends the current cards through the same email contract", async () => {
    const page = await renderPage();

    await waitFor(() => {
      expect(page.querySelector('[data-testid="qr-card-s1"]')).toBeTruthy();
    });

    await click(page.querySelector('[data-testid="qr-email-open"]'));
    expect(
      page.querySelector('[data-testid="qr-email-modal"]'),
    ).toBeTruthy();

    const input = page.querySelector('[data-testid="qr-email-input"]');
    await setInputValue(input, "parent@example.com");

    await act(async () => {
      page
        .querySelector("#qr-email-form")
        .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    await flush();

    expect(emailApi.sendEmail).toHaveBeenCalledTimes(1);
    const payload = emailApi.sendEmail.mock.calls[0][0];
    expect(payload.email).toBe("parent@example.com");
    expect(payload.subject).toBe("كروت حضور الطلاب");
    expect(payload.message).toContain("أحمد علي");
    expect(qrApi.toQrDataUrl).toHaveBeenCalled();
    await waitFor(() => {
      expect(page.querySelector('[data-testid="qr-email-modal"]')).toBeNull();
    });
  });
});
