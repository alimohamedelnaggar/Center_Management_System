import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Key,
  Users,
  Wallet,
  Loader2,
} from "@/components/icons";

import Pagination from "../components/common/Pagination";
import ConfirmModal from "../components/common/ConfirmModal";
import PaySalaryModal from "../components/common/PaySalaryModal";
import AssistantModal from "../components/common/AssistantModal";
import ResetPasswordModal from "../components/common/ResetPasswordModal";
import AssistantSalaryLogModal from "../components/common/AssistantSalaryLogModal";
import EditAssistantPaymentModal from "../components/common/EditAssistantPaymentModal";
import AssistantsSalaryTab from "./AssistantsPages/AssistantsSalaryTab";
import { assistantService } from "../services/assistantService";
import { formatCurrency } from "../utils/formatCurrency";
import { useAuth } from "../context/useAuth";

const TABS = [
  { key: "assistants", label: "المساعدين", icon: Users },
  { key: "salaries", label: "سجل المرتبات", icon: Wallet },
];

const PAGE_SIZE = 6;

export default function AssistantManagement() {
  const { role, isCenterAdmin } = useAuth();
  const canManage =
    role === "SuperAdmin" || role === "CenterOwner" || isCenterAdmin;

  const [activeTab, setActiveTab] = useState("assistants");

  const [assistants, setAssistants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAssistant, setSelectedAssistant] = useState(null);
  const [savingAssistant, setSavingAssistant] = useState(false);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [resetAssistant, setResetAssistant] = useState(null);

  const [salaryRefreshKey, setSalaryRefreshKey] = useState(0);
  const [payItem, setPayItem] = useState(null);
  const [payingSalary, setPayingSalary] = useState(false);

  const [logAssistant, setLogAssistant] = useState(null);
  const [logData, setLogData] = useState(null);
  const [logLoading, setLogLoading] = useState(false);

  const [editingPayment, setEditingPayment] = useState(null);
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState(null);

  useEffect(() => {
    fetchAssistants();
  }, [page, search]);

  const fetchAssistants = async () => {
    try {
      setLoading(true);
      const res = await assistantService.getPaginated(
        page,
        PAGE_SIZE,
        search,
        true,
      );
      const dataList = res?.items || [];
      setAssistants(dataList);
      setTotalPages(res?.totalPages || 1);
      setTotal(res?.totalCount || dataList.length);
    } catch {
      toast.error("فشل في تحميل المساعدين");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setSelectedAssistant(null);
    setIsModalOpen(true);
  };

  const openEdit = (assistant) => {
    setSelectedAssistant(assistant);
    setIsModalOpen(true);
  };

  const handleSubmit = async (formData) => {
    try {
      setSavingAssistant(true);
      const response = formData.id
        ? await assistantService.edit(formData)
        : await assistantService.create(formData);

      if (response?.succeeded === false) {
        toast.error(response?.message || "تعذر حفظ بيانات المساعد");
        return;
      }

      toast.success(formData.id ? "تم تحديث بيانات المساعد" : "تم إضافة المساعد");
      setIsModalOpen(false);
      fetchAssistants();
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "حدث خطأ أثناء حفظ البيانات",
      );
    } finally {
      setSavingAssistant(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedAssistant) return;
    try {
      setDeleting(true);
      const response = await assistantService.delete(selectedAssistant.id);
      if (response?.succeeded === false) {
        toast.error(response?.message || "تعذر حذف المساعد");
        return;
      }
      toast.success("تم حذف المساعد");
      setIsDeleteOpen(false);
      setSelectedAssistant(null);
      fetchAssistants();
    } catch (err) {
      toast.error(err?.response?.data?.message || "حدث خطأ أثناء الحذف");
    } finally {
      setDeleting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetAssistant?.id) return;

    try {
      return await assistantService.resetPassword(resetAssistant.id);
    } catch (err) {
      return {
        succeeded: false,
        message: err?.response?.data?.message || "حدث خطأ أثناء التحديث",
      };
    }
  };

  // ---- Salary ----
  const openPay = (item) => setPayItem(item);

  const handlePaySalary = async (data) => {
    try {
      setPayingSalary(true);
      const response = await assistantService.paySalary({
        assistantId: data.assistantId,
        month: data.month,
        year: data.year,
        amount: data.amount,
        paidAt: data.paidAt,
        notes: data.notes,
      });
      if (response?.succeeded === false) {
        toast.error(response?.message || "تعذر صرف المرتب");
        return;
      }
      toast.success("تم صرف المرتب بنجاح");
      setPayItem(null);
      setSalaryRefreshKey((k) => k + 1);
      if (logAssistant) loadSalaryLog(logAssistant.id);
    } catch (err) {
      toast.error(err?.response?.data?.message || "حدث خطأ أثناء الصرف");
    } finally {
      setPayingSalary(false);
    }
  };

  const loadSalaryLog = async (assistantId) => {
    try {
      setLogLoading(true);
      const res = await assistantService.getSalaryInfo(assistantId);
      setLogData(res?.data || res);
    } catch {
      toast.error("فشل في تحميل سجل المرتبات");
      setLogData(null);
    } finally {
      setLogLoading(false);
    }
  };

  const openLog = (item) => {
    setLogAssistant(item);
    setLogData(null);
    loadSalaryLog(item.id);
  };

  const openEditPayment = (operation, month) => {
    const maxAmount = Math.max(
      0,
      Number(month.basicSalary || 0) -
        (Number(month.totalPaid || 0) - Number(operation.netSalary || 0)),
    );
    setEditingPayment({
      operation,
      month,
      assistantName: logData?.fullName || logAssistant?.fullName || "",
      maxAmount,
    });
  };

  const handleUpdatePayment = async (data) => {
    try {
      setSavingPayment(true);
      const response = await assistantService.updateSalaryPayment(data);
      if (response?.succeeded === false) {
        toast.error(response?.message || "تعذر تعديل عملية الصرف");
        return;
      }
      toast.success("تم تعديل عملية الصرف");
      setEditingPayment(null);
      if (logAssistant) loadSalaryLog(logAssistant.id);
      setSalaryRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(err?.response?.data?.message || "حدث خطأ أثناء التعديل");
    } finally {
      setSavingPayment(false);
    }
  };

  const handleDeletePayment = async () => {
    if (!paymentToDelete) return;
    try {
      const response = await assistantService.deleteSalaryPayment(
        paymentToDelete.id,
      );
      if (response?.succeeded === false) {
        toast.error(response?.message || "تعذر حذف عملية الصرف");
        return;
      }
      toast.success("تم حذف عملية الصرف");
      setPaymentToDelete(null);
      if (logAssistant) loadSalaryLog(logAssistant.id);
      setSalaryRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(err?.response?.data?.message || "حدث خطأ أثناء الحذف");
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-text-main">إدارة المساعدين</h1>

        <div className="flex items-center gap-1 rounded-xl border border-surface-border bg-surface-muted p-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                  isActive
                    ? "bg-primary text-text-inverse shadow-sm"
                    : "text-text-muted hover:text-text-main"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "assistants" ? (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-56">
              <Search
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
              />
              <input
                type="text"
                placeholder="بحث بالاسم أو الهاتف..."
                value={search}
                onChange={(e) => {
                  setPage(1);
                  setSearch(e.target.value);
                }}
                className="w-full rounded-lg border border-surface-border bg-surface-card py-2 pe-3 ps-9 text-text-main focus:border-primary focus:outline-none"
              />
            </div>

            {canManage && (
              <button
                onClick={openCreate}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary/90"
              >
                <Plus size={16} /> إضافة مساعد
              </button>
            )}
          </div>

          <div className="rounded-lg border border-surface-border bg-surface-card shadow">
            {loading ? (
              <div className="flex justify-center items-center py-16 text-text-muted">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : assistants.length === 0 ? (
              <div className="flex flex-col items-center gap-3 p-10 text-text-muted">
                <Users size={40} />
                <p>لا يوجد مساعدون بعد</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead className="bg-surface-muted text-sm text-text-muted">
                    <tr>
                      <th className="p-4 font-medium">#</th>
                      <th className="p-4 font-medium">الاسم</th>
                      <th className="p-4 font-medium">الهاتف</th>
                      <th className="p-4 font-medium">المرتب</th>
                      <th className="p-4 font-medium">الأستاذ المرتبط</th>
                      <th className="p-4 font-medium">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assistants.map((assistant, index) => (
                      <tr
                        key={assistant.id}
                        className="border-t border-surface-border hover:bg-surface-muted/50"
                      >
                        <td className="p-4 text-text-muted">
                          {(page - 1) * PAGE_SIZE + index + 1}
                        </td>
                        <td className="p-4 font-bold text-text-main">
                          {assistant.fullName}
                        </td>
                        <td className="p-4 text-text-muted" dir="ltr">
                          {assistant.phoneNumber || "-"}
                        </td>
                        <td className="p-4 text-text-main">
                          {formatCurrency(assistant.salary)}
                        </td>
                        <td className="p-4 text-text-main">
                          {assistant.teacherName || (
                            <span className="text-text-muted">
                              على مستوى المركز
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          {canManage && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openEdit(assistant)}
                                title="تعديل"
                                className="rounded-lg border border-surface-border p-2 text-text-muted hover:bg-surface-muted hover:text-primary"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => setResetAssistant(assistant)}
                                title="إعادة تعيين كلمة السر"
                                className="rounded-lg border border-surface-border p-2 text-text-muted hover:bg-surface-muted hover:text-primary"
                              >
                                <Key size={16} />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedAssistant(assistant);
                                  setIsDeleteOpen(true);
                                }}
                                title="حذف"
                                className="rounded-lg border border-surface-border p-2 text-text-muted hover:bg-red-50 hover:text-red-600"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!loading && assistants.length > 0 && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={total}
                pageSize={PAGE_SIZE}
                name="مساعد"
                onPageChange={setPage}
              />
            )}
          </div>
        </>
      ) : (
        <AssistantsSalaryTab
          onPay={openPay}
          onOpenLog={openLog}
          refreshKey={salaryRefreshKey}
        />
      )}

      <AssistantModal
        isOpen={isModalOpen}
        initialData={selectedAssistant}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        loading={savingAssistant}
      />

      <ResetPasswordModal
        isOpen={Boolean(resetAssistant)}
        assistant={resetAssistant}
        onClose={() => setResetAssistant(null)}
        onSubmit={handleResetPassword}
      />

      <ConfirmModal
        isOpen={isDeleteOpen}
        loading={deleting}
        title="حذف المساعد"
        message="هل أنت متأكد من حذف هذا المساعد؟ لا يمكن التراجع عن هذا الإجراء."
        details={
          selectedAssistant
            ? [
                { label: "الاسم", value: selectedAssistant.fullName },
                { label: "الهاتف", value: selectedAssistant.phoneNumber || "-" },
              ]
            : null
        }
        onClose={() => {
          setIsDeleteOpen(false);
          setSelectedAssistant(null);
        }}
        onConfirm={handleDelete}
      />

      <PaySalaryModal
        isOpen={Boolean(payItem)}
        assistant={
          payItem ? { id: payItem.id, fullName: payItem.fullName } : null
        }
        month={payItem?.month}
        year={payItem?.year}
        salary={payItem?.salary || 0}
        paid={payItem?.paid || 0}
        remaining={payItem?.remaining || 0}
        loading={payingSalary}
        onClose={() => setPayItem(null)}
        onSubmit={handlePaySalary}
      />

      <AssistantSalaryLogModal
        isOpen={Boolean(logAssistant)}
        onClose={() => {
          setLogAssistant(null);
          setLogData(null);
        }}
        assistant={logAssistant}
        data={logData}
        loading={logLoading}
        onEditPayment={openEditPayment}
        onDeletePayment={(operation) => setPaymentToDelete(operation)}
      />

      <EditAssistantPaymentModal
        isOpen={Boolean(editingPayment)}
        payment={editingPayment?.operation}
        assistantName={editingPayment?.assistantName || ""}
        maxAmount={editingPayment?.maxAmount || 0}
        loading={savingPayment}
        onClose={() => setEditingPayment(null)}
        onSubmit={handleUpdatePayment}
      />

      <ConfirmModal
        isOpen={Boolean(paymentToDelete)}
        title="حذف عملية الصرف"
        message="هل أنت متأكد من حذف عملية الصرف هذه؟ لا يمكن التراجع عن هذا الإجراء."
        confirmText="تأكيد الحذف"
        onClose={() => setPaymentToDelete(null)}
        onConfirm={handleDeletePayment}
      />
    </div>
  );
}
