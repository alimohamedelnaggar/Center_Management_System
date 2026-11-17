/**
 * Phase 3 / batch 10 verification harness.
 *
 * Screens: SuperAdmin center management (/centers), subscription management
 * (/subscriptions), platform statistics (/platform), audit log (/audit-log)
 * and the SuperAdmin /admin -> /centers redirect. Includes empty/error states,
 * 200% text/page zoom sweeps, a print-media invariant and an export/print
 * source-file change guard.
 *
 * Run from the repository root:
 *   node docs/design/phase3-batch10-verify.mjs
 *
 * Optional narrowing (fast iterations):
 *   PHASE3B10_PAGES="centers,platform"
 *   PHASE3B10_VIEWPORTS="390,1280"
 *   PHASE3B10_THEMES="light"
 */
import { spawn, execFileSync } from "node:child_process";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { AUDIT } from "./audit-ui.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const FRONTEND = join(REPO, "Frontend", "CenterManagement");
const OUT = join(HERE, "phase3");
const SHOTS = join(HERE, "shots", "phase3b10");
const CHROME_PROFILE = join(process.env.TEMP || "/tmp", "opencode", "chrome-phase3b10-verify");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9477;
const APP_PORT = 5211;
const BASE = `http://127.0.0.1:${APP_PORT}`;
const ORIGIN = BASE;

const VIEWPORTS = [
  ["360", 360, 800],
  ["390", 390, 844],
  ["768", 768, 1024],
  ["1024", 1024, 768],
  ["1280", 1280, 800],
  ["1440", 1440, 900],
  ["1920", 1920, 1080],
  ["2560", 2560, 1440],
  ["land-844", 844, 390],
  ["land-640", 640, 360],
];
const ALL_VIEWPORTS = VIEWPORTS.map((v) => v[0]);
const THEMES = ["light", "dark"];

const ALL_MODULES = [
  "attendance",
  "grades",
  "payments",
  "accounting",
  "center_reports",
  "whatsapp",
  "student_portal",
  "parent_portal",
  "question_bank",
  "online_exams",
  "study_notes",
];

const SUBSCRIPTION = {
  type: "Annual",
  state: "active",
  startDate: "2026-01-01T00:00:00",
  endDate: "2027-01-01T00:00:00",
  daysLeftInGrace: null,
};

const SENSITIVE_RE = /password|010000000\d{2}|access[_-]?token|bearer|secret/i;

/* ------------------------------------------------------------------ */
/* fixtures                                                            */
/* ------------------------------------------------------------------ */

const LONG_OWNER = "أ. عبد الرحمن بن محمد السيد — مالك المركز والتواصل الإداري";
const LONG_EMAIL_1 = "owner.nour.education.center.long.mailbox.for.layout.stress@center-system.example.com";
const LONG_EMAIL_2 = "solo.teacher.management.and.billing.contact.address@center-system.example.com";
const LONG_EMAIL_3 = "fajr.educational.center.owner.account.very.long.email@center-system.example.com";
const LONG_EMAIL_4 = "amal.center.administration.official.contact.mailbox@center-system.example.com";
const LONG_PLAN = "الباقة السنوية الشاملة — جميع الوحدات والتحديثات المستمرة والدعم الفني المتميز";
const LONG_TYPE = "مركز متعدد المدرسين — إدارة المجموعات والمدرسين والطلاب والمناهج";

const CENTERS = [
  {
    id: 11,
    name: "مركز النور التعليمي",
    ownerId: "201",
    ownerName: LONG_OWNER,
    ownerPhone: "01000000011",
    ownerEmail: LONG_EMAIL_1,
    type: "MultiTeacher",
    teachersCount: 234,
    studentsCount: 12345,
    status: "Active",
  },
  {
    id: 12,
    name: "مركز المدرس الفردي",
    ownerId: "202",
    ownerName: "أ. سارة إبراهيم عبد الرحمن — مدرسة اللغة العربية والتفسير",
    ownerPhone: "01000000012",
    ownerEmail: LONG_EMAIL_2,
    type: "SoloTeacher",
    teachersCount: 1,
    studentsCount: 345,
    status: "Suspended",
  },
  {
    id: 13,
    name: "مركز الفجر التعليمي",
    ownerId: "203",
    ownerName: "أ. محمد بن عبد الله الصفار — المدير المسؤول عن المركز",
    ownerPhone: "01000000013",
    ownerEmail: LONG_EMAIL_3,
    type: "MultiTeacher",
    teachersCount: 56,
    studentsCount: 6789,
    status: "Expired",
  },
  {
    id: 14,
    name: "مركز الأمل",
    ownerId: "204",
    ownerName: "أ. يوسف أحمد محمود",
    ownerPhone: "01000000014",
    ownerEmail: LONG_EMAIL_4,
    type: "MultiTeacher",
    teachersCount: 12,
    studentsCount: 890,
    status: "Active",
  },
];

const SUBSCRIPTIONS = [
  {
    id: 101,
    name: "مركز النور التعليمي",
    state: "Active",
    plan: LONG_PLAN,
    type: LONG_TYPE,
    subscriptionStart: "2026-01-01T00:00:00",
    subscriptionEnd: "2027-01-01T00:00:00",
    enabledModuleCount: 11,
    totalModuleCount: 11,
    paidAmount: 1234567890,
    price: 1500000000,
    currency: "جنيه مصري",
    graceDays: 15,
    daysLeftInGrace: null,
    expiringSoon: false,
    daysUntilExpiry: 365,
  },
  {
    id: 102,
    name: "مركز المدرس الفردي",
    state: "InGrace",
    plan: "الباقة الشهرية للمعلم الفردي مع دعم الكتب والمذكرات والتحديثات",
    type: "مدرس فردي — حساب شخصي واحد ومجموعة دراسية محدودة",
    subscriptionStart: "2025-11-01T00:00:00",
    subscriptionEnd: "2026-11-01T00:00:00",
    enabledModuleCount: 6,
    totalModuleCount: 11,
    paidAmount: 250000,
    price: 300000,
    currency: "جنيه مصري",
    graceDays: 10,
    daysLeftInGrace: 7,
    expiringSoon: true,
    daysUntilExpiry: 7,
  },
  {
    id: 103,
    name: "مركز الفجر التعليمي",
    state: "Expired",
    plan: "الباقة السنوية المؤسسية — كل الوحدات مع تقارير مخصصة وتدريب المستستخدمين",
    type: "مركز متعدد المدرسين — إدارة مركزية لعدة فروع ومجموعات",
    subscriptionStart: "2025-01-01T00:00:00",
    subscriptionEnd: "2026-01-01T00:00:00",
    enabledModuleCount: 9,
    totalModuleCount: 11,
    paidAmount: 987654321,
    price: 1200000000,
    currency: "جنيه مصري",
    graceDays: 30,
    daysLeftInGrace: null,
    expiringSoon: false,
    daysUntilExpiry: -120,
  },
  {
    id: 104,
    name: "مركز الأمل",
    state: "Suspended",
    plan: "باقة النمو نصف السنوية — وحدات الحضور والدرجات والمالية والامتحانات",
    type: "مركز تعليمي صغير — مدرسان ومجموعتان دراسيتان",
    subscriptionStart: "2026-06-01T00:00:00",
    subscriptionEnd: "2026-12-01T00:00:00",
    enabledModuleCount: 4,
    totalModuleCount: 11,
    paidAmount: 125000,
    price: 250000,
    currency: "جنيه مصري",
    graceDays: 5,
    daysLeftInGrace: null,
    expiringSoon: true,
    daysUntilExpiry: 14,
  },
];

