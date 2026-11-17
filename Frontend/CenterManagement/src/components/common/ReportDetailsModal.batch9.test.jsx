import { describe, expect, it } from "vitest";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReportDetailsModal from "./ReportDetailsModal";

const reportData = {
  studentId: "st1",
  studentName: "طالب أ",
  groupName: "مجموعة أ",
  subscriptionType: 2,
  totalSessions: 1,
  presentCount: 1,
  absentCount: 0,
  lateCount: 0,
  excusedCount: 0,
  attendancePercentage: 100,
  payments: [
    {
      paymentDate: "2026-11-01",
      amount: 500,
      totalAmount: 500,
      paidAmount: 500,
      remainingAmount: 0,
      status: 2,
      billingPeriod: "2026-11-01",
      notes: "سداد كامل",
    },
  ],
  exams: [
    {
      examName: "امتحان الرياضيات",
      examDate: "2026-11-02",
      obtainedMarks: 18,
      totalMarks: 20,
      percentage: 90,
      isLowGrade: false,
    },
  ],
  records: [
    {
      attendanceDate: "2026-11-01",
      dayOfWeek: 0,
      startTime: "10:00",
      endTime: "12:00",
      status: 1,
      notes: "",
    },
  ],
};

const html = renderToStaticMarkup(
  h(ReportDetailsModal, {
    isOpen: true,
    onClose: () => {},
    reportData,
    type: "full",
    groupHistory: [{ groupId: "g1", groupName: "مجموعة أ", isActive: true }],
    groupFilter: null,
    onGroupFilterChange: () => {},
  }),
);

describe("the printable report modal (batch 9)", () => {
  it("is a labelled dialog with 44px header and footer actions", () => {
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('id="report-modal-title"');
    expect(html).toContain('aria-label="إغلاق التقرير"');
    expect(html).toContain('aria-label="طباعة / PDF"');
    expect(html).toContain("min-h-11");
  });

  it("keeps every wide table inside a labelled scroll region", () => {
    expect(html.match(/data-scroll-region/g) ?? []).toHaveLength(3);
    expect(html).toContain('aria-label="جدول تفاصيل الحضور"');
    expect(html).toContain('aria-label="جدول تفاصيل المالية"');
    expect(html).toContain('aria-label="جدول نتائج الامتحانات"');
    expect(html).toContain("min-w-[800px]");
  });

  it("hides the screen-only hints and keeps the printed sizes", () => {
    // The swipe hint is screen-only; the tables keep their print:text-xs size
    // so the printed sheet is unchanged by the mobile redesign.
    expect(html).toContain("no-print");
    expect(html).toContain("print:text-xs");
    expect(html).toContain("print:min-h-0");
    expect(html).toContain('aria-label="تصفية حسب المجموعة"');
  });
});
