import { BadgeCheck } from "@/components/icons";
import { getStudentSubscriptionTypeName } from "../../constants/studentSubscriptionType";
import RowActions from "./RowActions";
import StatusBadge from "./StatusBadge";

const COLUMNS = [
  "الطالب",
  "رقم الهاتف",
  "رقم هاتف ولي الأمر",
  "المجموعة",
  "تاريخ الانضمام",
  "نوع الاشتراك",
  "الحالة",
  "",
];

export default function StudentTable({
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
    <div
      data-testid="students-table"
      className="hidden overflow-x-auto md:block"
    >
      <table className="w-full text-right text-sm">
        <caption className="sr-only">قائمة الطلاب</caption>
        <thead className="sticky top-0 z-10 bg-surface-muted">
          <tr>
            {COLUMNS.map((heading, index) => (
              <th
                key={index}
                scope="col"
                className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-text-muted"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {students.map((student) => (
            <tr
              key={student.id}
              className="border-t border-surface-border transition-colors hover:bg-surface-muted/70"
            >
              <td className="px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-text-main">
                    {student.fullName}
                  </span>

                  {showPayment && student.isPaid && (
                    <BadgeCheck
                      size={18}
                      className="text-status-success"
                      aria-label="تم الدفع"
                    />
                  )}
                </div>
              </td>
              <td
                dir="ltr"
                className="whitespace-nowrap px-5 py-3.5 text-start text-text-muted"
              >
                {student.phone}
              </td>
              <td
                dir="ltr"
                className="whitespace-nowrap px-5 py-3.5 text-start text-text-muted"
              >
                {student.phoneParent}
              </td>
              <td className="whitespace-nowrap px-5 py-3.5 text-text-main">
                {student.groupName}
              </td>
              <td className="whitespace-nowrap px-5 py-3.5 text-text-main">
                {new Date(student.createdAt).toLocaleDateString("ar-EG")}
              </td>
              <td className="whitespace-nowrap px-5 py-3.5 text-text-main">
                {getStudentSubscriptionTypeName(student.subscriptionType)}
              </td>
              <td className="whitespace-nowrap px-5 py-3.5">
                <StatusBadge status={student.isActive} />
              </td>
              <td className="whitespace-nowrap px-5 py-3.5">
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
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
