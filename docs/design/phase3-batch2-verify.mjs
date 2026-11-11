/**
 * Phase 3 — batch 2 (students) automated checks.
 *
 *   node phase3-batch2-verify.mjs
 *
 * Boots the real Vite app, intercepts the live API over CDP `Fetch` with
 * deterministic fixtures that mirror the ASP.NET `Response<T>` envelopes, then
 * drives headless Chrome at every required viewport in light and dark:
 *
 *   /dashboard   -> owner list (table on desktop, cards on phones)
 *   /dashboard   -> empty centre
 *   /dashboard   -> search with no matches
 *   /dashboard   -> skeleton while the list request is in flight
 *   /dashboard   -> filters panel expanded
 *   /dashboard   -> add/edit dialog (fixed footer on short screens)
 *   /dashboard   -> read-only student card
 *
 * Checks: no page scroll, 44px targets, >=14px primary text, no clipped text,
 * no overlay covering a control, no overlapping cards, RTL, local fonts, WCAG
 * AA, the expected state is on stage, F-016 columns line up, and 200% text +
 * page zoom. Writes phase3/batch2-verify.json + .md and screenshots into
 * shots/phase3b2/.
 *
 * Narrow for a fast iteration:
 *   PHASE3B2_PAGES=students-list PHASE3B2_VIEWPORTS=390 PHASE3B2_THEMES=dark
 */
import { spawn } from "node:child_process";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = join(HERE, "..", "..", "Frontend", "CenterManagement");
const OUT = join(HERE, "phase3");
const SHOTS = join(HERE, "shots", "phase3b2");
const PROFILE = join(process.env.TEMP || "/tmp", "opencode", "chrome-phase3b2-verify");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9469;
const APP_PORT = 5203;
const BASE = `http://127.0.0.1:${APP_PORT}`;
const ORIGIN = BASE;

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
  isActive: index % 4 !== 3,
  isPaid: index % 3 === 0,
  subscriptionType: index % 2 === 0 ? 2 : 1,
  customMonthlyPrice: index % 5 === 0 ? 250 : null,
  createdAt: `2026-10-${String((index % 28) + 1).padStart(2, "0")}T10:00:00Z`,
}));

const SCENARIOS = {
  list: { data: "list", role: "Teacher", centerAdmin: false, centerType: "MultiTeacher" },
  solo: { data: "list", role: "Teacher", centerAdmin: false, centerType: "SoloTeacher" },
  assistant: { data: "list", role: "Assistant", centerAdmin: false, centerType: "MultiTeacher" },
  empty: { data: "empty", role: "Teacher", centerAdmin: false, centerType: "MultiTeacher" },
  noresults: {
    data: "list",
    emptyOnSearch: true,
    role: "Teacher",
    centerAdmin: false,
    centerType: "MultiTeacher",
  },
  loading: {
    data: "list",
    slowList: true,
    role: "Teacher",
    centerAdmin: false,
    centerType: "MultiTeacher",
  },
};

