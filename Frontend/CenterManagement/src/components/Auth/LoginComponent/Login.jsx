import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  Info,
  Loader2,
  Lock,
  Moon,
  Phone,
  Sun,
} from "@/components/icons";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/useAuth";
import { useTheme } from "../../../context/useTheme";
import { homeFor } from "../../../utils/homeRoute";
import BrandPanel, { BrandHeader } from "./BrandPanel";
import { mapLoginError } from "./loginErrors";
import "./login.css";

const PHONE_RE = /^01[0125][0-9]{8}$/;

const ALERT_STYLES = {
  danger: {
    box: "border-status-danger/30 bg-status-danger-bg text-status-danger",
    icon: AlertCircle,
  },
  warning: {
    box: "border-status-warning/30 bg-status-warning-bg text-status-warning",
    icon: AlertTriangle,
  },
  info: {
    box: "border-status-info/30 bg-status-info-bg text-status-info",
    icon: Info,
  },
};

const FIELD_BASE =
  "min-h-12 w-full rounded-control border bg-surface-card py-3 text-base text-text-main outline-none transition-colors placeholder:text-text-muted/70 sm:text-sm";

export default function CenterLoginPage() {
  const { isDark, toggle } = useTheme();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({ phone: false, password: false });
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => setMounted(true), []);

  const phoneError =
    touched.phone && phone.length === 0
      ? "رقم الهاتف مطلوب"
      : touched.phone && !PHONE_RE.test(phone)
        ? "يرجى إدخال رقم هاتف مصري صحيح"
        : "";

  const passwordError =
    touched.password && password.length === 0
      ? "كلمة المرور مطلوبة"
      : touched.password && password.length < 6
        ? "كلمة المرور يجب ألا تقل عن 6 أحرف"
        : "";

  const phoneValid = phone.length > 0 && PHONE_RE.test(phone);
  const passwordValid = password.length >= 6;

  const navigate = useNavigate();
  const { login } = useAuth();

  async function doLogin() {
    setError(null);
    setTouched({ phone: true, password: true });

    if (!phoneValid || !passwordValid) {
      setShake(true);
      return;
    }

    setLoading(true);

    try {
      const loggedInUser = await login(phone, password);

      if (!loggedInUser) {
        throw new Error("Login did not return user data");
      }

      const roleClaim =
        "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";

      const role = loggedInUser[roleClaim];

      if (role === "Student") {
        navigate("/student", { replace: true });
      } else if (
        role === "Parent" ||
        role === "Assistant" ||
        role === "SuperAdmin" ||
        role === "CenterOwner" ||
        role === "Teacher"
      ) {
        navigate(homeFor(role), { replace: true });
      } else {
        toast.error("تم تسجيل الدخول، لكن لم يتم تحديد صلاحية المستخدم");
        return;
      }

      toast.success("تم تسجيل الدخول بنجاح");
    } catch (err) {
      setError(mapLoginError(err));
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    doLogin();
  }

  const alert = error ? ALERT_STYLES[error.variant] || ALERT_STYLES.danger : null;
  const AlertIcon = alert?.icon;

  return (
    <div
      dir="rtl"
      className="relative min-h-dvh w-full overflow-x-hidden bg-surface-bg font-sans text-text-main"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 top-16 h-72 w-72 rounded-full bg-primary/10 blur-2xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 bottom-10 h-80 w-80 rounded-full bg-secondary/10 blur-2xl"
      />

      <button
        type="button"
        onClick={toggle}
        data-testid="login-theme-toggle"
        aria-label={isDark ? "التبديل إلى الوضع النهاري" : "التبديل إلى الوضع الليلي"}
        className="fixed left-4 top-4 z-30 flex h-11 w-11 items-center justify-center rounded-pill border border-surface-border bg-surface-card text-text-muted shadow-soft transition-colors hover:text-primary"
      >
        {isDark ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      <div className="relative z-10 flex min-h-dvh w-full flex-col md:flex-row">
        <BrandHeader />

        <main className="login-form-side flex w-full flex-1 items-center justify-center px-4 py-4 sm:px-8 sm:py-8 md:w-1/2 md:px-10 md:py-12">
          <div className="w-full max-w-[27rem]">
            <div
              data-testid="login-card"
              className={`rounded-card border border-surface-border bg-surface-card p-4 shadow-card sm:p-8 ${
                mounted ? "fade-up" : "opacity-0"
              }`}
            >
              <div className="mb-4 sm:mb-6">
                <span className="login-eyebrow inline-flex items-center gap-1.5 rounded-pill bg-primary-subtle px-3 py-1 text-sm font-bold text-primary">
                  <Lock className="h-4 w-4" aria-hidden="true" />
                  تسجيل الدخول
                </span>

                <h1 className="mt-2 break-words text-xl font-extrabold text-text-main sm:mt-3 sm:text-[28px]">
                  مرحباً بعودتك
                </h1>
                <p className="mt-1 break-words text-sm text-text-muted sm:mt-1.5">
                  سجل الدخول لإدارة السنتر
                </p>
              </div>

              <div aria-live="polite" className="mb-4 empty:hidden">
                {error && (
                  <div
                    role="alert"
                    className={`flex items-start gap-3 rounded-control border px-4 py-3 text-sm ${alert.box}`}
                  >
                    <AlertIcon size={18} className="mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="break-words font-bold">{error.title}</p>
                      <p className="mt-0.5 break-words opacity-90">
                        {error.message}
                      </p>
                      {error.retry && (
                        <button
                          type="button"
                          onClick={doLogin}
                          disabled={loading}
                          className="mt-1 inline-flex min-h-11 items-center font-bold underline underline-offset-2 transition-opacity hover:opacity-70 disabled:opacity-50"
                        >
                          إعادة المحاولة
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <form
                onSubmit={handleSubmit}
                noValidate
                className={shake ? "shake-anim" : ""}
              >
                <div className="mb-4">
                  <label
                    htmlFor="login-phone"
                    className="mb-1.5 block text-sm font-semibold text-text-main"
                  >
                    رقم الهاتف
                  </label>
                  <div className="relative">
                    <Phone
                      size={18}
                      aria-hidden="true"
                      className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted"
                    />
                    <input
                      id="login-phone"
                      name="phone"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      dir="ltr"
                      value={phone}
                      onChange={(e) =>
                        setPhone(
                          e.target.value.replace(/[^0-9]/g, "").slice(0, 11),
                        )
                      }
                      onBlur={() =>
                        setTouched((s) => ({ ...s, phone: true }))
                      }
                      placeholder="01xxxxxxxxx"
                      aria-invalid={!!phoneError}
                      aria-describedby={phoneError ? "login-phone-error" : undefined}
                      className={`${FIELD_BASE} pl-11 pr-11 text-right ${
                        phoneError
                          ? "border-status-danger focus:border-status-danger focus:ring-2 focus:ring-status-danger/20"
                          : "border-surface-border focus:border-primary focus:ring-2 focus:ring-primary/20"
                      }`}
                    />
                    {touched.phone && phoneValid && (
                      <CheckCircle2
                        size={18}
                        aria-hidden="true"
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-status-success"
                      />
                    )}
                  </div>
                  {phoneError && (
                    <p
                      id="login-phone-error"
                      className="mt-1.5 flex items-center gap-1 text-sm text-status-danger"
                    >
                      <AlertCircle size={14} aria-hidden="true" /> {phoneError}
                    </p>
                  )}
                </div>

                <div className="mb-2">
                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <label
                      htmlFor="login-password"
                      className="block text-sm font-semibold text-text-main"
                    >
                      كلمة المرور
                    </label>
                    <button
                      type="button"
                      onClick={() => navigate("/forgot-password")}
                      className="inline-flex min-h-11 items-center rounded-control px-1 text-sm font-semibold text-primary transition-opacity hover:opacity-70"
                    >
                      نسيت كلمة المرور؟
                    </button>
                  </div>
                  <div className="relative">
                    <Lock
                      size={18}
                      aria-hidden="true"
                      className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted"
                    />
                    <input
                      id="login-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onBlur={() =>
                        setTouched((s) => ({ ...s, password: true }))
                      }
                      placeholder="••••••••"
                      aria-invalid={!!passwordError}
                      aria-describedby={
                        passwordError ? "login-password-error" : undefined
                      }
                      className={`${FIELD_BASE} pl-14 pr-11 ${
                        passwordError
                          ? "border-status-danger focus:border-status-danger focus:ring-2 focus:ring-status-danger/20"
                          : "border-surface-border focus:border-primary focus:ring-2 focus:ring-primary/20"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      data-testid="login-password-toggle"
                      className="absolute left-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-control text-text-muted transition-colors hover:text-text-main"
                      aria-label={
                        showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"
                      }
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {passwordError && (
                    <p
                      id="login-password-error"
                      className="mt-1.5 flex items-center gap-1 text-sm text-status-danger"
                    >
                      <AlertCircle size={14} aria-hidden="true" /> {passwordError}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  data-testid="login-submit"
                  disabled={loading}
                  className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-action bg-primary px-5 text-base font-bold text-primary-contrast shadow-md transition-colors hover:bg-primary-hover disabled:opacity-80 sm:mt-6"
                >
                  {loading ? (
                    <>
                      <Loader2
                        size={18}
                        aria-hidden="true"
                        className="animate-spin"
                      />{" "}
                      جاري تسجيل الدخول...
                    </>
                  ) : (
                    "تسجيل الدخول"
                  )}
                </button>
              </form>
            </div>

            <p className="login-footer mt-3 break-words text-center text-sm text-text-muted sm:mt-5">
              © 2026 نظام إدارة السنتر · جميع الحقوق محفوظة
            </p>
          </div>
        </main>

        <BrandPanel />
      </div>
    </div>
  );
}
