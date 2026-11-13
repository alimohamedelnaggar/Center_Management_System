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
import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";
import { fieldBaseClass, fieldStateClass } from "../components/ui/Input";
import {
  STAFF_EMAIL_HELPER_TEXT,
  validateStaffEmail,
} from "../utils/staffEmail";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function Profile() {
  const {
    accessToken,
    loading: authLoading,
    role,
    refreshModules,
  } = useAuth();

  const isTeacher = role === "Teacher";
  // Students and parents never see an email; their accounts are managed by the
  // center and the API already hides the field for them.
  const hideEmail = role === "Student" || role === "Parent";

  const [profile, setProfile] = useState(null);

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [changingPassword, setChangingPassword] = useState(false);
  const [savingSubject, setSavingSubject] = useState(false);
  const [subjectValue, setSubjectValue] = useState("");

  const [emailValue, setEmailValue] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailNotice, setEmailNotice] = useState(null);

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
  // Request Email Change
  // =========================

  const handleEmailChangeRequest = async (e) => {
    e.preventDefault();

    setEmailError("");
    setEmailNotice(null);

    const validation = validateStaffEmail(emailValue);

    if (!validation.valid) {
      setEmailError(validation.message);
      return;
    }

    if (!validation.value) {
      setEmailError("يرجى إدخال البريد الإلكتروني.");
      return;
    }

    if (
      profile?.email &&
      validation.value === profile.email.toLowerCase()
    ) {
      setEmailError("البريد الإلكتروني الجديد مطابق للبريد الحالي.");
      return;
    }

    try {
      setSavingEmail(true);

      const response = await fetch(
        `${API_BASE_URL}/Profile/RequestEmailChange`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: validation.value }),
        }
      );

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.message ||
            "تعذر إرسال رابط التأكيد. حاول مرة أخرى."
        );
      }

      // The API only stages the address. The old one stays active until the
      // link sent to the new address is opened.
      setProfile((prev) => ({
        ...prev,
        pendingEmail: validation.value,
      }));

      setEmailValue("");
      setEmailNotice({
        type: "success",
        text:
          result?.message ||
          "أرسلنا رابط تأكيد إلى بريدك الجديد. سيبقى بريدك الحالي فعالاً حتى التأكيد.",
      });
    } catch (error) {
      setEmailNotice({
        type: "error",
        text:
          error.message ||
          "حدث خطأ أثناء طلب تغيير البريد الإلكتروني",
      });
    } finally {
      setSavingEmail(false);
    }
  };

  // =========================
  // Loading
  // =========================

  if (authLoading || loadingProfile) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div
          className="h-10 w-10 animate-spin rounded-full border-4 border-surface-border border-t-primary"
          role="status"
          aria-label="جارٍ تحميل الملف الشخصي"
        />
      </div>
    );
  }

  // =========================
  // UI
  // =========================

  return (
    <div
      data-testid="profile-page"
      dir="rtl"
      className="mx-auto w-full max-w-6xl space-y-6 p-4 pb-24 text-text-main md:p-6 md:pb-28"
    >
      <PageHeader
        title="الملف الشخصي"
        subtitle="إدارة بيانات حسابك وكلمة المرور."
      />

      {/* Messages */}
      {message.text && (
        <div
          role={message.type === "success" ? "status" : "alert"}
          className={`flex items-start gap-3 rounded-card border p-4 text-sm font-semibold ${
            message.type === "success"
              ? "border-status-success/30 bg-status-success-bg text-status-success"
              : "border-status-danger/30 bg-status-danger-bg text-status-danger"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 size={22} className="shrink-0" aria-hidden="true" />
          ) : (
            <AlertCircle size={22} className="shrink-0" aria-hidden="true" />
          )}

          <span>{message.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* ========================= */}
        {/* Account Information */}
        {/* ========================= */}

        <section className="rounded-card border border-surface-border bg-surface-card shadow-sm lg:col-span-2">

          {/* Header */}
          <div className="flex items-center gap-4 border-b border-surface-border p-5">

            <div className="flex h-14 w-14 items-center justify-center rounded-control bg-primary-subtle text-primary">
              <User size={28} aria-hidden="true" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-text-main">
                بيانات الحساب
              </h2>

              <p className="text-sm text-text-muted">
                معلومات حسابك الشخصية
              </p>
            </div>

          </div>

          {/* Information */}
          <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">

            <InfoItem
              icon={<User size={19} />}
              label="الاسم بالكامل"
              value={profile?.fullName}
            />

            {!hideEmail && (
              <InfoItem
                icon={<Mail size={19} />}
                label="البريد الإلكتروني"
                value={profile?.email}
              />
            )}

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
        </section>

        {/* ========================= */}
        {/* Email (staff only) */}
        {/* ========================= */}

        {!hideEmail && (
          <section className="rounded-card border border-surface-border bg-surface-card shadow-sm lg:col-span-3">
            <div className="flex items-center gap-4 border-b border-surface-border p-5">
              <div className="flex h-14 w-14 items-center justify-center rounded-control bg-status-success-bg text-status-success">
                <Mail size={27} aria-hidden="true" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-text-main">
                  البريد الإلكتروني
                </h2>

                <p className="text-sm text-text-muted">
                  يُستخدم لاستعادة كلمة المرور الخاصة بحسابك
                </p>
              </div>
            </div>

            <div className="space-y-4 p-5">
              {!profile?.email && (
                <div className="flex items-center gap-3 rounded-control border border-status-warning/30 bg-status-warning-bg p-4 text-status-warning">
                  <AlertCircle size={22} className="shrink-0" aria-hidden="true" />
                  <span>أضف بريدك لتتمكن من استعادة كلمة المرور.</span>
                </div>
              )}

              <div className="rounded-control border border-surface-border bg-surface-muted p-4 text-sm">
                <p className="text-text-muted">البريد الحالي</p>
                <p className="mt-1 break-words font-semibold text-text-main" dir="ltr">
                  {profile?.email || "غير متوفر"}
                </p>

                {profile?.pendingEmail && (
                  <div className="mt-3 rounded-control border border-status-info/30 bg-status-info-bg p-3 text-status-info">
                    <p>
                      بانتظار التأكيد:{" "}
                      <span className="font-semibold" dir="ltr">
                        {profile.pendingEmail}
                      </span>
                    </p>
                    <p className="mt-1 text-xs">
                      سيبقى بريدك الحالي فعالاً حتى تأكيد البريد الجديد.
                    </p>
                  </div>
                )}
              </div>

              {emailNotice && (
                <div
                  role={emailNotice.type === "error" ? "alert" : "status"}
                  className={`flex items-center gap-3 rounded-control border p-4 text-sm ${
                    emailNotice.type === "error"
                      ? "border-status-danger/30 bg-status-danger-bg text-status-danger"
                      : "border-status-success/30 bg-status-success-bg text-status-success"
                  }`}
                >
                  {emailNotice.type === "error" ? (
                    <AlertCircle size={20} className="shrink-0" aria-hidden="true" />
                  ) : (
                    <CheckCircle2 size={20} className="shrink-0" aria-hidden="true" />
                  )}
                  <span>{emailNotice.text}</span>
                </div>
              )}

              <form
                onSubmit={handleEmailChangeRequest}
                className="space-y-3"
                noValidate
              >
                <div>
                  <label
                    htmlFor="profile-email"
                    className="mb-2 block text-sm font-semibold text-text-main"
                  >
                    البريد الإلكتروني الجديد
                  </label>

                  <input
                    id="profile-email"
                    name="email"
                    type="email"
                    dir="ltr"
                    autoComplete="email"
                    value={emailValue}
                    onChange={(e) => {
                      setEmailValue(e.target.value);
                      setEmailError("");
                    }}
                    placeholder="name@example.com"
                    className={`${fieldBaseClass} ${fieldStateClass(emailError)} text-left`}
                  />

                  <p className="mt-1.5 text-xs leading-5 text-text-muted">
                    {STAFF_EMAIL_HELPER_TEXT}
                  </p>

                  {emailError && (
                    <p className="mt-1 text-xs font-semibold text-status-danger">
                      {emailError}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  loading={savingEmail}
                  disabled={savingEmail || !accessToken}
                >
                  {!savingEmail && <Mail size={19} aria-hidden="true" />}
                  {savingEmail ? "جاري الإرسال..." : "إرسال رابط التأكيد"}
                </Button>
              </form>
            </div>
          </section>
        )}

        {/* ========================= */}
        {/* Subject (teachers only) */}
        {/* ========================= */}

        {isTeacher && (
          <section className="rounded-card border border-surface-border bg-surface-card shadow-sm lg:col-span-3">
            <div className="flex items-center gap-4 border-b border-surface-border p-5">
              <div className="flex h-14 w-14 items-center justify-center rounded-control bg-primary-subtle text-primary">
                <BookOpen size={28} aria-hidden="true" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-text-main">
                  المادة الدراسية
                </h2>

                <p className="text-sm text-text-muted">
                  المادة التي تدرّسها داخل السنتر
                </p>
              </div>
            </div>

            {/* Prompt when the subject is still missing */}
            {!profile?.subject?.trim() && (
              <div className="mx-5 mt-5 flex items-center gap-3 rounded-control border border-status-warning/30 bg-status-warning-bg p-4 text-status-warning">
                <AlertCircle size={22} aria-hidden="true" />
                <span>
                  لم يتم تحديد المادة الدراسية بعد. يرجى إضافتها لتظهر بشكل صحيح
                  في التقارير.
                </span>
              </div>
            )}

            <form onSubmit={handleSaveSubject} className="space-y-5 p-5">
              <div>
                <label
                  htmlFor="profile-subject"
                  className="mb-2 block text-sm font-semibold text-text-main"
                >
                  المادة الدراسية
                </label>

                <input
                  id="profile-subject"
                  type="text"
                  value={subjectValue}
                  onChange={(e) => setSubjectValue(e.target.value)}
                  placeholder="مثال: الرياضيات"
                  className={fieldBaseClass}
                />
              </div>

              <Button
                type="submit"
                loading={savingSubject}
                disabled={savingSubject || !accessToken}
              >
                {!savingSubject && <Save size={19} aria-hidden="true" />}
                {savingSubject ? "جاري الحفظ..." : "حفظ المادة"}
              </Button>
            </form>
          </section>
        )}

        {/* ========================= */}
        {/* Change Password */}
        {/* ========================= */}

        <section className="rounded-card border border-surface-border bg-surface-card shadow-sm">

          {/* Header */}
          <div className="flex items-center gap-4 border-b border-surface-border p-5">

            <div className="flex h-14 w-14 items-center justify-center rounded-control bg-status-warning-bg text-status-warning">
              <Lock size={27} aria-hidden="true" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-text-main">
                تغيير كلمة المرور
              </h2>

              <p className="text-sm text-text-muted">
                قم بتحديث كلمة المرور الخاصة بك
              </p>
            </div>

          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5 p-5">

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

            <p className="rounded-control bg-primary-subtle p-4 text-sm text-primary">
              كلمة المرور يجب أن تحتوي على 8 أحرف على الأقل.
            </p>

            <Button
              type="submit"
              block
              loading={changingPassword}
              disabled={changingPassword || !accessToken}
            >
              {!changingPassword && <Save size={19} aria-hidden="true" />}
              {changingPassword ? "جاري الحفظ..." : "تغيير كلمة المرور"}
            </Button>

          </form>
        </section>
      </div>
    </div>
  );
}

// =========================
// Info Item
// =========================

function InfoItem({ icon, label, value }) {
  return (
    <div className="rounded-control border border-surface-border bg-surface-muted p-4">
      <div className="mb-2 flex items-center gap-2 text-text-muted">
        <span className="text-primary">{icon}</span>

        <span className="text-sm">{label}</span>
      </div>

      <p className="break-words font-semibold text-text-main">
        {value || "غير متوفر"}
      </p>
    </div>
  );
}

// =========================
// Password Input
// =========================

function PasswordInput({ label, name, value, onChange, show, setShow, error }) {
  return (
    <div>
      <label
        htmlFor={`profile-${name}`}
        className="mb-2 block text-sm font-semibold text-text-main"
      >
        {label}
      </label>

      <div className="relative">

        <input
          id={`profile-${name}`}
          type={show ? "text" : "password"}
          name={name}
          value={value}
          onChange={onChange}
          autoComplete={
            name === "currentPassword" ? "current-password" : "new-password"
          }
          className={`${fieldBaseClass} ${fieldStateClass(error)} pe-12 text-left`}
        />

        <button
          type="button"
          onClick={() => setShow(!show)}
          aria-label={show ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
          className="focus-ring absolute end-0 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-control text-text-muted transition-colors hover:bg-surface-muted hover:text-text-main"
        >
          {show ? (
            <EyeOff size={20} aria-hidden="true" />
          ) : (
            <Eye size={20} aria-hidden="true" />
          )}
        </button>

      </div>

      {error && (
        <p className="mt-1 text-xs font-semibold text-status-danger">{error}</p>
      )}
    </div>
  );
}