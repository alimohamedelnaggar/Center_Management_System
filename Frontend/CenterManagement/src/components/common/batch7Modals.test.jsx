// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";

/**
 * Batch 7 proof for the staff / account dialogs and forms:
 *   - the shared admin shell caps the panel, scrolls the body, and keeps the
 *     footer (and the primary action) outside the scrolling area;
 *   - every close button is a 44px target with an accessible name;
 *   - password fields stay masked, never default to `type="text"`, and are
 *     never written to the console.
 */

const state = vi.hoisted(() => ({
  auth: {
    role: "CenterOwner",
    isSoloCenter: false,
    centerTypeLoaded: true,
    accessToken: "test-token",
    loading: false,
    refreshModules: async () => {},
  },
}));

vi.mock("@/context/useAuth", () => ({ useAuth: () => state.auth }));

vi.mock("../../services/groupsService", () => ({
  groupsService: { getAllGroups: vi.fn().mockResolvedValue({ data: [] }) },
}));

vi.mock("../../services/teacherService", () => ({
  teacherService: { getPaginated: vi.fn().mockResolvedValue({ data: { items: [] } }) },
}));

vi.mock("../../services/subscriptionService", () => ({
  subscriptionService: { renew: vi.fn().mockResolvedValue({ succeeded: true }) },
}));

vi.mock("react-hot-toast", () => {
  const toast = vi.fn();
  toast.success = vi.fn();
  toast.error = vi.fn();
  return { default: toast };
});

import toast from "react-hot-toast";
import AddTeacherModal from "./AddTeacherModal";
import TeacherModal from "./TeacherModal";
import AssistantModal from "./AssistantModal";
import CenterEditModal from "./CenterEditModal";
import Profile from "../../pages/Profile";
import ForcePasswordChange from "../../pages/ForcePasswordChange";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;
const consoleCalls = [];