const PLATFORM_STATS = {
  totalCenters: 1234567,
  activeCenters: 12345,
  suspendedCenters: 234,
  soloTeacherCenters: 5678,
  multiTeacherCenters: 987654,
  centersCreatedThisMonth: 4321,
  activeSubscriptions: 11111,
  totalUsers: 987654321,
  totalOwners: 12345,
  totalTeachers: 234567,
  totalAssistants: 45678,
  totalStudents: 7654321,
  totalGroups: 345678,
  centersInGrace: 890,
  monthlyRevenue: 1234567890,
  subscriptionsByType: [
    { type: "Annual", label: "سنوي — الباقة الشاملة لجميع الوحدات", count: 123456 },
    { type: "Monthly", label: "شهري — الباقة الأساسية للمعلم الفردي", count: 78901 },
    { type: "SemiAnnual", label: "نصف سنوي — باقة النمو للمراكز الصغيرة", count: 4567 },
  ],
  revenueByMonth: [
    { revenue: 1200000 },
    { revenue: 1350000 },
    { revenue: 900000 },
    { revenue: 1500000 },
    { revenue: 1750000 },
    { revenue: 1900000 },
    { revenue: 2100000 },
    { revenue: 1950000 },
    { revenue: 1800000 },
    { revenue: 2400000 },
    { revenue: 2750000 },
    { revenue: 3100000 },
  ],
};

const AUDIT_ROWS = [
  {
    id: "a1",
    createdAt: "2026-11-17T09:15:00",
    actorName: "مدير المنصة",
    action: "OnboardCenter",
    details:
      "تم إنشاء مركز النور التعليمي مع حساب المالك وتهيئة الوحدات الافتراضية والاشتراك السنوي وإرسال بيانات الدخول الأولى",
    ipAddress: "192.168.1.101",
  },
  {
    id: "a2",
    createdAt: "2026-11-16T14:30:00",
    actorName: "مدير المنصة",
    action: "Impersonate",
    details:
      "بدء انتحال حساب مالك المركز للتحقق من صلاحيات العرض وحل مشكلة تخصيص الوحدات في لوحة التحكم",
    ipAddress: "10.0.0.24",
  },
  {
    id: "a3",
    createdAt: "2026-11-16T14:45:00",
    actorName: "مدير المنصة",
    action: "ImpersonationEnd",
    details: "إنهاء جلسة الانتحال والعودة إلى حساب مدير المنصة بعد اكتمال أعمال المراجعة",
    ipAddress: "10.0.0.24",
  },
  {
    id: "a4",
    createdAt: "2026-11-15T11:05:00",
    actorName: "مدير المنصة",
    action: "PlatformStatisticsViewed",
    details:
      "عرض إحصائيات المنصة العامة بما يشمل المراكز والمستخدمين والاشتراكات والإيرادات المسجلة لآخر اثني عشر شهرًا",
    ipAddress: "172.16.0.8",
  },
];

/* ------------------------------------------------------------------ */
/* scenarios + pages                                                   */
/* ------------------------------------------------------------------ */

const SUPERADMIN = {
  role: "SuperAdmin",
  centerAdmin: false,
  centerType: "MultiTeacher",
  name: "مدير المنصة",
  phone: "01000000001",
  subject: null,
};

const SCENARIOS = {
  superadmin: { ...SUPERADMIN },
  centersEmpty: { ...SUPERADMIN, centersEmpty: true },
  centersError: { ...SUPERADMIN, centersError: true },
  subscriptionsExpired: { ...SUPERADMIN, subscriptionsExpired: true },
  subscriptionsError: { ...SUPERADMIN, subscriptionsError: true },
  platformError: { ...SUPERADMIN, platformError: true },
  auditError: { ...SUPERADMIN, auditError: true },
};

const PAGES = [
  {
    key: "centers",
    path: "/centers",
    wait: '[data-testid="centers-page"]',
    scenario: "superadmin",
    scope: "centers-page",
    shell: "app-shell",
    expect: "centers",
    heading: "إدارة المراكز",
    statSelector: '[data-testid="centers-card"]',
    rowKey: "centerRows",
    expectRows: 4,
    full: true,
  },
  {
    key: "centers-empty",
    path: "/centers",
    wait: '[data-testid="centers-page"]',
    scenario: "centersEmpty",
    scope: "centers-page",
    shell: "app-shell",
    expect: "centers-empty",
    heading: "إدارة المراكز",
    statSelector: '[data-testid="centers-card"]',
    rowKey: "centerRows",
    expectRows: 0,
    expectEmpty: true,
    full: true,
  },
  {
    key: "centers-error",
    path: "/centers",
    wait: '[data-testid="centers-page"]',
    scenario: "centersError",
    scope: "centers-page",
    shell: "app-shell",
    expect: "centers-error",
    heading: "إدارة المراكز",
    statSelector: '[data-testid="centers-card"]',
    errorTestid: "centers-error",
    retryTestid: "centers-retry",
    full: true,
  },
  {
    key: "subscriptions",
    path: "/subscriptions",
    wait: '[data-testid="subscriptions-page"]',
    scenario: "superadmin",
    scope: "subscriptions-page",
    shell: "app-shell",
    expect: "subscriptions",
    heading: "الاشتراكات",
    statSelector: '[data-testid="subscriptions-card"]',
    rowKey: "subscriptionRows",
    expectRows: 4,
    full: true,
  },
  {
    key: "subscriptions-expired",
    path: "/subscriptions",
    wait: '[data-testid="subscriptions-page"]',
    scenario: "subscriptionsExpired",
    scope: "subscriptions-page",
    shell: "app-shell",
    expect: "subscriptions-expired",
    heading: "الاشتراكات",
    statSelector: '[data-testid="subscriptions-card"]',
    rowKey: "subscriptionRows",
    expectRows: 4,
    expectText: ["منتهي", "فترة سماح"],
    full: true,
  },
  {
    key: "subscriptions-error",
    path: "/subscriptions",
    wait: '[data-testid="subscriptions-page"]',
    scenario: "subscriptionsError",
    scope: "subscriptions-page",
    shell: "app-shell",
    expect: "subscriptions-error",
    heading: "الاشتراكات",
    statSelector: '[data-testid="subscriptions-card"]',
    errorTestid: "subscriptions-error",
    retryTestid: "subscriptions-retry",
    full: true,
  },
  {
    key: "platform",
    path: "/platform",
    wait: '[data-testid="platform-page"]',
    scenario: "superadmin",
    scope: "platform-page",
    shell: "app-shell",
    expect: "platform",
    heading: "إحصائيات المنصة",
    statSelector: '[data-testid="platform-stat"]',
    expectStats: 10,
    expectText: ["1,234,567", "1٬234٬567", "1234567"],
    expectTextMode: "any",
    full: true,
  },
  {
    key: "platform-error",
    path: "/platform",
    wait: '[data-testid="platform-page"]',
    scenario: "platformError",
    scope: "platform-page",
    shell: "app-shell",
    expect: "platform-error",
    heading: "إحصائيات المنصة",
    statSelector: '[data-testid="platform-stat"]',
    errorTestid: "platform-error",
    retryTestid: "platform-retry",
    full: true,
  },
  {
    key: "audit",
    path: "/audit-log",
    wait: '[data-testid="audit-page"]',
    scenario: "superadmin",
    scope: "audit-page",
    shell: "app-shell",
    expect: "audit",
    heading: "سجل المراجعة",
    statSelector: '[data-testid="audit-card"]',
    rowKey: "auditRows",
    expectRows: 4,
    full: true,
  },
  {
    key: "audit-error",
    path: "/audit-log",
    wait: '[data-testid="audit-page"]',
    scenario: "auditError",
    scope: "audit-page",
    shell: "app-shell",
    expect: "audit-error",
    heading: "سجل المراجعة",
    statSelector: '[data-testid="audit-card"]',
    errorTestid: "audit-error",
    retryTestid: "audit-retry",
    full: true,
  },
  {
    key: "admin-redirect",
    path: "/admin",
    wait: '[data-testid="centers-page"]',
    scenario: "superadmin",
    scope: "centers-page",
    shell: "app-shell",
    expect: "admin-redirect",
    heading: "إدارة المراكز",
    statSelector: '[data-testid="centers-card"]',
    rowKey: "centerRows",
    expectRows: 4,
    expectRedirect: "/centers",
    full: true,
  },
];

