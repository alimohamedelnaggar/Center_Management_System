import { useState, useEffect, useMemo } from "react";
import { Users, DollarSign, Calendar, Loader2, Save } from "@/components/icons";
import { z } from "zod";
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

  const fieldClass = (hasError) =>
    `w-full px-3.5 py-2.5 rounded-xl border bg-surface-card text-text-main text-xs font-bold focus:outline-none focus:border-primary transition-colors ${
      hasError ? "border-status-danger" : "border-surface-border"
    }`;

  const Err = ({ k }) =>
    errors[k] ? (
      <span className="text-xs text-status-danger font-semibold mt-1 block">{errors[k]}</span>
    ) : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="bg-surface-muted/60 border border-surface-border p-4 sm:p-5 rounded-2xl space-y-4">
        {/* Name + Teacher */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-text-main mb-1.5 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-primary" />
              اسم المجموعة
            </label>
            <input
              type="text"
              placeholder="اسم المجموعة"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clearError("name");
              }}
              className={fieldClass(errors.name)}
            />
            <Err k="name" />
          </div>

          {showTeacherField && (
            <div>
              <label className="text-xs font-bold text-text-main mb-1.5 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-primary" />
                المدرس
              </label>
              <select
                value={teacherId}
                onChange={(e) => {
                  setTeacherId(e.target.value);
                  clearError("teacherId");
                }}
                className={fieldClass(errors.teacherId)}
              >
                <option value="">
                  {loadingTeachers ? "جاري التحميل..." : "-- اختر المدرس --"}
                </option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {teacherLabel(t)}
                  </option>
                ))}
              </select>
              {!loadingTeachers && teachers.length === 0 && (
                <span className="text-xs text-status-warning font-semibold mt-1 block">
                  لا يوجد مدرسين، أضف مدرسًا أولًا من صفحة إدارة المدرسين
                </span>
              )}
              <Err k="teacherId" />
            </div>
          )}
        </div>

        {/* Prices + sessions count */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-bold text-text-main mb-1.5 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-primary" />
              سعر الشهر
            </label>
            <input
              type="number"
              min="0"
              placeholder="300"
              value={monthlyPrice}
              onChange={(e) => {
                setMonthlyPrice(e.target.value);
                clearError("monthlyPrice");
              }}
              className={fieldClass(errors.monthlyPrice)}
            />
            <Err k="monthlyPrice" />
          </div>

          <div>
            <label className="text-xs font-bold text-text-main mb-1.5 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-primary" />
              سعر الحصة
            </label>
            <input
              type="number"
              min="0"
              placeholder="40"
              value={perSessionPrice}
              onChange={(e) => {
                setPerSessionPrice(e.target.value);
                clearError("perSessionPrice");
              }}
              className={fieldClass(errors.perSessionPrice)}
            />
            <Err k="perSessionPrice" />
          </div>

          <div>
            <label className="text-xs font-bold text-text-main mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              عدد الحصص في الشهر
            </label>
            <input
              type="number"
              min="1"
              value={sessionsOverride === "" ? autoSessions || "" : sessionsOverride}
              onChange={(e) => {
                setSessionsOverride(e.target.value);
                clearError("sessionsPerMonth");
              }}
              className={fieldClass(errors.sessionsPerMonth)}
            />
            <span className="text-[11px] text-text-muted mt-1 block">
              يُحسب تلقائيًا (عدد الأيام × 4) ويمكنك تعديله
            </span>
            <Err k="sessionsPerMonth" />
          </div>
        </div>

        {/* Weekdays */}
        <div>
          <label className="text-xs font-bold text-text-main mb-2 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            أيام الحصص
          </label>

          <div className="flex flex-wrap gap-2">
            {DAYS_AR.map((label, dayIndex) => {
              const active = schedule.some((s) => s.dayIndex === dayIndex);
              return (
                <button
                  key={dayIndex}
                  type="button"
                  onClick={() => {
                    toggleDay(dayIndex);
                    clearError("schedule");
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    active
                      ? "bg-primary text-text-inverse border-primary shadow-sm"
                      : "bg-surface-card text-text-muted border-surface-border hover:border-primary"
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
                  className="flex flex-wrap items-center gap-3 bg-surface-card border border-surface-border rounded-xl px-3 py-2"
                >
                  <span className="text-xs font-bold text-text-main w-20">
                    {DAYS_AR[s.dayIndex]}
                  </span>
                  <label className="text-xs text-text-muted flex items-center gap-1.5">
                    من
                    <input
                      type="time"
                      value={s.startTime}
                      onChange={(e) => setTime(s.dayIndex, "startTime", e.target.value)}
                      className="px-2 py-1 rounded-lg border border-surface-border text-xs"
                    />
                  </label>
                  <label className="text-xs text-text-muted flex items-center gap-1.5">
                    إلى
                    <input
                      type="time"
                      value={s.endTime}
                      onChange={(e) => setTime(s.dayIndex, "endTime", e.target.value)}
                      className="px-2 py-1 rounded-lg border border-surface-border text-xs"
                    />
                  </label>
                </div>
              ))}
            </div>
          )}
          <Err k="schedule" />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 sm:flex-none bg-primary hover:bg-primary-hover text-text-inverse px-8 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 disabled:opacity-60 cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <SubmitIcon className="w-4 h-4" />}
            <span>{loading ? "جاري الحفظ..." : submitLabel}</span>
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 border border-surface-border rounded-xl text-xs font-bold text-text-muted hover:bg-surface-muted transition-colors cursor-pointer"
            >
              إلغاء
            </button>
          )}
        </div>
      </div>
    </form>
  );
}