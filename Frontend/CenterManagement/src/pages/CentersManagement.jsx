import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  AlertCircle,
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

const fieldClass =
  "min-h-11 w-full rounded-xl border border-surface-border bg-surface-card px-3 py-2 text-sm text-text-main placeholder:text-text-muted focus:border-primary focus:outline-none";
const buttonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60";
const iconButtonClass =
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-surface-border text-text-muted transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60";

function ScrollHint({ label }) {
  return (
    <p className="no-print mb-2 text-xs font-medium text-text-muted sm:hidden">
      {label}
    </p>
  );
}

function LoadingState({ message }) {
  return (
    <div
      role="status"
      className="flex min-h-[16rem] flex-col items-center justify-center gap-3 p-6"
    >
      <span
        aria-hidden="true"
        className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"
      />
      <p className="text-sm font-medium text-text-muted">{message}</p>
    </div>
  );
}

function ErrorState({ testId, message, onRetry }) {
  return (
    <div
      role="alert"
      data-testid={testId}
      className="flex min-h-[16rem] flex-col items-center justify-center gap-3 p-6 text-center"
    >
      <AlertCircle className="h-10 w-10 text-status-danger" aria-hidden="true" />
      <p className="text-sm font-bold text-text-main">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        data-testid={`${testId.replace(/-error$/, "")}-retry`}
        className={`${buttonClass} bg-primary px-5 text-primary-contrast hover:bg-primary-hover`}
      >
        <RefreshCw className="h-4 w-4" aria-hidden="true" />
        إعادة المحاولة
      </button>
    </div>
  );
}

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
      aria-label="نسخ"
      title="نسخ"
      className={iconButtonClass}
    >
      <Copy size={16} aria-hidden="true" />
    </button>
  );
}

