import { describe, expect, it } from "vitest";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import AttendanceStatsCards from "./AttendanceStatsCards";

describe("AttendanceStatsCards", () => {
  it("renders a card for each of the four statuses plus the unified rate", () => {
    const html = renderToStaticMarkup(
      h(AttendanceStatsCards, {
        loading: false,
        stats: {
          presentToday: 8,
          absentToday: 2,
          lateToday: 3,
          excusedToday: 1,
          presentThisMonth: 40,
          absentThisMonth: 5,
          lateThisMonth: 9,
          excusedThisMonth: 4,
          attendanceRate: 83.33,
        },
      }),
    );

    expect(html).toContain("حضور اليوم");
    expect(html).toContain("غياب اليوم");
    expect(html).toContain("متأخر اليوم");
    expect(html).toContain("بعذر اليوم");
    expect(html).toContain("نسبة الحضور");
    expect(html).toContain("83.33%");
    expect(html).toContain("هذا الشهر: 9");
  });

  it("shows a dash instead of 0% when nothing is countable", () => {
    const html = renderToStaticMarkup(
      h(AttendanceStatsCards, {
        loading: false,
        stats: { attendanceRate: null, excusedToday: 4, excusedThisMonth: 12 },
      }),
    );

    expect(html).toContain("—");
    expect(html).not.toContain("0%");
  });
});
