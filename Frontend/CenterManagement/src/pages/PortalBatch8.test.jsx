// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

/**
 * Batch 8 proof for the student / parent portals:
 *   - the same rows feed a phone card list and a desktop table;
 *   - all four attendance states stay visible;
 *   - the parent portal only ever renders and requests the children returned
 *     for that account (an unlinked child shows the unavailable screen);
 *   - the mobile bottom bar exposes real, active destinations.
 */

const studentMock = vi.hoisted(() => ({
  getResults: vi.fn(),
  getAttendance: vi.fn(),
  getPayments: vi.fn(),
  getNotes: vi.fn(),
  getNotifications: vi.fn(),
  markRead: vi.fn(),
  markAllRead: vi.fn(),
}));

const parentMock = vi.hoisted(() => ({
  getChildren: vi.fn(),
  getChildSummary: vi.fn(),
  getChildAttendance: vi.fn(),
  getChildGrades: vi.fn(),
  getChildExams: vi.fn(),
  getChildPayments: vi.fn(),
  getNotifications: vi.fn(),
  markRead: vi.fn(),
  markAllRead: vi.fn(),
}));

vi.mock("@/services/studentPortalService", () => ({
  studentPortalService: studentMock,
}));

vi.mock("@/services/parentPortalService", () => ({
  parentPortalService: parentMock,
}));

vi.mock("@/context/useAuth", () => ({
  useAuth: () => ({
    role: "Parent",
    modulesLoaded: false,
    hasModule: () => true,
    hasCenterModule: () => true,
    logout: vi.fn(),
  }),
}));

vi.mock("react-hot-toast", () => {
  const toast = vi.fn();
  toast.success = vi.fn();
  toast.error = vi.fn();
  return { default: toast };
});

import MobileBottomNav from "../components/layout/MobileBottomNav";
import StudentResultsPage from "./StudentPortalPages/StudentResultsPage";
import StudentAttendancePage from "./StudentPortalPages/StudentAttendancePage";
import StudentPaymentsPage from "./StudentPortalPages/StudentPaymentsPage";
import ParentDashboardPage from "./ParentPortalPages/ParentDashboardPage";
import ParentChildDetailsPage from "./ParentPortalPages/ParentChildDetailsPage";
import ParentNotificationsPage from "./ParentPortalPages/ParentNotificationsPage";
import { Bell, Users } from "@/components/icons";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

const flush = async () => {
  for (let i = 0; i < 6; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
};

const render = async (element) => {
  await act(async () => {
    root.render(element);
  });
  await flush();
};

const click = async (element) => {
  expect(element).toBeTruthy();
  await act(async () => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await flush();
};

const LocationProbe = () => {
  const location = useLocation();
  return h("div", { "data-testid": "location" }, location.pathname);
};

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
  });
  container.remove();
  vi.clearAllMocks();
});

