import { useState } from "react";
import { Plus, ClipboardList, UserPlus, FileUp } from "@/components/icons";
import toast from "react-hot-toast";

import EmptyState from "./EmptyState";
import StudentCardList from "./StudentCardList";
import StudentTable from "./StudentTable";

import ConfirmModal from "../../components/common/ConfirmModal";
import Pagination from "../../components/common/Pagination";
import Spinner from "../../components/common/Spinner";
import { useStudentActions } from "../../hooks/students/useStudentActions";
import { useStudentForm } from "../../hooks/students/useStudentForm";
import { useStudentsList } from "../../hooks/students/useStudentsList";
import { useAuth } from "../../context/useAuth";
import { useBranding } from "../../context/useBranding";
import { studentsService } from "../../services/studentService";
import AddStudentModal from "./AddStudentModal";
import StudentAccountsModal from "./StudentAccountsModal";
import StudentFilters from "./StudentFilters";
import ViewStudentModal from "./ViewStudentModal";
import { exportBothFormats } from "../../utils/bulkCredentialsExport";
import StudentImportWizard from "./StudentImportWizard";
export default function StudentManagement() {
  const { isCenterAdmin, hasModule, role, isImpersonating } = useAuth();
  const showPayment = hasModule("payments");
  const showParentAccount = isCenterAdmin && hasModule("parent_portal");
  const canImportStudents =
    isCenterAdmin ||
    role === "CenterOwner" ||
    role === "Teacher" ||
    role === "Assistant";
  const branding = useBranding();
  const [accountsModal, setAccountsModal] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [generatingParents, setGeneratingParents] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const {
    search,
    setSearch,
    group,
    setGroup,
    status,
    setStatus,
    resetFilters,
    page,
    handlePageChange,
    students,
    setStudents,
    groups,
    loading,
    loadStudents,
    studentStats,
    loadingStats,
  } = useStudentsList();

  const {
    isOpen,
    addOrEdit,
    form,
    setForm,
    errors,
    loadingBtn,
    openAddModal,
    openEditModal,
    closeModal,
    submit,
  } = useStudentForm({ groups, page, setStudents, loadStudents });

  const {
    selectedStudent,
    setViewOpen,

    // View
    viewOpen,
    openView,

    // Delete
    confirmOpen,
    deleteLoading,
    openConfirmDeleteToggle,
    closeConfirmDeleteToggle,
    confirmDeleteToggle,


    // ChangeStatus
    confirmChangeStatusOpen,
    changeStatusLoading,
    openConfirmChangeStatusToggle,
    closeConfirmChangeStatusToggle,
    confirmChangeStatusToggle,


    // Payment
    confirmPaymentStatusOpen,
    changePaymentStatusLoading,
    openConfirmToggle,
    closeConfirmToggle,
    confirmToggle,
  } = useStudentActions({ page, loadStudents });

  const hasStudents = students?.items && students.items.length > 0;

  const centerName = branding?.center?.name || "";

  const handleSubmit = async () => {
    await submit();
  };

  const openResultsWindow = () => {
    if (typeof window === "undefined") return null;
    try {
      return window.open("", "_blank", "width=1000,height=900");
    } catch {
      return null;
    }
  };

  const handleGenerate = async () => {
    const printWindow = openResultsWindow();

    try {
      setGenerating(true);
      const res = await studentsService.generateAccounts();

      if (res?.succeeded === false) {
        printWindow?.close();
        toast.error(res?.message || "تعذّر إنشاء الحسابات");
        return;
      }

      const rows = res?.data?.all ?? [];

      if (!rows.length) {
        printWindow?.close();
        toast("لا يوجد طلاب في المركز");
        return;
      }

      const { excel, pdf } = exportBothFormats({
        rows,
        phoneKey: "phone",
        usernameKey: "username",
        title: "حسابات الطلاب",
        phoneLabel: "رقم هاتف الطالب",
        centerName,
        fileName: "حسابات_الطلاب",
        win: printWindow,
      });

      if (excel || pdf) toast.success("تم تجهيز ملف حسابات الطلاب");
      else toast.error("تعذّر تجهيز الملف");
    } catch (err) {
      printWindow?.close();
      toast.error(err?.response?.data?.message || "تعذّر إنشاء الحسابات");
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateParentAccounts = async () => {
    const printWindow = openResultsWindow();

    try {
      setGeneratingParents(true);
      const res = await studentsService.bulkCreateParentAccounts();

      if (res?.succeeded === false) {
        printWindow?.close();
        toast.error(res?.message || "تعذّر إنشاء حسابات أولياء الأمور");
        return;
      }

      const rows = res?.data?.all ?? [];

      if (!rows.length) {
        printWindow?.close();
        toast("لا يوجد طلاب في المركز");
        return;
      }

      const { excel, pdf } = exportBothFormats({
        rows,
        phoneKey: "parentPhone",
        usernameKey: "username",
        title: "حسابات أولياء الأمور",
        phoneLabel: "رقم هاتف ولي الأمر",
        centerName,
        fileName: "حسابات_أولياء_الأمور",
        win: printWindow,
      });

      if (excel || pdf) toast.success("تم تجهيز ملف حسابات أولياء الأمور");
      else toast.error("تعذّر تجهيز الملف");
    } catch (err) {
      printWindow?.close();
      toast.error(
        err?.response?.data?.message || "تعذّر إنشاء حسابات أولياء الأمور",
      );
    } finally {
      setGeneratingParents(false);
    }
  };

  const handleCreateParentAccount = async (student) => {
    try {
      const res = await studentsService.createParentAccount(student.id);

      if (res?.succeeded === false) {
        toast.error(res?.message || "تعذّر إنشاء حساب ولي الأمر");
        return;
      }

      const data = res?.data;

      // The parent phone already belonged to a parent in this center: the
      // child was just linked, so there is no new password to show.
      if (data?.linkedExistingAccount) {
        toast.success(res?.message || "تم ربط الطالب بحساب ولي الأمر الموجود");
        return;
      }

      setAccountsModal({
        kind: "parent",
        credentials: [
          {
            studentId: data?.studentId ?? student.id,
            studentName: data?.studentName ?? student.fullName,
            username: data?.parentPhone ?? "",
            temporaryPassword: data?.temporaryPassword ?? "",
          },
        ],
        skipped: [],
      });
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "تعذّر إنشاء حساب ولي الأمر",
      );
    }
  };

  return (
    <div dir="rtl" lang="ar" className="w-full">
      <div className="min-h-screen bg-surface-bg px-4 py-6 transition-colors duration-200 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-text-main">
                الطلاب
              </h1>
              <p className="mt-1 text-sm text-text-muted">
                إدارة الطلاب والمجموعات والحضور وبيانات التواصل.
              </p>
            </div>
            <div className="flex items-center gap-2">
                            {canImportStudents && (
                <button
                  onClick={() => setImportOpen(true)}
                  className="focus-ring inline-flex items-center gap-2 rounded-lg border border-surface-border bg-surface-card px-4 py-2.5 text-sm font-medium text-text-main shadow-sm transition-colors hover:bg-surface-muted"
                >
                  <FileUp className="h-4 w-4" />
                  استيراد من Excel
                </button>
              )}
{isCenterAdmin && (
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="focus-ring inline-flex items-center gap-2 rounded-lg border border-surface-border bg-surface-card px-4 py-2.5 text-sm font-medium text-text-main shadow-sm transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ClipboardList
                    className={`h-4 w-4 ${generating ? "animate-pulse" : ""}`}
                  />
                  {generating ? "جاري الإنشاء..." : "إنشاء حسابات الطلاب"}
                </button>
              )}
              {showParentAccount && (
                <button
                  onClick={handleGenerateParentAccounts}
                  disabled={generatingParents}
                  className="focus-ring inline-flex items-center gap-2 rounded-lg border border-surface-border bg-surface-card px-4 py-2.5 text-sm font-medium text-text-main shadow-sm transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <UserPlus
                    className={`h-4 w-4 ${generatingParents ? "animate-pulse" : ""}`}
                  />
                  {generatingParents
                    ? "جاري الإنشاء..."
                    : "إنشاء حسابات أولياء الأمور"}
                </button>
              )}
              <button
                onClick={openAddModal}
                className="focus-ring inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-text-inverse shadow-sm transition-colors hover:bg-primary-hover"
              >
                <Plus className="h-4 w-4" />
                إضافة طالب
              </button>
            </div>
          </div>

          {/* Student Filters */}
          <StudentFilters
            search={search}
            onSearchChange={setSearch}
            group={group}
            onGroupChange={setGroup}
            status={status}
            onStatusChange={setStatus}
            groups={groups}
            onReset={resetFilters}
          />
          <div className="rounded-xl border border-surface-border bg-surface-card shadow-sm min-h-[300px] flex flex-col justify-center">
            {loading ? (
              <div className="py-12">
                <Spinner msg="جاري تحميل الطلاب..." />
              </div>
            ) : !hasStudents ? (
              <EmptyState onAdd={openAddModal} />
            ) : (
              <>
                <StudentTable
                  students={students.items}
                  onView={openView}
                  onEdit={openEditModal}
                  onDelete={openConfirmDeleteToggle}
                  onPayment={openConfirmToggle}
                  onActive={openConfirmChangeStatusToggle}
                  onCreateParentAccount={
                    showParentAccount ? handleCreateParentAccount : undefined
                  }
                  showPayment={showPayment}
                />
                <StudentCardList
                  students={students.items}
                  onView={openView}
                  onEdit={openEditModal}
                  onDelete={openConfirmDeleteToggle}
                  onPayment={openConfirmToggle}
                  onActive={openConfirmChangeStatusToggle}
                  onCreateParentAccount={
                    showParentAccount ? handleCreateParentAccount : undefined
                  }
                  showPayment={showPayment}
                />
              </>
            )}
          </div>

          {!loading && students && students.totalCount > 0 && (
            <Pagination
              currentPage={students.pageIndex}
              totalPages={students.totalPages}
              totalItems={students.totalCount}
              pageSize={students.pageSize}
              name="طالب"
              onPageChange={handlePageChange}
            />
          )}
        </div>
      </div>

      {/* Add Student modal */}
      <AddStudentModal
        open={isOpen}
        mode={addOrEdit ? "add" : "edit"}
        onClose={closeModal}
        form={form}
        setForm={setForm}
        groups={groups}
        errors={errors}
        loading={loadingBtn}
        onSubmit={handleSubmit}
      />

      {/* One-time account credentials (single add / bulk generate) */}
      <StudentAccountsModal
        open={!!accountsModal}
        onClose={() => setAccountsModal(null)}
        credentials={accountsModal?.credentials ?? []}
        skipped={accountsModal?.skipped ?? []}
        centerName={centerName}
        title={
          accountsModal?.kind === "parent"
            ? "بيانات دخول أولياء الأمور"
            : "بيانات الدخول"
        }
        usernameLabel={
          accountsModal?.kind === "parent"
            ? "رقم الدخول (هاتف ولي الأمر)"
            : "رقم الدخول (الهاتف)"
        }
        warning={
          accountsModal?.kind === "parent"
            ? "تظهر كلمة المرور المؤقتة مرة واحدة فقط. انسخها أو اطبعها الآن قبل الإغلاق، وسيُطلب من ولي الأمر تغييرها عند أول تسجيل دخول."
            : undefined
        }
        skippedTitle={
          accountsModal?.kind === "parent"
            ? "طلاب لم يتم إنشاء حساب ولي أمر لهم"
            : undefined
        }
      />

      {/* View Student */}
      <ViewStudentModal
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        student={selectedStudent}
      />


      {/* Change payment status Modal */}
      <ConfirmModal
        isOpen={confirmPaymentStatusOpen}
        onClose={closeConfirmToggle}
        onConfirm={confirmToggle}
        loading={changePaymentStatusLoading}
        title="تغيير حالة الدفع"
        message={`هل أنت متأكد من ${
          selectedStudent?.isPaid
            ? "تغيير حالة الطالب إلى غير مدفوع"
            : "تسجيل الطالب كمدفوع"
        }؟`}
        confirmText={
          selectedStudent?.isPaid ? "تحديد كغير مدفوع" : "تسجيل كمدفوع"
        }
        cancelText="إلغاء"
      />

      {/* Delete student */}
      <ConfirmModal
        isOpen={confirmOpen}
        onClose={closeConfirmDeleteToggle}
        onConfirm={confirmDeleteToggle}
        loading={deleteLoading}
        title="حذف الطالب"
        message={`هل أنت متأكد من حذف الطالب "${selectedStudent?.fullName || ""}"؟`}
        confirmText="حذف"
        cancelText="إلغاء"
      />

      {/* Change student status */}
      <ConfirmModal
        isOpen={confirmChangeStatusOpen}
        onClose={closeConfirmChangeStatusToggle}
        onConfirm={confirmChangeStatusToggle}
        loading={changeStatusLoading}
        title="تغيير حالة الطالب"
        message={`هل أنت متأكد من تغيير حالة الطالب "${selectedStudent?.fullName || ""}"؟`}
        confirmText="تغيير"
        cancelText="إلغاء"
      />

      <StudentImportWizard
        open={!!importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => {
          loadStudents();
        }}
        centerName={centerName}
      />
    </div>
  );
}
