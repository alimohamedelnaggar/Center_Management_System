import { X } from "@/components/icons";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import { groupsService } from "../../services/groupsService";

const emptyForm = {
  fullName: "",
  phoneNumber: "",
  subject: "",
  password: "",
  confirmPassword: "",
};

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

  const inputClass =
    "w-full p-2.5 rounded-xl border border-surface-border bg-surface-muted text-text-main focus:outline-none focus:border-primary";
  const labelClass = "block text-sm font-medium mb-1 text-text-main";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="flex w-full max-w-lg max-h-[90vh] flex-col rounded-2xl border border-surface-border bg-surface-card shadow-2xl">
        <div className="shrink-0 flex items-center justify-between border-b border-surface-border p-6">
          <h2 className="text-xl font-extrabold text-text-main">
            {initialData ? "تعديل بيانات المدرس" : "إضافة مدرس جديد"}
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
              <div className="grid max-h-40 grid-cols-1 gap-1 overflow-y-auto rounded-xl border border-surface-border bg-surface-muted p-2 sm:grid-cols-2">
                {groups.map((group) => (
                  <label
                    key={group.id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg p-1.5 text-sm text-text-main hover:bg-surface-card"
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
