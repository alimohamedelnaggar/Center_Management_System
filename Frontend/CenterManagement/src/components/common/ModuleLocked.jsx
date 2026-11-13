import { Lock, Phone } from "@/components/icons";
import ScreenState from "@/components/ui/ScreenState";
import { MODULE_LABELS } from "../../constants/modules";
import { platformContactWhatsApp } from "../../utils/whatsappContact";

/**
 * Shown when a module is disabled for the center (direct URL, or a module
 * toggled off while the user is logged in). Never blank, never a generic error.
 */
export default function ModuleLocked({ moduleKey }) {
  const contactUrl = platformContactWhatsApp();
  const label = MODULE_LABELS[moduleKey];

  return (
    <ScreenState
      surface="embedded"
      tone="warning"
      icon={Lock}
      eyebrow="وحدة غير مفعّلة"
      title="غير مشترك في هذه الوحدة"
      description="هذه الميزة غير مفعّلة في اشتراك مركزك. للتفعيل، تواصل مع إدارة المنصة."
      meta={
        label ? (
          <>
            الوحدة:{" "}
            <span className="font-semibold text-text-main">{label}</span>
          </>
        ) : null
      }
      actions={
        contactUrl
          ? [
              {
                label: "تواصل مع الإدارة",
                icon: Phone,
                href: contactUrl,
                external: true,
                testId: "module-locked-contact",
              },
            ]
          : []
      }
      footer={
        contactUrl ? null : "رقم التواصل غير مُهيّأ. تواصل مع إدارة المنصة."
      }
      testId="module-locked"
    />
  );
}
