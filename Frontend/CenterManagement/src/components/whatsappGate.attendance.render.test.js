import { describe, expect, it, vi } from "vitest";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { MODULES, canUseModule, normaliseModules } from "@/constants/modules";

/**
 * Behavioural proof for the attendance sheet's bulk "إشعار الغائبين" button: it
 * is the one WhatsApp action that renders from the page's initial (loading)
 * state, so it can be rendered directly. The button is inside the always-visible
 * toolbar; with the whatsapp module off it must not be in the output at all.
 */

const state = vi.hoisted(() => ({ auth: {} }));

vi.mock("@/context/useAuth", () => ({ useAuth: () => state.auth }));
vi.mock("@/context/useBranding", () => ({
  useBranding: () => ({ branding: {}, loadingBranding: false }),
}));
vi.mock("react-hot-toast", () => ({
  default: { error: () => {}, success: () => {} },
}));
vi.mock("@/services/attendanceService", () => ({
  attendanceService: {
    getGroups: vi.fn().mockResolvedValue([]),
    getSessions: vi.fn().mockResolvedValue([]),
    getStudents: vi.fn().mockResolvedValue([]),
    getSheet: vi.fn().mockResolvedValue(null),
    saveSheet: vi.fn().mockResolvedValue({}),
  },
}));
vi.mock("@/services/groupsService", () => ({
  groupsService: { getAll: vi.fn().mockResolvedValue([]) },
}));
vi.mock("@/services/signalr/attendanceHub", () => ({
  attendanceConnection: null,
  startAttendanceConnection: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/components/common/Pagination", () => ({ default: () => null }));
vi.mock("@/components/common/QrScannerModal", () => ({ default: () => null }));
vi.mock("@/pages/AttendancePages/AttendanceStatsCards", () => ({
  default: () => null,
}));

import AttendanceSheet from "@/pages/AttendancePages/AttendanceSheet";

function auth(role, enabledModules) {
  const isSuperAdmin = role === "SuperAdmin";
  const isStudent = role === "Student";
  const set = new Set(normaliseModules(enabledModules));
  return {
    role,
    user: { fullName: "QA Teacher" },
    modulesLoaded: true,
    hasModule: (key) =>
      canUseModule(key, set, { isSuperAdmin, isStudent, modulesLoaded: true }),
    hasCenterModule: (key) =>
      canUseModule(key, set, { isSuperAdmin, isStudent, modulesLoaded: true }),
  };
}

const render = () =>
  renderToStaticMarkup(h(MemoryRouter, null, h(AttendanceSheet)));

describe("AttendanceSheet bulk whatsapp button honours the whatsapp module", () => {
  it("renders the action when whatsapp is enabled", () => {
    state.auth = auth("Assistant", [MODULES.ATTENDANCE, MODULES.WHATSAPP]);
    expect(render()).toContain("إشعار الغائبين");
  });

  it("hides the action when whatsapp is disabled", () => {
    state.auth = auth("Assistant", [MODULES.ATTENDANCE]);
    expect(render()).not.toContain("إشعار الغائبين");
  });
});
