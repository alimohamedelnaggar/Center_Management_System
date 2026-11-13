import { AlertTriangle, Loader2, X } from "@/components/icons";

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "تأكيد الحذف",
  message = "هل أنت متأكد من تنفيذ هذا الإجراء؟ لا يمكن التراجع عنه.",
  details = null,
  confirmText = "حذف",
  cancelText = "إلغاء",
  loading = false,
}) {
  if (!isOpen) return null;

  return (
    <div
      data-testid="confirm-modal"
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
    >
      <div className="fixed inset-0" onClick={loading ? null : onClose} />

      <div className="relative z-10 max-h-[calc(100dvh-2rem)] w-full max-w-md space-y-4 overflow-y-auto rounded-2xl border border-surface-border bg-surface-card p-6 shadow-xl">
        <button
          onClick={onClose}
          disabled={loading}
          aria-label="إغلاق"
          className="absolute top-2 left-2 inline-flex h-11 w-11 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-muted hover:text-text-main"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-start gap-3 pe-8">
          <div className="p-3 bg-status-danger-bg text-status-danger rounded-xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-text-main">{title}</h3>
            <p className="mt-0.5 text-sm text-text-muted">{message}</p>
          </div>
        </div>

        {Array.isArray(details) && details.length > 0 && (
          <div className="p-3 rounded-xl bg-surface-muted border border-surface-border space-y-1.5">
            {details.map((detail) => (
              <div
                key={detail.label}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="text-text-muted">{detail.label}</span>
                <span className="font-bold text-text-main">
                  {detail.value}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-bold text-text-muted transition-colors hover:bg-surface-muted"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-status-danger px-4 text-sm font-bold text-text-inverse shadow-sm transition-all hover:opacity-90 disabled:opacity-50"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
