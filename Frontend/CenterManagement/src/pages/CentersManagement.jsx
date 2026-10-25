import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Building2,
  Copy,
  Key,
  Pencil,
  PlayCircle,
  RefreshCw,
  Trash2,
  UserPlus,
  UserRound,
  X,
  XCircle,
} from "@/components/icons";
import AddTeacherModal from "../components/common/AddTeacherModal";
import CenterEditModal from "../components/common/CenterEditModal";
import Spinner from "../components/common/Spinner";
import { useAuth } from "../context/useAuth";
import { centerService } from "../services/centerService";

const typeLabels = {
  SoloTeacher: "مدرس فردي",
  MultiTeacher: "مركز",
};

const statusStyles = {
  Active: "bg-status-success-bg text-status-success",
  Suspended: "bg-status-danger-bg text-status-danger",
  Expired: "bg-status-warning-bg text-status-warning",
};

const statusLabels = {
  Active: "نشط",
  Suspended: "موقوف",
  Expired: "منتهي",
};

function CopyButton({ value }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value ?? "");
      toast.success("تم النسخ");
    } catch {
      toast.error("تعذر النسخ");
    }
  };

  return (
    <button
      onClick={copy}
      type="button"
      className="rounded-lg p-1.5 text-text-muted hover:bg-surface-muted"
      title="نسخ"
    >
      <Copy size={16} />
    </button>
  );
}