describe("student portal cards and tables", () => {
  it("renders every result as a phone card and a desktop row", async () => {
    studentMock.getResults.mockResolvedValue({
      succeeded: true,
      data: [
        {
          examId: 1,
          examName: "رياضيات",
          score: 8,
          totalMark: 10,
          isPublished: true,
          submittedAt: "2026-11-01T10:00:00Z",
          hasPendingManualGrading: false,
        },
        {
          examId: 2,
          examName: "لغة عربية",
          score: 0,
          totalMark: 20,
          isPublished: false,
          submittedAt: "2026-11-02T10:00:00Z",
          hasPendingManualGrading: false,
        },
      ],
    });

    await render(
      h(MemoryRouter, null, h(StudentResultsPage)),
    );

    expect(
      container.querySelector('[data-testid="student-results-page"]'),
    ).toBeTruthy();
    expect(
      container.querySelectorAll('[data-testid="student-result-card"]'),
    ).toHaveLength(2);
    expect(container.querySelector("table")).toBeTruthy();
    expect(container.textContent).toContain("بانتظار النشر");
    expect(container.textContent).toContain("8");
  });

  it("keeps the four attendance states and never prints 0% for an uncountable rate", async () => {
    studentMock.getAttendance.mockResolvedValue({
      succeeded: true,
      data: {
        totalSessions: 8,
        presentCount: 4,
        absentCount: 2,
        lateCount: 1,
        excusedCount: 1,
        attendancePercentage: null,
        records: [
          {
            attendanceDate: "2026-11-01",
            groupName: "مجموعة أ",
            dayOfWeek: "الأحد",
            startTime: "16:00",
            endTime: "18:00",
            status: 1,
            statusName: "حاضر",
          },
          {
            attendanceDate: "2026-11-02",
            groupName: "مجموعة أ",
            status: 2,
            statusName: "غائب",
          },
          {
            attendanceDate: "2026-11-03",
            groupName: "مجموعة أ",
            status: 3,
            statusName: "متأخر",
          },
          {
            attendanceDate: "2026-11-04",
            groupName: "مجموعة أ",
            status: 4,
            statusName: "بعذر",
          },
        ],
      },
    });

    await render(h(MemoryRouter, null, h(StudentAttendancePage)));

    const text = container.textContent;
    ["حاضر", "غائب", "متأخر", "بعذر"].forEach((label) => {
      expect(text).toContain(label);
    });
    expect(text).not.toContain("0%");
    expect(
      container.querySelectorAll('[data-testid="student-attendance-card"]'),
    ).toHaveLength(4);
    expect(
      container.querySelector('[data-testid="student-attendance-late"]').textContent,
    ).toContain("1");
  });

  it("drops the duplicated receiver column and shows the real payment totals", async () => {
    studentMock.getPayments.mockResolvedValue({
      succeeded: true,
      data: {
        totalPaid: 300,
        totalDue: 100,
        paymentsCount: 1,
        payments: [
          {
            paymentId: "p1",
            paymentDate: "2026-11-01",
            groupName: "مجموعة أ",
            billingPeriod: "2026-11-01",
            totalAmount: 400,
            paidAmount: 300,
            remainingAmount: 100,
            status: 1,
            statusName: "جزئي",
            receivedByName: "أ. محمد",
          },
        ],
      },
    });

    await render(h(MemoryRouter, null, h(StudentPaymentsPage)));

    const headers = [...container.querySelectorAll("th")].map((th) =>
      th.textContent.trim(),
    );
    expect(headers).not.toContain("المجموع المستلم");
    expect(headers).toHaveLength(7);
    expect(
      container.querySelectorAll('[data-testid="student-payment-card"]'),
    ).toHaveLength(1);
    expect(container.textContent).not.toContain("أ. محمد");
    expect(container.textContent).toContain("المدفوع");
    expect(container.textContent).toContain("المتبقي");
  });
});

describe("parent portal isolation", () => {
  it("lists only the children returned for this parent", async () => {
    parentMock.getChildren.mockResolvedValue({
      succeeded: true,
      data: [
        { studentId: "101", fullName: "سارة أحمد", isActive: true },
        { studentId: "102", fullName: "يوسف أحمد", isActive: true },
      ],
    });

    await render(h(MemoryRouter, null, h(ParentDashboardPage)));

    expect(
      container.querySelectorAll('[data-testid="parent-child-card"]'),
    ).toHaveLength(2);
    expect(container.textContent).toContain("سارة أحمد");
    expect(container.textContent).toContain("يوسف أحمد");
    expect(container.textContent).not.toContain("طفل آخر");
  });

  it("requests and renders only the routed child's sections", async () => {
    parentMock.getChildSummary.mockResolvedValue({
      succeeded: true,
      data: { fullName: "سارة أحمد", isActive: true },
    });
    parentMock.getChildAttendance.mockResolvedValue({
      succeeded: true,
      data: {
        totalSessions: 4,
        presentCount: 3,
        absentCount: 1,
        lateCount: 0,
        excusedCount: 0,
        attendancePercentage: 75,
        records: [
          {
            attendanceDate: "2026-11-01",
            groupName: "مجموعة أ",
            statusName: "حاضر",
          },
        ],
      },
    });
    parentMock.getChildGrades.mockResolvedValue({
      succeeded: true,
      data: {
        exams: [
          {
            examName: "اختبار الشهر",
            examDate: "2026-11-01",
            components: [
              { componentName: "أعمال السنة", mark: 9, totalMarks: 10 },
            ],
          },
        ],
      },
    });
    parentMock.getChildExams.mockResolvedValue({
      succeeded: true,
      data: {
        exams: [
          { examName: "امتحان إلكتروني", score: 18, totalMark: 20 },
        ],
      },
    });
    parentMock.getChildPayments.mockResolvedValue({
      succeeded: true,
      data: {
        totalPaid: 300,
        totalDue: 100,
        payments: [
          {
            paymentDate: "2026-11-01",
            groupName: "مجموعة أ",
            paidAmount: 300,
            remainingAmount: 100,
          },
        ],
      },
    });

    await render(
      h(
        MemoryRouter,
        { initialEntries: ["/parent/children/101"] },
        h(
          Routes,
          null,
          h(Route, {
            path: "/parent/children/:studentId",
            element: h(ParentChildDetailsPage),
          }),
        ),
      ),
    );

    expect(
      container.querySelector('[data-testid="parent-child-page"]'),
    ).toBeTruthy();
    expect(container.textContent).toContain("سارة أحمد");
    expect(container.textContent).toContain("اختبار الشهر");
    expect(container.textContent).toContain("امتحان إلكتروني");
    expect(container.textContent).toContain("75%");

    for (const loader of [
      parentMock.getChildAttendance,
      parentMock.getChildGrades,
      parentMock.getChildExams,
      parentMock.getChildPayments,
    ]) {
      expect(loader).toHaveBeenCalledWith("101");
      expect(loader).not.toHaveBeenCalledWith("202");
    }
  });

  it("shows the unavailable screen for a child that is not linked", async () => {
    parentMock.getChildSummary.mockResolvedValue({
      succeeded: false,
      statusCode: 404,
      message: "غير موجود",
    });

    await render(
      h(
        MemoryRouter,
        { initialEntries: ["/parent/children/999"] },
        h(
          Routes,
          null,
          h(Route, {
            path: "/parent/children/:studentId",
            element: h(ParentChildDetailsPage),
          }),
        ),
      ),
    );

    expect(container.textContent).toContain("هذا الطالب غير مرتبط بحسابك");
    expect(parentMock.getChildAttendance).not.toHaveBeenCalled();
    expect(parentMock.getChildGrades).not.toHaveBeenCalled();
    expect(parentMock.getChildExams).not.toHaveBeenCalled();
    expect(parentMock.getChildPayments).not.toHaveBeenCalled();
  });
});

