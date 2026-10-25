// Single source of truth for feature modules in the UI.
// Mirrors the backend catalog:
//   CenterManagement.Data\AppMetaData\ModuleKeys.cs
//   CenterManagement.Data\AppMetaData\ModuleCatalog.cs
// Keep keys, labels and the dependency graph in sync with the server.

import {
  Building,
  CalendarClock,
  CalendarDays,
  ChartArea,
  ClipboardList,
  FileText,
  GraduationCap,
  Home,
  LibraryBig,
  List,
  NotebookText,
  Palette,
  QrCode,
  Receipt,
  ScanLine,
  Settings,
  Star,
  TrendingUp,
  UserCog,
  UserPlus,
  UserRound,
  Users,
  Wallet,
} from "@/components/icons";

export const MODULES = {
  ATTENDANCE: "attendance",
  GRADES: "grades",
  QUESTION_BANK: "question_bank",
  ONLINE_EXAMS: "online_exams",
  STUDY_NOTES: "study_notes",
  PAYMENTS: "payments",
  ACCOUNTING: "accounting",
  CENTER_REPORTS: "center_reports",
  WHATSAPP: "whatsapp",
  STUDENT_PORTAL: "student_portal",
  PARENT_PORTAL: "parent_portal",
};

export const MODULE_LABELS = {
  [MODULES.ATTENDANCE]: "الحضور والغياب",
  [MODULES.GRADES]: "الدرجات",
  [MODULES.QUESTION_BANK]: "بنك الأسئلة",
  [MODULES.ONLINE_EXAMS]: "الاختبارات الإلكترونية",
  [MODULES.STUDY_NOTES]: "المذكرات",
  [MODULES.PAYMENTS]: "المدفوعات",
  [MODULES.ACCOUNTING]: "الحسابات والمصروفات",
  [MODULES.CENTER_REPORTS]: "تقارير المركز",
  [MODULES.WHATSAPP]: "إشعارات واتساب",
  [MODULES.STUDENT_PORTAL]: "بوابة الطالب",
  [MODULES.PARENT_PORTAL]: "بوابة ولي الأمر",
};

export const MODULE_GROUPS = [
  {
    title: "الأساسيات",
    keys: [MODULES.ATTENDANCE, MODULES.GRADES],
  },
  {
    title: "المحتوى التعليمي",
    keys: [MODULES.QUESTION_BANK, MODULES.ONLINE_EXAMS, MODULES.STUDY_NOTES],
  },
  {
    title: "المالية والتقارير",
    keys: [MODULES.PAYMENTS, MODULES.ACCOUNTING, MODULES.CENTER_REPORTS],
  },
  {
    title: "التواصل والبوابات",
    keys: [MODULES.WHATSAPP, MODULES.STUDENT_PORTAL, MODULES.PARENT_PORTAL],
  },
];

// Direct prerequisites only; enabling a module also enables its transitive
// prerequisites (see closureToEnable).
export const MODULE_REQUIREMENTS = {
  [MODULES.ONLINE_EXAMS]: [MODULES.QUESTION_BANK],
  [MODULES.PARENT_PORTAL]: [MODULES.ATTENDANCE, MODULES.PAYMENTS],
};

/**
 * THE single navigation table. AppSidebar renders from it and the router
 * derives each route's guard module from it (see moduleForPath), so the sidebar
 * and the "غير مشترك في هذه الوحدة" guard can never disagree.
 *
 * Shape: { key, path, label, icon, module, roles }
 *   - module: null  → core (always available).
 *   - roles:  capability tokens (see NAV_ROLE_TOKENS); empty/omitted → everyone.
 *   - labelFor(ctx): optional role-dependent override of `label`.
 */
