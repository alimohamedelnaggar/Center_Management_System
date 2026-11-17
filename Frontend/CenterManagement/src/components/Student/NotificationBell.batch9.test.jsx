// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";

vi.mock("react-hot-toast", () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@/services/signalr/notificationSignalR", () => ({
  startNotificationConnection: vi.fn(),
  notificationConnection: { on: vi.fn(), off: vi.fn() },
}));

import NotificationBell from "./NotificationBell";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;
let service;

const flush = async () => {
  for (let i = 0; i < 5; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
};

const renderBell = async () => {
  await act(async () => {
    root.render(
      h(
        MemoryRouter,
        null,
        h(NotificationBell, {
          service,
          viewAllPath: "/student/notifications",
        }),
      ),
    );
  });
  await flush();
};

const panel = () => container.querySelector('[data-testid="notification-panel"]');
const badge = () =>
  container.querySelector('[data-testid="notification-unread-count"]');
const bellButton = () =>
  container.querySelector('[data-testid="notification-bell-button"]');

const click = async (element) => {
  await act(async () => {
    element.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true }),
    );
  });
  await flush();
};

const panelItem = (title) =>
  [...panel().querySelectorAll("button")].find((button) =>
    button.textContent.includes(title),
  );

const ITEMS = [
  {
    id: "n1",
    title: "تم تسجيل غياب",
    body: "غاب الطالب عن حصة اليوم",
    isRead: false,
    createdAt: "2026-11-10T08:00:00",
  },
  {
    id: "n2",
    title: "دفعة جديدة",
    body: "تم تسجيل دفعة شهر نوفمبر",
    isRead: true,
    createdAt: "2026-11-09T08:00:00",
  },
];

beforeEach(() => {
  service = {
    getUnreadCount: vi.fn().mockResolvedValue({ succeeded: true, data: 2 }),
    getNotifications: vi
      .fn()
      .mockResolvedValue({ succeeded: true, data: { data: ITEMS } }),
    markRead: vi.fn().mockResolvedValue({ succeeded: true }),
    markAllRead: vi.fn().mockResolvedValue({ succeeded: true }),
  };

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

describe("the notification bell (batch 9)", () => {
  it("shows the unread count and opens a labelled panel", async () => {
    await renderBell();

    expect(badge().textContent).toBe("2");
    expect(bellButton().getAttribute("aria-expanded")).toBe("false");

    await click(bellButton());

    expect(bellButton().getAttribute("aria-expanded")).toBe("true");
    expect(panel()).toBeTruthy();
    expect(panel().getAttribute("role")).toBe("dialog");
    expect(container.textContent).toContain("تم تسجيل غياب");
    expect(container.textContent).toContain("دفعة جديدة");
    expect(container.textContent).toContain("عرض الكل");
  });

  it("marks a single notification as read and lowers the counter", async () => {
    await renderBell();
    await click(bellButton());

    expect(container.querySelectorAll('[aria-label="غير مقروء"]')).toHaveLength(1);

    await click(panelItem("تم تسجيل غياب"));

    expect(service.markRead).toHaveBeenCalledWith("n1");
    expect(badge().textContent).toBe("1");
    expect(container.querySelectorAll('[aria-label="غير مقروء"]')).toHaveLength(0);
  });

  it("marks every notification as read and hides the counter", async () => {
    await renderBell();
    await click(bellButton());

    await click(container.querySelector('[data-testid="notification-mark-all"]'));

    expect(service.markAllRead).toHaveBeenCalledTimes(1);
    expect(badge()).toBeFalsy();
    expect(container.querySelectorAll('[aria-label="غير مقروء"]')).toHaveLength(0);
  });

  it("shows an explicit error and retries the list", async () => {
    service.getNotifications.mockRejectedValueOnce(new Error("offline"));

    await renderBell();
    await click(bellButton());

    const alert = container.querySelector('[data-testid="notification-error"]');
    expect(alert).toBeTruthy();
    expect(alert.getAttribute("role")).toBe("alert");
    expect(container.textContent).toContain("offline");

    service.getNotifications.mockResolvedValueOnce({
      succeeded: true,
      data: { data: ITEMS },
    });
    await click(container.querySelector('[data-testid="notification-retry"]'));

    expect(container.querySelector('[data-testid="notification-error"]')).toBeFalsy();
    expect(container.textContent).toContain("تم تسجيل غياب");
  });

  it("closes the panel with Escape", async () => {
    await renderBell();
    await click(bellButton());
    expect(panel()).toBeTruthy();

    await act(async () => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
    });
    await flush();

    expect(panel()).toBeFalsy();
    expect(bellButton().getAttribute("aria-expanded")).toBe("false");
  });
});
