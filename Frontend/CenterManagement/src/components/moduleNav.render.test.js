import { describe, expect, it, vi } from "vitest";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  MODULES,
  MODULE_LABELS,
  NAV_ITEMS,
  canSeeNavItem,
  canUseCenterModule,
  canUseModule,
  moduleForPath,
  navLabel,
  navRoleContext,
  normaliseModules,
} from "@/constants/modules";

/**
 * Per-module contract for the shared NAV_ITEMS table: a center subscribed to a
 * single module must see exactly that module's nav entries (and no others), and
 * a direct link to any unsubscribed module must render the
 * "غير مشترك في هذه الوحدة" page instead of the page.
 */

const state = vi.hoisted(() => ({ auth: {} }));

vi.mock("@/context/useAuth", () => ({ useAuth: () => state.auth }));
vi.mock("@/context/useBranding", () => ({
  useBranding: () => ({ center: null, title: "المركز" }),
}));
vi.mock("@/context/useTheme", () => ({
  useTheme: () => ({ isDark: false, toggle: () => {} }),
}));
vi.mock("react-router-dom", () => ({
  NavLink: ({ children }) => children ?? null,
  useNavigate: () => () => {},
}));

import AppSidebar from "@/components/AppSidebar";
import StudentSidebar from "@/components/StudentSidebar";
import ModuleGuard from "@/components/common/ModuleGuard";

function auth({
  role,
  enabledModules,
  isCenterAdmin = false,
  modulesLoaded = true,
  centerType = "MultiTeacher",
  centerTypeLoaded = true,
}) {
  const isSuperAdmin = role === "SuperAdmin";
  const isStudent = role === "Student";
  const set = new Set(normaliseModules(enabledModules));
  return {
    logout: () => {},
    role,
    isCenterAdmin,
    modulesLoaded,
    centerType,
    centerTypeLoaded,
    isSoloCenter: centerType === "SoloTeacher",
    hasModule: (key) =>
      canUseModule(key, set, { isSuperAdmin, isStudent, modulesLoaded }),
    hasCenterModule: (key) =>
      canUseCenterModule(key, enabledModules, modulesLoaded),
  };
}

const staffHtml = (opts) => {
  state.auth = auth(opts);
  return renderToStaticMarkup(h(AppSidebar));
};

const studentHtml = (opts) => {
  state.auth = auth(opts);
  return renderToStaticMarkup(h(StudentSidebar));
};

const MODULE_KEYS = Object.values(MODULES);

// A role that actually has nav entries for each module (owner cannot reach the
// operational attendance/grades tools, so an assistant is used for those).
const STAFF_VIEWER = {
  [MODULES.ATTENDANCE]: { role: "Assistant", isCenterAdmin: false },
  [MODULES.GRADES]: { role: "Assistant", isCenterAdmin: false },
  [MODULES.QUESTION_BANK]: { role: "Assistant", isCenterAdmin: false },
  [MODULES.ONLINE_EXAMS]: { role: "Assistant", isCenterAdmin: false },
  [MODULES.STUDY_NOTES]: { role: "Assistant", isCenterAdmin: false },
  [MODULES.PAYMENTS]: { role: "CenterOwner", isCenterAdmin: false },
  [MODULES.ACCOUNTING]: { role: "CenterOwner", isCenterAdmin: false },
  [MODULES.CENTER_REPORTS]: { role: "CenterOwner", isCenterAdmin: false },
};

const STAFF_MODULES = MODULE_KEYS.filter((k) => STAFF_VIEWER[k]);

describe("NAV_ITEMS is the single source for sidebar and router", () => {
  it("maps every nav path back to its module via moduleForPath", () => {
    for (const item of NAV_ITEMS) {
      expect(moduleForPath(item.path)).toBe(item.module ?? "core");
    }
  });

  it("every module-gated nav item declares a known module key", () => {
    for (const item of NAV_ITEMS) {
      if (item.module === null) continue;
      expect(MODULE_KEYS).toContain(item.module);
    }
  });

  it("whatsapp/student_portal have no staff nav entry", () => {
    for (const key of [
      MODULES.WHATSAPP,
      MODULES.STUDENT_PORTAL,
    ]) {
      expect(NAV_ITEMS.some((i) => i.module === key)).toBe(false);
    }
  });
});

describe("subscribed to one module only: its items show, others are hidden", () => {
  it.each(STAFF_MODULES)("staff module %s", (moduleKey) => {
    const viewer = STAFF_VIEWER[moduleKey];
    const ctx = navRoleContext(viewer);

    const mine = NAV_ITEMS.filter(
      (i) => i.module === moduleKey && canSeeNavItem(i, ctx),
    );
    const others = NAV_ITEMS.filter(
      (i) => i.module && i.module !== moduleKey && canSeeNavItem(i, ctx),
    );
    expect(mine.length).toBeGreaterThan(0);

    const html = staffHtml({ ...viewer, enabledModules: [moduleKey] });

    for (const item of mine) expect(html).toContain(navLabel(item, ctx));
    for (const item of others) expect(html).not.toContain(navLabel(item, ctx));
  });

  it("an owner subscribed to attendance still sees no attendance tools (role-scoped)", () => {
    const html = staffHtml({ role: "CenterOwner", enabledModules: [MODULES.ATTENDANCE] });
    expect(html).not.toContain("ماسح الحضور");
    expect(html).toContain("ملفي الشخصي");
  });

  const STUDENT_VIEWER = {
    [MODULES.ONLINE_EXAMS]: "امتحاناتي",
    [MODULES.GRADES]: "النتائج",
    [MODULES.STUDY_NOTES]: "المذكرات",
    [MODULES.ATTENDANCE]: "الحضور والغياب",
    [MODULES.PAYMENTS]: "المدفوعات",
  };

  it.each(Object.entries(STUDENT_VIEWER))(
    "student portal module %s",
    (moduleKey, label) => {
      const html = studentHtml({ role: "Student", enabledModules: [moduleKey] });
      expect(html).toContain(label);
      for (const [otherKey, otherLabel] of Object.entries(STUDENT_VIEWER)) {
        if (otherKey !== moduleKey) expect(html).not.toContain(otherLabel);
      }
    },
  );
});

describe("ModuleGuard blocks a direct link to an unsubscribed module", () => {
  it.each(MODULE_KEYS)("module %s", (moduleKey) => {
    state.auth = auth({ role: "CenterOwner", enabledModules: [moduleKey] });
    const allowed = renderToStaticMarkup(
      h(ModuleGuard, { moduleKey }, h("div", null, "CONTENT")),
    );
    expect(allowed).toContain("CONTENT");
    expect(allowed).not.toContain("غير مشترك في هذه الوحدة");

    state.auth = auth({ role: "CenterOwner", enabledModules: [] });
    const blocked = renderToStaticMarkup(
      h(ModuleGuard, { moduleKey }, h("div", null, "CONTENT")),
    );
    expect(blocked).not.toContain("CONTENT");
    expect(blocked).toContain("غير مشترك في هذه الوحدة");
    expect(blocked).toContain(MODULE_LABELS[moduleKey]);
  });
});
