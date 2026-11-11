/**
 * Phase 3 — batch 1 automated checks.
 *
 *   node phase3-batch1-verify.mjs
 *
 * Boots the real Vite app, intercepts the live API over CDP `Fetch` with
 * deterministic fixtures (no backend, no product code changed), then drives
 * headless Chrome at every required viewport in light and dark:
 *
 *   /definitely-missing   → route 404
 *   /attendance           → module locked (Teacher without `attendance`)
 *   /student/dashboard    → student portal disabled
 *   /parent/dashboard     → parent portal disabled
 *   /my-subscription      → access-blocked overlay (suspended/expired)
 *   /my-subscription      → subscription grace banner
 *   /my-subscription      → subscription expiry banner (<=14 days)
 *   /my-subscription      → impersonation banner
 *   (error probe)         → crash fallback rendered into a live root
 *
 * Checks: no page scroll, 44px targets, >=14px primary text, no clipped text,
 * no overlay covering a control, no sibling overlap, RTL, local fonts, WCAG AA,
 * the expected screen/banner is present with its action, and 200% text + page
 * zoom. Writes phase3/batch1-verify.json + .md and screenshots into
 * shots/phase3b1/.
 *
 * Narrow for a fast iteration:
 *   PHASE3B1_PAGES=module-locked PHASE3B1_VIEWPORTS=390 PHASE3B1_THEMES=dark
 */
import { spawn } from "node:child_process";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = join(HERE, "..", "..", "Frontend", "CenterManagement");
const OUT = join(HERE, "phase3");
const SHOTS = join(HERE, "shots", "phase3b1");
const PROFILE = join(process.env.TEMP || "/tmp", "opencode", "chrome-phase3b1-verify");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9468;
const APP_PORT = 5202;
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

const without = (...keys) => ALL_MODULES.filter((k) => !keys.includes(k));

const SCENARIOS = {
  "not-found": {
    role: "CenterOwner",
    centerAdmin: true,
    modules: ALL_MODULES,
    subscription: null,
    impersonating: false,
    email: "owner@example.com",
    centerType: "MultiTeacher",
  },
  "module-locked": {
    role: "Teacher",
    centerAdmin: false,
    modules: without("attendance"),
    subscription: null,
    impersonating: false,
    email: null,
    centerType: "MultiTeacher",
  },
  "student-gate": {
    role: "Student",
    centerAdmin: false,
    modules: without("student_portal", "parent_portal"),
    subscription: null,
    impersonating: false,
    email: null,
    centerType: "MultiTeacher",
  },
  "parent-gate": {
    role: "Parent",
    centerAdmin: false,
    modules: without("student_portal", "parent_portal"),
    subscription: null,
    impersonating: false,
    email: null,
    centerType: "MultiTeacher",
  },
  "access-blocked": {
    role: "CenterOwner",
    centerAdmin: true,
    modules: ALL_MODULES,
    subscription: null,
    impersonating: false,
    email: "owner@example.com",
    centerType: "MultiTeacher",
  },
  "subscription-grace": {
    role: "CenterOwner",
    centerAdmin: true,
    modules: ALL_MODULES,
    subscription: {
      type: "Monthly",
      state: "InGrace",
      startDate: "2026-10-01",
      endDate: "2026-10-31",
      daysLeftInGrace: 3,
    },
    impersonating: false,
    email: "owner@example.com",
    centerType: "MultiTeacher",
  },
  "subscription-expiring": {
    role: "CenterOwner",
    centerAdmin: true,
    modules: ALL_MODULES,
    subscription: {
      type: "Monthly",
      state: "Active",
      startDate: "2026-10-11",
      endDate: "2026-11-17",
      daysUntilEnd: 7,
    },
    impersonating: false,
    email: "owner@example.com",
    centerType: "MultiTeacher",
  },
  impersonation: {
    role: "CenterOwner",
    centerAdmin: true,
    modules: ALL_MODULES,
    subscription: null,
    impersonating: true,
    impersonatedBy: "SuperAdmin",
    email: null,
    centerType: "MultiTeacher",
    name: "أ. حسناء عبد الله",
  },
};

