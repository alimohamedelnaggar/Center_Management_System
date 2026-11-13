/**
 * Phase 3 — batch 3 (QR cards, bulk parent accounts, import wizard, one-time
 * credentials) automated checks.
 *
 *   node phase3-batch3-verify.mjs
 *
 * Boots the real Vite app, intercepts the live API over CDP `Fetch` with
 * deterministic fixtures that mirror the ASP.NET `Response<T>` envelopes, then
 * drives headless Chrome at every required viewport in light and dark:
 *
 *   /qr-cards               -> printable student cards (grid)
 *   /qr-cards               -> empty centre
 *   /qr-cards               -> email dialog
 *   /bulk-parent-accounts   -> filters, then the created/linked/skipped result
 *   /dashboard              -> Excel wizard step 1 / 2 / 3 / 4
 *   /dashboard              -> one-time parent credentials dialog
 *
 * Checks: no page scroll, 44px targets, >=14px primary text, no clipped text,
 * no overlay covering a control, no overlapping cards, RTL, local fonts, WCAG
 * AA, the expected state is on stage, the QR print contract (only the staged
 * card is visible in print media), the real preview/commit numbers, and 200%
 * text + page zoom. Writes phase3/batch3-verify.json + .md and screenshots into
 * shots/phase3b3/.
 *
 * Narrow for a fast iteration:
 *   PHASE3B3_PAGES=qr-cards PHASE3B3_VIEWPORTS=390 PHASE3B3_THEMES=dark
 */
import { spawn } from "node:child_process";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = join(HERE, "..", "..", "Frontend", "CenterManagement");
const OUT = join(HERE, "phase3");
const SHOTS = join(HERE, "shots", "phase3b3");
const PROFILE = join(process.env.TEMP || "/tmp", "opencode", "chrome-phase3b3-verify");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9469;
const APP_PORT = 5203;
const BASE = `http://127.0.0.1:${APP_PORT}`;
const ORIGIN = BASE;
const FIXTURE_FILE = join(process.env.TEMP || "/tmp", "opencode", "phase3b3-students.xlsx");

const VIEWPORTS = [
  ["360", 360, 800],
  ["390", 390, 844],
  ["768", 768, 1024],
  ["1280", 1280, 800],
  ["1920", 1920, 1080],
  ["land-844", 844, 390],
];

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

const GROUPS = [
  { id: "g1", name: "مجموعة أ" },
  { id: "g2", name: "مجموعة ب" },
  { id: "g3", name: "مجموعة ج" },
];

const NAMES = [
  "أحمد علي",
  "منى حسن",
  "يوسف إبراهيم",
  "سارة محمد",
  "خالد سمير",
  "نور الدين",
  "مريم عادل",
  "عمر فاروق",
  "هبة الله",
  "زياد مصطفى",
];

const STUDENTS = NAMES.map((fullName, index) => ({
  id: `s${index + 1}`,
  fullName,
  phone: `0101234${String(5670 + index).padStart(4, "0")}`,
  phoneParent: `0111234${String(5670 + index).padStart(4, "0")}`,
  groupId: GROUPS[index % GROUPS.length].id,
  groupName: GROUPS[index % GROUPS.length].name,
  school: index % 2 === 0 ? "مدرسة الأمل" : "مدرسة النيل",
  isActive: index % 4 !== 3,
  isPaid: index % 3 === 0,
  subscriptionType: index % 2 === 0 ? 2 : 1,
  customMonthlyPrice: index % 5 === 0 ? 250 : null,
  createdAt: `2026-10-${String((index % 28) + 1).padStart(2, "0")}T10:00:00Z`,
}));

// 8 cards: the first 6 already have a code, the last 2 do not (the banner).
const QR_STUDENTS = STUDENTS.slice(0, 8).map((student, index) => ({
  ...student,
  qrCode: index < 6 ? `STU${String(index + 1).padStart(4, "0")}` : "",
}));

const BULK_RESULT = {
  created: [
    {
      studentId: "s1",
      studentName: "أحمد علي",
      groupName: "مجموعة أ",
      parentPhone: "01112345670",
      username: "01112345670",
      temporaryPassword: "Pt-1A2b3C",
    },
    {
      studentId: "s2",
      studentName: "منى حسن",
      groupName: "مجموعة ب",
      parentPhone: "01112345671",
      username: "01112345671",
      temporaryPassword: "Pt-4D5e6F",
    },
  ],
  linked: [
    {
      studentId: "s3",
      studentName: "يوسف إبراهيم",
      groupName: "مجموعة ج",
      parentPhone: "01112345672",
      username: "01112345672",
    },
  ],
  skipped: [
    {
      studentId: "s4",
      studentName: "سارة محمد",
      groupName: "مجموعة أ",
      parentPhone: "01112345673",
      reason: "ولي الأمر مرتبط بالفعل",
    },
  ],
};

const IMPORT_ROWS = [
  {
    rowNumber: 2,
    fullName: "أحمد محمد",
    phone: "01012345678",
    phoneParent: "01112345678",
    groupName: "مجموعة أ",
    groupId: "g1",
    isValid: true,
    isDuplicateInFile: false,
    isDuplicateInDb: false,
    errors: [],
  },
  {
    rowNumber: 3,
    fullName: "منى حسن",
    phone: "01298765432",
    phoneParent: "01198765432",
    groupName: "مجموعة ب",
    groupId: "g2",
    isValid: true,
    isDuplicateInFile: false,
    isDuplicateInDb: false,
    errors: [],
  },
  {
    rowNumber: 4,
    fullName: "يوسف إبراهيم",
    phone: "01055556666",
    phoneParent: "01155556666",
    groupName: "مجموعة ج",
    groupId: "g3",
    isValid: true,
    isDuplicateInFile: false,
    isDuplicateInDb: true,
    canUpdate: true,
    errors: [],
  },
  {
    rowNumber: 5,
    fullName: "أحمد محمد",
    phone: "01012345678",
    phoneParent: "01112345678",
    groupName: "مجموعة أ",
    groupId: "g1",
    isValid: true,
    isDuplicateInFile: true,
    isDuplicateInDb: false,
    errors: [],
  },
  {
    rowNumber: 6,
    fullName: "",
    phone: "01234567890",
    phoneParent: "",
    groupName: "مجموعة جديدة",
    groupId: null,
    isValid: false,
    isDuplicateInFile: false,
    isDuplicateInDb: false,
    groupWillBeCreated: true,
    errors: ["الاسم الكامل مطلوب", "رقم هاتف ولي الأمر مطلوب"],
  },
];

const IMPORT_PREVIEW = {
  sessionId: "import-session-1",
  totalRows: 5,
  validRows: 2,
  duplicateInFile: 1,
  duplicateInDb: 1,
  errorRows: 1,
  rows: IMPORT_ROWS,
  headers: ["الاسم", "الهاتف", "هاتف ولي الأمر", "المجموعة"],
};

const IMPORT_COMMIT = {
  created: 2,
  updated: 1,
  skipped: 1,
  failed: 1,
  errors: [
    { rowNumber: 6, fullName: "", reason: "الاسم الكامل مطلوب" },
  ],
  createdGroups: ["مجموعة جديدة"],
  studentAccounts: [
    {
      fullName: "أحمد محمد",
      phone: "01012345678",
      username: "01012345678",
      temporaryPassword: "Stu-1A2b3C",
    },
    {
      fullName: "منى حسن",
      phone: "01298765432",
      username: "01298765432",
      temporaryPassword: "Stu-4D5e6F",
    },
  ],
  parentAccounts: [
    {
      studentName: "أحمد محمد",
      parentPhone: "01112345678",
      temporaryPassword: "Par-7G8h9I",
    },
  ],
};

const PARENT_CREDENTIAL = {
  studentId: "s1",
  studentName: "أحمد علي",
  parentPhone: "01112345670",
  temporaryPassword: "Acc#Temp2026",
};

const SCENARIOS = {
  qr: {
    data: "qr",
    role: "Teacher",
    centerAdmin: false,
    centerType: "MultiTeacher",
  },
  qrEmpty: {
    data: "qr-empty",
    role: "Teacher",
    centerAdmin: false,
    centerType: "MultiTeacher",
  },
  bulk: {
    data: "bulk",
    role: "CenterOwner",
    centerAdmin: true,
    centerType: "MultiTeacher",
  },
  wizard: {
    data: "import",
    role: "Teacher",
    centerAdmin: true,
    centerType: "SoloTeacher",
  },
  accounts: {
    data: "accounts",
    role: "Teacher",
    centerAdmin: true,
    centerType: "SoloTeacher",
  },
};

const ALL = ["360", "390", "768", "1280", "1920", "land-844"];

