import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";

import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
  WhatsappLogo,
} from "@/components/icons";

import AddPaymentModal from "../components/common/AddPaymentModal";

import { useAuth } from "../context/useAuth";
import ModuleOnly from "../components/common/ModuleOnly";
import { useBranding } from "../context/useBranding";
import { examService } from "../services/examService";
import { financeService } from "../services/financeService";
import { teacherService } from "../services/teacherService";

import { formatCurrency } from "../utils/formatCurrency";
import { normalizeEgyptianPhone } from "../utils/phone";
import {
  buildTemplateWhatsAppLink,
  MESSAGE_TEMPLATE_KEYS,
} from "../utils/whatsappTemplates";

const DEFAULT_PAGE_SIZE = 10;

const MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

const now = new Date();

export default function OverduePage() {
  const { isCenterAdmin, isSoloCenter, centerTypeLoaded } = useAuth();
  // A solo center has no teacher breakdown, so its column + filter are hidden.
  const showTeacherColumn = centerTypeLoaded && !isSoloCenter;
  const branding = useBranding();
  const centerName = branding?.center?.name || "";

  // =========================================================
  // Filters. `groupId` / `month` / `year` may arrive from a deep
  // link (the center reports page filters by group + billing month).
  // =========================================================
  const [searchParams] = useSearchParams();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState(
    searchParams.get("groupId") || "",
  );
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(
    searchParams.get("month") || String(now.getMonth() + 1),
  );
  const [selectedYear, setSelectedYear] = useState(
    searchParams.get("year") || String(now.getFullYear()),
  );

  // =========================================================
  // Data
  // =========================================================
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({
    totalStudents: 0,
    totalDue: 0,
    totalPaid: 0,
    totalRemaining: 0,
  });

  const [groups, setGroups] = useState([]);
  const [teachers, setTeachers] = useState([]);

  // =========================================================
  // Pagination
  // =========================================================
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [loading, setLoading] = useState(false);

  // =========================================================
  // Add Payment Modal
  // =========================================================
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [prefill, setPrefill] = useState(null);

  const availableYears = useMemo(() => {
    const years = [];
    for (let year = 2026; year <= now.getFullYear() + 1; year++) {
      years.push(year);
    }
    return years;
  }, []);

  const billingPeriodLabel =
    selectedMonth && selectedYear
      ? `${MONTHS[Number(selectedMonth) - 1]} ${selectedYear}`
      : "الشهر الحالي";

  // =========================================================
  // Load Groups + Teachers (teachers only for center admins:
  // the /Teacher/Paginated endpoint requires the CenterAdmin policy)
  // =========================================================
  useEffect(() => {
    examService
      .getGroups()
      .then((res) => setGroups(res?.data || []))
      .catch(() => setGroups([]));

    if (!isCenterAdmin || !showTeacherColumn) {
      setTeachers([]);
      return;
    }

    teacherService
      .getPaginated(1, 200)
      .then((res) => {
        const list = Array.isArray(res)
          ? res
          : res?.data || res?.items || [];
        setTeachers(Array.isArray(list) ? list : []);
      })
      .catch(() => setTeachers([]));
  }, [isCenterAdmin, showTeacherColumn]);

  // =========================================================
  // Reset Page On Filter Change
  // =========================================================
  useEffect(() => {
    setPageNumber(1);
  }, [
    searchQuery,
    selectedGroup,
    selectedTeacher,
    selectedMonth,
    selectedYear,
    pageSize,
  ]);

  // =========================================================
  // Fetch Overdue
  // =========================================================
  const fetchOverdue = async () => {
    setLoading(true);

    try {
      const res = await financeService.getOverdueStudents({
        groupId: selectedGroup || null,
        teacherId: selectedTeacher || null,
        search: searchQuery,
        month: selectedMonth || null,
        year: selectedYear || null,
        pageNumber,
        pageSize,
      });

      const items = Array.isArray(res?.data)
        ? res.data
        : res?.data?.items || res?.items || [];

      setRows(Array.isArray(items) ? items : []);

      setTotals(res?.meta || res?.data?.meta || {
        totalStudents: 0,
        totalDue: 0,
        totalPaid: 0,
        totalRemaining: 0,
      });

      setTotalCount(res?.totalCount ?? res?.data?.totalCount ?? 0);

      setTotalPages(res?.totalPages ?? res?.data?.totalPages ?? 0);
    } catch (err) {
      console.error("Error fetching overdue students:", err);
      setRows([]);
      setTotalCount(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverdue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedGroup,
    selectedTeacher,
    selectedMonth,
    selectedYear,
    searchQuery,
    pageNumber,
    pageSize,
  ]);

  // =========================================================
  // Row Actions
  // =========================================================
  const handleAddPayment = (row) => {
    const period =
      selectedMonth && selectedYear
        ? `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`
        : "";

    setPrefill({
      studentId: row.studentId,
      groupId: row.groupId,
      billingPeriod: period,
    });

    setIsModalOpen(true);
  };

  const handleRemind = (row) => {
    const link = buildTemplateWhatsAppLink(
      row.parentPhoneNumber,
      MESSAGE_TEMPLATE_KEYS.feesReminder,
      {
        student: row.studentName,
        center: centerName,
        amount: formatCurrency(row.remainingAmount),
        month: billingPeriodLabel,
      },
    );

    if (!link) {
      toast.error("لا يوجد رقم صحيح لولي الأمر");
      return;
    }

    window.open(link, "_blank", "noopener,noreferrer");
  };

  const handlePaymentSaved = async () => {
    setIsModalOpen(false);
    setPrefill(null);
    await fetchOverdue();
  };

  // =========================================================
  // Pagination Helpers
  // =========================================================
  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages || page === pageNumber) return;
    setPageNumber(page);
  };

  const from = totalCount === 0 ? 0 : (pageNumber - 1) * pageSize + 1;
  const to = Math.min(pageNumber * pageSize, totalCount);

  const statusLabel = (status) =>
    status === 1
      ? { text: "دفع جزء", className: "bg-yellow-50 text-yellow-700 border-yellow-200" }
      : { text: "غير مدفوع", className: "bg-red-50 text-red-700 border-red-200" };

  return (
    <div className="p-6 bg-[var(--color-surface-bg)] min-h-screen text-[var(--color-text-main)] dir-rtl space-y-6">
      {/* =====================================================
          Header
      ====================================================== */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-primary)] flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            متابعة المتأخرين
          </h1>

          <p className="text-sm text-[var(--color-text-muted)]">
            الطلاب الذين لم يسددوا اشتراك شهر {billingPeriodLabel}
          </p>
        </div>

        <button
          onClick={fetchOverdue}
          className="inline-flex items-center gap-2 bg-[var(--color-surface-card)] border border-[var(--color-surface-border)] px-4 py-2 rounded-xl text-sm font-bold hover:bg-[var(--color-surface-muted)] transition-all cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          تحديث
        </button>
      </div>

      {/* =====================================================
          Totals
      ====================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="عدد المتأخرين"
          value={totals?.totalStudents ?? 0}
          tone="slate"
        />
        <SummaryCard
          title="إجمالي المستحق"
          value={formatCurrency(totals?.totalDue ?? 0)}
          tone="blue"
        />
        <SummaryCard
          title="إجمالي المدفوع"
          value={formatCurrency(totals?.totalPaid ?? 0)}
          tone="green"
        />
        <SummaryCard
          title="إجمالي المتبقي"
          value={formatCurrency(totals?.totalRemaining ?? 0)}
          tone="red"
        />
      </div>

      {/* =====================================================
          Filters
      ====================================================== */}
      <div className="flex flex-wrap items-center gap-4 bg-[var(--color-surface-card)] p-4 rounded-xl border border-[var(--color-surface-border)] shadow-sm">
        <input
          type="text"
          placeholder="بحث بالاسم أو الهاتف..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="p-2.5 rounded-lg border border-[var(--color-surface-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] min-w-[200px]"
        />

        <select
          value={selectedGroup}
          onChange={(e) => setSelectedGroup(e.target.value)}
          className="p-2.5 rounded-lg border border-[var(--color-surface-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
        >
          <option value="">جميع المجموعات</option>
          {groups.map((g) => (
            <option key={g.id || g.groupId} value={g.id || g.groupId}>
              {g.name || g.groupName}
            </option>
          ))}
        </select>

        {showTeacherColumn && teachers.length > 0 && (
          <select
            value={selectedTeacher}
            onChange={(e) => setSelectedTeacher(e.target.value)}
            className="p-2.5 rounded-lg border border-[var(--color-surface-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            <option value="">جميع المدرسين</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.fullName || t.name}
              </option>
            ))}
          </select>
        )}

        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="p-2.5 rounded-lg border border-[var(--color-surface-border)] bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
        >
          {MONTHS.map((month, index) => (
            <option key={month} value={index + 1}>
              {month}
            </option>
          ))}
        </select>

        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          className="p-2.5 rounded-lg border border-[var(--color-surface-border)] bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
        >
          {availableYears.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      {/* =====================================================
          Table
      ====================================================== */}
      <div className="bg-[var(--color-surface-card)] rounded-xl border border-[var(--color-surface-border)] shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-[var(--color-text-muted)] font-medium">
            جاري التحميل...
          </div>
        ) : (
          <>
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[900px] text-right text-sm whitespace-nowrap">
                <thead className="bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] font-semibold border-b border-[var(--color-surface-border)]">
                  <tr>
                    <th className="p-4">اسم الطالب</th>
                    <th className="p-4">المجموعة</th>
                    {showTeacherColumn && <th className="p-4">المدرس</th>}
                    <th className="p-4">هاتف ولي الأمر</th>
                    <th className="p-4">المستحق</th>
                    <th className="p-4">المدفوع</th>
                    <th className="p-4">المتبقي</th>
                    <th className="p-4">آخر دفعة</th>
                    <th className="p-4 text-center">الحالة</th>
                    <th className="p-4 text-center">الإجراءات</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[var(--color-surface-border)]">
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={showTeacherColumn ? 10 : 9} className="p-12 text-center text-slate-400">
                        لا يوجد طلاب متأخرون مطابقون للفلترة الحالية 🎉
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => {
                      const status = statusLabel(row.status);

                      const hasPhone = !!normalizeEgyptianPhone(
                        row.parentPhoneNumber,
                      );

                      return (
                        <tr
                          key={row.studentId}
                          className="hover:bg-slate-50 transition-colors duration-200"
                        >
                          <td className="p-4 font-medium text-slate-800">
                            {row.studentName}
                          </td>

                          <td className="p-4 text-slate-600">
                            {row.groupName || "-"}
                          </td>

                          {showTeacherColumn && (
                            <td className="p-4 text-slate-600">
                              {row.teacherName || "-"}
                            </td>
                          )}

                          <td className="p-4 text-slate-600" dir="ltr">
                            {row.parentPhoneNumber || "-"}
                          </td>

                          <td className="p-4 text-slate-700">
                            {formatCurrency(row.totalAmount)}
                          </td>

                          <td className="p-4 text-green-600 font-semibold">
                            {formatCurrency(row.paidAmount)}
                          </td>

                          <td className="p-4 text-red-600 font-bold">
                            {formatCurrency(row.remainingAmount)}
                          </td>

                          <td className="p-4 text-[var(--color-text-muted)]">
                            {row.lastPaymentDate
                              ? new Date(row.lastPaymentDate).toLocaleDateString(
                                  "ar-EG",
                                )
                              : "-"}
                          </td>

                          <td className="p-4 text-center">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold border inline-block ${status.className}`}
                            >
                              {status.text}
                            </span>
                          </td>

                          <td className="p-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleAddPayment(row)}
                                title="إضافة دفعة"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-all cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                إضافة دفعة
                              </button>

      <ModuleOnly moduleKey="whatsapp">
      <button
        onClick={handleRemind(row)}
        disabled={!hasPhone}
        title={
          hasPhone
            ? "تذكير عبر واتساب لولي الأمر"
            : "لا يوجد رقم ولي أمر صحيح"
        }
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
          hasPhone
            ? "text-green-700 border-green-200 bg-green-50 hover:bg-green-100 cursor-pointer"
            : "text-slate-300 border-slate-200 bg-slate-50 cursor-not-allowed"
        }`}
      >
        <WhatsappLogo className="w-3.5 h-3.5" />
        تذكير واتساب
      </button>
      </ModuleOnly>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* =============================================
                Pagination
            ============================================== */}
            {totalCount > 0 && totalPages > 1 && (
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 border-t border-[var(--color-surface-border)]">
                <div className="flex items-center gap-3 text-sm text-[var(--color-text-muted)]">
                  <span>
                    عرض{" "}
                    <b className="text-[var(--color-text-main)]">{from}</b> إلى{" "}
                    <b className="text-[var(--color-text-main)]">{to}</b> من{" "}
                    <b className="text-[var(--color-text-main)]">{totalCount}</b>
                  </span>

                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="p-2 rounded-lg border border-[var(--color-surface-border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  >
                    <option value={10}>10 / صفحة</option>
                    <option value={20}>20 / صفحة</option>
                    <option value={50}>50 / صفحة</option>
                  </select>
                </div>

                <div className="flex items-center gap-2" dir="ltr">
                  <button
                    onClick={() => handlePageChange(pageNumber - 1)}
                    disabled={pageNumber === 1}
                    className="w-9 h-9 rounded-lg border flex items-center justify-center transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border-slate-200 bg-white hover:bg-slate-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="text-sm font-bold px-2">
                    {pageNumber} / {totalPages}
                  </span>

                  <button
                    onClick={() => handlePageChange(pageNumber + 1)}
                    disabled={pageNumber === totalPages}
                    className="w-9 h-9 rounded-lg border flex items-center justify-center transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border-slate-200 bg-white hover:bg-slate-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* =====================================================
          Add Payment Modal (prefilled)
      ====================================================== */}
      <AddPaymentModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setPrefill(null);
        }}
        onSuccess={handlePaymentSaved}
        prefill={prefill}
      />
    </div>
  );
}

function SummaryCard({ title, value, tone }) {
  const tones = {
    slate: "text-slate-700",
    blue: "text-blue-600",
    green: "text-green-600",
    red: "text-red-600",
  };

  return (
    <div className="bg-[var(--color-surface-card)] rounded-xl border border-[var(--color-surface-border)] shadow-sm p-4">
      <p className="text-xs font-bold text-[var(--color-text-muted)] mb-1">
        {title}
      </p>
      <p className={`text-xl font-bold ${tones[tone] || tones.slate}`}>
        {value}
      </p>
    </div>
  );
}
