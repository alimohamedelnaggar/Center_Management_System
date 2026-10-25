import { useState } from "react";
import toast from "react-hot-toast";
import {
  CheckCircle,
  ClipboardCheck,
  Copy,
  Printer,
  AlertCircle,
  X,
} from "@/components/icons";
import { printStudentAccounts } from "../../utils/credentialsPrint";

async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }

  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    document.body.removeChild(area);
    return true;
  } catch {
    return false;
  }
}

const credentialText = (credential) =>
  [
    `الاسم: ${credential.studentName}`,
    `رقم الدخول: ${credential.username}`,
    `كلمة المرور المؤقتة: ${credential.temporaryPassword}`,
  ].join("\n");

const DEFAULT_WARNING =
  "تظهر كلمة المرور المؤقتة مرة واحدة فقط. انسخها أو اطبعها الآن قبل الإغلاق، وسيُطلب من الطالب تغييرها عند أول تسجيل دخول.";

export default function StudentAccountsModal({
  open,
  onClose,
  credentials = [],
  skipped = [],
  centerName = "",
  title = "بيانات الدخول",
  warning,
  skippedTitle = "طلاب لم يتم إنشاء حساب لهم",
  usernameLabel = "رقم الدخول (الهاتف)",
}) {
  const warningText = warning ?? DEFAULT_WARNING;
  const [copiedId, setCopiedId] = useState(null);

  if (!open) return null;

  const handleCopy = async (credential) => {
    const ok = await copyText(credentialText(credential));
    if (ok) {
      setCopiedId(credential.studentId);
      toast.success("تم نسخ بيانات الدخول");
    } else {
      toast.error("تعذّر النسخ");
    }
  };

  const handleCopyAll = async () => {
    const all = credentials.map(credentialText).join("\n\n");
    const ok = await copyText(all);
    if (ok) toast.success("تم نسخ كل بيانات الدخول");
    else toast.error("تعذّر النسخ");
  };

  const handlePrint = () => {
    const ok = printStudentAccounts({ credentials, skipped, centerName });
    if (!ok) toast.error("تعذّر فتح نافذة الطباعة");
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs dir-rtl text-right">
      <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 p-5">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-emerald-600" />
            <h2 className="text-lg font-bold text-[#1e3a8a]">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto p-5">
          {/* One-time warning */}
          <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{warningText}</p>
          </div>

          {/* Credentials */}
          {credentials.map((credential) => (
            <div
              key={credential.studentId}
              className="rounded-2xl border border-gray-100 bg-[#f8fafc] p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-gray-800">
                  {credential.studentName}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(credential)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-[#1e3a8a] transition-colors hover:bg-gray-50"
                >
                  {copiedId === credential.studentId ? (
                    <ClipboardCheck className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  نسخ
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="rounded-xl border border-gray-200 bg-white p-3">
                  <p className="mb-1 text-[11px] font-bold text-gray-400">
                    {usernameLabel}
                  </p>
                  <p dir="ltr" className="text-left font-mono text-sm text-gray-800">
                    {credential.username}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-3">
                  <p className="mb-1 text-[11px] font-bold text-gray-400">
                    كلمة المرور المؤقتة
                  </p>
                  <p
                    dir="ltr"
                    className="text-left font-mono text-sm font-bold tracking-wide text-gray-800"
                  >
                    {credential.temporaryPassword}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {/* Skipped */}
          {skipped.length > 0 && (
            <div className="rounded-2xl border border-gray-100 bg-white p-4">
              <p className="mb-2 text-sm font-bold text-gray-700">
                {skippedTitle} ({skipped.length})
              </p>
              <ul className="space-y-1.5">
                {skipped.map((item) => (
                  <li
                    key={item.studentId}
                    className="flex items-start gap-2 text-xs text-gray-600"
                  >
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                    <span>
                      <span className="font-bold text-gray-700">
                        {item.studentName}
                      </span>{" "}
                      — {item.reason}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 border-t border-gray-100 p-5">
          {credentials.length > 1 && (
            <button
              type="button"
              onClick={handleCopyAll}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-[#f1f5f9] px-4 py-3 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-200"
            >
              <Copy className="h-4 w-4" />
              نسخ الكل
            </button>
          )}
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-2xl bg-[#f1f5f9] px-4 py-3 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-200"
          >
            <Printer className="h-4 w-4" />
            طباعة
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-2xl bg-[#1e3a8a] py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#1e3a8a]/90"
          >
            تم
          </button>
        </div>
      </div>
    </div>
  );
}
