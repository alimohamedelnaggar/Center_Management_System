// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";

/**
 * Render -> click -> save proof for the four attendance statuses on the real
 * AttendanceSheet:
 *   - the default card click keeps the old present <-> absent toggle,
 *   - Late / Excused come from the small per-student menu,
 *   - the bulk action applies any of the four statuses,
 *   - the save payload carries the numeric status of each student.
 */

const attendanceServiceMock = vi.hoisted(() => ({
  getGroups: vi.fn(),
  getSessionsByGroupId: vi.fn(),
  getStudentsForAttendance: vi.fn(),
  saveAttendance: vi.fn(),
  getAttendanceStats: vi.fn(),
  scanAttendance: vi.fn(),
}));

const groupsServiceMock = vi.hoisted(() => ({
  getAll: vi.fn(),
}));

const hubMock = vi.hoisted(() => ({
  on: vi.fn(),
  off: vi.fn(),
}));

vi.mock("@/context/useAuth", () => ({
  useAuth: () => ({
    user: { fullName: "QA Assistant" },
    hasModule: () => true,
    hasCenterModule: () => true,
  }),
}));

vi.mock("@/context/useBranding", () => ({
  useBranding: () => ({ center: { name: "Center" } }),
}));

vi.mock("react-hot-toast", () => ({
  default: { error: vi.fn(), success: vi.fn(), __esModule: true },
}));

vi.mock("@/services/attendanceService", () => ({
  attendanceService: attendanceServiceMock,
}));

vi.mock("@/services/groupsService", () => ({
  groupsService: groupsServiceMock,
}));

vi.mock("@/services/signalr/attendanceHub", () => ({
  attendanceConnection: hubMock,
  startAttendanceConnection: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/components/common/Pagination", () => ({ default: () => null }));
vi.mock("@/components/common/QrScannerModal", () => ({ default: () => null }));
vi.mock("@/pages/AttendancePages/AttendanceStatsCards", () => ({
  default: () => null,
}));

import AttendanceSheet from "./AttendanceSheet";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const STUDENTS = [
  { id: "st1", fullName: "طالب أ", parentPhoneNumber: "01000000001" },
  { id: "st2", fullName: "طالب ب", parentPhoneNumber: "01000000002", status: 3 },
];

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

const renderSheet = async () => {
  await act(async () => {
    root.render(h(AttendanceSheet));
  });

  await flush();
};

const cardOf = (name) => {
  const heading = [...container.querySelectorAll("h4")].find(
    (element) => element.textContent === name,
  );

  return heading?.closest(".relative");
};

const click = async (element) => {
  expect(element).toBeTruthy();

  await act(async () => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await flush();
};

const buttonByText = (label) =>
  [...container.querySelectorAll("button")].find(
    (element) => element.textContent.trim() === label,
  );

const buttonByLabel = (label) =>
  [...container.querySelectorAll("button")].find(
    (element) => element.getAttribute("aria-label") === label,
  );

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  groupsServiceMock.getAll.mockResolvedValue({
    items: [{ id: "g1", name: "مجموعة أ" }],
  });
  attendanceServiceMock.getSessionsByGroupId.mockResolvedValue([
    { id: "s1", startTime: "16:00:00", endTime: "18:00:00" },
  ]);
  attendanceServiceMock.getStudentsForAttendance.mockResolvedValue({
    data: { items: STUDENTS, totalCount: STUDENTS.length, totalPages: 1 },
  });
  attendanceServiceMock.saveAttendance.mockResolvedValue({ succeeded: true });
  attendanceServiceMock.getAttendanceStats.mockResolvedValue({
    succeeded: true,
    data: {},
  });
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
  });
  container.remove();
  vi.clearAllMocks();
});

describe("AttendanceSheet four statuses", () => {
  it("renders the stored statuses and keeps present <-> absent on one click", async () => {
    await renderSheet();

    expect(cardOf("طالب أ").textContent).toContain("حاضر");
    expect(cardOf("طالب ب").textContent).toContain("متأخر");

    await click(cardOf("طالب أ").querySelector("h4"));

    expect(cardOf("طالب أ").textContent).toContain("غائب");
    expect(cardOf("طالب ب").textContent).toContain("متأخر");
  });

  it("picks Late / Excused from the small menu and saves all four statuses", async () => {
    await renderSheet();

    // Present -> Absent with one click.
    await click(cardOf("طالب أ").querySelector("h4"));
    // st2 is Late already; make it Excused from the menu.
    await click(buttonByLabel("تغيير حالة طالب ب"));
    await click(buttonByText("بعذر"));

    expect(cardOf("طالب أ").textContent).toContain("غائب");
    expect(cardOf("طالب ب").textContent).toContain("بعذر");

    await click(buttonByText("حفظ الحضور"));

    expect(attendanceServiceMock.saveAttendance).toHaveBeenCalledTimes(1);

    const payload = attendanceServiceMock.saveAttendance.mock.calls[0][0];

    expect(payload.sessionId).toBe("s1");
    expect(payload.attendances).toEqual([
      { studentId: "st1", status: 2, notes: "" },
      { studentId: "st2", status: 4, notes: "" },
    ]);
  });

  it("applies any status to every student with the bulk action", async () => {
    await renderSheet();

    const bulkSelect = container.querySelector(
      'select[aria-label="حالة التسجيل الجماعي"]',
    );

    await act(async () => {
      bulkSelect.value = "3";
      bulkSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });

    await click(buttonByText("تطبيق"));

    expect(cardOf("طالب أ").textContent).toContain("متأخر");
    expect(cardOf("طالب ب").textContent).toContain("متأخر");

    await click(buttonByText("حفظ الحضور"));

    const payload = attendanceServiceMock.saveAttendance.mock.calls[0][0];
    expect(payload.attendances.map((item) => item.status)).toEqual([3, 3]);
  });

  it("shows the four counters and the unified rate of the sheet", async () => {
    await renderSheet();

    // st1 present, st2 late -> (1 + 1) / (2 - 0) = 100%
    expect(container.textContent).toContain("حاضر: 1");
    expect(container.textContent).toContain("غياب: 0");
    expect(container.textContent).toContain("تأخر: 1");
    expect(container.textContent).toContain("بعذر: 0");
    expect(container.textContent).toContain("النسبة: 100%");

    // Click st1 to absent -> Late only, 1 / 2 = 50%
    await click(cardOf("طالب أ").querySelector("h4"));

    expect(container.textContent).toContain("غياب: 1");
    expect(container.textContent).toContain("النسبة: 50%");
  });
});
