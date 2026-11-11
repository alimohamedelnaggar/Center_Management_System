import { Link } from "react-router-dom";
import { FileQuestion, HelpCircle, Home } from "@/components/icons";
import ScreenState, { screenActionClass } from "@/components/ui/ScreenState";

/**
 * Route-level 404. The link home is safe for every role: signed-out visitors
 * land on /login through the normal guards, everyone else on their dashboard.
 */
export default function NotFound() {
  return (
    <ScreenState
      tone="primary"
      icon={FileQuestion}
      eyebrow="خطأ 404"
      title="الصفحة غير موجودة!"
      description="عذراً، الرابط الذي تحاول الوصول إليه غير صحيح أو تم نقله إلى مكان آخر داخل النظام."
      decoration={
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-2 select-none text-center text-[6rem] font-black leading-none text-primary/5"
        >
          404
        </span>
      }
      actions={[
        {
          key: "home",
          testId: "not-found-home",
          element: (
            <Link to="/" className={screenActionClass("primary")}>
              <Home aria-hidden="true" className="h-4 w-4" />
              <span>العودة إلى الرئيسية</span>
            </Link>
          ),
        },
      ]}
      footer={
        <>
          <HelpCircle aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>إذا كنت تعتقد أن هذا خطأ، يرجى مراجعة المسؤول.</span>
        </>
      }
      testId="not-found"
    />
  );
}
