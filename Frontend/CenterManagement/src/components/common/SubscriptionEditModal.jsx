import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { RefreshCw, X } from "@/components/icons";
import { subscriptionService } from "../../services/subscriptionService";

const planTypes = [
  { value: 1, label: "شهري" },
  { value: 2, label: "ربع سنوي" },
  { value: 3, label: "نصف سنوي" },
  { value: 4, label: "سنوي" },
  { value: 5, label: "مدى الحياة" },
];

const typeNameToValue = {
  Monthly: 1,
  Quarterly: 2,
  SemiAnnual: 3,
  Annual: 4,
  Lifetime: 5,
};

const valueToLabel = Object.fromEntries(
  planTypes.map((t) => [t.value, t.label]),
);

const typeLabel = (name) => valueToLabel[typeNameToValue[name] ?? 0] ?? name ?? "";

const inputClass =
  "w-full rounded-xl border border-surface-border bg-surface-muted p-2.5 text-text-main focus:border-primary focus:outline-none";
const labelClass = "mb-1 block text-sm font-medium text-text-main";

const toDateInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const toIso = (value) =>
  value ? new Date(`${value}T00:00:00`).toISOString() : null;

export default function SubscriptionEditModal({ isOpen, centerId, onClose, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState({
    type: 4,
    startDate: "",
    endDate: "",
    price: "",
    paidAmount: "",
    currency: "EGP",
    graceDays: 3,
    plan: "",
    notes: "",
  });
  const [enabledKeys, setEnabledKeys] = useState([]);
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [allowDisableDependents, setAllowDisableDependents] = useState(false);
  const [conflictMessage, setConflictMessage] = useState(null);
  const [history, setHistory] = useState(null);
  const [payment, setPayment] = useState({ amount: "", method: "", note: "" });
  const [paying, setPaying] = useState(false);

  const loadHistory = useCallback(async () => {
    if (!centerId) return;
    try {
      const response = await subscriptionService.history(centerId);
      setHistory(response?.data ?? null);
    } catch {
      setHistory(null);
    }
  }, [centerId]);

  const load = useCallback(async () => {
    if (!centerId) return;
    setLoading(true);
    try {
      const response = await subscriptionService.get(centerId);
      const data = response?.data;
      if (!data) {
        toast.error(response?.message || "تعذر تحميل الاشتراك");
        return;
      }
      setDetail(data);
      setForm({
        type: typeNameToValue[data.type] ?? 4,
        startDate: toDateInput(data.subscriptionStart),
        endDate: toDateInput(data.subscriptionEnd),
        price: data.price ?? 0,
        paidAmount: data.paidAmount ?? 0,
        currency: data.currency || "EGP",
        graceDays: data.graceDays ?? 3,
        plan: data.plan ?? "",
        notes: data.notes ?? "",
      });
      setEnabledKeys((data.modules ?? []).filter((m) => m.enabled).map((m) => m.key));
      await loadHistory();
    } catch {
      toast.error("تعذر تحميل بيانات الاشتراك");
    } finally {
      setLoading(false);
    }
  }, [centerId, loadHistory]);

  useEffect(() => {
    if (isOpen) {
      setPreview(null);
      setConflictMessage(null);
      setAllowDisableDependents(false);
      setPayment({ amount: "", method: "", note: "" });
      load();
    }
  }, [isOpen, load]);

  if (!isOpen) return null;

  const nameByKey = Object.fromEntries(
    (detail?.modules ?? []).map((m) => [m.key, m.name]),
  );

  const runPreview = async (keys, disableDependents) => {
    setPreviewing(true);
    try {
      const response = await subscriptionService.previewModules({
        centerId,
        enabledModules: keys,
        disableDependents,
      });
      setPreview(response?.data ?? null);
    } catch {
      setPreview(null);
    } finally {
      setPreviewing(false);
    }
  };

  const toggleModule = async (key) => {
    setConflictMessage(null);
    const next = enabledKeys.includes(key)
      ? enabledKeys.filter((k) => k !== key)
      : [...enabledKeys, key];
    setEnabledKeys(next);
    await runPreview(next, allowDisableDependents);
  };

  const applyPreset = async (preset) => {
    setConflictMessage(null);
    setEnabledKeys(preset.modules);
    await runPreview(preset.modules, allowDisableDependents);
  };

  const handleAllowDisableChange = async (event) => {
    const value = event.target.checked;
    setAllowDisableDependents(value);
    await runPreview(enabledKeys, value);
  };

  const handleSave = async () => {
    if (form.type !== 5 && form.startDate && form.endDate && form.endDate < form.startDate) {
      toast.error("تاريخ النهاية يجب أن يكون بعد تاريخ البداية");
      return;
    }

    setSaving(true);
    setConflictMessage(null);
    try {
      const subscriptionResponse = await subscriptionService.update({
        centerId,
        type: form.type,
        startDate: toIso(form.startDate),
        endDate: form.type === 5 ? null : toIso(form.endDate),
        price: Number(form.price) || 0,
        paidAmount: Number(form.paidAmount) || 0,
        currency: form.currency || "EGP",
        graceDays: Number(form.graceDays) || 0,
        plan: form.plan.trim() || null,
        notes: form.notes.trim() || null,
      });

      if (subscriptionResponse?.succeeded === false) {
        toast.error(subscriptionResponse?.message || "تعذر تحديث الاشتراك");
        return;
      }

      const modulesResponse = await subscriptionService.updateModules({
        centerId,
        enabledModules: enabledKeys,
        disableDependents: allowDisableDependents,
      });

      if (modulesResponse?.succeeded === false) {
        setConflictMessage(modulesResponse?.message || "تعذر تحديث الوحدات");
        toast.error(modulesResponse?.message || "تعذر تحديث الوحدات");
        return;
      }

      toast.success("تم حفظ الاشتراك والوحدات بنجاح");
      onSaved?.();
      onClose?.();
    } catch {
      toast.error("حدث خطأ أثناء الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const autoEnabledNames = preview?.autoEnabledNames ?? [];
  const conflicts = preview?.conflicts ?? [];
  const remaining = history ? Number(history.remainingAmount ?? 0) : null;

  const handleAddPayment = async () => {
    const amount = Number(payment.amount);
    if (!amount || amount <= 0) {
      toast.error("أدخل مبلغ دفعة صحيح");
      return;
    }
    setPaying(true);
    try {
      const response = await subscriptionService.addPayment(centerId, {
        amount,
        method: payment.method.trim() || null,
        note: payment.note.trim() || null,
      });
      if (response?.succeeded === false) {
        toast.error(response?.message || "تعذر إضافة الدفعة");
        return;
      }
      toast.success("تم إضافة الدفعة");
      setHistory(response?.data ?? null);
      setPayment({ amount: "", method: "", note: "" });
      onSaved?.();
    } catch {
      toast.error("حدث خطأ أثناء إضافة الدفعة");
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-surface-border bg-surface-card p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-text-main">
            تعديل الاشتراك والوحدات
            {detail?.centerName ? ` — ${detail.centerName}` : ""}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-text-muted hover:bg-surface-muted"
          >
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-text-muted">
            <RefreshCw className="animate-spin" size={18} /> جارٍ التحميل...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className={labelClass}>نوع الاشتراك</label>
                <select
                  className={inputClass}
                  value={form.type}
                  onChange={(e) => setForm((p) => ({ ...p, type: Number(e.target.value) }))}
                >
                  {planTypes.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>تاريخ البداية</label>
                <input
                  type="date"
                  dir="ltr"
                  className={inputClass}
                  value={form.startDate}
                  onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                />
              </div>
              <div>
                <label className={labelClass}>تاريخ النهاية</label>
                <input
                  type="date"
                  dir="ltr"
                  disabled={form.type === 5}
                  className={inputClass}
                  value={form.endDate}
                  onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
                />
                {form.type === 5 && (
                  <p className="mt-1 text-xs text-text-muted">مدى الحياة بلا تاريخ انتهاء.</p>
                )}
              </div>
              <div>
                <label className={labelClass}>السعر</label>
                <input
                  type="number"
                  dir="ltr"
                  min="0"
                  className={inputClass}
                  value={form.price}
                  onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                />
              </div>
              <div>
                <label className={labelClass}>المدفوع</label>
                <input
                  type="number"
                  dir="ltr"
                  min="0"
                  className={inputClass}
                  value={form.paidAmount}
                  onChange={(e) => setForm((p) => ({ ...p, paidAmount: e.target.value }))}
                />
              </div>
              <div>
                <label className={labelClass}>العملة</label>
                <input
                  dir="ltr"
                  className={inputClass}
                  value={form.currency}
                  onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}
                />
              </div>
              <div>
                <label className={labelClass}>أيام السماح بعد الانتهاء</label>
                <input
                  type="number"
                  dir="ltr"
                  min="0"
                  className={inputClass}
                  value={form.graceDays}
                  onChange={(e) => setForm((p) => ({ ...p, graceDays: e.target.value }))}
                />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>اسم الخطة (لللعرض)</label>
                <input
                  className={inputClass}
                  value={form.plan}
                  onChange={(e) => setForm((p) => ({ ...p, plan: e.target.value }))}
                />
              </div>
              <div className="md:col-span-3">
                <label className={labelClass}>ملاحظات</label>
                <input
                  className={inputClass}
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                />
              </div>
            </div>

            <div className="my-5 border-t border-surface-border" />

            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-bold text-text-main">الوحدات المفعّلة</h3>
              <div className="flex flex-wrap items-center gap-2">
                {(detail?.presets ?? []).map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="rounded-lg border border-surface-border px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary-subtle"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {(detail?.modules ?? []).map((module) => (
                <label
                  key={module.key}
                  className="flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-surface-border bg-surface-muted px-3 py-2.5"
                >
                  <span className="flex items-center gap-2 text-sm text-text-main">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-primary"
                      checked={enabledKeys.includes(module.key)}
                      onChange={() => toggleModule(module.key)}
                    />
                    {module.name}
                  </span>
                  {module.requiredBy?.length > 0 && (
                    <span className="text-[10px] text-text-muted">
                      مطلوب بواسطة {module.requiredBy.map((k) => nameByKey[k] ?? k).join("، ")}
                    </span>
                  )}
                </label>
              ))}
            </div>

            <div className="mt-3 min-h-[1.5rem] text-xs">
              {previewing ? (
                <span className="text-text-muted">جارٍ معاينة التبعيات...</span>
              ) : (
                <>
                  {autoEnabledNames.length > 0 && (
                    <p className="text-primary">
                      سيتم تفعيلها تلقائياً: {autoEnabledNames.join("، ")}
                    </p>
                  )}
                  {conflicts.map((conflict) => (
                    <p key={conflict.module} className="text-status-warning">
                      تعطيل «{conflict.moduleName}» محظور لأن{" "}
                      {conflict.dependentNames.join("، ")} يعتمد عليها.
                    </p>
                  ))}
                </>
              )}
            </div>

            <label className="mt-2 flex items-center gap-2 text-xs text-text-muted">
              <input
                type="checkbox"
                className="h-4 w-4 accent-primary"
                checked={allowDisableDependents}
                onChange={handleAllowDisableChange}
              />
              عند تعطيل وحدة مطلوبة، عطّل الوحدات التابعة لها تلقائياً.
            </label>

            {conflictMessage && (
              <p className="mt-2 rounded-xl bg-status-warning-bg p-3 text-xs text-status-warning">
                {conflictMessage}
              </p>
            )}

            <div className="my-5 border-t border-surface-border" />

            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-bold text-text-main">سجل الاشتراك والمدفوعات</h3>
              {remaining !== null && (
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    remaining > 0
                      ? "bg-status-warning-bg text-status-warning"
                      : "bg-status-success-bg text-status-success"
                  }`}
                >
                  المتبقي: {remaining.toLocaleString()} {history?.currency || ""}
                </span>
              )}
            </div>

            {(history?.subscriptions ?? []).length === 0 ? (
              <p className="rounded-xl bg-surface-muted p-3 text-xs text-text-muted">
                لا يوجد سجل اشتراكات بعد.
              </p>
            ) : (
              <div className="space-y-2">
                {(history?.subscriptions ?? []).map((sub) => (
                  <div
                    key={sub.id}
                    className="rounded-xl border border-surface-border bg-surface-muted p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="font-bold text-text-main">{typeLabel(sub.type)}</span>
                      <span dir="ltr" className="text-xs text-text-muted">
                        {toDateInput(sub.startDate)} → {sub.endDate ? toDateInput(sub.endDate) : "مدى الحياة"}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-text-muted">
                      <span>السعر: {Number(sub.price ?? 0).toLocaleString()}</span>
                      <span>المدفوع: {Number(sub.paidAmount ?? 0).toLocaleString()}</span>
                    </div>
                    {(sub.payments ?? []).length > 0 && (
                      <ul className="mt-2 space-y-1 border-t border-surface-border pt-2 text-xs">
                        {(sub.payments ?? []).map((p) => (
                          <li key={p.id} className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-text-main">
                              {Number(p.amount ?? 0).toLocaleString()}
                              {p.method ? ` — ${p.method}` : ""}
                              {p.note ? ` (${p.note})` : ""}
                            </span>
                            <span dir="ltr" className="text-text-muted">
                              {toDateInput(p.paidAt)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-4">
              <input
                type="number"
                dir="ltr"
                min="0"
                placeholder="المبلغ"
                className={inputClass}
                value={payment.amount}
                onChange={(e) => setPayment((p) => ({ ...p, amount: e.target.value }))}
              />
              <input
                placeholder="طريقة الدفع"
                className={inputClass}
                value={payment.method}
                onChange={(e) => setPayment((p) => ({ ...p, method: e.target.value }))}
              />
              <input
                placeholder="ملاحظة"
                className={inputClass}
                value={payment.note}
                onChange={(e) => setPayment((p) => ({ ...p, note: e.target.value }))}
              />
              <button
                type="button"
                onClick={handleAddPayment}
                disabled={paying}
                className="rounded-xl bg-secondary px-4 py-2 font-bold text-white hover:opacity-90 disabled:opacity-60"
              >
                {paying ? "جارٍ الإضافة..." : "إضافة دفعة"}
              </button>
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="rounded-xl border border-surface-border px-4 py-2 text-text-muted hover:bg-surface-muted disabled:opacity-60"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-xl bg-primary px-5 py-2 font-bold text-white hover:bg-primary-hover disabled:opacity-60"
              >
                {saving ? "جارٍ الحفظ..." : "حفظ"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
