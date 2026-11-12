// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";

/**
 * Batch 4 proof for the group screens:
 *   - editing a group preloads the per-session price, the sessions-per-month
 *     and the real weekly schedule, and saves all of them back untouched;
 *   - creating a group sends SessionsPerMonth to the API.
 *
 * Regression guard for the edit-gap where changing the monthly price used to
 * wipe the schedule / per-session price on the server.
 */

const groupsServiceMock = vi.hoisted(() => ({
  getAll: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}));

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

const hubMock = vi.hoisted(() => ({
  on: vi.fn(),
  off: vi.fn(),
}));

vi.mock("@/context/useAuth", () => ({
  useAuth: () => ({
    isSoloCenter: true,
    centerTypeLoaded: true,
    canManageGroups: true,
  }),
}));

vi.mock("react-hot-toast", () => ({
  __esModule: true,
  default: toastMock,
  toast: toastMock,
}));

vi.mock("@/services/groupsService", () => ({
  groupsService: groupsServiceMock,
}));

vi.mock("@/services/teacherService", () => ({
  teacherService: { getPaginated: vi.fn().mockResolvedValue([]) },
}));

vi.mock("@/services/signalr/groupHub", () => ({
  groupConnection: hubMock,
  startGroupConnection: vi.fn(),
}));

vi.mock("@/services/signalr/sessionHub", () => ({
  sessionConnection: hubMock,
  startSessionConnection: vi.fn(),
}));

vi.mock("@/services/sessionsService", () => ({
  sessionsService: {
    getByGroup: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import GroupsList from "./GroupsList";
import AddGroupForm from "./AddGroupForm";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const GROUPS = [
  {
    id: "g1",
    name: "مجموعة الصف الثالث الثانوي",
    monthlyPrice: 300,
    perSessionPrice: 40,
    sessionsPerMonth: 4,
    totalStudentsCount: 4,
    teacherId: null,
    schedule: [
      { dayOfWeek: 6, startTime: "17:00:00", endTime: "19:00:00" },
      { dayOfWeek: 1, startTime: "16:00:00", endTime: "18:00:00" },
    ],
  },
];

let container;
let root;

const flush = async () => {
  for (let i = 0; i < 10; i += 1) {
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

const buttonByText = (label) =>
  [...container.querySelectorAll("button")].find(
    (element) => element.textContent.trim() === label,
  );

const inputValue = (element, value) => {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  ).set;
  setter.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

const setValue = async (selector, value) => {
  const element = container.querySelector(selector);
  expect(element).toBeTruthy();
  await act(async () => {
    inputValue(element, value);
  });
  await flush();
};

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  groupsServiceMock.getAll.mockResolvedValue(GROUPS);
  groupsServiceMock.create.mockResolvedValue({ succeeded: true });
  groupsServiceMock.update.mockResolvedValue({ succeeded: true });
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
  });
  container.remove();
  vi.clearAllMocks();
});

describe("groups batch 4", () => {
  it("preloads and keeps the per-session price, sessions and schedule when editing", async () => {
    await render(h(GroupsList));

    await click(container.querySelector('[data-testid="group-edit-g1"]'));

    expect(container.querySelector('[data-testid="group-edit-modal"]')).toBeTruthy();
    expect(container.querySelector("#group-session-price").value).toBe("40");
    expect(container.querySelector("#group-sessions-per-month").value).toBe("4");
    expect(container.querySelector("#group-day-0-start").value).toBe("17:00");
    expect(container.querySelector("#group-day-0-end").value).toBe("19:00");
    expect(container.querySelector("#group-day-2-start").value).toBe("16:00");
    expect(container.querySelector("#group-day-2-end").value).toBe("18:00");

    // Change only the monthly price and save.
    await setValue("#group-monthly-price", "350");
    await click(buttonByText("حفظ التعديلات"));

    expect(groupsServiceMock.update).toHaveBeenCalledTimes(1);

    const payload = groupsServiceMock.update.mock.calls[0][0];

    expect(payload).toEqual({
      Id: "g1",
      Name: "مجموعة الصف الثالث الثانوي",
      MonthlyPrice: 350,
      PerSessionPrice: 40,
      SessionsPerMonth: 4,
      Schedule: [
        { DayIndex: 0, StartTime: "17:00", EndTime: "19:00" },
        { DayIndex: 2, StartTime: "16:00", EndTime: "18:00" },
      ],
    });
  });

  it("sends SessionsPerMonth when creating a group", async () => {
    const onSuccess = vi.fn();

    await render(h(AddGroupForm, { onSuccess }));

    await setValue("#group-name", "مجموعة اختبار");
    await setValue("#group-monthly-price", "300");
    await setValue("#group-session-price", "40");

    // Selecting Saturday renders its time row; sessions per month auto = 4.
    await click(buttonByText("السبت"));

    expect(container.querySelector("#group-sessions-per-month").value).toBe("4");

    await setValue("#group-day-0-start", "17:00");
    await setValue("#group-day-0-end", "19:00");

    await click(buttonByText("إنشاء المجموعة"));

    expect(groupsServiceMock.create).toHaveBeenCalledTimes(1);

    const payload = groupsServiceMock.create.mock.calls[0][0];

    expect(payload).toEqual({
      Name: "مجموعة اختبار",
      MonthlyPrice: 300,
      PerSessionPrice: 40,
      SessionsPerMonth: 4,
      TeacherId: null,
      Schedule: [{ dayIndex: 0, startTime: "17:00", endTime: "19:00" }],
    });
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });
});