const list = (value, fallback) =>
  value
    ? String(value)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : fallback;

const RUN_PAGES = list(process.env.PHASE3B10_PAGES, PAGES.map((p) => p.key));
const RUN_VIEWPORTS = list(process.env.PHASE3B10_VIEWPORTS, ALL_VIEWPORTS);
const RUN_THEMES = list(process.env.PHASE3B10_THEMES, THEMES);
const pages = PAGES.filter((p) => RUN_PAGES.includes(p.key));

/* ------------------------------------------------------------------ */
/* fixture helpers                                                     */
/* ------------------------------------------------------------------ */

const b64url = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");

const NAME_CLAIM = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name";
const ID_CLAIM = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier";
const ROLE_CLAIM = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";

function makeJwt(scenario) {
  const header = { alg: "none", typ: "JWT" };
  const payload = {
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 6,
    iat: Math.floor(Date.now() / 1000),
    [ROLE_CLAIM]: scenario.role,
    [ID_CLAIM]: "77",
    [NAME_CLAIM]: scenario.name,
    PhoneNumber: scenario.phone,
    // Kept as a string exactly like batch 9 (the API emits string claims).
    is_center_admin: String(scenario.centerAdmin),
    pwd_change_required: "false",
    impersonation: "false",
  };
  return `${b64url(header)}.${b64url(payload)}.fixture`;
}

const ok = (data) => ({ succeeded: true, data });

let SCENARIO = SCENARIOS.superadmin;

const setScenario = (key) => {
  SCENARIO = SCENARIOS[key] ?? SCENARIOS.superadmin;
};

const queryOf = (url) => {
  try {
    return new URL(url).searchParams;
  } catch {
    return new URLSearchParams();
  }
};

const pick = (params, keys) => {
  for (const key of keys) {
    const value = params.get(key);
    if (value !== null && value !== "") return value;
  }
  return null;
};

function pageSlice(rows, url) {
  const params = queryOf(url);
  const pageNumber = Number(pick(params, ["pageNumber", "PageNumber", "pageIndex"]) || 1);
  const pageSize = Number(pick(params, ["pageSize", "PageSize"]) || 10);
  const start = (pageNumber - 1) * pageSize;
  return {
    pageNumber,
    pageSize,
    slice: rows.slice(start, start + pageSize),
    totalPages: Math.max(1, Math.ceil(rows.length / pageSize)),
    totalCount: rows.length,
  };
}

function paged(rows, url, extra = {}) {
  const page = pageSlice(rows, url);
  return ok({
    data: page.slice,
    currentPage: page.pageNumber,
    pageIndex: page.pageNumber,
    totalPages: page.totalPages,
    totalCount: page.totalCount,
    pageSize: page.pageSize,
    hasPreviousPage: page.pageNumber > 1,
    hasNextPage: page.pageNumber < page.totalPages,
    ...extra,
  });
}

function fixtureFor(url) {
  const lower = url.toLowerCase();

  if (lower.includes("authentication/refresh-token")) {
    return {
      accessToken: makeJwt(SCENARIO),
      mustChangePassword: false,
      enabledModules: ALL_MODULES,
      subscription: SUBSCRIPTION,
    };
  }
  if (lower.includes("profile/getmyprofile")) {
    return ok({
      fullName: SCENARIO.name,
      phoneNumber: SCENARIO.phone,
      userName: SCENARIO.phone,
      centerType: SCENARIO.centerType,
      enabledModules: ALL_MODULES,
      subscription: SUBSCRIPTION,
      subject: SCENARIO.subject,
      email: null,
      address: null,
    });
  }
  if (lower.includes("center/mycenter")) {
    return ok({
      id: 11,
      name: "مركز النور التعليمي",
      logoUrl: null,
      themeColor: "#4F46E5",
      type: SCENARIO.centerType,
    });
  }

  /* ---------- SuperAdmin platform screens ---------- */
  if (lower.includes("/center/paginated")) {
    if (SCENARIO.centersEmpty) return paged([], url);
    if (SCENARIO.centersError) return { succeeded: false, message: "تعذر تحميل المراكز" };
    return paged(CENTERS, url);
  }
  if (lower.includes("/center/subscriptions")) {
    if (SCENARIO.subscriptionsError) {
      return { succeeded: false, message: "تعذر تحميل الاشتراكات" };
    }
    if (SCENARIO.subscriptionsExpired) {
      return ok(
        SUBSCRIPTIONS.map((row, index) => ({
          ...row,
          state: index % 2 === 0 ? "Expired" : "InGrace",
        })),
      );
    }
    return ok(SUBSCRIPTIONS);
  }
  if (lower.includes("/platform/statistics")) {
    if (SCENARIO.platformError) {
      return { succeeded: false, message: "تعذر تحميل إحصائيات المنصة" };
    }
    return ok(PLATFORM_STATS);
  }
  if (lower.includes("/auditlogs/paginated")) {
    if (SCENARIO.auditError) {
      return { succeeded: false, message: "تعذر تحميل سجل المراجعة" };
    }
    return paged(AUDIT_ROWS, url);
  }

  // Unrelated background calls (including SignalR negotiate) must never hit
  // the real network.
  return ok([]);
}

/* ------------------------------------------------------------------ */
/* export / print source change guard                                  */
/* ------------------------------------------------------------------ */

// Static list of export/print sources that batch 10 must not modify.
const EXPORT_SOURCE_PATHS = [
  "Frontend/CenterManagement/src/pages/CenterReportsPage.jsx",
  "Frontend/CenterManagement/src/components/common/PrintableReport.jsx",
  "Frontend/CenterManagement/src/utils/export.js",
  "Frontend/CenterManagement/src/services/financeService.js",
  "Frontend/CenterManagement/src/components/common/PaymentReceiptModal.jsx",
  "Frontend/CenterManagement/src/utils/qrCode.js",
  "Frontend/CenterManagement/src/utils/exportToExcel.js",
  "Frontend/CenterManagement/src/pages/QuestionExamPages/ExamPaperPrintPage.jsx",
  "Frontend/CenterManagement/src/pages/StudentPages/StudentQrCardsPage.jsx",
];

// financeService.js was already modified in the working tree before batch 10.
// It is user-owned: record it, but do not treat it as a batch 10 change.
const USER_OWNED_PATHS = ["Frontend/CenterManagement/src/services/financeService.js"];

