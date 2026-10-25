import { BadgeCheck } from "@/components/icons";
import { getStudentSubscriptionTypeName } from "../../constants/studentSubscriptionType";
import RowActions from "./RowActions";
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
  name,
}) {
  return (
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full text-right text-sm">
        <thead className="sticky top-0 z-10 bg-surface-muted">
          <tr>
            {COLUMNS.map((h, idx) => (
              <th
                key={idx}
                scope="col"
                className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-text-muted"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr
              key={s.id}
              className="border-t border-surface-border transition-colors hover:bg-surface-muted"
            >
              <td className="px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-text-main">
                    {s.fullName}
                  </span>

                  {showPayment && s.isPaid && (
                    <BadgeCheck
                      size={18}
                      className="text-green-500"
                      aria-label="تم الدفع"
                    />
                  )}
                </div>
              </td>
              <td className="whitespace-nowrap px-5 py-3.5 text-text-muted">
                {s.phone}
              </td>
              <td className="whitespace-nowrap px-5 py-3.5 text-text-muted">
                {s.phoneParent}
              </td>
              <td className="whitespace-nowrap px-5 py-3.5 text-text-main">
                {s.groupName}
              </td>
              <td className="whitespace-nowrap px-5 py-3.5 text-text-main">
                {new Date(s.createdAt).toLocaleDateString("ar-EG")}
              </td>
              <td className="whitespace-nowrap px-5 py-3.5">
                {getStudentSubscriptionTypeName(s.subscriptionType)}
              </td>
              <td className="whitespace-nowrap px-5 py-3.5">
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
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
