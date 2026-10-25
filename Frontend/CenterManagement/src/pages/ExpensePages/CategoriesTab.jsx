import { Pencil, Plus, Tag, Trash2 } from "@/components/icons";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import ConfirmModal from "../../components/common/ConfirmModal";
import Pagination from "../../components/common/Pagination";
import { expenseCategoryService } from "../../services/expenseCategoryService";
import {
  expenseCategoryConnection,
  startExpenseCategoryConnection,
} from "../../services/signalr/expenseCategoryHub";
import AddCategoryModal from "./AddCategoryModal";

export default function CategoriesTab() {
  const [categories, setCategories] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [loading, setLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(false);

  const [loadingAction, setLoadingAction] = useState({
    id: null,
    action: null,
  });

  const loadCategories = async (page = 1) => {
    try {
      setLoading(true);

      const response = await expenseCategoryService.getAllPaged({
        pageNumber: page,
        pageSize: pageSize,
      });
      // console.log("response : ", response);
      if (response?.succeeded) {
        setCategories(response.data.data);

        setCurrentPage(response.data.currentPage);
        setTotalPages(response.data.totalPages);
        setTotalItems(response.data.totalCount);
      } else {
        toast.error(response?.message ?? "فشل في تحميل الفئات");
      }
    } catch (error) {
      console.error(error);
      toast.error("فشل في تحميل الفئات");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    (() => {
      loadCategories(currentPage);
    })();
  }, [currentPage]);
  useEffect(() => {
    (() => {
      loadCategories();
    })();

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

    return () => {
      expenseCategoryConnection.off("ExpenseCategoryAdded");
      expenseCategoryConnection.off("ExpenseCategoryUpdated");
      expenseCategoryConnection.off("ExpenseCategoryDeleted");
    };
  }, []);
  function openAddModal() {
    setEditingCategory(null);
    setShowModal(true);
  }

  function openEditModal(category) {
    setEditingCategory(category);
    setShowModal(true);
  }

  async function handleSave(data) {
    try {
      const response = editingCategory
        ? await expenseCategoryService.update({
            id: editingCategory.id,
            ...data,
          })
        : await expenseCategoryService.create(data);

      if (response?.succeeded) {
        toast.success(
          response.message ??
            (editingCategory ? "تم تعديل الفئة بنجاح" : "تم إضافة الفئة بنجاح"),
        );
        setShowModal(false);
      } else {
        toast.error(response?.message ?? "حدث خطأ ما");
      }
    } catch (error) {
      toast.error("حدث خطأ ما");
      console.error("فشل في حفظ الفئة", error);
    }
  }

  const handleDelete = async (category) => {
    setSelectedCategory(category);
    setIsDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      setLoadingAction({ id: selectedCategory.id, action: "delete" });
      const response = await expenseCategoryService.delete(selectedCategory.id);
      if (response.succeeded) {
        toast.success(response.message);
      } else {
        toast.error(response.message);
      }

      setIsDeleteOpen(false);
      setSelectedCategory(null);
    } catch (error) {
      toast.error("فشل في حذف الفئة");
      console.error(error);
    } finally {
      setLoadingAction({
        id: null,
        action: null,
      });
    }
  };
  return (
    <div>
      {/* Toolbar */}
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-text-muted">
          {categories.length} فئة إجمالاً
        </p>
        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-text-inverse shadow-sm transition-colors hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" />
          إضافة فئة جديدة
        </button>
      </div>

      {/* Categories card */}
      <div className="overflow-hidden rounded-xl border border-surface-border bg-surface-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="border-b border-surface-border bg-surface-muted text-xs font-semibold text-text-muted">
                <th className="w-12 px-4 py-3">#</th>
                <th className="px-4 py-3">اسم الفئة</th>
                <th className="px-4 py-3">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {!loading &&
                categories.map((category, idx) => (
                  <tr
                    key={category.id}
                    className="border-b border-surface-border last:border-0 hover:bg-surface-muted/60"
                  >
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-text-main">
                        <Tag className="h-3.5 w-3.5 text-text-muted" />
                        {category.name}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          aria-label="تعديل"
                          onClick={() => openEditModal(category)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary-subtle text-primary transition-colors hover:bg-primary hover:text-text-inverse"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          aria-label="حذف"
                          onClick={() => handleDelete(category)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-status-danger-bg text-status-danger transition-colors hover:bg-status-danger hover:text-text-inverse"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

              {!loading && categories.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-10 text-center text-sm text-text-muted"
                  >
                    لا توجد فئات بعد
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-10 text-center text-sm text-text-muted"
                  >
                    جاري التحميل...
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            name="الفئات"
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      <AddCategoryModal
        open={showModal}
        category={editingCategory}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
      />

      <ConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setSelectedCategory(null);
        }}
        onConfirm={handleDeleteConfirm}
        loading={
          loadingAction.id === selectedCategory?.id &&
          loadingAction.action === "delete"
        }
        title="حذف الفئة"
        message={`هل أنت متأكد من حذف الفئة "${selectedCategory?.name ?? ""}"؟`}
        confirmText="حذف"
        cancelText="إلغاء"
      />
    </div>
  );
}
