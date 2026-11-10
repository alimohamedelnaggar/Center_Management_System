/**
 * Phase 4 automated checks — sign-in, public student card, centre dashboard.
 *
 *   node phase4-verify.mjs
 *
 * Boots the real Vite app, intercepts the live API over CDP `Fetch` with
 * deterministic fixtures (no backend, no product code changed), then drives
 * headless Chrome at every required viewport in light and dark:
 *
 *   /login                       (sign-in)
 *   /student-card/STU00000001    (public parent-facing card)
 *   /adminDashboard              (centre owner dashboard, authenticated)
 *
 * Checks: no page scroll, 44px targets, >=14px primary text, no clipped text,
 * no overlay covering a control, no sibling overlap, RTL, local fonts, WCAG AA,
 * logo lockup count, 48px form fields, student-card stats grid, dashboard KPI
 * grid + chart axis label size/labels-inside-container/tooltip-on-tap, and
 * 200% text + page zoom. Writes phase4/phase4-verify.json + .md and screenshots
 * into shots/phase4/.
 */
import { spawn } from "node:child_process";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = join(HERE, "..", "..", "Frontend", "CenterManagement");
const OUT = join(HERE, "phase4");
const SHOTS = join(HERE, "shots", "phase4");
const PROFILE = join(process.env.TEMP || "/tmp", "opencode", "chrome-phase4-verify");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9467;
const APP_PORT = 5201;
const BASE = `http://127.0.0.1:${APP_PORT}`;
const ORIGIN = BASE;

const VIEWPORTS = [
  ["360", 360, 800],
  ["360s", 360, 640],
  ["360k", 360, 420],
  ["390", 390, 844],
  ["768", 768, 1024],
  ["1280", 1280, 800],
  ["1920", 1920, 1080],
  ["2560", 2560, 1440],
  ["land-844", 844, 390],
];

const THEMES = ["light", "dark"];

const PAGES = [
  {
    key: "login",
    path: "/login",
    wait: '[data-testid="login-card"]',
    shotEvery: true,
    full: false,
  },
  {
    key: "student-card",
    path: "/student-card/STU00000001",
    wait: '[data-testid="student-card-result"]',
    shotEvery: true,
    full: true,
  },
  {
    key: "dashboard",
    path: "/adminDashboard",
    wait: '[data-testid="admin-dashboard"]',
    shotEvery: true,
    full: true,
  },
];

/* Optional narrowing for fast iterations:
   PHASE4_PAGES=dashboard PHASE4_VIEWPORTS=390 PHASE4_THEMES=dark */
const list = (value, fallback) =>
  value ? value.split(",").map((v) => v.trim()).filter(Boolean) : fallback;
const RUN_PAGES = list(process.env.PHASE4_PAGES, PAGES.map((p) => p.key));
const RUN_VIEWPORTS = list(process.env.PHASE4_VIEWPORTS, VIEWPORTS.map((v) => v[0]));
const RUN_THEMES = list(process.env.PHASE4_THEMES, THEMES);
const pages = PAGES.filter((p) => RUN_PAGES.includes(p.key));
const viewports = VIEWPORTS.filter((v) => RUN_VIEWPORTS.includes(v[0]));
const themes = THEMES.filter((t) => RUN_THEMES.includes(t));

/* ------------------------------------------------------------------ */
/* fixtures                                                            */
/* ------------------------------------------------------------------ */

const b64url = (value) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");

function makeJwt() {
  const header = { alg: "none", typ: "JWT" };
  const payload = {
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 6,
    iat: Math.floor(Date.now() / 1000),
    "http://schemas.microsoft.com/ws/2008/06/identity/claims/role":
      "CenterOwner",
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier":
      "42",
    PhoneNumber: "01000000000",
    is_center_admin: "true",
    pwd_change_required: "false",
    impersonation: "false",
  };
  return `${b64url(header)}.${b64url(payload)}.fixture`;
}

const JWT = makeJwt();