export const NAV_ITEMS = [
  // --- Operational tools: assistants and teachers (solo or not) ---
  { key: "dashboard", path: "/dashboard", label: "الرئيسية", icon: Home, module: null, roles: ["assistant", "teacher"] },
  { key: "attendance", path: "/attendance", label: "الحضور", icon: CalendarDays, module: MODULES.ATTENDANCE, roles: ["assistant", "teacher"] },
  { key: "scanner", path: "/scanner", label: "ماسح الحضور", icon: ScanLine, module: MODULES.ATTENDANCE, roles: ["assistant", "teacher"] },
  { key: "qr-cards", path: "/qr-cards", label: "بطاقات الطلاب", icon: QrCode, module: MODULES.ATTENDANCE, roles: ["assistant", "teacher"] },
  // Student reports (accounts / attendance / exams): a core page for teachers -
  // every column is gated by its own module inside the page itself.
  { key: "student-reports", path: "/student-reports", label: "تقارير الطلاب", icon: FileText, module: null, roles: ["teacher"] },
  { key: "grades", path: "/grades", label: "الدرجات", icon: Star, module: MODULES.GRADES, roles: ["assistant", "teacher"] },
  { key: "question-bank", path: "/question-bank", label: "بنك الأسئلة", icon: LibraryBig, module: MODULES.QUESTION_BANK, roles: ["assistant", "teacher"] },
  { key: "exams", path: "/exams", label: "الامتحانات", icon: ClipboardList, module: MODULES.ONLINE_EXAMS, roles: ["assistant", "teacher"] },
  { key: "notes", path: "/notes", label: "الملاحظات", icon: NotebookText, module: MODULES.STUDY_NOTES, roles: ["assistant", "teacher"] },

  // --- Money: managers; teachers see their own groups' income only ---
  { key: "income", path: "/income", label: "الإيرادات", icon: TrendingUp, module: MODULES.ACCOUNTING, roles: ["owner", "teacher"] },
  { key: "finance", path: "/finance", label: "الحسابات", icon: Wallet, module: MODULES.ACCOUNTING, roles: ["owner", "solo"] },
  // Overdue payments: owner, solo teacher, teacher, assistant (scoped by the backend)
  { key: "overdue", path: "/overdue", label: "المتأخرين", icon: ClipboardList, module: MODULES.PAYMENTS, roles: ["owner", "teacher", "assistant"] },
  { key: "expense", path: "/expense", label: "المصروفات", icon: Receipt, module: MODULES.ACCOUNTING, roles: ["owner", "solo"] },

  // --- Reporting: regular teachers keep the own-groups reports page ---
  { key: "reports", path: "/reports", label: "التقارير", icon: GraduationCap, module: MODULES.CENTER_REPORTS, roles: ["pureTeacher"] },

  // --- Center administration: owners and solo teachers ---
  { key: "center-reports", path: "/center-reports", label: "تقارير المركز", icon: GraduationCap, module: MODULES.CENTER_REPORTS, roles: ["owner", "solo"] },
  { key: "adminDashboard", path: "/adminDashboard", label: "إحصائيات", icon: ChartArea, module: null, roles: ["owner", "solo"] },
  { key: "bulk-parent-accounts", path: "/bulk-parent-accounts", label: "حسابات أولياء الأمور", icon: UserPlus, module: MODULES.PARENT_PORTAL, roles: ["owner", "solo"] },
  { key: "teachers", path: "/teachers", label: "إدارة المدرسين", icon: UserCog, module: null, roles: ["owner", "solo"], multiOnly: true },
  {
    key: "settings",
    path: "/settings",
    label: "المجموعات",
    labelFor: (c) => (c.canManageGroups ? "المجموعات" : "مجموعاتي"),
    icon: Settings,
    module: null,
    roles: ["owner", "teacher", "assistant"],
  },
  { key: "assistants", path: "/assistants", label: "المساعدين", icon: Users, module: null, roles: ["owner", "solo"] },
  { key: "my-subscription", path: "/my-subscription", label: "اشتراكي", icon: CalendarClock, module: null, roles: ["owner", "solo"] },
  { key: "center-settings", path: "/center-settings", label: "إعدادات المركز", icon: Palette, module: null, roles: ["owner", "solo"] },

  // --- Platform (SuperAdmin only) ---
  { key: "centers", path: "/centers", label: "المراكز", icon: Building, module: null, roles: ["superAdmin"] },
  { key: "subscriptions", path: "/subscriptions", label: "الاشتراكات", icon: Wallet, module: null, roles: ["superAdmin"] },
  { key: "platform", path: "/platform", label: "إحصائيات المنصة", icon: ChartArea, module: null, roles: ["superAdmin"] },
  { key: "audit-log", path: "/audit-log", label: "سجل المراجعة", icon: List, module: null, roles: ["superAdmin"] },
  { key: "profile", path: "/profile", label: "ملفي الشخصي", icon: UserRound, module: null, roles: ["all"] },
];

