import { useEffect, useState } from "react";
import Barcode from "./Barcode";
import {
  buildStudentCardUrl,
  isStudentCode,
  toQrDataUrl,
} from "../../utils/qrCode";

import { STUDENT_SUBSCRIPTION_TYPES } from "../../constants/studentSubscriptionType";

const SUBSCRIPTION_LABELS = {
  [STUDENT_SUBSCRIPTION_TYPES.SESSION]: "اشتراك حصص",
  [STUDENT_SUBSCRIPTION_TYPES.MONTH]: "اشتراك شهري",
};

const PAYMENT_LABELS = {
  true: "مدفوع",
  false: "غير مدفوع",
};

export default function StudentCard({ student, cardUrl, className = "" }) {
  const [qrImage, setQrImage] = useState("");

  useEffect(() => {
    let active = true;

    if (!cardUrl) {
      setQrImage("");
      return undefined;
    }

    toQrDataUrl(cardUrl, { size: 420, margin: 1 })
      .then((url) => {
        if (active) setQrImage(url);
      })
      .catch(() => {
        if (active) setQrImage("");
      });

    return () => {
      active = false;
    };
  }, [cardUrl]);

  const phone = student.phone || student.phoneNumber;
  const parentPhone = student.phoneParent || student.parentPhoneNumber;
  const subscription = SUBSCRIPTION_LABELS[student.subscriptionType] ?? "—";
  const payment =
    PAYMENT_LABELS[String(student.isPaid ?? false)] ?? "غير مدفوع";
  const joinedAt = student.createdAt
    ? new Date(student.createdAt).toLocaleDateString("en-GB")
    : "—";

  return (
    <div
      className={`flex flex-col rounded-2xl border border-surface-border bg-white text-slate-900 shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between rounded-t-2xl bg-primary px-4 py-2.5 text-white">
        <span className="text-xs font-bold">كارت الطالب</span>
        <span className="text-[10px] opacity-90">نظام الإدارة</span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary-subtle text-lg font-bold text-primary">
            {student.fullName?.trim()?.charAt(0) || "؟"}
          </div>

          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm font-bold leading-snug">
              {student.fullName}
            </p>
            <p className="mt-0.5 line-clamp-1 text-[10px] text-slate-500">
              {student.groupName || "بدون مجموعة"}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-600">
                {subscription}
              </span>
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-600">
                {payment}
              </span>
              <span
                className={`rounded-md px-1.5 py-0.5 text-[9px] font-semibold ${
                  student.isActive === false
                    ? "bg-red-50 text-red-600"
                    : "bg-emerald-50 text-emerald-600"
                }`}
              >
                {student.isActive === false ? "غير نشط" : "نشط"}
              </span>
            </div>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 rounded-xl bg-slate-50 p-2.5 text-[10px]">
          <div>
            <dt className="text-slate-400">المجموعة</dt>
            <dd className="truncate font-semibold text-slate-700">
              {student.groupName || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-400">المدرسة</dt>
            <dd className="truncate font-semibold text-slate-700">
              {student.school || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-400">هاتف الطالب</dt>
            <dd dir="ltr" className="truncate text-right font-semibold text-slate-700">
              {phone || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-400">هاتف ولي الأمر</dt>
            <dd dir="ltr" className="truncate text-right font-semibold text-slate-700">
              {parentPhone || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-400">تاريخ الالتحاق</dt>
            <dd dir="ltr" className="truncate text-right font-semibold text-slate-700">
              {joinedAt}
            </dd>
          </div>
          <div>
            <dt className="text-slate-400">الكود</dt>
            <dd
              dir="ltr"
              className="truncate text-right font-mono font-bold tracking-wider text-slate-800"
            >
              {student.qrCode || "—"}
            </dd>
          </div>
        </dl>

        <div className="mt-auto flex flex-col items-center gap-2 border-t border-dashed border-slate-200 pt-3">
          {qrImage ? (
            <img
              src={qrImage}
              alt={student.qrCode || "QR"}
              className="h-28 w-28"
            />
          ) : (
            <div className="flex h-28 w-28 items-center justify-center rounded-xl border border-dashed border-slate-300 text-[9px] text-slate-400">
              بدون كود
            </div>
          )}

          <p className="text-center text-[9px] leading-relaxed text-slate-500">
            امسح الكود بكاميرا الهاتف لمتابعة الحضور والغياب والدرجات
          </p>

          <div className="w-full">
            <Barcode
              value={isStudentCode(student.qrCode) ? student.qrCode : ""}
              className="h-12 w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
