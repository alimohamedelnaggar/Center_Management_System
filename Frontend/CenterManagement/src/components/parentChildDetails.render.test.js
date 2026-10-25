import { describe, expect, it, vi } from "vitest";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MODULES, canUseCenterModule } from "@/constants/modules";

/**
 * Every section of the per-child page is independently gated by its own module
 * (attendance / grades / online_exams / payments), never a single merged gate.
 * A section whose module is off renders the shared "غير مشترك في هذه الوحدة"
 * card and is never requested.
 */

const state = vi.hoisted(() => ({ auth: {} }));

vi.mock("@/context/useAuth", () => ({ useAuth: () => state.auth }));
vi.mock("react-router-dom", () => ({
  useParams: () => ({ studentId: "s1" }),
  Link: ({ to, children, ...rest }) =>
    h("a", { href: typeof to === "string" ? to : "#", ...rest }, children),
}));
vi.mock("@/services/parentPortalService", () => ({
  parentPortalService: {
    getChildSummary: vi.fn(),
    getChildAttendance: vi.fn(),
    getChildGrades: vi.fn(),
    getChildExams: vi.fn(),
    getChildPayments: vi.fn(),
  },
}));

import { ChildSection } from "@/pages/ParentPortalPages/ParentChildDetailsPage";

const TITLE = "قسم اختباري فريد";

function auth(enabledModules) {
  return {
    role: "Parent",
    modulesLoaded: true,
    logout: () => {},
    hasModule: (key) => canUseCenterModule(key, enabledModules, true),
    hasCenterModule: (key) => canUseCenterModule(key, enabledModules, true),
  };
}

function renderSection(enabledModules) {
  state.auth = auth(enabledModules);
  return renderToStaticMarkup(
    h(
      ChildSection,
      {
        title: TITLE,
        moduleKey: MODULES.ATTENDANCE,
        icon: () => null,
        studentId: "s1",
        load: async () => ({ succeeded: true, data: { records: [] } }),
        isEmpty: () => true,
        emptyText: "لا توجد سجلات",
      },
      () => null,
    ),
  );
}

describe("ParentChildDetailsPage section gating", () => {
  it("shows the locked card when the section module is off", () => {
    const html = renderSection([]);
    expect(html).toContain("غير مشترك في هذه الوحدة");
    expect(html).not.toContain(TITLE);
  });

  it("shows the section when its module is on", () => {
    const html = renderSection([MODULES.ATTENDANCE]);
    expect(html).toContain(TITLE);
    expect(html).not.toContain("غير مشترك في هذه الوحدة");
  });
});
