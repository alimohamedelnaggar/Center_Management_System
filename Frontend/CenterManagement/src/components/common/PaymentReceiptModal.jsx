import { useEffect, useState } from "react";
import { Printer, X } from "@/components/icons";
import toast from "react-hot-toast";

import { financeService } from "../../services/financeService";
import { formatCurrency } from "../../utils/formatCurrency";
import { resolveImageUrl } from "../../utils/media";
import { formatAmountInWords } from "../../utils/numberToArabicWords";

const MONTHS_AR = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

/**
 * Printable payment receipt. Renders the receipt that the API returns
 * (GET /Payments/{id}/receipt) and prints only the receipt area via the
 * global "@media print" rules (the body gets the "receipt-printing" class).
 */
export default function PaymentReceiptModal({ isOpen, paymentId, onClose }) {
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !paymentId) return;

    let active = true;
    setLoading(true);
    setReceipt(null);
    setError(null);

    financeService
      .getPaymentReceipt(paymentId)
      .then((res) => {
        if (!active) return;
        setReceipt(res?.data ?? null);
      })
      .catch((err) => {
        if (!active) return;
        const message =
          err?.response?.data?.message || "تعذر تحميل الإيصال.";
        setError(message);
        toast.error(message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, paymentId]);

  // Isolate the receipt when printing: the global print style hides every
  // element except #receipt-print-root while this class is present.
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add("receipt-printing");
    } else {
      document.body.classList.remove("receipt-printing");
    }

    return () => document.body.classList.remove("receipt-printing");
  }, [isOpen]);

  if (!isOpen) return null;

  const receiptNumberText =
    receipt?.receiptNumber !== null && receipt?.receiptNumber !== undefined
      ? `R-${String(receipt.receiptNumber).padStart(6, "0")}`
      : "-";

  const isMonthly = receipt?.subscriptionType === 2;

  const periodText = isMonthly
    ? receipt?.billingMonth
      ? `شهر ${MONTHS_AR[receipt.billingMonth - 1]} ${receipt.billingYear}`
      : "-"
    : "حصة";

  const logoUrl = resolveImageUrl(receipt?.centerLogoUrl);

  const amountWords = formatAmountInWords(receipt?.amount);

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-start justify-center overflow-y-auto bg-black/40 backdrop-blur-xs p-4 dir-rtl text-right"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md my-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toolbar (hidden while printing) */}
        <div className="no-print mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => window.print()}
            disabled={loading || !receipt}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
          >
            <Printer className="h-4 w-4" />
            طباعة
          </button>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-gray-600 shadow-sm border border-gray-200 hover:bg-gray-50"
          >
            <X className="h-4 w-4" />
            إغلاق
          </button>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white p-12 text-center text-sm font-medium text-gray-500 shadow-lg">
            جاري تحميل الإيصال...
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-white p-12 text-center text-sm font-medium text-red-600 shadow-lg">
            {error}
          </div>
        ) : (
          <div
            id="receipt-print-root"
            className="print-area mx-auto w-full max-w-[80mm] bg-white p-6 text-black shadow-lg"
            dir="rtl"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b-2 border-dashed border-gray-300 pb-3">
              <div className="flex items-center gap-2">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={receipt?.centerName || "logo"}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : null}

                <div>
                  <div className="text-base font-bold">
                    {receipt?.centerName || "-"}
                  </div>

                  {receipt?.centerPhone ? (
                    <div className="text-xs text-gray-600">
                      {receipt.centerPhone}
                    </div>
                  ) : null}

                  {receipt?.centerAddress ? (
                    <div className="text-[11px] text-gray-500">
                      {receipt.centerAddress}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Title */}
            <div className="my-3 text-center">
              <div className="text-sm font-bold underline">
                إيصال استلام نقدية
              </div>
              <div className="mt-1 text-xs text-gray-700">
                رقم الإيصال:{" "}
                <span className="font-bold">{receiptNumberText}</span>
              </div>
            </div>

            {/* Details */}
            <table className="w-full text-xs">
              <tbody className="[&>tr>td]:py-1.5 [&>tr>td]:align-top">
                <tr>
                  <td className="w-28 font-bold text-gray-600">
                    اسم الطالب:
                  </td>
                  <td>{receipt?.studentName || "-"}</td>
                </tr>

                <tr>
                  <td className="font-bold text-gray-600">المجموعة:</td>
                  <td>{receipt?.groupName || "-"}</td>
                </tr>

                {receipt?.teacherName ? (
                  <tr>
                    <td className="font-bold text-gray-600">المدرس:</td>
                    <td>{receipt.teacherName}</td>
                  </tr>
                ) : null}

                <tr>
                  <td className="font-bold text-gray-600">نوع الدفع:</td>
                  <td>{isMonthly ? "شهري" : "بالحصة"}</td>
                </tr>

                {isMonthly ? (
                  <tr>
                    <td className="font-bold text-gray-600">
                      الفترة المستحقة:
                    </td>
                    <td>{periodText}</td>
                  </tr>
                ) : null}

                <tr>
                  <td className="font-bold text-gray-600">المبلغ:</td>
                  <td className="font-bold">
                    {formatCurrency(receipt?.amount)}
                  </td>
                </tr>

                {amountWords ? (
                  <tr>
                    <td className="font-bold text-gray-600">المبلغ كتابةً:</td>
                    <td>{amountWords}</td>
                  </tr>
                ) : null}

                <tr>
                  <td className="font-bold text-gray-600">تاريخ الدفع:</td>
                  <td>
                    {receipt?.paymentDate
                      ? new Date(receipt.paymentDate).toLocaleString("ar-EG")
                      : "-"}
                  </td>
                </tr>

                <tr>
                  <td className="font-bold text-gray-600">استلم بواسطة:</td>
                  <td>{receipt?.receivedByName || "-"}</td>
                </tr>
              </tbody>
            </table>

            {/* Signature */}
            <div className="mt-8 flex items-end justify-between pt-2">
              <div className="text-xs text-gray-600">توقيع المستلم</div>
              <div className="w-32 border-b border-gray-400" />
            </div>

            <div className="mt-4 text-center text-[10px] text-gray-400">
              هذا الإيصال يُثبت استلام المبلغ الموضح أعلاه.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
