// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";

/**
 * Phase 2 of the optional staff-email feature: the public recovery pages, the
 * login entry point, and the self-service email change on the profile page.
 * Everything here talks to the API through the exact contract the backend
 * exposes, so a renamed field or a leaked account-existence hint fails the test.
 */

const state = vi.hoisted(() => ({
  auth: {
    role: "Teacher",
    accessToken: "test-token",
    loading: false,
    refreshModules: async () => {},
    login: vi.fn(),
    logout: vi.fn(),
  },
}));

vi.mock("@/context/useAuth", () => ({ useAuth: () => state.auth }));
vi.mock("@/context/useTheme", () => ({
  useTheme: () => ({ isDark: false, toggle: vi.fn() }),
}));

vi.mock("react-hot-toast", () => {
  const toast = vi.fn();
  toast.success = vi.fn();
  toast.error = vi.fn();
  return { default: toast };
});

import ForgotPasswordPage, {
  UNIFORM_RECOVERY_MESSAGE,
} from "./ForgotPasswordPage";
import EmailConfirmedPage from "./EmailConfirmedPage";
import Profile from "./Profile";
import LoginPage from "../components/Auth/LoginComponent/Login";
import { STAFF_EMAIL_HELPER_TEXT } from "../utils/staffEmail";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

const flush = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

const render = async (element) => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  await act(async () => {
    root.render(element);
  });
  await flush();

  return container;
};

const fieldByLabel = (scope, text) => {
  const label = Array.from(scope.querySelectorAll("label")).find((node) =>
    node.textContent.includes(text),
  );
  return label?.parentElement?.querySelector("input, select, textarea") ?? null;
};

const setValue = async (field, value) => {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  ).set;

  await act(async () => {
    setter.call(field, value);
    field.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

const submitFieldForm = async (field) => {
  const form = field.closest("form");
  expect(form).toBeTruthy();

  await act(async () => {
    form.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
  });
  await flush();
};

const writeJson = (body) => ({ json: async () => body });

beforeEach(() => {
  vi.clearAllMocks();
  state.auth = {
    role: "Teacher",
    accessToken: "test-token",
    loading: false,
    refreshModules: async () => {},
    login: vi.fn(),
    logout: vi.fn(),
  };
});

afterEach(async () => {
  if (root) {
    await act(async () => root.unmount());
    root = null;
  }
  if (container) {
    container.remove();
    container = null;
  }
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ForgotPasswordPage", () => {
  const renderPage = () =>
    render(
      h(
        MemoryRouter,
        { initialEntries: ["/forgot-password"] },
        h(
          Routes,
          null,
          h(Route, {
            path: "/forgot-password",
            element: h(ForgotPasswordPage),
          }),
          h(Route, {
            path: "/login",
            element: h("div", null, "LOGIN_PAGE"),
          }),
        ),
      ),
    );

  it("sends the identifier, shows the uniform message, then exchanges the code for a new password", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        ...writeJson({ data: UNIFORM_RECOVERY_MESSAGE }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        ...writeJson({ message: "تم تغيير كلمة المرور بنجاح." }),
      });

    vi.stubGlobal("fetch", fetchMock);

    const scope = await renderPage();

    await setValue(
      fieldByLabel(scope, "البريد الإلكتروني أو رقم الهاتف"),
      "  staff@example.com  ",
    );
    await submitFieldForm(
      fieldByLabel(scope, "البريد الإلكتروني أو رقم الهاتف"),
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      "/Authentication/Send-Reset-Code",
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      identifier: "staff@example.com",
    });
    expect(scope.textContent).toContain(UNIFORM_RECOVERY_MESSAGE);

    await setValue(fieldByLabel(scope, "كود التحقق"), "123456");
    await setValue(fieldByLabel(scope, "كلمة المرور الجديدة"), "NewPass123!");
    await setValue(fieldByLabel(scope, "تأكيد كلمة المرور"), "NewPass123!");
    await submitFieldForm(fieldByLabel(scope, "كود التحقق"));

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1][0])).toContain(
      "/Authentication/Reset-Password",
    );
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
      identifier: "staff@example.com",
      code: "123456",
      password: "NewPass123!",
      confirmPassword: "NewPass123!",
    });
    expect(scope.textContent).toContain("تم تغيير كلمة المرور بنجاح.");
  });

  it("shows the API's generic failure for a wrong or expired code", async () => {
    const generic = "الرمز غير صحيح أو منتهي الصلاحية.";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        ...writeJson({ data: UNIFORM_RECOVERY_MESSAGE }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        ...writeJson({ message: generic }),
      });

    vi.stubGlobal("fetch", fetchMock);

    const scope = await renderPage();

    await setValue(
      fieldByLabel(scope, "البريد الإلكتروني أو رقم الهاتف"),
      "staff@example.com",
    );
    await submitFieldForm(
      fieldByLabel(scope, "البريد الإلكتروني أو رقم الهاتف"),
    );

    await setValue(fieldByLabel(scope, "كود التحقق"), "000000");
    await setValue(fieldByLabel(scope, "كلمة المرور الجديدة"), "NewPass123!");
    await setValue(fieldByLabel(scope, "تأكيد كلمة المرور"), "NewPass123!");
    await submitFieldForm(fieldByLabel(scope, "كود التحقق"));

    const alert = scope.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain(generic);
  });

  it("does not send a malformed code and explains the attempt limit", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 429,
      ...writeJson({ message: "Too many requests" }),
    });

    vi.stubGlobal("fetch", fetchMock);

    const scope = await renderPage();

    await setValue(
      fieldByLabel(scope, "البريد الإلكتروني أو رقم الهاتف"),
      "01012345678",
    );
    await submitFieldForm(
      fieldByLabel(scope, "البريد الإلكتروني أو رقم الهاتف"),
    );

    const alert = scope.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain("تم تجاوز عدد المحاولات المسموح");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects a short password before calling the API", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      ...writeJson({ data: UNIFORM_RECOVERY_MESSAGE }),
    });

    vi.stubGlobal("fetch", fetchMock);

    const scope = await renderPage();

    await setValue(
      fieldByLabel(scope, "البريد الإلكتروني أو رقم الهاتف"),
      "staff@example.com",
    );
    await submitFieldForm(
      fieldByLabel(scope, "البريد الإلكتروني أو رقم الهاتف"),
    );

    await setValue(fieldByLabel(scope, "كود التحقق"), "123456");
    await setValue(fieldByLabel(scope, "كلمة المرور الجديدة"), "short");
    await setValue(fieldByLabel(scope, "تأكيد كلمة المرور"), "short");
    await submitFieldForm(fieldByLabel(scope, "كود التحقق"));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(scope.textContent).toContain(
      "كلمة المرور يجب أن تكون 8 أحرف على الأقل.",
    );
  });
});

