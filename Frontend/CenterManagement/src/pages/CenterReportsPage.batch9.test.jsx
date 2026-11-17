// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";

const reportsServiceMock = vi.hoisted(() => ({
  getCenterOverview: vi.fn(),
}));

vi.mock("react-hot-toast", () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@/context/useAuth", () => ({
  useAuth: () => ({
    hasModule: () => true,
    role: "CenterOwner",
  }),
}));

vi.mock("@/services/reportsService", () => ({
  reportsService: reportsServiceMock,
}));

// jsdom has no layout engine, so recharts cannot measure itself. The chart
// wrapper (role="img" + label) is what this test asserts, not the SVG.
vi.mock("recharts", () => {
  const Stub = ({ children }) => h("div", null, children);
  return {
    CartesianGrid: Stub,
    ComposedChart: Stub,
    Legend: Stub,
    Line: Stub,
    Bar: Stub,
    ResponsiveContainer: Stub,
    Tooltip: Stub,
    XAxis: Stub,
    YAxis: Stub,
  };
});

import CenterReportsPage from "./CenterReportsPage";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const pad2 = (n) => String(n).padStart(2, "0");
const now = new Date();
const CURRENT = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
const NEXT_DATE = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1));
const NEXT = `${NEXT_DATE.getUTCFullYear()}-${pad2(NEXT_DATE.getUTCMonth() + 1)}`;

const DATA = {
  role: "CenterOwner",
  centerType: "MultiTeacher",
  soloTeacherSubject: null,
  totals: {
    activeStudents: 1_234_567,
    teachers: 2,
    assistants: 1,
    groups: 3,
  },
  finance: {
    studentPaymentsCollected: 5300.5,
    otherIncomes: 12050,
    expenses: 4100,
    assistantSalaries: 800,
    net: 12450.5,
  },
  trend: [{ month: 11, year: 2026, income: 1200000, expenses: 400000 }],
  teachers: [
    {
      teacherId: "t1",
      teacherName: "أ. محمد عبد الرحمن السيد الطويل جدًا",
      groupsCount: 2,
      studentsCount: 45,
      collectedInRange: 5300.5,
      presentCount: 10,
      absentCount: 2,
      lateCount: 1,
      excusedCount: 1,
      attendanceRate: 80,
    },
  ],
  groups: [
    {
      groupId: "g1",
      groupName: "الصف الثالث الإعدادي — المجموعة الطويلة جدًا",
      teacherName: "أ. محمد",
      studentsCount: 8,
      presentCount: 5,
      absentCount: 1,
      lateCount: 1,
      excusedCount: 1,
      attendanceRate: 75,
      expected: 4800.5,
      collected: 4000,
      outstanding: 800.5,
    },
  ],
};

let container;
let root;
let capturedBlob;

const flush = async () => {
  for (let i = 0; i < 5; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
};

const renderPage = async () => {
  await act(async () => {
    root.render(h(MemoryRouter, null, h(CenterReportsPage)));
  });
  await flush();
};

const buttonByText = (label) =>
  [...container.querySelectorAll("button")].find((button) =>
    button.textContent.includes(label),
  );

const click = async (element) => {
  await act(async () => {
    element.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true }),
    );
  });
  await flush();
};

beforeEach(() => {
  capturedBlob = null;
  reportsServiceMock.getCenterOverview.mockResolvedValue(DATA);

  URL.createObjectURL = vi.fn((blob) => {
    capturedBlob = blob;
    return "blob:center-report";
  });
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

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
  vi.restoreAllMocks();
});

describe("the center report screen (batch 9)", () => {
  it("renders the totals, the finance rows, the chart and big numbers", async () => {
    await renderPage();

    expect(container.querySelector('[data-testid="center-reports-page"]')).toBeTruthy();
    expect(container.textContent).toContain("1234567");
    expect(container.textContent).toContain("5,300.5");
    expect(container.textContent).toContain("الصف الثالث الإعدادي");
    expect(
      container.querySelector('[role="img"][aria-label*="الإيرادات"]'),
    ).toBeTruthy();
  });

  it("exports exactly the same bytes as the tables show (UTF-8 BOM + rows)", async () => {
    await renderPage();

    await click(buttonByText("تصدير CSV"));

    expect(capturedBlob).toBeTruthy();

    const bytes = new Uint8Array(await capturedBlob.arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);

    const expected = [
      `تقرير المركز,من ${CURRENT} إلى ${NEXT},شهر الفوترة ${CURRENT},`,
      [
        '"الإجماليات",""',
        '"الطلاب النشطون","1234567"',
        '"المدرسون","2"',
        '"المساعدون","1"',
        '"المجموعات","3"',
        '"",""',
        '"القيود المالية للفترة",""',
        '"مدفوعات الطلاب المحصّلة","5300.50"',
        '"إيرادات أخرى","12050.00"',
        '"المصاريف","4100.00"',
        '"مصروفات المساعدين","800.00"',
        '"الصافي","12450.50"',
      ].join("\n"),
      "",
      `"بالمدرسون","(المحصّل من ${CURRENT} إلى ${NEXT})"`,
      [
        '"م","المدرس","عدد المجموعات","عدد الطلاب","المحصّل في الفترة","حضور","غياب","تأخر","بعذر","نسبة الحضور"',
        '"1","أ. محمد عبد الرحمن السيد الطويل جدًا","2","45","5300.50","10","2","1","1","80%"',
      ].join("\n"),
      "",
      `"بالمجموعات","(شهر الفوترة ${CURRENT})"`,
      [
        '"م","المجموعة","المدرس","الطلاب","حضور","غياب","تأخر","بعذر","نسبة الحضور","المتوقع للشهر","المحصّل للشهر","المتبقي للشهر"',
        '"1","الصف الثالث الإعدادي — المجموعة الطويلة جدًا","أ. محمد","8","5","1","1","1","75%","4800.50","4000.00","800.50"',
      ].join("\n"),
    ].join("\n");

    // Blob.text() decodes UTF-8 and strips the BOM, so the three bytes above
    // are the proof it exists; this compares the payload itself byte-for-byte.
    expect(await capturedBlob.text()).toBe(expected);
  });

  it("shows an explicit error with a retry that reloads the report", async () => {
    reportsServiceMock.getCenterOverview.mockRejectedValueOnce(
      new Error("network down"),
    );

    await renderPage();

    const alert = container.querySelector('[data-testid="center-reports-error"]');
    expect(alert).toBeTruthy();
    expect(alert.getAttribute("role")).toBe("alert");
    expect(container.textContent).toContain("network down");
    expect(container.querySelector('[role="img"]')).toBeFalsy();

    reportsServiceMock.getCenterOverview.mockResolvedValueOnce(DATA);
    await click(container.querySelector('[data-testid="center-reports-retry"]'));

    expect(
      container.querySelector('[data-testid="center-reports-error"]'),
    ).toBeFalsy();
    expect(container.textContent).toContain("الصف الثالث الإعدادي");
    expect(reportsServiceMock.getCenterOverview).toHaveBeenCalledTimes(2);
  });

  it("keeps the per-teacher section out of a solo center", async () => {
    reportsServiceMock.getCenterOverview.mockResolvedValue({
      ...DATA,
      centerType: "SoloTeacher",
      soloTeacherSubject: "الرياضيات",
      teachers: [],
    });

    await renderPage();

    expect(container.textContent).not.toContain("بالمدرسون");
    expect(container.textContent).toContain("المادة");
    expect(container.textContent).toContain("الرياضيات");
  });
});
