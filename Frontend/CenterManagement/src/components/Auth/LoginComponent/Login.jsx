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
    <div dir="rtl" className="min-h-screen w-full bg-surface-bg font-sans">
      <button
        type="button"
        onClick={toggle}
        aria-label={isDark ? "التبديل إلى الوضع النهاري" : "التبديل إلى الوضع الليلي"}
        className="fixed left-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-pill border border-surface-border bg-surface-card text-text-muted shadow-soft transition-colors hover:text-primary"
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="flex min-h-screen w-full flex-col md:flex-row">
        <BrandHeader />

        <div className="flex w-full items-center justify-center px-5 py-10 sm:px-8 md:w-1/2 md:py-0">
          <div
            className={`w-full max-w-md rounded-card border border-surface-border bg-surface-card p-6 shadow-elevated sm:p-8 ${
              mounted ? "fade-up" : "opacity-0"
            }`}
          >
            <div className="mb-7 flex items-center gap-3">
              <img src="/logo.png" alt="" width="40" height="40" />
              <div>
                <p className="text-sm font-bold text-text-main">
                  نظام إدارة السنتر
                </p>
                <p className="text-xs text-text-muted">
                  Center Management System
                </p>
              </div>
            </div>

            <h1 className="text-2xl font-extrabold text-text-main sm:text-[26px]">
              مرحباً بعودتك
            </h1>
            <p className="mb-6 mt-1.5 text-sm text-text-muted">
              سجل الدخول لإدارة السنتر
            </p>

            <div aria-live="polite" className="mb-4">
              {error && (
                <div
                  role="alert"
                  className={`flex items-start gap-3 rounded-control border px-4 py-3 text-sm ${alert.box}`}
                >
                  <AlertIcon size={18} className="mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="font-bold">{error.title}</p>
                    <p className="mt-0.5 opacity-90">{error.message}</p>
                    {error.retry && (
                      <button
                        type="button"
                        onClick={doLogin}
                        disabled={loading}
                        className="mt-2 font-bold underline underline-offset-2 transition-opacity hover:opacity-70 disabled:opacity-50"
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
                    onBlur={() => setTouched((s) => ({ ...s, phone: true }))}
                    placeholder="01xxxxxxxxx"
                    aria-invalid={!!phoneError}
                    className={`w-full rounded-control border bg-surface-card py-3 pl-10 pr-11 text-right text-sm text-text-main outline-none transition-colors ${
                      phoneError
                        ? "border-status-danger focus:border-status-danger focus:ring-2 focus:ring-status-danger/20"
                        : "border-surface-border focus:border-primary focus:ring-2 focus:ring-primary/20"
                    }`}
                  />
                  {touched.phone && phoneValid && (
                    <CheckCircle2
                      size={18}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-status-success"
                    />
                  )}
                </div>
                {phoneError && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-status-danger">
                    <AlertCircle size={13} /> {phoneError}
                  </p>
                )}
              </div>

              <div className="mb-2">
                <div className="mb-1.5 flex items-center justify-between">
                  <label
                    htmlFor="login-password"
                    className="block text-sm font-semibold text-text-main"
                  >
                    كلمة المرور
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      toast("سيتم توفير استعادة كلمة المرور قريباً", {
                        icon: "🔑",
                      })
                    }
                    className="text-xs font-semibold text-primary transition-opacity hover:opacity-70"
                  >
                    نسيت كلمة المرور؟
                  </button>
                </div>
                <div className="relative">
                  <Lock
                    size={18}
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
                    className={`w-full rounded-control border bg-surface-card py-3 pl-11 pr-11 text-sm text-text-main outline-none transition-colors ${
                      passwordError
                        ? "border-status-danger focus:border-status-danger focus:ring-2 focus:ring-status-danger/20"
                        : "border-surface-border focus:border-primary focus:ring-2 focus:ring-primary/20"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted transition-colors hover:text-text-main"
                    aria-label={
                      showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"
                    }
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {passwordError && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-status-danger">
                    <AlertCircle size={13} /> {passwordError}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-control bg-primary py-3.5 text-sm font-bold text-primary-contrast shadow-md transition-colors hover:bg-primary-hover disabled:opacity-80"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> جاري تسجيل
                    الدخول...
                  </>
                ) : (
                  "تسجيل الدخول"
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-text-muted">
              © 2026 نظام إدارة السنتر · جميع الحقوق محفوظة
            </p>
          </div>
        </div>

        <BrandPanel />
      </div>
    </div>
  );
}
