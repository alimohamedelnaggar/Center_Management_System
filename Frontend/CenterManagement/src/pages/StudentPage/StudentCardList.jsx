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
    <div data-testid="students-cards" className="divide-y divide-surface-border md:hidden">
      {students.map((student) => (
        <article key={student.id} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-bold text-text-main">
                {student.fullName}
              </p>
              <p className="mt-0.5 truncate text-xs text-text-muted">
                {student.groupName}
                <span aria-hidden="true"> · </span>
                {getStudentSubscriptionTypeName(student.subscriptionType)}
              </p>
            </div>
            <StatusBadge status={student.isActive} />
          </div>

          <dl className="mt-3 grid grid-cols-1 gap-2 text-xs min-[420px]:grid-cols-2">
            <div className="flex min-w-0 items-center gap-1.5 rounded-control bg-surface-muted/70 px-2.5 py-2 text-text-muted">
              <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <dt className="sr-only">رقم هاتف الطالب</dt>
              <dd dir="ltr" className="truncate text-start">
                {student.phone}
              </dd>
            </div>
            <div className="flex min-w-0 items-center gap-1.5 rounded-control bg-surface-muted/70 px-2.5 py-2 text-text-muted">
              <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <dt className="sr-only">هاتف ولي الأمر</dt>
              <dd dir="ltr" className="truncate text-start">
                {student.phoneParent}
              </dd>
              <span className="shrink-0 text-text-muted/70">(ولي الأمر)</span>
            </div>
          </dl>

          <div className="mt-3 flex items-center justify-end">
            <RowActions
              student={student}
              name={student.fullName}
              onView={onView}
              onEdit={onEdit}
              onDelete={onDelete}
              onPayment={onPayment}
              onActive={onActive}
              onCreateParentAccount={onCreateParentAccount}
              showPayment={showPayment}
            />
          </div>
        </article>
      ))}
    </div>
  );
}
