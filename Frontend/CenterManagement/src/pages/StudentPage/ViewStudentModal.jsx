import {
  User,
  Phone,
  Users,
  ShieldCheck,
  CheckCircle2,
  XCircle,
} from "@/components/icons";
import AppModal from "../../components/ui/AppModal";

export default function ViewStudentModal({ open, onClose, student }) {
  if (!open || !student) return null;

  const footer = (
    <button
      type="button"
      onClick={onClose}
      data-testid="student-view-close"
      className="focus-ring inline-flex min-h-11 w-full items-center justify-center rounded-action bg-primary px-5 text-sm font-bold text-text-inverse shadow-sm transition-colors hover:bg-primary-hover"
    >
      إغلاق
    </button>
  );

  return (
    <AppModal
      open={open}
      onClose={onClose}
      testId="student-view-modal"
      title="بيانات الطالب"
      icon={User}
      footer={footer}
    >
      <div className="space-y-2.5">
        <InfoRow
          icon={<User className="h-4 w-4 text-primary" aria-hidden="true" />}
          title="الاسم"
          value={student.fullName}
          isBold
        />

        <InfoRow
          icon={<Phone className="h-4 w-4" aria-hidden="true" />}
          title="رقم الهاتف"
          value={student.phone || "غير محدد"}
        />

        <InfoRow
          icon={<Phone className="h-4 w-4" aria-hidden="true" />}
          title="هاتف ولي الأمر"
          value={student.phoneParent || "غير محدد"}
        />

        <InfoRow
          icon={<Users className="h-4 w-4" aria-hidden="true" />}
          title="المجموعة"
          value={student.groupName || "غير مسجل بمجموعة"}
        />

        <div className="flex items-center justify-between gap-3 rounded-control border border-surface-border bg-surface-bg p-3">
          <div className="flex items-center gap-2">
            <ShieldCheck
              className="h-4 w-4 text-text-muted"
              aria-hidden="true"
            />
            <span className="text-xs font-bold text-text-muted">
              حالة الطالب
            </span>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
              student.isActive
                ? "bg-status-success-bg text-status-success"
                : "bg-status-warning-bg text-status-warning"
            }`}
          >
            {student.isActive ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                نشط
              </>
            ) : (
              <>
                <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                غير نشط
              </>
            )}
          </span>
        </div>
      </div>
    </AppModal>
  );
}

function InfoRow({ icon, title, value, isBold = false }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-control border border-surface-border bg-surface-bg p-3">
      <div className="flex items-center gap-2 text-text-muted">
        {icon}
        <span className="text-xs font-bold">{title}</span>
      </div>
      <span
        className={`min-w-0 truncate text-sm ${
          isBold ? "font-bold text-primary" : "font-medium text-text-main"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
