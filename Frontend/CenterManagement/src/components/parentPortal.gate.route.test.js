import { describe, expect, it, vi } from "vitest";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { MODULES, canUseCenterModule, moduleForPath } from "@/constants/modules";

/**
 * A Parent whose center has `parent_portal` off must see the Arabic
 * "بوابة ولي الأمر غير متاحة" page (with a logout way out), and the portal
 * itself when the module is on. Mirrors the real route nesting in App.jsx.
 */

const state = vi.hoisted(() => ({ auth: {} }));

vi.mock("@/context/useAuth", () => ({ useAuth: () => state.auth }));

import ParentPortalGate from "@/components/common/ParentPortalGate";

function auth(role, centerModules, modulesLoaded = true) {
  return {
    role,
    modulesLoaded,
    logout: () => {},
    hasModule: (k) => canUseCenterModule(k, centerModules, modulesLoaded),
    hasCenterModule: (k) => canUseCenterModule(k, centerModules, modulesLoaded),
  };
}

const TREE = () =>
  h(
    Routes,
    null,
    h(
      Route,
      { element: h(ParentPortalGate) },
      h(Route, {
        path: "/parent/dashboard",
        element: h("div", null, "PARENT_DASHBOARD"),
      }),
    ),
  );

function renderAt(path) {
  return renderToStaticMarkup(
    h(MemoryRouter, { initialEntries: [path] }, TREE()),
  );
}

const UNAVAILABLE = "بوابة ولي الأمر غير متاحة لهذا المركز";

describe("ParentPortalGate", () => {
  it("blocks /parent/dashboard when the module is off", () => {
    state.auth = auth("Parent", ["attendance", "payments"]);
    const html = renderAt("/parent/dashboard");
    expect(html).not.toContain("PARENT_DASHBOARD");
    expect(html).toContain(UNAVAILABLE);
  });

  it("renders /parent/dashboard when the module is on", () => {
    state.auth = auth("Parent", [MODULES.PARENT_PORTAL]);
    const html = renderAt("/parent/dashboard");
    expect(html).toContain("PARENT_DASHBOARD");
    expect(html).not.toContain(UNAVAILABLE);
  });

  it("fails open before the module list has loaded", () => {
    state.auth = auth("Parent", [], false);
    const html = renderAt("/parent/dashboard");
    expect(html).toContain("PARENT_DASHBOARD");
  });

  it("the /parent/dashboard path is gated by parent_portal", () => {
    expect(moduleForPath("/parent/dashboard")).toBe(MODULES.PARENT_PORTAL);
  });
});