const PAGES = [
  {
    key: "not-found",
    path: "/definitely-missing",
    wait: '[data-testid="not-found"]',
    screen: "not-found",
    title: "الصفحة غير موجودة!",
    action: "not-found-home",
  },
  {
    key: "module-locked",
    path: "/attendance",
    wait: '[data-testid="module-locked"]',
    screen: "module-locked",
    title: "غير مشترك في هذه الوحدة",
    action: "module-locked-contact",
  },
  {
    key: "student-gate",
    path: "/student/dashboard",
    wait: '[data-testid="student-portal-unavailable"]',
    screen: "student-portal-unavailable",
    title: "بوابة الطالب غير متاحة لهذا المركز",
    action: "student-portal-logout",
  },
  {
    key: "parent-gate",
    path: "/parent/dashboard",
    wait: '[data-testid="parent-portal-unavailable"]',
    screen: "parent-portal-unavailable",
    title: "بوابة ولي الأمر غير متاحة لهذا المركز",
    action: "parent-portal-logout",
  },
  {
    key: "access-blocked",
    path: "/my-subscription",
    wait: ".app-shell",
    dispatch: true,
    ready: '[data-testid="access-blocked"]',
    screen: "access-blocked",
    title: "تم إيقاف الوصول",
    action: "access-blocked-logout",
    dialog: true,
    scopedAudit: true,
  },
  {
    key: "subscription-grace",
    path: "/my-subscription",
    wait: '[data-testid="subscription-banner"]',
    screen: null,
    banner: "grace",
    action: "subscription-renew",
  },
  {
    key: "subscription-expiring",
    path: "/my-subscription",
    wait: '[data-testid="subscription-banner"]',
    screen: null,
    banner: "expiring",
    action: "subscription-renew",
  },
  {
    key: "impersonation",
    path: "/my-subscription",
    wait: '[data-testid="impersonation-banner"]',
    screen: null,
    banner: "impersonation",
    action: "impersonation-stop",
  },
  {
    key: "app-error",
    path: "/my-subscription",
    wait: ".app-shell",
    probe: "error",
    ready: '[data-testid="app-error"]',
    screen: "app-error",
    title: "حدث خطأ غير متوقع",
    action: "error-reload",
  },
];

/* Optional narrowing for fast iterations. */
const list = (value, fallback) =>
  value ? value.split(",").map((v) => v.trim()).filter(Boolean) : fallback;
const RUN_PAGES = list(process.env.PHASE3B1_PAGES, PAGES.map((p) => p.key));
const RUN_VIEWPORTS = list(process.env.PHASE3B1_VIEWPORTS, VIEWPORTS.map((v) => v[0]));
const RUN_THEMES = list(process.env.PHASE3B1_THEMES, THEMES);
const pages = PAGES.filter((p) => RUN_PAGES.includes(p.key));
const viewports = VIEWPORTS.filter((v) => RUN_VIEWPORTS.includes(v[0]));
const themes = THEMES.filter((t) => RUN_THEMES.includes(t));

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
    [ROLE_CLAIM]: scenario.role,
    [ID_CLAIM]: "42",
    [NAME_CLAIM]: scenario.name ?? "مستخدم الفحص",
    PhoneNumber: "01000000000",
    is_center_admin: scenario.centerAdmin ? "true" : "false",
    pwd_change_required: "false",
    impersonation: scenario.impersonating ? "true" : "false",
  };
  if (scenario.impersonatedBy) payload.impersonated_by = scenario.impersonatedBy;
  return `${b64url(header)}.${b64url(payload)}.fixture`;
}

const ok = (data) => ({ succeeded: true, data });

const SUPER_ADMIN = {
  role: "SuperAdmin",
  centerAdmin: false,
  modules: [],
  subscription: null,
  impersonating: false,
  email: null,
  centerType: null,
  name: "مشرف المنصة",
};