function inspectExportSources() {
  const result = {
    checked: EXPORT_SOURCE_PATHS,
    userOwned: USER_OWNED_PATHS,
    changed: [],
    userOwnedChanged: [],
    batch10Changed: [],
    gitError: null,
    note:
      "financeService.js was already modified before batch 10; it is user-owned and must not be attributed to or reverted by this harness.",
  };
  try {
    const out = execFileSync(
      "git",
      ["-C", REPO, "diff", "--name-only", "HEAD", "--", ...EXPORT_SOURCE_PATHS],
      { encoding: "utf8" },
    );
    result.changed = String(out)
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch (error) {
    result.gitError = error?.message ?? String(error);
  }
  result.userOwnedChanged = result.changed.filter((path) => USER_OWNED_PATHS.includes(path));
  result.batch10Changed = result.changed.filter((path) => !USER_OWNED_PATHS.includes(path));
  return result;
}

/* ------------------------------------------------------------------ */
/* in-page probe                                                       */
/* ------------------------------------------------------------------ */

const PROBE = String.raw`(() => {
  const testid = (id) => document.querySelector('[data-testid="' + id + '"]');
  const textOf = (el) => (el ? (el.textContent || "").replace(/\s+/g, " ").trim() : "");
  const scope = window.__AUDIT_SCOPE__ || null;
  const root = scope ? testid(scope) : document;
  if (!root) return { missingScope: scope };
  const q = (sel) => [...root.querySelectorAll(sel)];
  const statsSelector = window.__STAT_SELECTOR__ || null;
  const errorId = window.__ERROR_TESTID__ || null;
  const retryId = window.__RETRY_TESTID__ || null;
  const scrollRegions = q("[data-scroll-region]").map((el) => ({
    label: el.getAttribute("aria-label") || "",
    client: Math.round(el.clientWidth),
    scroll: Math.round(el.scrollWidth),
    overflowX: getComputedStyle(el).overflowX,
    tabIndex: el.getAttribute("tabindex"),
  }));
  const counts = {
    centerRows: q('[data-testid="center-row"]').length,
    subscriptionRows: q('[data-testid="subscription-row"]').length,
    auditRows: q('[data-testid="audit-row"]').length,
    platformStats: q('[data-testid="platform-stat"]').length,
    centersCards: q('[data-testid="centers-card"]').length,
    subscriptionsCards: q('[data-testid="subscriptions-card"]').length,
    auditCards: q('[data-testid="audit-card"]').length,
    stats: statsSelector ? document.querySelectorAll(statsSelector).length : 0,
    inputs: q("input").length,
    selects: q("select").length,
    errorTestids: q('[data-testid$="-error"]').map((el) => el.getAttribute("data-testid")),
    retryTestids: q('[data-testid$="-retry"]').map((el) => el.getAttribute("data-testid")),
  };
  return {
    text: textOf(root).slice(0, 9000),
    heading: textOf(root.querySelector("h1") || root.querySelector("h2")),
    table: Boolean(root.querySelector("table")),
    tableRows: root.querySelectorAll("tbody tr").length,
    stats: counts.stats,
    counts,
    error: errorId ? Boolean(testid(errorId)) : false,
    retry: retryId ? Boolean(testid(retryId)) : false,
    scrollRegions,
    shell: {
      app: Boolean(document.querySelector(".app-shell")),
      testid: Boolean(document.querySelector('[data-testid="app-shell"]')),
    },
    dir: document.documentElement.dir,
    pathname: location.pathname,
  };
})()`;

/* ------------------------------------------------------------------ */
/* CDP                                                                 */
/* ------------------------------------------------------------------ */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function connect(url, onEvent) {
  const ws = new WebSocket(url);
  let nextId = 1;
  const pending = new Map();
  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
      return;
    }
    if (msg.method) {
      try {
        onEvent?.(msg);
      } catch {
        /* event handlers must never break the harness */
      }
    }
  });
  const ready = new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });
  return {
    ready,
    send(method, params = {}) {
      const id = nextId++;
      ws.send(JSON.stringify({ id, method, params }));
      return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
    },
    close: () => ws.close(),
  };
}

async function waitForHttp(url, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      /* keep waiting */
    }
    await sleep(250);
  }
  return false;
}

/* ------------------------------------------------------------------ */
/* boot                                                                */
/* ------------------------------------------------------------------ */

