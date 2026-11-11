// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";

/**
 * Banners shown above the app content. Each test renders the banner with a
 * realistic auth snapshot, performs the available action (renew link, stop
 * impersonation, dismiss / add email) and asserts the outcome.
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

import SubscriptionBanner from "@/components/common/SubscriptionBanner";
import ImpersonationBanner from "@/components/ImpersonationBanner";
import OwnerEmailWarning from "@/components/OwnerEmailWarning";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

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

const owner = (extra = {}) => ({
  role: "CenterOwner",
  isSoloTeacher: false,
  impersonating: false,
  subscription: null,
  logout: vi.fn(),
  ...extra,
});

beforeEach(() => {
  state.auth = owner();
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

describe("subscription banner", () => {
  it("shows the remaining grace days and a working renew link", async () => {
    state.auth = owner({
      subscription: { state: "InGrace", daysLeftInGrace: 3 },
    });

    await render(h(MemoryRouter, null, h(SubscriptionBanner)));

    const banner = container.querySelector('[data-testid="subscription-banner"]');
    expect(banner).not.toBeNull();
    expect(banner.dataset.variant).toBe("grace");
    expect(container.textContent).toContain("فترة السماح");
    expect(container.textContent).toContain("يتبقى 3 يوم");

    const renew = container.querySelector('[data-testid="subscription-renew"]');
    expect(renew.getAttribute("href")).toBe(state.contact);
    expect(renew.getAttribute("target")).toBe("_blank");
  });

  it("warns during the last 14 days of an active subscription", async () => {
    state.auth = owner({
      subscription: { state: "Active", daysUntilEnd: 7 },
    });

    await render(h(MemoryRouter, null, h(SubscriptionBanner)));

    const banner = container.querySelector('[data-testid="subscription-banner"]');
    expect(banner.dataset.variant).toBe("expiring");
    expect(container.textContent).toContain("خلال 7 يوم");
  });

  it("stays silent when the subscription is far from expiry", async () => {
    for (const subscription of [
      { state: "Active", daysUntilEnd: 30 },
      { state: "Active", endDate: null },
      { state: "Cancelled" },
      null,
    ]) {
      state.auth = owner({ subscription });
      await render(h(MemoryRouter, null, h(SubscriptionBanner)));
      expect(container.textContent.trim()).toBe("");
    }
  });

  it("never shows to a regular teacher", async () => {
    state.auth = {
      ...owner({ subscription: { state: "InGrace", daysLeftInGrace: 2 } }),
      role: "Teacher",
      isCenterOwner: false,
      isSoloTeacher: false,
    };

    await render(h(MemoryRouter, null, h(SubscriptionBanner)));

    expect(container.textContent.trim()).toBe("");
  });
});

describe("impersonation banner", () => {
  it("names the target, warns, and ends the session through the button", async () => {
    const stopImpersonation = vi.fn(async () => {});
    state.auth = {
      impersonating: true,
      user: {
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name":
          "أ. حسناء عبد الله",
      },
      role: "CenterOwner",
      impersonationWarning: "تم تغيير البريد الإلكتروني.",
      stopImpersonation,
      logout: vi.fn(),
    };

    await render(
      h(
        MemoryRouter,
        { initialEntries: ["/adminDashboard"] },
        h(
          Routes,
          null,
          h(Route, { path: "/adminDashboard", element: h(ImpersonationBanner) }),
          h(Route, { path: "/admin", element: h("div", null, "ADMIN_ROUTE") }),
        ),
      ),
    );

    expect(container.textContent).toContain("أنت تتصفّح الآن كـ");
    expect(container.textContent).toContain("أ. حسناء عبد الله");
    expect(container.textContent).toContain("تم تغيير البريد الإلكتروني.");

    await click('[data-testid="impersonation-stop"]');

    expect(stopImpersonation).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain("ADMIN_ROUTE");
  });

  it("renders nothing outside an impersonation session", async () => {
    state.auth = { impersonating: false, user: null };

    await render(h(MemoryRouter, null, h(ImpersonationBanner)));

    expect(container.textContent.trim()).toBe("");
  });
});

describe("owner email warning", () => {
  const ownerWithoutEmail = {
    role: "CenterOwner",
    isSoloTeacher: false,
    email: null,
    profileLoaded: true,
    impersonating: false,
    logout: vi.fn(),
  };

  it("links to the profile page", async () => {
    state.auth = ownerWithoutEmail;

    await render(
      h(
        MemoryRouter,
        { initialEntries: ["/dashboard"] },
        h(
          Routes,
          null,
          h(Route, { path: "/dashboard", element: h(OwnerEmailWarning) }),
          h(Route, { path: "/profile", element: h("div", null, "PROFILE_ROUTE") }),
        ),
      ),
    );

    expect(container.textContent).toContain("أضف بريدك");
    expect(container.querySelector('a[href="/profile"]')).not.toBeNull();

    await click('a[href="/profile"]');

    expect(container.textContent).toContain("PROFILE_ROUTE");
  });

  it("can be dismissed for the rest of the session", async () => {
    state.auth = ownerWithoutEmail;

    await render(h(MemoryRouter, null, h(OwnerEmailWarning)));

    expect(container.textContent).toContain("أضف بريدك");

    await click('[aria-label="إغلاق التنبيه"]');

    expect(container.textContent.trim()).toBe("");
  });
});
