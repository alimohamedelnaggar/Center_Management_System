// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";

/**
 * Sign-in integration: render -> type/click -> visible result.
 *
 * The real component is mounted with the backend mocked at the auth boundary,
 * so the tests cover the actual field validation, password visibility toggle,
 * theme switch and the mapped server failure without depending on a network.
 */

const authState = vi.hoisted(() => ({
  login: vi.fn(),
  navigate: vi.fn(),
  theme: { isDark: false, toggle: vi.fn() },
}));

const toast = vi.hoisted(() => {
  const fn = vi.fn();
  fn.success = vi.fn();
  fn.error = vi.fn();
  return fn;
});

vi.mock("@/context/useAuth", () => ({
  useAuth: () => ({ login: authState.login }),
}));
vi.mock("@/context/useTheme", () => ({
  useTheme: () => authState.theme,
}));
vi.mock("react-router-dom", () => ({
  useNavigate: () => authState.navigate,
}));
vi.mock("react-hot-toast", () => ({ default: toast }));

import CenterLoginPage from "./Login";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

const flush = async (delay = 0) => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, delay));
  });
  for (let i = 0; i < 3; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
};

const mount = async () => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(<CenterLoginPage />);
  });
  await flush(100);
};

const unmount = async () => {
  if (root) {
    await act(async () => root.unmount());
    root = null;
  }
  if (container) {
    container.remove();
    container = null;
  }
};

const byTestId = (id) => container.querySelector(`[data-testid="${id}"]`);
const input = (selector) => container.querySelector(selector);

const type = async (element, value) => {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  ).set;
  await act(async () => {
    setter.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

const click = async (element) => {
  expect(element).toBeTruthy();
  await act(async () => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await flush(50);
};

const submit = async () => {
  const form = container.querySelector("form");
  await act(async () => {
    form.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
  });
  await flush(50);
};

const phoneError = () =>
  container.querySelector("#login-phone-error")?.textContent || "";
const passwordError = () =>
  container.querySelector("#login-password-error")?.textContent || "";

beforeEach(() => {
  vi.clearAllMocks();
  authState.login.mockReset();
  authState.navigate.mockReset();
  authState.theme = { isDark: false, toggle: vi.fn() };
});

afterEach(async () => {
  await unmount();
});

describe("login integration", () => {
  it("shows both required-field errors and never calls the API", async () => {
    await mount();

    expect(input("#login-phone")).toBeTruthy();
    expect(input("#login-password")).toBeTruthy();

    await submit();

    expect(phoneError()).toContain("رقم الهاتف مطلوب");
    expect(passwordError()).toContain("كلمة المرور مطلوبة");
    expect(authState.login).not.toHaveBeenCalled();
    expect(authState.navigate).not.toHaveBeenCalled();
  });

  it("rejects a malformed phone before submitting", async () => {
    await mount();

    await type(input("#login-phone"), "123");
    await type(input("#login-password"), "123456");
    await submit();

    expect(phoneError()).toContain("رقم هاتف مصري صحيح");
    expect(authState.login).not.toHaveBeenCalled();
  });

  it("toggles the password between masked and visible", async () => {
    await mount();

    const password = input("#login-password");
    const toggle = byTestId("login-password-toggle");

    expect(password.type).toBe("password");

    await click(toggle);
    expect(input("#login-password").type).toBe("text");

    await click(toggle);
    expect(input("#login-password").type).toBe("password");
  });

  it("switches the theme from the sign-in screen", async () => {
    await mount();

    await click(byTestId("login-theme-toggle"));

    expect(authState.theme.toggle).toHaveBeenCalledTimes(1);
  });

  it("surfaces the mapped backend failure and does not navigate", async () => {
    authState.login.mockRejectedValue(
      Object.assign(new Error("bad credentials"), {
        status: 401,
        body: { message: "رقم الهاتف أو كلمة المرور غير صحيحة" },
      }),
    );

    await mount();
    await type(input("#login-phone"), "01012345678");
    await type(input("#login-password"), "123456");
    await submit();

    const alert = container.querySelector('[role="alert"]');
    expect(alert).toBeTruthy();
    expect(alert.textContent).toContain("تعذّر تسجيل الدخول");
    expect(alert.textContent).toContain("رقم الهاتف أو كلمة المرور غير صحيحة");
    expect(authState.login).toHaveBeenCalledWith("01012345678", "123456");
    expect(authState.navigate).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("navigates to the centre dashboard after a successful owner login", async () => {
    authState.login.mockResolvedValue({
      "http://schemas.microsoft.com/ws/2008/06/identity/claims/role":
        "CenterOwner",
    });

    await mount();
    await type(input("#login-phone"), "01012345678");
    await type(input("#login-password"), "123456");
    await submit();

    expect(authState.login).toHaveBeenCalledWith("01012345678", "123456");
    expect(authState.navigate).toHaveBeenCalledTimes(1);
    expect(authState.navigate.mock.calls[0][0]).toBe("/center/dashboard");
    expect(toast.success).toHaveBeenCalled();
  });
});
