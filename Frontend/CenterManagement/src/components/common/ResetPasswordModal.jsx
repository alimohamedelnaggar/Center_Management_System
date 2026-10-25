import  { useState, useEffect } from "react";
import { Key, X, Loader2, Copy, Check } from "@/components/icons";
import toast from "react-hot-toast";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-card border border-surface-border w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex justify-between items-center border-b border-surface-border pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <Key className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-text-main">
              إعادة تعيين كلمة السر: {assistant?.fullName}
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="text-text-muted hover:text-text-main p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!result ? (
          <div className="space-y-4 text-sm">
            <p className="text-text-muted leading-relaxed">
              سيتم إنشاء كلمة مرور مؤقتة جديدة لهذا المساعد، وسيُطلب منه تغييرها
              عند أول تسجيل دخول. لا يمكنك اختيار كلمة المرور بنفسك.
            </p>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="w-1/2 py-2.5 rounded-xl border border-surface-border font-bold text-text-muted hover:bg-surface-muted transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={submitting}
                className="w-1/2 py-2.5 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>إعادة التعيين</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-sm">
            <p className="text-text-muted leading-relaxed">
              تم إنشاء كلمة مرور مؤقتة. سلّمها للمساعد الآن — لن تظهر مرة أخرى.
            </p>

            <div className="rounded-xl border border-surface-border bg-surface-muted p-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-text-muted">اسم المستخدم</span>
                <span className="font-semibold text-text-main" dir="ltr">
                  {result.username || "-"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-muted">كلمة المرور المؤقتة</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-text-main tracking-widest" dir="ltr">
                    {result.temporaryPassword}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="text-primary hover:text-primary/80 p-1 rounded-lg transition-colors"
                    title="نسخ"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-all"
            >
              تم
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