const PAGES = [
  {
    key: "qr-cards",
    path: "/qr-cards",
    wait: '[data-testid="qr-grid"]',
    scenario: "qr",
    scope: "qr-page",
    viewports: ALL,
    expect: "qr",
    full: true,
  },
  {
    key: "qr-empty",
    path: "/qr-cards",
    wait: '[data-testid="qr-empty"]',
    scenario: "qrEmpty",
    scope: "qr-page",
    viewports: ["390", "1280"],
    expect: "qr-empty",
    full: true,
  },
  {
    key: "qr-email-modal",
    path: "/qr-cards",
    wait: '[data-testid="qr-grid"]',
    scenario: "qr",
    action: "qr-email",
    expectWait: '[data-testid="qr-email-modal"]',
    scope: "qr-email-modal",
    viewports: ["390", "1280"],
    expect: "qr-email",
    full: false,
  },
  {
    key: "bulk-parents",
    path: "/bulk-parent-accounts",
    wait: '[data-testid="bulk-parents-page"]',
    scenario: "bulk",
    scope: "bulk-parents-page",
    viewports: ["390", "1280"],
    expect: "bulk",
    full: true,
  },
  {
    key: "bulk-parents-result",
    path: "/bulk-parent-accounts",
    wait: '[data-testid="bulk-parents-page"]',
    scenario: "bulk",
    action: "bulk-run",
    expectWait: '[data-testid="bulk-parents-cards"]',
    scope: "bulk-parents-page",
    viewports: ALL,
    expect: "bulk-result",
    full: true,
  },
  {
    key: "import-step1",
    path: "/dashboard",
    wait: '[data-testid="students-page"]',
    scenario: "wizard",
    action: "import-open",
    expectWait: '[data-testid="import-step-1"]',
    scope: "import-wizard",
    viewports: ALL,
    expect: "import-step1",
    full: false,
  },
  {
    key: "import-step2",
    path: "/dashboard",
    wait: '[data-testid="students-page"]',
    scenario: "wizard",
    action: "import-preview",
    expectWait: '[data-testid="import-step-2"]',
    scope: "import-wizard",
    viewports: ALL,
    expect: "import-preview",
    full: false,
  },
  {
    key: "import-step3",
    path: "/dashboard",
    wait: '[data-testid="students-page"]',
    scenario: "wizard",
    action: "import-options",
    expectWait: '[data-testid="import-step-3"]',
    scope: "import-wizard",
    viewports: ["390", "1280"],
    expect: "import-options",
    full: false,
  },
  {
    key: "import-step4",
    path: "/dashboard",
    wait: '[data-testid="students-page"]',
    scenario: "wizard",
    action: "import-commit",
    expectWait: '[data-testid="import-step-4"]',
    scope: "import-wizard",
    viewports: ["360", "390", "1280"],
    expect: "import-result",
    full: false,
  },
  {
    key: "accounts-modal",
    path: "/dashboard",
    wait: '[data-testid="students-table"]',
    scenario: "accounts",
    action: "accounts-open",
    expectWait: '[data-testid="accounts-modal"]',
    scope: "accounts-modal",
    viewports: ALL,
    expect: "accounts",
    full: false,
  },
];

/* Optional narrowing for fast iterations. */
const list = (value, fallback) =>
  value ? value.split(",").map((v) => v.trim()).filter(Boolean) : fallback;
const RUN_PAGES = list(process.env.PHASE3B3_PAGES, PAGES.map((p) => p.key));
const RUN_VIEWPORTS = list(process.env.PHASE3B3_VIEWPORTS, VIEWPORTS.map((v) => v[0]));
const RUN_THEMES = list(process.env.PHASE3B3_THEMES, THEMES);
const pages = PAGES.filter((p) => RUN_PAGES.includes(p.key));

/* ------------------------------------------------------------------ */
/* fixtures                                                            */
/* ------------------------------------------------------------------ */

const b64url = (value) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");

const NAME_CLAIM = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name";
const ID_CLAIM =
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier";
const ROLE_CLAIM =
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";

function makeJwt(scenario) {
  const header = { alg: "none", typ: "JWT" };
  const payload = {
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 6,
    iat: Math.floor(Date.now() / 1000),
    [ROLE_CLAIM]: scenario.role ?? "Teacher",
    [ID_CLAIM]: "43",
    [NAME_CLAIM]: scenario.name ?? "أ. محمد المدرس",
    PhoneNumber: "01000000000",
    is_center_admin: scenario.centerAdmin ? "true" : "false",
    pwd_change_required: "false",
    impersonation: "false",
  };
  if (scenario.impersonating) payload.impersonation = "true";
  return `${b64url(header)}.${b64url(payload)}.fixture`;
}

const ok = (data) => ({ succeeded: true, data });

const paginated = (items, totalCount) => ({
  succeeded: true,
  message: null,
  data: {
    items,
    totalCount,
    pageIndex: 1,
    pageSize: 10,
    totalPages: Math.max(1, Math.ceil(totalCount / 10)),
  },
});

const EMPTY_PAGE = paginated([], 0);

let SCENARIO = SCENARIOS.qr;
let QR_GENERATED = false;
const setScenario = (key) => {
  SCENARIO = SCENARIOS[key] || SCENARIOS.qr;
  QR_GENERATED = false;
};

const qrStudents = () =>
  QR_STUDENTS.map((student, index) =>
    QR_GENERATED && !student.qrCode
      ? { ...student, qrCode: `STU${String(index + 1).padStart(4, "0")}` }
      : student,
  );

function fixtureFor(url) {
  const lower = url.toLowerCase();

  if (lower.includes("authentication/refresh-token")) {
    return {
      accessToken: makeJwt(SCENARIO),
      mustChangePassword: false,
      enabledModules: ALL_MODULES,
      subscription: null,
    };
  }
  if (lower.includes("profile/getmyprofile")) {
    return ok({
      centerType: SCENARIO.centerType,
      subject: SCENARIO.role === "Teacher" ? "الرياضيات" : null,
      email: SCENARIO.role === "Teacher" ? "teacher@example.com" : null,
      enabledModules: ALL_MODULES,
      subscription: null,
    });
  }
  if (lower.includes("center/mycenter")) {
    return ok({
      id: 1,
      name: "مركز النبض التعليمي",
      logoUrl: null,
      themeColor: "#4F46E5",
      type: SCENARIO.centerType,
    });
  }

  /* ---------- QR cards ---------- */
  if (lower.includes("/student/generate-qr-codes")) {
    QR_GENERATED = true;
    return {
      succeeded: true,
      message: "تم توليد الأكواد الناقصة",
      data: { generated: 2 },
    };
  }

  /* ---------- bulk parent accounts ---------- */
  // Must come before `create-parent-accounts` (substring match).
  if (/\/student\/[^/]+\/create-parent-account$/i.test(url)) {
    return ok(PARENT_CREDENTIAL);
  }
  if (lower.includes("/student/create-parent-accounts")) {
    return {
      succeeded: true,
      message: "تم إنشاء حسابات أولياء الأمور",
      data: BULK_RESULT,
    };
  }

  /* ---------- Excel import ---------- */
  if (lower.includes("/student/import/preview")) {
    return ok(IMPORT_PREVIEW);
  }
  if (lower.includes("/student/import/commit")) {
    return {
      succeeded: true,
      message: "تم الاستيراد",
      data: IMPORT_COMMIT,
    };
  }
  if (lower.includes("/student/import/errors/")) {
    return ok([]);
  }

  /* ---------- email ---------- */
  if (lower.includes("/emailsroute/sendemail")) {
    return ok(true);
  }

  /* ---------- shared ---------- */
  if (lower.includes("/student/paginated")) {
    if (SCENARIO.slowList)
      return { __delay: 8000, payload: paginated(STUDENTS, 10) };
    const search = new URL(url).searchParams.get("search");
    if (SCENARIO.emptyOnSearch && search) return EMPTY_PAGE;
    if (SCENARIO.data === "empty" || SCENARIO.data === "qr-empty") return EMPTY_PAGE;
    if (SCENARIO.data === "qr") return paginated(qrStudents(), qrStudents().length);
    return paginated(STUDENTS, STUDENTS.length);
  }
  if (lower.includes("/group/get-all")) return ok(GROUPS);
  if (lower.includes("/student/stats")) {
    return ok({
      totalStudents: STUDENTS.length,
      activeStudents: 7,
      inactiveStudents: 3,
      newStudentsThisMonth: 2,
    });
  }
  if (lower.includes("/student/create") || lower.includes("/student/edit")) {
    return ok({ account: { username: "01012345678", temporaryPassword: "Temp#1234" } });
  }
  if (lower.includes("/student/delete/") || lower.includes("/student/change-")) {
    return ok(true);
  }
  // Unrelated background calls (including SignalR negotiate) must never hit the
  // real network.
  return ok([]);
}

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

/* ------------------------------------------------------------------ */
/* in-page audit                                                       */
/* ------------------------------------------------------------------ */