let SCENARIO = SCENARIOS["not-found"];
const setScenario = (key) => {
  SCENARIO = SCENARIOS[key];
};

function fixtureFor(url) {
  const lower = url.toLowerCase();
  if (lower.includes("authentication/refresh-token")) {
    return {
      accessToken: makeJwt(SCENARIO),
      mustChangePassword: false,
      enabledModules: SCENARIO.modules,
      subscription: SCENARIO.subscription,
    };
  }
  if (lower.includes("profile/getmyprofile")) {
    return ok({
      centerType: SCENARIO.centerType,
      subject: SCENARIO.role === "Teacher" ? "الرياضيات" : null,
      email: SCENARIO.email,
      enabledModules: SCENARIO.modules,
      subscription: SCENARIO.subscription,
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
  if (lower.includes("impersonation/stop")) {
    // The operator token is restored by the stop call, then the banner sends
    // the SuperAdmin home (/admin → /centers).
    return {
      succeeded: true,
      data: { accessToken: makeJwt(SUPER_ADMIN) },
    };
  }
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

  const testid = (id) => document.querySelector('[data-testid="' + id + '"]');
  // The access overlay deliberately sits on top of the whole app, so audit
  // only the overlay subtree instead of reporting the page underneath as
  // "covered". The crash probe hides #root for the same reason.
  const ROOT = testid("access-blocked") || document;
  const qa = (sel) => ROOT.querySelectorAll(sel === "body *" ? "*" : sel);

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
  qa("body *").forEach((el) => {
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
  qa("body *").forEach((el) => {
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
    ...qa(
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
  qa("p, li, td, th, h1, h2, h3, h4, label, button, a[href], span, div")
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

  /* 9 - which locked/error screen is on stage ------------------------ */
  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height), left: Math.round(r.left), top: Math.round(r.top) };
  };

  const screenIds = [
    "not-found",
    "module-locked",
    "student-portal-unavailable",
    "parent-portal-unavailable",
    "access-blocked",
    "app-error",
  ];
  const screen = {};
  screenIds.forEach((id) => {
    const el = testid(id);
    if (!el) return;
    const card =
      el.querySelector(".state-card") ||
      el.querySelector('[role="alertdialog"]') ||
      el;
    const heading = el.querySelector("h1, h2");
    const actions = [...el.querySelectorAll("a[href], button")].filter(visible);
    screen[id] = {
      visible: visible(el),
      card: box(card),
      root: box(el),
      heading: (heading?.textContent || "").trim(),
      role: card.getAttribute("role") || null,
      ariaModal: card.getAttribute("aria-modal") || null,
      actions: actions.map((a) => ({
        tag: a.tagName.toLowerCase(),
        h: Math.round(a.getBoundingClientRect().height),
        w: Math.round(a.getBoundingClientRect().width),
        text: (a.textContent || "").trim().slice(0, 30),
        testid: a.getAttribute("data-testid"),
      })),
    };
  });

  const banner = (id) => {
    const el = testid(id);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      visible: visible(el),
      variant: el.getAttribute("data-variant"),
      box: box(el),
      withinViewport: r.left >= -1.5 && r.right <= vw + 1.5,
      text: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 160),
      actions: [...el.querySelectorAll("a[href], button")].filter(visible).map((a) => ({
        tag: a.tagName.toLowerCase(),
        h: Math.round(a.getBoundingClientRect().height),
        href: a.getAttribute("href") || null,
        testid: a.getAttribute("data-testid"),
      })),
    };
  };

  const pageHeading = (document.querySelector("h1")?.textContent || "").trim();
  const innerText = document.body.innerText || "";

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
    pageHeading,
    badText: (() => {
      const found = innerText.match(/(undefined|NaN|Infinity)/g);
      return found ? [...new Set(found)] : [];
    })(),
    screen,
    banners: {
      subscription: banner("subscription-banner"),
      impersonation: banner("impersonation-banner"),
      ownerEmail: banner("owner-email-warning"),
    },
  };
})()`;

/* Mount the real ErrorBoundary around a throwing child, using the modules the
   dev server already loaded, so the crash screen can be screenshotted without
   adding a product route. */
const ERROR_PROBE = String.raw`(async () => {
  try {
    const resources = performance.getEntriesByType("resource").map((e) => e.name);
    const reactUrl = resources.find((u) => /\/deps\/react\.js/.test(u));
    const domUrl = resources.find((u) => /\/deps\/react-dom_client\.js/.test(u));
    if (!reactUrl || !domUrl) {
      return { ok: false, reason: "react module URLs not found" };
    }
    const React = await import(reactUrl);
    const domModule = await import(domUrl);
    const ReactLib = React.default && React.default.createElement ? React.default : React;
    const createRoot = domModule.createRoot || domModule.default?.createRoot;
    if (typeof createRoot !== "function") {
      return {
        ok: false,
        reason: "createRoot missing (keys: " + Object.keys(domModule).join(",") + ")",
      };
    }
    const { default: ErrorBoundary } = await import(
      "/src/components/common/ErrorBoundary.jsx"
    );
    const host = document.getElementById("root");
    if (host) host.style.display = "none";
    const probe = document.createElement("div");
    probe.id = "error-probe";
    document.body.appendChild(probe);
    function Boom() {
      throw new Error("phase3 visual audit probe");
    }
    createRoot(probe).render(
      ReactLib.createElement(ErrorBoundary, null, ReactLib.createElement(Boom)),
    );
    for (let i = 0; i < 60; i += 1) {
      if (document.querySelector('[data-testid="app-error"]')) return { ok: true };
      await new Promise((r) => setTimeout(r, 50));
    }
    return { ok: false, reason: "app-error did not mount" };
  } catch (error) {
    return { ok: false, reason: String(error && error.message ? error.message : error) };
  }
})()`;

const ACCESS_EVENT = String.raw`(() => {
  window.dispatchEvent(
    new CustomEvent("access:blocked", {
      detail: { message: "انتهى اشتراك مركزك. تواصل مع إدارة المنصة للتجديد." },
    }),
  );
  return true;
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
    const targetLog = [];

    const onEvent = async (msg) => {
      if (msg.method === "Target.targetCreated" || msg.method === "Target.targetInfoChanged") {
        const info = msg.params?.targetInfo;
        if (info?.type === "page") {
          targetLog.push({ id: info.targetId, url: info.url });
        }
        return;
      }
      if (msg.method !== "Fetch.requestPaused") return;
      const { requestId, request } = msg.params;
      apiLog.push({ method: request.method, url: request.url, at: Date.now() });
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
    await client.send("Target.setDiscoverTargets", { discover: true }).catch(() => {});

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

    /* The overlay listens on window from a useEffect, so give React a beat to
       mount before dispatching; retry once if the first event is lost. */
    const dispatchAccessBlocked = async () => {
      await sleep(350);
      await evaluate(ACCESS_EVENT);
      if (await waitForSelector('[data-testid="access-blocked"]', 3000)) return true;
      await evaluate(ACCESS_EVENT);
      return waitForSelector('[data-testid="access-blocked"]', 3000);
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

    const prepare = async (page, theme) => {
      setScenario(page.key);
      await navigate(page.path, theme, { width: 390, height: 844 }, [page.wait]);
      if (page.dispatch) {
        await dispatchAccessBlocked();
      }
      if (page.probe === "error") {
        const result = await evaluate(ERROR_PROBE, true);
        if (!result?.ok) {
          return { ok: false, reason: result?.reason || "unknown" };
        }
      }
      if (page.ready) await waitForSelector(page.ready);
      await sleep(350);
      return { ok: true };
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

    const runs = [];
    const failures = [];
    const notes = [];

    /* ---------- main matrix ---------- */
    for (const page of pages) {
      for (const [id, width, height] of viewports) {
        for (const theme of themes) {
          setScenario(page.key);
          await navigate(page.path, theme, { width, height }, [page.wait]);
          if (page.dispatch) {
            await dispatchAccessBlocked();
          }
          let probe = { ok: true };
          if (page.probe === "error") {
            probe = await evaluate(ERROR_PROBE, true);
            if (probe?.ok) await waitForSelector(page.ready);
          }
          await sleep(400);

          const audit = await evaluate(AUDIT);
          const run = {
            page: page.key,
            id,
            width,
            height,
            theme,
            probeOk: probe?.ok ?? null,
            probeReason: probe?.reason ?? null,
            ...audit,
          };
          runs.push(run);

          await screenshot(`${page.key}-${id}-${theme}.png`);

          const tag = `${page.key} ${id} ${theme}`;
          if (probe && probe.ok === false)
            failures.push(`${tag}: crash probe failed (${probe.reason})`);
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
          if (audit.badText.length)
            failures.push(`${tag}: placeholder text (${audit.badText.join(", ")})`);

          if (page.screen) {
            const screen = audit.screen[page.screen];
            if (!screen || !screen.visible) {
              failures.push(`${tag}: ${page.screen} is not rendered`);
            } else {
              if (!screen.heading)
                failures.push(`${tag}: ${page.screen} has no heading`);
              if (page.title && !screen.heading.includes(page.title))
                failures.push(
                  `${tag}: heading "${screen.heading}" does not contain "${page.title}"`,
                );
              if (!screen.actions.length)
                failures.push(`${tag}: ${page.screen} has no action`);
              screen.actions.forEach((action) => {
                if (action.h < 44)
                  failures.push(
                    `${tag}: action "${action.text}" is ${action.h}px, expected >=44`,
                  );
              });
              if (!screen.actions.some((a) => a.testid === page.action))
                failures.push(`${tag}: expected action ${page.action} is missing`);
              if (screen.card && page.screen !== "access-blocked") {
                if (screen.card.w > 600)
                  failures.push(
                    `${tag}: state card is ${screen.card.w}px wide, expected <=600`,
                  );
                if (screen.card.left < -1 || screen.card.left + screen.card.w > width + 1)
                  failures.push(`${tag}: state card is clipped horizontally`);
              }
              if (page.dialog) {
                if (screen.role !== "alertdialog")
                  failures.push(`${tag}: overlay role is ${screen.role}, expected alertdialog`);
                if (screen.ariaModal !== "true")
                  failures.push(`${tag}: overlay is missing aria-modal=true`);
              }
            }
          }

          if (page.banner) {
            const bannerKey =
              page.banner === "impersonation" ? "impersonation" : "subscription";
            const banner = audit.banners[bannerKey];
            if (!banner || !banner.visible) {
              failures.push(`${tag}: ${page.banner} banner is not rendered`);
            } else {
              if (page.banner !== "impersonation" && banner.variant !== page.banner)
                failures.push(
                  `${tag}: banner variant ${banner.variant}, expected ${page.banner}`,
                );
              if (!banner.withinViewport)
                failures.push(`${tag}: ${page.banner} banner overflows the viewport`);
              if (!banner.actions.length)
                failures.push(`${tag}: ${page.banner} banner has no action`);
              banner.actions.forEach((action) => {
                if (action.h < 44)
                  failures.push(
                    `${tag}: banner action ${action.testid || action.tag} is ${action.h}px`,
                  );
                if (action.tag === "a" && !action.href)
                  failures.push(`${tag}: banner link has no href`);
              });
              if (!banner.actions.some((a) => a.testid === page.action))
                failures.push(`${tag}: banner action ${page.action} is missing`);
              if (audit.banners.ownerEmail)
                failures.push(`${tag}: owner email warning should stay hidden`);
            }
          }
        }
      }
    }

    /* ---------- behaviour probes (one viewport each) ---------- */
    const probes = {};

    {
      const page = pages.find((p) => p.key === "access-blocked");
      if (page) {
        const prep = await prepare(page, "light");
        probes.access = prep;
        notes.push(
          `access overlay probe: dialog=${await evaluate(
            `!!document.querySelector('[role="alertdialog"]')`,
          )}, logout=${await evaluate(
            `!!document.querySelector('[data-testid="access-blocked-logout"]')`,
          )}`,
        );
        if (!prep.ok)
          failures.push(`access overlay probe: ${prep.reason || "did not mount"}`);
      }
    }

    {
      const page = pages.find((p) => p.key === "impersonation");
      if (page) {
        await prepare(page, "light");
        await evaluate(
          `document.querySelector('[data-testid="impersonation-stop"]').click(); true`,
        );
        await sleep(900);
        const path = await evaluate("location.pathname");
        probes.impersonation = {
          path,
          returned: path === "/admin" || path === "/centers",
        };
        notes.push(`impersonation probe: stop navigates to ${path}`);
        if (!probes.impersonation.returned)
          failures.push(
            `impersonation probe: stop ended on ${path}, expected /admin or /centers`,
          );
      }
    }

    {
      const page = pages.find((p) => p.key === "subscription-grace");
      if (page) {
        await prepare(page, "light");
        const link = await evaluate(`(() => {
          const a = document.querySelector('[data-testid="subscription-renew"]');
          if (!a) return null;
          return { href: a.href, target: a.getAttribute("target"), rel: a.getAttribute("rel") };
        })()`);
        probes.renew = link;
        notes.push(
          `renew probe: href=${link?.href}, target=${link?.target} (popups are blocked in headless Chrome, so the tab itself is not asserted)`,
        );
        if (!link?.href || !/^https:\/\/wa\.me\//.test(link.href))
          failures.push("renew probe: renew href is not a WhatsApp link");
        if (link?.target !== "_blank")
          failures.push("renew probe: renew link does not open in a new tab");
      }
    }

    /* ---------- 200% text zoom ---------- */
    const textZoom = [];
    const zoomTargets = pages
      .filter((p) => p.key !== "app-error")
      .map((p) => [
        p.key,
        p.path,
        p.wait,
        p.key === "subscription-grace" || p.key === "impersonation"
          ? [["390", 390, 844], ["1440", 1440, 900]]
          : [["390", 390, 844]],
      ]);
    for (const [pageKey, path, wait, sizes] of zoomTargets) {
      const page = pages.find((p) => p.key === pageKey);
      for (const [id, width, height] of sizes) {
        for (const theme of themes) {
          setScenario(pageKey);
          await navigate(path, theme, { width, height }, [wait]);
          if (page.dispatch) {
            await dispatchAccessBlocked();
          }
          await sleep(400);
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
    for (const page of pages.filter((p) => p.key !== "app-error")) {
      for (const theme of themes) {
        const width = 1440;
        const height = 900;
        const zoomWidth = Math.round(width / 2);
        const zoomHeight = Math.round(height / 2);
        setScenario(page.key);
        await navigate(page.path, theme, { width: zoomWidth, height: zoomHeight, dsf: 2 }, [
          page.wait,
        ]);
        if (page.dispatch) {
          await dispatchAccessBlocked();
        }
        await sleep(450);
        const audit = await evaluate(AUDIT);
        pageZoom.push({
          page: page.key,
          id: "1440",
          width: zoomWidth,
          height: zoomHeight,
          theme,
          ...audit,
        });
        await screenshot(`${page.key}-1440-${theme}-zoom200.png`);

        const tag = `zoom200 ${page.key} ${theme}`;
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
        heading:
          Object.values(r.screen).find((s) => s && s.visible)?.heading ?? null,
        variant: r.banners.subscription?.variant ?? null,
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
      join(OUT, "batch1-verify.json"),
      JSON.stringify({ summary, runs, probes, textZoom, pageZoom }, null, 2),
    );

    /* ---------- markdown ---------- */
    const labels = Object.fromEntries(PAGES.map((p) => [p.key, p]));
    const md = [];
    md.push("# المرحلة 3 — دفعة 1: شاشات القفل والأخطاء والبانرات", "");
    md.push(`تم التوليد: ${summary.generated}`, "");
    md.push(
      `النتيجة: **${failures.length ? "FAIL" : "ALL PASS"}** — ${summary.runs} تشغيلًا: ` +
        `${runs.length} تشغيلًا أساسيًا (${viewports.length} مقاسًا × ${themes.length} وضع × ${pages.length} حالة)، ` +
        `${textZoom.length} تكبير نص 200%، ${pageZoom.length} تكبير صفحة 200%.`,
      "",
    );
    md.push(
      "الحالات: 404، وحدة مقفولة، بوابة طالب، بوابة ولي أمر، حجب وصول، بانر فترة سماح، بانر قرب الانتهاء، بانر انتحال، وشاشة الخطأ العامة.",
      "",
    );

    const table = (pageKey) => {
      const page = labels[pageKey];
      md.push(`## ${pageKey} — ${page.title}`, "");
      md.push(
        "| المقاس | الوضع | تمرير أفقي | خارج الشاشة | أهداف <44 | نص <14 | نص مقطوع | تغطية | تراكب | أقل تباين | ملاحظة |",
      );
      md.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
      runs
        .filter((r) => r.page === pageKey)
        .forEach((r) => {
          const screen = Object.values(r.screen).find((s) => s && s.visible);
          let extra = "—";
          if (screen) {
            const minAction = screen.actions.length
              ? Math.min(...screen.actions.map((a) => a.h))
              : null;
            extra = `«${screen.heading}» · أزرار ${screen.actions.length}${
              minAction !== null ? ` (أصغر ${minAction}px)` : ""
            } · كارت ${screen.card?.w ?? "?"}px`;
          } else if (r.banners.subscription) {
            extra = `بانر ${r.banners.subscription.variant} · ${r.banners.subscription.text.slice(0, 46)}…`;
          } else if (r.banners.impersonation) {
            extra = `بانر انتحال · ${r.banners.impersonation.text.slice(0, 46)}…`;
          }
          md.push(
            `| ${r.id} (${r.width}×${r.height}) | ${r.theme} | ${r.overflowX}px | ${r.outsideCount} | ${r.smallCount} | ${r.primaryCount} | ${r.clippedCount} | ${r.coveredCount} | ${r.overlapCount} | ${r.contrastMin ?? "—"}:1 | ${extra} |`,
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
    md.push("| الحالة | المقاس | الوضع | تمرير أفقي | خارج الشاشة | نص مقطوع | تغطية | تراكب | نص <14 | لمس <44 |");
    md.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
    textZoom.forEach((r) => {
      md.push(
        `| ${r.page} | ${r.id} | ${r.theme} | ${r.overflowX}px | ${r.outsideCount} | ${r.clippedCount} | ${r.coveredCount} | ${r.overlapCount} | ${r.primaryCount} | ${r.smallCount} |`,
      );
    });
    md.push("");

    md.push("## تكبير الصفحة 200% (عرض CSS نصف العرض)", "");
    md.push("| الحالة | عرض CSS | الوضع | تمرير أفقي | خارج الشاشة | نص مقطوع | تغطية | تراكب | نص <14 | لمس <44 |");
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
      "`docs/design/shots/phase3b1/` — لقطة لكل حالة/مقاس/وضع، ولقطات تكبير النص والصفحة 200%.",
    );
    md.push("");

    if (failures.length) {
      md.push("## الإخفاقات", "");
      failures.forEach((f) => md.push(`- ${f}`));
    } else {
      md.push(
        "لا إخفاقات: كل الشاشات والبانرات سليمة في كل مقاس ووضع، بلا تمرير أفقي أو قطع أو تراكب، كل هدف لمس ≥44px، النص الأساسي ≥14px، الخطوط محلية، التباين AA، والتكبير 200% سليم.",
      );
    }
    if (notes.length) {
      md.push("", "## ملاحظات التشغيل", "");
      notes.forEach((n) => md.push(`- ${n}`));
    }
    await writeFile(join(OUT, "batch1-verify.md"), md.join("\n"));

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

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
