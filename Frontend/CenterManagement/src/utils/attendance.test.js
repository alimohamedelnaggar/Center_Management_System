import { describe, expect, it } from "vitest";
import {
  ATTENDANCE_STATUS,
  ATTENDANCE_STATUS_META,
  attendanceStatusLabel,
  calculateAttendanceRate,
  formatAttendanceRate,
  getAttendanceStatusMeta,
  normalizeAttendanceStatus,
  summarizeAttendance,
} from "./attendance";

/**
 * The frontend rate must be the API formula exactly:
 *   (Present + Late) / (Total - Excused)
 * with null when the denominator is not positive. AttendanceSheet,
 * AttendanceStatsCards, the dashboards, the reports, the export and both
 * portals all use these functions, so these cases pin the shared behaviour.
 */

describe("calculateAttendanceRate", () => {
  it("returns 100 when every session is present", () => {
    expect(
      calculateAttendanceRate({ present: 5, total: 5 }),
    ).toBe(100);
  });

  it("returns null when every session is excused", () => {
    expect(
      calculateAttendanceRate({ present: 0, excused: 5, total: 5 }),
    ).toBeNull();
  });

  it("returns null for an empty range", () => {
    expect(calculateAttendanceRate({ total: 0 })).toBeNull();
    expect(calculateAttendanceRate()).toBeNull();
  });

  it("counts late as attended", () => {
    expect(calculateAttendanceRate({ late: 4, total: 4 })).toBe(100);
  });

  it("counts present + late over the non-excused denominator", () => {
    // 3 present + 2 late = 5 attended out of 10 - 4 excused = 6
    expect(
      calculateAttendanceRate({
        present: 3,
        absences: 1,
        absent: 1,
        late: 2,
        excused: 4,
        total: 10,
      }),
    ).toBeCloseTo(83.33, 2);
  });

  it("removes excused sessions from the denominator", () => {
    // 3 present of the 4 countable sessions, 6 excused of 10 total.
    expect(
      calculateAttendanceRate({
        present: 3,
        absent: 1,
        excused: 6,
        total: 10,
      }),
    ).toBe(75);
  });

  it("never lets absent sessions count as attended", () => {
    expect(
      calculateAttendanceRate({ present: 0, absent: 5, total: 5 }),
    ).toBe(0);
  });

  it("rounds like C# Math.Round (half to even) so both sides match", () => {
    // 1 / 32 = 3.125 -> 3.12 (banker's rounding), not 3.13.
    expect(calculateAttendanceRate({ present: 1, total: 32 })).toBe(3.12);
    // 1 / 16 = 6.25 with one decimal -> 6.2 (even), not 6.3.
    expect(calculateAttendanceRate({ present: 1, total: 16 }, 1)).toBe(6.2);
  });
});

describe("formatAttendanceRate", () => {
  it("prints a percentage", () => {
    expect(formatAttendanceRate(83.33)).toBe("83.33%");
  });

  it("shows a dash instead of a fake zero for an uncountable range", () => {
    expect(formatAttendanceRate(null)).toBe("—");
    expect(formatAttendanceRate(undefined)).toBe("—");
    expect(formatAttendanceRate(Number.NaN)).toBe("—");
  });
});

describe("normalizeAttendanceStatus", () => {
  it("accepts the numeric enum", () => {
    expect(normalizeAttendanceStatus(1)).toBe(ATTENDANCE_STATUS.PRESENT);
    expect(normalizeAttendanceStatus(2)).toBe(ATTENDANCE_STATUS.ABSENT);
    expect(normalizeAttendanceStatus(3)).toBe(ATTENDANCE_STATUS.LATE);
    expect(normalizeAttendanceStatus(4)).toBe(ATTENDANCE_STATUS.EXCUSED);
  });

  it("accepts enum names and Arabic labels", () => {
    expect(normalizeAttendanceStatus("Late")).toBe(ATTENDANCE_STATUS.LATE);
    expect(normalizeAttendanceStatus("present")).toBe(ATTENDANCE_STATUS.PRESENT);
    expect(normalizeAttendanceStatus("غائب")).toBe(ATTENDANCE_STATUS.ABSENT);
    expect(normalizeAttendanceStatus("متأخر")).toBe(ATTENDANCE_STATUS.LATE);
    expect(normalizeAttendanceStatus("بعذر")).toBe(ATTENDANCE_STATUS.EXCUSED);
  });

  it("rejects unknown values", () => {
    expect(normalizeAttendanceStatus(null)).toBeNull();
    expect(normalizeAttendanceStatus("")).toBeNull();
    expect(normalizeAttendanceStatus(9)).toBeNull();
    expect(normalizeAttendanceStatus("anything")).toBeNull();
  });
});

describe("status metadata", () => {
  it("has a fixed Arabic label and a non-colour symbol for every status", () => {
    for (const status of Object.values(ATTENDANCE_STATUS)) {
      const meta = ATTENDANCE_STATUS_META[status];

      expect(meta.label).toBeTruthy();
      expect(meta.symbol).toBeTruthy();
      expect(meta.pillClass).toBeTruthy();
    }

    expect(attendanceStatusLabel(1)).toBe("حاضر");
    expect(attendanceStatusLabel(2)).toBe("غائب");
    expect(attendanceStatusLabel(3)).toBe("متأخر");
    expect(attendanceStatusLabel(4)).toBe("بعذر");
  });

  it("falls back to an unknown label instead of crashing", () => {
    expect(getAttendanceStatusMeta(null).label).toBe("غير محدد");
  });
});

describe("summarizeAttendance", () => {
  it("counts the four record statuses and uses the shared rate", () => {
    const summary = summarizeAttendance([
      { status: 1 },
      { status: 1 },
      { status: 2 },
      { status: 3 },
      { status: 4 },
      { status: 4 },
    ]);

    expect(summary).toEqual({
      present: 2,
      absent: 1,
      late: 1,
      excused: 2,
      total: 6,
      rate: 75,
    });
  });

  it("honours explicit counts without double counting records", () => {
    const summary = summarizeAttendance([{ status: 1 }], {
      present: 3,
      late: 1,
      excused: 2,
      total: 8,
    });

    expect(summary.present).toBe(3);
    expect(summary.late).toBe(1);
    expect(summary.excused).toBe(2);
    expect(summary.rate).toBe(66.67);
  });

  it("returns a null rate when everything is excused", () => {
    const summary = summarizeAttendance([{ status: 4 }]);

    expect(summary.rate).toBeNull();
  });
});