const AUDIT = String.raw`(() => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const round = (n) => Math.round(n * 10) / 10;

  const testid = (id) => document.querySelector('[data-testid="' + id + '"]');
  const scope = window.__AUDIT_SCOPE__ || null;
  const ROOT = scope ? testid(scope) : document;
  if (!ROOT) return { missingScope: scope };

  const qa = (sel) =>
    ROOT === document
      ? document.querySelectorAll(sel === "body *" ? "body *" : sel)
      : ROOT.querySelectorAll(sel === "body *" ? "*" : sel);

  const visible = (el) => {
    if (!el || !(el instanceof Element)) return false;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const describe = (el) => ({
    tag: el.tagName.toLowerCase(),
    cls:
      typeof el.className === "string" && el.className
        ? el.className.trim().split(/\s+/).slice(0, 2).join(".")
        : "",
  });
  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      w: Math.round(r.width),
      h: Math.round(r.height),
      left: Math.round(r.left),
      top: Math.round(r.top),
      bottom: Math.round(r.bottom),
    };
  };

  const de = document.documentElement;
  const overflowX = Math.max(0, de.scrollWidth - de.clientWidth);
  const overflowY = Math.max(0, de.scrollHeight - de.clientHeight);

  const clippedByAncestor = (el) => {
    let n = el.parentElement;
    while (n && n !== document.documentElement) {
      const cs = getComputedStyle(n);
      if (/hidden|clip/.test(cs.overflowX) || /hidden|clip/.test(cs.overflowY)) return true;
      n = n.parentElement;
    }
    return false;
  };

  /* 1 - anything sticking out of the viewport ------------------------ */
  const outside = [];
  qa("body *").forEach((el) => {
    if (!visible(el)) return;
    if (el.closest("svg, symbol, defs, [aria-hidden='true'], .sr-only")) return;
    // The printed student card is a fixed, deliberately tiny-print design that
    // must not change in this batch; it is measured by the print probe instead.
    if (el.closest(".qr-card")) return;
    if (clippedByAncestor(el)) return;
    const r = el.getBoundingClientRect();
    if (r.right > vw + 1.5 || r.left < -1.5) {
      outside.push({ ...describe(el), left: round(r.left), right: round(r.right) });
    }
  });

  /* 2 - 44px touch targets ------------------------------------------- */
  const SEL =
    "a[href], button, input:not([type=radio]):not([type=checkbox]):not([type=hidden]), select, textarea, [role=button], [role=tab]";
  const small = [];
  qa(SEL).forEach((el) => {
    if (!visible(el)) return;
    if (el.closest("[aria-hidden='true']")) return;
    const r = el.getBoundingClientRect();
    if (r.width + 0.5 < 44 || r.height + 0.5 < 44) {
      small.push({
        ...describe(el),
        w: round(r.width),
        h: round(r.height),
        text: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 24),
      });
    }
  });

  /* 3 - primary text never below 14px -------------------------------- */
  const PRIMARY_SEL = "p, li, td, th, h1, h2, h3, h4, label, button, a[href], input, select, textarea";
  const primary = [];
  qa(PRIMARY_SEL).forEach((el) => {
    if (!visible(el)) return;
    if (el.closest("[aria-hidden='true'], .sr-only, .qr-card")) return;
    if (el.closest("[aria-label='مسار التنقل']")) return;
    if (el.closest(".mobile-bottom-nav")) return;
    // A radio/checkbox has a value, not rendered text; its label carries the
    // copy and is measured on its own.
    if (
      el.tagName === "INPUT" &&
      /^(radio|checkbox|hidden|range|color|file)$/i.test(el.type)
    )
      return;
    const text = (el.value || el.textContent || "").trim();
    if (!text) return;
    if (/(^|\s)text-(xs|\[11px\]|\[10px\])/.test(el.className || "")) return;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs + 0.01 < 14) {
      primary.push({ ...describe(el), fs, text: text.slice(0, 24) });
    }
  });

  /* 4 - text clipped inside an overflow:hidden box ------------------- */
  const hasDirectText = (el) =>
    [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0);
  const clipped = [];
  qa("body *").forEach((el) => {
    if (!visible(el) || !hasDirectText(el)) return;
    if (el.closest("[aria-hidden='true'], .sr-only, .qr-card, .truncate, [class*='line-clamp'], [title], [data-scroll-region]"))
      return;
    const cs = getComputedStyle(el);
    if (/hidden|clip/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 1) {
      clipped.push({ ...describe(el), axis: "x", by: el.scrollWidth - el.clientWidth, text: el.textContent.trim().slice(0, 24) });
    } else if (/hidden|clip/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 1) {
      clipped.push({ ...describe(el), axis: "y", by: el.scrollHeight - el.clientHeight, text: el.textContent.trim().slice(0, 24) });
    }
  });

  /* 5 - an overlay must not cover an interactive control -------------- */
  const covered = [];
  qa(SEL).forEach((el) => {
    if (!visible(el)) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    if (cx < 1 || cy < 1 || cx > vw - 1 || cy > vh - 1) return;
    const top = document.elementFromPoint(cx, cy);
    if (!top) return;
    if (top === el || el.contains(top) || top.contains(el)) return;

    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    el.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
    const moved = el.getBoundingClientRect();
    const again = document.elementFromPoint(
      moved.left + moved.width / 2,
      moved.top + moved.height / 2,
    );
    window.scrollTo({ left: scrollX, top: scrollY, behavior: "instant" });
    if (!again || again === el || el.contains(again) || again.contains(el)) return;

    const tr = again.getBoundingClientRect();
    covered.push({
      ...describe(el),
      by: again.tagName.toLowerCase(),
      byCls: again.getAttribute("class") || "",
      byText: (again.textContent || "").trim().slice(0, 30),
      byRect: [Math.round(tr.left), Math.round(tr.top), Math.round(tr.width), Math.round(tr.height)],
      elRect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
    });
  });

  /* 6 - sibling cards/sections must not overlap ----------------------- */
  const blocks = [
    ...qa(
      '[data-testid^="section-"], [data-testid^="chart-"], .card-grid > *, [data-testid="student-card-stats"] > *, [data-testid="students-cards"] article, [data-testid="qr-grid"] > *, [data-testid="bulk-parents-cards"] > *, [data-testid="import-preview-cards"] > *',
    ),
  ].filter(visible);
  const overlaps = [];
  for (let i = 0; i < blocks.length; i += 1) {
    for (let j = i + 1; j < blocks.length; j += 1) {
      const a = blocks[i];
      const b = blocks[j];
      if (a.contains(b) || b.contains(a)) continue;
      const ar = a.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      const ix = Math.max(0, Math.min(ar.right, br.right) - Math.max(ar.left, br.left));
      const iy = Math.max(0, Math.min(ar.bottom, br.bottom) - Math.max(ar.top, br.top));
      const area = ix * iy;
      const minArea = Math.min(ar.width * ar.height, br.width * br.height);
      if (area > 4 && minArea > 0 && area > minArea * 0.05) {
        overlaps.push({ a: describe(a), b: describe(b), area: Math.round(area) });
      }
    }
  }

  /* 7 - contrast (text over non-gradient surfaces) -------------------- */
  const parse = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const lum = (c) => {
    const ch = (v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * ch(c.r) + 0.7152 * ch(c.g) + 0.0722 * ch(c.b);
  };
  const ratio = (a, b) => {
    const x = lum(a);
    const y = lum(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  };
  const bgOf = (el) => {
    let node = el;
    while (node && node !== document.documentElement) {
      const cs = getComputedStyle(node);
      const c = parse(cs.backgroundColor);
      if (c && c.a > 0.85) return c;
      node = node.parentElement;
    }
    return parse(getComputedStyle(document.body).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 };
  };
  const gradientAncestor = (el) => {
    let node = el;
    while (node && node !== document.documentElement) {
      if (getComputedStyle(node).backgroundImage !== "none") return true;
      node = node.parentElement;
    }
    return false;
  };
  const contrast = [];
  const contrastLow = [];
  qa("p, li, td, th, h1, h2, h3, h4, label, button, a[href], span, div")
    .forEach((el) => {
      if (!visible(el) || !hasDirectText(el)) return;
      if (el.closest("[aria-hidden='true'], .sr-only, svg, .qr-card")) return;
      if (gradientAncestor(el)) return;
      const fg = parse(getComputedStyle(el).color);
      const bg = bgOf(el);
      if (!fg || !bg) return;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      const fw = parseInt(getComputedStyle(el).fontWeight, 10) || 400;
      const large = fs >= 24 || (fs >= 18.66 && fw >= 700);
      const value = Math.round(ratio(fg, bg) * 100) / 100;
      contrast.push(value);
      if (value + 0.01 < (large ? 3 : 4.5)) {
        contrastLow.push({
          ...describe(el),
          ratio: value,
          fs,
          fg: getComputedStyle(el).color,
          bg: "rgba(" + bg.r + "," + bg.g + "," + bg.b + "," + bg.a + ")",
          text: el.textContent.trim().slice(0, 24),
        });
      }
    });

  /* 8 - fonts -------------------------------------------------------- */
  const faces = [...document.fonts];
  const isLoaded = (name) =>
    faces.some(
      (f) => f.family.replace(/["']/g, "").startsWith(name) && f.status === "loaded",
    );
  const fonts = {
    tajawal: isLoaded("Tajawal"),
    manrope: isLoaded("Manrope"),
    status: document.fonts.status,
    body: getComputedStyle(document.body).fontFamily,
  };

  /* 9 - batch 3 states ------------------------------------------------ */
  const textOf = (el) =>
    el ? (el.textContent || "").replace(/\s+/g, " ").trim() : "";

  const qrPage = testid("qr-page");
  const qrGrid = testid("qr-grid");
  const qrEmpty = testid("qr-empty");
  const qrLoading = testid("qr-loading");
  const qrEmail = testid("qr-email-modal");
  const qrPagination = testid("qr-pagination");
  const qrCards = qrGrid
    ? [...qrGrid.querySelectorAll('[data-testid^="qr-card-"]')]
    : [];

  const bulkPage = testid("bulk-parents-page");
  const bulkCards = testid("bulk-parents-cards");
  const bulkStats = testid("bulk-parents-stats");
  const bulkTable = bulkPage ? bulkPage.querySelector("table") : null;
  const bulkCardItems = bulkCards
    ? [...bulkCards.querySelectorAll('[data-testid="bulk-parent-card"]')]
    : [];

  const importWizard = testid("import-wizard");
  const importTitle = document.getElementById("import-wizard-title");
  const previewCards = testid("import-preview-cards");
  const importStepBox = importWizard ? textOf(importWizard) : "";
  const importStep = (importStepBox.match(/الخطوة\s+(\d)\s+من\s+4/) || [])[1] || null;
  const importPreviewTable =
    importStep === "2" ? importWizard.querySelector("table") : null;

  const accountsModal = testid("accounts-modal");
  const accountPasswords = accountsModal
    ? [...accountsModal.querySelectorAll('[data-testid^="accounts-password-"]')]
    : [];

  const modalInfo = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      role: el.getAttribute("role"),
      ariaModal: el.getAttribute("aria-modal"),
      box: box(el),
      inViewport: r.top >= -1 && r.bottom <= vh + 1,
      text: textOf(el).slice(0, 300),
    };
  };

  const ui = {
    qr: qrPage
      ? {
          page: true,
          gridVisible: qrGrid ? visible(qrGrid) : false,
          cardCount: qrCards.length,
          cardPrintButtons: qrCards.filter((card) =>
            card.querySelector('[data-testid^="qr-print-one-"]'),
          ).length,
          emptyVisible: qrEmpty ? visible(qrEmpty) : false,
          emptyText: textOf(qrEmpty).slice(0, 160),
          loadingVisible: qrLoading ? visible(qrLoading) : false,
          loadingText: textOf(qrLoading).slice(0, 90),
          missingText: textOf(testid("qr-missing-codes")),
          paginationVisible: qrPagination ? visible(qrPagination) : false,
          controls: {
            generate: Boolean(testid("qr-generate")) && visible(testid("qr-generate")),
            printAll: Boolean(testid("qr-print-all")) && visible(testid("qr-print-all")),
            email: Boolean(testid("qr-email-open")) && visible(testid("qr-email-open")),
            search: Boolean(testid("qr-search")) && visible(testid("qr-search")),
            group: Boolean(testid("qr-group")) && visible(testid("qr-group")),
            reset: Boolean(testid("qr-reset")) && visible(testid("qr-reset")),
          },
          email: qrEmail
            ? {
                ...modalInfo(qrEmail),
                fullText: textOf(qrEmail).slice(0, 2000),
                input: Boolean(testid("qr-email-input")),
                sendHeight: testid("qr-email-send")?.getBoundingClientRect().height ?? 0,
                cancel: Boolean(testid("qr-email-cancel")),
              }
            : null,
        }
      : null,
    bulk: bulkPage
      ? {
          page: true,
          tableVisible: bulkTable ? visible(bulkTable) : false,
          tableHeadings: bulkTable ? bulkTable.querySelectorAll("thead th").length : 0,
          tableFirstRowCells:
            bulkTable?.querySelector("tbody tr")?.querySelectorAll("td").length ?? 0,
          cardsVisible: bulkCards ? visible(bulkCards) : false,
          cardCount: bulkCardItems.length,
          firstCardText: textOf(bulkCardItems[0]).slice(0, 240),
          tabs: [...bulkPage.querySelectorAll('[role="tab"]')].map(textOf),
          stats: bulkStats
            ? [...bulkStats.children].map((card) =>
                (card.querySelector(".num")?.textContent || "").trim(),
              )
            : [],
          runVisible: [...bulkPage.querySelectorAll("button")].some((button) =>
            textOf(button).includes("إنشاء الحسابات"),
          ),
          exportDisabled: ["bulk-parents-export-excel", "bulk-parents-export-pdf"].map(
            (id) => {
              const el = testid(id);
              return el ? el.disabled : null;
            },
          ),
          text: textOf(bulkPage).slice(0, 320),
          fullText: textOf(bulkPage).slice(0, 3000),
        }
      : null,
    wizard: importWizard
      ? {
          page: true,
          ...modalInfo(importWizard),
          title: textOf(importTitle),
          step: importStep,
          stepVisible: [1, 2, 3, 4].map((n) => {
            const el = testid("import-step-" + n);
            return el ? visible(el) : false;
          }),
          summary: {
            total: textOf(testid("summary-total")),
            valid: textOf(testid("summary-valid")),
            duplicate: textOf(testid("summary-duplicate")),
            error: textOf(testid("summary-error")),
          },
          tableVisible: importPreviewTable ? visible(importPreviewTable) : false,
          tableHeadings: importPreviewTable
            ? importPreviewTable.querySelectorAll("thead th").length
            : 0,
          tableRows: importPreviewTable
            ? importPreviewTable.querySelectorAll("tbody tr").length
            : 0,
          cardsVisible: previewCards ? visible(previewCards) : false,
          cardCount: previewCards
            ? previewCards.querySelectorAll('[data-testid="import-preview-card"]').length
            : 0,
          cardText: previewCards ? textOf(previewCards).slice(0, 700) : "",
          fullText: importStepBox.slice(0, 5000),
          finishVisible:
            Boolean(testid("import-finish")) && visible(testid("import-finish")),
          resultCounts: [
            ...document.querySelectorAll('[data-testid="import-step-4"] p.num'),
          ].map(textOf),
        }
      : null,
    accounts: accountsModal
      ? {
          page: true,
          ...modalInfo(accountsModal),
          credentialCount: accountsModal.querySelectorAll(
            '[data-testid^="accounts-credential-"]',
          ).length,
          passwords: accountPasswords.map((el) => textOf(el)),
          copyButtons: accountsModal.querySelectorAll('[data-testid^="accounts-copy-"]').length,
          printVisible: Boolean(testid("accounts-print")) && visible(testid("accounts-print")),
          closeVisible: Boolean(testid("accounts-close")) && visible(testid("accounts-close")),
          hasWarning: textOf(accountsModal).includes("مرة واحدة فقط"),
          hasName: textOf(accountsModal).includes("أحمد علي"),
          fullText: textOf(accountsModal).slice(0, 2500),
        }
      : null,
    text: textOf(ROOT).slice(0, 260),
  };

  return {
    vw,
    vh,
    dir: document.documentElement.dir || document.body.dir,
    overflowX,
    overflowY,
    outside: outside.slice(0, 10),
    outsideCount: outside.length,
    small: small.slice(0, 10),
    smallCount: small.length,
    primary: primary.slice(0, 10),
    primaryCount: primary.length,
    clipped: clipped.slice(0, 10),
    clippedCount: clipped.length,
    covered: covered.slice(0, 10),
    coveredCount: covered.length,
    overlaps: overlaps.slice(0, 10),
    overlapCount: overlaps.length,
    contrastMin: contrast.length ? Math.min(...contrast) : null,
    contrastLow,
    fonts,
    pageHeading: (ROOT.querySelector("h1")?.textContent || "").trim(),
    badText: (() => {
      const found = (document.body.innerText || "").match(/(undefined|NaN|Infinity)/g);
      return found ? [...new Set(found)] : [];
    })(),
    ui,
  };
})()`;

