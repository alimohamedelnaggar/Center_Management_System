import { describe, expect, it } from "vitest";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReportDetailsModal from "./ReportDetailsModal";

const reportData = {
  studentId: "st1",
  studentName: "طالب أ",
  groupName: "مجموعة أ",
  totalSessions: 4,
  presentCount: 1,
  absentCount: 1,
  lateCount: 1,
  excusedCount: 1,
  attendancePercentage: 66.67,
  records: [
    { attendanceDate: "2026-11-01", dayOfWeek: 0, status: 1 },
    { attendanceDate: "2026-11-02", dayOfWeek: 1, status: 2 },
    { attendanceDate: "2026-11-03", dayOfWeek: 2, status: 3 },
    { attendanceDate: "2026-11-04", dayOfWeek: 3, status: 4 },
  ],
};

describe("ReportDetailsModal attendance", () => {
  it("shows a count and a labelled row for every status", () => {
    const html = renderToStaticMarkup(
      h(ReportDetailsModal, {
        isOpen: true,
        onClose: () => {},
        reportData,
        type: "attendance",
      }),
    );

    expect(html).toContain("مرات الحضور");
    expect(html).toContain("مرات الغياب");
    expect(html).toContain("مرات التأخر");
    expect(html).toContain("مرات العذر");
    expect(html).toContain("66.67%");

    expect(html).toContain("حاضر");
    expect(html).toContain("غائب");
    expect(html).toContain("متأخر");
    expect(html).toContain("بعذر");
  });

  it("shows a dash when the percentage is null", () => {
    const html = renderToStaticMarkup(
      h(ReportDetailsModal, {
        isOpen: true,
        onClose: () => {},
        type: "attendance",
        reportData: {
          ...reportData,
          presentCount: 0,
          absentCount: 0,
          lateCount: 0,
          excusedCount: 4,
          attendancePercentage: null,
        },
      }),
    );

    expect(html).toContain("—");
    expect(html).not.toContain("0%");
  });
});