function CenterActions({ center, suspended, busy, accessToken, onImpersonate, onConfirm, onEdit, onPasswordInfo }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => onImpersonate(center)}
        disabled={!center.ownerId || !accessToken}
        data-testid="center-impersonate"
        className="inline-flex min-h-11 items-center rounded-lg border border-surface-border bg-surface-card px-3 text-sm font-bold text-primary transition-colors hover:bg-primary-subtle disabled:cursor-not-allowed disabled:opacity-60"
      >
        دخول كالمالك
      </button>
      {center.type === "SoloTeacher" && (
        <button
          type="button"
          title="ترقية إلى متعدد المدرسين"
          aria-label="ترقية إلى متعدد المدرسين"
          disabled={busy}
          onClick={() =>
            onConfirm({
              title: "ترقية إلى متعدد المدرسين",
              message: `هل تريد ترقية ${center?.name || "هذا المركز"} إلى مركز متعدد المدرسين؟ سيتمكن المالك بعدها من إضافة مدرسين ومجموعات لكل مدرس.`,
              confirmText: "ترقية",
              successMessage: "تمت ترقية المركز",
              action: () => centerService.upgradeToMultiTeacher(center.id),
            })
          }
          className="inline-flex min-h-11 items-center rounded-lg border border-surface-border bg-surface-card px-3 text-sm font-bold text-status-warning transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
        >
          ترقية
        </button>
      )}
      <button
        type="button"
        title="تعديل"
        aria-label="تعديل"
        onClick={() => onEdit(center)}
        className={iconButtonClass}
      >
        <Pencil size={16} aria-hidden="true" />
      </button>
      <button
        type="button"
        title={suspended ? "تفعيل" : "إيقاف"}
        aria-label={suspended ? "تفعيل" : "إيقاف"}
        disabled={busy}
        onClick={() =>
          onConfirm({
            title: suspended ? "تفعيل المركز" : "إيقاف المركز",
            message: suspended
              ? `هل تريد تفعيل ${center?.name || "هذا المركز"}؟ سيستعيد المستخدمون الدخول فوراً.`
              : `هل تريد إيقاف ${center?.name || "هذا المركز"}؟ سيمنع جميع المستخدمين من الدخول فوراً.`,
            confirmText: suspended ? "تفعيل" : "إيقاف",
            danger: !suspended,
            successMessage: suspended ? "تم تفعيل المركز" : "تم إيقاف المركز",
            action: () => centerService.setStatus(center.id, suspended ? 1 : 2),
          })
        }
        className={iconButtonClass}
      >
        {suspended ? (
          <PlayCircle size={16} aria-hidden="true" />
        ) : (
          <XCircle size={16} aria-hidden="true" />
        )}
      </button>
      <button
        type="button"
        title="إعادة تعيين كلمة المرور"
        aria-label="إعادة تعيين كلمة المرور"
        disabled={!center.ownerId || busy}
        onClick={() =>
          onConfirm({
            title: "إعادة تعيين كلمة المرور",
            message: `هل تريد إعادة تعيين كلمة مرور ${center.ownerName || "مالك المركز"}؟ سيُطلب منه تغييرها عند الدخول.`,
            confirmText: "إعادة التعيين",
            successMessage: "تم إعادة تعيين كلمة المرور",
            action: async () => {
              const response = await centerService.resetUserPassword(center.ownerId);
              if (
                response?.succeeded !== false &&
                response?.data?.temporaryPassword
              ) {
                onPasswordInfo({
                  title: "كلمة مرور مؤقتة",
                  phone: response.data.phoneNumber,
                  password: response.data.temporaryPassword,
                });
              }
              return response;
            },
          })
        }
        className={iconButtonClass}
      >
        <Key size={16} aria-hidden="true" />
      </button>
      <button
        type="button"
        title="حذف"
        aria-label="حذف"
        disabled={busy}
        onClick={() =>
          onConfirm({
            title: "حذف المركز",
            message: `هل تريد حذف ${center?.name || "هذا المركز"}؟ لا يمكن التراجع عن هذه العملية.`,
            confirmText: "حذف",
            danger: true,
            successMessage: "تم حذف المركز",
            action: () => centerService.softDelete(center.id),
          })
        }
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-surface-border text-status-danger transition-colors hover:bg-status-danger-bg"
      >
        <Trash2 size={16} aria-hidden="true" />
      </button>
    </div>
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
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [modalPreset, setModalPreset] = useState(null);
  const [editCenter, setEditCenter] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [passwordInfo, setPasswordInfo] = useState(null);
  const pageSize = 10;

  const loadCenters = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await centerService.getCentersPaged({
        pageNumber: page,
        pageSize,
        search: search.trim() || undefined,
        status: status || undefined,
      });
      if (response?.succeeded === false) {
        throw new Error(response?.message || "تعذر تحميل المراكز");
      }
      const payload = response?.data;
      const list = Array.isArray(payload)
        ? payload
        : payload?.data ?? payload?.items ?? [];
      setRows(Array.isArray(list) ? list : []);
      setMeta({
        totalPages: payload?.totalPages ?? 0,
        totalCount: payload?.totalCount ?? 0,
      });
    } catch (caught) {
      const message = caught?.message || "تعذر تحميل المراكز";
      // The inline retryable error is the single source of feedback here. A
      // toast would be a second, transient copy and (measured at 768 and
      // 844x390) covered the header actions, so it is intentionally omitted.
      setError(message);
      setRows([]);
      setMeta({ totalPages: 0, totalCount: 0 });
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

  const openConfirm = (action) => setConfirm(action);

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

  const statusBadge = (status) => (
    <span
      className={`inline-flex min-h-7 items-center rounded-full px-3 py-1 text-xs font-bold ${
        statusStyles[status] ?? "bg-surface-muted text-text-muted"
      }`}
    >
      {statusLabels[status] ?? status}
    </span>
  );

  return (
    <div
      data-testid="centers-page"
      dir="rtl"
      className="mx-auto w-full min-w-0 max-w-7xl space-y-6 p-4 md:p-6"
    >
      <div className="no-print flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-xl font-bold text-text-main md:text-2xl">إدارة المراكز</h1>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadCenters}
            data-testid="centers-refresh"
            aria-label="تحديث المراكز"
            className={`${buttonClass} border border-surface-border bg-surface-card text-text-muted hover:bg-surface-muted`}
          >
            <RefreshCw size={16} aria-hidden="true" /> تحديث
          </button>
          <button
            type="button"
            onClick={() => setModalPreset("Teacher")}
            data-testid="centers-create-solo"
            className={`${buttonClass} bg-secondary text-primary-contrast hover:bg-secondary-hover`}
          >
            <UserRound size={16} aria-hidden="true" /> مدرس فردي
          </button>
          <button
            type="button"
            onClick={() => setModalPreset("CenterOwner")}
            data-testid="centers-create-center"
            className={`${buttonClass} bg-primary text-primary-contrast hover:bg-primary-hover`}
          >
            <UserPlus size={16} aria-hidden="true" /> مركز جديد
          </button>
        </div>
      </div>

      <div
        data-testid="centers-filters"
        className="no-print grid grid-cols-1 gap-3 rounded-card border border-surface-border bg-surface-card p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_14rem]"
      >
        <label className="sr-only" htmlFor="centers-search-input">
          بحث بالاسم أو الهاتف
        </label>
        <div className="min-w-0">
          <input
            id="centers-search-input"
            type="search"
            placeholder="بحث بالاسم أو الهاتف..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            data-testid="centers-search"
            aria-label="بحث بالاسم أو الهاتف"
            className={fieldClass}
          />
        </div>
        <div className="min-w-0">
          <label className="sr-only" htmlFor="centers-status-select">
            كل الحالات
          </label>
          <select
            id="centers-status-select"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            data-testid="centers-status"
            aria-label="تصفية حسب الحالة"
            className={fieldClass}
          >
            <option value="">كل الحالات</option>
            <option value="Active">نشط</option>
            <option value="Suspended">موقوف</option>
            <option value="Expired">منتهي</option>
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingState message="جارٍ تحميل المراكز..." />
      ) : error ? (
        <ErrorState testId="centers-error" message={error} onRetry={loadCenters} />
      ) : rows.length === 0 ? (
        <div
          data-testid="centers-empty"
          className="flex min-h-[16rem] flex-col items-center justify-center gap-3 rounded-card border border-surface-border bg-surface-card p-6 text-center text-text-muted"
        >
          <Building2 size={40} aria-hidden="true" />
          <p className="text-sm font-semibold">لا توجد مراكز بعد</p>
        </div>
      ) : (
        <>
          <ul data-testid="centers-cards" className="space-y-3 md:hidden">
            {rows.map((center) => (
              <li
                key={center.id}
                data-testid="centers-card"
                className="min-w-0 rounded-card border border-surface-border bg-surface-card p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words text-base font-bold text-text-main">
                      {center.name}
                    </p>
                    <p className="mt-1 break-words text-sm text-text-muted">
                      {center.ownerName || "-"}
                    </p>
                    <p className="break-all text-sm text-text-muted" dir="ltr">
                      {center.ownerPhone || ""}
                    </p>
                    {center.ownerEmail && (
                      <p className="break-all text-sm text-text-muted" dir="ltr">
                        {center.ownerEmail}
                      </p>
                    )}
                  </div>
                  {statusBadge(center.status)}
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-surface-muted p-3 text-sm">
                  <div className="min-w-0">
                    <dt className="text-xs text-text-muted">النوع</dt>
                    <dd className="break-words font-bold text-text-main">
                      {typeLabels[center.type] ?? center.type}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-text-muted">المدرسون</dt>
                    <dd className="font-bold text-text-main">{center.teachersCount}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-text-muted">الطلاب</dt>
                    <dd className="font-bold text-text-main">{center.studentsCount}</dd>
                  </div>
                </dl>
                <div className="mt-4 border-t border-surface-border pt-3">
                  <CenterActions
                    center={center}
                    suspended={center.status === "Suspended"}
                    busy={busy}
                    accessToken={accessToken}
                    onImpersonate={handleImpersonate}
                    onConfirm={openConfirm}
                    onEdit={setEditCenter}
                    onPasswordInfo={setPasswordInfo}
                  />
                </div>
              </li>
            ))}
          </ul>

          <div className="hidden md:block">
            <ScrollHint label="اسحب الجدول أفقيًا لرؤية بقية الأعمدة." />
            <div
              data-scroll-region
              tabIndex={0}
              role="region"
              aria-label="جدول المراكز"
              className="overflow-x-auto rounded-card border border-surface-border bg-surface-card shadow-sm"
            >
              <table data-testid="centers-table" className="w-full min-w-[1040px] text-right text-sm">
                <thead className="bg-surface-muted text-text-muted">
                  <tr>
                    <th className="p-4 font-semibold">#</th>
                    <th className="p-4 font-semibold">المركز</th>
                    <th className="p-4 font-semibold">المالك</th>
                    <th className="p-4 font-semibold">النوع</th>
                    <th className="p-4 font-semibold">المدرسون</th>
                    <th className="p-4 font-semibold">الطلاب</th>
                    <th className="p-4 font-semibold">الحالة</th>
                    <th className="p-4 font-semibold">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {rows.map((center, index) => (
                    <tr
                      key={center.id}
                      data-testid="center-row"
                      className="hover:bg-surface-muted/50"
                    >
                      <td className="p-4 text-text-muted">
                        {(page - 1) * pageSize + index + 1}
                      </td>
                      <td className="p-4 font-bold text-text-main">
                        <span className="block break-words">{center.name}</span>
                      </td>
                      <td className="p-4 text-text-muted">
                        <div className="break-words">{center.ownerName || "-"}</div>
                        <div className="break-all text-sm" dir="ltr">
                          {center.ownerPhone || ""}
                        </div>
                        {center.ownerEmail && (
                          <div className="break-all text-sm" dir="ltr">
                            {center.ownerEmail}
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-text-muted">
                        {typeLabels[center.type] ?? center.type}
                      </td>
                      <td className="p-4 text-text-muted">{center.teachersCount}</td>
                      <td className="p-4 text-text-muted">{center.studentsCount}</td>
                      <td className="p-4">{statusBadge(center.status)}</td>
                      <td className="p-4">
                        <CenterActions
                          center={center}
                          suspended={center.status === "Suspended"}
                          busy={busy}
                          accessToken={accessToken}
                          onImpersonate={handleImpersonate}
                          onConfirm={openConfirm}
                          onEdit={setEditCenter}
                          onPasswordInfo={setPasswordInfo}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {meta.totalPages > 1 && (
            <div
              data-testid="centers-pagination"
              className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-surface-border bg-surface-card p-4 text-sm text-text-muted"
            >
              <span>
                صفحة {page} من {meta.totalPages} — إجمالي {meta.totalCount}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className={`${buttonClass} border border-surface-border bg-surface-card text-text-main hover:bg-surface-muted`}
                >
                  السابق
                </button>
                <button
                  type="button"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className={`${buttonClass} border border-surface-border bg-surface-card text-text-main hover:bg-surface-muted`}
                >
                  التالي
                </button>
              </div>
            </div>
          )}
        </>
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
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="center-confirm-title"
            className="w-full max-w-md rounded-2xl border border-surface-border bg-surface-card p-6 shadow-2xl"
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <h2
                id="center-confirm-title"
                className="text-lg font-extrabold text-text-main"
              >
                {confirm.title}
              </h2>
              <button
                type="button"
                onClick={() => setConfirm(null)}
                aria-label="إغلاق"
                className={iconButtonClass}
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <p className="mb-5 break-words text-sm text-text-muted">{confirm.message}</p>
            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirm(null)}
                disabled={busy}
                className={`${buttonClass} border border-surface-border bg-surface-card text-text-main hover:bg-surface-muted`}
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={runConfirm}
                disabled={busy}
                className={`${buttonClass} px-5 text-primary-contrast ${
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
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="center-password-title"
            className="w-full max-w-md rounded-2xl border border-surface-border bg-surface-card p-6 shadow-2xl"
          >
            <h2
              id="center-password-title"
              className="mb-2 text-lg font-extrabold text-text-main"
            >
              {passwordInfo.title}
            </h2>
            <p className="mb-4 text-sm text-text-muted">
              سلّم بيانات الدخول التالية. سيُطلب من المستخدم تغييرها عند أول تسجيل
              دخول. لن تظهر مرة أخرى.
            </p>
            <div className="space-y-2 rounded-xl bg-surface-muted p-4 text-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-text-muted">اسم الدخول: </span>
                  <b className="break-all" dir="ltr">
                    {passwordInfo.phone}
                  </b>
                </div>
                <CopyButton value={passwordInfo.phone} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-text-muted">كلمة المرور المؤقتة: </span>
                  <b className="break-all" dir="ltr">
                    {passwordInfo.password}
                  </b>
                </div>
                <CopyButton value={passwordInfo.password} />
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPasswordInfo(null)}
              className={`${buttonClass} mt-5 w-full bg-primary text-primary-contrast hover:bg-primary-hover`}
            >
              تم
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
