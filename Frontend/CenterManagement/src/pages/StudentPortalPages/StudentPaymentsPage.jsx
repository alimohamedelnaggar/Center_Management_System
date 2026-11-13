import { useEffect, useState } from "react";
import { BadgeDollarSign, Loader2, RefreshCw, Wallet } from "@/components/icons";
import toast from "react-hot-toast";
import Button from "../../components/ui/Button";
import PageHeader from "../../components/ui/PageHeader";
import {
  PortalEmpty,
  PortalLoading,
  PortalStat,
  PortalStatus,
} from "../../components/portal/PortalUI";
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

const STATUS_TONES = {
  0: "danger",
  1: "warning",
  2: "success",
  3: "danger",
  4: "neutral",
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
    <div data-testid="student-payments-page" className="p-4 font-sans md:p-6">
      <PageHeader
        className="mb-5"
        title="المدفوعات"
        subtitle="سجل مدفوعاتك والمبالغ المستحقة"
        actions={
          <Button variant="secondary" onClick={loadPayments} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <PortalStat
          icon={Wallet}
          label="إجمالي المدفوع"
          value={formatMoney(data?.totalPaid)}
          tone="success"
          testId="student-payments-paid"
        />
        <PortalStat
          icon={BadgeDollarSign}
          label="المتبقي"
          value={formatMoney(data?.totalDue)}
          tone="danger"
          testId="student-payments-due"
        />
        <PortalStat
          icon={Wallet}
          label="عدد الدفعات"
          value={data?.paymentsCount ?? 0}
          tone="primary"
          testId="student-payments-count"
        />
      </div>

      {loading && <PortalLoading icon={Loader2} />}

      {!loading && payments.length === 0 && (
        <PortalEmpty icon={Wallet} title="لا توجد مدفوعات مسجلة بعد." />
      )}

      {!loading && payments.length > 0 && (
        <>
          <div className="grid gap-3 lg:hidden">
            {payments.map((item, idx) => (
              <article
                key={`${item.paymentId}-${idx}`}
                data-testid="student-payment-card"
                className="rounded-card border border-surface-border bg-surface-card p-4 shadow-soft"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-base font-bold text-text-main">
                      {formatDate(item.paymentDate)}
                    </p>
                    <p className="mt-1 break-words text-sm text-text-muted">
                      {item.groupName}
                    </p>
                    <p className="mt-0.5 text-xs text-text-muted">
                      {formatPeriod(item.billingPeriod)}
                    </p>
                  </div>
                  <PortalStatus tone={STATUS_TONES[item.status] ?? "neutral"}>
                    <BadgeDollarSign className="h-3.5 w-3.5" />
                    {item.statusName}
                  </PortalStatus>
                </div>

                <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-surface-border pt-3 text-sm">
                  <div>
                    <dt className="text-xs text-text-muted">المبلغ</dt>
                    <dd className="mt-0.5 font-bold tabular-nums text-text-main">
                      {formatMoney(item.totalAmount)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-text-muted">المدفوع</dt>
                    <dd className="mt-0.5 font-bold tabular-nums text-status-success">
                      {formatMoney(item.paidAmount)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-text-muted">المتبقي</dt>
                    <dd className="mt-0.5 font-bold tabular-nums text-status-danger">
                      {formatMoney(item.remainingAmount)}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-card border border-surface-border bg-surface-card shadow-soft lg:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-border bg-surface-muted text-sm text-text-muted">
                    <th className="px-4 py-3 text-right font-medium">التاريخ</th>
                    <th className="px-4 py-3 text-right font-medium">المجموعة</th>
                    <th className="px-4 py-3 text-right font-medium">الشهر</th>
                    <th className="px-4 py-3 text-right font-medium">المبلغ</th>
                    <th className="px-4 py-3 text-right font-medium">المدفوع</th>
                    <th className="px-4 py-3 text-right font-medium">المتبقي</th>
                    <th className="px-4 py-3 text-right font-medium">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((item, idx) => (
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
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-text-muted">
                        {formatPeriod(item.billingPeriod)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold tabular-nums text-text-main">
                        {formatMoney(item.totalAmount)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm tabular-nums text-status-success">
                        {formatMoney(item.paidAmount)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm tabular-nums text-status-danger">
                        {formatMoney(item.remainingAmount)}
                      </td>
                      <td className="px-4 py-3">
                        <PortalStatus tone={STATUS_TONES[item.status] ?? "neutral"}>
                          <BadgeDollarSign className="h-3.5 w-3.5" />
                          {item.statusName}
                        </PortalStatus>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
