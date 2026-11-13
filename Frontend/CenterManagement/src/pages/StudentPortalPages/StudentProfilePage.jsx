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
import PageHeader from "../../components/ui/PageHeader";
import {
  PortalEmpty,
  PortalLoading,
  PortalStatus,
} from "../../components/portal/PortalUI";
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

function InfoItem({ icon: Icon, label, value, ltr = false }) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-control bg-surface-muted/60 px-3 py-3">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-surface-card text-text-muted">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-text-muted">{label}</p>
        <p
          className="mt-0.5 break-words text-base font-bold text-text-main"
          dir={ltr ? "ltr" : undefined}
        >
          {value || "-"}
        </p>
      </div>
    </div>
  );
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
    <div data-testid="student-profile-page" className="p-4 font-sans md:p-6">
      <PageHeader
        className="mb-5"
        title="الملف الشخصي"
        subtitle="بياناتك واشتراكاتك"
      />

      {loading && <PortalLoading icon={Loader2} />}

      {!loading && profile && (
        <div className="space-y-5">
          <section className="rounded-card border border-surface-border bg-surface-card p-5 shadow-soft sm:p-6">
            <div className="mb-5 flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-primary">
                <UserRound className="h-8 w-8" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h2 className="break-words text-xl font-extrabold text-text-main">
                  {profile.fullName}
                </h2>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <PortalStatus tone={profile.isActive ? "success" : "danger"}>
                    {profile.isActive ? "نشط" : "غير نشط"}
                  </PortalStatus>
                  <PortalStatus tone={profile.isPaid ? "success" : "warning"}>
                    {profile.isPaid ? "مدفوع" : "غير مدفوع"}
                  </PortalStatus>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <InfoItem
                icon={Phone}
                label="الهاتف"
                value={profile.phone}
                ltr
              />
              <InfoItem
                icon={Phone}
                label="هاتف ولي الأمر"
                value={profile.parentPhoneNumber}
                ltr
              />
              <InfoItem
                icon={BadgeDollarSign}
                label="الاشتراك"
                value={profile.subscriptionTypeName}
              />
              <InfoItem icon={School} label="المدرسة" value={profile.school} />
            </div>
          </section>

          <div>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold text-text-main">
              <GraduationCap className="h-5 w-5 text-primary" aria-hidden="true" />
              اشتراكاتي
            </h2>

            {profile.subscriptions?.length ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {profile.subscriptions.map((sub) => (
                  <article
                    key={sub.groupId}
                    data-testid="student-subscription-card"
                    className="rounded-card border border-surface-border bg-surface-card p-4 shadow-soft"
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <p className="min-w-0 break-words text-base font-bold text-text-main">
                        {sub.groupName}
                      </p>
                      <PortalStatus tone={sub.isActive ? "success" : "neutral"}>
                        {sub.isActive ? "نشط" : "منتهي"}
                      </PortalStatus>
                    </div>

                    <dl className="space-y-2 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <dt className="text-text-muted">الرسوم الشهرية</dt>
                        <dd className="font-bold tabular-nums text-text-main">
                          {Number(sub.monthlyPrice ?? 0).toLocaleString("ar-EG")} ج.م
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <dt className="text-text-muted">عدد الحصص شهرياً</dt>
                        <dd className="font-bold tabular-nums text-text-main">
                          {sub.sessionsPerMonth}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <dt className="inline-flex items-center gap-1 text-text-muted">
                          <CalendarCheck className="h-3.5 w-3.5" aria-hidden="true" />
                          تاريخ الانضمام
                        </dt>
                        <dd className="font-bold text-text-main">
                          {formatDate(sub.joinDate)}
                        </dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
            ) : (
              <PortalEmpty icon={GraduationCap} title="لا توجد اشتراكات." />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