describe("EmailConfirmedPage", () => {
  const renderAt = (path) =>
    render(
      h(
        MemoryRouter,
        { initialEntries: [path] },
        h(
          Routes,
          null,
          h(Route, {
            path: "/email-confirmed",
            element: h(EmailConfirmedPage),
          }),
        ),
      ),
    );

  it("shows the success state for a confirmed link", async () => {
    const scope = await renderAt("/email-confirmed?status=success");

    expect(scope.textContent).toContain("تم تأكيد البريد الإلكتروني");
    expect(scope.textContent).not.toContain("رابط التأكيد غير صالح");
  });

  it("shows the invalid state for a rejected link", async () => {
    const scope = await renderAt("/email-confirmed?status=invalid");

    expect(scope.textContent).toContain("رابط التأكيد غير صالح");
    expect(scope.textContent).not.toContain("تم تأكيد البريد الإلكتروني");
  });

  it("treats a missing status as invalid", async () => {
    const scope = await renderAt("/email-confirmed");

    expect(scope.textContent).toContain("رابط التأكيد غير صالح");
  });
});

describe("Login recovery entry point", () => {
  it("navigates to the real forgot-password page instead of showing a toast", async () => {
    const scope = await render(
      h(
        MemoryRouter,
        { initialEntries: ["/login"] },
        h(
          Routes,
          null,
          h(Route, { path: "/login", element: h(LoginPage) }),
          h(Route, {
            path: "/forgot-password",
            element: h("div", null, "FORGOT_PASSWORD_PAGE"),
          }),
        ),
      ),
    );

    const button = Array.from(scope.querySelectorAll("button")).find((node) =>
      node.textContent.includes("نسيت كلمة المرور؟"),
    );
    expect(button).toBeTruthy();

    await act(async () => {
      button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    expect(scope.textContent).toContain("FORGOT_PASSWORD_PAGE");
  });
});

describe("Profile self-service email change", () => {
  const baseProfile = {
    fullName: "Account Holder",
    email: null,
    pendingEmail: null,
    phoneNumber: "01012345678",
    userName: "01012345678",
    address: null,
    createdAt: "2026-01-01T00:00:00Z",
    subject: null,
  };

  const renderProfile = () =>
    render(
      h(
        MemoryRouter,
        null,
        h(Routes, null, h(Route, { path: "*", element: h(Profile) })),
      ),
    );

  it("warns an account without an email and stages a normalized new address", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        ...writeJson({ data: baseProfile }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        ...writeJson({
          message:
            "أرسلنا رابط تأكيد إلى بريدك الجديد. سيبقى بريدك الحالي فعالاً حتى تأكيد البريد الجديد.",
        }),
      });

    vi.stubGlobal("fetch", fetchMock);

    const scope = await renderProfile();

    expect(scope.textContent).toContain(
      "أضف بريدك لتتمكن من استعادة كلمة المرور.",
    );
    expect(scope.textContent).toContain(STAFF_EMAIL_HELPER_TEXT);

    const field = fieldByLabel(scope, "البريد الإلكتروني الجديد");
    await setValue(field, "  New.Person@Example.COM  ");
    await submitFieldForm(field);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1][0])).toContain(
      "/Profile/RequestEmailChange",
    );
    expect(fetchMock.mock.calls[1][1].method).toBe("PUT");
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
      email: "new.person@example.com",
    });

    expect(scope.textContent).toContain("بانتظار التأكيد");
    expect(scope.textContent).toContain("new.person@example.com");
  });

  it("rejects a malformed address before calling the API", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      ...writeJson({ data: baseProfile }),
    });

    vi.stubGlobal("fetch", fetchMock);

    const scope = await renderProfile();

    const field = fieldByLabel(scope, "البريد الإلكتروني الجديد");
    await setValue(field, "not-an-email");
    await submitFieldForm(field);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(scope.textContent).toContain("البريد الإلكتروني غير صحيح.");
  });

  it("shows the duplicate-address error returned by the API", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        ...writeJson({ data: baseProfile }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        ...writeJson({ message: "هذا البريد الإلكتروني مستخدم بالفعل." }),
      });

    vi.stubGlobal("fetch", fetchMock);

    const scope = await renderProfile();

    const field = fieldByLabel(scope, "البريد الإلكتروني الجديد");
    await setValue(field, "taken@example.com");
    await submitFieldForm(field);

    expect(scope.textContent).toContain("هذا البريد الإلكتروني مستخدم بالفعل.");
    expect(scope.textContent).not.toContain("بانتظار التأكيد");
  });
});
