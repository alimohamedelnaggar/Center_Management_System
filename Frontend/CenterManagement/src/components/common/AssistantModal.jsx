import { X } from "@/components/icons";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import { teacherService } from "../../services/teacherService";
import { useAuth } from "../../context/useAuth";

export default function AssistantModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) {
  const { isSoloCenter, centerTypeLoaded } = useAuth();
  // In a solo center an assistant always belongs to the whole center, so the
  // teacher picker is hidden and the link is stored as null.
  const showTeacherField = !isSoloCenter;
  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
    salary: 0,
    hireDate: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [teacherId, setTeacherId] = useState("");
  const [teachers, setTeachers] = useState([]);
  const [teachersLoading, setTeachersLoading] = useState(false);

  useEffect(() => {
    (() => {
      if (initialData) {
        setFormData({
          fullName: initialData.fullName || "",
          phoneNumber: initialData.phoneNumber || "",
          password: "",
          confirmPassword: "",
          salary: initialData.salary || 0,
          hireDate:
            initialData.hireDate || new Date().toISOString().split("T")[0],
          notes: initialData.notes || "",
        });
        setTeacherId(initialData.teacherId || "");
      } else {
        setFormData({
          fullName: "",
          phoneNumber: "",
          password: "",
          confirmPassword: "",
          salary: 0,
          hireDate: new Date().toISOString().split("T")[0],
          address: "",
          notes: "",
        });
        setTeacherId("");
      }
    })();
  }, [initialData, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    // Solo centers never show the picker, so there is no reason to load teachers.
    if (!centerTypeLoaded || isSoloCenter) {
      setTeachersLoading(false);
      setTeachers([]);
      return undefined;
    }

    let active = true;

    (async () => {
      try {
        setTeachersLoading(true);
        const res = await teacherService.getPaginated(1, 200, "");
        const list = res?.items || res?.data?.items || [];
        if (active) setTeachers(list);
      } catch {
        if (active) setTeachers([]);
      } finally {
        if (active) setTeachersLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [isOpen, centerTypeLoaded, isSoloCenter]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.fullName.trim()) {
      toast.error("يرجى إدخال الاسم الكامل!");
      return;
    }

    if (!formData.phoneNumber.trim()) {
      toast.error("يرجى إدخال رقم الهاتف!");
      return;
    }

    if (!initialData) {
      if (!formData.password || !formData.confirmPassword) {
        toast.error("يرجى إدخال وتأكيد كلمة المرور!");
        return;
      }

      if (formData.password.length < 6) {
        toast.error("كلمة المرور يجب أن تكون على الأقل 6 أحرف!");
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        toast.error("كلمتا المرور غير متطابقتين!");
        return;
      }
    }

    if (initialData) {
      onSubmit({
        ...formData,
        id: initialData.id,
        // Solo centers link the assistant to the whole center (null).
        teacherId: showTeacherField ? teacherId || null : null,
        // Preserve fields that are stored but not edited from this form,
        // so an edit does not deactivate or wipe them.
        isActive: initialData.isActive ?? true,
        nationalId: initialData.nationalId ?? null,
        address: initialData.address ?? null,
        workingHoursPerWeek: initialData.workingHoursPerWeek ?? null,
      });
    } else {
      onSubmit({
        ...formData,
        teacherId: showTeacherField ? teacherId || null : null,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="flex w-full max-w-lg max-h-[90vh] flex-col rounded-2xl border border-surface-border bg-surface-card shadow-2xl">
        <div className="shrink-0 flex items-center justify-between border-b border-surface-border p-6">
          <h2 className="text-xl font-extrabold text-text-main">
            {initialData ? "تعديل بيانات المساعد" : "إضافة مساعد جديد"}
          </h2>
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
          <div>
            <label className="block text-sm font-medium mb-1 text-text-main">
              الاسم الكامل *
            </label>
            <input
              type="text"
              className="w-full p-2.5 rounded-xl border border-surface-border bg-surface-muted text-text-main focus:outline-none focus:border-primary"
              value={formData.fullName}
              onChange={(e) =>
                setFormData({ ...formData, fullName: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-text-main">
              رقم الهاتف (مستخدم للتسجيل) *
            </label>
            <input
              type="text"
              placeholder="01012345678"
              className="w-full p-2.5 rounded-xl border border-surface-border bg-surface-muted text-text-main focus:outline-none focus:border-primary"
              value={formData.phoneNumber}
              onChange={(e) =>
                setFormData({ ...formData, phoneNumber: e.target.value })
              }
            />
          </div>

          {showTeacherField && (
            <div>
              <label className="block text-sm font-medium mb-1 text-text-main">
                الأستاذ المرتبط (اختياري)
              </label>
              <select
                className="w-full p-2.5 rounded-xl border border-surface-border bg-surface-muted text-text-main focus:outline-none focus:border-primary"
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
              >
                <option value="">بدون (على مستوى المركز)</option>
                {teachersLoading ? (
                  <option disabled>جارٍ تحميل المدرسين...</option>
                ) : (
                  teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.fullName}
                      {teacher.subject ? ` - ${teacher.subject}` : ""}
                    </option>
                  ))
                )}
              </select>
            </div>
          )}

          {!initialData && (
          <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-text-main">
                  كلمة المرور *
                </label>
                <input
                  type="password"
                  placeholder="٦ أحرف على الأقل"
                  className="w-full p-2.5 rounded-xl border border-surface-border bg-surface-muted text-text-main focus:outline-none focus:border-primary"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-text-main">
                  تأكيد كلمة المرور *
                </label>
                <input
                  type="password"
                  placeholder="٦ أحرف على الأقل"
                  className="w-full p-2.5 rounded-xl border border-surface-border bg-surface-muted text-text-main focus:outline-none focus:border-primary"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      confirmPassword: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-text-main">
                المرتب (ج.م)
              </label>
              <input
                type="number"
                className="w-full p-2.5 rounded-xl border border-surface-border bg-surface-muted text-text-main focus:outline-none focus:border-primary"
                value={formData.salary}
                onChange={(e) =>
                  setFormData({ ...formData, salary: Number(e.target.value) })
                }
              />
            </div>
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
              className="w-1/2 py-2.5 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-all"
            >
              حفظ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
