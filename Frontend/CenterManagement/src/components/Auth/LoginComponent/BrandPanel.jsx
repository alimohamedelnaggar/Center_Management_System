import { GraduationCap, QrCode, ShieldCheck, Wallet } from "@/components/icons";

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

export function BrandHeader() {
  return (
    <div className="flex items-center gap-3 px-5 pt-6 md:hidden">
      <img src="/logo.png" alt="" width="36" height="36" className="h-9 w-9" />
      <div>
        <p className="text-sm font-bold text-text-main">نظام إدارة السنتر</p>
        <p className="text-xs text-text-muted">Center Management System</p>
      </div>
    </div>
  );
}

export default function BrandPanel() {
  return (
    <aside className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-b from-primary to-primary-hover p-10 text-primary-contrast md:flex">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-white/5"
      />

      <div className="relative">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-card bg-white/15">
            <GraduationCap size={24} weight="fill" />
          </span>
          <span className="text-sm font-semibold opacity-90">
            نظام إدارة السنتر
          </span>
        </div>

        <h2 className="mt-10 max-w-sm text-3xl font-extrabold leading-relaxed">
          منصّتك الذكية لإدارة السنتر
        </h2>
        <p className="mt-3 max-w-sm text-sm leading-7 opacity-80">
          تابع الطلاب والحصص والاشتراكات من مكان واحد أنيق وسريع، مصمّم خصيصاً
          للمعلم والمساعدين.
        </p>
      </div>

      <ul className="relative my-10 space-y-5">
        {HIGHLIGHTS.map(({ icon: Icon, title, desc }) => (
          <li key={title} className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-card bg-white/15">
              <Icon size={22} />
            </span>
            <div>
              <p className="text-sm font-bold">{title}</p>
              <p className="mt-0.5 text-xs leading-6 opacity-80">{desc}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="relative flex items-center gap-2 border-t border-white/15 pt-5 opacity-90">
        <ShieldCheck size={16} />
        <span className="text-xs">وصول آمن ومشفّر</span>
      </div>
    </aside>
  );
}