async function main() {
  await rm(CHROME_PROFILE, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
  await mkdir(SHOTS, { recursive: true });

  const server = spawn(
    process.platform === "win32" ? "cmd.exe" : "npm",
    process.platform === "win32"
      ? ["/c", "npm", "run", "dev", "--", "--port", String(APP_PORT), "--strictPort"]
      : ["run", "dev", "--", "--port", String(APP_PORT), "--strictPort"],
    {
      cwd: FRONTEND,
      stdio: ["ignore", "pipe", "pipe"],
      // The checked-in .env points elsewhere. Force the intercepted fixture host.
      env: {
        ...process.env,
        VITE_API_BASE_URL: "https://center-system.runasp.net/Api/V1",
        VITE_HUB_API_URL: "https://center-system.runasp.net/",
      },
    },
  );
  let serverLog = "";
  server.stdout.on("data", (d) => {
    serverLog += d.toString();
  });
  server.stderr.on("data", (d) => {
    serverLog += d.toString();
  });

  const chrome = spawn(
    CHROME,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--no-first-run",
      "--no-default-browser-check",
      "--force-device-scale-factor=1",
      `--user-data-dir=${CHROME_PROFILE}`,
      `--remote-debugging-port=${PORT}`,
      "about:blank",
    ],
    { stdio: "ignore" },
  );

  let client;
  try {
    if (!(await waitForHttp(`${BASE}/`))) {
      throw new Error(`Vite dev server did not start on ${APP_PORT}\n${serverLog.slice(-2000)}`);
    }

    let version;
    for (let i = 0; i < 80; i += 1) {
      try {
        version = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json();
        break;
      } catch {
        await sleep(250);
      }
    }
    if (!version) throw new Error("Chrome did not expose a debugging port");

    const created = await (
      await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" })
    ).json();

    const apiLog = [];
    const consoleLog = [];
    const pageErrors = [];

    const onEvent = async (msg) => {
      if (msg.method === "Runtime.consoleAPICalled") {
        try {
          consoleLog.push({
            type: msg.params.type,
            text: msg.params.args
              .map((arg) => arg.value ?? arg.description ?? "")
              .join(" "),
          });
        } catch {
          /* ignore malformed console events */
        }
        return;
      }
      if (msg.method === "Runtime.exceptionThrown") {
        try {
          pageErrors.push(msg.params.exceptionDetails?.exception?.description ?? msg.params.exceptionDetails?.text ?? "error");
        } catch {
          /* ignore */
        }
        return;
      }
      if (msg.method !== "Fetch.requestPaused") return;
      const { requestId, request } = msg.params;
      apiLog.push({
        method: request.method,
        url: request.url,
        body: request.postData ?? null,
        at: Date.now(),
      });

      const cors = [
        { name: "Access-Control-Allow-Origin", value: ORIGIN },
        { name: "Access-Control-Allow-Credentials", value: "true" },
        {
          name: "Access-Control-Allow-Methods",
          value: "GET,POST,PUT,PATCH,DELETE,OPTIONS",
        },
        {
          name: "Access-Control-Allow-Headers",
          value:
            "authorization,content-type,accept,origin,x-requested-with,x-signalr-user-agent",
        },
        { name: "Access-Control-Expose-Headers", value: "content-type" },
        { name: "Vary", value: "Origin" },
      ];

      try {
        if (request.method === "OPTIONS") {
          await client.send("Fetch.fulfillRequest", {
            requestId,
            responseCode: 204,
            responseHeaders: cors,
          });
          return;
        }

        const fixture = fixtureFor(request.url);
        const status = fixture?.__status ?? 200;
        const payload = fixture?.__body ?? fixture;

        await client.send("Fetch.fulfillRequest", {
          requestId,
          responseCode: status,
          responseHeaders: [
            ...cors,
            { name: "Content-Type", value: "application/json; charset=utf-8" },
          ],
          body: Buffer.from(JSON.stringify(payload)).toString("base64"),
        });
      } catch {
        try {
          await client.send("Fetch.continueRequest", { requestId });
        } catch {
          /* page may have navigated away */
        }
      }
    };

    client = connect(created.webSocketDebuggerUrl, (msg) => {
      onEvent(msg).catch(() => {});
    });
    await client.ready;
    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("Fetch.enable", {
      patterns: [{ urlPattern: "*runasp.net*", requestStage: "Request" }],
    });

    const evaluate = async (expression, awaitPromise = false) => {
      const res = await client.send("Runtime.evaluate", {
        expression,
        awaitPromise,
        returnByValue: true,
      });
      if (res.exceptionDetails) {
        throw new Error(res.exceptionDetails.exception?.description || "evaluate failed");
      }
      return res.result.value;
    };

    await client.send("Page.addScriptToEvaluateOnNewDocument", {
      source: String.raw`
        try { localStorage.setItem("cm-theme", "light"); } catch (e) {}
      `,
    });

    let themeScript = null;
    const setTheme = async (theme) => {
      if (themeScript) {
        await client
          .send("Page.removeScriptToEvaluateOnNewDocument", { identifier: themeScript })
          .catch(() => {});
        themeScript = null;
      }
      const { identifier } = await client.send("Page.addScriptToEvaluateOnNewDocument", {
        source: `try { localStorage.setItem("cm-theme", ${JSON.stringify(theme)}); } catch (e) {}`,
      });
      themeScript = identifier;
    };

    const waitForSelector = async (selector, timeout = 15000) => {
      const start = Date.now();
      while (Date.now() - start < timeout) {
        if (await evaluate(`!!document.querySelector(${JSON.stringify(selector)})`)) return true;
        await sleep(100);
      }
      return false;
    };

    const waitForSwap = async () => {
      for (let i = 0; i < 150; i += 1) {
        const swapped = await evaluate(
          "typeof window.__navToken === 'undefined' && document.readyState === 'complete'",
        );
        if (swapped) return true;
        await sleep(100);
      }
      return false;
    };

    const navigate = async (path, theme, metrics, waits = []) => {
      await setTheme(theme);
      await client.send("Emulation.setDeviceMetricsOverride", {
        width: metrics.width,
        height: metrics.height,
        screenWidth: metrics.width,
        screenHeight: metrics.height,
        deviceScaleFactor: metrics.dsf ?? 1,
        mobile: false,
      });
      await evaluate("window.__navToken = true; true");
      await client.send("Page.navigate", { url: `${BASE}${path}` });
      await waitForSwap();
      for (const selector of waits) {
        await waitForSelector(selector);
      }
      // Both local faces are declared, but a face only becomes "loaded" once
      // something uses it. Force both so the font assertion measures the
      // font's availability rather than lazy-load timing on an error page.
      await evaluate(
        "Promise.all([document.fonts.load('12px Tajawal'), document.fonts.load('12px Manrope')]).then(() => true)",
        true,
      );
      await evaluate("document.fonts.ready.then(() => true)", true);
      await sleep(650);

      const expectedDark = theme === "dark";
      const isDark = await evaluate(
        "document.documentElement.classList.contains('dark')",
      );
      if (isDark !== expectedDark) {
        await evaluate(
          `window.__navToken = true; localStorage.setItem("cm-theme", ${JSON.stringify(theme)}); location.reload();`,
        );
        await waitForSwap();
        for (const selector of waits) {
          await waitForSelector(selector);
        }
        // Both local faces are declared, but a face only becomes "loaded" once
      // something uses it. Force both so the font assertion measures the
      // font's availability rather than lazy-load timing on an error page.
      await evaluate(
        "Promise.all([document.fonts.load('12px Tajawal'), document.fonts.load('12px Manrope')]).then(() => true)",
        true,
      );
      await evaluate("document.fonts.ready.then(() => true)", true);
        await sleep(650);
      }
    };

    const preparePage = async (page, theme, metrics) => {
      await navigate(page.path, theme, metrics, [page.wait]);
    };

    const setAuditScope = async (scope) => {
      await evaluate(
        `window.__AUDIT_SCOPE__ = ${scope ? JSON.stringify(scope) : "null"}; true`,
      );
    };

    const audit = async (scope) => {
      await setAuditScope(scope);
      return evaluate(AUDIT);
    };

    const probeFor = async (page) => {
      await setAuditScope(page.scope);
      await evaluate(
        `window.__STAT_SELECTOR__ = ${page.statSelector ? JSON.stringify(page.statSelector) : "null"}; true`,
      );
      await evaluate(
        `window.__ERROR_TESTID__ = ${page.errorTestid ? JSON.stringify(page.errorTestid) : "null"}; true`,
      );
      await evaluate(
        `window.__RETRY_TESTID__ = ${page.retryTestid ? JSON.stringify(page.retryTestid) : "null"}; true`,
      );
      return evaluate(PROBE);
    };

    const screenshot = async (name, { full = false } = {}) => {
      const params = { format: "png", fromSurface: true };
      if (full) {
        const metrics = await client.send("Page.getLayoutMetrics");
        const size = metrics.cssContentSize || metrics.contentSize;
        const width = Math.max(1, Math.ceil(size.width));
        const height = Math.max(1, Math.ceil(size.height));
        params.captureBeyondViewport = true;
        params.clip = { x: 0, y: 0, width, height, scale: 1 };
      }
      const { data } = await client.send("Page.captureScreenshot", params);
      await writeFile(join(SHOTS, name), Buffer.from(data, "base64"));
    };

    const leaksSince = (index) => consoleLog.slice(index).filter((e) => SENSITIVE_RE.test(e.text));

    const runPage = async (page, viewport, theme) => {
      const [id, width, height] = viewport;
      setScenario(page.scenario);
      const consoleStart = consoleLog.length;
      await preparePage(page, theme, { width, height });
      await audit(page.scope);
      await sleep(200);
      const result = await audit(page.scope);
      const shell = page.shell ? await audit(page.shell) : null;
      const probe = await probeFor(page);
      await screenshot(`${page.key}-${id}-${theme}.png`, { full: page.full });
      return {
        page: page.key,
        id,
        width,
        height,
        theme,
        ...result,
        shell: shell
          ? {
              smallCount: shell.smallCount,
              small: shell.small,
              coveredCount: shell.coveredCount,
            }
          : null,
        probe,
        consoleLeaks: leaksSince(consoleStart).length,
      };
    };

    const runs = [];
    const failures = [];
    const probes = {};
    probes.exportsUnchanged = inspectExportSources();
    if (probes.exportsUnchanged.batch10Changed.length) {
      failures.push(
        `exports guard: batch 10 export/print sources changed (${probes.exportsUnchanged.batch10Changed.join(", ")})`,
      );
    }

    for (const page of pages) {
      const viewports = VIEWPORTS.filter(
        (v) => page.viewports === undefined || page.viewports.includes(v[0]),
      ).filter((v) => RUN_VIEWPORTS.includes(v[0]));

      for (const viewport of viewports) {
        for (const theme of THEMES.filter((t) => RUN_THEMES.includes(t))) {
          let run;
          const tag = `${page.key} ${viewport[0]} ${theme}`;
          try {
            run = await runPage(page, viewport, theme);
          } catch (error) {
            failures.push(`${tag}: ${error.message}`);
            continue;
          }
          runs.push(run);

          if (run.missingScope) {
            failures.push(`${tag}: audit scope "${run.missingScope}" is not on stage`);
            continue;
          }
          if (run.overflowX > 1 && !page.ignorePageOverflow)
            failures.push(`${tag}: horizontal page scroll ${run.overflowX}px`);
          if (run.outsideCount)
            failures.push(
              `${tag}: ${run.outsideCount} element(s) outside the viewport (${run.outside
                .slice(0, 3)
                .map((s) => `${s.tag}.${s.cls}`)
                .join(", ")})`,
            );
          if (run.smallCount)
            failures.push(
              `${tag}: ${run.smallCount} tap target(s) under 44px (${run.small
                .slice(0, 3)
                .map((s) => `${s.tag}.${s.cls} ${s.w}x${s.h} ${s.text}`)
                .join(", ")})`,
            );
          if (run.primaryCount)
            failures.push(
              `${tag}: ${run.primaryCount} primary text node(s) under 14px (${run.primary
                .slice(0, 3)
                .map((s) => `${s.tag}.${s.cls} ${s.fs}px ${s.text}`)
                .join(", ")})`,
            );
          if (run.clippedCount)
            failures.push(
              `${tag}: ${run.clippedCount} clipped text box(es) (${run.clipped
                .slice(0, 3)
                .map((s) => `${s.tag}.${s.cls} ${s.axis}+${s.by}px`)
                .join(", ")})`,
            );
          if (run.coveredCount)
            failures.push(`${tag}: ${run.coveredCount} covered interactive control(s)`);
          if (run.overlapCount)
            failures.push(`${tag}: ${run.overlapCount} overlapping card/section pair(s)`);
          if (run.dir !== "rtl") failures.push(`${tag}: document direction is not rtl`);
          if (!run.fonts.tajawal) failures.push(`${tag}: Tajawal not loaded`);
          if (!run.fonts.manrope) failures.push(`${tag}: Manrope not loaded`);
          if (run.contrastLow.length)
            failures.push(
              `${tag}: ${run.contrastLow.length} contrast failure(s) (${run.contrastLow
                .slice(0, 3)
                .map((c) => `${c.ratio}:1 ${c.fs}px "${c.text}"`)
                .join(", ")})`,
            );
          if (run.badText.length)
            failures.push(`${tag}: placeholder text (${run.badText.join(", ")})`);
          if (run.shell?.smallCount)
            failures.push(
              `${tag}: ${run.shell.smallCount} shell tap target(s) under 44px (${run.shell.small
                .slice(0, 3)
                .map((s) => `${s.tag} ${s.w}x${s.h} ${s.text}`)
                .join(", ")})`,
            );
          if (run.shell?.coveredCount)
            failures.push(`${tag}: ${run.shell.coveredCount} covered shell control(s)`);
          if (run.consoleLeaks)
            failures.push(`${tag}: ${run.consoleLeaks} sensitive console message(s)`);

          const p = run.probe || {};
          const text = p.text || "";

          if (!p.shell?.app && !p.shell?.testid)
            failures.push(`${tag}: app shell is missing`);
          if (page.heading && !(p.heading || "").includes(page.heading))
            failures.push(`${tag}: heading "${p.heading}" does not include "${page.heading}"`);

          if (page.rowKey) {
            const got = p.counts?.[page.rowKey] ?? 0;
            if (got !== page.expectRows)
              failures.push(`${tag}: ${page.rowKey} = ${got}, expected ${page.expectRows}`);
          }
          if (page.expectStats && (p.stats ?? 0) < page.expectStats)
            failures.push(`${tag}: ${p.stats} stat cards, expected >= ${page.expectStats}`);

          if (page.expectEmpty && !/لا توجد مراكز/.test(text))
            failures.push(`${tag}: empty-state message is missing`);

          if (page.errorTestid && (!p.error || !p.retry)) {
            failures.push(
              `${tag}: error+retry testids missing (error=${p.error}, retry=${p.retry}; found ${JSON.stringify(p.counts?.errorTestids)}/${JSON.stringify(p.counts?.retryTestids)})`,
            );
          }

          const expectedText = page.expectText ?? [];
          if (expectedText.length) {
            if (page.expectTextMode === "any") {
              if (!expectedText.some((label) => text.includes(label)))
                failures.push(
                  `${tag}: none of ${JSON.stringify(expectedText)} is present`,
                );
            } else {
              for (const label of expectedText) {
                if (!text.includes(label))
                  failures.push(`${tag}: "${label}" is missing`);
              }
            }
          }

          if (page.expectRedirect && !(p.pathname || "").endsWith(page.expectRedirect))
            failures.push(
              `${tag}: final URL "${p.pathname}" does not end with ${page.expectRedirect}`,
            );

          if (p.table) {
            const regions = p.scrollRegions || [];
            const keyboardReady = regions.some(
              (r) =>
                r.tabIndex === "0" &&
                /^(auto|scroll)$/.test(r.overflowX) &&
                (r.label || "").trim().length > 0,
            );
            if (!keyboardReady)
              failures.push(
                `${tag}: table is not in a labelled, keyboard-accessible scroll container`,
              );
          }
        }
      }
    }

    /* ---------- print emulation invariant (batch 10) ---------- */
    const hasPage = (key) => pages.some((p) => p.key === key);

    if (hasPage("centers")) {
      setScenario("superadmin");
      await navigate("/centers", "light", { width: 390, height: 844 }, [
        '[data-testid="centers-page"]',
      ]);
      const screenOverflowX = await evaluate(
        "Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth)",
      );
      await client.send("Emulation.setEmulatedMedia", { media: "print" });
      await sleep(250);
      const printed = await evaluate(String.raw`(() => {
        const controls = [...document.querySelectorAll(".no-print, [class*='no-print']")];
        const de = document.documentElement;
        return {
          noPrint: controls.length,
          noPrintHidden: controls.every((el) => {
            const cs = getComputedStyle(el);
            return cs.display === "none" || cs.visibility === "hidden";
          }),
          overflowX: Math.max(0, de.scrollWidth - de.clientWidth),
          dir: de.dir,
          table: Boolean(document.querySelector("table")),
        };
      })()`);
      probes.printBatch10 = { screenOverflowX, ...printed };
      await screenshot("phase3b10-print-390-light.png", { full: true });
      await client.send("Emulation.setEmulatedMedia", { media: "screen" });

      if (!printed.noPrintHidden)
        failures.push("print batch 10: .no-print controls are still visible");
      if (printed.overflowX > 1)
        failures.push(`print batch 10: horizontal page scroll ${printed.overflowX}px`);
      if (printed.overflowX > screenOverflowX + 1)
        failures.push(
          `print batch 10: print media gained horizontal overflow (${screenOverflowX}px -> ${printed.overflowX}px)`,
        );
    }

    /* ---------- 200% text zoom ---------- */
    const textZoom = [];
    const textTargets = [
      { key: "centers", sizes: [["390", 390, 844], ["1440", 1440, 900]] },
      { key: "centers-error", sizes: [["390", 390, 844]] },
      { key: "subscriptions", sizes: [["390", 390, 844]] },
      { key: "subscriptions-expired", sizes: [["390", 390, 844]] },
      { key: "platform", sizes: [["390", 390, 844]] },
      { key: "audit", sizes: [["390", 390, 844]] },
      { key: "admin-redirect", sizes: [["390", 390, 844]] },
    ].filter((t) => RUN_PAGES.includes(t.key));

    for (const target of textTargets) {
      const page = PAGES.find((p) => p.key === target.key);
      if (!page) continue;

      for (const [id, width, height] of target.sizes) {
        for (const theme of THEMES.filter((t) => RUN_THEMES.includes(t))) {
          setScenario(page.scenario);
          const consoleStart = consoleLog.length;
          await preparePage(page, theme, { width, height });
          await sleep(300);
          await evaluate('document.documentElement.style.fontSize = "200%"; true');
          await sleep(650);
          const result = await audit(page.scope);
          textZoom.push({
            page: target.key,
            id,
            width,
            height,
            theme,
            ...result,
            consoleLeaks: leaksSince(consoleStart).length,
          });
          await screenshot(`${target.key}-${id}-${theme}-text200.png`);

          const tag = `text200 ${target.key} ${id} ${theme}`;
          if (result.missingScope) failures.push(`${tag}: scope missing`);
          if (result.overflowX > 1 && !page.ignorePageOverflow)
            failures.push(`${tag}: horizontal page scroll ${result.overflowX}px`);
          if (result.outsideCount)
            failures.push(`${tag}: ${result.outsideCount} element(s) outside the viewport`);
          if (result.clippedCount)
            failures.push(`${tag}: ${result.clippedCount} clipped text box(es)`);
          if (result.coveredCount)
            failures.push(`${tag}: ${result.coveredCount} covered control(s)`);
          if (result.overlapCount)
            failures.push(`${tag}: ${result.overlapCount} overlapping pair(s)`);
          if (result.primaryCount)
            failures.push(`${tag}: ${result.primaryCount} primary text node(s) under 14px`);
          if (result.smallCount)
            failures.push(`${tag}: ${result.smallCount} tap target(s) under 44px`);
          if (leaksSince(consoleStart).length)
            failures.push(`${tag}: sensitive console message(s)`);
        }
      }
    }

    /* ---------- 200% page zoom ---------- */
    const pageZoom = [];
    const zoomTargets = [
      { key: "centers" },
      { key: "subscriptions" },
      { key: "platform" },
    ].filter((t) => RUN_PAGES.includes(t.key));

    for (const target of zoomTargets) {
      const page = PAGES.find((p) => p.key === target.key);
      if (!page) continue;

      for (const theme of THEMES.filter((t) => RUN_THEMES.includes(t))) {
        const width = 1440;
        const height = 900;
        const zoomWidth = Math.round(width / 2);
        const zoomHeight = Math.round(height / 2);
        setScenario(page.scenario);
        const consoleStart = consoleLog.length;
        await preparePage(page, theme, { width: zoomWidth, height: zoomHeight, dsf: 2 });
        await sleep(450);
        const result = await audit(page.scope);
        pageZoom.push({
          page: target.key,
          id: "1440",
          width: zoomWidth,
          height: zoomHeight,
          theme,
          ...result,
          consoleLeaks: leaksSince(consoleStart).length,
        });
        await screenshot(`${target.key}-1440-${theme}-zoom200.png`);

        const tag = `zoom200 ${target.key} ${theme}`;
        if (result.missingScope) failures.push(`${tag}: scope missing`);
        if (result.overflowX > 1 && !page.ignorePageOverflow)
          failures.push(`${tag}: horizontal page scroll ${result.overflowX}px`);
        if (result.outsideCount)
          failures.push(`${tag}: ${result.outsideCount} element(s) outside the viewport`);
        if (result.clippedCount)
          failures.push(`${tag}: ${result.clippedCount} clipped text box(es)`);
        if (result.coveredCount)
          failures.push(`${tag}: ${result.coveredCount} covered control(s)`);
        if (result.overlapCount)
          failures.push(`${tag}: ${result.overlapCount} overlapping pair(s)`);
        if (result.primaryCount)
          failures.push(`${tag}: ${result.primaryCount} primary text node(s) under 14px`);
        if (result.smallCount)
          failures.push(`${tag}: ${result.smallCount} tap target(s) under 44px`);
        if (leaksSince(consoleStart).length)
          failures.push(`${tag}: sensitive console message(s)`);
      }
    }

    /* ---------- aggregate ---------- */
    const byPage = {};
    runs.forEach((r) => {
      byPage[r.page] ??= [];
      byPage[r.page].push({
        id: r.id,
        width: r.width,
        height: r.height,
        theme: r.theme,
        overflowX: r.overflowX,
        outside: r.outsideCount,
        small: r.smallCount,
        primary: r.primaryCount,
        clipped: r.clippedCount,
        covered: r.coveredCount,
        overlap: r.overlapCount,
        contrast: r.contrastMin,
        consoleLeaks: r.consoleLeaks,
        state: stateLabel(r.probe),
      });
    });

    const apiSummary = {};
    apiLog.forEach((call) => {
      const key = call.url
        .replace(/^https?:\/\/[^/]+/i, "")
        .replace(/[?].*$/, "")
        .slice(0, 80);
      apiSummary[key] = (apiSummary[key] || 0) + 1;
    });

    const consoleLeaks = consoleLog.filter((entry) => SENSITIVE_RE.test(entry.text));
    if (consoleLeaks.length) {
      failures.push(`console: ${consoleLeaks.length} sensitive message(s) leaked`);
    }

    const summary = {
      generated: new Date().toISOString(),
      viewports: VIEWPORTS.length,
      pages: pages.map((p) => p.key),
      runs: runs.length + textZoom.length + pageZoom.length,
      baseRuns: runs.length,
      textZoom: textZoom.length,
      pageZoom: pageZoom.length,
      failures,
      byPage,
      apiCalls: Object.keys(apiSummary).length,
      apiSummary,
      console: { entries: consoleLog.length, leaks: consoleLeaks.length },
      pageErrors: pageErrors.length,
    };

    await writeFile(
      join(OUT, "batch10-verify.json"),
      JSON.stringify({ summary, runs, probes, textZoom, pageZoom, consoleLog, pageErrors }, null, 2),
    );

    /* ---------- markdown ---------- */
    const md = [];
    md.push("# المرحلة 3 — دفعة 10: المراكز والاشتراكات والمنصة وسجل المراجعة", "");
    md.push(`تم التوليد: ${summary.generated}`, "");
    md.push(
      `النتيجة: **${failures.length ? "FAIL" : "ALL PASS"}** — ${summary.runs} تشغيلًا: ` +
        `${runs.length} تشغيلًا أساسيًا، ${textZoom.length} تكبير نص 200%، ${pageZoom.length} تكبير صفحة 200%.`,
      "",
    );
    md.push(
      "الحالات: إدارة المراكز (قائمة/فراغ/خطأ)، الاشتراكات (قائمة/منتهية وسماح/خطأ)، إحصائيات المنصة (قائمة/خطأ)، سجل المراجعة (قائمة/خطأ)، ثم إعادة توجيه /admin إلى /centers. دور واحد: SuperAdmin بصلاحيات كاملة واشتراك فعّال.",
      "",
    );
    md.push(
      "تُفحص كل شاشة على 360/390/768/1024/1280/1440/1920/2560 وأفقيًا 844×390 و640×360، فاتحًا وليليًا، مع تدقيق التمرير الأفقي وأهداف اللمس 44px ونص 14px والقطع والتراكب والتباين والخطوط المحلية، إضافة إلى ثبات ملفات التصدير/الطباعة.",
      "",
    );

    md.push("## بوابات الجودة", "");
    md.push("| البوابة | الأمر | النتيجة |");
    md.push("| --- | --- | --- |");
    md.push(
      `| اختبارات الوحدة | \`npx vitest run\` من \`Frontend/CenterManagement\` | ${process.env.PHASE3B10_VITEST || "—"} |`,
    );
    md.push(
      `| بناء الإنتاج | \`npm run build\` | ${process.env.PHASE3B10_BUILD || "—"} |`,
    );
    md.push(
      `| اختبارات الباك | \`dotnet test --no-build\` | ${process.env.PHASE3B10_DOTNET || "—"} |`,
    );
    md.push(
      `| دخان E2E | \`npm run test:smoke\` + \`npm run test:lists\` | ${process.env.PHASE3B10_E2E || "—"} |`,
    );
    md.push(
      `| طباعة/CSV (انحدار الدفعة 9) | فحص batch9 مضيّق | ${process.env.PHASE3B10_PRINT_CSV || "—"} |`,
    );
    md.push("");

    md.push("## ملخص المصفوفة", "");
    md.push(
      `المقاسات (${VIEWPORTS.length}): ${VIEWPORTS.map((v) => v[0]).join("، ")}. الوضعان: ${THEMES.join(" / ")}. الحالات المطلوبة: ${pages.length}.`,
      "",
    );
    md.push("| الحالة | المسار | المقاسات | التشغيلات الأساسية |");
    md.push("| --- | --- | --- | --- |");
    pages.forEach((page) => {
      const count = runs.filter((r) => r.page === page.key).length;
      md.push(`| ${page.key} | \`${page.path}\` | ${RUN_VIEWPORTS.length} | ${count} |`);
    });
    md.push("");

    const table = (pageKey) => {
      const page = PAGES.find((p) => p.key === pageKey);
      md.push(`## ${pageKey} — ${page.expect}`, "");
      md.push(
        "| المقاس | الوضع | تمرير أفقي | خارج الشاشة | أهداف <44 | نص <14 | نص مقطوع | تغطية | تراكب | أقل تباين | تسريب كونسول | الحالة |",
      );
      md.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
      runs
        .filter((r) => r.page === pageKey)
        .forEach((r) => {
          md.push(
            `| ${r.id} (${r.width}×${r.height}) | ${r.theme} | ${r.overflowX}px | ${r.outsideCount} | ${r.smallCount} | ${r.primaryCount} | ${r.clippedCount} | ${r.coveredCount} | ${r.overlapCount} | ${r.contrastMin ?? "-"}:1 | ${r.consoleLeaks} | ${stateLabel(r.probe)} |`,
          );
        });
      md.push("");
    };

    pages.forEach((p) => table(p.key));

    md.push("## فحوصات سلوكية", "");
    md.push("```json");
    md.push(JSON.stringify(probes, null, 2));
    md.push("```", "");

    md.push("## فحص الطباعة (batch 10)", "");
    md.push("```json");
    md.push(JSON.stringify(probes.printBatch10 ?? null, null, 2));
    md.push("```", "");
    md.push(
      "تُحاكى الطباعة بـ `Emulation.setEmulatedMedia({media:'print'})` بعد عرض /centers بمقاس 390 فاتح؛ يُفحص إخفاء عناصر `.no-print` وعدم زيادة التمرير الأفقي، ثم تُلتقط لقطة وتُعاد الوسيط إلى `screen`.",
      "",
    );

    md.push("## ثبات ملفات التصدير/الطباعة", "");
    md.push(
      `فُحصت ${probes.exportsUnchanged.checked.length} مسارًا عبر \`git diff --name-only HEAD\`.`,
      "",
    );
    md.push("```json");
    md.push(JSON.stringify(probes.exportsUnchanged, null, 2));
    md.push("```", "");

    md.push("## تكبير النص 200%", "");
    md.push(
      "| الحالة | المقاس | الوضع | تمرير أفقي | خارج الشاشة | نص مقطوع | تغطية | تراكب | نص <14 | لمس <44 |",
    );
    md.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
    textZoom.forEach((r) => {
      md.push(
        `| ${r.page} | ${r.id} | ${r.theme} | ${r.overflowX}px | ${r.outsideCount} | ${r.clippedCount} | ${r.coveredCount} | ${r.overlapCount} | ${r.primaryCount} | ${r.smallCount} |`,
      );
    });
    md.push("");

    md.push("## تكبير الصفحة 200% (عرض CSS نصف العرض)", "");
    md.push(
      "| الحالة | عرض CSS | الوضع | تمرير أفقي | خارج الشاشة | نص مقطوع | تغطية | تراكب | نص <14 | لمس <44 |",
    );
    md.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
    pageZoom.forEach((r) => {
      md.push(
        `| ${r.page} | ${r.width}px | ${r.theme} | ${r.overflowX}px | ${r.outsideCount} | ${r.clippedCount} | ${r.coveredCount} | ${r.overlapCount} | ${r.primaryCount} | ${r.smallCount} |`,
      );
    });
    md.push("");

    md.push("## طلبات الـ API المعترضة", "");
    md.push(`إجمالي المسارات المختلفة: ${summary.apiCalls}`, "");
    md.push("```json");
    md.push(JSON.stringify(apiSummary, null, 2));
    md.push("```", "");
    md.push("## وحدة التحكم", "");
    md.push(
      `سجلت ${summary.console.entries} رسالة، والتسريبات الحساسة ${summary.console.leaks}، واستثناءات الصفحة ${summary.pageErrors}.`,
      "",
    );
    if (consoleLeaks.length) {
      md.push("```json");
      md.push(JSON.stringify(consoleLeaks.slice(0, 10), null, 2));
      md.push("```", "");
    }

    md.push("## اللقطات", "");
    md.push(
      "`docs/design/shots/phase3b10/` — لقطة لكل حالة/مقاس/وضع (صفحة كاملة)، ولقطات تكبير النص والصفحة 200% ولقطة الطباعة `phase3b10-print-390-light.png`.",
      "",
    );

    md.push("## حدود الفحص الآلي", "");
    md.push(
      "- **لا SQL Server حقيقي.** كل الشاشات تقرأ استجابات معترضة بـ fixtures؛ الأرقام الكبيرة والأسماء الطويلة وحالات الفراغ والخطأ اصطناعية لاختبار العرض.",
      "- **لا شبكة إنتاجية.** كل طلبات الـ API معترضة؛ لا قياس لزمن الاستجابة أو سلوك إعادة المحاولة الحقيقي.",
      "- **جهاز/متصفح واحد.** كل اللقطات والقياسات من Chromium سطح مكتب (CDP)؛ لا Safari ولا Firefox ولا أحجام خطوط iOS/Android.",
      "- **اللمس والتمرير محاكيان.** أحجام الأهداف (44px) والتمرير الأفقي والتراكب والتباين تُحسب من CSSOM و`getBoundingClientRect`؛ لا إيماءات لمس فعلية.",
      "- **لا طابعة حقيقية.** الطباعة مُحاكاة بـ `Emulation.setEmulatedMedia`؛ يُفحص إخفاء `.no-print` وثبات العرض الأفقي، لا شكل الورقة الفعلي.",
      "- **لا قارئ شاشة حقيقي.** تُفحص دلالات DOM (dir، aria-label، tabindex،-heading) فقط؛ لا إعلان فعلي لقارئ الشاشة.",
      "- **الإشعارات الحيّة غير مقاسة.** SignalR معترض؛ لا يصل إشعار جديد أثناء التشغيل.",
      "- **أزرار المودالات لم تُختبر في هذه الأداة.** فُحصت في اختبارات التكامل `batch10SuperAdmin.test.jsx` (تأكيد الإيقاف، كلمة المرور المؤقتة، التجديد والتعديل)؛ لم تُخترع مُحددات جديدة هنا.",
      "",
    );

    if (failures.length) {
      md.push("## الإخفاقات", "");
      failures.forEach((f) => md.push(`- ${f}`));
    } else {
      md.push(
        "لا إخفاقات: كل الحالات سليمة في كل مقاس ووضع، بلا تمرير أفقي أو قطع أو تراكب، كل هدف لمس ≥44px، النص الأساسي ≥14px، الخطوط محلية، التباين AA، والتكبير 200% سليم.",
        "",
      );
    }
    await writeFile(join(OUT, "batch10-verify.md"), md.join("\n"));

    if (failures.length) process.exitCode = 1;
    console.log(failures.length ? `FAIL (${failures.length})` : "ALL PASS");
    failures.slice(0, 160).forEach((f) => console.log(" - " + f));
    console.log(
      JSON.stringify(
        {
          runs: summary.runs,
          baseRuns: summary.baseRuns,
          textZoom: summary.textZoom,
          pageZoom: summary.pageZoom,
          byPage: Object.fromEntries(
            Object.entries(byPage).map(([k, v]) => [k, v.length]),
          ),
          probes,
        },
        null,
        2,
      ),
    );
  } finally {
    client?.close();
    chrome.kill();
    try {
      spawn("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
    } catch {
      server.kill();
    }
  }
}

function stateLabel(probe) {
  if (!probe) return "-";
  if (probe.error || probe.retry) return "error";
  if (probe.counts?.centerRows) return `centers · ${probe.counts.centerRows}`;
  if (probe.counts?.subscriptionRows) return `subscriptions · ${probe.counts.subscriptionRows}`;
  if (probe.counts?.auditRows) return `audit · ${probe.counts.auditRows}`;
  if (probe.stats) return `stats · ${probe.stats}`;
  if (probe.counts?.centerRows === 0) return "centers · empty";
  if (probe.table) return `table · ${probe.tableRows} rows`;
  return "-";
}

main().catch(async (error) => {
  console.error(error);
  process.exitCode = 1;
  // Preserve the batch 9 convention of always leaving reports behind, even if
  // an unexpected error aborts the run before the normal report section.
  try {
    await mkdir(OUT, { recursive: true });
    const payload = {
      summary: {
        generated: new Date().toISOString(),
        failures: [error?.message ?? String(error)],
        pages: RUN_PAGES,
      },
      probes: { exportsUnchanged: inspectExportSources() },
    };
    await writeFile(join(OUT, "batch10-verify.json"), JSON.stringify(payload, null, 2));
    await writeFile(
      join(OUT, "batch10-verify.md"),
      [
        "# المرحلة 3 — دفعة 10: المراكز والاشتراكات والمنصة وسجل المراجعة",
        "",
        `النتيجة: **FAIL**`,
        "",
        "انتهى التشغيل باستثناء غير متوقع قبل اكتمال المصفوفة:",
        "",
        `- ${error?.message ?? String(error)}`,
        "",
        "راجع `batch10-verify.json` وتأكد من إقلاع Vite وChrome قبل إعادة التشغيل.",
        "",
      ].join("\n"),
    );
  } catch {
    /* reporting must never mask the original failure */
  }
});
