// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";

/**
 * Centre dashboard integration: real component + real rendering path, with the
 * dashboard API and the chart library mocked at their boundaries.
 *
 * Covers the hero, the "needs follow-up" banner in every module combination,
 * month switching, the payment/attendance module gates and the horizontal
 * month-axis labels.
 */

const auth = vi.hoisted(() => ({ modules: {} }));
const services = vi.hoisted(() => ({
  getSummary: vi.fn(),
  getStudentDistribution: vi.fn(),
  getRevenueChart: vi.fn(),
  getStudentMovement: vi.fn(),
  getAttendanceChart: vi.fn(),
  getTopGroups: vi.fn(),
  getRecentActivity: vi.fn(),
}));

vi.mock("@/context/useAuth", () => ({
  useAuth: () => ({
    role: "CenterOwner",
    hasModule: (key) => Boolean(auth.modules[key]),
  }),
}));
vi.mock("@/services/dashboardService", () => ({ dashboardService: services }));

vi.mock("recharts", async () => {
  const { createElement: h } = await import("react");
  const Box = ({ children }) => h("div", null, children);
  const Axis = (props) =>
    h("div", {
      "data-testid": "dashboard-x-axis",
      "data-angle": String(props.angle ?? ""),
      "data-interval": String(props.interval ?? ""),
      "data-height": String(props.height ?? ""),
    });
  const Tooltip = (props) =>
    h("div", {
      "data-testid": "dashboard-tooltip",
      "data-trigger": props.trigger || "",
    });
  return {
    ResponsiveContainer: Box,
    ComposedChart: Box,
    BarChart: Box,
    PieChart: Box,
    Pie: () => null,
    Cell: () => null,
    Bar: () => null,
    Line: () => null,
    CartesianGrid: () => null,
    XAxis: Axis,
    YAxis: () => null,
    Tooltip,
  };
});

import AdminDashboard, { tickInterval } from "./AdminDashboard";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const SUMMARY = {
  totalStudents: 248,
  activeStudents: 214,
  inactiveStudents: 27,
  deletedStudents: 7,
  monthlyStudents: 18,
  monthlyDeletedStudents: 5,
  netStudentGrowth: 13,
  totalGroups: 12,
  monthlyRevenue: 48750,
  previousMonthRevenue: 43200,
  monthlyExpenses: 12600,
  previousMonthExpenses: 11800,
  monthlyAssistantSalaries: 8500,
  previousMonthAssistantSalaries: 8000,
  netProfit: 27650,
  attendancePercentage: 82.4,
  monthlyPresentCount: 1640,
  monthlyAbsentCount: 210,
  monthlyLateCount: 96,
  monthlyExcusedCount: 42,
  monthlyAttendanceCount: 1988,
};

const DISTRIBUTION = [
  { groupName: "مجموعة أ", studentsCount: 16 },
  { groupName: "مجموعة ب", studentsCount: 14 },
];

const REVENUE = [
  { monthName: "يناير", revenue: 36000, expenses: 9800 },
  { monthName: "فبراير", revenue: 37500, expenses: 10200 },
];

const MOVEMENT = [
  { monthName: "يناير", newStudents: 12, departedStudents: 3, netGrowth: 9 },
  { monthName: "فبراير", newStudents: 15, departedStudents: 4, netGrowth: 11 },
];

const ATTENDANCE = [
  { dayName: "السبت", attendanceRate: 84 },
  { dayName: "الأحد", attendanceRate: 78 },
];

const TOP_GROUPS = [
  { rank: 1, groupName: "أ", studentsCount: 26, attendanceRate: 94.2 },
  { rank: 2, groupName: "ب", studentsCount: 20, attendanceRate: 71.4 },
  { rank: 3, groupName: "ج", studentsCount: 19, attendanceRate: 68.8 },
];

const ACTIVITY = [
  {
    activityType: "student_added",
    description: "تم إضافة طالب",
    date: "2026-11-10T09:14:00",
  },
];

let container;
let root;

const flush = async (delay = 0) => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, delay));
  });
  for (let i = 0; i < 3; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
};

const mount = async () => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(<AdminDashboard />);
  });
  await flush(100);
};

const unmount = async () => {
  if (root) {
    await act(async () => root.unmount());
    root = null;
  }
  if (container) {
    container.remove();
    container = null;
  }
};

const byTestId = (id) => container.querySelector(`[data-testid="${id}"]`);
const allByTestId = (id) =>
  [...container.querySelectorAll(`[data-testid="${id}"]`)];

const defaultServices = (summary = SUMMARY) => {
  services.getSummary.mockResolvedValue(summary);
  services.getStudentDistribution.mockResolvedValue(DISTRIBUTION);
  services.getRevenueChart.mockResolvedValue(REVENUE);
  services.getStudentMovement.mockResolvedValue(MOVEMENT);
  services.getAttendanceChart.mockResolvedValue(ATTENDANCE);
  services.getTopGroups.mockResolvedValue(TOP_GROUPS);
  services.getRecentActivity.mockResolvedValue(ACTIVITY);
};