const PAGES = [
  {
    key: "students-list",
    path: "/dashboard",
    wait: '[data-testid="students-page"]',
    scenario: "list",
    scope: "students-page",
    viewports: ["360", "390", "768", "1280", "1920", "land-844"],
    expect: "list",
    full: true,
  },
  {
    key: "students-solo",
    path: "/dashboard",
    wait: '[data-testid="students-page"]',
    scenario: "solo",
    scope: "students-page",
    viewports: ["390", "1280"],
    expect: "list",
    full: true,
  },
  {
    key: "students-assistant",
    path: "/dashboard",
    wait: '[data-testid="students-page"]',
    scenario: "assistant",
    scope: "students-page",
    viewports: ["390", "1280"],
    expect: "list",
    full: true,
  },
  {
    key: "students-empty",
    path: "/dashboard",
    wait: '[data-testid="students-empty"]',
    scenario: "empty",
    scope: "students-page",
    viewports: ["360", "390", "768", "1280", "1920"],
    expect: "empty",
    full: true,
  },
  {
    key: "students-no-results",
    path: "/dashboard",
    wait: '[data-testid="students-table"]',
    scenario: "noresults",
    action: "search",
    expectWait: '[data-testid="students-empty"]',
    scope: "students-page",
    viewports: ["390", "1280"],
    expect: "no-results",
    full: true,
  },
  {
    key: "students-loading",
    path: "/dashboard",
    wait: '[data-testid="students-loading"]',
    scenario: "loading",
    scope: "students-page",
    viewports: ["390", "1280"],
    expect: "loading",
    full: true,
  },
  {
    key: "students-filters",
    path: "/dashboard",
    wait: '[data-testid="students-table"]',
    scenario: "list",
    action: "filters",
    expectWait: '[data-testid="students-filters-panel"]',
    scope: "students-page",
    viewports: ["390", "1280"],
    expect: "filters",
    full: true,
  },
  {
    key: "students-add-modal",
    path: "/dashboard",
    wait: '[data-testid="students-table"]',
    scenario: "list",
    action: "add",
    expectWait: '[data-testid="student-form-modal"]',
    scope: "student-form-modal",
    viewports: ["360", "390", "768", "1280", "1920", "land-844"],
    expect: "add-modal",
    full: false,
  },
  {
    key: "students-view-modal",
    path: "/dashboard",
    wait: '[data-testid="students-table"]',
    scenario: "list",
    action: "view",
    expectWait: '[data-testid="student-view-modal"]',
    scope: "student-view-modal",
    viewports: ["390", "1280"],
    expect: "view-modal",
    full: false,
  },
];

/* Optional narrowing for fast iterations. */
const list = (value, fallback) =>
  value ? value.split(",").map((v) => v.trim()).filter(Boolean) : fallback;
const RUN_PAGES = list(process.env.PHASE3B2_PAGES, PAGES.map((p) => p.key));
const RUN_VIEWPORTS = list(process.env.PHASE3B2_VIEWPORTS, VIEWPORTS.map((v) => v[0]));
const RUN_THEMES = list(process.env.PHASE3B2_THEMES, THEMES);
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