const KNOWN_MODULE_KEYS = new Set(
  Object.values(MODULES).map((k) => k.toLowerCase()),
);

/**
 * THE single normaliser for enabled-module values — every consumer goes through
 * this (directly or via canUseModule / canUseCenterModule). The backend promises
 * a string array, but an auth response, a cached snapshot, an impersonation
 * payload or a caller that passes a `Set` must never turn into a crash like
 * "(keys || []).filter is not a function".
 *
 * Accepts, and always returns a clean, lower-cased, de-duplicated `string[]`:
 *   - string[]           → ["Attendance", "payments"]   → ["attendance","payments"]
 *   - object-map         → { attendance: true, grades: false } → ["attendance"]
 *   - comma string       → "attendance, grades"          → ["attendance","grades"]
 *   - single string      → "attendance"                  → ["attendance"]
 *   - Set                → new Set(["grades"])           → ["grades"]
 *   - null / undefined / anything else                   → []
 */
export function normaliseModules(keys) {
  let list;
  if (Array.isArray(keys)) {
    list = keys;
  } else if (typeof keys === "string") {
    list = keys.includes(",") ? keys.split(",") : [keys];
  } else if (keys instanceof Set) {
    list = Array.from(keys);
  } else if (keys && typeof keys === "object") {
    // object-map: keep the keys whose value is truthy.
    list = Object.entries(keys)
      .filter(([, value]) => Boolean(value))
      .map(([key]) => key);
  } else {
    list = [];
  }

  return Array.from(
    new Set(
      list
        .filter((k) => typeof k === "string" && k.trim())
        .map((k) => k.trim().toLowerCase()),
    ),
  );
}

/** The full set needed to turn on `requested` (requested + prerequisites). */
export function closureToEnable(requested) {
  const enabled = new Set(normaliseModules(requested));
  const queue = [...enabled];

  while (queue.length) {
    const current = queue.shift();
    for (const dep of MODULE_REQUIREMENTS[current] || []) {
      if (!enabled.has(dep)) {
        enabled.add(dep);
        queue.push(dep);
      }
    }
  }

  return enabled;
}

/**
 * Whether the given module may be used.
 * - `core` and unknown keys are always allowed.
 * - Platform users (SuperAdmin) and Students are not gated by center modules.
 * - Before the module list has loaded we fail open so the app never bricks on
 *   a slow first response.
 */
export function canUseModule(key, enabledModules, context = {}) {
  if (!key) return true;
  if (key === "core") return true;
  // Unknown keys are not part of the catalog, so they are never gated.
  if (!KNOWN_MODULE_KEYS.has(String(key).toLowerCase())) return true;

  const { isSuperAdmin = false, isStudent = false, modulesLoaded = false } = context;
  if (isSuperAdmin || isStudent) return true;
  if (!modulesLoaded) return true;

  const set = new Set(normaliseModules(enabledModules));
  return set.has(String(key).toLowerCase());
}

/**
 * Like canUseModule but never exempts a role: used for the student portal nav,
 * where a Student must still see only the sections the center actually bought.
 * Fails open before the module list has loaded.
 */
export function canUseCenterModule(key, enabledModules, modulesLoaded = false) {
  if (!key || key === "core") return true;
  if (!modulesLoaded) return true;
  const set = new Set(normaliseModules(enabledModules));
  return set.has(String(key).toLowerCase());
}

