import { Phone } from "@/components/icons";
import { getStudentSubscriptionTypeName } from "../../constants/studentSubscriptionType";
import RowActions from "./RowActions";
import StatusBadge from "./StatusBadge";

export default function StudentCardList({
  students,
  onView,
  onEdit,
  onDelete,
  onPayment,
  onActive,
  onCreateParentAccount,
  showPayment = true,
}) {
  return (
    <div className="divide-y divide-surface-border md:hidden">
      {students.map((s) => (
        <div key={s.id} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div>
                <p className="font-medium text-text-main">{s.fullName}</p>
                <p className="text-xs text-text-muted">{s.groupName}</p>
              </div>
            </div>
            <StatusBadge status={s.isActive} />
            <span className="text-xs text-text-muted">
              {getStudentSubscriptionTypeName(s.subscriptionType)}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-1.5 text-text-muted">
              <Phone className="h-3.5 w-3.5" />
              {s.phone}
            </div>
            <div className="flex items-center gap-1.5 text-text-muted">
              <Phone className="h-3.5 w-3.5" />
              {s.phoneParent}
              <span className="text-text-muted/70">(ولي الأمر)</span>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <RowActions
              student={s}
              name={s.fullName}
              onView={onView}
              onEdit={onEdit}
              onDelete={onDelete}
              onPayment={onPayment}
              onActive={onActive}
              onCreateParentAccount={onCreateParentAccount}
              showPayment={showPayment}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