let SCENARIO = SCENARIOS.list;
const setScenario = (key) => {
  SCENARIO = SCENARIOS[key] || SCENARIOS.list;
};

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
  if (lower.includes("/student/paginated")) {
    if (SCENARIO.slowList) return { __delay: 8000, payload: EMPTY_PAGE };
    const search = new URL(url).searchParams.get("search");
    if (SCENARIO.emptyOnSearch && search) return EMPTY_PAGE;
    if (SCENARIO.data === "empty") return EMPTY_PAGE;
    return paginated(STUDENTS, 12);
  }
  if (lower.includes("/student/stats")) {
    return ok({
      totalStudents: 12,
      activeStudents: 9,
      inactiveStudents: 3,
      newStudentsThisMonth: 2,
    });
  }
  if (lower.includes("/group/get-all")) return ok(GROUPS);
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
      byRect: [Math.round(tr.left), Math.round(tr.top), Math.round(tr.width), Math.round(tr.height)],
      elRect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
    });
  });

  /* 6 - sibling cards/sections must not overlap ----------------------- */
  const blocks = [
    ...qa(
      '[data-testid^="section-"], [data-testid^="chart-"], .card-grid > *, [data-testid="student-card-stats"] > *, [data-testid="students-cards"] article',
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

  /* 9 - students page state ------------------------------------------ */
  const table = testid("students-table");
  const cards = testid("students-cards");
  const pagination = testid("students-pagination");
  const loadingBox = testid("students-loading");
  const emptyBox = testid("students-empty");
  const filtersPanel = testid("students-filters-panel");
  const formModal = testid("student-form-modal");
  const viewModal = testid("student-view-modal");
  const modal = formModal || viewModal;
  const modalBody = formModal?.querySelector('[data-testid="student-form-modal-body"]');
  const modalFooter = formModal?.querySelector('[data-testid="student-form-modal-footer"]');
  const modalSubmit = formModal?.querySelector('[data-testid="student-form-submit"]');

  const headings = table ? [...table.querySelectorAll("thead th")] : [];
  const firstRow = table ? table.querySelector("tbody tr") : null;

  const students = {
    page: Boolean(testid("students-page")),
    tableVisible: table ? visible(table) : false,
    tableHeadings: headings.length,
    tableFirstRowCells: firstRow ? firstRow.querySelectorAll("td").length : 0,
    cardsVisible: cards ? visible(cards) : false,
    cardCount: cards ? cards.querySelectorAll("article").length : 0,
    paginationVisible: pagination ? visible(pagination) : false,
    loadingVisible: loadingBox ? visible(loadingBox) : false,
    loadingText: loadingBox ? loadingBox.textContent.replace(/\s+/g, " ").trim().slice(0, 80) : null,
    emptyVisible: emptyBox ? visible(emptyBox) : false,
    emptyText: emptyBox ? emptyBox.textContent.replace(/\s+/g, " ").trim().slice(0, 120) : null,
    filtersOpen: filtersPanel ? visible(filtersPanel) : false,
    modal: modal
      ? {
          testid: modal.getAttribute("data-testid"),
          role: modal.getAttribute("role"),
          ariaModal: modal.getAttribute("aria-modal"),
          box: box(modal),
          inViewport:
            modal.getBoundingClientRect().top >= -1 &&
            modal.getBoundingClientRect().bottom <= vh + 1,
          bodyScrollable: modalBody
            ? /auto|scroll/.test(getComputedStyle(modalBody).overflowY) ||
              modalBody.scrollHeight > modalBody.clientHeight
            : null,
          footer: box(modalFooter),
          text: (modal.textContent || "").replace(/\s+/g, " ").trim().slice(0, 220),
          submit: modalSubmit
            ? {
                ...box(modalSubmit),
                inViewport:
                  modalSubmit.getBoundingClientRect().top >= -1 &&
                  modalSubmit.getBoundingClientRect().bottom <= vh + 1,
                insideFooter: modalFooter ? modalFooter.contains(modalSubmit) : null,
              }
            : null,
        }
      : null,
    text: (testid("students-page")?.textContent || "").replace(/\s+/g, " ").trim().slice(0, 160),
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
    students,
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

    const typeSearch = async (value) => {
      await evaluate(`(() => {
        const el = document.querySelector('[data-testid="students-search"]');
        if (!el) return false;
        const setter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          "value",
        ).set;
        setter.call(el, ${JSON.stringify(value)});
        el.dispatchEvent(new Event("input", { bubbles: true }));
        return true;
      })()`);
    };

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

    const openViewMenuItem = async () => {
      await waitForSelector('[role="menuitem"]', 4000);
      const clicked = await evaluate(`(() => {
        const item = [...document.querySelectorAll('[role="menuitem"]')]
          .find((node) => node.textContent.includes("عرض الطالب"));
        if (!item) return false;
        item.click();
        return true;
      })()`);
      if (!clicked) throw new Error("view menu item not found");
    };

    const applyAction = async (page) => {
      if (!page.action) return;
      if (page.action === "search") {
        await waitForSelector('[data-testid="students-search"]');
        await typeSearch("zzz");
      } else if (page.action === "filters") {
        await clickSelector('[data-testid="students-filters-toggle"]');
      } else if (page.action === "add") {
        await clickSelector('[data-testid="students-add"]');
      } else if (page.action === "view") {
        await clickVisibleRowAction();
        await openViewMenuItem();
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

          const s = run.students;
          if (!s.page && page.scope === "students-page") {
            failures.push(`${tag}: students page root is missing`);
          }
          if (page.expect === "list") {
            const desktop = run.width >= 768;
            if (s.tableHeadings !== 8)
              failures.push(`${tag}: table has ${s.tableHeadings} headings, expected 8`);
            if (s.tableFirstRowCells !== 8)
              failures.push(
                `${tag}: F-016 — first row has ${s.tableFirstRowCells} cells, expected 8`,
              );
            if (desktop && !s.tableVisible)
              failures.push(`${tag}: table should be visible on desktop`);
            if (!desktop && s.tableVisible)
              failures.push(`${tag}: table should be hidden on phones`);
            if (!desktop && !s.cardsVisible)
              failures.push(`${tag}: cards should be visible on phones`);
            if (!desktop && s.cardCount !== 10)
              failures.push(`${tag}: ${s.cardCount} cards, expected 10`);
            if (!s.paginationVisible)
              failures.push(`${tag}: pagination is not visible`);
            if (run.overflowY < 1) notes.push(`${tag}: page fits without vertical scroll`);
          }
          if (page.expect === "empty") {
            if (!s.emptyVisible) failures.push(`${tag}: empty state is not visible`);
            if (!(s.emptyText || "").includes("لا يوجد طلاب"))
              failures.push(`${tag}: empty state copy is unexpected (${s.emptyText})`);
            if (s.tableVisible || s.cardsVisible)
              failures.push(`${tag}: list should not render without students`);
          }
          if (page.expect === "no-results") {
            if (!s.emptyVisible) failures.push(`${tag}: no-results state is not visible`);
            if (!(s.emptyText || "").includes("لا توجد نتائج مطابقة"))
              failures.push(`${tag}: no-results copy is unexpected (${s.emptyText})`);
            if (!(s.emptyText || "").includes("مسح الفلاتر"))
              failures.push(`${tag}: no-results state is missing the clear-filters action`);
          }
          if (page.expect === "loading") {
            if (!s.loadingVisible) failures.push(`${tag}: loading skeleton is not visible`);
            if (!(s.loadingText || "").includes("جاري تحميل الطلاب"))
              failures.push(`${tag}: loading copy is unexpected (${s.loadingText})`);
          }
          if (page.expect === "filters") {
            if (!s.filtersOpen) failures.push(`${tag}: filters panel did not open`);
            const selects = await evaluate(
              `document.querySelectorAll('[data-testid="students-filters-panel"] select').length`,
            );
            if (selects !== 2)
              failures.push(`${tag}: filters panel has ${selects} selects, expected 2`);
          }
          if (page.expect === "add-modal") {
            const m = s.modal;
            if (!m || m.testid !== "student-form-modal")
              failures.push(`${tag}: add dialog is not on stage`);
            else {
              if (m.role !== "dialog") failures.push(`${tag}: dialog role is ${m.role}`);
              if (m.ariaModal !== "true")
                failures.push(`${tag}: dialog is missing aria-modal=true`);
              if (!m.inViewport) failures.push(`${tag}: dialog overflows the viewport`);
              if (!m.bodyScrollable)
                failures.push(`${tag}: dialog body is not scrollable`);
              if (!m.submit)
                failures.push(`${tag}: primary submit button is missing`);
              else {
                if (!m.submit.insideFooter)
                  failures.push(`${tag}: submit button is outside the fixed footer`);
                if (!m.submit.inViewport)
                  failures.push(`${tag}: submit button is outside the viewport`);
                if (m.submit.h < 44)
                  failures.push(`${tag}: submit button is ${m.submit.h}px, expected >=44`);
              }
              if (!m.footer) failures.push(`${tag}: dialog footer is missing`);
              else if (m.footer.bottom > run.height + 1)
                failures.push(`${tag}: dialog footer is below the viewport`);
            }
          }
          if (page.expect === "view-modal") {
            const m = s.modal;
            if (!m || m.testid !== "student-view-modal")
              failures.push(`${tag}: view dialog is not on stage`);
            else {
              if (m.role !== "dialog") failures.push(`${tag}: dialog role is ${m.role}`);
              if (!m.inViewport) failures.push(`${tag}: dialog overflows the viewport`);
              if (!(m.text || "").includes("بيانات الطالب"))
                failures.push(`${tag}: view dialog is missing its heading`);
            }
          }
        }
      }
    }

    /* ---------- behaviour probes ---------- */
    const probes = {};
    const lastPaginated = () =>
      [...apiLog].reverse().find((c) => /\/student\/paginated/i.test(c.url));
    const query = (url, key) => new URL(url).searchParams.get(key);

    const prepareProbe = async (pageKey, scenario, action, width = 390, height = 844) => {
      const page = PAGES.find((p) => p.key === pageKey);
      setScenario(scenario);
      await navigate(page.path, "light", { width, height }, [page.wait]);
      await applyAction({ ...page, action });
      await sleep(350);
      return page;
    };

    {
      await prepareProbe("students-list", "list");
      const before = lastPaginated();
      const pageTwo = await evaluate(`(() => {
        const buttons = [...document.querySelectorAll('[data-testid="students-pagination"] button')];
        const two = buttons.find((b) => b.textContent.trim() === "2");
        if (!two) return false;
        two.click();
        return true;
      })()`);
      await sleep(900);
      const after = lastPaginated();
      probes.pagination = {
        clickedPageTwo: pageTwo,
        before: before ? query(before.url, "pageIndex") : null,
        after: after ? query(after.url, "pageIndex") : null,
      };
      if (!pageTwo || probes.pagination.after !== "2")
        failures.push(
          `pagination probe: expected pageIndex=2 after clicking page 2, got ${probes.pagination.after}`,
        );
      notes.push(`pagination probe: pageIndex ${probes.pagination.before} -> ${probes.pagination.after}`);
    }

    {
      await prepareProbe("students-list", "list");
      await typeSearch("أحمد");
      await sleep(1400);
      const call = lastPaginated();
      probes.search = { search: call ? query(call.url, "search") : null };
      if (probes.search.search !== "أحمد")
        failures.push(`search probe: expected search=أحمد, got ${probes.search.search}`);
      notes.push(`search probe: debounced request carries search=${probes.search.search}`);
    }

    {
      await prepareProbe("students-list", "list", "filters");
      await evaluate(`(() => {
        const panel = document.querySelector('[data-testid="students-filters-panel"]');
        const group = panel.querySelector('select[aria-label="تصفية حسب المجموعة"]');
        const status = panel.querySelector('select[aria-label="تصفية حسب الحالة"]');
        const setValue = (el, value) => {
          const setter = Object.getOwnPropertyDescriptor(
            window.HTMLSelectElement.prototype,
            "value",
          ).set;
          setter.call(el, value);
          el.dispatchEvent(new Event("change", { bubbles: true }));
        };
        setValue(group, "g2");
        setValue(status, "false");
        return true;
      })()`);
      await sleep(900);
      const call = lastPaginated();
      const badge = await evaluate(
        `document.querySelector('[data-testid="students-filters-toggle"]').textContent`,
      );
      probes.filters = {
        groupId: call ? query(call.url, "groupId") : null,
        isActive: call ? query(call.url, "isActive") : null,
        badge: (badge || "").replace(/\s+/g, " ").trim(),
      };
      if (probes.filters.groupId !== "g2")
        failures.push(`filters probe: groupId=${probes.filters.groupId}, expected g2`);
      if (probes.filters.isActive !== "false")
        failures.push(`filters probe: isActive=${probes.filters.isActive}, expected false`);
      if (!probes.filters.badge.includes("2"))
        failures.push(`filters probe: badge does not count 2 filters (${probes.filters.badge})`);
      notes.push(`filters probe: ${JSON.stringify(probes.filters)}`);
    }

    {
      await prepareProbe("students-list", "noresults");
      await typeSearch("zzz");
      await sleep(1400);
      const beforeText = await evaluate(
        `(document.querySelector('[data-testid="students-empty"]')?.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 80)`,
      );
      await clickSelector('[data-testid="students-empty"] button');
      await sleep(1200);
      const call = lastPaginated();
      const restored = await evaluate(
        `!!document.querySelector('[data-testid="students-table"]') && !document.querySelector('[data-testid="students-empty"]')`,
      );
      probes.clearFilters = {
        search: call ? query(call.url, "search") : null,
        beforeText,
        restored,
      };
      if (!beforeText.includes("لا توجد نتائج مطابقة"))
        failures.push("clear-filters probe: the no-results copy was not on stage");
      if (probes.clearFilters.search)
        failures.push("clear-filters probe: search was not cleared");
      if (!restored) failures.push("clear-filters probe: the full list did not come back");
      notes.push("clear-filters probe: empty state returns to the full list");
    }

    {
      await prepareProbe("students-list", "list", "add", 360, 640);
      const beforeSubmit = await evaluate(`(() => {
        const submit = document.querySelector('[data-testid="student-form-submit"]');
        const footer = document.querySelector('[data-testid="student-form-modal-footer"]');
        const body = document.querySelector('[data-testid="student-form-modal-body"]');
        if (!submit || !footer || !body) return null;
        const sr = submit.getBoundingClientRect();
        return {
          submitTop: Math.round(sr.top),
          submitBottom: Math.round(sr.bottom),
          viewport: window.innerHeight,
          bodyScrolls: body.scrollHeight > body.clientHeight,
          bodyOverflow: getComputedStyle(body).overflowY,
        };
      })()`);
      await clickSelector('[data-testid="student-form-submit"]');
      await sleep(350);
      const validation = await evaluate(`(() => {
        const modal = document.querySelector('[data-testid="student-form-modal"]');
        return modal ? modal.textContent.replace(/\\s+/g, " ").trim() : "";
      })()`);
      const posts = apiLog.filter(
        (c) => c.method === "POST" && /\/student\/create/i.test(c.url),
      ).length;
      probes.addValidation = { beforeSubmit, validation, posts };
      if (!beforeSubmit?.bodyScrolls)
        failures.push("add dialog probe: the body does not scroll at 360x640");
      if (beforeSubmit && beforeSubmit.submitBottom > beforeSubmit.viewport + 1)
        failures.push("add dialog probe: the submit button is below the fold at 360x640");
      if (!validation.includes("اسم الطالب مطلوب"))
        failures.push("add dialog probe: empty submit did not show the name error");
      if (!validation.includes("اختر المجموعة"))
        failures.push("add dialog probe: empty submit did not show the group error");
      if (posts !== 0) failures.push("add dialog probe: an empty form reached the API");
      notes.push(
        `add dialog probe @360x640: submit bottom ${beforeSubmit?.submitBottom}px of ${beforeSubmit?.viewport}px, body scrolls=${beforeSubmit?.bodyScrolls}`,
      );
    }

    {
      await prepareProbe("students-list", "list", "add", 390, 844);
      await evaluate(`(() => {
        const setValue = (id, value) => {
          const el = document.getElementById(id);
          const proto = el.tagName === "SELECT"
            ? window.HTMLSelectElement.prototype
            : window.HTMLInputElement.prototype;
          Object.getOwnPropertyDescriptor(proto, "value").set.call(el, value);
          el.dispatchEvent(new Event(el.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
        };
        setValue("student-fullName", "سارة محمد");
        setValue("student-phone", "01099998888");
        setValue("student-parent-phone", "01199998888");
        setValue("student-group", "g1");
        return true;
      })()`);
      await sleep(250);
      await clickSelector('[data-testid="student-form-submit"]');
      await sleep(1400);
      const create = [...apiLog].reverse().find(
        (c) => c.method === "POST" && /\/student\/create/i.test(c.url),
      );
      const stillOpen = await evaluate(
        `!!document.querySelector('[data-testid="student-form-modal"]')`,
      );
      probes.addSubmit = { posted: Boolean(create), stillOpen };
      if (!create) failures.push("add submit probe: no POST /Student/Create was sent");
      if (stillOpen) failures.push("add submit probe: dialog stayed open after a successful save");
      notes.push(
        `add submit probe: POST ${create ? create.url.replace(BASE, "") : "missing"}, dialog closed=${!stillOpen}`,
      );
    }

    {
      await prepareProbe("students-list", "list", "view", 390, 844);
      const view = await evaluate(`(() => {
        const modal = document.querySelector('[data-testid="student-view-modal"]');
        return modal ? modal.textContent.replace(/\\s+/g, " ").trim().slice(0, 200) : "";
      })()`);
      await clickSelector('[data-testid="student-view-close"]');
      await sleep(250);
      const closed = await evaluate(
        `!document.querySelector('[data-testid="student-view-modal"]')`,
      );
      const firstPhone = STUDENTS[0].phone;
      probes.view = {
        hasName: view.includes(STUDENTS[0].fullName),
        hasPhone: view.includes(firstPhone),
        closed,
        text: view,
      };
      if (!probes.view.hasName) failures.push("view probe: the selected student's name is missing");
      if (!probes.view.hasPhone)
        failures.push(`view probe: the selected student's phone (${firstPhone}) is missing`);
      if (!probes.view.closed) failures.push("view probe: the card did not close");
      notes.push(`view probe: name=${probes.view.hasName}, phone=${probes.view.hasPhone}, closed=${closed}`);
    }

    {
      await prepareProbe("students-list", "list", "add", 390, 844);
      await evaluate(
        `document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); true`,
      );
      await sleep(250);
      const escaped = await evaluate(
        `!document.querySelector('[data-testid="student-form-modal"]')`,
      );
      probes.escape = { closed: escaped };
      if (!escaped) failures.push("escape probe: Escape did not close the dialog");
    }

    {
      const f016 = await evaluate(`(() => {
        const table = document.querySelector('[data-testid="students-table"]');
        return table
          ? {
              headings: table.querySelectorAll("thead th").length,
              cells: table.querySelector("tbody tr")?.querySelectorAll("td").length ?? 0,
            }
          : null;
      })()`);
      probes.f016 = f016;
      notes.push(`F-016 probe: ${f016?.headings} headings / ${f016?.cells} cells`);
    }

    /* ---------- 200% text zoom ---------- */
    const textZoom = [];
    const textTargets = [
      ["students-list", "list", null],
      ["students-add-modal", "list", "add"],
    ];
    for (const [pageKey, scenario, action] of textTargets) {
      const page = PAGES.find((p) => p.key === pageKey);
      const sizes =
        pageKey === "students-list"
          ? [["390", 390, 844], ["1440", 1440, 900]]
          : [["390", 390, 844]];
      for (const [id, width, height] of sizes) {
        for (const theme of THEMES.filter((t) => RUN_THEMES.includes(t))) {
          setScenario(scenario);
          await navigate(page.path, theme, { width, height }, [page.wait]);
          await applyAction({ ...page, action });
          await sleep(350);
          await evaluate('document.documentElement.style.fontSize = "200%"; true');
          await sleep(650);
          const result = await audit(page.scope);
          textZoom.push({ page: pageKey, id, width, height, theme, ...result });
          await screenshot(`${pageKey}-${id}-${theme}-text200.png`);

          const tag = `text200 ${pageKey} ${id} ${theme}`;
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
          if (pageKey === "students-add-modal" && result.students.modal) {
            if (!result.students.modal.submit?.inViewport)
              failures.push(`${tag}: primary submit is outside the viewport at 200% text`);
          }
        }
      }
    }

    /* ---------- 200% page zoom ---------- */
    const pageZoom = [];
    for (const theme of THEMES.filter((t) => RUN_THEMES.includes(t))) {
      const page = PAGES.find((p) => p.key === "students-list");
      const width = 1440;
      const height = 900;
      const zoomWidth = Math.round(width / 2);
      const zoomHeight = Math.round(height / 2);
      setScenario("list");
      await navigate(page.path, theme, { width: zoomWidth, height: zoomHeight, dsf: 2 }, [
        page.wait,
      ]);
      await sleep(450);
      const result = await audit(page.scope);
      pageZoom.push({ page: page.key, id: "1440", width: zoomWidth, height: zoomHeight, theme, ...result });
      await screenshot(`${page.key}-1440-${theme}-zoom200.png`);

      const tag = `zoom200 ${page.key} ${theme}`;
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
        state: stateLabel(r.students),
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
      join(OUT, "batch2-verify.json"),
      JSON.stringify({ summary, runs, probes, textZoom, pageZoom }, null, 2),
    );

    /* ---------- markdown ---------- */
    const labels = Object.fromEntries(PAGES.map((p) => [p.key, p]));
    const md = [];
    md.push("# المرحلة 3 — دفعة 2: صفحة الطلاب (أ + ب)", "");
    md.push(`تم التوليد: ${summary.generated}`, "");
    md.push(
      `النتيجة: **${failures.length ? "FAIL" : "ALL PASS"}** — ${summary.runs} تشغيلًا: ` +
        `${runs.length} تشغيلًا أساسيًا، ${textZoom.length} تكبير نص 200%، ${pageZoom.length} تكبير صفحة 200%.`,
      "",
    );
    md.push(
      "الحالات: القائمة (جدول على الديسكتوب وكروت على الموبايل)، الفراغ، بحث بلا نتائج، التحميل، لوحة الفلاتر مفتوحة، نافذة الإضافة/التعديل، وبطاقة الطالب.",
      "",
    );
    md.push(
      "الأدوار: `/dashboard` محمي في `App.jsx` لـTeacher وAssistant فقط؛ لذلك تُفحص الصفحة كـTeacher (مركز متعدد المدرسين)، وTeacher في مركز فردي (SoloTeacher)، وAssistant. المالك الحقيقي (CenterOwner) لا يصل إلى هذا المسار — `CenterLanding` يوجّهه إلى `/teachers` — فصلاحيته على صفحة الطلاب تُغطَّى بمسار SoloTeacher المكافئ.",
      "",
    );
    md.push(
      "النصوص الجديدة: «الفلاتر»، «كل الحالات»، «لا توجد نتائج مطابقة»، «امسح البحث أو الفلاتر لعرض كل الطلاب.»، «مسح الفلاتر»، ووصف aria «ترقيم الصفحات»، «الصفحة السابقة/التالية»، «إغلاق القائمة». النص المتغيّر الوحيد: الترقيم كان «عرض X إلى Y من أصل Z» وأصبح «عرض X إلى Y من Z».",
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
            `| ${r.id} (${r.width}×${r.height}) | ${r.theme} | ${r.overflowX}px | ${r.outsideCount} | ${r.smallCount} | ${r.primaryCount} | ${r.clippedCount} | ${r.coveredCount} | ${r.overlapCount} | ${r.contrastMin ?? "—"}:1 | ${stateLabel(r.students)} |`,
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
      "`docs/design/shots/phase3b2/` — لقطة لكل حالة/مقاس/وضع (صفحة كاملة للقوائم، والشاشة للنوافذ)، ولقطات تكبير النص والصفحة 200%.",
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
    await writeFile(join(OUT, "batch2-verify.md"), md.join("\n"));

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

function stateLabel(students) {
  if (!students) return "—";
  if (students.loadingVisible) return "skeleton";
  if (students.modal) {
    return `${students.modal.testid} · ${students.modal.box?.w}×${students.modal.box?.h} · submit ${students.modal.submit?.h ?? "—"}px`;
  }
  if (students.filtersOpen) return "filters open";
  if (students.emptyVisible) return students.emptyText?.slice(0, 42) ?? "empty";
  const side = students.tableVisible ? "table" : students.cardsVisible ? `${students.cardCount} cards` : "none";
  return `${side} · ${students.tableHeadings} headings · ${students.tableFirstRowCells} cells · pagination=${students.paginationVisible}`;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
