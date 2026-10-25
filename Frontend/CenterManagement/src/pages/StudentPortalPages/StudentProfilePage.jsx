import { useEffect, useState } from "react";
import {
  BadgeDollarSign,
  CalendarCheck,
  GraduationCap,
  Loader2,
  Phone,
  School,
  UserRound,
} from "@/components/icons";
import toast from "react-hot-toast";
import { studentPortalService } from "../../services/studentPortalService";

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

export default function StudentProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await studentPortalService.getProfile();
        if (active && res?.succeeded) {
          setProfile(res.data);
        } else if (active) {
          toast.error(res?.message ?? "فشل في تحميل الملف الشخصي");
        }
      } catch {
        toast.error("فشل في تحميل الملف الشخصي");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="p-4 md:p-6 font-sans">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-text-main">الملف الشخصي</h1>
        <p className="mt-0.5 text-sm text-text-muted">بياناتك واشتراكاتك</p>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-surface-border bg-surface-card py-16 text-sm text-text-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
          جاري التحميل...
        </div>
      )}

      {!loading && profile && (
        <div className="space-y-5">
          <div className="rounded-xl border border-surface-border bg-surface-card p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-subtle text-primary">
                <UserRound className="h-7 w-7" />
              </div>
              <div>
                <p className="text-lg font-bold text-text-main">
                  {profile.fullName}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                      profile.isActive
                        ? "bg-status-success-bg text-status-success"
                        : "bg-status-danger-bg text-status-danger"
                    }`}
                  >
                    {profile.isActive ? "نشط" : "غير نشط"}
                  </span>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                      profile.isPaid
                        ? "bg-status-success-bg text-status-success"
                        : "bg-status-warning-bg text-status-warning"
                    }`}
                  >
                    {profile.isPaid ? "مدفوع" : "غير مدفوع"}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-text-muted" />
                <span dir="ltr" className="text-text-main">
                  {profile.phone || "-"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-text-muted" />
                <span dir="ltr" className="text-text-main">
                  {profile.parentPhoneNumber || "-"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <BadgeDollarSign className="h-4 w-4 text-text-muted" />
                <span className="text-text-main">
                  {profile.subscriptionTypeName || "-"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <School className="h-4 w-4 text-text-muted" />
                <span className="text-text-main">{profile.school || "-"}</span>
              </div>
            </div>
          </div>

          <div>
            <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-text-main">
              <GraduationCap className="h-5 w-5 text-primary" />
              اشتراكاتي
            </h2>

            {profile.subscriptions?.length ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {profile.subscriptions.map((sub) => (
                  <div
                    key={sub.groupId}
                    className="rounded-xl border border-surface-border bg-surface-card p-4 shadow-sm"
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <p className="text-sm font-bold text-text-main">
                        {sub.groupName}
                      </p>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                          sub.isActive
                            ? "bg-status-success-bg text-status-success"
                            : "bg-surface-muted text-text-muted"
                        }`}
                      >
                        {sub.isActive ? "نشط" : "منتهي"}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-text-muted">
                      <div className="flex items-center justify-between">
                        <span>الرسوم الشهرية</span>
                        <span className="font-semibold text-text-main">
                          {Number(sub.monthlyPrice ?? 0).toLocaleString("ar-EG")} ج.م
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>عدد الحصص شهرياً</span>
                        <span className="font-semibold text-text-main">
                          {sub.sessionsPerMonth}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1">
                          <CalendarCheck className="h-3.5 w-3.5" />
                          تاريخ الانضمام
                        </span>
                        <span className="font-semibold text-text-main">
                          {formatDate(sub.joinDate)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-surface-border bg-surface-card p-6 text-center text-sm text-text-muted">
                لا توجد اشتراكات.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
