import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";

import {
  AlertTriangle,
  Banknote,
  Plus,
  Receipt,
  RefreshCw,
  Users,
  Wallet,
  WhatsappLogo,
} from "@/components/icons";

import AddPaymentModal from "../components/common/AddPaymentModal";
import Pagination from "../components/common/Pagination";

import { useAuth } from "../context/useAuth";
import ModuleOnly from "../components/common/ModuleOnly";
import { useBranding } from "../context/useBranding";
import { examService } from "../services/examService";
import { financeService } from "../services/financeService";
import { teacherService } from "../services/teacherService";

import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import PageHeader from "@/components/ui/PageHeader";
import Select from "@/components/ui/Select";
import StatCard from "@/components/ui/StatCard";
import StatusPill from "@/components/ui/StatusPill";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";

import { formatCurrency } from "../utils/formatCurrency";
import { normalizeEgyptianPhone } from "../utils/phone";
import { useMessageTemplates } from "../hooks/useMessageTemplates";
import {
  buildTemplateWhatsAppLink,
  hasMessageTemplate,
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
  const { bodies: templateBodies } = useMessageTemplates();

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
    if (!hasMessageTemplate(MESSAGE_TEMPLATE_KEYS.feesReminder, templateBodies)) {
      toast.error("تعذر تحميل قالب الرسالة، حاول مرة أخرى");
      return;
    }

    const link = buildTemplateWhatsAppLink(
      row.parentPhoneNumber,
      MESSAGE_TEMPLATE_KEYS.feesReminder,
      {
        student: row.studentName,
        center: centerName,
        amount: formatCurrency(row.remainingAmount),
        month: billingPeriodLabel,
      },
      templateBodies,
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

  const statusTone = (status) => (status === 1 ? "warning" : "danger");
  const statusText = (status) => (status === 1 ? "دفع جزء" : "غير مدفوع");

  const renderActions = (row, { block = false } = {}) => {
    const hasPhone = !!normalizeEgyptianPhone(row.parentPhoneNumber);

    return (
      <div
        className={`flex items-center gap-2 ${
          block ? "flex-col sm:flex-row" : "justify-center"
        }`}
      >
        <Button
          size="sm"
          onClick={() => handleAddPayment(row)}
          title="إضافة دفعة"
          className={block ? "w-full sm:w-auto" : undefined}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          إضافة دفعة
        </Button>

        <ModuleOnly moduleKey="whatsapp">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleRemind(row)}
            disabled={!hasPhone}
            title={
              hasPhone
                ? "تذكير عبر واتساب لولي الأمر"
                : "لا يوجد رقم ولي أمر صحيح"
            }
            className={`text-status-success ${
              block ? "w-full sm:w-auto" : ""
            }`}
          >
            <WhatsappLogo className="h-4 w-4" aria-hidden="true" />
            تذكير واتساب
          </Button>
        </ModuleOnly>
      </div>
    );
  };

  const money = (value) => (
    <span className="num whitespace-nowrap font-semibold">{formatCurrency(value)}</span>
  );

  return (
    <div
      dir="rtl"
      data-testid="overdue-page"
      className="min-h-screen bg-surface-bg font-sans text-text-main"
    >
      <div className="mx-auto max-w-[90rem] space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        <PageHeader
          title="متابعة المتأخرين"
          subtitle={`الطلاب الذين لم يسددوا اشتراك شهر ${billingPeriodLabel}`}
          actions={
            <Button variant="secondary" onClick={fetchOverdue}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              تحديث
            </Button>
          }
        />

        {/* =====================================================
            Totals
        ====================================================== */}
        <div className="grid grid-cols-1 gap-3 ph:grid-cols-2 lg:grid-cols-4 lg:gap-4">
          <StatCard
            label="عدد المتأخرين"
            value={totals?.totalStudents ?? 0}
            icon={Users}
            tone="neutral"
          />
          <StatCard
            label="إجمالي المستحق"
            value={formatCurrency(totals?.totalDue ?? 0)}
            icon={Receipt}
            tone="info"
          />
          <StatCard
            label="إجمالي المدفوع"
            value={formatCurrency(totals?.totalPaid ?? 0)}
            icon={Banknote}
            tone="success"
          />
          <StatCard
            label="إجمالي المتبقي"
            value={formatCurrency(totals?.totalRemaining ?? 0)}
            icon={AlertTriangle}
            tone="danger"
          />
        </div>

        {/* =====================================================
            Filters
        ====================================================== */}
        <div className="rounded-card border border-surface-border bg-surface-card p-4 shadow-soft">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Input
              type="text"
              aria-label="بحث بالاسم أو الهاتف"
              placeholder="بحث بالاسم أو الهاتف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            <Select
              aria-label="المجموعة"
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
            >
              <option value="">جميع المجموعات</option>
              {groups.map((g) => (
                <option key={g.id || g.groupId} value={g.id || g.groupId}>
                  {g.name || g.groupName}
                </option>
              ))}
            </Select>

            {showTeacherColumn && teachers.length > 0 && (
              <Select
                aria-label="المدرس"
                value={selectedTeacher}
                onChange={(e) => setSelectedTeacher(e.target.value)}
              >
                <option value="">جميع المدرسين</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.fullName || t.name}
                  </option>
                ))}
              </Select>
            )}

            <Select
              aria-label="الشهر"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              {MONTHS.map((month, index) => (
                <option key={month} value={index + 1}>
                  {month}
                </option>
              ))}
            </Select>

            <Select
              aria-label="السنة"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </Select>

            <Select
              aria-label="عدد الصفوف في الصفحة"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              <option value={10}>10 / صفحة</option>
              <option value={20}>20 / صفحة</option>
              <option value={50}>50 / صفحة</option>
            </Select>
          </div>
        </div>

        {/* =====================================================
            Rows
        ====================================================== */}
        {loading ? (
          <div className="rounded-card border border-surface-border bg-surface-card p-12 text-center text-sm font-medium text-text-muted">
            جاري التحميل...
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-card border border-surface-border bg-surface-card shadow-soft">
            <EmptyState
              icon={Wallet}
              title="لا يوجد طلاب متأخرون مطابقون للفلترة الحالية 🎉"
            />
          </div>
        ) : (
          <>
            {/* Phones: stacked cards so amounts and actions stay readable */}
            <ul data-testid="overdue-cards" className="space-y-3 md:hidden">
              {rows.map((row) => (
                <li
                  key={row.studentId}
                  className="rounded-card border border-surface-border bg-surface-card p-4 shadow-soft"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words font-bold text-text-main">
                        {row.studentName}
                      </p>
                      <p className="mt-0.5 break-words text-sm text-text-muted">
                        {row.groupName || "-"}
                        {showTeacherColumn && row.teacherName
                          ? ` · ${row.teacherName}`
                          : ""}
                      </p>
                    </div>

                    <StatusPill tone={statusTone(row.status)}>
                      {statusText(row.status)}
                    </StatusPill>
                  </div>

                  <dl className="mt-3 grid grid-cols-3 gap-2 rounded-control bg-surface-muted/60 p-2.5 text-center">
                    <div className="min-w-0">
                      <dt className="text-xs text-text-muted">المستحق</dt>
                      <dd className="num mt-0.5 break-words text-sm font-semibold text-text-main">
                        {formatCurrency(row.totalAmount)}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-xs text-text-muted">المدفوع</dt>
                      <dd className="num mt-0.5 break-words text-sm font-semibold text-status-success">
                        {formatCurrency(row.paidAmount)}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-xs text-text-muted">المتبقي</dt>
                      <dd className="num mt-0.5 break-words text-sm font-bold text-status-danger">
                        {formatCurrency(row.remainingAmount)}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-text-muted">
                    <span dir="ltr" className="num">
                      {row.parentPhoneNumber || "-"}
                    </span>
                    <span>
                      آخر دفعة:{" "}
                      {row.lastPaymentDate
                        ? new Date(row.lastPaymentDate).toLocaleDateString(
                            "ar-EG",
                          )
                        : "-"}
                    </span>
                  </div>

                  <div className="mt-3">{renderActions(row, { block: true })}</div>
                </li>
              ))}
            </ul>

            {/* Tablets and up */}
            <div data-testid="overdue-table" className="hidden md:block">
              <Table className="min-w-[64rem] whitespace-nowrap">
                <TableHead>
                  <TableRow className="hover:bg-transparent">
                    <TableHeaderCell>اسم الطالب</TableHeaderCell>
                    <TableHeaderCell>المجموعة</TableHeaderCell>
                    {showTeacherColumn && (
                      <TableHeaderCell>المدرس</TableHeaderCell>
                    )}
                    <TableHeaderCell>هاتف ولي الأمر</TableHeaderCell>
                    <TableHeaderCell>المستحق</TableHeaderCell>
                    <TableHeaderCell>المدفوع</TableHeaderCell>
                    <TableHeaderCell>المتبقي</TableHeaderCell>
                    <TableHeaderCell>آخر دفعة</TableHeaderCell>
                    <TableHeaderCell className="text-center">الحالة</TableHeaderCell>
                    <TableHeaderCell className="text-center">
                      الإجراءات
                    </TableHeaderCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.studentId}>
                      <TableCell className="max-w-[16rem] break-words font-medium">
                        {row.studentName}
                      </TableCell>

                      <TableCell className="max-w-[12rem] truncate text-text-muted">
                        {row.groupName || "-"}
                      </TableCell>

                      {showTeacherColumn && (
                        <TableCell className="max-w-[12rem] truncate text-text-muted">
                          {row.teacherName || "-"}
                        </TableCell>
                      )}

                      <TableCell className="num text-text-muted" dir="ltr">
                        {row.parentPhoneNumber || "-"}
                      </TableCell>

                      <TableCell>{money(row.totalAmount)}</TableCell>
                      <TableCell className="text-status-success">
                        {money(row.paidAmount)}
                      </TableCell>
                      <TableCell className="font-bold text-status-danger">
                        {money(row.remainingAmount)}
                      </TableCell>

                      <TableCell className="num text-text-muted">
                        {row.lastPaymentDate
                          ? new Date(row.lastPaymentDate).toLocaleDateString(
                              "ar-EG",
                            )
                          : "-"}
                      </TableCell>

                      <TableCell className="text-center">
                        <StatusPill tone={statusTone(row.status)}>
                          {statusText(row.status)}
                        </StatusPill>
                      </TableCell>

                      <TableCell>{renderActions(row)}</TableCell>
                    </TableRow>
                  ))}

                  {rows.length === 0 && (
                    <TableEmpty colSpan={showTeacherColumn ? 10 : 9}>
                      لا يوجد طلاب متأخرون مطابقون للفلترة الحالية 🎉
                    </TableEmpty>
                  )}
                </TableBody>
              </Table>
            </div>

            {totalCount > 0 && totalPages > 1 && (
              <Pagination
                currentPage={pageNumber}
                totalPages={totalPages}
                totalItems={totalCount}
                pageSize={pageSize}
                name="طالب"
                testId="overdue-pagination"
                onPageChange={handlePageChange}
              />
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
