import { Link, useSearchParams } from "react-router-dom";
import { AlertCircle, CheckCircle2 } from "@/components/icons";

/**
 * Landing page for the tokenized email-change link. The API redirects here
 * with `status=success` or `status=invalid`; every other value (including a
 * missing one) is treated as invalid so a truncated link never looks confirmed.
 */
export default function EmailConfirmedPage() {
  const [searchParams] = useSearchParams();
  const success = searchParams.get("status") === "success";

  return (
    <div
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg">
        <div
          className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full ${
            success
              ? "bg-green-100 text-green-600"
              : "bg-red-100 text-red-600"
          }`}
        >
          {success ? <CheckCircle2 size={34} /> : <AlertCircle size={34} />}
        </div>

        <h1 className="text-xl font-extrabold text-slate-800">
          {success ? "تم تأكيد البريد الإلكتروني" : "رابط التأكيد غير صالح"}
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-500">
          {success
            ? "أصبح بريدك الإلكتروني الجديد هو البريد الفعّال لحسابك، ويمكنك الآن استخدامه لاستعادة كلمة المرور."
            : "الرابط غير صحيح أو منتهي الصلاحية أو تم استخدامه من قبل. لم يتم تغيير بريد حسابك."}
        </p>

        <Link
          to="/login"
          className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700"
        >
          العودة لتسجيل الدخول
        </Link>
      </div>
    </div>
  );
}
