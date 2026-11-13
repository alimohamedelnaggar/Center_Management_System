import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { UserRound } from "@/components/icons";

import AdminModal from "../ui/AdminModal";
import Button from "../ui/Button";
import { fieldBaseClass } from "../ui/Input";
import { teacherService } from "../../services/teacherService";
import { useAuth } from "../../context/useAuth";
import {
  STAFF_EMAIL_HELPER_TEXT,
  validateStaffEmail,
} from "../../utils/staffEmail";

const inputClass = fieldBaseClass;
const labelClass = "mb-1.5 block text-sm font-medium text-text-main";

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
    email: "",
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
          email: initialData.email || "",
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
          email: "",
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

    const email = validateStaffEmail(formData.email);
    if (!email.valid) {
      toast.error(email.message);
      return;
    }

    if (
      initialData?.email &&
      !email.value &&
      !window.confirm(
        "سيتم حذف البريد الإلكتروني لهذا الحساب، ولن يستطيع صاحب الحساب استعادة كلمة المرور بنفسه. هل تريد المتابعة؟",
      )
    ) {
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
        email: email.value ?? "",
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
        email: email.value ?? "",
        teacherId: showTeacherField ? teacherId || null : null,
      });
    }
  };

  return (
    <AdminModal
      open={isOpen}
      onClose={onClose}
      title={initialData ? "تعديل بيانات المساعد" : "إضافة مساعد جديد"}
      subtitle="بيانات الحساب والمرتب."
      icon={UserRound}
      testId="assistant-modal"
      formProps={{ onSubmit: handleSubmit, noValidate: true }}
      footer={
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            إلغاء
          </Button>
          <Button type="submit" className="flex-1">
            حفظ
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className={labelClass}>الاسم الكامل *</label>
          <input
            type="text"
            className={inputClass}
            value={formData.fullName}
            onChange={(e) =>
              setFormData({ ...formData, fullName: e.target.value })
            }
          />
        </div>
        <div>
          <label className={labelClass}>رقم الهاتف (مستخدم للتسجيل) *</label>
          <input
            type="text"
            dir="ltr"
            placeholder="01012345678"
            className={inputClass}
            value={formData.phoneNumber}
            onChange={(e) =>
              setFormData({ ...formData, phoneNumber: e.target.value })
            }
          />
        </div>

        <div>
          <label className={labelClass}>البريد الإلكتروني (اختياري)</label>
          <input
            type="email"
            dir="ltr"
            placeholder="name@example.com"
            className={inputClass}
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
          />
          <p className="mt-1 text-sm text-text-muted">{STAFF_EMAIL_HELPER_TEXT}</p>
        </div>

        {showTeacherField && (
          <div>
            <label className={labelClass}>الأستاذ المرتبط (اختياري)</label>
            <select
              className={inputClass}
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>كلمة المرور *</label>
              <input
                type="password"
                placeholder="٦ أحرف على الأقل"
                autoComplete="new-password"
                className={inputClass}
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
              />
            </div>
            <div>
              <label className={labelClass}>تأكيد كلمة المرور *</label>
              <input
                type="password"
                placeholder="٦ أحرف على الأقل"
                autoComplete="new-password"
                className={inputClass}
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

        <div>
          <label className={labelClass}>المرتب (ج.م)</label>
          <input
            type="number"
            min="0"
            className={inputClass}
            value={formData.salary}
            onChange={(e) =>
              setFormData({ ...formData, salary: Number(e.target.value) })
            }
          />
        </div>
      </div>
    </AdminModal>
  );
}
