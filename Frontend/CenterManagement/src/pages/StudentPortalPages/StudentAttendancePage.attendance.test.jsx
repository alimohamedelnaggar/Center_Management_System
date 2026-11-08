// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";

const studentPortalServiceMock = vi.hoisted(() => ({
  getAttendance: vi.fn(),
}));

vi.mock("react-hot-toast", () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@/services/studentPortalService", () => ({
  studentPortalService: studentPortalServiceMock,
}));

import StudentAttendancePage from "./StudentAttendancePage";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

const flush = async () => {
  for (let i = 0; i < 4; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
};

beforeEach(async () => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  studentPortalServiceMock.getAttendance.mockResolvedValue({
    succeeded: true,
    data: {
      totalSessions: 10,
      presentCount: 4,
      absentCount: 2,
      lateCount: 3,
      excusedCount: 1,
      attendancePercentage: null,
      records: [
        {
          attendanceDate: "2026-11-01",
          groupName: "مجموعة أ",
          dayOfWeek: "الأحد",
          startTime: "16:00",
          endTime: "18:00",
          status: 3,
          statusName: "متأخر",
        },
        {
          attendanceDate: "2026-11-02",
          groupName: "مجموعة أ",
          dayOfWeek: "الإثنين",
          startTime: "16:00",
          endTime: "18:00",
          status: 4,
          statusName: "بعذر",
        },
      ],
    },
  });

  await act(async () => {
    root.render(h(StudentAttendancePage));
  });
  await flush();
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
  });
  container.remove();
  vi.clearAllMocks();
});

describe("StudentAttendancePage four statuses", () => {
  it("shows Late / Excused cards and rows", () => {
    const text = container.textContent;

    expect(text).toContain("متأخر");
    expect(text).toContain("بعذر");
    expect(text).toContain("3");
    expect(text).toContain("1");
  });

  it("shows a dash, never 0%, when the rate is not countable", () => {
    expect(container.textContent).toContain("—");
    expect(container.textContent).not.toContain("0%");
  });
});