/** Maps a role (+ isCenterAdmin) to the capability flags the nav table uses. */
export function navRoleContext({ role, isCenterAdmin = false, centerType } = {}) {
  const isSoloTeacher = role === "Teacher" && isCenterAdmin;
  // The multi-teacher UI is gated on Center.Type, never on role flags, so an
  // upgraded center shows the teacher features for every role automatically.
  // Until centerType is known we fail open to multi (see canSeeNavItem).
  const isSoloCenter = centerType === "SoloTeacher";
  return {
    isSuperAdmin: role === "SuperAdmin",
    isCenterOwner: role === "CenterOwner",
    isAssistant: role === "Assistant",
    isAnyTeacher: role === "Teacher",
    isSoloTeacher,
    isPureTeacher: role === "Teacher" && !isCenterAdmin,
    canManageGroups: role === "CenterOwner" || isSoloTeacher,
    isSoloCenter,
    centerType,
  };
}

const NAV_ROLE_TOKENS = {
  all: () => true,
  owner: (c) => c.isCenterOwner,
  assistant: (c) => c.isAssistant,
  teacher: (c) => c.isAnyTeacher,
  solo: (c) => c.isSoloTeacher,
  pureTeacher: (c) => c.isPureTeacher,
  superAdmin: (c) => c.isSuperAdmin,
};

/**
 * Whether a nav entry is available to the role described by `ctx`.
 * An item flagged `multiOnly` is additionally hidden while the center is a solo
 * center (Center.Type), regardless of the caller's role.
 */
export function canSeeNavItem(item, ctx) {
  if (item?.multiOnly && ctx?.isSoloCenter) return false;
  if (!item?.roles?.length) return true;
  return item.roles.some((token) => (NAV_ROLE_TOKENS[token] ?? (() => false))(ctx));
}

/** The (possibly role-dependent) Arabic label of a nav entry. */
export function navLabel(item, ctx) {
  return typeof item.labelFor === "function" ? item.labelFor(ctx) : item.label;
}

/** The nav entry whose `path` matches `pathname` (query/trailing slash aware). */
export function navItemForPath(pathname) {
  if (!pathname) return null;
  const path = pathname.split("?")[0].replace(/\/+$/, "") || "/";
  return NAV_ITEMS.find((item) => item.path === path) ?? null;
}

/**
 * Student-portal routes are not part of the staff sidebar, so they are listed
 * here; every staff route's module comes from NAV_ITEMS (single source).
 */
const STUDENT_ROUTE_MODULES = {
  "/student": MODULES.STUDENT_PORTAL,
  "/student/dashboard": MODULES.STUDENT_PORTAL,
  "/student/exams": MODULES.ONLINE_EXAMS,
  "/student/results": MODULES.GRADES,
  "/student/attendance": MODULES.ATTENDANCE,
  "/student/payments": MODULES.PAYMENTS,
  "/student/notes": MODULES.STUDY_NOTES,
  "/student/notifications": MODULES.STUDENT_PORTAL,
  "/student/profile": MODULES.STUDENT_PORTAL,
};

/**
 * Parent-portal routes are not part of the staff sidebar either; the whole
 * subtree is gated by the `parent_portal` module.
 */
const PARENT_ROUTE_MODULES = {
  "/parent": MODULES.PARENT_PORTAL,
  "/parent/dashboard": MODULES.PARENT_PORTAL,
  "/parent/notifications": MODULES.PARENT_PORTAL,
  "/parent/children": MODULES.PARENT_PORTAL,
};

/** Sidebar/route: which module gates each client-side path. */
export const ROUTE_MODULES = {
  ...Object.fromEntries(NAV_ITEMS.map((item) => [item.path, item.module ?? "core"])),
  ...STUDENT_ROUTE_MODULES,
  ...PARENT_ROUTE_MODULES,
};

/** Module that gates a path (null when the path is always available). */
export function moduleForPath(pathname) {
  if (!pathname) return null;
  const path = pathname.split("?")[0].replace(/\/+$/, "") || "/";
  return ROUTE_MODULES[path] ?? null;
}
