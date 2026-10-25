import { describe, expect, it, vi } from "vitest";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { MODULES, canUseCenterModule, moduleForPath } from "@/constants/modules";

/**
 * A teacher/owner in a center whose `student_portal` is off must reach the staff
 * /dashboard normally — only a Student is stopped by the gate. This mirrors the
 * real route nesting in App.jsx: the staff routes (e.g. /dashboard) are NOT
 * wrapped by StudentPortalGate; the gate only wraps the /student/* subtree.
 */

const state = vi.hoisted(() => ({ auth: {} }));

vi.mock("@/context/useAuth", () => ({ useAuth: () => state.auth }));

import StudentPortalGate from "@/components/common/StudentPortalGate";

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
    // Staff route: NOT inside StudentPortalGate (App.jsx:105-180).
    h(Route, {
      path: "/dashboard",
      element: h("div", null, "STAFF_DASHBOARD"),
    }),
    // Student subtree: wrapped by the gate (App.jsx:200-218).
    h(
      Route,
      { element: h(StudentPortalGate) },
      h(Route, {
        path: "/student/dashboard",
        element: h("div", null, "STUDENT_PORTAL_HOME"),
      }),
    ),
  );

function renderAt(path) {
  return renderToStaticMarkup(
    h(MemoryRouter, { initialEntries: [path] }, TREE()),
  );
}

const UNAVAILABLE = "بوابة الطالب غير متاحة لهذا المركز";

describe("StudentPortalGate only affects Student accounts", () => {
  it("lets a teacher open /dashboard in a center without student_portal", () => {
    state.auth = auth("Teacher", ["attendance", "payments"]);
    const html = renderAt("/dashboard");
    expect(html).toContain("STAFF_DASHBOARD");
    expect(html).not.toContain(UNAVAILABLE);
  });

  it("lets an owner open /dashboard in a center without student_portal", () => {
    state.auth = auth("CenterOwner", []);
    const html = renderAt("/dashboard");
    expect(html).toContain("STAFF_DASHBOARD");
    expect(html).not.toContain(UNAVAILABLE);
  });

  it("still blocks the Student's /student/dashboard when the module is off", () => {
    state.auth = auth("Student", ["attendance"]);
    const html = renderAt("/student/dashboard");
    expect(html).not.toContain("STUDENT_PORTAL_HOME");
    expect(html).toContain(UNAVAILABLE);
  });

  it("renders the Student's /student/dashboard when the module is on", () => {
    state.auth = auth("Student", [MODULES.STUDENT_PORTAL]);
    const html = renderAt("/student/dashboard");
    expect(html).toContain("STUDENT_PORTAL_HOME");
    expect(html).not.toContain(UNAVAILABLE);
  });

  it("the staff /dashboard path is core (never module-gated)", () => {
    expect(moduleForPath("/dashboard")).toBe("core");
  });
});
