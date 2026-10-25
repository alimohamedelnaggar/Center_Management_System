import {
  Calendar,
  ChevronDown,
  DollarSign,
  FileText,
  MoreHorizontal,
  Pencil,
  Plus,
  Receipt,
  Search,
  ShoppingBag,
  Trash2,
  TrendingUp,
} from "@/components/icons";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import ConfirmModal from "../../components/common/ConfirmModal";
import Pagination from "../../components/common/Pagination";
import Spinner from "../../components/common/Spinner";
import { useAuth } from "../../context/useAuth";
import { groupsService } from "../../services/groupsService";
import { incomeCategoryService } from "../../services/incomeCategoryService";
import { incomeService } from "../../services/incomeService";
import {
  incomeCategoryConnection,
  startIncomeCategoryConnection,
} from "../../services/signalr/incomeCategoryHub";
import {
  incomeConnection,
  startIncomeConnection,
} from "../../services/signalr/incomeHub";
import AddIncomeModal from "./AddIncomeModal";
import ViewIncomeModal from "./ViewIncomeModal";

const CATEGORY_STYLES = {
  مبيعات: {
    icon: ShoppingBag,
    text: "text-status-success",
    bg: "bg-status-success-bg",
  },
  خدمات: {
    icon: TrendingUp,
    text: "text-primary",
    bg: "bg-primary-subtle",
  },
  استشارات: {
    icon: FileText,
    text: "text-status-info",
    bg: "bg-status-info-bg",
  },
  اشتراكات: {
    icon: Receipt,
    text: "text-accent",
    bg: "bg-accent-light",
  },
  أخرى: {
    icon: MoreHorizontal,
    text: "text-text-muted",
    bg: "bg-surface-muted",
  },
};

function CategoryBadge({ category }) {
  const style = CATEGORY_STYLES[category] ?? CATEGORY_STYLES["أخرى"];
  const Icon = style.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${style.bg} ${style.text}`}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2} />
      {category}
    </span>
  );
}

function IconButton({
  children,
  variant = "muted",
  label,
  onClick,
  disabled = false,
}) {
  const variants = {
    danger:
      "text-status-danger bg-status-danger-bg hover:bg-status-danger hover:text-text-inverse",
    primary:
      "text-primary bg-primary-subtle hover:bg-primary hover:text-text-inverse",
    muted:
      "text-text-muted bg-surface-muted hover:bg-surface-border hover:text-text-main",
  };

  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]}`}
    >
      {children}
    </button>
  );
}

