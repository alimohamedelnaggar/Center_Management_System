import { X } from "@/components/icons";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  SELECTABLE_PLAN_TYPES,
  isTrialPlan,
  planByNumber,
} from "../../constants/planTypes";

const DEFAULT_COLOR = "#1e3a8a";

const moduleGroups = [
  { title: "الأساسيات", keys: ["attendance", "grades", "payments"] },
  { title: "المحتوى التعليمي", keys: ["question_bank", "online_exams", "study_notes"] },
  { title: "المالية والتقارير", keys: ["accounting", "center_reports"] },
  { title: "التواصل والبوابات", keys: ["whatsapp", "student_portal", "parent_portal"] },
];

const moduleNames = {
  attendance: "الحضور والغياب",
  grades: "الدرجات",
  question_bank: "بنك الأسئلة",
  online_exams: "الاختبارات الإلكترونية",
  study_notes: "المذكرات",
  payments: "المدفوعات",
  accounting: "الحسابات والمصروفات",
  center_reports: "تقارير المركز",
  whatsapp: "إشعارات واتساب",
  student_portal: "بوابة الطالب",
  parent_portal: "بوابة ولي الأمر",
};

const allModules = Object.keys(moduleNames);

// Mirrors ModuleCatalog.Requirements on the server: enabling a key auto-enables
// its prerequisites (transitively).
const moduleRequires = {
  online_exams: ["question_bank"],
  parent_portal: ["attendance", "payments"],
};

const modulePresets = [
  { key: "attendance_only", name: "حضور فقط", modules: ["attendance"] },
  {
    key: "medium",
    name: "متوسط",
    modules: [
      "attendance", "grades", "question_bank", "study_notes",
      "payments", "accounting", "center_reports", "student_portal",
    ],
  },
  { key: "full", name: "كامل", modules: allModules },
];

const subscriptionTypes = SELECTABLE_PLAN_TYPES;

const DEFAULT_TRIAL_DAYS = 3;

const today = () => new Date().toISOString().slice(0, 10);

const addMonths = (dateStr, months) => {
  const date = new Date(`${dateStr}T00:00:00`);
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 10);
};

// Trial end = start + (days - 1): the end date is the LAST allowed day, matching
// CenterSubscriptionEvaluator (today <= endDate => Active).
const addTrialDays = (dateStr, days) => {
  const date = new Date(`${dateStr}T00:00:00`);
  date.setDate(date.getDate() + (days - 1));
  return date.toISOString().slice(0, 10);
};

// End date preview for the create form given the selected plan.
const computeEnd = (dateStr, plan) => {
  if (!dateStr) return "";
  if (plan?.isTrial) return addTrialDays(dateStr, DEFAULT_TRIAL_DAYS);
  if (plan?.months == null) return ""; // Lifetime
  return addMonths(dateStr, plan.months);
};

const closureToEnable = (keys) => {
  const set = new Set(keys);
  const queue = [...keys];
  while (queue.length) {
    const current = queue.shift();
    for (const dependency of moduleRequires[current] ?? []) {
      if (!set.has(dependency)) {
        set.add(dependency);
        queue.push(dependency);
      }
    }
  }
  return set;
};

const makeInitialForm = (accountType) => ({
  accountType,
  ownerFullName: "",
  ownerPhone: "",
  ownerPassword: "",
  // Required when accountType === "Teacher" (a solo teacher's subject).
  subject: "",
  centerName: "",
  centerPhone: "",
  centerAddress: "",
  centerDescription: "",
  themeColor: DEFAULT_COLOR,
  subscriptionType: 4,
  subscriptionStart: today(),
  subscriptionEnd: addMonths(today(), 12),
  price: "",
  paidAmount: "",
  currency: "EGP",
  graceDays: 3,
  subscriptionNotes: "",
  enabledModules: [...allModules],
});

