import { useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Hash,
  Loader2,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
} from "@/components/icons";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * The API deliberately answers every send-code request with the same sentence.
 * Keep the fallback identical so a network/proxy hiccup can never make the UI
 * reveal whether an account exists.
 */
export const UNIFORM_RECOVERY_MESSAGE =
  "لو الحساب مرتبط ببريد إلكتروني، سيصلك كود. وإلا تواصل مع المركز.";

const RATE_LIMIT_MESSAGE =
  "تم تجاوز عدد المحاولات المسموح. حاول مرة أخرى بعد قليل.";

const CONNECTION_MESSAGE =
  "تعذّر الاتصال بالخادم. تحقق من اتصالك بالإنترنت.";

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [step, setStep] = useState("request");

  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [notice, setNotice] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function requestCode(event) {
    event.preventDefault();

    setError("");
    setNotice(null);

    const value = identifier.trim();

    if (!value) {
      setError("يرجى إدخال البريد الإلكتروني أو رقم الهاتف.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/Authentication/Send-Reset-Code`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier: value }),
        },
      );

      const result = await response.json().catch(() => null);

      if (response.status === 429) {
        setError(RATE_LIMIT_MESSAGE);
        return;
      }

      if (!response.ok) {
        setError(result?.message || "تعذر إرسال الكود. حاول مرة أخرى.");
        return;
      }

      setIdentifier(value);
      setNotice({
        type: "info",
        text: result?.data || UNIFORM_RECOVERY_MESSAGE,
      });
      setStep("reset");
    } catch {
      setError(CONNECTION_MESSAGE);
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(event) {
    event.preventDefault();

    setError("");

    const normalizedCode = code.trim();

    if (!/^\d{6}$/.test(normalizedCode)) {
      setError("كود التحقق يجب أن يتكون من 6 أرقام.");
      return;
    }

    if (password.length < 8) {
      setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل.");
      return;
    }

    if (password !== confirmPassword) {
      setError("كلمتا المرور غير متطابقتين.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/Authentication/Reset-Password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            identifier,
            code: normalizedCode,
            password,
            confirmPassword,
          }),
        },
      );

      const result = await response.json().catch(() => null);

      if (response.status === 429) {
        setError(RATE_LIMIT_MESSAGE);
        return;
      }

      if (!response.ok) {
        setError(
          result?.message || "الرمز غير صحيح أو منتهي الصلاحية.",
        );
        return;
      }

      setNotice({
        type: "success",
        text:
          result?.message ||
          "تم تغيير كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن.",
      });

      setCode("");
      setPassword("");
      setConfirmPassword("");
      setStep("done");
    } catch {
      setError(CONNECTION_MESSAGE);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
            <ShieldCheck size={26} />
          </div>

          <div>
            <h1 className="text-xl font-extrabold text-slate-800">
              استعادة كلمة المرور
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              أدخل بريدك الإلكتروني أو رقم هاتفك لبدء الاستعادة.
            </p>
          </div>
        </div>

        <div aria-live="polite" className="space-y-3">
          {notice && (
            <div
              role="status"
              className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${
                notice.type === "success"
                  ? "border-green-200 bg-green-50 text-green-700"
                  : notice.type === "info"
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-amber-200 bg-amber-50 text-amber-700"
              }`}
            >
              {notice.type === "success" ? (
                <CheckCircle2 size={20} className="mt-0.5 shrink-0" />
              ) : (
                <AlertCircle size={20} className="mt-0.5 shrink-0" />
              )}
              <span>{notice.text}</span>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              <AlertCircle size={20} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {step === "request" && (
          <form onSubmit={requestCode} className="mt-5 space-y-4" noValidate>
            <div>
              <label
                htmlFor="recovery-identifier"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                البريد الإلكتروني أو رقم الهاتف
              </label>

              <div className="relative">
                <Mail
                  size={18}
                  className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="recovery-identifier"
                  name="identifier"
                  type="text"
                  autoComplete="username"
                  dir="ltr"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  placeholder="name@example.com أو 01xxxxxxxxx"
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-11 text-left text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <p className="mt-1.5 text-xs leading-5 text-slate-500">
                استخدم البريد الإلكتروني المرتبط بحسابك أو رقم هاتفك. لن يظهر
                لك ما إذا كان الحساب موجوداً أم لا.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> جاري الإرسال...
                </>
              ) : (
                "إرسال الكود"
              )}
            </button>
          </form>
        )}

        {step === "reset" && (
          <form onSubmit={resetPassword} className="mt-5 space-y-4" noValidate>
            <p className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
              أدخل الكود المكوّن من 6 أرقام الذي وصلك، ثم اختر كلمة مرور جديدة.
            </p>

            <div>
              <label
                htmlFor="recovery-code"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                كود التحقق
              </label>

              <div className="relative">
                <Hash
                  size={18}
                  className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="recovery-code"
                  name="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  dir="ltr"
                  maxLength={6}
                  value={code}
                  onChange={(event) =>
                    setCode(
                      event.target.value.replace(/[^0-9]/g, "").slice(0, 6),
                    )
                  }
                  placeholder="000000"
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-11 text-left text-sm tracking-[0.4em] text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="recovery-password"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                كلمة المرور الجديدة
              </label>

              <div className="relative">
                <Lock
                  size={18}
                  className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="recovery-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-11 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="recovery-confirm-password"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                تأكيد كلمة المرور
              </label>

              <div className="relative">
                <Lock
                  size={18}
                  className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="recovery-confirm-password"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-11 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <p className="mt-1.5 text-xs text-slate-500">
                كلمة المرور يجب أن تحتوي على 8 أحرف على الأقل.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> جاري الحفظ...
                </>
              ) : (
                "تغيير كلمة المرور"
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setError("");
                setNotice(null);
                setStep("request");
              }}
              className="flex w-full items-center justify-center gap-1 text-sm font-semibold text-slate-500 transition hover:text-slate-700"
            >
              <ArrowRight size={16} /> استخدام بريد أو رقم آخر
            </button>
          </form>
        )}

        {step === "done" && (
          <div className="mt-5 space-y-4">
            <Link
              to="/login"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              العودة لتسجيل الدخول
            </Link>
          </div>
        )}

        {step !== "done" && (
          <div className="mt-6 flex items-center justify-center gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
            <Phone size={14} />
            <span>
              هل تحتاج مساعدة؟ تواصل مع إدارة المركز أو المنصة.
            </span>
          </div>
        )}

        {step !== "done" && (
          <p className="mt-3 text-center text-sm">
            <Link
              to="/login"
              className="font-semibold text-blue-600 transition hover:text-blue-700"
            >
              العودة لتسجيل الدخول
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
