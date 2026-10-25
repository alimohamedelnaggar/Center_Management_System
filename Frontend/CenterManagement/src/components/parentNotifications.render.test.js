import { describe, expect, it, vi } from "vitest";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

/**
 * The parent notification surface: the layout must expose the live unread
 * badge, the full page must be a normal parent-portal page, and every
 * notification must know which child page it opens.
 */

const state = vi.hoisted(() => ({
  auth: { logout: () => {} },
  theme: { isDark: false, toggle: () => {} },
}));

vi.mock("@/context/useAuth", () => ({ useAuth: () => state.auth }));
vi.mock("@/context/useTheme", () => ({ useTheme: () => state.theme }));

import ParentLayout from "@/layouts/ParentLayout";
import ParentNotificationsPage, {
  notificationChildPath,
} from "@/pages/ParentPortalPages/ParentNotificationsPage";

function renderAt(element) {
  return renderToStaticMarkup(h(MemoryRouter, { initialEntries: ["/parent"] }, element));
}

describe("notificationChildPath", () => {
  it("opens the child page the notification belongs to", () => {
    expect(notificationChildPath({ studentId: "abc" })).toBe(
      "/parent/children/abc",
    );
  });

  it("returns null when the notification has no child", () => {
    expect(notificationChildPath({})).toBe(null);
    expect(notificationChildPath(null)).toBe(null);
    expect(notificationChildPath({ studentId: null })).toBe(null);
  });
});

describe("ParentNotificationsPage", () => {
  it("renders the parent-portal notification screen", () => {
    const html = renderAt(h(ParentNotificationsPage));

    expect(html).toContain("الإشعارات");
    expect(html).toContain("كل التنبيهات الخاصة بأبنائك");
    expect(html).toContain("تعليم الكل كمقروء");
    expect(html).toContain("جاري التحميل");
  });
});

describe("ParentLayout", () => {
  it("exposes the unread notification badge", () => {
    const html = renderAt(h(ParentLayout));

    expect(html).toContain("بوابة ولي الأمر");
    expect(html).toContain('aria-label="الإشعارات"');
    expect(html).toContain("title=\"الإشعارات\"");
  });
});
