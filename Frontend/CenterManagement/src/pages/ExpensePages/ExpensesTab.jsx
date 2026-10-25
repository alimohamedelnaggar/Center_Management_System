import {
  Calendar,
  ChevronDown,
  Droplet,
  FileText,
  Lightbulb,
  MoreHorizontal,
  Pencil,
  PenTool,
  Plus,
  Search,
  SprayCan,
  Trash2,
  Wrench,
} from "@/components/icons";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import ConfirmModal from "../../components/common/ConfirmModal";
import Pagination from "../../components/common/Pagination";
import Spinner from "../../components/common/Spinner";
import { expenseCategoryService } from "../../services/expenseCategoryService";
import { expenseService } from "../../services/expenseService";
import {
  expenseCategoryConnection,
  startExpenseCategoryConnection,
} from "../../services/signalr/expenseCategoryHub";
import {
  expenseConnection,
  startExpenseConnection,
} from "../../services/signalr/expenseHub";
import AddExpenseModal from "./Addexpensemodal";
import ViewExpenseModal from "./ViewExpenseModal";
import { formatCurrency } from "../../utils/formatCurrency";

const CATEGORY_STYLES = {
  كهرباء: {
    icon: Lightbulb,
    text: "text-status-warning",
    bg: "bg-status-warning-bg",
  },
  مياه: {
    icon: Droplet,
    text: "text-status-info",
    bg: "bg-status-info-bg",
  },
  حبر: {
    icon: PenTool,
    text: "text-secondary",
    bg: "bg-secondary-light",
  },
  ورق: {
    icon: FileText,
    text: "text-status-success",
    bg: "bg-status-success-bg",
  },
  منظفات: {
    icon: SprayCan,
    text: "text-status-danger",
    bg: "bg-status-danger-bg",
  },
  صيانة: {
    icon: Wrench,
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
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium
         ${style.bg} ${style.text}`}
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
export default function ExpensesTab() {
  const [search, setSearch] = useState("");
  const [showViewModal, setShowViewModal] = useState(false);

  const [category, setCategory] = useState(null);
  const [categories, setCategories] = useState([]);

  const [expenses, setExpenses] = useState([]);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [totalExpense, setTotalExpense] = useState(0);

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
    loadExpenses();
  }, [page]);

  // ----- use signalR
  useEffect(() => {
    // ----------------------- start expenses
    loadExpenses();

    startExpenseConnection();

    expenseConnection.on("ExpenseAdded", (expense) => {
      setExpenses((prev) => [expense, ...prev]);
    });

    expenseConnection.on("ExpenseUpdated", (expense) => {
      setExpenses((prev) =>
        prev.map((x) => (x.id === expense.id ? expense : x)),
      );
    });

    expenseConnection.on("ExpenseDeleted", (id) => {
      setExpenses((prev) => prev.filter((x) => x.id !== id));
    });
    // ----------------------- end expenses

    // ----------------------- start category
    loadCategories();

    startExpenseCategoryConnection();

    expenseCategoryConnection.on("ExpenseCategoryAdded", (category) => {
      setCategories((prev) => [...prev, category]);
    });

    expenseCategoryConnection.on("ExpenseCategoryUpdated", (category) => {
      setCategories((prev) =>
        prev.map((x) => (x.id === category.id ? category : x)),
      );
    });

    expenseCategoryConnection.on("ExpenseCategoryDeleted", (id) => {
      setCategories((prev) => prev.filter((x) => x.id !== id));
    });
    // ----------------------- end CAtegory

    return () => {
      expenseCategoryConnection.off("ExpenseCategoryAdded");
      expenseCategoryConnection.off("ExpenseCategoryUpdated");
      expenseCategoryConnection.off("ExpenseCategoryDeleted");

      expenseConnection.off("ExpenseAdded");
      expenseConnection.off("ExpenseUpdated");
      expenseConnection.off("ExpenseDeleted");
    };
  }, []);

  async function loadCategories() {
    try {
      const response = await expenseCategoryService.getAll();
      // console.log("response cat : ", response);
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

  async function loadExpenses() {
    setIsLoading(true);
    try {
      const response = await expenseService.getAllPaged({
        pageNumber: page,
        pageSize: 10,
        search: search,
        categoryId: category,
        startDate: startDate,
        endDate: endDate,
      });

      if (response?.succeeded) {
        setExpenses(response.data.data ?? []);
        setTotalExpense(response.data.totalCount);
        setPagination({
          currentPage: response.data.currentPage,
          totalPages: response.data.totalPages,
          totalCount: response.data.totalCount,
          pageSize: response.data.pageSize,
        });
      } else {
        toast.error(response?.message ?? "فشل في تحميل المصروفات");
      }
    } catch (error) {
      toast.error("فشل في تحميل المصروفات");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  //save expense

  const handleAdd = () => {
    setSelectedExpense(null);
    setShowModal(true);
  };
  const handleEdit = (expense) => {
    setSelectedExpense(expense);
    setShowModal(true);
  };

  const handleSaveExpense = async (expense) => {
    try {
      let response;

      if (expense.id) {
        response = await expenseService.update(expense);
      } else {
        response = await expenseService.create(expense);
      }

      if (response?.succeeded) {
        toast.success(response.message);

        setShowModal(false);

        setSelectedExpense(null);
      } else {
        toast.error(response.message);
      }
    } catch (err) {
      toast.error("حدث خطأ", err);
    }
  };

  const handleDelete = async (expense) => {
    setSelectedExpense(expense);
    setIsDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      setLoadingAction({ id: selectedExpense.id, action: "delete" });

      const response = await expenseService.delete(selectedExpense.id);
      if (response.succeeded) {
        toast.success(response.message);
      } else {
        toast.error(response.message);
      }

      setIsDeleteOpen(false);
      setSelectedExpense(null);
    } catch (error) {
      toast.error("حدث خطأ أثناء الحذف");
      console.error(error);
    } finally {
      setLoadingAction({
        id: null,
        action: null,
      });
    }
  };

  if (isLoading) {
    return <Spinner msg="جاري تحميل المصروفات برجاء الانتظار..."></Spinner>;
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-text-muted">{totalExpense} مصروف إجمالاً</p>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-text-inverse shadow-sm transition-colors hover:bg-primary-hover"
          onClick={handleAdd}
        >
          <Plus className="h-4 w-4" />
          إضافة مصروف جديد
        </button>
      </div>

      {/* Filters */}
      <div className="mb-5 flex items-end gap-3 overflow-x-auto pb-1">
        <div className="relative min-w-[280px] flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث عن مصروف..."
            className="w-full rounded-lg border border-surface-border bg-surface-card py-2.5 ps-9 pe-3 text-sm text-text-main placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-subtle"
          />
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        </div>

        <div className="relative min-w-[180px]">
          <select
            value={category}
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

          {/* <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" /> */}
        </div>

        {/* End Date */}
        <div className="relative min-w-[170px]">
          <input
            type="date"
            value={endDate || ""}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-lg border border-surface-border bg-surface-card py-2.5 ps-3 pe-3 text-sm text-text-main focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-subtle"
          />

          {/* <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" /> */}
        </div>

        {/* Buttons */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setPage(1);
              loadExpenses();
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
                loadExpenses({
                  pageNumber: 1,
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

      {/* Table card */}
      <div
        className="overflow-hidden rounded-xl border border-surface-border
       bg-surface-card shadow-sm"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-180 text-right">
            <thead>
              <tr className="border-b border-surface-border bg-surface-muted text-xs font-semibold text-text-muted">
                <th className="w-12 px-4 py-3">#</th>
                <th className="px-4 py-3">اسم المصروف</th>
                <th className="px-4 py-3">الفئة</th>
                <th className="px-4 py-3">المبلغ</th>
                <th className="px-4 py-3">التاريخ</th>
                <th className="px-4 py-3">ملاحظات</th>
                <th className="px-4 py-3">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense, idx) => (
                <tr
                  key={expense.id}
                  className="border-b border-surface-border last:border-0 hover:bg-surface-muted/60"
                >
                  <td className="px-4 py-3 text-sm text-text-muted">
                    {idx + 1}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-text-main">
                    {expense.name}
                  </td>
                  <td className="px-4 py-3">
                    <CategoryBadge category={expense.categoryName} />
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-text-main">
                    {formatCurrency(expense.amount)}{" "}
                    {/* <span className="font-normal text-text-muted">جنية</span> */}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted">
                    {expense.expenseDate}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted">
                    {expense.notes}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <IconButton
                        variant="danger"
                        label="حذف"
                        onClick={() => handleDelete(expense)}
                        disabled={
                          loadingAction.id === expense.id &&
                          loadingAction.action === "delete"
                        }
                      >
                        {loadingAction.id === expense.id &&
                        loadingAction.action === "delete" ? (
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </IconButton>

                      <IconButton
                        variant="primary"
                        label="تعديل"
                        onClick={() => handleEdit(expense)}
                        disabled={
                          loadingAction.id === expense.id &&
                          loadingAction.action === "edit"
                        }
                      >
                        {loadingAction.id === expense.id &&
                        loadingAction.action === "edit" ? (
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                          <Pencil className="h-4 w-4" />
                        )}
                      </IconButton>

                      {/* <IconButton
                        variant="muted"
                        label="عرض"
                        onClick={() => handleView(expense)}
                        disabled={
                          loadingAction.id === expense.id &&
                          loadingAction.action === "view"
                        }
                      >
                        {loadingAction.id === expense.id &&
                        loadingAction.action === "view" ? (
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </IconButton> */}
                    </div>
                  </td>
                </tr>
              ))}

              {expenses.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-sm text-text-muted"
                  >
                    لا توجد مصروفات مطابقة للبحث
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/*  pagination */}

        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalCount}
          pageSize={pagination.pageSize}
          name="مصروف"
          onPageChange={setPage}
        />
      </div>

      <AddExpenseModal
        open={showModal}
        expense={selectedExpense}
        categories={categories}
        onClose={() => {
          setShowModal(false);
          setSelectedExpense(null);
        }}
        onSave={handleSaveExpense}
      />

      <ViewExpenseModal
        open={showViewModal}
        expense={selectedExpense}
        onClose={() => {
          setShowViewModal(false);
          setSelectedExpense(null);
        }}
      />

      <ConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setSelectedExpense(null);
        }}
        onConfirm={handleDeleteConfirm}
        loading={
          loadingAction.id === selectedExpense?.id &&
          loadingAction.action === "delete"
        }
        title="حذف المصروف"
        message={`هل أنت متأكد من حذف المصروف "${selectedExpense?.name ?? ""}"؟`}
        confirmText="حذف"
        cancelText="إلغاء"
      />
    </div>
  );
}
