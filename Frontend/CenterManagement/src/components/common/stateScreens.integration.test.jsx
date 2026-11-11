// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";

/**
 * Integration coverage for the shared locked / error / blocked screens:
 * each one is rendered in a real router, the user acts on its control, and the
 * result (navigation, logout, reload, overlay removal) is asserted. Static
 * markup tests elsewhere already cover the Arabic copy.
 */

const state = vi.hoisted(() => ({
  auth: {},
  contact: "https://wa.me/201000000000",
}));

vi.mock("@/context/useAuth", () => ({ useAuth: () => state.auth }));
vi.mock("@/utils/whatsappContact", () => ({
  platformContactWhatsApp: () => state.contact,
  platformContactPhone: () => "201000000000",
}));

import ModuleLocked from "@/components/common/ModuleLocked";
import {
  ParentPortalUnavailable,
  default as ParentPortalGate,
} from "@/components/common/ParentPortalGate";
import {
  StudentPortalUnavailable,
  default as StudentPortalGate,
} from "@/components/common/StudentPortalGate";
import AccessBlockedOverlay from "@/components/AccessBlockedOverlay";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import NotFound from "@/pages/NotFound";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

function route(path, element) {
  return h(Route, { path, element });
}

async function render(element) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  await act(async () => {
    root.render(element);
  });

  return container;
}

async function click(selector) {
  const el = container.querySelector(selector);
  expect(el, `missing ${selector}`).not.toBeNull();

  await act(async () => {
    el.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }),
    );
  });

  return el;
}

beforeEach(() => {
  state.auth = { logout: vi.fn(), modulesLoaded: true, hasCenterModule: () => false };
});

afterEach(async () => {
  if (root) {
    await act(async () => root.unmount());
    root = null;
  }
  container?.remove();
  container = null;
  vi.restoreAllMocks();
});

describe("module locked screen", () => {
  it("names the module and links to platform support", async () => {
    state.auth = { ...state.auth, hasModule: () => false };

    await render(
      h(MemoryRouter, null, h(ModuleLocked, { moduleKey: "attendance" })),
    );

    expect(container.textContent).toContain("غير مشترك في هذه الوحدة");
    expect(container.textContent).toContain("الحضور والغياب");

    const contact = container.querySelector('[data-testid="module-locked-contact"]');
    expect(contact).not.toBeNull();
    expect(contact.getAttribute("href")).toBe(state.contact);
    expect(contact.getAttribute("target")).toBe("_blank");
  });

  it("falls back to a note when no support number is configured", async () => {
    state.contact = "";
    state.auth = { ...state.auth, hasModule: () => false };

    await render(
      h(MemoryRouter, null, h(ModuleLocked, { moduleKey: "attendance" })),
    );

    expect(container.textContent).toContain("رقم التواصل غير مُهيّأ");
    expect(
      container.querySelector('[data-testid="module-locked-contact"]'),
    ).toBeNull();

    state.contact = "https://wa.me/201000000000";
  });
});

describe("portal gates", () => {
  it("student gate blocks the outlet and logs out through the action", async () => {
    state.auth = {
      ...state.auth,
      hasCenterModule: () => false,
      logout: vi.fn(),
    };

    await render(
      h(
        MemoryRouter,
        { initialEntries: ["/student"] },
        h(
          Routes,
          null,
          h(
            Route,
            { path: "/student", element: h(StudentPortalGate) },
            h(Route, { index: true, element: h("div", null, "PORTAL_OUTLET") }),
          ),
          route("/login", h("div", null, "LOGIN_ROUTE")),
        ),
      ),
    );

    expect(container.textContent).toContain("بوابة الطالب غير متاحة لهذا المركز");
    expect(container.textContent).not.toContain("PORTAL_OUTLET");

    await click('[data-testid="student-portal-logout"]');

    expect(state.auth.logout).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain("LOGIN_ROUTE");
  });

  it("parent gate blocks the outlet and logs out through the action", async () => {
    state.auth = {
      ...state.auth,
      hasCenterModule: () => false,
      logout: vi.fn(),
    };

    await render(
      h(
        MemoryRouter,
        { initialEntries: ["/parent"] },
        h(
          Routes,
          null,
          h(
            Route,
            { path: "/parent", element: h(ParentPortalGate) },
            h(Route, { index: true, element: h("div", null, "PORTAL_OUTLET") }),
          ),
          route("/login", h("div", null, "LOGIN_ROUTE")),
        ),
      ),
    );

    expect(container.textContent).toContain("بوابة ولي الأمر غير متاحة لهذا المركز");
    expect(container.textContent).not.toContain("PORTAL_OUTLET");

    await click('[data-testid="parent-portal-logout"]');

    expect(state.auth.logout).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain("LOGIN_ROUTE");
  });

  it("student portal stays available when the module is enabled", async () => {
    state.auth = { ...state.auth, hasCenterModule: () => true };

    await render(
      h(
        MemoryRouter,
        { initialEntries: ["/student"] },
        h(
          Routes,
          null,
          h(
            Route,
            { path: "/student", element: h(StudentPortalGate) },
            h(Route, { index: true, element: h("div", null, "PORTAL_OUTLET") }),
          ),
        ),
      ),
    );

    expect(container.textContent).toContain("PORTAL_OUTLET");
    expect(container.textContent).not.toContain("بوابة الطالب غير متاحة");
  });
});

describe("not found screen", () => {
  it("explains the 404 and navigates home from the action", async () => {
    await render(
      h(
        MemoryRouter,
        { initialEntries: ["/missing/page"] },
        h(Routes, null, route("/missing/page", h(NotFound)), route("/", h("div", null, "HOME_ROUTE"))),
      ),
    );

    expect(container.textContent).toContain("الصفحة غير موجودة!");
    expect(container.textContent).toContain("مراجعة المسؤول");

    await click('[data-testid="not-found-home"]');

    expect(container.textContent).toContain("HOME_ROUTE");
  });
});

describe("access blocked overlay", () => {
  it("appears on the access event, shows the reason and signs out", async () => {
    state.auth = { ...state.auth, logout: vi.fn() };

    await render(h(AccessBlockedOverlay));

    expect(container.querySelector('[data-testid="access-blocked"]')).toBeNull();

    await act(async () => {
      window.dispatchEvent(
        new CustomEvent("access:blocked", {
          detail: { message: "انتهى اشتراك مركزك. تواصل مع إدارة المنصة للتجديد." },
        }),
      );
    });

    expect(container.textContent).toContain("تم إيقاف الوصول");
    expect(container.textContent).toContain("انتهى اشتراك مركزك");

    const dialog = container.querySelector('[role="alertdialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute("aria-modal")).toBe("true");

    await click('[data-testid="access-blocked-logout"]');

    expect(state.auth.logout).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[data-testid="access-blocked"]')).toBeNull();
  });
});

describe("error boundary", () => {
  it("shows the fallback instead of a blank page and reloads on demand", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const reload = vi.fn();
    const originalLocation = window.location;

    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: { ...originalLocation, reload },
    });

    function Boom() {
      throw new Error("render exploded");
    }

    await render(h(ErrorBoundary, null, h(Boom)));

    expect(container.textContent).toContain("حدث خطأ غير متوقع");
    expect(error).toHaveBeenCalled();

    await click('[data-testid="error-reload"]');

    expect(reload).toHaveBeenCalledTimes(1);

    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: originalLocation,
    });
  });
});