export default function AddTeacherModal({
  isOpen,
  onClose,
  onSubmit,
  presetAccountType = "CenterOwner",
  lockAccountType = false,
}) {
  const [formData, setFormData] = useState(() => makeInitialForm(presetAccountType));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData(makeInitialForm(presetAccountType));
    }
  }, [isOpen, presetAccountType]);

  if (!isOpen) return null;

  const setField = (key, value) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  const isLifetime = !isTrialPlan(formData.subscriptionType) && planByNumber(formData.subscriptionType)?.months == null;

  const handleTypeChange = (value) => {
    const option = planByNumber(value);
    setFormData((prev) => ({
      ...prev,
      subscriptionType: value,
      subscriptionEnd: computeEnd(prev.subscriptionStart || today(), option),
    }));
  };

  const handleStartChange = (value) => {
    const option = planByNumber(formData.subscriptionType);
    setFormData((prev) => ({
      ...prev,
      subscriptionStart: value,
      subscriptionEnd: computeEnd(value, option),
    }));
  };

  const toggleModule = (key) => {
    setFormData((prev) => {
      const has = prev.enabledModules.includes(key);
      const next = has
        ? prev.enabledModules.filter((k) => k !== key)
        : [...prev.enabledModules, key];
      return { ...prev, enabledModules: next };
    });
  };

  const applyPreset = (preset) => {
    setFormData((prev) => ({ ...prev, enabledModules: [...preset.modules] }));
  };

  const effectiveModules = closureToEnable(formData.enabledModules);
  const autoEnabledKeys = [...effectiveModules].filter(
    (key) => !formData.enabledModules.includes(key),
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.ownerFullName.trim()) {
      toast.error("يرجى إدخال اسم المدرس!");
      return;
    }
    if (!formData.ownerPhone.trim() || !/^01[0-2,5]\d{8}$/.test(formData.ownerPhone.trim())) {
      toast.error("رقم هاتف المدرس غير صحيح (11 رقم يبدأ بـ 010/011/012/015)");
      return;
    }
    if (
      formData.ownerPassword.trim() &&
      formData.ownerPassword.trim().length < 6
    ) {
      toast.error("كلمة المرور يجب ألا تقل عن 6 أحرف");
      return;
    }
    if (formData.accountType === "Teacher" && !formData.subject.trim()) {
      toast.error("يرجى إدخال المادة التي يدرّسها المدرس!");
      return;
    }
    if (!formData.centerName.trim()) {
      toast.error("يرجى إدخال اسم المركز!");
      return;
    }
    if (
      !isLifetime &&
      formData.subscriptionStart &&
      formData.subscriptionEnd &&
      formData.subscriptionEnd <= formData.subscriptionStart
    ) {
      toast.error("تاريخ نهاية الاشتراك يجب أن يكون بعد تاريخ البداية");
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        accountType: formData.accountType,
        ownerFullName: formData.ownerFullName.trim(),
        ownerPhone: formData.ownerPhone.trim(),
        ownerPassword: formData.ownerPassword.trim() || null,
        // Only meaningful for a solo teacher account.
        subject:
          formData.accountType === "Teacher" ? formData.subject.trim() : null,
        centerName: formData.centerName.trim(),
        centerPhone: formData.centerPhone.trim() || null,
        centerAddress: formData.centerAddress.trim() || null,
        centerDescription: formData.centerDescription.trim() || null,
        themeColor: formData.themeColor || null,
        subscriptionType: formData.subscriptionType,
        subscriptionStart: formData.subscriptionStart
          ? new Date(`${formData.subscriptionStart}T00:00:00`).toISOString()
          : null,
        subscriptionEnd:
          isLifetime || !formData.subscriptionEnd
            ? null
            : new Date(`${formData.subscriptionEnd}T00:00:00`).toISOString(),
        price: Number(formData.price) || 0,
        paidAmount: Number(formData.paidAmount) || 0,
        currency: formData.currency.trim() || "EGP",
        graceDays: Number(formData.graceDays) || 0,
        subscriptionNotes: formData.subscriptionNotes.trim() || null,
        enabledModules: [...effectiveModules],
      });
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full p-2.5 rounded-xl border border-surface-border bg-surface-muted text-text-main focus:outline-none focus:border-primary";
  const labelClass = "block text-sm font-medium mb-1 text-text-main";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="flex w-full max-w-2xl max-h-[90vh] flex-col rounded-2xl border border-surface-border bg-surface-card shadow-2xl">
        <div className="shrink-0 flex items-center justify-between border-b border-surface-border p-6">
          <div>
            <h2 className="text-xl font-extrabold text-text-main">
              إضافة مدرس جديد
            </h2>
            <p className="mt-1 text-xs text-text-muted">
              يتم إنشاء حساب المدرس والمركز الخاص به معًا.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-main"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="flex-1 overflow-y-auto p-6 space-y-4"
        >
          <h3 className="text-sm font-bold text-primary">بيانات الحساب</h3>
          <div>
            <label className={labelClass}>نوع الحساب *</label>
            <select
              className={inputClass}
              value={formData.accountType}
              disabled={lockAccountType}
              onChange={(e) => setField("accountType", e.target.value)}
            >
              <option value="CenterOwner">
                صاحب مركز (يمكنه إضافة مدرسين ومساعدين)
              </option>
              <option value="Teacher">مدرس مستقل (حساب فردي)</option>
            </select>
            <p className="mt-1 text-xs text-text-muted">
              {formData.accountType === "Teacher"
                ? "سيتم إنشاء مركز فردي للمدرس مع صلاحيات إدارية كاملة لمركزه."
                : "سيتم إنشاء حساب صاحب مركز بإدارة كاملة للمركز."}
            </p>
          </div>
          <div>
            <label className={labelClass}>اسم المدرس *</label>
            <input
              type="text"
              className={inputClass}
              value={formData.ownerFullName}
              onChange={(e) => setField("ownerFullName", e.target.value)}
            />
          </div>
          {formData.accountType === "Teacher" && (
            <div>
              <label className={labelClass}>المادة الدراسية *</label>
              <input
                type="text"
                placeholder="مثال: الرياضيات"
                className={inputClass}
                value={formData.subject}
                onChange={(e) => setField("subject", e.target.value)}
              />
              <p className="mt-1 text-xs text-text-muted">
                تُعرض المادة في تقارير السنتر بدلًا من اسم المدرس.
              </p>
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>رقم الهاتف (اسم الدخول) *</label>
              <input
                type="text"
                dir="ltr"
                placeholder="01012345678"
                className={inputClass}
                value={formData.ownerPhone}
                onChange={(e) => setField("ownerPhone", e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>
                كلمة المرور (اختياري)
              </label>
              <input
                type="text"
                dir="ltr"
                placeholder="اتركها فارغة لتوليد كلمة مؤقتة"
                className={inputClass}
                value={formData.ownerPassword}
                onChange={(e) => setField("ownerPassword", e.target.value)}
              />
            </div>
          </div>

          <h3 className="pt-2 text-sm font-bold text-primary">بيانات المركز</h3>
          <div>
            <label className={labelClass}>اسم المركز *</label>
            <input
              type="text"
              className={inputClass}
              value={formData.centerName}
              onChange={(e) => setField("centerName", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>هاتف المركز</label>
              <input
                type="text"
                dir="ltr"
                className={inputClass}
                value={formData.centerPhone}
                onChange={(e) => setField("centerPhone", e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>لون الهوية</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  className="h-11 w-14 cursor-pointer rounded-lg border border-surface-border bg-surface-muted"
                  value={formData.themeColor}
                  onChange={(e) => setField("themeColor", e.target.value)}
                />
                <input
                  type="text"
                  dir="ltr"
                  className={inputClass}
                  value={formData.themeColor}
                  onChange={(e) => setField("themeColor", e.target.value)}
                />
              </div>
            </div>
          </div>
          <div>
            <label className={labelClass}>العنوان</label>
            <input
              type="text"
              className={inputClass}
              value={formData.centerAddress}
              onChange={(e) => setField("centerAddress", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>وصف</label>
            <textarea
              rows={2}
              className={inputClass}
              value={formData.centerDescription}
              onChange={(e) => setField("centerDescription", e.target.value)}
            />
          </div>

          <h3 className="pt-2 text-sm font-bold text-primary">الاشتراك</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>نوع الاشتراك</label>
              <select
                className={inputClass}
                value={formData.subscriptionType}
                onChange={(e) => handleTypeChange(Number(e.target.value))}
              >
                {subscriptionTypes.map((t) => (
                  <option key={t.number} value={t.number}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>العملة</label>
              <input
                dir="ltr"
                className={inputClass}
                value={formData.currency}
                onChange={(e) => setField("currency", e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>تاريخ البداية</label>
              <input
                type="date"
                dir="ltr"
                className={inputClass}
                value={formData.subscriptionStart}
                onChange={(e) => handleStartChange(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>تاريخ النهاية (تلقائي)</label>
              <input
                type="date"
                dir="ltr"
                disabled={isLifetime}
                className={inputClass}
                value={isLifetime ? "" : formData.subscriptionEnd}
                onChange={(e) => setField("subscriptionEnd", e.target.value)}
              />
              {isLifetime && (
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
                value={formData.price}
                onChange={(e) => setField("price", e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>المدفوع</label>
              <input
                type="number"
                dir="ltr"
                min="0"
                className={inputClass}
                value={formData.paidAmount}
                onChange={(e) => setField("paidAmount", e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>أيام السماح بعد الانتهاء</label>
              <input
                type="number"
                dir="ltr"
                min="0"
                className={inputClass}
                value={formData.graceDays}
                onChange={(e) => setField("graceDays", e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>ملاحظات الاشتراك</label>
              <input
                className={inputClass}
                value={formData.subscriptionNotes}
                onChange={(e) => setField("subscriptionNotes", e.target.value)}
              />
            </div>
          </div>

          <div className="pt-2">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-primary">الوحدات المفعّلة</h3>
              <div className="flex flex-wrap items-center gap-2">
                {modulePresets.map((preset) => (
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

            {moduleGroups.map((group) => (
              <div key={group.title} className="mb-3">
                <p className="mb-1 text-xs font-bold text-text-muted">{group.title}</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {group.keys.map((key) => (
                    <div key={key}>
                      <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-surface-border bg-surface-muted px-3 py-2 text-sm text-text-main">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-primary"
                          checked={formData.enabledModules.includes(key)}
                          onChange={() => toggleModule(key)}
                        />
                        {moduleNames[key]}
                      </label>
                      {key === "whatsapp" && (
                        <p className="mt-1 text-[10px] text-text-muted">
                          يخفي أزرار الواتساب فقط.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {autoEnabledKeys.length > 0 && (
              <p className="text-xs text-primary">
                سيتم تفعيلها تلقائياً:{" "}
                {autoEnabledKeys.map((key) => moduleNames[key] ?? key).join("، ")}
              </p>
            )}
          </div>

          <div className="sticky bottom-0 shrink-0 flex gap-3 border-t border-surface-border bg-surface-card pt-4">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-2.5 rounded-xl border border-surface-border text-text-muted hover:bg-surface-muted font-bold transition-all"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="w-1/2 py-2.5 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-all disabled:opacity-60"
            >
              {saving ? "جارٍ الإنشاء..." : "إنشاء الحساب والمركز"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
