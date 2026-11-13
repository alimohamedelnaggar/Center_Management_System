import { useState, useEffect } from "react";
import { Key, Loader2, Copy, Check } from "@/components/icons";
import toast from "react-hot-toast";

import AdminModal from "../ui/AdminModal";
import Button from "../ui/Button";

export default function ResetPasswordModal({ isOpen, onClose, onSubmit, assistant }) {
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setResult(null);
      setSubmitting(false);
      setCopied(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (submitting) return;

    setSubmitting(true);

    try {
      const response = await onSubmit();

      if (response?.succeeded === false) {
        toast.error(response?.message || "تعذر إعادة تعيين كلمة المرور");
        return;
      }

      setResult(response?.data || null);
    } catch (err) {
      toast.error(err?.response?.data?.message || "حدث خطأ أثناء إعادة التعيين");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = async () => {
    if (!result?.temporaryPassword) return;

    try {
      await navigator.clipboard.writeText(result.temporaryPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("تعذر نسخ كلمة المرور");
    }
  };

  return (
    <AdminModal
      open={isOpen}
      onClose={onClose}
      busy={submitting}
      title={`إعادة تعيين كلمة السر: ${assistant?.fullName ?? ""}`}
      icon={Key}
      size="max-w-md"
      testId="reset-password-modal"
      footer={
        !result ? (
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
              className="flex-1"
            >
              إلغاء
            </Button>
            <Button
              type="button"
              loading={submitting}
              onClick={handleConfirm}
              disabled={submitting}
              className="flex-1"
            >
              إعادة التعيين
            </Button>
          </div>
        ) : (
          <Button type="button" block onClick={onClose}>
            تم
          </Button>
        )
      }
    >
      {!result ? (
        <p className="text-sm leading-relaxed text-text-muted">
          سيتم إنشاء كلمة مرور مؤقتة جديدة لهذا المساعد، وسيُطلب منه تغييرها عند
          أول تسجيل دخول. لا يمكنك اختيار كلمة المرور بنفسك.
        </p>
      ) : (
        <div className="space-y-4 text-sm">
          <p className="leading-relaxed text-text-muted">
            تم إنشاء كلمة مرور مؤقتة. سلّمها للمساعد الآن — لن تظهر مرة أخرى.
          </p>

          <div className="space-y-2 rounded-control border border-surface-border bg-surface-muted p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-text-muted">اسم المستخدم</span>
              <span className="font-semibold text-text-main" dir="ltr">
                {result.username || "-"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-text-muted">كلمة المرور المؤقتة</span>
              <div className="flex items-center gap-2">
                <span
                  className="font-bold tracking-widest text-text-main"
                  dir="ltr"
                >
                  {result.temporaryPassword}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-control text-primary transition-colors hover:bg-surface-card"
                  aria-label="نسخ كلمة المرور المؤقتة"
                  title="نسخ"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminModal>
  );
}