export default function CentersManagement() {
  const navigate = useNavigate();
  const { startImpersonation, accessToken } = useAuth();

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ totalPages: 0, totalCount: 0 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [modalPreset, setModalPreset] = useState(null);
  const [editCenter, setEditCenter] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [passwordInfo, setPasswordInfo] = useState(null);
  const pageSize = 10;

  const loadCenters = useCallback(async () => {
    setLoading(true);
    try {
      const response = await centerService.getCentersPaged({
        pageNumber: page,
        pageSize,
        search: search.trim() || undefined,
        status: status || undefined,
      });
      const data = response?.data;
      setRows(data?.data ?? []);
      setMeta({
        totalPages: data?.totalPages ?? 0,
        totalCount: data?.totalCount ?? 0,
      });
    } catch {
      toast.error("تعذر تحميل المراكز");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    loadCenters();
  }, [loadCenters]);

  const handleCreate = async (formData) => {
    try {
      const response = await centerService.createWithOwner(formData);
      if (response?.succeeded === false) {
        toast.error(response?.message || "تعذر إنشاء الحساب والمركز");
        return;
      }
      toast.success("تم إنشاء الحساب والمركز بنجاح");
      setModalPreset(null);
      setPasswordInfo({
        title: "تم إنشاء الحساب",
        phone: response?.data?.ownerPhone,
        password: response?.data?.initialPassword,
      });
      setPage(1);
      loadCenters();
    } catch {
      toast.error("حدث خطأ أثناء إنشاء الحساب");
    }
  };

  const handleImpersonate = async (center) => {
    if (!center.ownerId) {
      toast.error("لا يوجد حساب مالك لهذا المركز");
      return;
    }
    try {
      await startImpersonation(center.ownerId);
      toast.success(`أنت الآن تتصفّح كـ ${center.ownerName || "المالك"}`);
      navigate("/", { replace: true });
    } catch (error) {
      toast.error(error?.message || "تعذر بدء الانتحال");
    }
  };

  const handleEditSubmit = async (data) => {
    setBusy(true);
    try {
      const response = await centerService.update(data);
      if (response?.succeeded === false) {
        toast.error(response?.message || "تعذر تحديث المركز");
        return;
      }
      toast.success("تم تحديث المركز بنجاح");
      setEditCenter(null);
      loadCenters();
    } catch {
      toast.error("حدث خطأ أثناء تحديث المركز");
    } finally {
      setBusy(false);
    }
  };

  const runConfirm = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      const response = await confirm.action();
      if (response?.succeeded === false) {
        toast.error(response?.message || "تعذر تنفيذ العملية");
        return;
      }
      toast.success(response?.message || confirm.successMessage);
      setConfirm(null);
      loadCenters();
    } catch {
      toast.error("حدث خطأ أثناء تنفيذ العملية");
    } finally {
      setBusy(false);
    }
  };

  const centerName = (center) => center?.name || "هذا المركز";

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-text-main">إدارة المراكز</h1>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={loadCenters}
            className="flex items-center gap-2 rounded-lg border border-surface-border px-3 py-2 text-text-muted hover:bg-surface-muted"
          >
            <RefreshCw size={16} /> تحديث
          </button>
          <button
            onClick={() => setModalPreset("Teacher")}
            className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-white hover:bg-secondary-hover"
          >
            <UserRound size={16} /> مدرس فردي
          </button>
          <button
            onClick={() => setModalPreset("CenterOwner")}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary-hover"
          >
            <UserPlus size={16} /> مركز جديد
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="بحث بالاسم أو الهاتف..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="min-w-[220px] flex-1 rounded-xl border border-surface-border bg-surface-muted p-2.5 text-text-main focus:border-primary focus:outline-none"
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-surface-border bg-surface-muted p-2.5 text-text-main focus:border-primary focus:outline-none"
        >
          <option value="">كل الحالات</option>
          <option value="Active">نشط</option>
          <option value="Suspended">موقوف</option>
          <option value="Expired">منتهي</option>
        </select>
      </div>

      <div className="rounded-lg border border-surface-border bg-surface-card shadow">
        {loading ? (
          <div className="p-10">
            <Spinner msg="جارٍ تحميل المراكز..." />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-10 text-text-muted">
            <Building2 size={40} />
            <p>لا توجد مراكز بعد</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-surface-muted text-sm text-text-muted">
                <tr>
                  <th className="p-4 font-medium">#</th>
                  <th className="p-4 font-medium">المركز</th>
                  <th className="p-4 font-medium">المالك</th>
                  <th className="p-4 font-medium">النوع</th>
                  <th className="p-4 font-medium">المدرسون</th>
                  <th className="p-4 font-medium">الطلاب</th>
                  <th className="p-4 font-medium">الحالة</th>
                  <th className="p-4 font-medium">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((center, index) => {
                  const suspended = center.status === "Suspended";
                  return (
                    <tr
                      key={center.id}
                      className="border-t border-surface-border hover:bg-surface-muted/50"
                    >
                      <td className="p-4 text-text-muted">
                        {(page - 1) * pageSize + index + 1}
                      </td>
                      <td className="p-4 font-bold text-text-main">
                        {center.name}
                      </td>
                      <td className="p-4 text-text-muted">
                        <div>{center.ownerName || "-"}</div>
                        <div className="text-xs" dir="ltr">
                          {center.ownerPhone || ""}
                        </div>
                      </td>
                      <td className="p-4 text-text-muted">
                        {typeLabels[center.type] ?? center.type}
                      </td>
                      <td className="p-4 text-text-muted">
                        {center.teachersCount}
                      </td>
                      <td className="p-4 text-text-muted">
                        {center.studentsCount}
                      </td>
                      <td className="p-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            statusStyles[center.status] ??
                            "bg-surface-muted text-text-muted"
                          }`}
                        >
                          {statusLabels[center.status] ?? center.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            onClick={() => handleImpersonate(center)}
                            disabled={!center.ownerId || !accessToken}
                            className="rounded-lg border border-surface-border px-2.5 py-1.5 text-xs font-bold text-primary hover:bg-primary-subtle disabled:opacity-50"
                          >
                            دخول كالمالك
                          </button>
                          {center.type === "SoloTeacher" && (
                            <button
                              title="ترقية إلى متعدد المدرسين"
                              disabled={busy}
                              onClick={() =>
                                setConfirm({
                                  title: "ترقية إلى متعدد المدرسين",
                                  message: `هل تريد ترقية ${centerName(center)} إلى مركز متعدد المدرسين؟ سيتمكن المالك بعدها من إضافة مدرسين ومجموعات لكل مدرس.`,
                                  confirmText: "ترقية",
                                  successMessage: "تمت ترقية المركز",
                                  action: () =>
                                    centerService.upgradeToMultiTeacher(center.id),
                                })
                              }
                              className="rounded-lg border border-surface-border px-2.5 py-1.5 text-xs font-bold text-status-warning hover:bg-surface-muted disabled:opacity-50"
                            >
                              ترقية
                            </button>
                          )}
                          <button
                            title="تعديل"
                            onClick={() => setEditCenter(center)}
                            className="rounded-lg border border-surface-border p-1.5 text-text-muted hover:bg-surface-muted"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            title={suspended ? "تفعيل" : "إيقاف"}
                            onClick={() =>
                              setConfirm({
                                title: suspended ? "تفعيل المركز" : "إيقاف المركز",
                                message: suspended
                                  ? `هل تريد تفعيل ${centerName(center)}؟ سيستعيد المستخدمون الدخول فوراً.`
                                  : `هل تريد إيقاف ${centerName(center)}؟ سيمنع جميع المستخدمين من الدخول فوراً.`,
                                confirmText: suspended ? "تفعيل" : "إيقاف",
                                danger: !suspended,
                                successMessage: suspended
                                  ? "تم تفعيل المركز"
                                  : "تم إيقاف المركز",
                                action: () =>
                                  centerService.setStatus(center.id, suspended ? 1 : 2),
                              })
                            }
                            className="rounded-lg border border-surface-border p-1.5 text-text-muted hover:bg-surface-muted"
                          >
                            {suspended ? (
                              <PlayCircle size={16} />
                            ) : (
                              <XCircle size={16} />
                            )}
                          </button>
                          <button
                            title="إعادة تعيين كلمة المرور"
                            disabled={!center.ownerId}
                            onClick={() =>
                              setConfirm({
                                title: "إعادة تعيين كلمة المرور",
                                message: `هل تريد إعادة تعيين كلمة مرور ${center.ownerName || "مالك المركز"}؟ سيُطلب منه تغييرها عند الدخول.`,
                                confirmText: "إعادة التعيين",
                                successMessage: "تم إعادة تعيين كلمة المرور",
                                action: async () => {
                                  const response =
                                    await centerService.resetUserPassword(
                                      center.ownerId,
                                    );
                                  if (
                                    response?.succeeded !== false &&
                                    response?.data?.temporaryPassword
                                  ) {
                                    setPasswordInfo({
                                      title: "كلمة مرور مؤقتة",
                                      phone: response.data.phoneNumber,
                                      password:
                                        response.data.temporaryPassword,
                                    });
                                  }
                                  return response;
                                },
                              })
                            }
                            className="rounded-lg border border-surface-border p-1.5 text-text-muted hover:bg-surface-muted disabled:opacity-50"
                          >
                            <Key size={16} />
                          </button>
                          <button
                            title="حذف"
                            onClick={() =>
                              setConfirm({
                                title: "حذف المركز",
                                message: `هل تريد حذف ${centerName(center)}؟ لا يمكن التراجع عن هذه العملية.`,
                                confirmText: "حذف",
                                danger: true,
                                successMessage: "تم حذف المركز",
                                action: () => centerService.softDelete(center.id),
                              })
                            }
                            className="rounded-lg border border-surface-border p-1.5 text-status-danger hover:bg-surface-muted"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-text-muted">
          <span>
            صفحة {page} من {meta.totalPages} — إجمالي {meta.totalCount}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-surface-border px-3 py-1.5 hover:bg-surface-muted disabled:opacity-50"
            >
              السابق
            </button>
            <button
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-surface-border px-3 py-1.5 hover:bg-surface-muted disabled:opacity-50"
            >
              التالي
            </button>
          </div>
        </div>
      )}

      <AddTeacherModal
        isOpen={modalPreset !== null}
        presetAccountType={modalPreset ?? "CenterOwner"}
        lockAccountType
        onClose={() => setModalPreset(null)}
        onSubmit={handleCreate}
      />

      <CenterEditModal
        isOpen={editCenter !== null}
        center={editCenter}
        onClose={() => setEditCenter(null)}
        onSubmit={handleEditSubmit}
      />

      {confirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-surface-border bg-surface-card p-6 shadow-2xl">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-text-main">
                {confirm.title}
              </h2>
              <button
                onClick={() => setConfirm(null)}
                className="rounded-lg p-1 text-text-muted hover:bg-surface-muted"
              >
                <X size={20} />
              </button>
            </div>
            <p className="mb-5 text-sm text-text-muted">{confirm.message}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirm(null)}
                disabled={busy}
                className="rounded-xl border border-surface-border px-4 py-2 text-text-muted hover:bg-surface-muted disabled:opacity-60"
              >
                إلغاء
              </button>
              <button
                onClick={runConfirm}
                disabled={busy}
                className={`rounded-xl px-5 py-2 font-bold text-white disabled:opacity-60 ${
                  confirm.danger
                    ? "bg-status-danger hover:opacity-90"
                    : "bg-primary hover:bg-primary-hover"
                }`}
              >
                {busy ? "جارٍ التنفيذ..." : confirm.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {passwordInfo && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-surface-border bg-surface-card p-6 shadow-2xl">
            <h2 className="mb-2 text-lg font-extrabold text-text-main">
              {passwordInfo.title}
            </h2>
            <p className="mb-4 text-sm text-text-muted">
              سلّم بيانات الدخول التالية. سيُطلب من المستخدم تغييرها عند أول تسجيل
              دخول. لن تظهر مرة أخرى.
            </p>
            <div className="space-y-2 rounded-xl bg-surface-muted p-4 text-sm">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-text-muted">اسم الدخول: </span>
                  <b dir="ltr">{passwordInfo.phone}</b>
                </div>
                <CopyButton value={passwordInfo.phone} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-text-muted">كلمة المرور المؤقتة: </span>
                  <b dir="ltr">{passwordInfo.password}</b>
                </div>
                <CopyButton value={passwordInfo.password} />
              </div>
            </div>
            <button
              onClick={() => setPasswordInfo(null)}
              className="mt-5 w-full rounded-xl bg-primary py-2.5 font-bold text-white hover:bg-primary-hover"
            >
              تم
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
