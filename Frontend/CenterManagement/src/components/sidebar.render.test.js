import { describe, expect, it, vi } from "vitest";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  canUseModule,
  canUseCenterModule,
  normaliseModules,
} from "@/constants/modules";

/**
 * Renders the REAL sidebar components for every role with odd enabledModules
 * shapes. The auth hooks are stubbed, but hasModule/hasCenterModule reproduce
 * exactly what AuthContext does — including handing canUseModule a `Set`, which
 * is the call that used to throw "(keys || []).filter is not a function".
 */

const state = vi.hoisted(() => ({
  auth: {},
  branding: { center: null, title: "المركز" },
  theme: { isDark: false, toggle: () => {} },
}));

vi.mock("@/context/useAuth", () => ({ useAuth: () => state.auth }));
vi.mock("@/context/useBranding", () => ({ useBranding: () => state.branding }));
vi.mock("@/context/useTheme", () => ({ useTheme: () => state.theme }));
vi.mock("react-router-dom", () => ({
  NavLink: ({ children }) => children ?? null,
  useNavigate: () => () => {},
}));

import AppSidebar from "@/components/AppSidebar";
import StudentSidebar from "@/components/StudentSidebar";

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

const ALL = [
  "attendance",
  "grades",
  "question_bank",
  "online_exams",
  "study_notes",
  "payments",
  "accounting",
  "center_reports",
  "whatsapp",
  "student_portal",
  "parent_portal",
];

const renderApp = (opts) => {
  state.auth = auth(opts);
  return renderToStaticMarkup(h(AppSidebar));
};

const renderStudent = (opts) => {
  state.auth = auth(opts);
  return renderToStaticMarkup(h(StudentSidebar));
};

describe("AppSidebar renders for every role without crashing", () => {
  const cases = [
    ["CenterOwner", ALL],
    ["CenterOwner", null],
    ["CenterOwner", undefined],
    ["CenterOwner", new Set(ALL)],
    ["CenterOwner", { attendance: true, payments: true }],
    ["CenterOwner", "attendance,payments"],
    ["Teacher", ALL],
    ["Teacher", []],
    ["Assistant", ALL],
    ["Assistant", []],
    ["SuperAdmin", null],
  ];

  it.each(cases)("role=%s enabledModules=%o", (role, enabledModules) => {
    expect(() => renderApp({ role, enabledModules })).not.toThrow();
  });

  it("an owner with all modules sees his management items", () => {
    const html = renderApp({ role: "CenterOwner", enabledModules: ALL });
    expect(html).toContain("المتأخرين");
    expect(html).toContain("إدارة المدرسين");
    expect(html).toContain("تقارير المركز");
  });

  it("a solo center hides the multi-teacher item", () => {
    const html = renderApp({
      role: "CenterOwner",
      enabledModules: ALL,
      centerType: "SoloTeacher",
    });
    expect(html).not.toContain("إدارة المدرسين");
    // Other management items stay available to a solo center.
    expect(html).toContain("تقارير المركز");
  });

  it("renders no nav items until the center type is known", () => {
    const html = renderApp({
      role: "CenterOwner",
      enabledModules: ALL,
      centerTypeLoaded: false,
      centerType: null,
    });
    expect(html).not.toContain("إدارة المدرسين");
    expect(html).not.toContain("تقارير المركز");
    expect(html).not.toContain("المتأخرين");
  });

  it("an owner with no modules keeps only core items", () => {
    const html = renderApp({ role: "CenterOwner", enabledModules: null });
    expect(html).toContain("ملفي الشخصي");
    expect(html).toContain("إدارة المدرسين");
    expect(html).not.toContain("المتأخرين");
    expect(html).not.toContain("تقارير المركز");
  });

  it("a regular teacher sees his operational items but not center admin", () => {
    const html = renderApp({ role: "Teacher", enabledModules: ALL });
    expect(html).toContain("الحضور");
    expect(html).not.toContain("إدارة المدرسين");
  });

  it("a teacher gets the student reports page, an owner or assistant does not", () => {
    const teacher = renderApp({ role: "Teacher", enabledModules: ALL });
    expect(teacher).toContain("تقارير الطلاب");

    const soloTeacher = renderApp({
      role: "Teacher",
      isCenterAdmin: true,
      enabledModules: ALL,
    });
    expect(soloTeacher).toContain("تقارير الطلاب");

    const owner = renderApp({ role: "CenterOwner", enabledModules: ALL });
    expect(owner).not.toContain("تقارير الطلاب");

    const assistant = renderApp({ role: "Assistant", enabledModules: ALL });
    expect(assistant).not.toContain("تقارير الطلاب");
  });

  it("the student reports page is a core page: no module can hide it", () => {
    const html = renderApp({ role: "Teacher", enabledModules: [] });
    expect(html).toContain("تقارير الطلاب");
  });
});

describe("StudentSidebar renders for every module shape", () => {
  it("only shows bought sections", () => {
    const html = renderStudent({ role: "Student", enabledModules: ["attendance"] });
    expect(html).toContain("الحضور والغياب");
    expect(html).not.toContain("المدفوعات");
  });

  it("shows core items only when nothing is bought", () => {
    const html = renderStudent({ role: "Student", enabledModules: null });
    expect(html).toContain("لوحة التحكم");
    expect(html).not.toContain("المدفوعات");
  });

  it("never throws on an object-map", () => {
    expect(() =>
      renderStudent({ role: "Student", enabledModules: { grades: true } }),
    ).not.toThrow();
  });
});