const MODULES = [
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

const MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

const SUMMARY = {
  totalStudents: 248,
  activeStudents: 214,
  inactiveStudents: 27,
  deletedStudents: 7,
  monthlyStudents: 18,
  monthlyDeletedStudents: 5,
  netStudentGrowth: 13,
  totalGroups: 12,
  monthlyRevenue: 48750,
  previousMonthRevenue: 43200,
  monthlyExpenses: 12600,
  previousMonthExpenses: 11800,
  monthlyAssistantSalaries: 8500,
  previousMonthAssistantSalaries: 8000,
  netProfit: 27650,
  attendancePercentage: 82.4,
  monthlyPresentCount: 1640,
  monthlyAbsentCount: 210,
  monthlyLateCount: 96,
  monthlyExcusedCount: 42,
  monthlyAttendanceCount: 1988,
};

const DISTRIBUTION = Array.from({ length: 12 }, (_, i) => ({
  groupName: `مجموعة ${i + 1}`,
  studentsCount: 14 + ((i * 3) % 12),
}));

const REVENUE = MONTHS.map((monthName, i) => ({
  monthName,
  revenue: 36000 + i * 1250,
  expenses: 9800 + ((i * 420) % 2600),
}));

const MOVEMENT = MONTHS.map((monthName, i) => ({
  monthName,
  newStudents: 10 + ((i * 5) % 18),
  departedStudents: 2 + ((i * 3) % 9),
  netGrowth: 8 + ((i * 2) % 10),
}));

const ATTENDANCE = [
  { dayName: "السبت", attendanceRate: 84 },
  { dayName: "الأحد", attendanceRate: 78 },
  { dayName: "الاثنين", attendanceRate: 88 },
  { dayName: "الثلاثاء", attendanceRate: 72 },
  { dayName: "الأربعاء", attendanceRate: 91 },
  { dayName: "الخميس", attendanceRate: 69 },
  { dayName: "الجمعة", attendanceRate: 58 },
];

const TOP_GROUPS = [
  { rank: 1, groupName: "الصف الثالث الثانوي - أ", studentsCount: 26, attendanceRate: 94.2 },
  { rank: 2, groupName: "الصف الثالث الثانوي - ب", studentsCount: 24, attendanceRate: 89.5 },
  { rank: 3, groupName: "الصف الثاني الثانوي - أ", studentsCount: 22, attendanceRate: 86.1 },
  { rank: 4, groupName: "الصف الثاني الثانوي - ب", studentsCount: 20, attendanceRate: 71.4 },
  { rank: 5, groupName: "الصف الأول الثانوي - أ", studentsCount: 19, attendanceRate: 68.8 },
];

const ACTIVITY = [
  { activityType: "student_added", description: "تم إضافة الطالب أحمد محمود إلى مجموعة الصف الثالث الثانوي - أ", date: "2026-11-10T09:14:00" },
  { activityType: "payment_created", description: "تم تسجيل دفعة اشتراك شهر نوفمبر للطالب محمود سامي", date: "2026-11-10T08:42:00" },
  { activityType: "attendance_present", description: "تم تسجيل حضور 24 طالبًا في حصة الفيزياء", date: "2026-11-09T18:05:00" },
  { activityType: "expense_created", description: "تم تسجيل مصروف طباعة امتحانات الشهر", date: "2026-11-09T13:30:00" },
  { activityType: "student_deleted", description: "تم حذف الطالب كريم عادل بعد انتهاء اشتراكه", date: "2026-11-08T17:21:00" },
  { activityType: "assistant_salary", description: "تم صرف مرتب المساعد محمد حسن لشهر أكتوبر", date: "2026-11-08T11:10:00" },
  { activityType: "income_created", description: "تم تسجيل إيراد بيع ملازم المراجعة النهائية", date: "2026-11-07T15:45:00" },
  { activityType: "attendance_absent", description: "تم تسجيل غياب 3 طلاب في مجموعة الصف الثاني الثانوي - ب", date: "2026-11-07T09:05:00" },
];

const STUDENT_CARD = {
  centerName: "مركز النور التعليمي",
  centerLogoUrl: "center-logo.png",
  fullName: "أحمد محمود عبد الرحمن",
  groupName: "مجموعة الصف الثالث الثانوي - أ",
  school: "مدرسة النور الثانوية",
  subscriptionType: "اشتراك شهري",
  parentPhone: "01012345678",
  qrCode: "STU00000001",
  summary: {
    totalSessions: 32,
    presentSessions: 26,
    absentSessions: 3,
    lateSessions: 2,
    excusedSessions: 1,
    attendanceRate: 81.3,
  },
  attendances: [
    { sessionId: 8, groupName: "الصف الثالث الثانوي - أ", attendanceDate: "2026-11-09", dayName: "الأحد", startTime: "17:00", endTime: "19:00", status: "Present", statusLabel: "حاضر" },
    { sessionId: 7, groupName: "الصف الثالث الثانوي - أ", attendanceDate: "2026-11-07", dayName: "الجمعة", startTime: "17:00", endTime: "19:00", status: "Late", statusLabel: "متأخر" },
    { sessionId: 6, groupName: "الصف الثالث الثانوي - أ", attendanceDate: "2026-11-05", dayName: "الأربعاء", startTime: "17:00", endTime: "19:00", status: "Absent", statusLabel: "غائب" },
    { sessionId: 5, groupName: "الصف الثالث الثانوي - أ", attendanceDate: "2026-11-03", dayName: "الاثنين", startTime: "17:00", endTime: "19:00", status: "Excused", statusLabel: "بعذر" },
    { sessionId: 4, groupName: "الصف الثالث الثانوي - أ", attendanceDate: "2026-11-01", dayName: "السبت", startTime: "17:00", endTime: "19:00", status: "Present", statusLabel: "حاضر" },
  ],
  exams: [
    {
      examId: 301,
      examName: "امتحان الفيزياء الشهري",
      examDate: "2026-11-08",
      groupName: "الصف الثالث الثانوي - أ",
      isAbsent: false,
      isLowGrade: false,
      percentage: 88,
      components: [
        { typeLabel: "اختيار من متعدد", isAbsent: false, mark: 18, totalMark: 20 },
        { typeLabel: "مقالي", isAbsent: false, mark: 26, totalMark: 30 },
      ],
    },
    {
      examId: 302,
      examName: "امتحان الكيمياء",
      examDate: "2026-11-04",
      groupName: "الصف الثالث الثانوي - أ",
      isAbsent: false,
      isLowGrade: true,
      percentage: 55,
      components: [
        { typeLabel: "اختيار من متعدد", isAbsent: false, mark: 11, totalMark: 20 },
        { typeLabel: "مقالي", isAbsent: false, mark: 16, totalMark: 30 },
      ],
    },
    {
      examId: 303,
      examName: "امتحان الأحياء",
      examDate: "2026-10-28",
      groupName: "الصف الثالث الثانوي - أ",
      isAbsent: true,
      isLowGrade: false,
      percentage: 0,
      components: [
        { typeLabel: "اختيار من متعدد", isAbsent: true, mark: 0, totalMark: 20 },
      ],
    },
  ],
};

const ok = (data) => ({ succeeded: true, data });

function fixtureFor(url) {
  const lower = url.toLowerCase();
  const code = url.match(/StudentCard\/by-code\/([^?]+)/i);
  if (code) {
    const decoded = decodeURIComponent(code[1]);
    if (/NOPE/i.test(decoded)) {
      return { succeeded: false, message: "مفيش طالب بالكود ده." };
    }
    return { succeeded: true, data: STUDENT_CARD };
  }
  if (lower.includes("authentication/refresh-token")) {
    return {
      accessToken: JWT,
      mustChangePassword: false,
      enabledModules: MODULES,
      subscription: null,
    };
  }
  if (lower.includes("profile/getmyprofile")) {
    return ok({
      centerType: "MultiTeacher",
      subject: "الرياضيات",
      email: "owner@example.com",
      enabledModules: MODULES,
      subscription: null,
    });
  }
  if (lower.includes("center/mycenter")) {
    return ok({
      id: 1,
      name: "مركز النبض التعليمي",
      logoUrl: null,
      themeColor: "#4F46E5",
      type: "MultiTeacher",
    });
  }
  if (lower.includes("dashboard-summary")) return ok(SUMMARY);
  if (lower.includes("student-distribution")) return ok(DISTRIBUTION);
  if (lower.includes("revenue-chart")) return ok(REVENUE);
  if (lower.includes("student-movement")) return ok(MOVEMENT);
  if (lower.includes("attendance-chart")) return ok(ATTENDANCE);
  if (lower.includes("top-groups")) return ok(TOP_GROUPS);
  if (lower.includes("recent-activity")) return ok(ACTIVITY);
  // Unrelated background calls must never hit the real network.
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
  document.querySelectorAll("body *").forEach((el) => {
    if (!visible(el)) return;
    if (el.closest("svg, symbol, defs, [aria-hidden='true'], .sr-only")) return;
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
  document.querySelectorAll(SEL).forEach((el) => {
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
  document.querySelectorAll(PRIMARY_SEL).forEach((el) => {
    if (!visible(el)) return;
    if (el.closest("[aria-hidden='true'], .sr-only")) return;
    if (el.closest("[aria-label='مسار التنقل']")) return;
    if (el.closest(".mobile-bottom-nav")) return;
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
  document.querySelectorAll("body *").forEach((el) => {
    if (!visible(el) || !hasDirectText(el)) return;
    if (el.closest("[aria-hidden='true'], .sr-only, .truncate, [class*='line-clamp'], [title], [data-scroll-region]"))
      return;
    const cs = getComputedStyle(el);
    if (/hidden|clip/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 1) {
      clipped.push({ ...describe(el), axis: "x", by: el.scrollWidth - el.clientWidth, text: el.textContent.trim().slice(0, 24) });
    } else if (/hidden|clip/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 1) {
      clipped.push({ ...describe(el), axis: "y", by: el.scrollHeight - el.clientHeight, text: el.textContent.trim().slice(0, 24) });
    }
  });

  /* 5 - an overlay must not cover an interactive control --------------
     Fixed/sticky chrome (the bottom nav) can sit over whatever happens to
     be at the bottom edge at the current scroll offset. That is expected as
     long as scrolling the control into view frees it, so a hit is only a
     failure when it survives scrollIntoView. */
  const covered = [];
  document.querySelectorAll(SEL).forEach((el) => {
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
      byRect: [
        Math.round(tr.left),
        Math.round(tr.top),
        Math.round(tr.width),
        Math.round(tr.height),
      ],
      elRect: [
        Math.round(r.left),
        Math.round(r.top),
        Math.round(r.width),
        Math.round(r.height),
      ],
    });
  });

  /* 6 - sibling cards/sections must not overlap ----------------------- */
  const blocks = [
    ...document.querySelectorAll(
      '[data-testid^="section-"], [data-testid^="chart-"], .card-grid > *, [data-testid="student-card-stats"] > *',
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
  document
    .querySelectorAll("p, li, td, th, h1, h2, h3, h4, label, button, a[href], span, div")
    .forEach((el) => {
      if (!visible(el) || !hasDirectText(el)) return;
      if (el.closest("[aria-hidden='true'], .sr-only, svg")) return;
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

  /* 9 - page detection + page-specific probes ------------------------ */
  const loginCard = document.querySelector('[data-testid="login-card"]');
  const cardPage = document.querySelector('[data-testid="student-card-page"]');
  const dashboard = document.querySelector('[data-testid="admin-dashboard"]');
  const page = loginCard ? "login" : cardPage ? "student-card" : dashboard ? "dashboard" : "other";

  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height), left: Math.round(r.left), top: Math.round(r.top) };
  };

  let login = null;
  if (loginCard) {
    const panel = document.querySelector('[data-testid="login-brand-panel"]');
    const panelContent = panel
      ? [...panel.children].find((child) => child.getAttribute("aria-hidden") !== "true")
      : null;
    login = {
      card: box(loginCard),
      brandPanelVisible: visible(panel),
      brandHeaderVisible: visible(document.querySelector('[data-testid="login-brand-header"]')),
      brandPanelOverflow: panel && panelContent
        ? Math.max(
            0,
            Math.round(panelContent.getBoundingClientRect().bottom - panel.getBoundingClientRect().bottom),
            Math.round(panel.getBoundingClientRect().top - panelContent.getBoundingClientRect().top),
          )
        : null,
      logoCount: [...document.querySelectorAll("img[src='/logo.png']")].filter(visible).length,
      phone: box(document.querySelector("#login-phone")),
      password: box(document.querySelector("#login-password")),
      submit: box(document.querySelector('[data-testid="login-submit"]')),
      themeToggle: box(document.querySelector('[data-testid="login-theme-toggle"]')),
      heading: (loginCard.querySelector("h1")?.textContent || "").trim(),
    };
  }

  let student = null;
  if (cardPage) {
    const result = document.querySelector('[data-testid="student-card-result"]');
    const stats = document.querySelector('[data-testid="student-card-stats"]');
    const qr = result?.querySelector("img[alt]");
    student = {
      resultVisible: visible(result),
      errorVisible: visible(document.querySelector('[data-testid="student-card-error"]')),
      stats: stats ? box(stats) : null,
      statsCols: stats
        ? getComputedStyle(stats).gridTemplateColumns.split(" ").filter(Boolean).length
        : null,
      search: box(document.querySelector("#student-card-code")),
      hasQr: !!(qr && qr.complete && qr.naturalWidth > 0),
      attendanceRows: document.querySelectorAll(
        '[data-testid="student-card-attendance"] li',
      ).length,
      examRows: document.querySelectorAll('[data-testid="student-card-exams"] li').length,
      headerGradient: (() => {
        const h = cardPage.querySelector("header");
        return h ? getComputedStyle(h).backgroundImage.includes("gradient") : false;
      })(),
    };
  }

  let dashboardInfo = null;
  if (dashboard) {
    const kpi = document.querySelector('[data-testid="section-students"] .card-grid');
    const kpiHost = kpi?.parentElement;
    const content = dashboard.firstElementChild;
    const chartRects = [...document.querySelectorAll(".recharts-wrapper")].map((wrap) => {
      const card = wrap.closest('[data-testid^="chart-"]');
      const host = wrap.getBoundingClientRect();
      // Axis labels may spill into the card's padding without being clipped;
      // the card box is the real readability boundary.
      const bounds = card ? card.getBoundingClientRect() : host;
      const xTicks = [...wrap.querySelectorAll(".recharts-xAxis-tick-labels text")];
      const yTicks = [...wrap.querySelectorAll(".recharts-yAxis-tick-labels text")];
      // Month labels must stay upright. Recharts rotates angled ticks through a
      // rotate(...) transform on the text node.
      const rotated = xTicks.filter((t) =>
        /rotate/i.test(t.getAttribute("transform") || ""),
      ).length;
      const labels = xTicks.map((t) => {
        const r = t.getBoundingClientRect();
        return {
          text: (t.textContent || "").trim(),
          fs: Math.round(parseFloat(getComputedStyle(t).fontSize) * 10) / 10,
          fill: getComputedStyle(t).fill,
          left: r.left,
          right: r.right,
          top: r.top,
          bottom: r.bottom,
        };
      });
      const overlaps = [];
      for (let i = 0; i < labels.length; i += 1) {
        for (let j = i + 1; j < labels.length; j += 1) {
          const a = labels[i];
          const b = labels[j];
          const ix = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
          const iy = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
          const minArea = Math.min(
            (a.right - a.left) * (a.bottom - a.top),
            (b.right - b.left) * (b.bottom - b.top),
          );
          if (ix * iy > 4 && minArea > 0 && (ix * iy) / minArea > 0.25) {
            overlaps.push([a.text, b.text]);
          }
        }
      }
      const outside = labels.filter(
        (l) => l.left < bounds.left - 1.5 || l.right > bounds.right + 1.5,
      );
      const outsidePx = labels.reduce(
        (worst, l) =>
          Math.max(
            worst,
            Math.round(bounds.left - l.left),
            Math.round(l.right - bounds.right),
          ),
        0,
      );
      return {
        id: card?.getAttribute("data-testid") || "chart",
        width: Math.round(host.width),
        height: Math.round(host.height),
        bars: wrap.querySelectorAll(".recharts-bar-rectangle").length,
        sectors: wrap.querySelectorAll(".recharts-pie-sector").length,
        xTicks: labels.length,
        yTicks: yTicks.length,
        rotated,
        textCount: wrap.querySelectorAll("text").length,
        tickClasses: [
          ...new Set(
            [...wrap.querySelectorAll("text")].flatMap((t) => [...t.classList]),
          ),
        ].slice(0, 8),
        minFont: labels.length ? Math.min(...labels.map((l) => l.fs)) : null,
        maxFont: labels.length ? Math.max(...labels.map((l) => l.fs)) : null,
        outside: outside.length,
        outsidePx,
        outsideLabels: outside.slice(0, 3).map((l) => l.text),
        cardBox: (() => {
          const r = card?.getBoundingClientRect();
          return r
            ? [Math.round(r.left), Math.round(r.right), Math.round(r.width)]
            : null;
        })(),
        overlap: overlaps.length,
        overlapPairs: overlaps.slice(0, 3),
      };
    });

    dashboardInfo = {
      hero: box(document.querySelector('[data-testid="dashboard-hero"]')),
      insight: visible(document.querySelector('[data-testid="dashboard-insight"]')),
      kpiCols: kpi
        ? getComputedStyle(kpi).gridTemplateColumns.split(" ").filter(Boolean).length
        : null,
      kpiHostWidth: kpiHost ? Math.round(kpiHost.getBoundingClientRect().width) : null,
      kpiValues: [...document.querySelectorAll('[data-testid="section-students"] .num')].map(
        (n) => n.textContent.trim(),
      ),
      charts: chartRects,
      chartCards: document.querySelectorAll('[data-testid^="chart-"]').length,
      chartCardsWithCanvas: [...document.querySelectorAll('[data-testid^="chart-"]')].filter((c) =>
        c.querySelector(".recharts-wrapper"),
      ).length,
      content: content ? box(content) : null,
      monthSelect: box(
        document.querySelector('[data-testid="dashboard-hero"] select'),
      ),
      refresh: box(document.querySelector('[data-testid="dashboard-refresh"]')),
      badText: (() => {
        const text = document.body.innerText || "";
        const found = text.match(/(undefined|NaN|Infinity)/g);
        return found ? [...new Set(found)] : [];
      })(),
      hiddenHorizontal: (() => {
        let worst = 0;
        document.querySelectorAll('[data-testid="admin-dashboard"] *').forEach((el) => {
          const cs = getComputedStyle(el);
          if (!/hidden|clip/.test(cs.overflowX) || el.scrollWidth <= el.clientWidth + 1) return;
          // Decorative shells (hero circles, blur blobs) intentionally clip
          // absolutely positioned art; only real content counts.
          const meaningful =
            el.matches("table, img") ||
            !!el.querySelector(":scope > table, :scope > img") ||
            [...el.childNodes].some(
              (n) => n.nodeType === 3 && n.textContent.trim().length > 0,
            );
          if (meaningful) worst = Math.max(worst, el.scrollWidth - el.clientWidth);
        });
        return worst;
      })(),
    };
  }

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
    page,
    login,
    student,
    dashboard: dashboardInfo,
  };
})()`;

/* ------------------------------------------------------------------ */
/* behavioural probes                                                  */
/* ------------------------------------------------------------------ */

const LOGIN_PROBE = String.raw`(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const setVal = (el, value) => {
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    ).set;
    setter.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  };
  const out = {};
  const phone = document.querySelector("#login-phone");
  const pwd = document.querySelector("#login-password");
  if (!phone || !pwd) return out;
  setVal(phone, "123");
  setVal(pwd, "abc");
  document.querySelector('[data-testid="login-submit"]').click();
  await wait(320);
  out.phoneError = document.querySelector("#login-phone-error")?.textContent.trim() || null;
  out.passwordError = document.querySelector("#login-password-error")?.textContent.trim() || null;
  out.shakeClass = document.querySelector("form").className.includes("shake-anim");

  setVal(pwd, "secret123");
  const toggle = document.querySelector('[data-testid="login-password-toggle"]');
  out.typeBefore = pwd.type;
  toggle.click();
  await wait(80);
  out.typeAfter = document.querySelector("#login-password").type;
  toggle.click();
  await wait(80);
  out.typeRestored = document.querySelector("#login-password").type;

  const theme = document.querySelector('[data-testid="login-theme-toggle"]');
  const before = document.documentElement.classList.contains("dark");
  theme.click();
  await wait(220);
  out.themeToggled =
    document.documentElement.classList.contains("dark") !== before;
  theme.click();
  await wait(220);
  out.themeRestored =
    document.documentElement.classList.contains("dark") === before;
  out.ariaLabels = {
    theme: theme.getAttribute("aria-label"),
    password: toggle.getAttribute("aria-label"),
  };
  return out;
})()`;

const STUDENT_PROBE = String.raw`(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const setVal = (el, value) => {
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    ).set;
    setter.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  };
  const out = { resultBefore: !!document.querySelector('[data-testid="student-card-result"]') };
  const input = document.querySelector("#student-card-code");
  setVal(input, "NOPE123");
  document.querySelector('[data-testid="student-card-search"] button[type="submit"]').click();
  await wait(400);
  const error = document.querySelector('[data-testid="student-card-error"]');
  out.errorVisible = !!error;
  out.errorText = error?.textContent.trim() || null;
  return out;
})()`;

const DASHBOARD_PROBE = String.raw`(() => {
  const out = {};
  const hero = document.querySelector('[data-testid="dashboard-hero"]');
  const month = hero?.querySelector("select");
  if (month) {
    month.value = "3";
    month.dispatchEvent(new Event("change", { bubbles: true }));
    out.monthChanged = true;
    out.heroTextAfter = hero.textContent.replace(/\s+/g, " ").trim().slice(0, 160);
  }
  return out;
})()`;

const TOOLTIP_STATE = String.raw`(() => {
  const wrappers = [...document.querySelectorAll(".recharts-tooltip-wrapper")];
  const visible = wrappers.filter((w) => {
    const cs = getComputedStyle(w);
    if (cs.visibility === "hidden" || cs.display === "none") return false;
    if (!w.textContent.trim()) return false;
    // A tooltip left open on a chart that has since scrolled away is not the
    // result of the current interaction.
    const r = w.getBoundingClientRect();
    return r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
  });
  return visible.map((w) => ({
    text: w.textContent.replace(/\s+/g, " ").trim().slice(0, 120),
    rect: (() => {
      const r = w.getBoundingClientRect();
      return { left: Math.round(r.left), top: Math.round(r.top), right: Math.round(r.right), bottom: Math.round(r.bottom) };
    })(),
  }));
})()`;

const BAR_POINT = String.raw`(() => {
  const card = document.querySelector('[data-testid="chart-movement"]');
  if (!card) return null;
  card.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
  const bars = [...card.querySelectorAll(".recharts-bar-rectangle")];
  const pick = bars
    .map((b) => ({ b, r: b.getBoundingClientRect() }))
    .filter((x) => x.r.width > 4 && x.r.height > 4)
    .sort((a, b) => b.r.height - a.r.height)[0];
  if (!pick) return null;
  return {
    x: Math.round(pick.r.left + pick.r.width / 2),
    y: Math.round(pick.r.top + pick.r.height / 2),
    text: pick.b.textContent || "",
  };
})()`;

const REVENUE_POINT = String.raw`(() => {
  const card = document.querySelector('[data-testid="chart-revenue"]');
  if (!card) return { error: "no card" };
  card.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
  const bars = [...card.querySelectorAll(".recharts-bar-rectangle")];
  const pick = bars
    .map((b) => ({ b, r: b.getBoundingClientRect() }))
    .filter((x) => x.r.width > 2 && x.r.height > 4)
    .sort((a, b) => b.r.height - a.r.height)[0];
  if (!pick) {
    const r = card.getBoundingClientRect();
    return {
      error: "no pick",
      bars: bars.length,
      rects: card.querySelectorAll(".recharts-rectangle").length,
      wrappers: card.querySelectorAll(".recharts-wrapper").length,
      size: [Math.round(r.width), Math.round(r.height)],
      text: card.innerText.slice(0, 120),
      rectsInfo: bars.slice(0, 3).map((b) => {
        const q = b.getBoundingClientRect();
        return [Math.round(q.width), Math.round(q.height)];
      }),
    };
  }
  return {
    x: Math.round(pick.r.left + pick.r.width / 2),
    y: Math.round(pick.r.top + pick.r.height / 2),
  };
})()`;

/* ------------------------------------------------------------------ */
/* harness                                                             */
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

function columnsForContainer(width) {
  if (width >= 72 * 16) return 4;
  if (width >= 46 * 16) return 3;
  if (width >= 24 * 16) return 2;
  return 1;
}

async function main() {
  await rm(PROFILE, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
  await mkdir(SHOTS, { recursive: true });

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

    const onEvent = async (msg) => {
      if (msg.method !== "Fetch.requestPaused") return;
      const { requestId, request } = msg.params;
      apiLog.push({
        method: request.method,
        url: request.url,
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
        const payload = fixtureFor(request.url);
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
      await client.send("Page.navigate", { url: `${BASE}${path}` });
      for (let i = 0; i < 120; i += 1) {
        if ((await evaluate("document.readyState")) === "complete") break;
        await sleep(100);
      }
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
          `localStorage.setItem("cm-theme", ${JSON.stringify(theme)}); location.reload();`,
        );
        await sleep(1400);
        for (const selector of waits) {
          await waitForSelector(selector);
        }
        await evaluate("document.fonts.ready.then(() => true)", true);
        await sleep(650);
      }
    };

    const settle = async (pageKey, theme) => {
      if (pageKey === "dashboard") {
        await waitForSelector(".recharts-wrapper");
        await sleep(1200);
        const darkNow = await evaluate(
          "document.documentElement.classList.contains('dark')",
        );
        if (darkNow !== (theme === "dark")) {
          await sleep(300);
        }
      } else if (pageKey === "student-card") {
        await waitForSelector('[data-testid="student-card-result"]');
        await sleep(500);
      } else {
        await sleep(350);
      }
    };

    const screenshot = async (name, { full = false } = {}) => {
      const params = { format: "png", fromSurface: true };
      if (full) {
        const metrics = await client.send("Page.getLayoutMetrics");
        const size = metrics.cssContentSize || metrics.contentSize;
        const width = Math.max(1, Math.ceil(size.width));
        const height = Math.max(1, Math.min(Math.ceil(size.height), 12000));
        params.captureBeyondViewport = true;
        params.clip = { x: 0, y: 0, width, height, scale: 1 };
      }
      const { data } = await client.send("Page.captureScreenshot", params);
      await writeFile(join(SHOTS, name), Buffer.from(data, "base64"));
    };

    const clickAt = async (x, y) => {
      await client.send("Input.dispatchMouseEvent", {
        type: "mousePressed",
        x,
        y,
        button: "left",
        clickCount: 1,
      });
      await client.send("Input.dispatchMouseEvent", {
        type: "mouseReleased",
        x,
        y,
        button: "left",
        clickCount: 1,
      });
      await sleep(420);
    };

    const tapAt = async (x, y) => {
      await client.send("Emulation.setTouchEmulationEnabled", {
        enabled: true,
        maxTouchPoints: 1,
      });
      await client.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x, y }],
      });
      await sleep(60);
      await client.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await sleep(60);
      /* A real phone follows touchend with compatibility mouse events and a
         click; headless CDP stops at touchend, so replay that final step to
         exercise the same click handler a finger would. */
      await client.send("Input.dispatchMouseEvent", {
        type: "mousePressed",
        x,
        y,
        button: "left",
        clickCount: 1,
      });
      await client.send("Input.dispatchMouseEvent", {
        type: "mouseReleased",
        x,
        y,
        button: "left",
        clickCount: 1,
      });
      await sleep(500);
      await client.send("Emulation.setTouchEmulationEnabled", { enabled: false });
    };

    const runs = [];
    const failures = [];
    const notes = [];

    /* ---------- main matrix ---------- */
    for (const page of pages) {
      for (const [id, width, height] of viewports) {
        for (const theme of themes) {
          await navigate(page.path, theme, { width, height }, [page.wait]);
          await settle(page.key, theme);
          const audit = await evaluate(AUDIT);
          const run = {
            page: page.key,
            id,
            width,
            height,
            theme,
            ...audit,
          };
          runs.push(run);

          if (page.shotEvery) {
            await screenshot(`${page.key}-${id}-${theme}.png`);
          }
          if (page.full && (page.key === "dashboard" || ["360", "390", "768"].includes(id))) {
            await screenshot(`${page.key}-${id}-${theme}-full.png`, { full: true });
          }

          const tag = `${page.key} ${id} ${theme}`;
          if (audit.page !== page.key)
            failures.push(`${tag}: page detected as ${audit.page}`);
          if (audit.overflowX > 1)
            failures.push(`${tag}: horizontal page scroll ${audit.overflowX}px`);
          if (audit.outsideCount)
            failures.push(
              `${tag}: ${audit.outsideCount} element(s) outside the viewport (${audit.outside
                .slice(0, 3)
                .map((s) => `${s.tag}.${s.cls}`)
                .join(", ")})`,
            );
          if (audit.smallCount)
            failures.push(
              `${tag}: ${audit.smallCount} tap target(s) under 44px (${audit.small
                .slice(0, 3)
                .map((s) => `${s.tag}.${s.cls} ${s.w}x${s.h}`)
                .join(", ")})`,
            );
          if (audit.primaryCount)
            failures.push(
              `${tag}: ${audit.primaryCount} primary text node(s) under 14px (${audit.primary
                .slice(0, 3)
                .map((s) => `${s.tag}.${s.cls} ${s.fs}px`)
                .join(", ")})`,
            );
          if (audit.clippedCount)
            failures.push(
              `${tag}: ${audit.clippedCount} clipped text box(es) (${audit.clipped
                .slice(0, 3)
                .map((s) => `${s.tag}.${s.cls} ${s.axis}+${s.by}px`)
                .join(", ")})`,
            );
          if (audit.coveredCount)
            failures.push(`${tag}: ${audit.coveredCount} covered interactive control(s)`);
          if (audit.overlapCount)
            failures.push(`${tag}: ${audit.overlapCount} overlapping card/section pair(s)`);
          if (audit.dir !== "rtl") failures.push(`${tag}: document direction is not rtl`);
          if (!audit.fonts.tajawal) failures.push(`${tag}: Tajawal not loaded`);
          if (!audit.fonts.manrope) failures.push(`${tag}: Manrope not loaded`);
          if (audit.contrastLow.length)
            failures.push(
              `${tag}: ${audit.contrastLow.length} contrast failure(s) (${audit.contrastLow
                .slice(0, 3)
                .map((c) => `${c.ratio}:1 ${c.fs}px`)
                .join(", ")})`,
            );

          if (page.key === "login") {
            const login = audit.login;
            if (!login) failures.push(`${tag}: login card not measured`);
            else {
              if (login.logoCount !== 1)
                failures.push(`${tag}: ${login.logoCount} visible logos, expected 1`);
              const wide = width >= 768 && height > 520;
              if (login.brandPanelVisible !== wide)
                failures.push(
                  `${tag}: brand panel visible=${login.brandPanelVisible}, expected ${wide}`,
                );
              if (login.brandHeaderVisible === wide)
                failures.push(
                  `${tag}: mobile brand header visible=${login.brandHeaderVisible}, expected ${!wide}`,
                );
              if (login.brandPanelOverflow > 2)
                failures.push(
                  `${tag}: brand panel content overflows by ${login.brandPanelOverflow}px`,
                );
              if (login.phone && login.phone.h < 48)
                failures.push(`${tag}: phone field is ${login.phone.h}px, expected >=48`);
              if (login.password && login.password.h < 48)
                failures.push(`${tag}: password field is ${login.password.h}px, expected >=48`);
              if (login.submit && login.submit.h < 48)
                failures.push(`${tag}: submit is ${login.submit.h}px, expected >=48`);
              // The form and its submit button must be reachable without
              // scrolling - including keyboard-open heights (~420px).
              if (login.submit && login.submit.top + login.submit.h > audit.vh + 1)
                failures.push(
                  `${tag}: submit button below the fold (${login.submit.top + login.submit.h}px > ${audit.vh}px)`,
                );
              if (audit.overflowY > 0)
                failures.push(`${tag}: login page scrolls vertically by ${audit.overflowY}px`);
              if (login.card && login.card.w > 433)
                failures.push(`${tag}: login card is ${login.card.w}px, expected <=432`);
              if (login.heading !== "مرحباً بعودتك")
                failures.push(`${tag}: login heading changed`);
            }
          }

          if (page.key === "student-card") {
            const student = audit.student;
            if (!student) failures.push(`${tag}: student card not measured`);
            else {
              if (!student.resultVisible)
                failures.push(`${tag}: student result is not rendered`);
              if (!student.hasQr) failures.push(`${tag}: QR image did not load`);
              const expectedCols = width < 640 ? 2 : width < 1024 ? 3 : 6;
              if (student.statsCols !== expectedCols)
                failures.push(
                  `${tag}: stats grid ${student.statsCols} cols, expected ${expectedCols}`,
                );
              if (!student.headerGradient)
                failures.push(`${tag}: student card header is not the identity gradient`);
              if (student.search && student.search.h < 48)
                failures.push(`${tag}: search input is ${student.search.h}px, expected >=48`);
              if (student.attendanceRows < 1 || student.examRows < 1)
                failures.push(`${tag}: attendance/exam rows did not render`);
            }
          }

          if (page.key === "dashboard") {
            const dash = audit.dashboard;
            if (!dash) failures.push(`${tag}: dashboard not measured`);
            else {
              if (!dash.hero) failures.push(`${tag}: dashboard hero missing`);
              if (dash.kpiCols !== columnsForContainer(dash.kpiHostWidth ?? width))
                failures.push(
                  `${tag}: KPI grid ${dash.kpiCols} cols, expected ${columnsForContainer(
                    dash.kpiHostWidth ?? width,
                  )}`,
                );
              if (!dash.kpiValues.length) failures.push(`${tag}: KPI values missing`);
              if (!dash.insight) failures.push(`${tag}: data-driven insight banner missing`);
              if (dash.chartCards !== 6)
                failures.push(`${tag}: ${dash.chartCards} chart cards, expected 6`);
              if (dash.chartCardsWithCanvas !== 4)
                failures.push(
                  `${tag}: ${dash.chartCardsWithCanvas}/4 Recharts canvases (the other two cards are SVG/list visualisations)`,
                );
              if (dash.badText.length)
                failures.push(`${tag}: placeholder text rendered (${dash.badText.join(", ")})`);
              if (dash.monthSelect && dash.monthSelect.h < 44)
                failures.push(`${tag}: month select is ${dash.monthSelect.h}px`);
              if (dash.refresh && dash.refresh.h < 44)
                failures.push(`${tag}: refresh control is ${dash.refresh.h}px`);
              if (dash.hiddenHorizontal > 1)
                failures.push(
                  `${tag}: hidden horizontal overflow ${dash.hiddenHorizontal}px inside dashboard`,
                );

              const expectedCap = width >= 2560 ? 1760 : width >= 1920 ? 1600 : 1440;
              if (
                width >= 1920 &&
                dash.content &&
                dash.content.w > expectedCap + 1
              )
                failures.push(
                  `${tag}: dashboard content ${dash.content.w}px, cap ${expectedCap}px`,
                );

              dash.charts.forEach((chart) => {
                if (chart.bars && !chart.xTicks)
                  failures.push(`${tag}: ${chart.id} has no x-axis ticks`);
                if (chart.bars && !chart.yTicks)
                  failures.push(`${tag}: ${chart.id} has no y-axis ticks`);
                if (chart.minFont !== null && chart.minFont < 12)
                  failures.push(`${tag}: ${chart.id} axis labels ${chart.minFont}px`);
                if (chart.outside)
                  failures.push(`${tag}: ${chart.id} has ${chart.outside} axis label(s) outside its container`);
                if (chart.overlap)
                  failures.push(
                    `${tag}: ${chart.id} has ${chart.overlap} overlapping axis label pair(s)`,
                  );
                if (chart.rotated)
                  failures.push(
                    `${tag}: ${chart.id} has ${chart.rotated} rotated x-axis label(s)`,
                  );
                if (
                  /chart-(movement|revenue)$/.test(chart.id) &&
                  chart.width < 720 &&
                  chart.xTicks > 6
                )
                  failures.push(
                    `${tag}: ${chart.id} shows ${chart.xTicks} month labels on a ${chart.width}px chart`,
                  );
                if (!chart.bars && !chart.sectors)
                  failures.push(`${tag}: ${chart.id} rendered no data marks`);
              });
            }
          }
        }
      }
    }

    /* ---------- behaviour probes (one viewport each) ---------- */
    const probes = {};

    await navigate("/login", "light", { width: 390, height: 844 }, ['[data-testid="login-card"]']);
    await settle("login", "light");
    probes.login = await evaluate(LOGIN_PROBE, true);
    notes.push(
      `login probe: phoneError=${!!probes.login.phoneError}, passwordError=${!!probes.login.passwordError}, ` +
        `shake=${probes.login.shakeClass}, type toggle=${probes.login.typeBefore}->${probes.login.typeAfter}->${probes.login.typeRestored}, ` +
        `theme toggle=${probes.login.themeToggled && probes.login.themeRestored}, labels=${JSON.stringify(probes.login.ariaLabels)}`,
    );

    const loginTag = "login probe 390 light";
    if (!probes.login.phoneError) failures.push(`${loginTag}: phone validation did not show`);
    if (!probes.login.passwordError) failures.push(`${loginTag}: password validation did not show`);
    if (!probes.login.shakeClass) failures.push(`${loginTag}: invalid submit did not shake`);
    if (probes.login.typeAfter !== "text" || probes.login.typeRestored !== "password")
      failures.push(`${loginTag}: password visibility toggle failed`);
    if (!probes.login.themeToggled || !probes.login.themeRestored)
      failures.push(`${loginTag}: theme toggle failed`);
    if (probes.login.ariaLabels.theme !== "التبديل إلى الوضع الليلي")
      failures.push(`${loginTag}: theme aria-label changed`);

    await navigate(
      "/student-card/STU00000001",
      "light",
      { width: 390, height: 844 },
      ['[data-testid="student-card-result"]'],
    );
    await settle("student-card", "light");
    probes.student = await evaluate(STUDENT_PROBE, true);
    notes.push(
      `student-card probe: resultBefore=${probes.student.resultBefore}, error=${probes.student.errorVisible}, text=${JSON.stringify(probes.student.errorText)}`,
    );
    if (!probes.student.resultBefore)
      failures.push("student-card probe 390 light: initial result missing");
    if (!probes.student.errorVisible)
      failures.push("student-card probe 390 light: not-found state did not render");

    await navigate(
      "/adminDashboard",
      "light",
      { width: 390, height: 844 },
      ['[data-testid="admin-dashboard"]'],
    );
    await settle("dashboard", "light");
    const beforeProbe = apiLog.length;
    probes.dashboard = await evaluate(DASHBOARD_PROBE);
    await sleep(900);
    const monthCalls = apiLog
      .slice(beforeProbe)
      .filter((c) => /dashboard-summary/i.test(c.url) && /month=3/i.test(c.url));
    probes.dashboard.monthCalls = monthCalls.length;
    probes.dashboard.monthCallsAll = apiLog
      .slice(beforeProbe)
      .filter((c) => /dashboard-summary/i.test(c.url)).length;

    // Click (mouse) tooltip on the movement chart.
    let point = await evaluate(BAR_POINT);
    if (point) {
      await clickAt(point.x, point.y);
      probes.dashboard.tooltipClick = await evaluate(TOOLTIP_STATE);
      await screenshot("dashboard-390-light-tooltip.png");
    } else {
      probes.dashboard.tooltipClick = [];
    }

    // Tap (touch) tooltip on the revenue chart.
    let revenuePoint = await evaluate(REVENUE_POINT);
    if (revenuePoint) {
      await tapAt(revenuePoint.x, revenuePoint.y);
      probes.dashboard.tooltipTap = await evaluate(TOOLTIP_STATE);
      await screenshot("dashboard-390-light-tooltip-tap.png");
    } else {
      probes.dashboard.tooltipTap = [];
    }

    notes.push(
      `dashboard probe: month stored=${probes.dashboard.monthChanged}, hero="${probes.dashboard.heroTextAfter}", ` +
        `summary calls after change=${probes.dashboard.monthCallsAll} (month=3: ${probes.dashboard.monthCalls}), ` +
        `tooltip click="${probes.dashboard.tooltipClick
          .map((t) => t.text)
          .join(" | ")}", tooltip tap="${probes.dashboard.tooltipTap
          .map((t) => t.text)
          .join(" | ")}"`,
    );
    if (!probes.dashboard.heroTextAfter?.includes("مارس"))
      failures.push("dashboard probe: month change did not update the hero banner");
    if (probes.dashboard.monthCalls < 1)
      failures.push("dashboard probe: month change did not refetch the summary");
    if (!probes.dashboard.tooltipClick.length)
      failures.push("dashboard probe: click did not open a tooltip");
    if (!probes.dashboard.tooltipTap.length)
      failures.push("dashboard probe: touch tap did not open a tooltip");

    /* ---------- 200% text zoom ---------- */
    const textZoom = [];
    const zoomTargets = [
      ["login", "/login", '[data-testid="login-card"]', [["390", 390, 844]]],
      ["student-card", "/student-card/STU00000001", '[data-testid="student-card-result"]', [["390", 390, 844]]],
      [
        "dashboard",
        "/adminDashboard",
        '[data-testid="admin-dashboard"]',
        [
          ["390", 390, 844],
          ["768", 768, 1024],
          ["1440", 1440, 900],
        ],
      ],
    ];
    for (const [pageKey, path, wait, sizes] of zoomTargets.filter(([key]) =>
      RUN_PAGES.includes(key),
    )) {
      for (const [id, width, height] of sizes) {
        for (const theme of themes) {
          await navigate(path, theme, { width, height }, [wait]);
          await settle(pageKey, theme);
          await evaluate('document.documentElement.style.fontSize = "200%"; true');
          await sleep(650);
          const audit = await evaluate(AUDIT);
          textZoom.push({ page: pageKey, id, width, height, theme, ...audit });
          await screenshot(`${pageKey}-${id}-${theme}-text200.png`);

          const tag = `text200 ${pageKey} ${id} ${theme}`;
          if (audit.overflowX > 1)
            failures.push(`${tag}: horizontal page scroll ${audit.overflowX}px`);
          if (audit.outsideCount)
            failures.push(`${tag}: ${audit.outsideCount} element(s) outside the viewport`);
          if (audit.clippedCount)
            failures.push(`${tag}: ${audit.clippedCount} clipped text box(es)`);
          if (audit.coveredCount)
            failures.push(`${tag}: ${audit.coveredCount} covered control(s)`);
          if (audit.overlapCount)
            failures.push(`${tag}: ${audit.overlapCount} overlapping pair(s)`);
          if (audit.primaryCount)
            failures.push(`${tag}: ${audit.primaryCount} primary text node(s) under 14px`);
          if (audit.smallCount)
            failures.push(`${tag}: ${audit.smallCount} tap target(s) under 44px`);
        }
      }
    }

    /* ---------- 200% page zoom ---------- */
    const pageZoom = [];
    const pageZoomTargets = [
      ["login", "/login", '[data-testid="login-card"]', [["1440", 1440, 900]]],
      [
        "student-card",
        "/student-card/STU00000001",
        '[data-testid="student-card-result"]',
        [["1440", 1440, 900]],
      ],
      [
        "dashboard",
        "/adminDashboard",
        '[data-testid="admin-dashboard"]',
        [
          ["1024", 1024, 768],
          ["1440", 1440, 900],
        ],
      ],
    ];
    for (const [pageKey, path, wait, sizes] of pageZoomTargets.filter(([key]) =>
      RUN_PAGES.includes(key),
    )) {
      for (const [id, width, height] of sizes) {
        for (const theme of themes) {
          const zoomWidth = Math.round(width / 2);
          const zoomHeight = Math.round(height / 2);
          await navigate(path, theme, {
            width: zoomWidth,
            height: zoomHeight,
            dsf: 2,
          }, [wait]);
          await settle(pageKey, theme);
          const audit = await evaluate(AUDIT);
          pageZoom.push({
            page: pageKey,
            id,
            width: zoomWidth,
            height: zoomHeight,
            theme,
            ...audit,
          });
          await screenshot(`${pageKey}-${id}-${theme}-zoom200.png`);

          const tag = `zoom200 ${pageKey} ${id} ${theme}`;
          if (audit.overflowX > 1)
            failures.push(`${tag}: horizontal page scroll ${audit.overflowX}px`);
          if (audit.outsideCount)
            failures.push(`${tag}: ${audit.outsideCount} element(s) outside the viewport`);
          if (audit.clippedCount)
            failures.push(`${tag}: ${audit.clippedCount} clipped text box(es)`);
          if (audit.coveredCount)
            failures.push(`${tag}: ${audit.coveredCount} covered control(s)`);
          if (audit.overlapCount)
            failures.push(`${tag}: ${audit.overlapCount} overlapping pair(s)`);
          if (audit.primaryCount)
            failures.push(`${tag}: ${audit.primaryCount} primary text node(s) under 14px`);
          if (audit.smallCount)
            failures.push(`${tag}: ${audit.smallCount} tap target(s) under 44px`);
        }
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
        kpiCols: r.dashboard?.kpiCols ?? null,
        charts: r.dashboard?.charts ?? null,
        statsCols: r.student?.statsCols ?? null,
        logoCount: r.login?.logoCount ?? null,
        brandPanel: r.login?.brandPanelVisible ?? null,
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
      viewports: viewports.length,
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
      join(OUT, "phase4-verify.json"),
      JSON.stringify({ summary, runs, probes, textZoom, pageZoom }, null, 2),
    );

    /* ---------- markdown ---------- */
    const md = [];
    md.push("# المرحلة 4 — تقرير الفحص الآلي", "");
    md.push(`تم التوليد: ${summary.generated}`, "");
    md.push(
      `النتيجة: **${failures.length ? "FAIL" : "ALL PASS"}** — ${summary.runs} تشغيلًا: ` +
        `${runs.length} تشغيلًا أساسيًا (${viewports.length} مقاسًا × ${themes.length} وضع × ${pages.length} صفحات)، ` +
        `${textZoom.length} تكبير نص 200%، ${pageZoom.length} تكبير صفحة 200%.`,
      "",
    );

    const table = (pageKey, title) => {
      md.push(`## ${title}`, "");
      md.push(
        "| المقاس | الوضع | تمرير أفقي | خارج الشاشة | أهداف <44 | نص <14 | نص مقطوع | تغطية | تراكب | أقل تباين | ملاحظة |",
      );
      md.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
      runs
        .filter((r) => r.page === pageKey)
        .forEach((r) => {
          let extra = "—";
          if (pageKey === "login" && r.login) {
            extra = `لوجو ${r.login.logoCount} · بانر ${r.login.brandPanelVisible ? "ديسكتوب" : "موبايل"} · زر ${r.login.submit ? r.login.submit.top + r.login.submit.h : "?"}px/${r.vh}px · تمرير ${r.overflowY}px · فيض ${r.login.brandPanelOverflow}px`;
          } else if (pageKey === "student-card" && r.student) {
            extra = `أعمدة ${r.student.statsCols} · QR ${r.student.hasQr ? "✓" : "✗"}`;
          } else if (pageKey === "dashboard" && r.dashboard) {
            extra = `KPI ${r.dashboard.kpiCols} · رسوم ${r.dashboard.chartCardsWithCanvas}/6`;
          }
          md.push(
            `| ${r.id} (${r.width}×${r.height}) | ${r.theme} | ${r.overflowX}px | ${r.outsideCount} | ${r.smallCount} | ${r.primaryCount} | ${r.clippedCount} | ${r.coveredCount} | ${r.overlapCount} | ${r.contrastMin ?? "—"}:1 | ${extra} |`,
          );
        });
      md.push("");
    };

    table("login", "شاشة الدخول");
    table("student-card", "كارت الطالب العام");
    table("dashboard", "لوحة التحكم");

    md.push("## رسوم لوحة التحكم — تسميات المحاور والتفعيل", "");
    md.push(
      "| المقاس | الوضع | الرسم | عرض الحاوية | تكات X | تكات Y | أصغر خط | خارج الحاوية | تراكب تسميات | أعمدة/قطاعات |",
    );
    md.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
    runs
      .filter((r) => r.page === "dashboard" && r.dashboard)
      .forEach((r) => {
        r.dashboard.charts.forEach((chart) => {
          md.push(
            `| ${r.id} | ${r.theme} | ${chart.id} | ${chart.width}px | ${chart.xTicks} | ${chart.yTicks} | ${chart.minFont}px | ${chart.outside} | ${chart.overlap} | ${chart.bars + chart.sectors} |`,
          );
        });
      });
    md.push("");

    md.push("## سلوك الرسوم", "");
    md.push("```json");
    md.push(
      JSON.stringify(
        {
          monthChange: {
            changed: probes.dashboard?.monthChanged,
            hero: probes.dashboard?.heroTextAfter,
            summaryCalls: probes.dashboard?.monthCallsAll,
            month3Calls: probes.dashboard?.monthCalls,
          },
          tooltipClick: probes.dashboard?.tooltipClick,
          tooltipTap: probes.dashboard?.tooltipTap,
        },
        null,
        2,
      ),
    );
    md.push("```", "");

    md.push("## تكبير النص 200%", "");
    md.push("| الصفحة | المقاس | الوضع | تمرير أفقي | خارج الشاشة | نص مقطوع | تغطية | تراكب | نص <14 | لمس <44 |");
    md.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
    textZoom.forEach((r) => {
      md.push(
        `| ${r.page} | ${r.id} | ${r.theme} | ${r.overflowX}px | ${r.outsideCount} | ${r.clippedCount} | ${r.coveredCount} | ${r.overlapCount} | ${r.primaryCount} | ${r.smallCount} |`,
      );
    });
    md.push("");

    md.push("## تكبير الصفحة 200% (عرض CSS نصف العرض)", "");
    md.push("| الصفحة | المقاس الأصلي | عرض CSS | الوضع | تمرير أفقي | خارج الشاشة | نص مقطوع | تغطية | تراكب | نص <14 | لمس <44 |");
    md.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
    pageZoom.forEach((r) => {
      md.push(
        `| ${r.page} | ${r.id} | ${r.width}px | ${r.theme} | ${r.overflowX}px | ${r.outsideCount} | ${r.clippedCount} | ${r.coveredCount} | ${r.overlapCount} | ${r.primaryCount} | ${r.smallCount} |`,
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
      "`docs/design/shots/phase4/` — لقطة لكل صفحة/مقاس/وضع، ولقطات كاملة للوحة التحكم، ولقطتا tooltip (نقرة ولمسة)، ولقطات 200%.",
    );
    md.push("");

    if (failures.length) {
      md.push("## الإخفاقات", "");
      failures.forEach((f) => md.push(`- ${f}`));
    } else {
      md.push(
        "لا إخفاقات: الصفحات الثلاث سليمة في كل مقاس ووضع، بلا تمرير أفقي أو قطع أو تراكب، كل هدف لمس ≥44px، النص الأساسي ≥14px، الخطوط محلية، التباين AA، تسميات الرسوم ≥12px وداخل الحاويات، والـ tooltip يفتح بالنقرة واللمس، والتكبير 200% سليم.",
      );
    }
    if (notes.length) {
      md.push("", "## ملاحظات التشغيل", "");
      notes.forEach((n) => md.push(`- ${n}`));
    }
    await writeFile(join(OUT, "phase4-verify.md"), md.join("\n"));

    console.log(failures.length ? `FAIL (${failures.length})` : "ALL PASS");
    failures.slice(0, 80).forEach((f) => console.log(" - " + f));
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
          probes: probes.dashboard,
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

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