const flush = async () => {
  for (let i = 0; i < 6; i += 1) {
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

const typeInto = async (element, value) => {
  const proto =
    element.tagName === "TEXTAREA"
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value").set;

  await act(async () => {
    setter.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await flush();
};

const dialog = () => container.querySelector('[role="dialog"]');
const closeButton = () =>
  container.querySelector('button[aria-label="إغلاق"]');

const expectShell = (testId) => {
  const panel = dialog();
  expect(panel).toBeTruthy();
  expect(panel.className).toContain("max-h-[100dvh]");
  expect(panel.className).toContain("sm:max-h-[calc(100dvh-2rem)]");

  const close = closeButton();
  expect(close).toBeTruthy();
  expect(close.className).toContain("h-11");
  expect(close.className).toContain("w-11");

  const body = container.querySelector(`[data-testid="${testId}-body"]`);
  const footer = container.querySelector(`[data-testid="${testId}-footer"]`);
  expect(body).toBeTruthy();
  expect(body.className).toContain("overflow-y-auto");
  expect(footer).toBeTruthy();
  expect(footer.className).toContain("shrink-0");
  // The footer must not live inside the scrolling body, otherwise the primary
  // action scrolls away on a short phone screen.
  expect(body.contains(footer)).toBe(false);
  expect(panel.contains(footer)).toBe(true);

  const footerButtons = [...footer.querySelectorAll("button")];
  expect(footerButtons.length).toBeGreaterThan(0);
  footerButtons.forEach((button) => {
    expect(button.className).toContain("min-h-11");
  });

  return { panel, body, footer, close };
};

const passwordFields = () =>
  [...container.querySelectorAll('input[type="password"]')];

const mockProfileFetch = () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          fullName: "Account Holder",
          email: "account@example.com",
          phoneNumber: "01012345678",
          userName: "01012345678",
          address: null,
          createdAt: "2026-01-01T00:00:00Z",
          subject: "Math",
        },
      }),
    }),
  );
};

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  consoleCalls.length = 0;
  for (const method of ["log", "debug", "info", "warn", "error"]) {
    const original = console[method];
    vi.spyOn(console, method).mockImplementation((...args) => {
      consoleCalls.push({ method, args });
      // Keep real output for genuine failures while collecting the arguments.
      if (method === "error" || method === "warn") original.call(console, ...args);
    });
  }

  toast.error.mockClear();
  toast.success.mockClear();
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
  });
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("batch 7 admin dialogs", () => {
  it("TeacherModal keeps its footer fixed and masks both password fields", async () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();

    await render(
      h(TeacherModal, { isOpen: true, onClose, onSubmit, initialData: null }),
    );

    const { footer } = expectShell("teacher-modal");

    const passwords = passwordFields();
    expect(passwords).toHaveLength(2);
    passwords.forEach((input) => {
      expect(input.getAttribute("autocomplete")).toBe("new-password");
    });

    const textInputs = [
      ...container.querySelectorAll('input[type="text"], input[type="email"]'),
    ];
    textInputs.forEach((input) => {
      expect(input.className).toContain("min-h-11");
    });

    const cancel = footer.querySelector("button");
    await click(cancel);
    expect(onClose).toHaveBeenCalledTimes(1);

    await typeInto(passwordFields()[0], "Secret123");
    expect(passwordFields()[0].value).toBe("Secret123");
    expect(consoleCalls.some((c) => JSON.stringify(c.args).includes("Secret123"))).toBe(
      false,
    );
  });

  it("AssistantModal is masked and never texts the password", async () => {
    const onClose = vi.fn();

    await render(
      h(AssistantModal, { isOpen: true, onClose, onSubmit: vi.fn() }),
    );

    expectShell("assistant-modal");

    const passwords = passwordFields();
    expect(passwords).toHaveLength(2);
    expect(container.querySelectorAll('input[type="text"]').length).toBeGreaterThan(0);

    const plain = [...container.querySelectorAll('input[type="text"]')].find(
      (input) => input.value === "",
    );
    expect(plain).toBeTruthy();
  });

  it("CenterEditModal keeps the save action outside the scrolling body", async () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();

    await render(
      h(CenterEditModal, {
        isOpen: true,
        center: {
          id: "c1",
          name: "مركز النور",
          phone: "01012345678",
          ownerEmail: "owner@example.com",
          type: "MultiTeacher",
        },
        onClose,
        onSubmit,
      }),
    );

    expectShell("center-edit-modal");
    expect(container.textContent).toContain("مركز النور");
  });

  it("AddTeacherModal masks the owner password and keeps the long form usable", async () => {
    const onClose = vi.fn();

    await render(
      h(AddTeacherModal, { isOpen: true, onClose, onSubmit: vi.fn() }),
    );

    expectShell("add-teacher-modal");

    const ownerPassword = [...container.querySelectorAll("input")].find(
      (input) => input.placeholder === "اتركها فارغة لتوليد كلمة مؤقتة",
    );

    expect(ownerPassword).toBeTruthy();
    expect(ownerPassword.type).toBe("password");
    expect(ownerPassword.getAttribute("autocomplete")).toBe("new-password");

    // No unmasked input may carry that hint.
    expect(
      container.querySelector(
        'input[type="text"][placeholder="اتركها فارغة لتوليد كلمة مؤقتة"]',
      ),
    ).toBeNull();
  });

  it("Profile masks all three password fields and toggles one at a time", async () => {
    state.auth = { ...state.auth, role: "Teacher" };
    mockProfileFetch();

    await render(h(Profile));

    expect(container.querySelector('[data-testid="profile-page"]')).toBeTruthy();

    const passwords = passwordFields();
    expect(passwords).toHaveLength(3);

    const toggles = [
      ...container.querySelectorAll('button[aria-label="إظهار كلمة المرور"]'),
    ];
    expect(toggles).toHaveLength(3);
    toggles.forEach((button) => {
      expect(button.className).toContain("h-11");
      expect(button.className).toContain("w-11");
    });

    await click(toggles[0]);
    expect(passwords[0].type).toBe("text");
    expect(passwords[1].type).toBe("password");

    const hide = container.querySelector('button[aria-label="إخفاء كلمة المرور"]');
    await click(hide);
    expect(passwords[0].type).toBe("password");
  });

  it("typing a password never reaches the console", async () => {
    state.auth = { ...state.auth, role: "Teacher" };
    mockProfileFetch();

    await render(h(Profile));

    const secret = "Sup3r-Secret-Pass";
    const passwords = passwordFields();

    await typeInto(passwords[0], secret);
    await typeInto(passwords[1], secret);
    await typeInto(passwords[2], secret);

    const leaked = consoleCalls.filter((call) =>
      call.args.some((arg) => String(arg).includes(secret)),
    );
    expect(leaked).toHaveLength(0);
  });

  it("ForcePasswordChange masks the temporary, new, and confirm fields", async () => {
    await render(
      h(
        MemoryRouter,
        { initialEntries: ["/change-password"] },
        h(ForcePasswordChange),
      ),
    );

    expect(
      container.querySelector('[data-testid="force-password-page"]'),
    ).toBeTruthy();

    const passwords = passwordFields();
    expect(passwords).toHaveLength(3);

    const labels = [...container.querySelectorAll("label")].map((label) =>
      label.getAttribute("for"),
    );
    expect(labels).toEqual(
      expect.arrayContaining([
        "force-current-password",
        "force-new-password",
        "force-confirm-password",
      ]),
    );

    passwords.forEach((input) => {
      expect(input.id).toBeTruthy();
      expect(container.querySelector(`label[for="${input.id}"]`)).toBeTruthy();
    });

    expect(container.textContent).toContain("8 أحرف على الأقل");
  });
});
