import {
  Activity,
  GraduationCap,
  QrCode,
  ShieldCheck,
  Wallet,
} from "@/components/icons";

const HIGHLIGHTS = [
  {
    icon: QrCode,
    title: "حضور بالـ QR",
    desc: "تسجيل حضور الطلاب بمسح سريع ودقيق.",
  },
  {
    icon: Wallet,
    title: "تتبّع مالي",
    desc: "متابعة الاشتراكات والمدفوعات في مكان واحد.",
  },
  {
    icon: GraduationCap,
    title: "امتحانات أونلاين",
    desc: "إنشاء وإدارة الاختبارات ونتائجها بسهولة.",
  },
];

/**
 * Compact ~96px brand lockup shown above the form on phones. On desktop the
 * same lockup lives inside the BrandPanel, so the logo appears exactly once.
 * The fixed theme toggle sits over the inline-end corner, hence `pe-16`.
 */
export function BrandHeader() {
  return (
    <header
      data-testid="login-brand-header"
      className="login-mobile-brand relative z-10 flex h-24 shrink-0 items-center gap-3 border-b border-surface-border bg-surface-bg/80 px-5 pe-16 backdrop-blur md:hidden"
    >
      <img
        src="/logo.png"
        alt=""
        width="36"
        height="36"
        className="h-9 w-9 shrink-0 rounded-control object-contain"
      />
      <div className="min-w-0">
        <p className="login-mobile-brand-title break-words text-sm font-bold leading-5 text-text-main">
          نظام إدارة السنتر
        </p>
        <p className="login-mobile-brand-sub break-words text-xs leading-4 text-text-muted">
          Center Management System
        </p>
      </div>
    </header>
  );
}

export default function BrandPanel() {
  return (
    <aside
      data-testid="login-brand-panel"
      className="login-brand-panel relative hidden w-1/2 overflow-hidden bg-gradient-to-br from-primary via-primary to-primary-hover text-primary-contrast md:flex dark:from-primary-subtle dark:via-primary-subtle dark:to-surface-card dark:text-text-main"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-primary-contrast/10 dark:bg-primary/10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-primary-contrast/10 dark:bg-primary/10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-1/3 w-px bg-primary-contrast/20 dark:bg-primary/20"
      />

      <div className="relative z-10 flex w-full flex-col justify-between gap-8 p-8 lg:p-10 xl:p-12">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-card bg-primary-contrast/20 p-2 dark:bg-primary/20">
            <img
              src="/logo.png"
              alt=""
              width="40"
              height="40"
              className="h-9 w-9 object-contain"
            />
          </span>
          <div className="min-w-0">
            <p className="break-words text-sm font-bold">نظام إدارة السنتر</p>
            <p className="break-words text-xs font-semibold opacity-90">
              Center Management System
            </p>
          </div>
        </div>

        <div className="max-w-xl">
          <p className="inline-flex items-center gap-2 rounded-pill bg-primary-contrast/10 px-3 py-1 text-sm font-bold dark:bg-primary/10">
            <Activity className="h-4 w-4" aria-hidden="true" />
            هوية B · نبض
          </p>

          <h2 className="mt-5 break-words text-3xl font-extrabold leading-[1.35] xl:text-4xl">
            كل ما يخص السنتر،
            <span className="text-secondary-light dark:text-secondary">
              {" "}
              في نبضة واحدة.
            </span>
          </h2>
          <p className="mt-3 max-w-lg break-words text-sm leading-7 opacity-95 xl:text-base">
            تابع الطلاب والحصص والاشتراكات من مكان واحد أنيق وسريع، مصمّم خصيصاً
            للمعلم والمساعدين.
          </p>

          <div className="mt-7 rounded-card border border-primary-contrast/20 bg-primary-contrast/10 p-4 dark:border-primary/20 dark:bg-primary/10">
            <div className="flex items-center justify-between gap-3 text-sm font-bold">
              <span>نبض الحضور والاشتراكات</span>
              <span className="h-2.5 w-2.5 rounded-full bg-secondary-light dark:bg-secondary" />
            </div>
            <svg
              viewBox="0 0 320 72"
              className="mt-2 h-16 w-full text-secondary-light dark:text-secondary"
              role="img"
              aria-label="خط نبض توضيحي"
              preserveAspectRatio="none"
            >
              <polyline
                points="0,50 46,50 64,22 84,62 104,38 122,50 176,50 194,30 212,58 230,44 246,50 320,50"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="mt-1 text-sm opacity-90">
              حضور · اشتراكات · امتحانات · تقارير
            </p>
          </div>
        </div>

        <ul className="grid gap-3">
          {HIGHLIGHTS.map(({ icon: Icon, title, desc }) => (
            <li key={title} className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-primary-contrast/20 dark:bg-primary/20">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="break-words text-sm font-bold">{title}</p>
                <p className="mt-0.5 break-words text-sm leading-6 opacity-90">
                  {desc}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2 border-t border-primary-contrast/20 pt-5 text-sm font-semibold dark:border-primary/20">
          <ShieldCheck className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span>وصول آمن ومشفّر</span>
        </div>
      </div>
    </aside>
  );
}
