import {
  BadgeCheck,
  Pencil,
  Printer,
  Receipt,
  Trash2,
  Wallet,
} from "@/components/icons";
import { useEffect, useState } from "react";

import AddPaymentModal from "../components/common/AddPaymentModal";
import ConfirmModal from "../components/common/ConfirmModal";
import Pagination from "../components/common/Pagination";
import PaymentReceiptModal from "../components/common/PaymentReceiptModal";

import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import PageHeader from "@/components/ui/PageHeader";
import Select from "@/components/ui/Select";
import StatusPill from "@/components/ui/StatusPill";
import Tabs from "@/components/ui/Tabs";
import {
  Table,
  TableBody,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableCell,
} from "@/components/ui/Table";

import { examService } from "../services/examService";
import { financeService } from "../services/financeService";
import { startFinanceConnection } from "../services/signalr/financeSignalR";

import { formatCurrency } from "../utils/formatCurrency";

const DEFAULT_PAGE_SIZE = 10;

export default function FinancePage() {
  // =========================================================
  // Active Tab
  // =========================================================
  const [activeTab, setActiveTab] = useState("payments");

  // =========================================================
  // Finance Data
  // =========================================================
  const [paymentsData, setPaymentsData] = useState([]);
  const [studentsFinanceData, setStudentsFinanceData] = useState([]);

  // =========================================================
  // Pagination - Payments
  // =========================================================
  const [paymentsPageNumber, setPaymentsPageNumber] = useState(1);
  const [paymentsPageSize, setPaymentsPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [paymentsTotalCount, setPaymentsTotalCount] = useState(0);
  const [paymentsTotalPages, setPaymentsTotalPages] = useState(0);

  // =========================================================
  // Pagination - Students Finance
  // =========================================================
  const [studentsPageNumber, setStudentsPageNumber] = useState(1);
  const [studentsPageSize, setStudentsPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [studentsTotalCount, setStudentsTotalCount] = useState(0);
  const [studentsTotalPages, setStudentsTotalPages] = useState(0);

  // =========================================================
  // Groups
  // =========================================================
  const [groups, setGroups] = useState([]);

  // =========================================================
  // Filters
  // =========================================================
  const [selectedGroup, setSelectedGroup] = useState("");

  const [selectedSubscriptionType, setSelectedSubscriptionType] =
    useState("all");

  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState("all");

  const [searchQuery, setSearchQuery] = useState("");

  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedYear, setSelectedYear] = useState("all");
  const [availableYears, setAvailableYears] = useState([]);

  // =========================================================
  // Loading
  // =========================================================
  const [loading, setLoading] = useState(false);

  // =========================================================
  // Payment Modal
  // =========================================================
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPaymentToEdit, setSelectedPaymentToEdit] = useState(null);

  // =========================================================
  // Delete Payment Modal
  // =========================================================
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [selectedPaymentToDelete, setSelectedPaymentToDelete] = useState(null);

  const [deletingPayment, setDeletingPayment] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  // =========================================================
  // Receipt Modal
  // =========================================================
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [receiptPaymentId, setReceiptPaymentId] = useState(null);

  // =========================================================
  // Load Groups
  // =========================================================
  useEffect(() => {
    examService.getGroups().then((res) => {
      setGroups(res?.data || []);
    });
  }, []);

  // =========================================================
  // Extract Data From API Response
  // =========================================================
  const extractPaginatedResponse = (res) => {
    let result = res;

    // Axios wrapper
    if (res?.data && !Array.isArray(res.data) && typeof res.data === "object") {
      result = res.data;
    }

    // Sometimes backend response is:
    // { data: { items: [], totalCount: ... } }
    if (
      result?.data &&
      !Array.isArray(result.data) &&
      typeof result.data === "object"
    ) {
      result = result.data;
    }

    const items =
      result?.items || result?.Items || result?.data || result?.Data || [];

    const totalCount = result?.totalCount ?? result?.TotalCount ?? 0;

    const pageNumber = result?.pageNumber ?? result?.PageNumber ?? 1;

    const pageSize = result?.pageSize ?? result?.PageSize ?? DEFAULT_PAGE_SIZE;

    const totalPages =
      result?.totalPages ??
      result?.TotalPages ??
      Math.ceil(totalCount / pageSize);

    return {
      items: Array.isArray(items) ? items : [],
      totalCount: Number(totalCount) || 0,
      pageNumber: Number(pageNumber) || 1,
      pageSize: Number(pageSize) || DEFAULT_PAGE_SIZE,
      totalPages: Number(totalPages) || 0,
    };
  };

  // =========================================================
  // Extract Normal List
  // Used only for available years
  // =========================================================
  const extractData = (res) => {
    if (Array.isArray(res)) {
      return res;
    }

    if (Array.isArray(res?.data)) {
      return res.data;
    }

    if (Array.isArray(res?.Data)) {
      return res.Data;
    }

    if (Array.isArray(res?.items)) {
      return res.items;
    }

    if (Array.isArray(res?.Items)) {
      return res.Items;
    }

    if (Array.isArray(res?.data?.data)) {
      return res.data.data;
    }

    if (Array.isArray(res?.data?.Data)) {
      return res.data.Data;
    }

    if (Array.isArray(res?.data?.items)) {
      return res.data.items;
    }

    if (Array.isArray(res?.data?.Items)) {
      return res.data.Items;
    }

    return [];
  };

  // =========================================================
  // Load Available Years
  // =========================================================
  const loadAvailableYears = async () => {
    try {
      const res = await financeService.getPayments();

      const allPayments = extractData(res);

      const years = Array.from(
        new Set(
          allPayments
            .map((item) => item.billingPeriod || item.paymentDate)
            .filter(Boolean)
            .map((d) => new Date(d).getFullYear())
            .filter((y) => !Number.isNaN(y)),
        ),
      ).sort((a, b) => b - a);

      setAvailableYears(years);
    } catch (err) {
      console.error("Error loading available years:", err);
    }
  };

  useEffect(() => {
    loadAvailableYears();
  }, []);

  // =========================================================
  // Reset Pagination When Filters Change
  // =========================================================
  useEffect(() => {
    setPaymentsPageNumber(1);
    setStudentsPageNumber(1);
  }, [
    selectedGroup,
    selectedSubscriptionType,
    selectedPaymentStatus,
    searchQuery,
    selectedMonth,
    selectedYear,
  ]);

  // =========================================================
  // Fetch Finance Data
  // =========================================================
  const fetchData = async () => {
    setLoading(true);

    try {
      // =====================================================
      // Payments Tab
      // =====================================================
      if (activeTab === "payments") {
        const res = await financeService.getPaymentsPaginated({
          groupId: selectedGroup || null,

          search: searchQuery,

          subscriptionType:
            selectedSubscriptionType === "all"
              ? null
              : Number(selectedSubscriptionType),

          pageNumber: paymentsPageNumber,
          pageSize: paymentsPageSize,
        });

        const paginated = extractPaginatedResponse(res);

        let payments = paginated.items;

        // =====================================================
        // Month / Year filtering
        // =====================================================
        //
        // IMPORTANT:
        // These filters are still applied here because the
        // current GetPaymentsPaginated endpoint does not
        // receive month/year.
        //
        if (selectedMonth !== "all" || selectedYear !== "all") {
          payments = payments.filter((item) => {
            const dateStr = item.billingPeriod || item.paymentDate;

            if (!dateStr) return false;

            const date = new Date(dateStr);

            if (Number.isNaN(date.getTime())) {
              return false;
            }

            const matchesMonth =
              selectedMonth === "all" ||
              date.getMonth() + 1 === Number(selectedMonth);

            const matchesYear =
              selectedYear === "all" ||
              date.getFullYear() === Number(selectedYear);

            return matchesMonth && matchesYear;
          });
        }

        setPaymentsData(payments);

        setPaymentsTotalCount(paginated.totalCount);

        setPaymentsTotalPages(paginated.totalPages);
      }

      // =====================================================
      // Students Finance Tab
      // =====================================================
      else {
        const billingPeriod =
          selectedMonth !== "all" && selectedYear !== "all"
            ? `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`
            : null;

        const res = await financeService.getStudentsFinance({
          groupId: selectedGroup || null,

          search: searchQuery,

          subscriptionType:
            selectedSubscriptionType === "all"
              ? null
              : Number(selectedSubscriptionType),

          paymentStatus:
            selectedPaymentStatus === "all"
              ? null
              : selectedPaymentStatus === "paid"
                ? 2
                : selectedPaymentStatus === "partial"
                  ? 1
                  : 0,

          billingPeriod,

          pageNumber: studentsPageNumber,
          pageSize: studentsPageSize,
        });

        const paginated = extractPaginatedResponse(res);

        setStudentsFinanceData(paginated.items);

        setStudentsTotalCount(paginated.totalCount);

        setStudentsTotalPages(paginated.totalPages);
      }
    } catch (err) {
      console.error("Error fetching finance data:", err);

      if (activeTab === "payments") {
        setPaymentsData([]);
        setPaymentsTotalCount(0);
        setPaymentsTotalPages(0);
      } else {
        setStudentsFinanceData([]);
        setStudentsTotalCount(0);
        setStudentsTotalPages(0);
      }
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // Fetch On Load / Tab / Filter / Page Changes
  // =========================================================
  useEffect(() => {
    fetchData();
  }, [
    activeTab,
    selectedGroup,
    selectedSubscriptionType,
    selectedPaymentStatus,
    searchQuery,
    selectedMonth,
    selectedYear,
    paymentsPageNumber,
    paymentsPageSize,
    studentsPageNumber,
    studentsPageSize,
  ]);

  // =========================================================
  // SignalR
  // =========================================================
  useEffect(() => {
    startFinanceConnection(() => {
      fetchData();
      loadAvailableYears();
    });
  }, []);

  // =========================================================
  // Pagination Helpers
  // =========================================================
  const currentPage =
    activeTab === "payments" ? paymentsPageNumber : studentsPageNumber;

  const currentTotalPages =
    activeTab === "payments" ? paymentsTotalPages : studentsTotalPages;

  const currentTotalCount =
    activeTab === "payments" ? paymentsTotalCount : studentsTotalCount;

  const currentPageSize =
    activeTab === "payments" ? paymentsPageSize : studentsPageSize;

  const handlePageChange = (page) => {
    if (page < 1 || page > currentTotalPages || page === currentPage) {
      return;
    }

    if (activeTab === "payments") {
      setPaymentsPageNumber(page);
    } else {
      setStudentsPageNumber(page);
    }
  };

  const handlePageSizeChange = (e) => {
    const newSize = Number(e.target.value);

    if (activeTab === "payments") {
      setPaymentsPageSize(newSize);
      setPaymentsPageNumber(1);
    } else {
      setStudentsPageSize(newSize);
      setStudentsPageNumber(1);
    }
  };

  // =========================================================
  // Add Payment
  // =========================================================
  const handleOpenAddModal = () => {
    setSelectedPaymentToEdit(null);
    setIsModalOpen(true);
  };

  // =========================================================
  // After Adding / Editing A Payment
  // =========================================================
  // The add endpoint returns the new payment id as the response data, so we
  // can open its receipt right away. Edit returns no id -> just refresh.
  const handlePaymentSaved = async (newPaymentId) => {
    await fetchData();

    if (newPaymentId) {
      setReceiptPaymentId(newPaymentId);
      setIsReceiptOpen(true);
    }
  };

  // =========================================================
  // Open Receipt
  // =========================================================
  const handleOpenReceipt = (payment) => {
    const id = payment?.paymentId || payment?.id;
    if (!id) return;

    setReceiptPaymentId(id);
    setIsReceiptOpen(true);
  };

  const handleCloseReceipt = () => {
    setIsReceiptOpen(false);
    setReceiptPaymentId(null);
  };

  // =========================================================
  // Edit Payment
  // =========================================================
  const handleOpenEditModal = (payment) => {
    setSelectedPaymentToEdit(payment);
    setIsModalOpen(true);
  };

  // =========================================================
  // Open Delete Confirmation
  // =========================================================
  const handleDeletePayment = (paymentId, studentName) => {
    if (!paymentId) {
      console.error("Payment ID is missing.");
      return;
    }

    setSelectedPaymentToDelete({
      paymentId,
      studentName,
    });

    setIsDeleteModalOpen(true);
  };

  // =========================================================
  // Confirm Delete Payment
  // =========================================================
  const confirmDeletePayment = async () => {
    if (!selectedPaymentToDelete?.paymentId) {
      return;
    }

    try {
      setDeletingPayment(true);

      await financeService.deletePayment(selectedPaymentToDelete.paymentId);

      setIsDeleteModalOpen(false);
      setSelectedPaymentToDelete(null);

      await fetchData();

      setDeleteSuccess(true);

      setTimeout(() => {
        setDeleteSuccess(false);
      }, 3000);
    } catch (error) {
      console.error("Error deleting payment:", error);
    } finally {
      setDeletingPayment(false);
    }
  };

  // =========================================================
  // Close Delete Modal
  // =========================================================
  const handleCloseDeleteModal = () => {
    if (deletingPayment) return;

    setIsDeleteModalOpen(false);
    setSelectedPaymentToDelete(null);
  };

  // =========================================================
  // Close Payment Modal
  // =========================================================
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPaymentToEdit(null);
  };

  // =========================================================
  // Get Student Payment Status For UI
  // =========================================================
  const getStudentPaymentStatus = (student) => {
    if (student.joinedAfterBillingPeriod) {
      return 3;
    }
    if (student.isPaidAlways) {
      return 2;
    }

    if (student.remainingAmount <= 0 && student.paidAmount > 0) {
      return 2;
    }

    if (student.paidAmount > 0) {
      return 1;
    }

    return 0;
  };

  // =========================================================
  // Students Data
  // =========================================================
  const students = studentsFinanceData || [];

  // =========================================================
  // Pagination
  // =========================================================
  const paginationName = activeTab === "payments" ? "دفعة" : "طالب";

  const renderActions = (item) => (
    <div className="flex items-center gap-2 md:justify-center">
      <Button
        size="icon"
        variant="secondary"
        onClick={() => handleOpenReceipt(item)}
        aria-label={`Print receipt for ${item.studentName}`}
        title="طباعة الإيصال"
        className="text-primary"
      >
        <Printer className="h-4 w-4" aria-hidden="true" />
      </Button>

      <Button
        size="icon"
        variant="secondary"
        onClick={() => handleOpenEditModal(item)}
        aria-label={`Edit ${item.studentName}`}
        title="تعديل الدفعة"
        className="text-status-warning"
      >
        <Pencil className="h-4 w-4" aria-hidden="true" />
      </Button>

      <Button
        size="icon"
        variant="secondary"
        onClick={() =>
          handleDeletePayment(
            item.paymentId || item.id,
            item.studentName,
          )
        }
        aria-label={`Delete ${item.studentName}`}
        title="حذف الدفعة"
        className="text-status-danger"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );

  const formatDate = (value) =>
    value ? new Date(value).toLocaleDateString("ar-EG") : "-";

  return (
    <div
      dir="rtl"
      data-testid="finance-page"
      className="min-h-screen bg-surface-bg font-sans text-text-main"
    >
      <div className="mx-auto max-w-[90rem] space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        {/* =====================================================
            Delete Success
        ====================================================== */}
        {deleteSuccess && (
          <div
            role="status"
            className="fixed left-1/2 top-6 z-[100] -translate-x-1/2"
          >
            <div className="flex items-center gap-3 rounded-card border border-status-success/40 bg-status-success-bg px-5 py-3 text-status-success shadow-lg">
              <BadgeCheck className="h-5 w-5" aria-hidden="true" />

              <span className="text-sm font-bold">تم حذف الدفعة بنجاح</span>
            </div>
          </div>
        )}

        <PageHeader
          title="إدارة المالية والاشتراكات"
          subtitle="متابعة تحصيل المدفوعات واشتراكات الطلاب"
          actions={
            <Button onClick={handleOpenAddModal}>+ إضافة دفعة جديدة</Button>
          }
        />

        <Tabs
          tabs={[
            { id: "payments", label: "سجل الحركات المالية" },
            { id: "students", label: "حالة دفع الطلاب (متابعة الاشتراكات)" },
          ]}
          activeId={activeTab}
          onChange={setActiveTab}
        />

        {/* =====================================================
            Filters
        ====================================================== */}
        <div className="rounded-card border border-surface-border bg-surface-card p-4 shadow-soft">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Input
              type="text"
              aria-label="بحث باسم الطالب"
              placeholder="بحث باسم الطالب..."
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
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </Select>

            <Select
              aria-label="نوع الاشتراك"
              value={selectedSubscriptionType}
              onChange={(e) => {
                setSelectedSubscriptionType(e.target.value);

                if (e.target.value !== "2") {
                  setSelectedPaymentStatus("all");
                }
              }}
            >
              <option value="all">جميع الاشتراكات</option>
              <option value="2">اشتراك شهري</option>
              <option value="1">دفع بالحصة</option>
            </Select>

            {activeTab === "students" && selectedSubscriptionType === "2" && (
              <Select
                aria-label="حالة الدفع"
                value={selectedPaymentStatus}
                onChange={(e) => setSelectedPaymentStatus(e.target.value)}
              >
                <option value="all">كل حالات الشهري</option>
                <option value="unpaid">غير مدفوع (عليهم فلوس)</option>
                <option value="partial">تم دفع جزء</option>
                <option value="paid">تم الدفع</option>
              </Select>
            )}

            <Select
              aria-label="الشهر"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              <option value="all">كل الشهور</option>
              <option value="1">يناير</option>
              <option value="2">فبراير</option>
              <option value="3">مارس</option>
              <option value="4">أبريل</option>
              <option value="5">مايو</option>
              <option value="6">يونيو</option>
              <option value="7">يوليو</option>
              <option value="8">أغسطس</option>
              <option value="9">سبتمبر</option>
              <option value="10">أكتوبر</option>
              <option value="11">نوفمبر</option>
              <option value="12">ديسمبر</option>
            </Select>

            <Select
              aria-label="السنة"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              <option value="all">كل السنين</option>

              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </Select>

            <Select
              aria-label="عدد الصفوف في الصفحة"
              value={currentPageSize}
              onChange={handlePageSizeChange}
            >
              <option value={10}>10 / صفحة</option>
              <option value={20}>20 / صفحة</option>
              <option value={50}>50 / صفحة</option>
            </Select>
          </div>
        </div>

        {/* =====================================================
            Data
        ====================================================== */}
        {loading ? (
          <div className="rounded-card border border-surface-border bg-surface-card p-12 text-center text-sm font-medium text-text-muted">
            جاري التحميل...
          </div>
        ) : activeTab === "payments" ? (
          paymentsData.length === 0 ? (
            <div className="rounded-card border border-surface-border bg-surface-card shadow-soft">
              <EmptyState
                icon={Wallet}
                title="لا توجد مدفوعات تطابق خيارات الفلترة الحالية"
              />
            </div>
          ) : (
            <>
              {/* Phones: payment cards */}
              <ul data-testid="payments-cards" className="space-y-3 md:hidden">
                {paymentsData.map((item) => (
                  <li
                    key={item.paymentId || item.id}
                    className="rounded-card border border-surface-border bg-surface-card p-4 shadow-soft"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words font-bold text-text-main">
                          {item.studentName}
                        </p>
                        <p className="mt-0.5 break-words text-sm text-text-muted">
                          {item.groupName || "-"}
                        </p>
                      </div>

                      <span className="num shrink-0 whitespace-nowrap text-base font-extrabold text-status-success">
                        {formatCurrency(item.amount)}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <StatusPill
                        tone={item.subscriptionType === 1 ? "warning" : "info"}
                      >
                        {item.subscriptionType === 1 ? "بالحصة" : "شهري"}
                      </StatusPill>

                      <span className="num text-sm text-text-muted">
                        {formatDate(item.paymentDate)}
                      </span>
                    </div>

                    <dl className="mt-3 space-y-1.5 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-text-muted">استلم بواسطة</dt>
                        <dd className="min-w-0 break-words text-text-main">
                          {item.receivedByName || "-"}
                        </dd>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-text-muted">الفترة / الحصة</dt>
                        <dd className="min-w-0 break-words text-text-main">
                          {item.subscriptionType === 2
                            ? item.billingPeriod
                              ? `شهر ${new Date(
                                  item.billingPeriod,
                                ).toLocaleDateString("ar-EG", {
                                  month: "long",
                                  year: "numeric",
                                })}`
                              : "-"
                            : item.sessionName || "حصة عادية"}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-3">{renderActions(item)}</div>
                  </li>
                ))}
              </ul>

              {/* Tablets and up */}
              <div data-testid="payments-table" className="hidden md:block">
                <Table className="min-w-[64rem] whitespace-nowrap">
                  <TableHead>
                    <TableRow className="hover:bg-transparent">
                      <TableHeaderCell>الطالب</TableHeaderCell>
                      <TableHeaderCell>المجموعة</TableHeaderCell>
                      <TableHeaderCell>نوع الاشتراك</TableHeaderCell>
                      <TableHeaderCell>المبلغ</TableHeaderCell>
                      <TableHeaderCell>التاريخ</TableHeaderCell>
                      <TableHeaderCell>استلم بواسطة</TableHeaderCell>
                      <TableHeaderCell>الفترة / الحصة</TableHeaderCell>
                      <TableHeaderCell className="text-center">
                        الإجراءات
                      </TableHeaderCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {paymentsData.map((item) => (
                      <TableRow key={item.paymentId || item.id}>
                        <TableCell className="max-w-[14rem] break-words font-medium">
                          {item.studentName}
                        </TableCell>

                        <TableCell className="max-w-[12rem] truncate text-text-muted">
                          {item.groupName || "-"}
                        </TableCell>

                        <TableCell>
                          <StatusPill
                            tone={
                              item.subscriptionType === 1 ? "warning" : "info"
                            }
                          >
                            {item.subscriptionType === 1 ? "بالحصة" : "شهري"}
                          </StatusPill>
                        </TableCell>

                        <TableCell className="num font-bold text-status-success">
                          {formatCurrency(item.amount)}
                        </TableCell>

                        <TableCell className="num text-text-muted">
                          {formatDate(item.paymentDate)}
                        </TableCell>

                        <TableCell className="max-w-[12rem] truncate text-text-muted">
                          {item.receivedByName || "-"}
                        </TableCell>

                        <TableCell>
                          {item.subscriptionType === 2 ? (
                            <span className="font-medium text-text-main">
                              {item.billingPeriod ? (
                                <span>
                                  شهر{" "}
                                  {new Date(
                                    item.billingPeriod,
                                  ).toLocaleDateString("ar-EG", {
                                    month: "long",
                                    year: "numeric",
                                  })}
                                </span>
                              ) : (
                                <span className="text-text-muted">-</span>
                              )}
                            </span>
                          ) : (
                            <div className="flex flex-col gap-0.5">
                              <span className="font-semibold text-text-main">
                                {item.sessionName || "حصة عادية"}
                              </span>

                              <span className="num text-xs text-text-muted">
                                بتاريخ:{" "}
                                {item.paymentDate
                                  ? new Date(
                                      item.paymentDate,
                                    ).toLocaleDateString("ar-EG", {
                                      day: "numeric",
                                      month: "short",
                                    })
                                  : "-"}
                              </span>
                            </div>
                          )}
                        </TableCell>

                        <TableCell>{renderActions(item)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )
        ) : students.length === 0 ? (
          <div className="rounded-card border border-surface-border bg-surface-card shadow-soft">
            <EmptyState
              icon={Receipt}
              title="لا توجد نتائج تطابق خيارات الفلترة الحالية"
            />
          </div>
        ) : (
          <>
            {/* Phones: subscription-status cards */}
            <ul data-testid="students-cards" className="space-y-3 md:hidden">
              {students.map((item) => {
                const status = getStudentPaymentStatus(item);

                return (
                  <li
                    key={item.studentId}
                    className="rounded-card border border-surface-border bg-surface-card p-4 shadow-soft"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <p className="break-words font-bold text-text-main">
                          {item.studentName}
                        </p>

                        {item.isPaidAlways && (
                          <span title="تم الدفع دائمًا" className="shrink-0">
                            <BadgeCheck
                              size={18}
                              className="text-status-success"
                              aria-hidden="true"
                            />
                          </span>
                        )}
                      </div>

                      {item.subscriptionType === 2 ? (
                        status === 3 ? (
                          <StatusPill tone="info">لم يكن مشتركًا</StatusPill>
                        ) : (
                          <StatusPill
                            tone={
                              status === 2
                                ? "success"
                                : status === 1
                                  ? "warning"
                                  : "danger"
                            }
                          >
                            {status === 2
                              ? "تم الدفع"
                              : status === 1
                                ? "دفع جزء"
                                : "غير مدفوع"}
                          </StatusPill>
                        )
                      ) : (
                        <StatusPill tone="neutral">دفع بالحصة</StatusPill>
                      )}
                    </div>

                    <p className="mt-1 break-words text-sm text-text-muted">
                      {item.groupName || "-"} ·{" "}
                      {item.subscriptionType === 2 ? "شهري" : "بالحصة"}
                    </p>

                    <dl className="mt-3 grid grid-cols-2 gap-2 rounded-control bg-surface-muted/60 p-2.5">
                      <div className="min-w-0">
                        <dt className="text-xs text-text-muted">
                          آخر مبلغ مدفوع
                        </dt>
                        <dd className="num mt-0.5 break-words text-sm font-semibold text-text-main">
                          {item.lastPaymentAmount
                            ? `${item.lastPaymentAmount} ج.م`
                            : "-"}
                        </dd>
                      </div>

                      <div className="min-w-0">
                        <dt className="text-xs text-text-muted">
                          تاريخ آخر دفع
                        </dt>
                        <dd className="num mt-0.5 break-words text-sm text-text-main">
                          {formatDate(item.lastPaymentDate)}
                        </dd>
                      </div>

                      {item.subscriptionType === 2 &&
                        status !== 3 &&
                        item.remainingAmount > 0 && (
                          <div className="col-span-2">
                            <dt className="text-xs text-text-muted">متبقي</dt>
                            <dd className="num mt-0.5 break-words text-sm font-bold text-status-danger">
                              متبقي: {formatCurrency(item.remainingAmount)}
                            </dd>
                          </div>
                        )}

                      {item.subscriptionType === 2 && status === 3 && (
                        <div className="col-span-2">
                          <dt className="text-xs text-text-muted">
                            تاريخ الانضمام
                          </dt>
                          <dd className="num mt-0.5 break-words text-sm text-text-main">
                            {item.joinDate
                              ? new Date(item.joinDate).toLocaleDateString(
                                  "ar-EG",
                                  {
                                    month: "long",
                                    year: "numeric",
                                  },
                                )
                              : "-"}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </li>
                );
              })}
            </ul>

            {/* Tablets and up */}
            <div data-testid="students-table" className="hidden md:block">
              <Table className="min-w-[56rem] whitespace-nowrap">
                <TableHead>
                  <TableRow className="hover:bg-transparent">
                    <TableHeaderCell>اسم الطالب</TableHeaderCell>
                    <TableHeaderCell>المجموعة</TableHeaderCell>
                    <TableHeaderCell>نوع الاشتراك</TableHeaderCell>
                    <TableHeaderCell className="text-center">
                      حالة الشهر الحالي
                    </TableHeaderCell>
                    <TableHeaderCell>آخر مبلغ مدفوع</TableHeaderCell>
                    <TableHeaderCell>تاريخ آخر دفع</TableHeaderCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {students.map((item) => {
                    const status = getStudentPaymentStatus(item);

                    return (
                      <TableRow key={item.studentId}>
                        <TableCell className="max-w-[14rem] break-words font-medium">
                          <span className="flex items-center gap-2">
                            <span className="min-w-0 break-words">
                              {item.studentName}
                            </span>

                            {item.isPaidAlways && (
                              <span title="تم الدفع دائمًا" className="shrink-0">
                                <BadgeCheck
                                  size={18}
                                  className="text-status-success"
                                  aria-hidden="true"
                                />
                              </span>
                            )}
                          </span>
                        </TableCell>

                        <TableCell className="max-w-[12rem] truncate text-text-muted">
                          {item.groupName}
                        </TableCell>

                        <TableCell className="text-text-muted">
                          {item.subscriptionType === 2 ? "شهري" : "بالحصة"}
                        </TableCell>

                        <TableCell className="text-center">
                          {item.subscriptionType === 2 ? (
                            <div className="flex min-h-[52px] flex-col items-center justify-center gap-1.5">
                              {status === 3 ? (
                                <>
                                  <StatusPill tone="info">
                                    لم يكن مشتركًا
                                  </StatusPill>

                                  {item.joinDate && (
                                    <span className="num text-xs text-text-muted">
                                      انضم في{" "}
                                      {new Date(
                                        item.joinDate,
                                      ).toLocaleDateString("ar-EG", {
                                        month: "long",
                                        year: "numeric",
                                      })}
                                    </span>
                                  )}
                                </>
                              ) : (
                                <>
                                  <StatusPill
                                    tone={
                                      status === 2
                                        ? "success"
                                        : status === 1
                                          ? "warning"
                                          : "danger"
                                    }
                                  >
                                    {status === 2
                                      ? "تم الدفع"
                                      : status === 1
                                        ? "دفع جزء"
                                        : "غير مدفوع"}
                                  </StatusPill>

                                  {item.remainingAmount > 0 && (
                                    <span className="num rounded-control bg-status-danger-bg px-2 py-0.5 text-xs font-bold text-status-danger">
                                      متبقي:{" "}
                                      {formatCurrency(item.remainingAmount)}
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          ) : (
                            <div className="flex min-h-[52px] items-center justify-center">
                              <StatusPill tone="neutral">
                                دفع بالحصة
                              </StatusPill>
                            </div>
                          )}
                        </TableCell>

                        <TableCell className="num font-semibold text-text-main">
                          {item.lastPaymentAmount
                            ? `${item.lastPaymentAmount} ج.م`
                            : "-"}
                        </TableCell>

                        <TableCell className="num text-text-muted">
                          {formatDate(item.lastPaymentDate)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {!loading && currentTotalCount > 0 && currentTotalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={currentTotalPages}
            totalItems={currentTotalCount}
            pageSize={currentPageSize}
            name={paginationName}
            testId="finance-pagination"
            onPageChange={handlePageChange}
          />
        )}
      </div>

      {/* =====================================================
          Payment Modal
      ====================================================== */}
      <AddPaymentModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handlePaymentSaved}
        paymentToEdit={selectedPaymentToEdit}
      />

      {/* =====================================================
          Receipt Modal
      ====================================================== */}
      <PaymentReceiptModal
        isOpen={isReceiptOpen}
        paymentId={receiptPaymentId}
        onClose={handleCloseReceipt}
      />

      {/* =====================================================
          Delete Confirmation Modal
      ====================================================== */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={confirmDeletePayment}
        title="حذف الدفعة"
        message={
          selectedPaymentToDelete
            ? `هل أنت متأكد من حذف دفعة الطالب "${selectedPaymentToDelete.studentName}"؟ لا يمكن التراجع عن هذا الإجراء.`
            : "هل أنت متأكد من حذف هذه الدفعة؟"
        }
        confirmText="حذف"
        cancelText="إلغاء"
        loading={deletingPayment}
      />
    </div>
  );
}
