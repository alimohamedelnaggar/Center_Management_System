import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Printer,
  Trash2,
} from "@/components/icons";
import { useEffect, useState } from "react";

import AddPaymentModal from "../components/common/AddPaymentModal";
import ConfirmModal from "../components/common/ConfirmModal";
import PaymentReceiptModal from "../components/common/PaymentReceiptModal";

import { examService } from "../services/examService";
import { financeService } from "../services/financeService";
import { startFinanceConnection } from "../services/signalr/financeSignalR";

import { formatCurrency } from "../utils/formatCurrency";

const BASE_BUTTON_CLASS =
  "p-2 rounded-lg border transition-all duration-200 inline-flex items-center justify-center cursor-pointer group";

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
  const getPageNumbers = (currentPage, totalPages) => {
    if (!totalPages || totalPages <= 1) {
      return [];
    }

    const pages = [];

    const maxVisiblePages = 5;

    let startPage = Math.max(1, currentPage - 2);

    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let page = startPage; page <= endPage; page++) {
      pages.push(page);
    }

    return pages;
  };

  const currentPage =
    activeTab === "payments" ? paymentsPageNumber : studentsPageNumber;

  const currentTotalPages =
    activeTab === "payments" ? paymentsTotalPages : studentsTotalPages;

  const currentTotalCount =
    activeTab === "payments" ? paymentsTotalCount : studentsTotalCount;

  const currentPageSize =
    activeTab === "payments" ? paymentsPageSize : studentsPageSize;

  const currentDataLength =
    activeTab === "payments" ? paymentsData.length : studentsFinanceData.length;

  const pageNumbers = getPageNumbers(currentPage, currentTotalPages);

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
  // Pagination Component
  // =========================================================
  const renderPagination = () => {
    if (currentTotalCount === 0 || currentTotalPages <= 1) {
      return null;
    }

    const from = (currentPage - 1) * currentPageSize + 1;

    const to = Math.min(currentPage * currentPageSize, currentTotalCount);

    return (
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 border-t border-[var(--color-surface-border)] bg-[var(--color-surface-card)]">
        {/* Results Info */}
        <div className="flex items-center gap-3 text-sm text-[var(--color-text-muted)]">
          <span>
            عرض{" "}
            <span className="font-bold text-[var(--color-text-main)]">
              {from}
            </span>{" "}
            إلى{" "}
            <span className="font-bold text-[var(--color-text-main)]">
              {to}
            </span>{" "}
            من{" "}
            <span className="font-bold text-[var(--color-text-main)]">
              {currentTotalCount}
            </span>
          </span>

          {/* Page Size */}
          <select
            value={currentPageSize}
            onChange={handlePageSizeChange}
            className="p-2 rounded-lg border border-[var(--color-surface-border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            <option value={10}>10 / صفحة</option>
            <option value={20}>20 / صفحة</option>
            <option value={50}>50 / صفحة</option>
          </select>
        </div>

        {/* Pagination Buttons */}
        <div className="flex items-center gap-1" dir="ltr">
          {/* Previous */}
          <button
            type="button"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-all ${
              currentPage === 1
                ? "text-slate-300 border-slate-200 bg-slate-50 cursor-not-allowed"
                : "text-slate-600 border-slate-200 bg-white hover:bg-slate-50 hover:border-[var(--color-primary)] cursor-pointer"
            }`}
            title="الصفحة السابقة"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* First Page */}
          {pageNumbers[0] > 1 && (
            <>
              <button
                type="button"
                onClick={() => handlePageChange(1)}
                className="w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                1
              </button>

              {pageNumbers[0] > 2 && (
                <span className="w-9 h-9 flex items-center justify-center text-slate-400">
                  ...
                </span>
              )}
            </>
          )}

          {/* Page Numbers */}
          {pageNumbers.map((page) => (
            <button
              type="button"
              key={page}
              onClick={() => handlePageChange(page)}
              className={`w-9 h-9 rounded-lg border text-sm font-bold transition-all ${
                page === currentPage
                  ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-[var(--color-primary)] cursor-pointer"
              }`}
            >
              {page}
            </button>
          ))}

          {/* Last Page */}
          {pageNumbers[pageNumbers.length - 1] < currentTotalPages && (
            <>
              {pageNumbers[pageNumbers.length - 1] < currentTotalPages - 1 && (
                <span className="w-9 h-9 flex items-center justify-center text-slate-400">
                  ...
                </span>
              )}

              <button
                type="button"
                onClick={() => handlePageChange(currentTotalPages)}
                className="w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                {currentTotalPages}
              </button>
            </>
          )}

          {/* Next */}
          <button
            type="button"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === currentTotalPages}
            className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-all ${
              currentPage === currentTotalPages
                ? "text-slate-300 border-slate-200 bg-slate-50 cursor-not-allowed"
                : "text-slate-600 border-slate-200 bg-white hover:bg-slate-50 hover:border-[var(--color-primary)] cursor-pointer"
            }`}
            title="الصفحة التالية"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 bg-[var(--color-surface-bg)] min-h-screen text-[var(--color-text-main)] dir-rtl space-y-6">
      {/* =====================================================
          Delete Success
      ====================================================== */}
      {deleteSuccess && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100]">
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-700 px-5 py-3 rounded-xl shadow-lg">
            <BadgeCheck className="w-5 h-5" />

            <span className="text-sm font-bold">تم حذف الدفعة بنجاح</span>
          </div>
        </div>
      )}

      {/* =====================================================
          Header
      ====================================================== */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-primary)]">
            إدارة المالية والاشتراكات
          </h1>

          <p className="text-sm text-[var(--color-text-muted)]">
            متابعة تحصيل المدفوعات واشتراكات الطلاب
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleOpenAddModal}
            className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-5 py-2 rounded-xl text-sm font-bold shadow-md transition-all cursor-pointer"
          >
            + إضافة دفعة جديدة
          </button>
        </div>
      </div>

      {/* =====================================================
          Tabs
      ====================================================== */}
      <div className="flex border-b border-[var(--color-surface-border)] gap-6">
        <button
          onClick={() => {
            setActiveTab("payments");
          }}
          className={`pb-3 font-bold text-sm border-b-2 transition-colors cursor-pointer ${
            activeTab === "payments"
              ? "border-[var(--color-primary)] text-[var(--color-primary)]"
              : "border-transparent text-[var(--color-text-muted)] hover:text-gray-700"
          }`}
        >
          سجل الحركات المالية
        </button>

        <button
          onClick={() => {
            setActiveTab("students");
          }}
          className={`pb-3 font-bold text-sm border-b-2 transition-colors cursor-pointer ${
            activeTab === "students"
              ? "border-[var(--color-primary)] text-[var(--color-primary)]"
              : "border-transparent text-[var(--color-text-muted)] hover:text-gray-700"
          }`}
        >
          حالة دفع الطلاب (متابعة الاشتراكات)
        </button>
      </div>

      {/* =====================================================
          Filters
      ====================================================== */}
      <div className="flex flex-wrap items-center gap-4 bg-[var(--color-surface-card)] p-4 rounded-xl border border-[var(--color-surface-border)] shadow-sm">
        {/* Search */}
        <input
          type="text"
          placeholder="بحث باسم الطالب..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
          }}
          className="p-2.5 rounded-lg border border-[var(--color-surface-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] min-w-[200px]"
        />

        {/* Group */}
        <select
          value={selectedGroup}
          onChange={(e) => {
            setSelectedGroup(e.target.value);
          }}
          className="p-2.5 rounded-lg border border-[var(--color-surface-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
        >
          <option value="">جميع المجموعات</option>

          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>

        {/* Subscription Type */}
        <select
          value={selectedSubscriptionType}
          onChange={(e) => {
            setSelectedSubscriptionType(e.target.value);

            if (e.target.value !== "2") {
              setSelectedPaymentStatus("all");
            }
          }}
          className="p-2.5 rounded-lg border border-[var(--color-surface-border)] bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
        >
          <option value="all">جميع الاشتراكات</option>

          <option value="2">اشتراك شهري</option>

          <option value="1">دفع بالحصة</option>
        </select>

        {/* Payment Status */}
        {activeTab === "students" && selectedSubscriptionType === "2" && (
          <select
            value={selectedPaymentStatus}
            onChange={(e) => {
              setSelectedPaymentStatus(e.target.value);
            }}
            className="p-2.5 rounded-lg border border-[var(--color-surface-border)] bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            <option value="all">كل حالات الشهري</option>

            <option value="unpaid">غير مدفوع (عليهم فلوس)</option>

            <option value="partial">تم دفع جزء</option>

            <option value="paid">تم الدفع</option>
          </select>
        )}

        {/* Month */}
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="p-2.5 rounded-lg border border-[var(--color-surface-border)] bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
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
        </select>

        {/* Year */}
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          className="p-2.5 rounded-lg border border-[var(--color-surface-border)] bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
        >
          <option value="all">كل السنين</option>

          {availableYears.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      {/* =====================================================
          Tables
      ====================================================== */}
      <div className="bg-[var(--color-surface-card)] rounded-xl border border-[var(--color-surface-border)] shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-[var(--color-text-muted)] font-medium">
            جاري التحميل...
          </div>
        ) : activeTab === "payments" ? (
          <>
            {/* =================================================
                Payments Table
            ================================================== */}
            <div className="w-full overflow-x-auto rounded-xl border border-surface-border shadow-xs">
              <table className="w-full min-w-[600px] text-right text-sm">
                <thead className="bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] font-bold">
                  <tr>
                    <th className="p-3">الطالب</th>

                    <th className="p-3">المجموعة</th>

                    <th className="p-3">نوع الاشتراك</th>

                    <th className="p-3">المبلغ</th>

                    <th className="p-3">التاريخ</th>

                    <th className="p-3">استلم بواسطة</th>

                    <th className="p-3">الفترة / الحصة</th>

                    <th className="p-3">الإجراءات</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[var(--color-surface-border)]">
                  {paymentsData.length === 0 ? (
                    <tr>
                      <td
                        colSpan="8"
                        className="p-12 text-center text-slate-400"
                      >
                        لا توجد مدفوعات تطابق خيارات الفلترة الحالية
                      </td>
                    </tr>
                  ) : (
                    paymentsData.map((item) => (
                      <tr
                        key={item.paymentId || item.id}
                        className="hover:bg-slate-50"
                      >
                        {/* Student */}
                        <td className="p-3 font-medium">{item.studentName}</td>

                        {/* Group */}
                        <td className="p-3">{item.groupName}</td>

                        {/* Subscription */}
                        <td className="p-3">
                          <span
                            className={`px-2 py-1 rounded-md text-xs font-bold ${
                              item.subscriptionType === 1
                                ? "bg-amber-100 text-amber-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {item.subscriptionType === 1 ? "بالحصة" : "شهري"}
                          </span>
                        </td>

                        {/* Amount */}
                        <td className="p-3 font-bold text-green-600">
                          {formatCurrency(item.amount)}
                        </td>

                        {/* Payment Date */}
                        <td className="p-3 text-[var(--color-text-muted)]">
                          {item.paymentDate
                            ? new Date(item.paymentDate).toLocaleDateString(
                                "ar-EG",
                              )
                            : "-"}
                        </td>

                        {/* Received By */}
                        <td className="p-3 text-[var(--color-text-muted)]">
                          {item.receivedByName ? item.receivedByName : "-"}
                        </td>
                        <td className="p-3">
                          {item.subscriptionType === 2 ? (
                            <div className="flex items-center gap-1.5 font-medium text-slate-700">
                              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>

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
                                <span className="text-slate-400">-</span>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>

                                <span>{item.sessionName || "حصة عادية"}</span>
                              </div>

                              <span className="text-xs text-slate-500 font-normal pr-3">
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
                        </td>

                        {/* Actions */}
                        <td className="p-3 font-medium">
                          <div className="flex items-center gap-2">
                            {/* Print Receipt */}
                            <button
                              onClick={() => handleOpenReceipt(item)}
                              aria-label={`Print receipt for ${item.studentName}`}
                              title="طباعة الإيصال"
                              className={`${BASE_BUTTON_CLASS} text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-300 hover:text-blue-700`}
                            >
                              <Printer className="h-4 w-4 transition-transform group-hover:scale-110" />
                            </button>

                            {/* Edit */}
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              aria-label={`Edit ${item.studentName}`}
                              title="تعديل الدفعة"
                              className={`${BASE_BUTTON_CLASS} text-amber-600 border-amber-200 bg-amber-50 hover:bg-amber-100 hover:border-amber-300 hover:text-amber-700`}
                            >
                              <Pencil className="h-4 w-4 transition-transform group-hover:rotate-6 group-hover:scale-110" />
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() =>
                                handleDeletePayment(
                                  item.paymentId || item.id,
                                  item.studentName,
                                )
                              }
                              aria-label={`Delete ${item.studentName}`}
                              title="حذف الدفعة"
                              className={`${BASE_BUTTON_CLASS} text-red-600 border-red-200 bg-red-50 hover:bg-red-100 hover:border-red-300 hover:text-red-700`}
                            >
                              <Trash2 className="h-4 w-4 transition-transform group-hover:scale-110" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Payments Pagination */}
            {renderPagination()}
          </>
        ) : (
          <>
            {/* =================================================
                Students Finance Table
            ================================================== */}
            <div className="w-full overflow-x-auto bg-white rounded-xl border border-[var(--color-surface-border)] shadow-sm">
              <table className="w-full min-w-[750px] text-right text-sm whitespace-nowrap">
                <thead className="bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] font-semibold border-b border-[var(--color-surface-border)]">
                  <tr>
                    <th className="p-4">اسم الطالب</th>

                    <th className="p-4">المجموعة</th>

                    <th className="p-4">نوع الاشتراك</th>

                    <th className="p-4 text-center">حالة الشهر الحالي</th>

                    <th className="p-4">آخر مبلغ مدفوع</th>

                    <th className="p-4">تاريخ آخر دفع</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[var(--color-surface-border)]">
                  {students.length === 0 ? (
                    <tr>
                      <td
                        colSpan="6"
                        className="p-12 text-center text-slate-400"
                      >
                        <div className="flex flex-col items-center justify-center gap-2">
                          <svg
                            className="w-8 h-8 text-slate-300"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a2 2 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                            />
                          </svg>

                          <span>
                            لا توجد نتائج تطابق خيارات الفلترة الحالية
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    students.map((item) => {
                      const status = getStudentPaymentStatus(item);

                      return (
                        <tr
                          key={item.studentId}
                          className="hover:bg-slate-50 transition-colors duration-200"
                        >
                          {/* Student */}
                          <td className="p-4 font-medium text-slate-800">
                            <div className="flex items-center gap-2">
                              <span>{item.studentName}</span>

                              {item.isPaidAlways && (
                                <span title="تم الدفع دائمًا">
                                  <BadgeCheck
                                    size={18}
                                    className="text-green-500"
                                  />
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Group */}
                          <td className="p-4 text-slate-600">
                            {item.groupName}
                          </td>

                          {/* Subscription */}
                          <td className="p-4 text-slate-600">
                            {item.subscriptionType === 2 ? "شهري" : "بالحصة"}
                          </td>

                          {/* Status */}
                          {/* Status */}
                          {item.subscriptionType === 2 ? (
                            <td className="p-4 text-center align-middle">
                              <div className="flex flex-col items-center justify-center gap-1.5 min-h-[52px]">
                                {/* Student Joined After Selected Month */}
                                {status === 3 ? (
                                  <div className="flex flex-col items-center justify-center gap-1">
                                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                      لم يكن مشتركًا
                                    </span>

                                    {item.joinDate && (
                                      <span className="text-[11px] text-slate-500">
                                        انضم في{" "}
                                        {new Date(
                                          item.joinDate,
                                        ).toLocaleDateString("ar-EG", {
                                          month: "long",
                                          year: "numeric",
                                        })}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <>
                                    {/* Payment Status */}
                                    <span
                                      className={`px-3 py-1 rounded-full text-xs font-bold inline-block border ${
                                        status === 2
                                          ? "bg-green-50 text-green-700 border-green-200"
                                          : status === 1
                                            ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                                            : "bg-red-50 text-red-700 border-red-200"
                                      }`}
                                    >
                                      {status === 2
                                        ? "تم الدفع"
                                        : status === 1
                                          ? "دفع جزء"
                                          : "غير مدفوع"}
                                    </span>

                                    {/* Remaining Amount */}
                                    {item.remainingAmount > 0 && (
                                      <span className="text-[11px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-100">
                                        متبقي:{" "}
                                        {formatCurrency(item.remainingAmount)}
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                          ) : (
                            <td className="p-4 text-center align-middle">
                              <div className="flex items-center justify-center min-h-[52px]">
                                <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 inline-block">
                                  دفع بالحصة
                                </span>
                              </div>
                            </td>
                          )}

                          {/* Last Payment Amount */}
                          <td className="p-4 font-semibold text-slate-700">
                            {item.lastPaymentAmount
                              ? `${item.lastPaymentAmount} ج.م`
                              : "-"}
                          </td>

                          {/* Last Payment Date */}
                          <td className="p-4 text-[var(--color-text-muted)]">
                            {item.lastPaymentDate
                              ? new Date(
                                  item.lastPaymentDate,
                                ).toLocaleDateString("ar-EG")
                              : "-"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Students Pagination */}
            {renderPagination()}
          </>
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
