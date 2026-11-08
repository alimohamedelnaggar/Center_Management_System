// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";

/**
 * The attendance screen must build its absence notice from the saved backend
 * template, not from a hardcoded string. Editing the template changes the text
 * inside the wa.me link opened from a student card.
 */

const authState = vi.hoisted(() => ({
  auth: {
    user: { fullName: "QA Assistant" },
    accessToken: "test-token",
    hasModule: () => true,
    hasCenterModule: () => true,
  },
}));

const attendanceServiceMock = vi.hoisted(() => ({
  getGroups: vi.fn(),
  getSessionsByGroupId: vi.fn(),
  getStudentsForAttendance: vi.fn(),
  saveAttendance: vi.fn(),
  getStats: vi.fn(),
  scanAttendance: vi.fn(),
}));

const groupsServiceMock = vi.hoisted(() => ({
  getAll: vi.fn(),
}));

const templateServiceMock = vi.hoisted(() => ({
  list: vi.fn(),
  update: vi.fn(),
  reset: vi.fn(),
  preview: vi.fn(),
}));

const hubMock = vi.hoisted(() => ({
  on: vi.fn(),
  off: vi.fn(),
}));

vi.mock("@/context/useAuth", () => ({ useAuth: () => authState.auth }));
vi.mock("@/context/useBranding", () => ({
  useBranding: () => ({ center: { name: "مركز النور" } }),
}));
vi.mock("@/services/attendanceService", () => ({
  attendanceService: attendanceServiceMock,
}));
vi.mock("@/services/groupsService", () => ({
  groupsService: groupsServiceMock,
}));
vi.mock("@/services/messageTemplateService", () => ({
  messageTemplateService: templateServiceMock,
}));
vi.mock("@/services/signalr/attendanceHub", () => ({
  attendanceConnection: hubMock,
  startAttendanceConnection: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("react-hot-toast", () => {
  const toast = vi.fn();
  toast.success = vi.fn();
  toast.error = vi.fn();
  return { default: toast };
});

vi.mock("@/components/common/Pagination", () => ({ default: () => null }));
vi.mock("@/components/common/QrScannerModal", () => ({ default: () => null }));
vi.mock("@/pages/AttendancePages/AttendanceStatsCards", () => ({
  default: () => null,
}));

import AttendanceSheet from "./AttendanceSheet";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const CUSTOM_ABSENCE =
  "تنبيه غياب مخصص للطالب {student} من {group} يوم {date}.\nمع تحيات {center}.";

const STUDENTS = [
  { id: "st1", fullName: "طالب أ", parentPhoneNumber: "01000000001" },
];

let container;
let root;

const flush = async (delay = 0) => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, delay));
  });

  for (let i = 0; i < 5; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
};

const renderSheet = async () => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  await act(async () => {
    root.render(h(AttendanceSheet));
  });

  await flush(50);
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
  await flush(50);
};

beforeEach(() => {
  vi.clearAllMocks();

  groupsServiceMock.getAll.mockResolvedValue({
    items: [{ id: "g1", name: "مجموعة أ" }],
  });
  attendanceServiceMock.getSessionsByGroupId.mockResolvedValue([
    { id: "s1", startTime: "16:00:00", endTime: "18:00:00" },
  ]);
  attendanceServiceMock.getStudentsForAttendance.mockResolvedValue({
    data: { items: STUDENTS, totalCount: STUDENTS.length, totalPages: 1 },
  });
  attendanceServiceMock.getStats.mockResolvedValue({
    succeeded: true,
    data: {},
  });

  templateServiceMock.list.mockResolvedValue({
    succeeded: true,
    message: "",
    data: [
      {
        key: "absence",
        body: CUSTOM_ABSENCE,
        defaultBody: CUSTOM_ABSENCE,
        isCustomized: true,
        maxLength: 500,
        placeholders: [
          { key: "student", label: "اسم الطالب" },
          { key: "group", label: "اسم المجموعة" },
          { key: "center", label: "اسم المركز" },
          { key: "date", label: "التاريخ" },
        ],
      },
    ],
  });
});

afterEach(async () => {
  if (root) {
    await act(async () => root.unmount());
    root = null;
  }
  if (container) {
    container.remove();
    container = null;
  }
  vi.unstubAllGlobals();
});

describe("AttendanceSheet WhatsApp absence notice", () => {
  it("opens wa.me with the saved backend template", async () => {
    const openMock = vi.fn();
    vi.stubGlobal("open", openMock);

    await renderSheet();

    expect(templateServiceMock.list).toHaveBeenCalled();

    const card = cardOf("طالب أ");
    await click(card.querySelector("h4"));

    const whatsapp = card.querySelector(
      'button[title="إرسال إشعار غياب عبر واتساب"]',
    );
    await click(whatsapp);

    expect(openMock).toHaveBeenCalledTimes(1);

    const link = openMock.mock.calls[0][0];
    expect(link).toContain("https://wa.me/201000000001?text=");

    const text = decodeURIComponent(link.split("text=")[1]);
    expect(text).toContain("تنبيه غياب مخصص للطالب طالب أ");
    expect(text).toContain("مجموعة أ");
    expect(text).toContain("مع تحيات مركز النور.");
    expect(text).not.toContain("نحيطكم علماً");
  });
});