export default function IncomesTab() {
  const [search, setSearch] = useState("");
  const [showViewModal, setShowViewModal] = useState(false);

  const [category, setCategory] = useState(null);
  const [categories, setCategories] = useState([]);
  const [groups, setGroups] = useState([]);

  const { role, isCenterAdmin } = useAuth();
  // A regular teacher must tie his income to one of his own groups.
  const requireGroup = role === "Teacher" && !isCenterAdmin;

  const [incomes, setIncomes] = useState([]);
  const [selectedIncome, setSelectedIncome] = useState(null);
  const [totalIncome, setTotalIncome] = useState(0);

  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    pageSize: 10,
  });

  const [loadingAction, setLoadingAction] = useState({
    id: null,
    action: null,
  });

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadIncomes();
  }, [page]);

  // Real-time setup with SignalR
  useEffect(() => {
    loadIncomes();
    startIncomeConnection();

    incomeConnection.on("IncomeAdded", (income) => {
      setIncomes((prev) => [income, ...prev]);
      setTotalIncome((prev) => prev + 1);
      setPagination((prev) => ({
        ...prev,
        totalCount: prev.totalCount + 1,
      }));
    });

    incomeConnection.on("IncomeUpdated", (income) => {
      setIncomes((prev) => prev.map((x) => (x.id === income.id ? income : x)));
    });

    incomeConnection.on("IncomeDeleted", (id) => {
      setIncomes((prev) => prev.filter((x) => x.id !== id));
      setTotalIncome((prev) => Math.max(0, prev - 1));
      setPagination((prev) => ({
        ...prev,
        totalCount: Math.max(0, prev.totalCount - 1),
      }));
    });

    loadCategories();
    loadGroups();
    startIncomeCategoryConnection();

    incomeCategoryConnection.on("IncomeCategoryAdded", (category) => {
      setCategories((prev) => [...prev, category]);
    });

    incomeCategoryConnection.on("IncomeCategoryUpdated", (category) => {
      setCategories((prev) =>
        prev.map((x) => (x.id === category.id ? category : x)),
      );
    });

    incomeCategoryConnection.on("IncomeCategoryDeleted", (id) => {
      setCategories((prev) => prev.filter((x) => x.id !== id));
    });

    return () => {
      incomeCategoryConnection.off("IncomeCategoryAdded");
      incomeCategoryConnection.off("IncomeCategoryUpdated");
      incomeCategoryConnection.off("IncomeCategoryDeleted");

      incomeConnection.off("IncomeAdded");
      incomeConnection.off("IncomeUpdated");
      incomeConnection.off("IncomeDeleted");
    };
  }, []);

  async function loadCategories() {
    try {
      const response = await incomeCategoryService.getAll();
      if (response?.succeeded) {
        setCategories(response.data ?? []);
      } else {
        toast.error(response?.message ?? "فشل في تحميل الفئات");
      }
    } catch (error) {
      toast.error("فشل في تحميل الفئات");
      console.error("فشل في تحميل الفئات", error);
    }
  }

  async function loadGroups() {
    try {
      const response = await groupsService.getAllGroups();
      if (response?.succeeded) {
        setGroups(response.data ?? []);
      }
    } catch (error) {
      console.error("فشل في تحميل المجموعات", error);
    }
  }

  async function loadIncomes(overrideParams) {
    setIsLoading(true);
    try {
      const params = overrideParams ?? {
        pageNumber: page,
        pageSize: 10,
        search: search,
        categoryId: category,
        startDate: startDate,
        endDate: endDate,
      };

      const response = await incomeService.getAllPaged(params);

      if (response?.succeeded) {
        setIncomes(response.data.data ?? []);
        setTotalIncome(response.data.totalCount);
        setPagination({
          currentPage: response.data.currentPage,
          totalPages: response.data.totalPages,
          totalCount: response.data.totalCount,
          pageSize: response.data.pageSize,
        });
      } else {
        toast.error(response?.message ?? "فشل في تحميل الإيرادات");
      }
    } catch (error) {
      toast.error("فشل في تحميل الإيرادات");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  const handleAdd = () => {
    setSelectedIncome(null);
    setShowModal(true);
  };

  const handleEdit = (income) => {
    setSelectedIncome(income);
    setShowModal(true);
  };

  const handleSaveIncome = async (income) => {
    try {
      let response;
      if (income.id) {
        response = await incomeService.update(income);
      } else {
        response = await incomeService.create(income);
      }

      if (response?.succeeded) {
        toast.success(response.message);
        setShowModal(false);
        setSelectedIncome(null);
      } else {
        toast.error(response.message);
      }
    } catch (err) {
      toast.error("حدث خطأ", err);
    }
  };

  const handleDelete = async (income) => {
    setSelectedIncome(income);
    setIsDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      setLoadingAction({ id: selectedIncome.id, action: "delete" });
      const response = await incomeService.delete(selectedIncome.id);

      if (response.succeeded) {
        toast.success(response.message);
      } else {
        toast.error(response.message);
      }

      setIsDeleteOpen(false);
      setSelectedIncome(null);
    } catch (error) {
      toast.error("حدث خطأ أثناء الحذف");
      console.error(error);
    } finally {
      setLoadingAction({ id: null, action: null });
    }
  };

  if (isLoading) {
    return <Spinner msg="جاري تحميل الإيرادات برجاء الانتظار..." />;
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-text-muted">{totalIncome} إيراد إجمالاً</p>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-text-inverse shadow-sm transition-colors hover:bg-primary-hover"
          onClick={handleAdd}
        >
          <Plus className="h-4 w-4" />
          إضافة إيراد جديد
        </button>
      </div>

      {/* Filters */}
      <div className="mb-5 flex items-end gap-3 overflow-x-auto pb-1">
        <div className="relative min-w-[280px] flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث عن إيراد..."
            className="w-full rounded-lg border border-surface-border bg-surface-card py-2.5 ps-9 pe-3 text-sm text-text-main placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-subtle"
          />
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        </div>

        <div className="relative min-w-[180px]">
          <select
            value={category || ""}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full appearance-none rounded-lg border border-surface-border bg-surface-card py-2.5 ps-9 pe-3 text-sm text-text-main focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-subtle"
          >
            <option value="">كل الفئات</option>
            {categories.map((c) => (
              <option key={c.id ?? c} value={c.id ?? c}>
                {c.name ?? c}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        </div>

        <div className="relative min-w-[170px]">
          <input
            type="date"
            value={startDate || ""}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-lg border border-surface-border bg-surface-card py-2.5 ps-3 pe-3 text-sm text-text-main focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-subtle"
          />
        </div>

        {/* <div className="relative min-w-[170px]">
          <input
            type="date"
            value={endDate || ""}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-lg border border-surface-border bg-surface-card py-2.5 ps-3 pe-3 text-sm text-text-main focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-subtle"
          />
        </div> */}

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setPage(1);
              loadIncomes();
            }}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover"
          >
            بحث
          </button>

          <button
            type="button"
            onClick={() => {
              setSearch("");
              setCategory("");
              setStartDate(null);
              setEndDate(null);

              if (page !== 1) {
                setPage(1);
              } else {
                loadIncomes({
                  pageNumber: 1,
                  pageSize: 10,
                  search: "",
                  categoryId: null,
                  startDate: null,
                  endDate: null,
                });
              }
            }}
            className="rounded-lg border border-surface-border bg-surface-card px-5 py-2.5 text-sm font-medium text-text-main transition-colors hover:bg-surface-muted"
          >
            إعادة تعيين
          </button>
        </div>
      </div>

      {/* Table Card */}
      <div className="overflow-hidden rounded-xl border border-surface-border bg-surface-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-180 text-right">
            <thead>
              <tr className="border-b border-surface-border bg-surface-muted text-xs font-semibold text-text-muted">
                <th className="w-12 px-4 py-3">#</th>
                <th className="px-4 py-3">اسم الإيراد</th>
                <th className="px-4 py-3">الفئة</th>
                <th className="px-4 py-3">المبلغ</th>
                <th className="px-4 py-3">التاريخ</th>
                <th className="px-4 py-3">ملاحظات</th>
                <th className="px-4 py-3">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {incomes.map((income, idx) => (
                <tr
                  key={income.id}
                  className="border-b border-surface-border last:border-0 hover:bg-surface-muted/60"
                >
                  <td className="px-4 py-3 text-sm text-text-muted">
                    {idx + 1}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-text-main">
                    {income.name}
                  </td>
                  <td className="px-4 py-3">
                    <CategoryBadge category={income.categoryName} />
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-status-success">
                    {income.amount.toFixed(2)}{" "}
                    <span className="font-normal text-text-muted">جنيه</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted">
                    {income.incomeDate}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted">
                    {income.notes}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <IconButton
                        variant="danger"
                        label="حذف"
                        onClick={() => handleDelete(income)}
                        disabled={
                          loadingAction.id === income.id &&
                          loadingAction.action === "delete"
                        }
                      >
                        {loadingAction.id === income.id &&
                        loadingAction.action === "delete" ? (
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </IconButton>

                      <IconButton
                        variant="primary"
                        label="تعديل"
                        onClick={() => handleEdit(income)}
                        disabled={
                          loadingAction.id === income.id &&
                          loadingAction.action === "edit"
                        }
                      >
                        {loadingAction.id === income.id &&
                        loadingAction.action === "edit" ? (
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                          <Pencil className="h-4 w-4" />
                        )}
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))}

              {incomes.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-sm text-text-muted"
                  >
                    لا توجد إيرادات مطابقة للبحث
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalCount}
          pageSize={pagination.pageSize}
          name="إيراد"
          onPageChange={setPage}
        />
      </div>

      <AddIncomeModal
        open={showModal}
        income={selectedIncome}
        categories={categories}
        groups={groups}
        requireGroup={requireGroup}
        onClose={() => {
          setShowModal(false);
          setSelectedIncome(null);
        }}
        onSave={handleSaveIncome}
      />

      <ViewIncomeModal
        open={showViewModal}
        income={selectedIncome}
        onClose={() => {
          setShowViewModal(false);
          setSelectedIncome(null);
        }}
      />

      <ConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setSelectedIncome(null);
        }}
        onConfirm={handleDeleteConfirm}
        loading={
          loadingAction.id === selectedIncome?.id &&
          loadingAction.action === "delete"
        }
        title="حذف الإيراد"
        message={`هل أنت متأكد من حذف الإيراد "${selectedIncome?.name ?? ""}"؟`}
        confirmText="حذف"
        cancelText="إلغاء"
      />
    </div>
  );
}
