import { useState, useEffect } from "react";
import { Users, DollarSign, Calendar, Save } from "@/components/icons";
import { z } from "zod";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { teacherService } from "../../services/teacherService";
import { useAuth } from "../../context/useAuth";
import toast from "react-hot-toast";

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

const groupSchema = z.object({
  name: z.string().trim().min(1, "اسم المجموعة مطلوب.").max(100, "اسم المجموعة لا يتجاوز 100 حرف."),
  teacherId: z.string().optional(),
  monthlyPrice: z.number({ invalid_type_error: "أدخل سعر الشهر" }).min(0, "سعر الشهر غير صحيح"),
  perSessionPrice: z.number({ invalid_type_error: "أدخل سعر الحصة" }).min(0, "سعر الحصة غير صحيح"),
  sessionsPerMonth: z.number({ invalid_type_error: "أدخل عدد الحصص" }).int().min(1, "عدد الحصص مطلوب"),
  schedule: z
    .array(
      z
        .object({
          dayIndex: z.number().int().min(0).max(6),
          startTime: z.string().regex(TIME_RE, "وقت البداية مطلوب"),
          endTime: z.string().regex(TIME_RE, "وقت النهاية مطلوب"),
        })
        .refine((s) => s.endTime > s.startTime, "وقت النهاية يجب أن يكون بعد البداية")
    )
    .min(1, "اختر يومًا واحدًا على الأقل"),
});

const DAYS_AR = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];

// Normalize any response shape into an array of teachers
const extractList = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  if (Array.isArray(res?.items)) return res.items;
  return [];
};

