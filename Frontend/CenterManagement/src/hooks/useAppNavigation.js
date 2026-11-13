import { useAuth } from "@/context/useAuth";
import { useBranding } from "@/context/useBranding";
import {
  NAV_ITEMS,
  canSeeNavItem,
  navLabel,
  navRoleContext,
} from "@/constants/modules";
import { resolveImageUrl } from "@/utils/media";

const ROLE_LABELS = {
  SuperAdmin: { title: "مدير المنصة", subtitle: "إدارة المراكز والاشتراكات" },
  CenterOwner: { title: "صاحب المركز", subtitle: "إدارة المركز والمدرسين" },
  Assistant: { title: "حساب المساعد", subtitle: "مساعد" },
  Teacher: { title: "حساب المدرس", subtitle: "مدرس" },
};

const SOLO_TEACHER_LABEL = {
  title: "حساب المدرس",
  subtitle: "مدرس / صاحب المركز",
};

/**
 * Shared navigation data for the desktop sidebar, the mobile drawer and the
 * mobile bottom bar. Keeping the module filtering here guarantees all three
 * surfaces show exactly the same destinations.
 */
export default function useAppNavigation() {
  const { role, isCenterAdmin, hasModule, centerType, centerTypeLoaded } =
    useAuth();
  const { center, title } = useBranding();

  const ctx = navRoleContext({ role, isCenterAdmin, centerType });
  const visibleNavItems = centerTypeLoaded
    ? NAV_ITEMS.filter(
        (item) => canSeeNavItem(item, ctx) && hasModule(item.module || "core"),
      ).map((item) => ({
        ...item,
        label: navLabel(item, ctx),
      }))
    : [];

  const identity = ctx.isSoloTeacher
    ? SOLO_TEACHER_LABEL
    : ROLE_LABELS[role] ?? { title: "حساب", subtitle: role ?? "" };

  const logoUrl = resolveImageUrl(center?.logoUrl);
  const brandName = center?.name || identity.title;
  const brandInitial = (center?.name || "Edu").trim().charAt(0).toUpperCase();

  return {
    visibleNavItems,
    identity,
    logoUrl,
    brandName,
    brandInitial,
    brandTitle: title,
  };
}
