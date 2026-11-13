import { useState } from "react";
import toast from "react-hot-toast";
import {
  CheckCircle,
  ClipboardCheck,
  Copy,
  Printer,
  AlertCircle,
} from "@/components/icons";
import AppModal from "../../components/ui/AppModal";
import Button from "../../components/ui/Button";
import StatusPill from "../../components/ui/StatusPill";
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

/**
 * One-time credentials dialog.
 *
 * The passwords live only in this component's props: nothing is written to
 * localStorage/sessionStorage and nothing is logged. Closing unmounts the
 * dialog, so the temporary passwords leave the DOM with it.
 */
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
    <AppModal
      open={open}
      onClose={onClose}
      title={title}
      icon={CheckCircle}
      testId="accounts-modal"
      size="max-w-2xl"
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {credentials.length > 1 && (
            <Button
              variant="secondary"
              onClick={handleCopyAll}
              data-testid="accounts-copy-all"
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
              نسخ الكل
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={handlePrint}
            data-testid="accounts-print"
          >
            <Printer className="h-4 w-4" aria-hidden="true" />
            طباعة
          </Button>
          <Button
            className="flex-1"
            onClick={onClose}
            data-testid="accounts-close"
          >
            تم
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-2 rounded-control border border-status-warning/30 bg-status-warning-bg p-3 text-sm font-semibold text-status-warning">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p className="leading-relaxed">{warningText}</p>
        </div>

        <div className="space-y-3" data-testid="accounts-credentials">
          {credentials.map((credential) => (
            <div
              key={credential.studentId}
              data-testid={`accounts-credential-${credential.studentId}`}
              className="rounded-card border border-surface-border bg-surface-muted/40 p-4"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span className="min-w-0 break-words text-sm font-bold text-text-main">
                  {credential.studentName}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleCopy(credential)}
                  data-testid={`accounts-copy-${credential.studentId}`}
                >
                  {copiedId === credential.studentId ? (
                    <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Copy className="h-4 w-4" aria-hidden="true" />
                  )}
                  نسخ
                </Button>
              </div>

              <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="rounded-control border border-surface-border bg-surface-card p-3">
                  <dt className="mb-1 text-xs font-bold text-text-muted">
                    {usernameLabel}
                  </dt>
                  <dd
                    dir="ltr"
                    className="break-all text-left font-mono text-sm text-text-main"
                  >
                    {credential.username}
                  </dd>
                </div>
                <div className="rounded-control border border-surface-border bg-surface-card p-3">
                  <dt className="mb-1 text-xs font-bold text-text-muted">
                    كلمة المرور المؤقتة
                  </dt>
                  <dd
                    dir="ltr"
                    data-testid={`accounts-password-${credential.studentId}`}
                    className="break-all text-left font-mono text-sm font-bold tracking-wide text-text-main"
                  >
                    {credential.temporaryPassword}
                  </dd>
                </div>
              </dl>
            </div>
          ))}
        </div>

        {skipped.length > 0 && (
          <div className="rounded-card border border-surface-border bg-surface-card p-4">
            <p className="mb-2 text-sm font-bold text-text-main">
              {skippedTitle} ({skipped.length})
            </p>
            <ul className="space-y-1.5">
              {skipped.map((item) => (
                <li
                  key={item.studentId}
                  className="flex items-start gap-2 text-sm text-text-muted"
                >
                  <AlertCircle
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-status-warning"
                    aria-hidden="true"
                  />
                  <span>
                    <span className="font-bold text-text-main">
                      {item.studentName}
                    </span>{" "}
                    <StatusPill tone="warning" dot={false} className="mx-1">
                      {item.reason}
                    </StatusPill>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </AppModal>
  );
}