describe("parent notifications and bottom navigation", () => {
  it("opens the child page from an absence notification", async () => {
    parentMock.getNotifications.mockResolvedValue({
      succeeded: true,
      data: {
        data: [
          {
            id: "n1",
            title: "غياب",
            body: "سارة غابت اليوم",
            studentId: "101",
            isRead: false,
            createdAt: "2026-11-01T08:00:00Z",
          },
        ],
        currentPage: 1,
        totalPages: 1,
        totalCount: 1,
      },
    });
    parentMock.markRead.mockResolvedValue({ succeeded: true });

    await render(
      h(
        MemoryRouter,
        { initialEntries: ["/parent/notifications"] },
        h(
          Routes,
          null,
          h(Route, {
            path: "/parent/notifications",
            element: h(ParentNotificationsPage),
          }),
          h(Route, { path: "*", element: h(LocationProbe) }),
        ),
      ),
    );

    expect(container.textContent).toContain("غياب");
    const item = container.querySelector(
      '[data-testid="parent-notifications-page"] li button',
    );
    await click(item);

    expect(parentMock.markRead).toHaveBeenCalledWith("n1");
    expect(container.querySelector('[data-testid="location"]').textContent).toBe(
      "/parent/children/101",
    );
  });

  it("exposes two active parent destinations in the mobile bottom bar", async () => {
    await render(
      h(
        MemoryRouter,
        { initialEntries: ["/parent/dashboard"] },
        h(MobileBottomNav, {
          items: [
            { title: "أبنائي", path: "/parent/dashboard", icon: Users },
            { title: "الإشعارات", path: "/parent/notifications", icon: Bell },
          ].map((item) => ({ ...item, label: item.title })),
        }),
      ),
    );

    const nav = container.querySelector('nav[aria-label="التنقل السريع"]');
    expect(nav).toBeTruthy();
    const links = [...nav.querySelectorAll("a")];
    expect(links).toHaveLength(2);
    expect(links[0].getAttribute("aria-current")).toBe("page");
    expect(links[1].getAttribute("aria-current")).toBeNull();
  });

  it("keeps «أبنائي» current on a child detail page (F-033)", async () => {
    await render(
      h(
        MemoryRouter,
        { initialEntries: ["/parent/children/101"] },
        h(MobileBottomNav, {
          items: [
            {
              title: "أبنائي",
              path: "/parent/dashboard",
              match: ["/parent/dashboard", "/parent/children"],
              icon: Users,
            },
            { title: "الإشعارات", path: "/parent/notifications", icon: Bell },
          ].map((item) => ({ ...item, label: item.title })),
        }),
      ),
    );

    const links = [
      ...container
        .querySelector('nav[aria-label="التنقل السريع"]')
        .querySelectorAll("a"),
    ];
    expect(links).toHaveLength(2);
    expect(links[0].getAttribute("aria-current")).toBe("page");
    expect(links[1].getAttribute("aria-current")).toBeNull();
  });
});
