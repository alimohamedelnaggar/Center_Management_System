import {
  User,
  Phone,
  Users,
  CreditCard,
  UserPlus,
  Edit3,
  Loader2,
} from "@/components/icons";
import AppModal from "../../components/ui/AppModal";

const fieldClass = (hasError) =>
  `focus-ring w-full rounded-control border bg-surface-bg px-3.5 py-3 text-sm text-text-main transition-colors placeholder:text-text-muted ${
    hasError
      ? "border-status-danger"
      : "border-surface-border hover:border-primary/40"
  }`;

export default function AddStudentModal({
  open,
  onClose,
  form,
  setForm,
  onSubmit,
  groups = [],
  errors = {},
  mode = "add", // add | edit
  loading = false,
}) {
  const isAdd = mode === "add";

  const footer = (
    <div className="flex items-center gap-3">
      <button
        type="button"
        data-testid="student-form-cancel"
        onClick={onClose}
        disabled={loading}
        className="focus-ring inline-flex min-h-11 items-center justify-center rounded-action border border-surface-border px-5 text-sm font-bold text-text-muted transition-colors hover:bg-surface-muted hover:text-text-main disabled:opacity-50"
      >
        إلغاء
      </button>

      <button
        type="submit"
        form="student-form"
        data-testid="student-form-submit"
        disabled={loading}
        className="focus-ring inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-action bg-primary px-5 text-sm font-bold text-text-inverse shadow-sm transition-colors hover:bg-primary-hover disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span>{isAdd ? "جاري الإضافة..." : "جاري الحفظ..."}</span>
          </>
        ) : isAdd ? (
          "إضافة الطالب"
        ) : (
          "حفظ التعديلات"
        )}
      </button>
    </div>
  );

  return (
    <AppModal
      open={open}
      onClose={onClose}
      busy={loading}
      testId="student-form-modal"
      title={isAdd ? "إضافة طالب جديد" : "تعديل بيانات الطالب"}
      icon={isAdd ? UserPlus : Edit3}
      footer={footer}
    >
      <form
        id="student-form"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        className="space-y-4"
        noValidate
      >
        <div className="rounded-card border border-surface-border bg-surface-muted/40 p-4">
          <label
            htmlFor="student-fullName"
            className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-text-muted"
          >
            <User className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            اسم الطالب
          </label>
          <input
            id="student-fullName"
            type="text"
            value={form.fullName || ""}
            onChange={(event) =>
              setForm({ ...form, fullName: event.target.value })
            }
            placeholder="أدخل اسم الطالب رباعي..."
            aria-invalid={Boolean(errors.fullName)}
            className={fieldClass(errors.fullName)}
          />
          {errors.fullName && (
            <p className="mt-1 text-xs font-semibold text-status-danger">
              {errors.fullName}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-card border border-surface-border bg-surface-muted/40 p-4">
            <label
              htmlFor="student-phone"
              className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-text-muted"
            >
              <Phone className="h-3.5 w-3.5" aria-hidden="true" />
              رقم الهاتف
            </label>
            <input
              id="student-phone"
              type="tel"
              inputMode="tel"
              dir="ltr"
              value={form.phone || ""}
              onChange={(event) =>
                setForm({ ...form, phone: event.target.value })
              }
              placeholder="01xxxxxxxxx"
              aria-invalid={Boolean(errors.phone)}
              className={`${fieldClass(errors.phone)} text-start`}
            />
            {errors.phone && (
              <p className="mt-1 text-xs font-semibold text-status-danger">
                {errors.phone}
              </p>
            )}
          </div>

          <div className="rounded-card border border-surface-border bg-surface-muted/40 p-4">
            <label
              htmlFor="student-parent-phone"
              className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-text-muted"
            >
              <Phone className="h-3.5 w-3.5" aria-hidden="true" />
              هاتف ولي الأمر
            </label>
            <input
              id="student-parent-phone"
              type="tel"
              inputMode="tel"
              dir="ltr"
              value={form.phoneParent || ""}
              onChange={(event) =>
                setForm({ ...form, phoneParent: event.target.value })
              }
              placeholder="01xxxxxxxxx"
              aria-invalid={Boolean(errors.phoneParent)}
              className={`${fieldClass(errors.phoneParent)} text-start`}
            />
            {errors.phoneParent && (
              <p className="mt-1 text-xs font-semibold text-status-danger">
                {errors.phoneParent}
              </p>
            )}
          </div>
        </div>

        <div className="rounded-card border border-surface-border bg-surface-muted/40 p-4">
          <label
            htmlFor="student-group"
            className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-text-muted"
          >
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            المجموعة
          </label>
          <select
            id="student-group"
            value={form.groupId || ""}
            onChange={(event) =>
              setForm({ ...form, groupId: event.target.value })
            }
            aria-invalid={Boolean(errors.groupId)}
            className={fieldClass(errors.groupId)}
          >
            <option value="">-- اختر المجموعة --</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
          {errors.groupId && (
            <p className="mt-1 text-xs font-semibold text-status-danger">
              {errors.groupId}
            </p>
          )}
        </div>

        <fieldset className="rounded-card border border-surface-border bg-surface-muted/40 p-4">
          <legend className="flex items-center gap-1.5 px-1 text-xs font-bold text-text-muted">
            <CreditCard className="h-3.5 w-3.5" aria-hidden="true" />
            نوع الاشتراك
          </legend>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1">
            {[
              { value: 1, label: "بالحصة" },
              { value: 2, label: "شهري" },
            ].map((option) => (
              <label
                key={option.value}
                className="flex min-h-11 cursor-pointer items-center gap-2 text-xs font-bold text-text-main"
              >
                <input
                  type="radio"
                  name="subscriptionType"
                  value={option.value}
                  checked={Number(form.subscriptionType) === option.value}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      subscriptionType: Number(event.target.value),
                    })
                  }
                  className="h-4 w-4 accent-primary"
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>

          {errors.subscriptionType && (
            <p className="mt-1 text-xs font-semibold text-status-danger">
              {errors.subscriptionType}
            </p>
          )}
        </fieldset>

        <div className="rounded-card border border-surface-border bg-surface-muted/40 p-4">
          <label
            htmlFor="student-price"
            className="mb-1.5 block text-xs font-bold text-text-muted"
          >
            سعر مخصص للطالب (اختياري — للخصومات)
          </label>
          <input
            id="student-price"
            type="number"
            min="0"
            value={form.customMonthlyPrice || ""}
            onChange={(event) =>
              setForm({ ...form, customMonthlyPrice: event.target.value })
            }
            placeholder="اتركه فارغًا لاستخدام سعر المجموعة الافتراضي"
            className={fieldClass(false)}
          />
          <p className="mt-1 text-[11px] leading-relaxed text-text-muted">
            استخدمه لو الطالب عنده خصم أو اتفاق خاص (زي الإخوة أو الحالات
            الصعبة)
          </p>
        </div>
      </form>
    </AppModal>
  );
}
