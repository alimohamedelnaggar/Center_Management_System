import {
  Award,
  Calendar,
  CreditCard,
  FileText,
  Loader2,
  Search,
} from "@/components/icons";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import ReportDetailsModal from "../common/ReportDetailsModal";
import Pagination from "../common/Pagination";
import { reportsService } from "../../services/reportsService";
import {
  financeConnection,
  startFinanceConnection,
} from "../../services/signalr/financeSignalR";
import { studentsService } from "../../services/studentService";
import { useAuth } from "../../context/useAuth";
import { MODULES } from "../../constants/modules";

const PAGE_SIZE = 7;

/**
 * The student reports table: every student of the caller's scope with the
 * attendance / financial / grades / full report of that student.
 *
 * Each report type lives behind its own module on the API, so every column is
 * shown only when the center actually bought that module - a teacher without
 * the payments module never sees a financial column that would fail with 403.
 */
export default function ReportsStudentsTab({
  heading = "تقارير الطلاب",
  breadcrumb = "الرئيسية / التقارير",
}) {
  const { hasModule } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalStudents, setTotalStudents] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalReportData, setModalReportData] = useState(null);
  const [reportType, setReportType] = useState("attendance");
  const [fetchingReportId, setFetchingReportId] = useState(null);

  const [groupHistory, setGroupHistory] = useState([]);
  const [groupFilter, setGroupFilter] = useState(null);
  const [currentStudent, setCurrentStudent] = useState(null);

  const showAttendance = hasModule(MODULES.ATTENDANCE);
  const showFinancial = hasModule(MODULES.PAYMENTS);
  const showGrades = hasModule(MODULES.GRADES);
  const showFull = showAttendance && showFinancial && showGrades;
  const hasAnyReport = showAttendance || showFinancial || showGrades;

  const fetchStudents = async (pageNumber, search = "") => {
    try {
      setLoading(true);
      const data = await studentsService.getAll(pageNumber, PAGE_SIZE, search);

      setStudents(data?.items || []);
      setTotalPages(data?.totalPages || 1);
      setTotalStudents(data?.totalCount || 0);
    } catch (err) {
      toast.error("حدث خطأ أثناء جلب قائمة الطلاب");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (() => {
      fetchStudents(page, searchQuery);
    })();
  }, [page, searchQuery]);

  // ----- use signalR
  useEffect(() => {
    // ----------------------- start expenses

    startFinanceConnection();

    financeConnection.on("PaymentAdded", (payment) => {
      // console.log("payment : ", payment);
      setModalReportData((prev) => {
        if (!prev) return prev;

        if (prev.studentId !== payment.studentId) return prev;

        return {
          ...prev,
          payments: [payment, ...prev.payments],
          paymentsCount: prev.paymentsCount + 1,
          totalPaid: prev.totalPaid + payment.amount,
          remainingAmount: payment.remainingAmount,
        };
      });
    });
    financeConnection.on("PaymentUpdated", (data) => {
      setModalReportData((prev) =>
        prev.map((x) => (x.id === data.id ? data : x)),
      );
    });

    financeConnection.on("PaymentDeleted", (id) => {
      setModalReportData((prev) => prev.filter((x) => x.id !== id));
    });
    // ----------------------- end expenses

    return () => {
      financeConnection.off("PaymentAdded");
      financeConnection.off("PaymentUpdated");
      financeConnection.off("PaymentDeleted");
    };
  }, []);

  const handleOpenReport = async (student, type, groupId = null) => {
    try {
      setFetchingReportId(`${student.id}-${type}`);
      setCurrentStudent(student);
      setGroupFilter(groupId);

      // نجيب تاريخ المجموعات مرة واحدة بس أول ما نفتح تقرير لطالب جديد
      if (!currentStudent || currentStudent.id !== student.id) {
        const historyRes = await reportsService.getStudentGroupsHistory(
          student.id,
        );
        setGroupHistory(historyRes?.data || historyRes || []);
      }

      let rawReport = null;
      let finalReportData = null;

      if (type === "attendance") {
        rawReport = await reportsService.getAttendanceReport(
          student.id,
          groupId,
        );
        finalReportData = rawReport?.data || rawReport;
      } else if (type === "financial") {
        rawReport = await reportsService.getFinancialReport(
          student.id,
          groupId,
        );

        const payments = rawReport?.data || rawReport || [];

        finalReportData = {
          studentId: student.id,
          studentName: student.fullName,
          groupName: student.groupName,
          subscriptionType: student.subscriptionType,

          payments,

          paymentsCount: payments.length,
          totalPaid: payments.reduce((sum, p) => sum + (p.amount || 0), 0),
        };
      } else if (type === "grades") {
        rawReport = await reportsService.getGradesReport(student.id, groupId);
        finalReportData = rawReport?.data || rawReport;
      } else if (type === "full") {
        const [attRes, finRes, grdRes] = await Promise.all([
          reportsService.getAttendanceReport(student.id, groupId),
          reportsService.getFinancialReport(student.id, groupId),
          reportsService.getGradesReport(student.id, groupId),
        ]);

        const att = attRes?.data || attRes;
        const payments = finRes?.data || finRes || [];
        const grd = grdRes?.data || grdRes;

        finalReportData = {
          studentId: student.id,
          studentName:
            student.fullName ||
            att?.studentName ||
            payments?.studentName ||
            grd?.studentName,
          groupName:
            student.groupName ||
            att?.groupName ||
            payments?.groupName ||
            grd?.groupName,

          totalSessions: att?.totalSessions ?? 0,
          presentCount: att?.presentCount ?? 0,
          absentCount: att?.absentCount ?? 0,
          attendancePercentage: att?.attendancePercentage ?? 0,
          records: att?.records || [],

          subscriptionType:
            payments?.subscriptionType ?? student.subscriptionType,
          payments,
          paymentsCount: payments.length,
          totalPaid: payments.reduce((sum, p) => sum + (p.amount || 0), 0),
          totalAmount: payments[0]?.totalAmount ?? 0,
          remainingAmount: payments[0]?.remainingAmount ?? 0,

          totalObtainedMarks: grd?.totalObtainedMarks ?? 0,
          totalMarks: grd?.totalMarks ?? 0,
          percentage: grd?.percentage ?? 0,
          exams: grd?.exams || [],
        };
      }
      setModalReportData(finalReportData);
      setReportType(type);
      setIsModalOpen(true);
    } catch (err) {
      toast.error("تعذر جلب بيانات التقرير");
      console.error("Report Fetch Error:", err);
    } finally {
      setFetchingReportId(null);
    }
  };

  const handleGroupFilterChange = (groupId) => {
    if (!currentStudent) return;
    handleOpenReport(currentStudent, reportType, groupId || null);
  };

  const reportButton = (student, type, Icon, className, label) => {
    const key = `${student.id}-${type}`;
    const busy = fetchingReportId === key;

    return (
      <button
        onClick={() => handleOpenReport(student, type)}
        disabled={busy}
        title={label}
        aria-label={label}
        className={`p-2 rounded-xl transition-all cursor-pointer inline-flex items-center justify-center ${className}`}
      >
        {busy ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Icon className="w-4 h-4" />
        )}
      </button>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-main">{heading}</h1>
          <p className="text-xs text-text-muted mt-1">{breadcrumb}</p>
        </div>
      </div>

      {!hasAnyReport ? (
        <div className="rounded-2xl border border-surface-border bg-surface-card p-12 text-center shadow-xs">
          <p className="text-sm font-semibold text-text-muted">
            تقارير الطلاب محتاجة اشتراك وحدة الحضور أو المدفوعات أو الدرجات.
          </p>
        </div>
      ) : (
        <>
          <div className="bg-surface-card border border-surface-border p-4 rounded-2xl shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="بحث عن طالب..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-10 pl-4 py-2 rounded-xl border border-surface-border bg-surface-muted/40 text-xs font-bold text-text-main focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div className="bg-surface-card border border-surface-border rounded-2xl shadow-xs overflow-hidden">
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : students.length === 0 ? (
              <div className="p-12 text-center text-text-muted text-sm font-semibold">
                لا يوجد طلاب مطبقون لشروط البحث.
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <table className="w-full min-w-[700px] text-right text-xs">
                  <thead className="bg-surface-muted/80 border-b border-surface-border text-text-muted font-bold">
                    <tr>
                      <th className="p-4 w-12 text-center">#</th>
                      <th className="p-4">الطالب</th>
                      <th className="p-4">المجموعة</th>
                      {showAttendance && (
                        <th className="p-4 text-center">الحضور</th>
                      )}
                      {showFinancial && <th className="p-4 text-center">المالية</th>}
                      {showGrades && (
                        <th className="p-4 text-center">نتائج الامتحانات</th>
                      )}
                      {showFull && <th className="p-4 text-center">تقرير كامل</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border text-text-main">
                    {students.map((student, index) => {
                      const studentIndex = (page - 1) * PAGE_SIZE + index + 1;
                      return (
                        <tr
                          key={student.id}
                          className="hover:bg-surface-muted/30 transition-all"
                        >
                          <td className="p-4 text-center font-bold text-text-muted">
                            {studentIndex}
                          </td>

                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-text-main">
                                {student.fullName}
                              </span>
                            </div>
                          </td>

                          <td className="p-4 text-text-muted font-medium">
                            {student.groupName || "غير محدد"}
                          </td>

                          {showAttendance && (
                            <td className="p-4 text-center">
                              {reportButton(
                                student,
                                "attendance",
                                Calendar,
                                "bg-status-success-bg/60 text-status-success hover:bg-status-success hover:text-white",
                                "تقرير الحضور والغياب",
                              )}
                            </td>
                          )}

                          {showFinancial && (
                            <td className="p-4 text-center">
                              {reportButton(
                                student,
                                "financial",
                                CreditCard,
                                "bg-status-danger-bg/60 text-status-danger hover:bg-status-danger hover:text-white",
                                "التقرير المالي والتسديدات",
                              )}
                            </td>
                          )}

                          {showGrades && (
                            <td className="p-4 text-center">
                              {reportButton(
                                student,
                                "grades",
                                Award,
                                "bg-primary-subtle text-primary hover:bg-primary hover:text-white",
                                "نتائج الامتحانات",
                              )}
                            </td>
                          )}

                          {showFull && (
                            <td className="p-4 text-center">
                              {reportButton(
                                student,
                                "full",
                                FileText,
                                "bg-status-warning-bg/60 text-status-warning hover:bg-status-warning hover:text-white",
                                "التقرير الشامل للطالب",
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {!loading && students.length > 1 && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={totalStudents}
                pageSize={PAGE_SIZE}
                name="طالب"
                onPageChange={(newPage) => setPage(newPage)}
              />
            )}
          </div>
        </>
      )}

      <ReportDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        reportData={modalReportData}
        type={reportType}
        groupHistory={groupHistory}
        groupFilter={groupFilter}
        onGroupFilterChange={handleGroupFilterChange}
      />
    </div>
  );
}
