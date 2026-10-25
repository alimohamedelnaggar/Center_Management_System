import { useEffect, useState } from "react";
import { BookOpenCheck, LibraryBig, List, Pencil, Plus, Search, Settings2, Trash2 } from "@/components/icons";
import toast from "react-hot-toast";
import ConfirmModal from "../../components/common/ConfirmModal";
import Pagination from "../../components/common/Pagination";
import { questionBankService } from "../../services/questionBankService";
import AcademicYearsManageModal from "./AcademicYearsManageModal";
import BankQuestionsModal from "./BankQuestionsModal";
import QuestionBankModal from "./QuestionBankModal";

export default function QuestionBankPage() {
  const [academicYears, setAcademicYears] = useState([]);

  const [banks, setBanks] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");

  const [showYearsModal, setShowYearsModal] = useState(false);

  const [showBankModal, setShowBankModal] = useState(false);
  const [editingBank, setEditingBank] = useState(null);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [activeBank, setActiveBank] = useState(null);

  const loadAcademicYears = async () => {
    try {
      const response = await questionBankService.getAcademicYears();

      if (response?.succeeded) {
        setAcademicYears(response.data ?? []);
      }
    } catch (error) {
      console.error("فشل في تحميل السنوات الدراسية", error);
    }
  };

  const loadBanks = async (page = 1) => {
    try {
      setLoading(true);

      const response = await questionBankService.getBanksPaged({
        pageNumber: page,
        pageSize,
        search: search.trim(),
        academicYearId,
      });

      if (response?.succeeded) {
        setBanks(response.data.data ?? []);
        setCurrentPage(response.data.currentPage);
        setTotalPages(response.data.totalPages);
        setTotalItems(response.data.totalCount);
      } else {
        toast.error(response?.message ?? "فشل في تحميل البنوك");
      }
    } catch (error) {
      console.error(error);
      toast.error("فشل في تحميل البنوك");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAcademicYears();
  }, []);

  useEffect(() => {
    loadBanks(1);
  }, [academicYearId, search]);

  useEffect(() => {
    loadBanks(currentPage);
  }, [currentPage]);

  const openAddBank = () => {
    setEditingBank(null);
    setShowBankModal(true);
  };

  const openEditBank = (bank) => {
    setEditingBank(bank);
    setShowBankModal(true);
  };

  const handleSaveBank = async (data) => {
    try {
      const response = editingBank
        ? await questionBankService.updateBank({ id: editingBank.id, ...data })
        : await questionBankService.createBank(data);

      if (response?.succeeded) {
        toast.success(
          response.message ??
            (editingBank ? "تم تعديل بنك الأسئلة بنجاح" : "تم إضافة بنك الأسئلة بنجاح"),
        );
        setShowBankModal(false);
        loadBanks(currentPage);
      } else {
        toast.error(response?.message ?? "حدث خطأ ما");
      }
    } catch (error) {
      console.error("فشل في حفظ بنك الأسئلة", error);
      toast.error("حدث خطأ ما");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedBank) return;

    try {
      setDeleting(true);
      const response = await questionBankService.deleteBank(selectedBank.id);

      if (response?.succeeded) {
        toast.success(response.message ?? "تم حذف بنك الأسئلة بنجاح");
        if (currentPage > 1 && banks.length === 1) {
          setCurrentPage(currentPage - 1);
        } else {
          loadBanks(currentPage);
        }
      } else {
        toast.error(response?.message ?? "فشل في حذف بنك الأسئلة");
      }

      setIsDeleteOpen(false);
      setSelectedBank(null);
    } catch (error) {
      console.error("فشل في حذف بنك الأسئلة", error);
      toast.error("فشل في حذف بنك الأسئلة");
    } finally {
      setDeleting(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2.5 text-sm text-text-main placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-subtle";

  return (
    <div className="p-4 md:p-6 font-sans">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-main">بنك الأسئلة</h1>
          <p className="mt-0.5 text-sm text-text-muted">
            أضف الأسئلة (صح وغلط / اختر من متعدد) واربطها بالسنة الدراسية
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowYearsModal(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-surface-border bg-surface-card px-4 py-2.5 text-sm font-medium text-text-main transition-colors hover:bg-surface-muted"
        >
          <Settings2 className="h-4 w-4" />
          إدارة السنوات الدراسية
        </button>
      </div>

      {/* Toolbar */}
      <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="relative">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث باسم البنك..."
            className={`${inputClass} pr-10`}
          />
        </div>
        <select
          value={academicYearId}
          onChange={(e) => setAcademicYearId(e.target.value)}
          className={inputClass}
        >
          <option value="">كل السنوات الدراسية</option>
          {academicYears.map((year) => (
            <option key={year.id} value={year.id}>
              {year.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={openAddBank}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-text-inverse shadow-sm transition-colors hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" />
          إضافة بنك جديد
        </button>
      </div>

      {/* Banks card */}
      <div className="overflow-hidden rounded-xl border border-surface-border bg-surface-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="border-b border-surface-border bg-surface-muted text-xs font-semibold text-text-muted">
                <th className="w-12 px-4 py-3">#</th>
                <th className="px-4 py-3">اسم البنك</th>
                <th className="px-4 py-3">السنة الدراسية</th>
                <th className="px-4 py-3">عدد الأسئلة</th>
                <th className="px-4 py-3">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {!loading &&
                banks.map((bank, idx) => (
                  <tr
                    key={bank.id}
                    className="border-b border-surface-border last:border-0 hover:bg-surface-muted/60"
                  >
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-text-main">
                        <BookOpenCheck className="h-4 w-4 text-text-muted" />
                        <button
                          type="button"
                          onClick={() => setActiveBank(bank)}
                          className="transition-colors hover:text-primary"
                        >
                          {bank.name}
                        </button>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-primary-subtle px-2.5 py-1 text-xs font-medium text-primary">
                        {bank.academicYearName}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-main">
                      {bank.questionsCount}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveBank(bank)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary-subtle text-primary transition-colors hover:bg-primary hover:text-text-inverse"
                          title="عرض الأسئلة"
                        >
                          <List className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditBank(bank)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary-subtle text-primary transition-colors hover:bg-primary hover:text-text-inverse"
                          title="تعديل"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBank(bank);
                            setIsDeleteOpen(true);
                          }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-status-danger-bg text-status-danger transition-colors hover:bg-status-danger hover:text-text-inverse"
                          title="حذف"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

              {!loading && banks.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <LibraryBig className="h-10 w-10 text-text-muted" />
                      <p className="text-sm text-text-muted">
                        لا توجد بنوك أسئلة بعد، اضغط "إضافة بنك جديد".
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-text-muted">
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
            name="بنك"
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      <AcademicYearsManageModal
        open={showYearsModal}
        onClose={() => {
          setShowYearsModal(false);
          loadAcademicYears();
        }}
      />

      <QuestionBankModal
        open={showBankModal}
        bank={editingBank}
        academicYears={academicYears}
        onClose={() => setShowBankModal(false)}
        onSave={handleSaveBank}
      />

      <BankQuestionsModal
        open={activeBank !== null}
        bank={activeBank}
        onClose={() => setActiveBank(null)}
      />

      <ConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setSelectedBank(null);
        }}
        onConfirm={handleDeleteConfirm}
        loading={deleting}
        title="حذف بنك الأسئلة"
        message={`هل أنت متأكد من حذف بنك الأسئلة "${selectedBank?.name ?? ""}"؟ سيتم حذف جميع أسئلته.`}
        confirmText="حذف"
        cancelText="إلغاء"
      />
    </div>
  );
}