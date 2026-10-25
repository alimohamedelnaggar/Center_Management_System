import { useEffect, useState } from "react";
import { BadgeDollarSign, Loader2, RefreshCw, Wallet } from "@/components/icons";
import toast from "react-hot-toast";
import { studentPortalService } from "../../services/studentPortalService";

function formatMoney(value) {
  const num = Number(value ?? 0);
  return `${num.toLocaleString("ar-EG", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ج.م`;
}

function formatDate(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "-";
  }
}

function formatPeriod(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
    });
  } catch {
    return "-";
  }
}

const STATUS_STYLES = {
  0: "bg-status-danger-bg text-status-danger",
  1: "bg-status-warning-bg text-status-warning",
  2: "bg-status-success-bg text-status-success",
  3: "bg-status-danger-bg text-status-danger",
  4: "bg-surface-muted text-text-muted",
};

export default function StudentPaymentsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const res = await studentPortalService.getPayments();
      if (res?.succeeded) {
        setData(res.data);
      } else {
        toast.error(res?.message ?? "فشل في تحميل المدفوعات");
      }
    } catch {
      toast.error("فشل في تحميل المدفوعات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const payments = data?.payments ?? [];

  return (
    <div className="p-4 md:p-6 font-sans">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-main">المدفوعات</h1>
          <p className="mt-0.5 text-sm text-text-muted">
            سجل مدفوعاتك والمبالغ المستحقة
          </p>
        </div>
        <button
          type="button"
          onClick={loadPayments}
          className="inline-flex items-center gap-2 rounded-lg border border-surface-border bg-surface-card px-4 py-2 text-sm font-medium text-text-main transition hover:bg-surface-muted"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          تحديث
        </button>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-surface-border bg-surface-card p-4 shadow-sm">
          <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-status-success-bg text-status-success">
            <Wallet className="h-4 w-4" />
          </div>
          <p className="text-lg font-bold text-text-main">
            {formatMoney(data?.totalPaid)}
          </p>
          <p className="mt-0.5 text-xs text-text-muted">إجمالي المدفوع</p>
        </div>

        <div className="rounded-xl border border-surface-border bg-surface-card p-4 shadow-sm">
          <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-status-danger-bg text-status-danger">
            <BadgeDollarSign className="h-4 w-4" />
          </div>
          <p className="text-2xl font-bold text-text-main">
            {formatMoney(data?.totalDue)}
          </p>
          <p className="mt-0.5 text-xs text-text-muted">المتبقي</p>
        </div>

        <div className="rounded-xl border border-surface-border bg-surface-card p-4 shadow-sm">
          <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary-subtle text-primary">
            <Wallet className="h-4 w-4" />
          </div>
          <p className="text-2xl font-bold text-text-main">
            {data?.paymentsCount ?? 0}
          </p>
          <p className="mt-0.5 text-xs text-text-muted">عدد الدفعات</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-surface-border bg-surface-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-border bg-surface-muted text-xs text-text-muted">
                <th className="px-4 py-3 text-right font-medium">التاريخ</th>
                <th className="px-4 py-3 text-right font-medium">المجموعة</th>
                <th className="px-4 py-3 text-right font-medium">المجموع المستلم</th>
                <th className="px-4 py-3 text-right font-medium">الشهر</th>
                <th className="px-4 py-3 text-right font-medium">المبلغ</th>
                <th className="px-4 py-3 text-right font-medium">المدفوع</th>
                <th className="px-4 py-3 text-right font-medium">المتبقي</th>
                <th className="px-4 py-3 text-right font-medium">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {!loading &&
                payments.map((item, idx) => (
                  <tr
                    key={`${item.paymentId}-${idx}`}
                    className="border-b border-surface-border last:border-0 hover:bg-surface-muted/60"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-text-main">
                      {formatDate(item.paymentDate)}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-main">
                      {item.groupName}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-main">
                      {item.receivedByName || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-main">
                      {item.receivedByName || "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-text-muted">
                      {formatPeriod(item.billingPeriod)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-text-main">
                      {formatMoney(item.totalAmount)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-status-success">
                      {formatMoney(item.paidAmount)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-status-danger">
                      {formatMoney(item.remainingAmount)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                          STATUS_STYLES[item.status] ??
                          "bg-surface-muted text-text-muted"
                        }`}
                      >
                        <BadgeDollarSign className="h-3.5 w-3.5" />
                        {item.statusName}
                      </span>
                    </td>
                  </tr>
                ))}

              {!loading && !payments.length && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-sm text-text-muted"
                  >
                    <span className="inline-flex flex-col items-center gap-2">
                      <Wallet className="h-6 w-6" />
                      لا توجد مدفوعات مسجلة بعد.
                    </span>
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-sm text-text-muted"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      جاري التحميل...
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
