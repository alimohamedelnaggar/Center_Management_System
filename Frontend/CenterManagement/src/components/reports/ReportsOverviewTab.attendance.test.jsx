// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";

const reportsServiceMock = vi.hoisted(() => ({
  getOverview: vi.fn(),
}));

vi.mock("react-hot-toast", () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@/services/reportsService", () => ({
  reportsService: reportsServiceMock,
}));

import ReportsOverviewTab from "./ReportsOverviewTab";

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

const render = async (overview) => {
  reportsServiceMock.getOverview.mockResolvedValue(overview);

  await act(async () => {
    root.render(h(ReportsOverviewTab));
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

describe("ReportsOverviewTab attendance", () => {
  it("shows the four statuses and the unified percentage", async () => {
    await render({
      presentCount: 10,
      absentCount: 2,
      lateCount: 3,
      excusedCount: 5,
      totalCount: 20,
      attendancePercentage: 86.67,
    });

    const text = container.textContent;

    expect(text).toContain("حضور (الشهر)");
    expect(text).toContain("غياب (الشهر)");
    expect(text).toContain("تأخر (الشهر)");
    expect(text).toContain("بعذر (الشهر)");
    expect(text).toContain("86.67%");
  });

  it("shows a dash when every session was excused", async () => {
    await render({
      presentCount: 0,
      absentCount: 0,
      lateCount: 0,
      excusedCount: 5,
      totalCount: 5,
      attendancePercentage: null,
    });

    expect(container.textContent).toContain("—");
    expect(container.textContent).not.toContain("0%");
  });
});
