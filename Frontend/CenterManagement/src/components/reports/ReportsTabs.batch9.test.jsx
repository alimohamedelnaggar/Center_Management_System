// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";

const teacherMock = vi.hoisted(() => ({ getPaginated: vi.fn() }));
const groupsMock = vi.hoisted(() => ({ getAll: vi.fn() }));

vi.mock("react-hot-toast", () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@/services/teacherService", () => ({ teacherService: teacherMock }));
vi.mock("@/services/groupsService", () => ({ groupsService: groupsMock }));

import ReportsTeachersTab from "./ReportsTeachersTab";
import ReportsGroupsTab from "./ReportsGroupsTab";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

const flush = async () => {
  for (let i = 0; i < 5; i += 1) {
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
  await act(async () => {
    element.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true }),
    );
  });
  await flush();
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

describe("the teachers report tab (batch 9)", () => {
  it("shows an error and retries instead of staying empty", async () => {
    teacherMock.getPaginated.mockRejectedValueOnce(new Error("boom"));

    await render(h(ReportsTeachersTab));

    const alert = container.querySelector('[data-testid="reports-teachers-error"]');
    expect(alert).toBeTruthy();
    expect(alert.getAttribute("role")).toBe("alert");

    teacherMock.getPaginated.mockResolvedValueOnce({
      data: [
        {
          id: "t1",
          fullName: "أ. محمد عبد الرحمن السيد الطويل جدًا",
          phoneNumber: "01000000003",
          groups: [{ id: "g1", name: "المجموعة أ" }],
        },
      ],
      totalPages: 1,
      totalCount: 1,
    });

    await click(container.querySelector('[data-testid="reports-teachers-retry"]'));

    expect(container.querySelector('[data-testid="reports-teachers-error"]')).toBeFalsy();
    expect(container.textContent).toContain("أ. محمد عبد الرحمن السيد الطويل جدًا");
    expect(container.querySelector("[data-scroll-region]")).toBeTruthy();
    expect(container.textContent).toContain("اسحب الجدول أفقيًا");
  });
});

describe("the groups report tab (batch 9)", () => {
  const groups = [
    {
      id: "g1",
      name: "الصف الثالث الإعدادي — المجموعة الطويلة جدًا",
      totalStudentsCount: 1_000_000,
      sessionsPerMonth: 8,
      monthlyPrice: 20,
    },
  ];

  it("shows big numbers without truncating them and recovers from an error", async () => {
    groupsMock.getAll.mockRejectedValueOnce(new Error("boom"));

    await render(h(ReportsGroupsTab));

    expect(
      container.querySelector('[data-testid="reports-groups-error"]'),
    ).toBeTruthy();

    groupsMock.getAll.mockResolvedValueOnce({
      data: groups,
      totalPages: 1,
      totalCount: 1,
    });

    await click(container.querySelector('[data-testid="reports-groups-retry"]'));

    expect(container.querySelector('[data-testid="reports-groups-error"]')).toBeFalsy();
    expect(container.textContent).toContain("1000000");
    expect(container.textContent).toContain("20,000,000");
    expect(container.textContent).toContain("الصف الثالث الإعدادي");
    expect(container.querySelector("[data-scroll-region]")).toBeTruthy();
  });

  it("renders an empty state instead of a broken table", async () => {
    groupsMock.getAll.mockResolvedValue({
      data: [],
      totalPages: 1,
      totalCount: 0,
    });

    await render(h(ReportsGroupsTab));

    expect(container.textContent).toContain("لا توجد مجموعات بعد");
    expect(container.querySelector("table")).toBeFalsy();
  });
});