beforeEach(() => {
  vi.clearAllMocks();
  auth.modules = { payments: true, accounting: true, attendance: true };
  Object.values(services).forEach((fn) => fn.mockReset());
  defaultServices();
});

afterEach(async () => {
  await unmount();
});

describe("admin dashboard integration", () => {
  it("renders the identity hero with the selected month and year", async () => {
    await mount();

    const hero = byTestId("dashboard-hero");
    expect(hero).toBeTruthy();
    expect(hero.textContent).toContain("لوحة التحكم");
    expect(hero.textContent).toContain("نبض السنتر");
    expect(hero.textContent).toContain(String(new Date().getFullYear()));
    expect(byTestId("dashboard-month")).toBeTruthy();
    expect(byTestId("dashboard-year")).toBeTruthy();
  });

  it("shows every real follow-up signal and keeps payments out of the banner", async () => {
    await mount();

    const banner = byTestId("dashboard-insight");
    expect(banner).toBeTruthy();
    expect(banner.textContent).toContain("27 طالب غير نشط");
    expect(banner.textContent).toContain("210 سجل غياب هذا الشهر");
    expect(banner.textContent).toContain("2 مجموعة حضورها أقل من 75%");
    // The banner is academic/core only - no payment or overdue copy.
    expect(banner.textContent).not.toContain("مدفوع");
    expect(banner.textContent).not.toContain("متأخر");
  });

  it("hides the banner completely when nothing needs follow-up", async () => {
    defaultServices({ ...SUMMARY, inactiveStudents: 0, monthlyAbsentCount: 0 });
    services.getTopGroups.mockResolvedValue([]);

    await mount();

    expect(byTestId("dashboard-insight")).toBeNull();
  });

  it("drops attendance signals when the attendance module is disabled", async () => {
    auth.modules = { payments: true, accounting: true, attendance: false };
    defaultServices({ ...SUMMARY, inactiveStudents: 5, monthlyAbsentCount: 210 });

    await mount();

    const banner = byTestId("dashboard-insight");
    expect(banner).toBeTruthy();
    expect(banner.textContent).toContain("5 طالب غير نشط");
    expect(banner.textContent).not.toContain("سجل غياب");
    expect(banner.textContent).not.toContain("مجموعة حضورها");

    expect(services.getAttendanceChart).not.toHaveBeenCalled();
    expect(services.getTopGroups).not.toHaveBeenCalled();
    expect(byTestId("chart-attendance")).toBeNull();
    expect(byTestId("chart-daily-attendance")).toBeNull();
    expect(byTestId("chart-top-groups")).toBeNull();
  });

  it("skips the revenue request and cards when payments are disabled", async () => {
    auth.modules = { payments: false, accounting: true, attendance: true };

    await mount();

    expect(services.getRevenueChart).not.toHaveBeenCalled();
    expect(byTestId("section-revenue-chart")).toBeNull();
    // Accounting still owns expenses + assistant salaries.
    expect(byTestId("section-finance")).toBeTruthy();
    expect(byTestId("section-finance").textContent).toContain("مصروفات الشهر");
    expect(byTestId("section-finance").textContent).toContain("مرتبات المساعدين");
    expect(byTestId("section-finance").textContent).not.toContain(
      "إيرادات الشهر",
    );
  });

  it("refetches the summary when the month changes", async () => {
    await mount();

    const select = byTestId("dashboard-month");
    await act(async () => {
      select.value = "1";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await flush(100);

    const calls = services.getSummary.mock.calls;
    expect(calls.length).toBeGreaterThan(1);
    expect(calls[calls.length - 1][0].month).toBe(1);
  });

  it("uses horizontal month labels and a tap tooltip on the year charts", async () => {
    await mount();

    const monthAxes = allByTestId("dashboard-x-axis").filter(
      (axis) => axis.getAttribute("data-height") === "34",
    );
    expect(monthAxes).toHaveLength(2);
    monthAxes.forEach((axis) => {
      expect(axis.getAttribute("data-angle")).toBe("0");
      expect(axis.getAttribute("data-interval")).toBe("0");
    });

    const tooltips = allByTestId("dashboard-tooltip");
    expect(tooltips.length).toBeGreaterThan(0);
    tooltips.forEach((tip) => {
      expect(tip.getAttribute("data-trigger")).toBe("click");
    });
  });

  it("thins month labels to every second month only on narrow charts", () => {
    expect(tickInterval(0)).toBe(0);
    expect(tickInterval(360)).toBe(1);
    expect(tickInterval(600)).toBe(1);
    expect(tickInterval(719)).toBe(1);
    expect(tickInterval(720)).toBe(0);
    expect(tickInterval(1200)).toBe(0);
  });
});
