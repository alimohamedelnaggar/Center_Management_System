import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Users } from "@/components/icons";

import AdminModal from "../ui/AdminModal";
import Button from "../ui/Button";
import { fieldBaseClass } from "../ui/Input";
import { groupsService } from "../../services/groupsService";
import {
  STAFF_EMAIL_HELPER_TEXT,
  validateStaffEmail,
} from "../../utils/staffEmail";

const emptyForm = {
  fullName: "",
  phoneNumber: "",
  email: "",
  subject: "",
  password: "",
  confirmPassword: "",
};

const inputClass = fieldBaseClass;
const labelClass = "mb-1.5 block text-sm font-medium text-text-main";

export default function TeacherModal({ isOpen, onClose, onSubmit, initialData }) {
  const [formData, setFormData] = useState(emptyForm);
  const [groups, setGroups] = useState([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupIds, setGroupIds] = useState([]);

  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      setFormData({
        fullName: initialData.fullName || "",
        phoneNumber: initialData.phoneNumber || "",
        email: initialData.email || "",
        subject: initialData.subject || "",
        password: "",
        confirmPassword: "",
      });
      setGroupIds((initialData.groups || []).map((g) => g.id));
    } else {
      setFormData(emptyForm);
      setGroupIds([]);
    }
  }, [initialData, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    let active = true;

    (async () => {
      try {
        setGroupsLoading(true);
        const res = await groupsService.getAllGroups();
        const list = res?.data || res?.items || [];
        if (active) setGroups(list);
      } catch {
        if (active) setGroups([]);
      } finally {
        if (active) setGroupsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleGroup = (id) =>
    setGroupIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.fullName.trim()) {
      toast.error("يرجى إدخال اسم المدرس!");
      return;
    }

    if (!/^01[0-2,5]\d{8}$/.test(formData.phoneNumber.trim())) {
      toast.error("رقم الهاتف غير صحيح (11 رقم يبدأ بـ 010/011/012/015)");
      return;
    }

    if (!formData.subject.trim()) {
      toast.error("يرجى إدخال المادة الدراسية!");
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
      if (!formData.password) {
        toast.error("يرجى إدخال كلمة المرور!");
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

    const payload = {
      fullName: formData.fullName.trim(),
      phoneNumber: formData.phoneNumber.trim(),
      email: email.value ?? "",
      subject: formData.subject?.trim() || null,
      groupIds,
    };

    if (initialData) {
      onSubmit({ ...payload, id: initialData.id });
    } else {
      onSubmit({
        ...payload,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      });
    }
  };

  return (
    <AdminModal
      open={isOpen}
      onClose={onClose}
      title={initialData ? "تعديل بيانات المدرس" : "إضافة مدرس جديد"}
      subtitle="بيانات الحساب والمجموعات المرتبطة به."
      icon={Users}
      testId="teacher-modal"
      formProps={{ onSubmit: handleSubmit, noValidate: true }}
      footer={
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            block
            onClick={onClose}
            className="flex-1"
          >
            إلغاء
          </Button>
          <Button type="submit" block className="flex-1">
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

        <div>
          <label className={labelClass}>المادة الدراسية *</label>
          <input
            type="text"
            placeholder="مثال: رياضيات"
            className={inputClass}
            value={formData.subject}
            onChange={(e) =>
              setFormData({ ...formData, subject: e.target.value })
            }
          />
        </div>

        <div>
          <label className={labelClass}>المجموعات</label>
          {groupsLoading ? (
            <p className="text-sm text-text-muted">جارٍ تحميل المجموعات...</p>
          ) : groups.length === 0 ? (
            <p className="text-sm text-text-muted">
              لا توجد مجموعات متاحة لهذا المركز
            </p>
          ) : (
            <div className="grid max-h-40 grid-cols-1 gap-1 overflow-y-auto rounded-control border border-surface-border bg-surface-muted p-2 sm:grid-cols-2">
              {groups.map((group) => (
                <label
                  key={group.id}
                  className="flex min-h-11 cursor-pointer items-center gap-2 rounded-control px-2 text-sm text-text-main hover:bg-surface-card"
                >
                  <input
                    type="checkbox"
                    className="accent-primary"
                    checked={groupIds.includes(group.id)}
                    onChange={() => toggleGroup(group.id)}
                  />
                  {group.name}
                </label>
              ))}
            </div>
          )}
        </div>

        {!initialData && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>كلمة المرور *</label>
              <input
                type="password"
                placeholder="6 أحرف على الأقل"
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
                placeholder="6 أحرف على الأقل"
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
      </div>
    </AdminModal>
  );
}
