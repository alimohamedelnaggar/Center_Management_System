import { useEffect, useState } from "react";
import { GraduationCap, Pencil, Plus, Trash2, X } from "@/components/icons";
import toast from "react-hot-toast";
import ConfirmModal from "../../components/common/ConfirmModal";
import { questionBankService } from "../../services/questionBankService";
import AcademicYearModal from "./AcademicYearModal";

export default function AcademicYearsManageModal({ open = false, onClose }) {
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showYearModal, setShowYearModal] = useState(false);
  const [editingYear, setEditingYear] = useState(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadYears = async () => {
    try {
      setLoading(true);
      const response = await questionBankService.getAcademicYears();

      if (response?.succeeded) {
        setYears(response.data ?? []);
      } else {
        toast.error(response?.message ?? "فشل في تحميل السنوات الدراسية");
      }
    } catch (error) {
      console.error(error);
      toast.error("فشل في تحميل السنوات الدراسية");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadYears();
    }
  }, [open]);

  if (!open) return null;

  const handleSaveYear = async (data) => {
    try {
      const response = editingYear
        ? await questionBankService.updateAcademicYear({
            id: editingYear.id,
            ...data,
          })
        : await questionBankService.createAcademicYear(data);

      if (response?.succeeded) {
        toast.success(
          response.message ??
            (editingYear
              ? "تم تعديل السنة الدراسية بنجاح"
              : "تم إضافة السنة الدراسية بنجاح"),
        );
        setShowYearModal(false);
        loadYears();
      } else {
        toast.error(response?.message ?? "حدث خطأ ما");
      }
    } catch (error) {
      console.error("فشل في حفظ السنة الدراسية", error);
      toast.error("حدث خطأ ما");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedYear) return;

    try {
      setDeleting(true);
      const response = await questionBankService.deleteAcademicYear(selectedYear.id);

      if (response?.succeeded) {
        toast.success(response.message ?? "تم حذف السنة الدراسية بنجاح");
        setYears((prev) => prev.filter((y) => y.id !== selectedYear.id));
      } else {
        toast.error(response?.message ?? "فشل في حذف السنة الدراسية");
      }

      setIsDeleteOpen(false);
      setSelectedYear(null);
    } catch (error) {
      console.error("فشل في حذف السنة الدراسية", error);
      toast.error("فشل في حذف السنة الدراسية");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center bg-text-main/40 px-4 font-sans"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-surface-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-surface-border px-5 py-4">
          <h2 className="text-base font-bold text-text-main">إدارة السنوات الدراسية</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setEditingYear(null);
                setShowYearModal(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-text-inverse shadow-sm transition-colors hover:bg-primary-hover"
            >
              <Plus className="h-4 w-4" />
              إضافة سنة
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-muted hover:text-text-main"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && (
            <p className="py-8 text-center text-sm text-text-muted">جاري التحميل...</p>
          )}

          {!loading && years.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <GraduationCap className="h-10 w-10 text-text-muted" />
              <p className="text-sm text-text-muted">لا توجد سنوات دراسية بعد.</p>
            </div>
          )}

          {!loading && (
            <ul className="divide-y divide-surface-border">
              {years.map((year) => (
                <li key={year.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-subtle text-xs font-bold text-primary">
                      {year.order}
                    </span>
                    <span className="text-sm font-medium text-text-main">{year.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      aria-label="تعديل"
                      onClick={() => {
                        setEditingYear(year);
                        setShowYearModal(true);
                      }}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary-subtle text-primary transition-colors hover:bg-primary hover:text-text-inverse"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="حذف"
                      onClick={() => {
                        setSelectedYear(year);
                        setIsDeleteOpen(true);
                      }}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-status-danger-bg text-status-danger transition-colors hover:bg-status-danger hover:text-text-inverse"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <AcademicYearModal
          open={showYearModal}
          year={editingYear}
          onClose={() => setShowYearModal(false)}
          onSave={handleSaveYear}
        />

        <ConfirmModal
          isOpen={isDeleteOpen}
          onClose={() => {
            setIsDeleteOpen(false);
            setSelectedYear(null);
          }}
          onConfirm={handleDeleteConfirm}
          loading={deleting}
          title="حذف السنة الدراسية"
          message={`هل أنت متأكد من حذف "${selectedYear?.name ?? ""}"؟ لا يمكن حذف سنة تحتوي على بنوك أسئلة.`}
          confirmText="حذف"
          cancelText="إلغاء"
        />
      </div>
    </div>
  );
}