/* ------------------------------------------------------------------ */
/* boot                                                                */
/* ------------------------------------------------------------------ */

async function waitForHttp(url, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      // not up yet
    }
    await sleep(300);
  }
  return false;
}

async function main() {
  await rm(PROFILE, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
  await mkdir(SHOTS, { recursive: true });
  // The import probe uploads this file through CDP. The POST is intercepted, so
  // only the extension and size matter.
  await mkdir(dirname(FIXTURE_FILE), { recursive: true });
  await writeFile(FIXTURE_FILE, Buffer.from("phase3-batch3 fixture"));

  const server = spawn(
    process.platform === "win32" ? "cmd.exe" : "npm",
    process.platform === "win32"
      ? ["/c", "npm", "run", "dev", "--", "--port", String(APP_PORT), "--strictPort"]
      : ["run", "dev", "--", "--port", String(APP_PORT), "--strictPort"],
    { cwd: FRONTEND, stdio: ["ignore", "pipe", "pipe"] },
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
      `--user-data-dir=${PROFILE}`,
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

        const result = fixtureFor(request.url);
        const payload = result && result.__delay !== undefined ? result.payload : result;
        if (result && result.__delay) await sleep(result.__delay);

        await client.send("Fetch.fulfillRequest", {
          requestId,
          responseCode: 200,
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
      // Mark the current document so the next loop can tell the fresh document
      // apart from the one that is still mounted while the navigation commits.
      await evaluate("window.__navToken = true; true");
      await client.send("Page.navigate", { url: `${BASE}${path}` });
      await waitForSwap();
      for (const selector of waits) {
        await waitForSelector(selector);
      }
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
        await evaluate("document.fonts.ready.then(() => true)", true);
        await sleep(650);
      }
    };

    const setAuditScope = async (scope) => {
      await evaluate(
        `window.__AUDIT_SCOPE__ = ${scope ? JSON.stringify(scope) : "null"}; true`,
      );
    };

    /* ---- page interactions ---------------------------------------- */

    const clickSelector = async (selector) => {
      const clicked = await evaluate(`(() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) return false;
        el.click();
        return true;
      })()`);
      if (!clicked) {
        const where = await evaluate(`(() => ({
          href: location.href,
          text: (document.body.innerText || "").replace(/\\s+/g, " ").trim().slice(0, 120),
        }))()`);
        throw new Error(`missing ${selector} at ${where.href} :: ${where.text}`);
      }
    };

    const clickByText = async (rootSelector, text) => {
      const clicked = await evaluate(`(() => {
        const root = ${rootSelector ? `document.querySelector(${JSON.stringify(rootSelector)})` : "document.body"};
        if (!root) return false;
        const wanted = ${JSON.stringify(text)};
        const el = [...root.querySelectorAll("button, a[href], [role='button'], [role='menuitem']")]
          .find((node) => {
            if (node.getBoundingClientRect().width <= 1) return false;
            return (node.textContent || "").replace(/\\s+/g, " ").trim().includes(wanted);
          });
        if (!el) return false;
        el.click();
        return true;
      })()`);
      if (!clicked) throw new Error(`missing button with text "${text}"`);
    };

    const clickVisibleRowAction = async () => {
      const clicked = await evaluate(`(() => {
        const el = [...document.querySelectorAll('[aria-label^="Actions for "]')]
          .find((node) => node.getBoundingClientRect().width > 0);
        if (!el) return false;
        el.click();
        return true;
      })()`);
      if (!clicked) throw new Error("no visible row action button");
    };

    const openRowMenuItem = async (text) => {
      await waitForSelector('[role="menuitem"]', 4000);
      const clicked = await evaluate(`(() => {
        const item = [...document.querySelectorAll('[role="menuitem"]')]
          .find((node) => node.textContent.includes(${JSON.stringify(text)}));
        if (!item) return false;
        item.click();
        return true;
      })()`);
      if (!clicked) throw new Error(`row menu item "${text}" not found`);
    };

    const setFileInput = async (selector) => {
      const { root } = await client.send("DOM.getDocument", { depth: 0 });
      const { nodeId } = await client.send("DOM.querySelector", {
        nodeId: root.nodeId,
        selector,
      });
      if (!nodeId) throw new Error(`file input not found: ${selector}`);
      await client.send("DOM.setFileInputFiles", {
        nodeId,
        files: [FIXTURE_FILE],
      });
    };

    const openImportWizard = async () => {
      await clickByText(null, "استيراد من Excel");
      await waitForSelector('[data-testid="import-wizard"]', 10000);
      await waitForSelector('[data-testid="import-step-1"]', 10000);
    };

    const uploadImportFile = async () => {
      await setFileInput('[data-testid="import-step-1"] input[type="file"]');
      await sleep(250);
      const picked = await evaluate(
        `!!document.querySelector('[data-testid="import-step-1"]')?.textContent.includes("phase3b3-students.xlsx")`,
      );
      if (!picked) throw new Error("the selected file did not reach the wizard");
      await clickByText('[data-testid="import-step-1"]', "متابعة");
      await waitForSelector('[data-testid="import-step-2"]', 12000);
    };

    const runBulk = async () => {
      await clickByText('[data-testid="bulk-parents-page"]', "إنشاء الحسابات");
      await sleep(400);
      await clickByText(null, "ابدأ الإنشاء");
    };

    const applyAction = async (page) => {
      if (!page.action) return;
      if (page.action === "qr-email") {
        await clickSelector('[data-testid="qr-email-open"]');
      } else if (page.action === "bulk-run") {
        await runBulk();
      } else if (page.action === "import-open") {
        await openImportWizard();
      } else if (page.action === "import-preview") {
        await openImportWizard();
        await uploadImportFile();
      } else if (page.action === "import-options") {
        await openImportWizard();
        await uploadImportFile();
        await clickByText('[data-testid="import-step-2"]', "متابعة");
        await waitForSelector('[data-testid="import-step-3"]', 10000);
      } else if (page.action === "import-commit") {
        await openImportWizard();
        await uploadImportFile();
        await clickByText('[data-testid="import-step-2"]', "متابعة");
        await waitForSelector('[data-testid="import-step-3"]', 10000);
        await clickByText('[data-testid="import-step-3"]', "تأكيد الاستيراد");
        await waitForSelector('[data-testid="import-step-4"]', 12000);
      } else if (page.action === "accounts-open") {
        await clickVisibleRowAction();
        await openRowMenuItem("إنشاء حساب ولي الأمر");
      }
      if (page.expectWait) await waitForSelector(page.expectWait, 10000);
      await sleep(350);
    };

    const audit = async (scope) => {
      await setAuditScope(scope);
      return evaluate(AUDIT);
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

    const runPage = async (page, viewport, theme) => {
      const [id, width, height] = viewport;
      setScenario(page.scenario);
      await navigate(page.path, theme, { width, height }, [page.wait]);
      await applyAction(page);
      await sleep(350);
      const result = await audit(page.scope);
      await screenshot(`${page.key}-${id}-${theme}.png`, { full: page.full });
      return {
        page: page.key,
        id,
        width,
        height,
        theme,
        ...result,
      };
    };

    const runs = [];
    const failures = [];
    const notes = [];

    for (const page of pages) {
      const viewports = VIEWPORTS.filter((v) => page.viewports.includes(v[0])).filter(
        (v) => RUN_VIEWPORTS.includes(v[0]),
      );
      for (const viewport of viewports) {
        for (const theme of THEMES.filter((t) => RUN_THEMES.includes(t))) {
          const run = await runPage(page, viewport, theme);
          runs.push(run);

          const tag = `${page.key} ${viewport[0]} ${theme}`;
          if (run.missingScope) {
            failures.push(`${tag}: audit scope "${run.missingScope}" is not on stage`);
            continue;
          }
          if (run.overflowX > 1)
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
                .map((s) => `${s.tag}.${s.cls} ${s.fs}px`)
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

          const s = run.ui;
          const desktop = run.width >= 768;

          if (page.expect === "qr" || page.expect === "qr-empty" || page.expect === "qr-email") {
            const q = s.qr;
            if (!q) failures.push(`${tag}: QR page is not on stage`);
            else {
              if (!q.controls.generate) failures.push(`${tag}: QR generate control is missing`);
              if (!q.controls.printAll) failures.push(`${tag}: QR print-all control is missing`);
              if (!q.controls.email) failures.push(`${tag}: QR email control is missing`);
              if (!q.controls.search) failures.push(`${tag}: QR search control is missing`);
              if (!q.controls.group) failures.push(`${tag}: QR group control is missing`);
              if (!q.controls.reset) failures.push(`${tag}: QR reset control is missing`);
            }

            if (page.expect === "qr" && q) {
              if (!q.gridVisible) failures.push(`${tag}: QR grid is not visible`);
              if (q.cardCount !== 8)
                failures.push(`${tag}: ${q.cardCount} QR cards, expected 8`);
              if (q.cardPrintButtons !== 8)
                failures.push(
                  `${tag}: ${q.cardPrintButtons} per-card print buttons, expected 8`,
                );
              if (!(q.missingText || "").includes("2 طالب بدون كود"))
                failures.push(
                  `${tag}: missing-codes banner is unexpected (${q.missingText})`,
                );
              if (!q.paginationVisible) failures.push(`${tag}: QR pagination is not visible`);
              if (q.emptyVisible) failures.push(`${tag}: QR empty state should not be visible`);
              if (q.loadingVisible) failures.push(`${tag}: QR skeleton should be gone`);
            }

            if (page.expect === "qr-empty" && q) {
              if (!q.emptyVisible) failures.push(`${tag}: QR empty state is not visible`);
              if (!(q.emptyText || "").includes("لا يوجد طلاب"))
                failures.push(`${tag}: QR empty copy is unexpected (${q.emptyText})`);
              if (!(q.emptyText || "").includes("أضف طلابًا من صفحة الطلاب"))
                failures.push(`${tag}: QR empty state is missing its next-step hint`);
              if (q.gridVisible || q.cardCount)
                failures.push(`${tag}: QR cards should not render without students`);
              if ((q.missingText || "").trim())
                failures.push(`${tag}: missing-codes banner should be hidden on an empty centre`);
            }

            if (page.expect === "qr-email" && q) {
              const e = q.email;
              if (!e) failures.push(`${tag}: QR email dialog is not on stage`);
              else {
                if (e.role !== "dialog") failures.push(`${tag}: email dialog role is ${e.role}`);
                if (e.ariaModal !== "true")
                  failures.push(`${tag}: email dialog is missing aria-modal=true`);
                if (!e.inViewport) failures.push(`${tag}: email dialog overflows the viewport`);
                if (!e.input) failures.push(`${tag}: email input is missing`);
                if (!e.cancel) failures.push(`${tag}: email cancel button is missing`);
                if (e.sendHeight + 0.5 < 44)
                  failures.push(`${tag}: email send is ${e.sendHeight}px, expected >=44`);
                if (!(e.fullText || "").includes("إرسال كروت الحضور"))
                  failures.push(`${tag}: email dialog heading is missing`);
                if (!(e.fullText || "").includes("سيتم إرسال كروت الطلاب"))
                  failures.push(`${tag}: email dialog explanation is missing`);
              }
            }
          }

          if (page.expect === "bulk" || page.expect === "bulk-result") {
            const b = s.bulk;
            if (!b) failures.push(`${tag}: bulk parent accounts page is not on stage`);
            else {
              if (!b.runVisible) failures.push(`${tag}: bulk run button is missing`);
              if (!(b.fullText || "").includes("نطاق التنفيذ"))
                failures.push(`${tag}: bulk filters card is missing`);

              if (page.expect === "bulk") {
                if (b.cardsVisible || b.tableVisible)
                  failures.push(`${tag}: bulk result should not be on stage before a run`);
                if (b.exportDisabled.some((value) => value !== true))
                  failures.push(
                    `${tag}: export buttons must be disabled before a run (${JSON.stringify(b.exportDisabled)})`,
                  );
              }

              if (page.expect === "bulk-result") {
                if (b.stats.join(",") !== "2,1,1,4")
                  failures.push(`${tag}: bulk stats are ${b.stats.join(",")}, expected 2,1,1,4`);
                const expectedTabs = [
                  "حسابات جديدة (2)",
                  "ربط بحسابات موجودة (1)",
                  "تم تخطيهم (1)",
                ];
                for (const label of expectedTabs) {
                  if (!b.tabs.some((tab) => tab.includes(label)))
                    failures.push(`${tag}: bulk tab "${label}" is missing (${b.tabs.join(" | ")})`);
                }
                if (b.exportDisabled.some((value) => value !== false))
                  failures.push(
                    `${tag}: export buttons must be enabled with a result (${JSON.stringify(b.exportDisabled)})`,
                  );
                if (desktop) {
                  if (!b.tableVisible) failures.push(`${tag}: bulk table should be visible on desktop`);
                  if (b.tableHeadings !== 6)
                    failures.push(`${tag}: bulk table has ${b.tableHeadings} headings, expected 6`);
                  if (b.tableFirstRowCells !== 6)
                    failures.push(
                      `${tag}: bulk first row has ${b.tableFirstRowCells} cells, expected 6`,
                    );
                } else {
                  if (b.tableVisible) failures.push(`${tag}: bulk table should be hidden on phones`);
                  if (!b.cardsVisible) failures.push(`${tag}: bulk cards should be visible on phones`);
                  if (b.cardCount !== 2)
                    failures.push(`${tag}: ${b.cardCount} bulk cards, expected 2`);
                  for (const part of ["أحمد علي", "01112345670", "Pt-1A2b3C"]) {
                    if (!b.firstCardText.includes(part))
                      failures.push(`${tag}: bulk card is missing "${part}"`);
                  }
                }
                if (!(b.fullText || "").includes("تم إنشاء حسابات أولياء الأمور"))
                  failures.push(`${tag}: bulk success message is missing`);
              }
            }
          }

          if (
            page.expect === "import-step1" ||
            page.expect === "import-preview" ||
            page.expect === "import-options" ||
            page.expect === "import-result"
          ) {
            const w = s.wizard;
            if (!w) failures.push(`${tag}: import wizard is not on stage`);
            else {
              if (w.role !== "dialog") failures.push(`${tag}: wizard role is ${w.role}`);
              if (w.ariaModal !== "true")
                failures.push(`${tag}: wizard is missing aria-modal=true`);
              if (!w.inViewport) failures.push(`${tag}: wizard overflows the viewport`);
              if (!(w.title || "").includes("معالج استيراد الطلاب من Excel"))
                failures.push(`${tag}: wizard title is missing`);
              const expectedStep = {
                "import-step1": "1",
                "import-preview": "2",
                "import-options": "3",
                "import-result": "4",
              }[page.expect];
              if (w.step !== expectedStep)
                failures.push(`${tag}: wizard reports step ${w.step}, expected ${expectedStep}`);

              if (page.expect === "import-step1") {
                if (!w.stepVisible[0]) failures.push(`${tag}: import step 1 is not visible`);
                for (const part of [
                  "ابدأ بقالب جاهز",
                  ".xlsx فقط",
                  "اسحب وأفلت الملف هنا",
                  "تنزيل قالب Excel",
                  "اختيار ملف",
                ]) {
                  if (!w.fullText.includes(part))
                    failures.push(`${tag}: step 1 is missing "${part}"`);
                }
              }

              if (page.expect === "import-preview") {
                if (!w.stepVisible[1]) failures.push(`${tag}: import step 2 is not visible`);
                const summary = w.summary;
                if (summary.total !== "5" || summary.valid !== "2")
                  failures.push(
                    `${tag}: summary is ${summary.total}/${summary.valid}, expected 5 total / 2 valid`,
                  );
                if (summary.duplicate !== "2" || summary.error !== "1")
                  failures.push(
                    `${tag}: summary duplicate/error is ${summary.duplicate}/${summary.error}, expected 2/1`,
                  );
                if (desktop) {
                  if (!w.tableVisible) failures.push(`${tag}: preview table should be visible on desktop`);
                  if (w.tableHeadings !== 8)
                    failures.push(`${tag}: preview table has ${w.tableHeadings} headings, expected 8`);
                  if (w.tableRows !== 5)
                    failures.push(`${tag}: preview table has ${w.tableRows} rows, expected 5`);
                } else {
                  if (w.tableVisible) failures.push(`${tag}: preview table should be hidden on phones`);
                  if (!w.cardsVisible) failures.push(`${tag}: preview cards should be visible on phones`);
                  if (w.cardCount !== 5)
                    failures.push(`${tag}: ${w.cardCount} preview cards, expected 5`);
                }
                for (const phone of ["01012345678", "01112345678", "01298765432", "01198765432"]) {
                  if (!w.fullText.includes(phone))
                    failures.push(`${tag}: preview is missing the real phone ${phone}`);
                }
                if (!w.fullText.includes("عرض الأخطاء فقط"))
                  failures.push(`${tag}: preview is missing the errors-only filter`);
                if (!w.fullText.includes("ستُنشأ مجموعة"))
                  failures.push(`${tag}: preview is missing the new-group marker`);
              }

              if (page.expect === "import-options") {
                if (!w.stepVisible[2]) failures.push(`${tag}: import step 3 is not visible`);
                for (const part of [
                  "خيارات الاستيراد",
                  "تخطي (افتراضي)",
                  "تحديث (الاسم وبيانات التواصل فقط)",
                  "إنشاء المجموعات الناقصة",
                  "إنشاء حسابات الطلاب",
                  "إنشاء حسابات أولياء الأمور",
                  "الباسورد المبدئي = رقم الهاتف وسيُطلب تغييره عند أول دخول",
                  "ملخص ما سيحدث",
                ]) {
                  if (!w.fullText.includes(part))
                    failures.push(`${tag}: step 3 is missing "${part}"`);
                }
              }

              if (page.expect === "import-result") {
                if (!w.stepVisible[3]) failures.push(`${tag}: import step 4 is not visible`);
                if (w.resultCounts.join(",") !== "2,1,1,1")
                  failures.push(
                    `${tag}: result counts are ${w.resultCounts.join(",")}, expected 2,1,1,1`,
                  );
                for (const part of [
                  "مضاف",
                  "محدّث",
                  "متخطّى",
                  "فاشل",
                  "تنزيل تقرير الأخطاء (Excel)",
                  "تصدير بيانات الدخول (Excel/PDF)",
                ]) {
                  if (!w.fullText.includes(part))
                    failures.push(`${tag}: step 4 is missing "${part}"`);
                }
                if (!w.finishVisible) failures.push(`${tag}: wizard finish button is missing`);
              }
            }
          }

          if (page.expect === "accounts") {
            const a = s.accounts;
            if (!a) failures.push(`${tag}: accounts dialog is not on stage`);
            else {
              if (a.role !== "dialog") failures.push(`${tag}: accounts dialog role is ${a.role}`);
              if (a.ariaModal !== "true")
                failures.push(`${tag}: accounts dialog is missing aria-modal=true`);
              if (!a.inViewport) failures.push(`${tag}: accounts dialog overflows the viewport`);
              if (a.credentialCount !== 1)
                failures.push(`${tag}: ${a.credentialCount} credentials, expected 1`);
              if (a.passwords[0] !== "Acc#Temp2026")
                failures.push(
                  `${tag}: the temporary password is ${JSON.stringify(a.passwords)}`,
                );
              if (!a.copyButtons) failures.push(`${tag}: the copy action is missing`);
              if (!a.printVisible) failures.push(`${tag}: the print action is missing`);
              if (!a.closeVisible) failures.push(`${tag}: the close action is missing`);
              if (!a.hasWarning)
                failures.push(`${tag}: the one-time-password warning is missing`);
              if (!a.hasName) failures.push(`${tag}: the student name is missing`);
              if (!(a.fullText || "").includes("رقم الدخول (هاتف ولي الأمر)"))
                failures.push(`${tag}: the username label is missing`);

              const leak = await evaluate(`(() => {
                const password = "Acc#Temp2026";
                const storage = [];
                const scan = (store, prefix) => {
                  try {
                    for (let i = 0; i < store.length; i += 1) {
                      const key = store.key(i);
                      if ((store.getItem(key) || "").includes(password)) storage.push(prefix + key);
                    }
                  } catch { /* storage may be blocked */ }
                };
                scan(localStorage, "local:");
                scan(sessionStorage, "session:");
                return storage;
              })()`);
              if (leak.length)
                failures.push(`${tag}: the temporary password reached storage (${leak.join(", ")})`);
            }
          }
        }
      }
    }

    /* ---------- behaviour probes ---------- */
    const probes = {};
    const lastCall = (re, method) =>
      [...apiLog]
        .reverse()
        .find((c) => (!method || c.method === method) && re.test(c.url));
    const query = (url, key) => new URL(url).searchParams.get(key);

    const prepareProbe = async (pageKey, scenario, action, width = 390, height = 844) => {
      const page = PAGES.find((p) => p.key === pageKey);
      setScenario(scenario);
      await navigate(page.path, "light", { width, height }, [page.wait]);
      await applyAction({ ...page, action });
      await sleep(350);
      return page;
    };

    /* ---------- QR: generate the two missing codes ---------- */
    {
      await prepareProbe("qr-cards", "qr");
      const before = await evaluate(
        `!!document.querySelector('[data-testid="qr-missing-codes"]')`,
      );
      await clickSelector('[data-testid="qr-generate"]');
      await sleep(1600);
      const call = lastCall(/student\/generate-qr-codes/i);
      const after = await evaluate(`(() => {
        const cards = [...document.querySelectorAll('[data-testid^="qr-card-"]')];
        return {
          banner: !!document.querySelector('[data-testid="qr-missing-codes"]'),
          cards: cards.length,
          codes: cards.filter((card) => /STU\\d{4}/.test(card.textContent)).length,
        };
      })()`);
      probes.qrGenerate = { beforeBanner: before, posted: Boolean(call), after };
      if (!before) failures.push("QR generate probe: the missing-codes banner was not on stage");
      if (!call)
        failures.push("QR generate probe: no POST /Student/generate-qr-codes was sent");
      if (after.banner) failures.push("QR generate probe: the banner stayed after generation");
      if (after.codes !== after.cards)
        failures.push(
          `QR generate probe: ${after.cards - after.codes} card(s) still have no code`,
        );
      notes.push(
        `QR generate probe: POST ${call ? call.url.replace(BASE, "").slice(0, 60) : "missing"}, ${after.codes}/${after.cards} codes`,
      );
    }

    /* ---------- QR: print media contract ---------- */
    {
      await prepareProbe("qr-cards", "qr", null, 1280, 800);
      await evaluate(
        `window.__printCalls = 0; window.print = () => { window.__printCalls += 1; }; true`,
      );
      const screenPadding = await evaluate(
        `getComputedStyle(document.querySelector('[data-testid="qr-page"]')).paddingTop`,
      );
      const printState = `(() => {
        const root = document.querySelector('[data-testid="qr-page"]');
        const cards = [...document.querySelectorAll('.qr-card')];
        const target = document.querySelector('.qr-card-target');
        const noPrint = [...root.querySelectorAll('.qr-no-print')];
        return {
          cards: cards.length,
          visibleCards: cards.filter((card) => getComputedStyle(card).display !== 'none').length,
          targetVisible: target ? getComputedStyle(target).display !== 'none' : false,
          noPrintVisible: noPrint.filter((el) => getComputedStyle(el).display !== 'none').length,
          rootPadding: getComputedStyle(root).paddingTop,
          rootPosition: getComputedStyle(root).position,
        };
      })()`;

      await clickSelector('[data-testid="qr-print-one-s1"]');
      await sleep(250);
      const screen = await evaluate(`({
        targets: document.querySelectorAll('.qr-card-target').length,
        printCalls: window.__printCalls,
      })`);
      await client.send("Emulation.setEmulatedMedia", { media: "print" });
      await sleep(350);
      const single = await evaluate(printState);
      await client.send("Emulation.setEmulatedMedia", { media: "" });
      await evaluate(`window.dispatchEvent(new Event("afterprint")); true`);
      await sleep(300);

      await clickSelector('[data-testid="qr-print-all"]');
      await sleep(300);
      await client.send("Emulation.setEmulatedMedia", { media: "print" });
      await sleep(350);
      const all = await evaluate(printState);
      await client.send("Emulation.setEmulatedMedia", { media: "" });
      await evaluate(`window.dispatchEvent(new Event("afterprint")); true`);

      probes.qrPrint = { screenPadding, screen, single, all };
      if (screen.targets !== 1)
        failures.push(`QR print probe: ${screen.targets} staged cards, expected 1`);
      if (screen.printCalls !== 1)
        failures.push(`QR print probe: window.print ran ${screen.printCalls} times, expected 1`);
      if (single.visibleCards !== 1 || !single.targetVisible)
        failures.push(
          `QR print probe: single print shows ${single.visibleCards} card(s) (target visible=${single.targetVisible})`,
        );
      if (single.noPrintVisible)
        failures.push(
          `QR print probe: ${single.noPrintVisible} control block(s) still visible in print media`,
        );
      if (single.rootPadding !== screenPadding)
        failures.push(
          `QR print probe: print padding ${single.rootPadding} differs from screen padding ${screenPadding}`,
        );
      if (single.rootPosition !== "absolute")
        failures.push(`QR print probe: print root position is ${single.rootPosition}`);
      if (all.visibleCards !== all.cards)
        failures.push(
          `QR print probe: print-all shows ${all.visibleCards}/${all.cards} cards`,
        );
      if (all.noPrintVisible)
        failures.push(
          `QR print probe: ${all.noPrintVisible} control block(s) still visible in print-all`,
        );
      notes.push(
        `QR print probe: single=${single.visibleCards}/${single.cards}, all=${all.visibleCards}/${all.cards}, padding ${single.rootPadding}, no-print hidden`,
      );
    }

    /* ---------- QR: e-mail contract ---------- */
    {
      await prepareProbe("qr-cards", "qr", "qr-email");
      await evaluate(`(() => {
        const el = document.querySelector('[data-testid="qr-email-input"]');
        const setter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          "value",
        ).set;
        setter.call(el, "parent@example.com");
        el.dispatchEvent(new Event("input", { bubbles: true }));
        return true;
      })()`);
      await clickSelector('[data-testid="qr-email-send"]');
      await sleep(2500);
      const call = lastCall(/emailsroute\/sendemail/i);
      const params = call ? new URL(call.url).searchParams : null;
      const closed = await evaluate(
        `!document.querySelector('[data-testid="qr-email-modal"]')`,
      );
      probes.qrEmail = {
        posted: Boolean(call),
        email: params?.get("email") ?? null,
        subject: params?.get("subject") ?? null,
        messageHasCode: (params?.get("message") || "").includes("STU0001"),
        closed,
      };
      if (!call) failures.push("QR email probe: no POST /EmailsRoute/SendEmail was sent");
      if (probes.qrEmail.email !== "parent@example.com")
        failures.push(`QR email probe: email=${probes.qrEmail.email}`);
      if (probes.qrEmail.subject !== "كروت حضور الطلاب")
        failures.push(`QR email probe: subject=${probes.qrEmail.subject}`);
      if (!probes.qrEmail.messageHasCode)
        failures.push("QR email probe: the message does not contain a student code");
      if (!closed) failures.push("QR email probe: the dialog stayed open after sending");
      notes.push(
        `QR email probe: email=${probes.qrEmail.email}, subject=${probes.qrEmail.subject}, closed=${closed}`,
      );
    }

    /* ---------- bulk parent accounts ---------- */
    {
      await prepareProbe("bulk-parents-result", "bulk", "bulk-run");
      const call = lastCall(/student\/create-parent-accounts/i, "POST");
      let body = null;
      try {
        body = JSON.parse(call.body);
      } catch {
        body = null;
      }
      const cards = await evaluate(
        `[...document.querySelectorAll('[data-testid="bulk-parent-card"]')].map((el) => el.textContent.replace(/\\s+/g, " ").trim())`,
      );
      await clickByText('[data-testid="bulk-parents-page"]', "تم تخطيهم");
      await sleep(350);
      const skippedText = await evaluate(
        `(document.querySelector('[data-testid="bulk-parents-cards"]')?.textContent || "").replace(/\\s+/g, " ").trim()`,
      );
      await evaluate(
        `window.__pdfOpened = false; window.open = () => { window.__pdfOpened = true; return { document: { write() {}, close() {} }, focus() {}, print() {} }; }; true`,
      );
      await clickSelector('[data-testid="bulk-parents-export-excel"]');
      await sleep(700);
      const excelToast = await evaluate(
        `(document.body.innerText || "").includes("تم تصدير الملف بنجاح")`,
      );
      await clickSelector('[data-testid="bulk-parents-export-pdf"]');
      await sleep(500);
      const pdf = await evaluate(
        `({ opened: window.__pdfOpened, toast: (document.body.innerText || "").includes("تم تجهيز التقرير للطباعة") })`,
      );
      probes.bulk = {
        body,
        cards: cards.length,
        hasPassword: cards.some((text) => text.includes("Pt-1A2b3C")),
        skippedHasReason: skippedText.includes("ولي الأمر مرتبط بالفعل"),
        excelToast,
        pdf,
      };
      if (!call) failures.push("bulk probe: no POST /Student/Create-Parent-Accounts was sent");
      if (body?.skipAlreadyLinked !== false || body?.isActive !== true)
        failures.push(`bulk probe: unexpected request body ${JSON.stringify(body)}`);
      if (cards.length !== 2)
        failures.push(`bulk probe: ${cards.length} mobile cards, expected 2`);
      if (!probes.bulk.hasPassword)
        failures.push("bulk probe: the temporary password is missing from the mobile card");
      if (!probes.bulk.skippedHasReason)
        failures.push("bulk probe: the skipped tab does not show the skip reason");
      if (!excelToast) failures.push("bulk probe: Excel export did not confirm");
      if (!pdf.opened || !pdf.toast) failures.push("bulk probe: the PDF report did not open");
      notes.push(
        `bulk probe: body=${JSON.stringify(body)}, cards=${cards.length}, excel=${excelToast}, pdf=${pdf.opened}`,
      );
    }

    /* ---------- import preview: real numbers and the errors-only filter ---------- */
    {
      await prepareProbe("import-step2", "wizard", "import-preview");
      const rows = `[
        document.querySelectorAll('[data-testid="import-preview-cards"] [data-testid="import-preview-card"]').length,
        document.querySelectorAll('[data-testid="import-step-2"] tbody tr').length,
      ]`;
      const before = await evaluate(rows);
      const phonesBefore = await evaluate(
        `(document.querySelector('[data-testid="import-step-2"]')?.textContent || "")`,
      );
      await evaluate(`(() => {
        const box = document.querySelector('[data-testid="import-step-2"]');
        const label = [...box.querySelectorAll("label")].find((el) =>
          el.textContent.includes("عرض الأخطاء فقط"),
        );
        const input = label?.querySelector('input[type="checkbox"]');
        if (!input) return false;
        input.click();
        return true;
      })()`);
      await sleep(350);
      const after = await evaluate(rows);
      const phones = await evaluate(
        `(document.querySelector('[data-testid="import-step-2"]')?.textContent || "")`,
      );
      probes.importPreview = {
        before,
        after,
        hasPhones:
          phonesBefore.includes("01012345678") &&
          phonesBefore.includes("01112345678") &&
          phonesBefore.includes("01298765432"),
        filteredValidOut:
          !phones.includes("01298765432") &&
          phones.includes("01055556666") &&
          phones.includes("01234567890"),
        hasSummary:
          phones.includes("إجمالي الصفوف") &&
          phones.includes("صالح") &&
          phones.includes("مكرر") &&
          phones.includes("خطأ"),
      };
      if (before.join(",") !== "5,5")
        failures.push(`import preview probe: ${before.join(",")} rows before the filter, expected 5,5`);
      if (after.join(",") !== "3,3")
        failures.push(`import preview probe: ${after.join(",")} rows after the filter, expected 3,3`);
      if (!probes.importPreview.hasPhones)
        failures.push("import preview probe: the real phone numbers are missing");
      if (!probes.importPreview.filteredValidOut)
        failures.push(
          "import preview probe: the errors-only filter did not drop the valid rows",
        );
      if (!probes.importPreview.hasSummary)
        failures.push("import preview probe: the summary labels are missing");
      notes.push(
        `import preview probe: cards/rows ${before.join("/")} -> ${after.join("/")} with the errors-only filter`,
      );
    }

    /* ---------- import commit: exact payload and result ---------- */
    {
      await prepareProbe("import-step3", "wizard", "import-options", 360, 640);
      const start = apiLog.length;
      await clickByText('[data-testid="import-step-3"]', "تأكيد الاستيراد");
      await waitForSelector('[data-testid="import-step-4"]', 12000);
      await sleep(350);
      const call = lastCall(/student\/import\/commit/i, "POST");
      let body = null;
      try {
        body = JSON.parse(call.body);
      } catch {
        body = null;
      }
      const counts = await evaluate(
        `[...document.querySelectorAll('[data-testid="import-step-4"] p.num')].map((el) => el.textContent.trim())`,
      );
      const posts = apiLog
        .slice(start)
        .filter((c) => c.method === "POST" && /student\/import\/commit/i.test(c.url))
        .length;
      probes.importCommit = { body, counts, posts };
      if (!call) failures.push("import commit probe: no POST /Student/Import/Commit was sent");
      if (body?.sessionId !== "import-session-1")
        failures.push(`import commit probe: sessionId=${body?.sessionId}`);
      if (body?.duplicateMode !== "skip" || body?.createStudentAccounts !== true)
        failures.push(`import commit probe: unexpected options ${JSON.stringify(body)}`);
      if (body?.createMissingGroups !== false || body?.createParentAccounts !== true)
        failures.push(`import commit probe: unexpected options ${JSON.stringify(body)}`);
      if (counts.join(",") !== "2,1,1,1")
        failures.push(`import commit probe: result counts ${counts.join(",")}, expected 2,1,1,1`);
      if (posts !== 1) failures.push(`import commit probe: ${posts} commit requests, expected 1`);
      notes.push(
        `import commit probe: body=${JSON.stringify(body)}, counts=${counts.join(",")}`,
      );
    }

    /* ---------- one-time credentials: visible once, then gone ---------- */
    {
      await prepareProbe("accounts-modal", "accounts", "accounts-open");
      const password = "Acc#Temp2026";
      const visible = await evaluate(
        `(document.querySelector('[data-testid="accounts-password-s1"]')?.textContent || "").trim()`,
      );
      await clickSelector('[data-testid="accounts-close"]');
      await sleep(400);
      const after = await evaluate(`(() => {
        const password = "Acc#Temp2026";
        const storage = [];
        const scan = (store, prefix) => {
          try {
            for (let i = 0; i < store.length; i += 1) {
              const key = store.key(i);
              if ((store.getItem(key) || "").includes(password)) storage.push(prefix + key);
            }
          } catch { /* storage may be blocked */ }
        };
        scan(localStorage, "local:");
        scan(sessionStorage, "session:");
        return {
          modalGone: !document.querySelector('[data-testid="accounts-modal"]'),
          domLeak: document.body.innerHTML.includes(password),
          textLeak: (document.body.innerText || "").includes(password),
          storage,
        };
      })()`);
      probes.accounts = { visible: visible === password, after };
      if (visible !== password)
        failures.push(`accounts probe: the password on stage is ${JSON.stringify(visible)}`);
      if (!after.modalGone) failures.push("accounts probe: the dialog did not close");
      if (after.domLeak || after.textLeak)
        failures.push("accounts probe: the password is still in the DOM after closing");
      if (after.storage.length)
        failures.push(
          `accounts probe: the password reached storage (${after.storage.join(", ")})`,
        );
      notes.push(
        `accounts probe: password visible once, modal gone=${after.modalGone}, dom leak=${after.domLeak}, storage=${after.storage.length}`,
      );
    }

    /* ---------- never let a fixture password hit the console ---------- */
    {
      const secrets = [
        "Acc#Temp2026",
        "Stu-1A2b3C",
        "Stu-4D5e6F",
        "Par-7G8h9I",
        "Pt-1A2b3C",
      ];
      const hits = consoleLog.filter((entry) =>
        secrets.some((secret) => entry.text.includes(secret)),
      );
      probes.console = { entries: consoleLog.length, leaks: hits.length };
      if (hits.length)
        failures.push(
          `console probe: ${hits.length} console message(s) contain a temporary password`,
        );
      notes.push(`console probe: ${consoleLog.length} messages, ${hits.length} password leak(s)`);
    }

    /* ---------- 200% text zoom ---------- */
    const textZoom = [];
    const textTargets = [
      { key: "qr-cards", scenario: "qr", action: null, sizes: [["390", 390, 844], ["1440", 1440, 900]] },
      { key: "bulk-parents-result", scenario: "bulk", action: "bulk-run", wait: '[data-testid="bulk-parents-cards"]', sizes: [["390", 390, 844]] },
      { key: "import-step2", scenario: "wizard", action: "import-preview", wait: '[data-testid="import-step-2"]', sizes: [["390", 390, 844]] },
      { key: "accounts-modal", scenario: "accounts", action: "accounts-open", wait: '[data-testid="accounts-modal"]', sizes: [["390", 390, 844]] },
    ];
    for (const target of textTargets) {
      const page = PAGES.find((p) => p.key === target.key);
      if (!page) continue;
      for (const [id, width, height] of target.sizes) {
        for (const theme of THEMES.filter((t) => RUN_THEMES.includes(t))) {
          setScenario(target.scenario);
          await navigate(page.path, theme, { width, height }, [page.wait]);
          await applyAction({
            ...page,
            action: target.action,
            expectWait: target.wait,
          });
          await sleep(350);
          await evaluate('document.documentElement.style.fontSize = "200%"; true');
          await sleep(650);
          const result = await audit(page.scope);
          textZoom.push({ page: target.key, id, width, height, theme, ...result });
          await screenshot(`${target.key}-${id}-${theme}-text200.png`);

          const tag = `text200 ${target.key} ${id} ${theme}`;
          if (result.missingScope) failures.push(`${tag}: scope missing`);
          if (result.overflowX > 1)
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
        }
      }
    }

    /* ---------- 200% page zoom ---------- */
    const pageZoom = [];
    const zoomTargets = [
      { key: "qr-cards", scenario: "qr", action: null },
      { key: "import-step2", scenario: "wizard", action: "import-preview", wait: '[data-testid="import-step-2"]' },
    ];
    for (const target of zoomTargets) {
      const page = PAGES.find((p) => p.key === target.key);
      if (!page) continue;
      for (const theme of THEMES.filter((t) => RUN_THEMES.includes(t))) {
        const width = 1440;
        const height = 900;
        const zoomWidth = Math.round(width / 2);
        const zoomHeight = Math.round(height / 2);
        setScenario(target.scenario);
        await navigate(page.path, theme, { width: zoomWidth, height: zoomHeight, dsf: 2 }, [
          page.wait,
        ]);
        await applyAction({ ...page, action: target.action, expectWait: target.wait });
        await sleep(450);
        const result = await audit(page.scope);
        pageZoom.push({ page: target.key, id: "1440", width: zoomWidth, height: zoomHeight, theme, ...result });
        await screenshot(`${target.key}-1440-${theme}-zoom200.png`);

        const tag = `zoom200 ${target.key} ${theme}`;
        if (result.overflowX > 1)
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
        state: stateLabel(r.ui),
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
    };

    await writeFile(
      join(OUT, "batch3-verify.json"),
      JSON.stringify({ summary, runs, probes, textZoom, pageZoom }, null, 2),
    );

    /* ---------- markdown ---------- */
    const labels = Object.fromEntries(PAGES.map((p) => [p.key, p]));
    const md = [];
    md.push("# المرحلة 3 — دفعة 3: كروت QR، الحسابات، واستيراد Excel", "");
    md.push(`تم التوليد: ${summary.generated}`, "");
    md.push(
      `النتيجة: **${failures.length ? "FAIL" : "ALL PASS"}** — ${summary.runs} تشغيلًا: ` +
        `${runs.length} تشغيلًا أساسيًا، ${textZoom.length} تكبير نص 200%، ${pageZoom.length} تكبير صفحة 200%.`,
      "",
    );
    md.push(
      "الحالات: كروت QR (شبكة كاملة + مركز فارغ + نافذة الإرسال)، صفحة أولياء الأمور الجماعية قبل/بعد التشغيل، معالج الاستيراد (الخطوات 1–4)، ونافذة بيانات الدخول لمرة واحدة.",
      "",
    );
    md.push(
      "الأدوار: `/qr-cards` محمية لـAssistant/Teacher وتحتاج module `attendance`؛ تُفحص كـTeacher (مركز متعدد المدرسين، module مفعّل). `/bulk-parent-accounts` محمية لـCenterOwner أو Teacher في مركز فردي؛ تُفحص كـCenterOwner. `/dashboard` تُفحص كـTeacher مع `is_center_admin=true` لفتح المعالج وإجراء «إنشاء حساب ولي الأمر».",
      "",
    );
    md.push(
      "عقد الطباعة: تُحاكى وسائط `print` عبر CDP بعد الضغط على طباعة كارت واحد/الكل — الكارت المرحّل فقط يظهر، و`.qr-no-print` يختفي، وpadding الجذر يبقى كما هو على الشاشة.",
      "",
    );

    const table = (pageKey) => {
      const page = labels[pageKey];
      md.push(`## ${pageKey} — ${page.expect}`, "");
      md.push(
        "| المقاس | الوضع | تمرير أفقي | خارج الشاشة | أهداف <44 | نص <14 | نص مقطوع | تغطية | تراكب | أقل تباين | الحالة |",
      );
      md.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
      runs
        .filter((r) => r.page === pageKey)
        .forEach((r) => {
          md.push(
            `| ${r.id} (${r.width}×${r.height}) | ${r.theme} | ${r.overflowX}px | ${r.outsideCount} | ${r.smallCount} | ${r.primaryCount} | ${r.clippedCount} | ${r.coveredCount} | ${r.overlapCount} | ${r.contrastMin ?? "—"}:1 | ${stateLabel(r.ui)} |`,
          );
        });
      md.push("");
    };

    pages.forEach((p) => table(p.key));

    md.push("## سلوك العناصر", "");
    md.push("```json");
    md.push(JSON.stringify(probes, null, 2));
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

    md.push("## اللقطات", "");
    md.push(
      "`docs/design/shots/phase3b3/` — لقطة لكل حالة/مقاس/وضع (صفحة كاملة للقوائم، والشاشة للنوافذ)، ولقطات تكبير النص والصفحة 200%.",
    );
    md.push("");

    if (failures.length) {
      md.push("## الإخفاقات", "");
      failures.forEach((f) => md.push(`- ${f}`));
    } else {
      md.push(
        "لا إخفاقات: كل الحالات سليمة في كل مقاس ووضع، بلا تمرير أفقي أو قطع أو تراكب، كل هدف لمس ≥44px، النص الأساسي ≥14px، الخطوط محلية، التباين AA، وأزرار النوافذ ثابتة ومرئية حتى على الشاشات القصيرة، والتكبير 200% سليم.",
      );
    }
    if (notes.length) {
      md.push("", "## ملاحظات التشغيل", "");
      notes.forEach((n) => md.push(`- ${n}`));
    }
    await writeFile(join(OUT, "batch3-verify.md"), md.join("\n"));

    console.log(failures.length ? `FAIL (${failures.length})` : "ALL PASS");
    failures.slice(0, 120).forEach((f) => console.log(" - " + f));
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

function stateLabel(ui) {
  if (!ui) return "—";
  if (ui.accounts)
    return `accounts · ${ui.accounts.credentialCount} credential · ${ui.accounts.box?.w}×${ui.accounts.box?.h}`;
  if (ui.wizard)
    return `wizard step ${ui.wizard.step} · ${ui.wizard.box?.w}×${ui.wizard.box?.h}`;
  if (ui.bulk)
    return `bulk · stats ${ui.bulk.stats.join("/") || "—"} · ${ui.bulk.cardCount} cards · table=${ui.bulk.tableVisible}`;
  if (ui.qr)
    return ui.qr.emptyVisible
      ? `empty · ${(ui.qr.emptyText || "").slice(0, 34)}`
      : `qr · ${ui.qr.cardCount} cards · pagination=${ui.qr.paginationVisible}`;
  return "—";
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

