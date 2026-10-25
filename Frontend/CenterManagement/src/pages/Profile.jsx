import { useEffect, useState } from "react";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Save,
  BookOpen,
} from "@/components/icons";
import { useAuth } from "../context/useAuth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function Profile() {
  const {
    accessToken,
    loading: authLoading,
    role,
    refreshModules,
  } = useAuth();

  const isTeacher = role === "Teacher";

  const [profile, setProfile] = useState(null);

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [changingPassword, setChangingPassword] = useState(false);
  const [savingSubject, setSavingSubject] = useState(false);
  const [subjectValue, setSubjectValue] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [message, setMessage] = useState({
    type: "",
    text: "",
  });

  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({});

  // =========================
  // Get Profile
  // =========================

  useEffect(() => {
    if (!authLoading && accessToken) {
      fetchProfile();
    }
  }, [authLoading, accessToken]);

  const fetchProfile = async () => {
    try {
      setLoadingProfile(true);

      const response = await fetch(
        `${API_BASE_URL}/Profile/GetMyProfile`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.message ||
            "فشل تحميل بيانات الحساب."
        );
      }

      setProfile(result.data);
      setSubjectValue(result.data?.subject ?? "");
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error.message ||
          "فشل تحميل بيانات الحساب.",
      });
    } finally {
      setLoadingProfile(false);
    }
  };

  // =========================
  // Password Form
  // =========================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));

    setMessage({
      type: "",
      text: "",
    });
  };

  // =========================
  // Validation
  // =========================

  const validate = () => {
    const newErrors = {};

    if (!form.currentPassword.trim()) {
      newErrors.currentPassword =
        "كلمة المرور الحالية مطلوبة";
    }

    if (!form.newPassword.trim()) {
      newErrors.newPassword =
        "كلمة المرور الجديدة مطلوبة";
    } else if (form.newPassword.length < 8) {
      newErrors.newPassword =
        "كلمة المرور يجب أن تكون 8 أحرف على الأقل";
    }

    if (!form.confirmPassword.trim()) {
      newErrors.confirmPassword =
        "تأكيد كلمة المرور مطلوب";
    } else if (
      form.confirmPassword !== form.newPassword
    ) {
      newErrors.confirmPassword =
        "كلمتا المرور غير متطابقتين";
    }

    if (
      form.currentPassword &&
      form.newPassword &&
      form.currentPassword === form.newPassword
    ) {
      newErrors.newPassword =
        "كلمة المرور الجديدة يجب أن تكون مختلفة عن الحالية";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  // =========================
  // Change Password
  // =========================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage({
      type: "",
      text: "",
    });

    if (!validate()) {
      return;
    }

    try {
      setChangingPassword(true);

      const response = await fetch(
        `${API_BASE_URL}/Profile/ChangePassword`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            currentPassword: form.currentPassword,
            newPassword: form.newPassword,
            confirmPassword: form.confirmPassword,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.message ||
            result?.errors?.[0] ||
            "فشل تغيير كلمة المرور"
        );
      }

      setMessage({
        type: "success",
        text:
          result?.message ||
          "تم تغيير كلمة المرور بنجاح",
      });

      setForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      setErrors({});
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error.message ||
          "حدث خطأ أثناء تغيير كلمة المرور",
      });
    } finally {
      setChangingPassword(false);
    }
  };

  // =========================
  // Save Subject
  // =========================

  const handleSaveSubject = async (e) => {
    e.preventDefault();

    setMessage({ type: "", text: "" });

    const trimmed = subjectValue.trim();

    if (!trimmed) {
      setMessage({
        type: "error",
        text: "يرجى إدخال المادة الدراسية!",
      });
      return;
    }

    try {
      setSavingSubject(true);

      const response = await fetch(
        `${API_BASE_URL}/Profile/EditMyProfile`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ subject: trimmed }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.message ||
            result?.errors?.[0] ||
            "فشل حفظ المادة الدراسية"
        );
      }

      setProfile((prev) => ({ ...prev, subject: trimmed }));
      setSubjectValue(trimmed);

      // Keep the shared auth snapshot in sync so other screens (e.g. the
      // reports page) stop showing the "missing subject" prompt.
      if (refreshModules) {
        await refreshModules();
      }

      setMessage({
        type: "success",
        text: result?.message || "تم تحديث المادة الدراسية بنجاح",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error.message ||
          "حدث خطأ أثناء حفظ المادة الدراسية",
      });
    } finally {
      setSavingSubject(false);
    }
  };

  // =========================
  // Loading
  // =========================

  if (authLoading || loadingProfile) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
      </div>
    );
  }

  // =========================
  // UI
  // =========================

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-slate-50 p-4 pb-24 md:p-6 md:pb-28 lg:p-8"
    >
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800 md:text-3xl">
            الملف الشخصي
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            إدارة بيانات حسابك وكلمة المرور
          </p>
        </div>

        {/* Messages */}
        {message.text && (
          <div
            className={`mb-6 flex items-center gap-3 rounded-xl border p-4 ${
              message.type === "success"
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 size={22} />
            ) : (
              <AlertCircle size={22} />
            )}

            <span>{message.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* ========================= */}
          {/* Account Information */}
          {/* ========================= */}

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-2">

            {/* Header */}
            <div className="border-b border-slate-100 p-6">
              <div className="flex items-center gap-4">

                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                  <User size={28} />
                </div>

                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    بيانات الحساب
                  </h2>

                  <p className="text-sm text-slate-500">
                    معلومات حسابك الشخصية
                  </p>
                </div>

              </div>
            </div>

            {/* Information */}
            <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">

              <InfoItem
                icon={<User size={19} />}
                label="الاسم بالكامل"
                value={profile?.fullName}
              />

              <InfoItem
                icon={<Mail size={19} />}
                label="البريد الإلكتروني"
                value={profile?.email}
              />

              <InfoItem
                icon={<Phone size={19} />}
                label="رقم الهاتف"
                value={profile?.phoneNumber}
              />

              <InfoItem
                icon={<User size={19} />}
                label="اسم المستخدم"
                value={profile?.userName}
              />

              <InfoItem
                icon={<MapPin size={19} />}
                label="العنوان"
                value={profile?.address}
              />

              <InfoItem
                icon={<Calendar size={19} />}
                label="تاريخ إنشاء الحساب"
                value={
                  profile?.createdAt
                    ? new Date(
                        profile.createdAt
                      ).toLocaleDateString("ar-EG")
                    : "-"
                }
              />

            </div>
          </div>

          {/* ========================= */}
          {/* Subject (teachers only) */}
          {/* ========================= */}

          {isTeacher && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-3">
              <div className="border-b border-slate-100 p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
                    <BookOpen size={28} />
                  </div>

                  <div>
                    <h2 className="text-xl font-bold text-slate-800">
                      المادة الدراسية
                    </h2>

                    <p className="text-sm text-slate-500">
                      المادة التي تدرّسها داخل السنتر
                    </p>
                  </div>
                </div>
              </div>

              {/* Prompt when the subject is still missing */}
              {!profile?.subject?.trim() && (
                <div className="mx-6 mt-6 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-700">
                  <AlertCircle size={22} />
                  <span>
                    لم يتم تحديد المادة الدراسية بعد. يرجى إضافتها لتظهر
                    بشكل صحيح في التقارير.
                  </span>
                </div>
              )}

              <form
                onSubmit={handleSaveSubject}
                className="space-y-5 p-6"
              >
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    المادة الدراسية
                  </label>

                  <input
                    type="text"
                    value={subjectValue}
                    onChange={(e) => setSubjectValue(e.target.value)}
                    placeholder="مثال: الرياضيات"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-right outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingSubject || !accessToken}
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingSubject ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      جاري الحفظ...
                    </>
                  ) : (
                    <>
                      <Save size={19} />
                      حفظ المادة
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* ========================= */}
          {/* Change Password */}
          {/* ========================= */}

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

            {/* Header */}
            <div className="border-b border-slate-100 p-6">
              <div className="flex items-center gap-4">

                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                  <Lock size={27} />
                </div>

                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    تغيير كلمة المرور
                  </h2>

                  <p className="text-sm text-slate-500">
                    قم بتحديث كلمة المرور الخاصة بك
                  </p>
                </div>

              </div>
            </div>

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              className="space-y-5 p-6"
            >

              <PasswordInput
                label="كلمة المرور الحالية"
                name="currentPassword"
                value={form.currentPassword}
                onChange={handleChange}
                show={showCurrent}
                setShow={setShowCurrent}
                error={errors.currentPassword}
              />

              <PasswordInput
                label="كلمة المرور الجديدة"
                name="newPassword"
                value={form.newPassword}
                onChange={handleChange}
                show={showNew}
                setShow={setShowNew}
                error={errors.newPassword}
              />

              <PasswordInput
                label="تأكيد كلمة المرور"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                show={showConfirm}
                setShow={setShowConfirm}
                error={errors.confirmPassword}
              />

              <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-700">
                كلمة المرور يجب أن تحتوي على 8 أحرف على الأقل.
              </div>

              <button
                type="submit"
                disabled={
                  changingPassword || !accessToken
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {changingPassword ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <Save size={19} />
                    تغيير كلمة المرور
                  </>
                )}
              </button>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

// =========================
// Info Item
// =========================

function InfoItem({ icon, label, value }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
      <div className="mb-2 flex items-center gap-2 text-slate-500">
        <span className="text-blue-600">
          {icon}
        </span>

        <span className="text-sm">
          {label}
        </span>
      </div>

      <p className="font-semibold text-slate-800">
        {value || "غير متوفر"}
      </p>
    </div>
  );
}

// =========================
// Password Input
// =========================

function PasswordInput({
  label,
  name,
  value,
  onChange,
  show,
  setShow,
  error,
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>

      <div className="relative">

        <input
          type={show ? "text" : "password"}
          name={name}
          value={value}
          onChange={onChange}
          className={`w-full rounded-xl border bg-white px-4 py-3 pl-12 text-left outline-none transition ${
            error
              ? "border-red-400 focus:ring-2 focus:ring-red-100"
              : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          }`}
        />

        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          {show ? (
            <EyeOff size={20} />
          ) : (
            <Eye size={20} />
          )}
        </button>

      </div>

      {error && (
        <p className="mt-1 text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}