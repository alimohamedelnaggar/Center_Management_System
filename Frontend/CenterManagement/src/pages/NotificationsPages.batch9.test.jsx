// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";

const studentMock = vi.hoisted(() => ({
  getNotifications: vi.fn(),
  markRead: vi.fn(),
  markAllRead: vi.fn(),
}));

const parentMock = vi.hoisted(() => ({
  getNotifications: vi.fn(),
  markRead: vi.fn(),
  markAllRead: vi.fn(),
}));

vi.mock("react-hot-toast", () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@/services/studentPortalService", () => ({
  studentPortalService: studentMock,
}));

vi.mock("@/services/parentPortalService", () => ({
  parentPortalService: parentMock,
}));

import StudentNotificationsPage from "./StudentPortalPages/StudentNotificationsPage";
import ParentNotificationsPage from "./ParentPortalPages/ParentNotificationsPage";

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

const renderPage = async (element) => {
  await act(async () => {
    root.render(h(MemoryRouter, null, element));
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

const retryButton = () =>
  [...container.querySelectorAll("button")].find((button) =>
    button.textContent.includes("إعادة المحاولة"),
  );

const ITEMS = {
  succeeded: true,
  data: {
    data: [
      {
        id: "n1",
        title: "إشعار تجريبي",
        body: "نص الإشعار",
        isRead: false,
        createdAt: "2026-11-10T08:00:00",
      },
    ],
    currentPage: 1,
    totalPages: 1,
    totalCount: 1,
  },
};

beforeEach(() => {
  studentMock.getNotifications.mockReset();
  parentMock.getNotifications.mockReset();
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

describe("the student notifications page (batch 9)", () => {
  it("shows an explicit error and retries the list", async () => {
    studentMock.getNotifications.mockRejectedValueOnce(new Error("offline"));

    await renderPage(h(StudentNotificationsPage));

    const alert = container.querySelector(
      '[data-testid="student-notifications-error"]',
    );
    expect(alert).toBeTruthy();
    expect(alert.getAttribute("role")).toBe("alert");
    expect(container.textContent).toContain("offline");

    studentMock.getNotifications.mockResolvedValueOnce(ITEMS);
    await click(retryButton());

    expect(
      container.querySelector('[data-testid="student-notifications-error"]'),
    ).toBeFalsy();
    expect(container.textContent).toContain("إشعار تجريبي");
  });

  it("renders the empty state when the student has no notifications", async () => {
    studentMock.getNotifications.mockResolvedValue({
      succeeded: true,
      data: { data: [], currentPage: 1, totalPages: 1, totalCount: 0 },
    });

    await renderPage(h(StudentNotificationsPage));

    expect(container.textContent).toContain("لا توجد إشعارات.");
    expect(container.textContent).not.toContain("تعذّر تحميل الإشعارات");
  });
});

describe("the parent notifications page (batch 9)", () => {
  it("shows an explicit error and retries the list", async () => {
    parentMock.getNotifications.mockRejectedValueOnce(new Error("offline"));

    await renderPage(h(ParentNotificationsPage));

    const alert = container.querySelector(
      '[data-testid="parent-notifications-error"]',
    );
    expect(alert).toBeTruthy();
    expect(alert.getAttribute("role")).toBe("alert");

    parentMock.getNotifications.mockResolvedValueOnce(ITEMS);
    await click(retryButton());

    expect(
      container.querySelector('[data-testid="parent-notifications-error"]'),
    ).toBeFalsy();
    expect(container.textContent).toContain("إشعار تجريبي");
  });
});
