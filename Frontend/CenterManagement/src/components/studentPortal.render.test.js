import { describe, expect, it, vi } from "vitest";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  MODULES,
  canUseCenterModule,
  moduleForPath,
} from "@/constants/modules";

/**
 * A center without `student_portal` must never drop the student on an empty or
 * failing portal: the whole /student/* area is gated by the module, the three
 * "core-looking" routes (dashboard / notifications / profile) are mapped to it,
 * and the dashboard quick links honour each link's own module.
 */

const state = vi.hoisted(() => ({ auth: {} }));

vi.mock("@/context/useAuth", () => ({ useAuth: () => state.auth }));
vi.mock("react-router-dom", () => ({
  Outlet: () => h("div", null, "PORTAL_OUTLET"),
  useNavigate: () => () => {},
  Link: ({ to, children, ...rest }) =>
    h("a", { href: typeof to === "string" ? to : "#", ...rest }, children),
}));
vi.mock("recharts", () => {
  const Passthrough = ({ children }) => h("div", null, children);
  const Empty = () => null;
  return {
    ResponsiveContainer: Passthrough,
    LineChart: Passthrough,
    Line: Empty,
    CartesianGrid: Empty,
    XAxis: Empty,
    YAxis: Empty,
    Tooltip: Empty,
  };
});
vi.mock("react-hot-toast", () => ({
  default: { error: () => {}, success: () => {} },
}));
vi.mock("@/services/studentPortalService", () => ({
  studentPortalService: {
    getProfile: vi.fn(),
    getExams: vi.fn(),
    getResults: vi.fn(),
    getAttendance: vi.fn(),
    getPayments: vi.fn(),
    getUnreadCount: vi.fn(),
  },
}));

import StudentDashboardPage from "@/pages/StudentPortalPages/StudentDashboardPage";
import StudentPortalGate, {
  StudentPortalUnavailable,
} from "@/components/common/StudentPortalGate";

function authFor(enabledModules, modulesLoaded = true) {
  return {
    role: "Student",
    modulesLoaded,
    logout: () => {},
    hasModule: (key) => canUseCenterModule(key, enabledModules, modulesLoaded),
    hasCenterModule: (key) =>
      canUseCenterModule(key, enabledModules, modulesLoaded),
  };
}

const dashboardHtml = (enabledModules) => {
  state.auth = authFor(enabledModules);
  return renderToStaticMarkup(h(StudentDashboardPage));
};

const gateHtml = (enabledModules, modulesLoaded = true) => {
  state.auth = authFor(enabledModules, modulesLoaded);
  return renderToStaticMarkup(h(StudentPortalGate));
};

describe("student_portal module gates the three portal routes", () => {
  it("maps dashboard / notifications / profile to student_portal", () => {
    expect(moduleForPath("/student/dashboard")).toBe(MODULES.STUDENT_PORTAL);
    expect(moduleForPath("/student/notifications")).toBe(MODULES.STUDENT_PORTAL);
    expect(moduleForPath("/student/profile")).toBe(MODULES.STUDENT_PORTAL);
  });

  it("gate renders the portal when student_portal is enabled", () => {
    const html = gateHtml([MODULES.STUDENT_PORTAL]);
    expect(html).toContain("PORTAL_OUTLET");
    expect(html).not.toContain("بوابة الطالب غير متاحة لهذا المركز");
  });

  it("gate blocks the portal with an Arabic page when student_portal is off", () => {
    const html = gateHtml([]);
    expect(html).not.toContain("PORTAL_OUTLET");
    expect(html).toContain("بوابة الطالب غير متاحة لهذا المركز");
  });

  it("fails open before the module list has loaded", () => {
    const html = gateHtml([], false);
    expect(html).toContain("PORTAL_OUTLET");
    expect(html).not.toContain("بوابة الطالب غير متاحة لهذا المركز");
  });

  it("the unavailable page offers a logout button", () => {
    state.auth = authFor([]);
    const html = renderToStaticMarkup(h(StudentPortalUnavailable));
    expect(html).toContain("بوابة الطالب غير متاحة لهذا المركز");
    expect(html).toContain("تسجيل خروج");
    expect(html).toContain("تواصل مع الإدارة");
  });
});

describe("dashboard quick links honour each link's module", () => {
  it("hides المذكرات when study_notes is off", () => {
    const html = dashboardHtml([MODULES.STUDENT_PORTAL]);
    expect(html).not.toContain("المذكرات");
    expect(html).toContain("الإشعارات");
    expect(html).toContain("بياناتي");
  });

  it("shows المذكرات when study_notes is on", () => {
    const html = dashboardHtml([MODULES.STUDENT_PORTAL, MODULES.STUDY_NOTES]);
    expect(html).toContain("المذكرات");
  });

  it("hides the notifications/profile links when student_portal is off", () => {
    const html = dashboardHtml([MODULES.STUDY_NOTES]);
    expect(html).toContain("المذكرات");
    expect(html).not.toContain("الإشعارات");
    expect(html).not.toContain("بياناتي");
  });
});