export default function GroupForm({
  initialData = null,
  onSubmit,
  onCancel,
  submitLabel = "حفظ",
  SubmitIcon = Save,
}) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [monthlyPrice, setMonthlyPrice] = useState(initialData?.monthlyPrice ?? "");
  const [perSessionPrice, setPerSessionPrice] = useState(initialData?.perSessionPrice ?? "");
  const [teacherId, setTeacherId] = useState(initialData?.teacherId ?? "");
  const [schedule, setSchedule] = useState(initialData?.schedule ?? []);
  const [sessionsOverride, setSessionsOverride] = useState(
    initialData?.sessionsPerMonth ?? ""
  );
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [teachers, setTeachers] = useState([]);
  const [loadingTeachers, setLoadingTeachers] = useState(true);

  const { centerTypeLoaded, isSoloCenter } = useAuth();
  // In a solo center the group is always linked to the center's only teacher
  // (resolved server-side); hide the dropdown and skip the teacher query.
  const showTeacherField = !isSoloCenter;

  // Sessions per month: auto = selected days x 4, unless the user edited it
  const autoSessions = schedule.length * 4;
  const sessionsPerMonth = sessionsOverride === "" ? autoSessions : Number(sessionsOverride);

  useEffect(() => {
    // Wait for centerType so a solo center never fires a needless teachers call.
    if (!centerTypeLoaded || isSoloCenter) {
      setLoadingTeachers(false);
      return undefined;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await teacherService.getPaginated(1, 200, "");
        if (!cancelled) setTeachers(extractList(res));
      } catch (err) {
        console.error("Load teachers error:", err);
        if (!cancelled) toast.error("فشل في تحميل قائمة المدرسين");
      } finally {
        if (!cancelled) setLoadingTeachers(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [centerTypeLoaded, isSoloCenter]);

  const teacherLabel = (t) => `${t.fullName}${t.subject ? ` - ${t.subject}` : ""}`;

  const toggleDay = (dayIndex) =>
    setSchedule((prev) =>
      prev.some((s) => s.dayIndex === dayIndex)
        ? prev.filter((s) => s.dayIndex !== dayIndex)
        : [...prev, { dayIndex, startTime: "", endTime: "" }].sort(
            (a, b) => a.dayIndex - b.dayIndex
          )
    );

  const setTime = (dayIndex, key, value) =>
    setSchedule((prev) =>
      prev.map((s) => (s.dayIndex === dayIndex ? { ...s, [key]: value } : s))
    );

  const clearError = (key) => errors[key] && setErrors((p) => ({ ...p, [key]: null }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    const parsed = groupSchema.safeParse({
      name,
      teacherId,
      monthlyPrice: monthlyPrice === "" ? NaN : Number(monthlyPrice),
      perSessionPrice: perSessionPrice === "" ? NaN : Number(perSessionPrice),
      sessionsPerMonth,
      schedule,
    });

    if (!parsed.success) {
      const formatted = {};
      parsed.error.issues.forEach((issue) => {
        const key = issue.path[0];
        if (!formatted[key]) formatted[key] = issue.message;
      });
      setErrors(formatted);
      return;
    }

    // Multi centers must pick a teacher; solo centers link automatically.
    if (showTeacherField && !parsed.data.teacherId) {
      setErrors({ teacherId: "اختر المدرس." });
      return;
    }

    try {
      setLoading(true);
      await onSubmit({
        name: parsed.data.name,
        // Omitted for solo centers so the backend links the center's teacher.
        teacherId: showTeacherField ? parsed.data.teacherId : null,
        monthlyPrice: parsed.data.monthlyPrice,
        perSessionPrice: parsed.data.perSessionPrice,
        sessionsPerMonth: parsed.data.sessionsPerMonth,
        // Structured array. dayOfWeek: 0-6 starting from Saturday (see note)
        schedule: parsed.data.schedule.map((s) => ({
          dayIndex: s.dayIndex,
          startTime: s.startTime,
          endTime: s.endTime,
        })),
      });
    } catch {
      // The caller shows the error message.
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
      noValidate
      data-testid="group-form"
    >
      <div className="space-y-4 rounded-card border border-surface-border bg-surface-muted/50 p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            label="اسم المجموعة"
            htmlFor="group-name"
            error={errors.name}
            required
          >
            <div className="relative">
              <Users
                className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary"
                aria-hidden="true"
              />
              <Input
                id="group-name"
                type="text"
                placeholder="اسم المجموعة"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  clearError("name");
                }}
                className="pe-10"
              />
            </div>
          </FormField>

          {showTeacherField && (
            <FormField
              label="المدرس"
              htmlFor="group-teacher"
              error={errors.teacherId}
              required
              helper={
                !loadingTeachers && teachers.length === 0
                  ? "لا يوجد مدرسون. أضف مدرسًا أولًا من صفحة إدارة المدرسين."
                  : undefined
              }
            >
              <div className="relative">
                <Users
                  className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary"
                  aria-hidden="true"
                />
                <Select
                  id="group-teacher"
                  value={teacherId}
                  onChange={(e) => {
                    setTeacherId(e.target.value);
                    clearError("teacherId");
                  }}
                  className="pe-10"
                >
                  <option value="">
                    {loadingTeachers ? "جارٍ التحميل..." : "-- اختر المدرس --"}
                  </option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {teacherLabel(t)}
                    </option>
                  ))}
                </Select>
              </div>
            </FormField>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <FormField
            label="سعر الشهر"
            htmlFor="group-monthly-price"
            error={errors.monthlyPrice}
            required
            helper="بالجنيه المصري"
          >
            <div className="relative">
              <DollarSign
                className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary"
                aria-hidden="true"
              />
              <Input
                id="group-monthly-price"
                type="number"
                min="0"
                placeholder="300"
                value={monthlyPrice}
                onChange={(e) => {
                  setMonthlyPrice(e.target.value);
                  clearError("monthlyPrice");
                }}
                className="pe-10"
              />
            </div>
          </FormField>

          <FormField
            label="سعر الحصة"
            htmlFor="group-session-price"
            error={errors.perSessionPrice}
            required
            helper="بالجنيه المصري"
          >
            <div className="relative">
              <DollarSign
                className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary"
                aria-hidden="true"
              />
              <Input
                id="group-session-price"
                type="number"
                min="0"
                placeholder="40"
                value={perSessionPrice}
                onChange={(e) => {
                  setPerSessionPrice(e.target.value);
                  clearError("perSessionPrice");
                }}
                className="pe-10"
              />
            </div>
          </FormField>

          <FormField
            label="عدد الحصص في الشهر"
            htmlFor="group-sessions-per-month"
            error={errors.sessionsPerMonth}
            required
            helper="يُحسب تلقائيًا (عدد الأيام × 4) ويمكنك تعديله"
          >
            <div className="relative">
              <Calendar
                className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary"
                aria-hidden="true"
              />
              <Input
                id="group-sessions-per-month"
                type="number"
                min="1"
                value={sessionsOverride === "" ? autoSessions || "" : sessionsOverride}
                onChange={(e) => {
                  setSessionsOverride(e.target.value);
                  clearError("sessionsPerMonth");
                }}
                className="pe-10"
              />
            </div>
          </FormField>
        </div>

        <div>
          <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-text-main">
            <Calendar className="h-4 w-4 text-primary" aria-hidden="true" />
            أيام الحصص
            <span className="text-status-danger" aria-hidden="true">
              *
            </span>
          </p>

          <div className="flex flex-wrap gap-2">
            {DAYS_AR.map((label, dayIndex) => {
              const active = schedule.some((s) => s.dayIndex === dayIndex);
              return (
                <button
                  key={dayIndex}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    toggleDay(dayIndex);
                    clearError("schedule");
                  }}
                  className={`min-h-11 cursor-pointer rounded-control border px-4 py-2 text-xs font-bold transition-all ${
                    active
                      ? "border-primary bg-primary text-text-inverse shadow-soft"
                      : "border-surface-border bg-surface-card text-text-muted hover:border-primary hover:text-text-main"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {schedule.length > 0 && (
            <div className="mt-3 space-y-2">
              {schedule.map((s) => (
                <div
                  key={s.dayIndex}
                  className="flex flex-wrap items-center gap-3 rounded-control border border-surface-border bg-surface-card px-3 py-2"
                >
                  <span className="w-20 text-sm font-bold text-text-main">
                    {DAYS_AR[s.dayIndex]}
                  </span>
                  <label
                    htmlFor={`group-day-${s.dayIndex}-start`}
                    className="flex items-center gap-1.5 text-xs text-text-muted"
                  >
                    من
                    <Input
                      id={`group-day-${s.dayIndex}-start`}
                      type="time"
                      value={s.startTime}
                      onChange={(e) => setTime(s.dayIndex, "startTime", e.target.value)}
                      className="w-32"
                    />
                  </label>
                  <label
                    htmlFor={`group-day-${s.dayIndex}-end`}
                    className="flex items-center gap-1.5 text-xs text-text-muted"
                  >
                    إلى
                    <Input
                      id={`group-day-${s.dayIndex}-end`}
                      type="time"
                      value={s.endTime}
                      onChange={(e) => setTime(s.dayIndex, "endTime", e.target.value)}
                      className="w-32"
                    />
                  </label>
                </div>
              ))}
            </div>
          )}

          {errors.schedule && (
            <p role="alert" className="mt-1 text-sm font-medium text-status-danger">
              {errors.schedule}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-surface-border pt-4">
          <Button type="submit" loading={loading} data-testid="group-form-submit">
            {!loading && <SubmitIcon className="h-4 w-4" aria-hidden="true" />}
            {loading ? "جارٍ الحفظ..." : submitLabel}
          </Button>

          {onCancel && (
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              data-testid="group-form-cancel"
            >
              إلغاء
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
