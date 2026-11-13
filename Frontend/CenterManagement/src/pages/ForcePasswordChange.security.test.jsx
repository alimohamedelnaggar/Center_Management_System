// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";

/**
 * Forced password change — confidentiality proof.
 *
 * The screen deliberately pre-fills the *temporary* password (the account's
 * phone number) into the current-password field so a first-time user can
 * change it without retyping. That value comes from the in-memory access token
 * (`PhoneNumber` claim) — it must never be persisted or logged, and it must not
 * survive in the DOM after a successful change.
 */

const PHONE = "01098765432";
const NEW_PASSWORD = "Brand-New-Pass-1";

const state = vi.hoisted(() => ({ auth: null }));

vi.mock("@/context/useAuth", () => ({ useAuth: () => state.auth }));

vi.mock("@/api/axios", () => ({
  default: { put: vi.fn() },
  setAccessToken: vi.fn(),
}));

vi.mock("react-hot-toast", () => {
  const toast = vi.fn();
  toast.success = vi.fn();
  toast.error = vi.fn();
  return { default: toast };
});

import apiClient from "@/api/axios";
import ForcePasswordChange from "./ForcePasswordChange";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const ROLE_CLAIM =
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";

function makeJwt(payload) {
  const encode = (value) =>
    btoa(JSON.stringify(value))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  return `${encode({ alg: "none", typ: "JWT" })}.${encode(payload)}.signature`;
}

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

const storageSnapshot = () => {
  const collect = (storage) =>
    Object.keys(storage).map((key) => [key, storage.getItem(key)]);
  return [...collect(window.localStorage), ...collect(window.sessionStorage)];
};

const containsSecret = (haystack) =>
  haystack.some((value) => String(value).includes(PHONE)) ||
  haystack.some((value) => String(value).includes(NEW_PASSWORD));

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();

  state.auth = {
    role: "Teacher",
    accessToken: makeJwt({ [ROLE_CLAIM]: "Teacher", PhoneNumber: PHONE }),
    setAccessToken: vi.fn(),
    setMustChangePassword: vi.fn(),
    logout: vi.fn().mockResolvedValue(undefined),
  };

  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  consoleCalls.length = 0;
  for (const method of ["log", "debug", "info", "warn", "error"]) {
    vi.spyOn(console, method).mockImplementation((...args) => {
      consoleCalls.push({ method, args });
    });
  }
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
  });
  container.remove();
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

const renderScreen = async () => {
  await act(async () => {
    root.render(
      h(
        MemoryRouter,
        { initialEntries: ["/change-password"] },
        h(
          Routes,
          null,
          h(Route, { path: "/change-password", element: h(ForcePasswordChange) }),
          h(Route, {
            path: "*",
            element: h("div", { "data-testid": "landed" }, "landed"),
          }),
        ),
      ),
    );
  });
  await flush();
};

const typeInto = async (element, value) => {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  ).set;

  await act(async () => {
    setter.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await flush();
};

describe("ForcePasswordChange password confidentiality", () => {
  it("prefills the temporary password from the token without persisting or logging it", async () => {
    await renderScreen();

    const current = container.querySelector("#force-current-password");
    expect(current).toBeTruthy();
    expect(current.value).toBe(PHONE);
    expect(current.type).toBe("password");
    expect(current.getAttribute("autocomplete")).toBe("current-password");

    // Nothing about the password may be written to either web storage.
    expect(storageSnapshot()).toEqual([]);

    // And nothing may reach the console.
    expect(
      consoleCalls.filter((call) =>
        call.args.some((arg) => String(arg).includes(PHONE)),
      ),
    ).toHaveLength(0);
  });

  it("drops the temporary and new password from the DOM after a successful change", async () => {
    apiClient.put.mockResolvedValue({
      data: {
        succeeded: true,
        data: {
          accessToken: makeJwt({ [ROLE_CLAIM]: "Teacher", PhoneNumber: PHONE }),
        },
      },
    });

    await renderScreen();

    expect(container.querySelector("#force-current-password").value).toBe(PHONE);

    await typeInto(
      container.querySelector("#force-new-password"),
      NEW_PASSWORD,
    );
    await typeInto(
      container.querySelector("#force-confirm-password"),
      NEW_PASSWORD,
    );

    await act(async () => {
      container
        .querySelector("form")
        .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    await flush();

    expect(apiClient.put).toHaveBeenCalledWith(
      "/Profile/ChangePassword",
      expect.objectContaining({
        currentPassword: PHONE,
        newPassword: NEW_PASSWORD,
      }),
    );

    // The screen is gone: neither the temp password nor the new one remains in
    // the DOM (inputs, attributes, or serialized markup).
    expect(container.querySelector('[data-testid="force-password-page"]')).toBeNull();
    expect(container.querySelector('[data-testid="landed"]')).toBeTruthy();
    expect(container.innerHTML).not.toContain(PHONE);
    expect(container.innerHTML).not.toContain(NEW_PASSWORD);

    // The successful response must not push either secret into storage.
    expect(storageSnapshot()).toEqual([]);

    expect(
      consoleCalls.filter(
        (call) =>
          call.args.some((arg) => String(arg).includes(PHONE)) ||
          call.args.some((arg) => String(arg).includes(NEW_PASSWORD)),
      ),
    ).toHaveLength(0);

    // The new token is kept in memory only, via the auth context setter.
    expect(state.auth.setAccessToken).toHaveBeenCalledTimes(1);
    expect(state.auth.setMustChangePassword).toHaveBeenCalledWith(false);
  });
});
