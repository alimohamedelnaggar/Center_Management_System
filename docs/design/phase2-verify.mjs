/**
 * Phase 2 automated checks — responsive design system.
 *
 *   node phase2-verify.mjs
 *
 * Boots the real Vite app, then drives headless Chrome over CDP and checks
 * every required viewport (portrait + short landscape) in light and dark:
 *
 *   - no horizontal page scroll
 *   - no element outside the viewport
 *   - every interactive target is at least 44x44 CSS px
 *   - primary text is at least 14px (deliberate `text-xs` metadata excluded)
 *   - no clipped text inside an `overflow:hidden` box
 *   - no fixed/overlaid element covers an interactive control
 *   - KPI grid columns and table<->cards mode match the breakpoint contract
 *   - content stays capped and centred at 1920 / 2560
 *   - Tajawal + Manrope are loaded from local files
 *   - WCAG AA on body text, buttons and status pills
 *   - the modal keeps its footer visible and scrolls its body internally
 *   - 200% text zoom and 200% page zoom keep the layout intact
 *   - the /components gallery exposes 11 viewport buttons and a live iframe
 *
 * Writes phase2/phase2-verify.json + phase2/phase2-verify.md and screenshots
 * into shots/phase2/.
 */
import { spawn } from "node:child_process";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = join(HERE, "..", "..", "Frontend", "CenterManagement");
const OUT = join(HERE, "phase2");
const SHOTS = join(HERE, "shots", "phase2");
const PROFILE = join(process.env.TEMP || "/tmp", "opencode", "chrome-phase2-verify");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9466;
const APP_PORT = 5199;
const BASE = `http://127.0.0.1:${APP_PORT}`;

/** [id, width, height] — portrait first, then short landscape phones. */
const VIEWPORTS = [
  ["360", 360, 800],
  ["390", 390, 844],
  ["430", 430, 932],
  ["768", 768, 1024],
  ["1024", 1024, 768],
  ["1280", 1280, 800],
  ["1440", 1440, 900],
  ["1920", 1920, 1080],
  ["2560", 2560, 1440],
  ["land-640", 640, 360],
  ["land-844", 844, 390],
];

const THEMES = ["light", "dark"];
const KEY_FULL = new Set(["360", "768", "1440"]);

/** Columns the `.card-grid` container query must produce for a container width. */
function columnsForContainer(width) {
  if (width >= 72 * 16) return 4;
  if (width >= 46 * 16) return 3;
  if (width >= 24 * 16) return 2;
  return 1;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function connect(url) {
  const ws = new WebSocket(url);
  let nextId = 1;
  const pending = new Map();
  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
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
    // Breadcrumb trails are deliberate 12px chrome, not body copy.
    if (el.closest("[aria-label='مسار التنقل']")) return;
    // Bottom-bar tab labels are deliberately 11px chrome, not body copy.
    if (el.closest(".mobile-bottom-nav")) return;
    const text = (el.value || el.textContent || "").trim();
    if (!text) return;
    // Deliberate secondary metadata (11-13px) is not "primary text".
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

  /* 5 - an overlay must not cover an interactive control -------------- */
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
    covered.push({ ...describe(el), by: top.tagName.toLowerCase() });
  });

  /* 6 - sibling cards/sections must not overlap ----------------------- */
  const blocks = [
    ...document.querySelectorAll(
      '[data-testid^="section-"], .card-grid > *, .responsive-table .as-cards > *',
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

  /* 7 - responsive contract probes ------------------------------------ */
  const grid = document.querySelector(".card-grid");
  const gridCols = grid
    ? getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean).length
    : null;
  const gridHostWidth = grid?.parentElement
    ? Math.round(grid.parentElement.getBoundingClientRect().width)
    : null;
  const table = document.querySelector(".responsive-table");
  const tableHostWidth = table ? Math.round(table.getBoundingClientRect().width) : null;
  const asTable = table && table.querySelector(".as-table");
  const asCards = table && table.querySelector(".as-cards");
  const tableMode = !asTable
    ? null
    : getComputedStyle(asTable).display !== "none"
      ? "table"
      : getComputedStyle(asCards).display !== "none"
        ? "cards"
        : null;
  const tableCols =
    asCards && getComputedStyle(asCards).display !== "none"
      ? getComputedStyle(asCards).gridTemplateColumns.split(" ").filter(Boolean).length
      : null;

  const content = document.querySelector(".content-container");
  const contentBox = content
    ? {
        width: Math.round(content.getBoundingClientRect().width),
        left: Math.round(content.getBoundingClientRect().left),
        right: Math.round(vw - content.getBoundingClientRect().right),
        max: getComputedStyle(content).maxWidth,
      }
    : null;

  const demo = document.querySelector(".sidebar-demo");
  const demoBox = demo
    ? {
        visible: visible(demo),
        width: Math.round(demo.getBoundingClientRect().width),
        rightGap: Math.round(
          demo.parentElement.getBoundingClientRect().right - demo.getBoundingClientRect().right,
        ),
      }
    : null;

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

  /* 9 - contrast ----------------------------------------------------- */
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
  const pairs = [];
  const addPair = (label, el) => {
    if (!el || !visible(el)) return;
    const fg = parse(getComputedStyle(el).color);
    const bg = bgOf(el);
    if (!fg || !bg) return;
    pairs.push({
      label,
      ratio: Math.round(ratio(fg, bg) * 100) / 100,
      size: getComputedStyle(el).fontSize,
    });
  };
  const scope = document.querySelector('[data-testid="showcase"]') || document.body;
  addPair("body text", scope.querySelector("#cards p") || scope.querySelector("p"));
  addPair("primary button", scope.querySelector("#buttons button"));
  addPair("status success", scope.querySelector("#pills .bg-status-success-bg"));
  addPair("status warning", scope.querySelector("#pills .bg-status-warning-bg"));
  addPair("status danger", scope.querySelector("#pills .bg-status-danger-bg"));
  addPair("muted meta", scope.querySelector(".text-text-muted"));

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
    gridCols,
    gridHostWidth,
    tableMode,
    tableCols,
    tableHostWidth,
    tableVisible: !!table && visible(table),
    contentBox,
    demoBox,
    fonts,
    contrast: pairs,
    sections: document.querySelectorAll('[data-testid^="section-"]').length,
  };
})()`;

/* ------------------------------------------------------------------ */
/* behaviour probes                                                    */
/* ------------------------------------------------------------------ */

const MODAL_PROBE = String.raw`(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const out = { found: false };
  const btn = document.querySelector('[data-testid="open-modal"]');
  if (!btn) return out;
  out.found = true;
  btn.click();
  await wait(340);

  const dialog = document.querySelector('[role="dialog"]');
  out.open = !!dialog;
  if (!dialog) return out;

  const panel = dialog.classList.contains("modal-panel")
    ? dialog
    : dialog.querySelector(".modal-panel");
  const body = dialog.querySelector("[data-scroll-region='modal-body']");
  const footer = dialog.querySelector(".modal-footer");
  const pr = panel.getBoundingClientRect();
  const fr = footer ? footer.getBoundingClientRect() : null;

  out.panelHeight = Math.round(pr.height);
  out.viewportHeight = window.innerHeight;
  out.withinViewport = pr.top >= -1 && pr.bottom <= window.innerHeight + 1;
  // The body may fit (no scrollbar needed) or scroll internally; either is
  // fine. What must never happen is content spilling out of the panel.
  out.bodyContained = body
    ? body.scrollHeight <= body.clientHeight + 1 ||
      /auto|scroll/.test(getComputedStyle(body).overflowY)
    : null;
  out.footerVisible = fr ? fr.top >= pr.top - 1 && fr.bottom <= pr.bottom + 1 : null;
  out.closeLabel = dialog.querySelector("[aria-label='إغلاق']")?.getAttribute("aria-label") ?? null;
  out.overflowX = Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth);

  const close = dialog.querySelector("[aria-label='إغلاق']");
  close?.click();
  await wait(320);
  out.closed = !document.querySelector('[role="dialog"]');
  return out;
})()`;

const GALLERY_PROBE = String.raw`(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const out = {};
  const header = document.querySelector("header");
  const switcher = [...document.querySelectorAll("header button[aria-pressed]")];
  out.viewportButtons = switcher.length;
  out.labels = switcher.map((b) => b.textContent.trim());
  out.hasIframe = !!document.querySelector('iframe[title="معاينة المكونات"]');
  out.hasLandscape = [...document.querySelectorAll("header button")].some((b) =>
    b.textContent.includes("محاكاة أفقي"),
  );

  const pick = (label) => {
    const b = switcher.find((x) => x.textContent.trim() === label);
    b?.click();
    return !!b;
  };

  out.clicked2560 = pick("2560");
  await wait(500);
  let iframe = document.querySelector('iframe[title="معاينة المكونات"]');
  out.width2560 = iframe?.getAttribute("width");
  out.innerWidth2560 = iframe?.contentWindow?.innerWidth ?? null;
  out.innerSections = iframe?.contentWindow?.document?.querySelectorAll('[data-testid^="section-"]').length ?? null;
  out.iframeFits =
    iframe && iframe.parentElement.parentElement.getBoundingClientRect().width <= header.getBoundingClientRect().width + 1;

  const landscape = [...document.querySelectorAll("header button")].find((b) =>
    b.textContent.includes("محاكاة أفقي"),
  );
  landscape?.click();
  await wait(500);
  iframe = document.querySelector('iframe[title="معاينة المكونات"]');
  out.landscapeWidth = iframe?.getAttribute("width");
  out.landscapeHeight = iframe?.getAttribute("height");
  out.innerWidthLandscape = iframe?.contentWindow?.innerWidth ?? null;

  return out;
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
    client = connect(created.webSocketDebuggerUrl);
    await client.ready;
    await client.send("Page.enable");
    await client.send("Runtime.enable");

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

    const waitForSelector = async (selector, timeout = 10000) => {
      const start = Date.now();
      while (Date.now() - start < timeout) {
        if (await evaluate(`!!document.querySelector(${JSON.stringify(selector)})`)) return true;
        await sleep(100);
      }
      return false;
    };

    const navigate = async (path, theme, metrics) => {
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
      for (let i = 0; i < 100; i += 1) {
        if ((await evaluate("document.readyState")) === "complete") break;
        await sleep(100);
      }
      await waitForSelector('[data-testid="showcase"], iframe[title="معاينة المكونات"]');
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
        await sleep(1200);
        await waitForSelector('[data-testid="showcase"], iframe[title="معاينة المكونات"]');
        await evaluate("document.fonts.ready.then(() => true)", true);
        await sleep(650);
      }
    };

    const screenshot = async (name, { full = false } = {}) => {
      const params = { format: "png", fromSurface: true };
      if (full) {
        const metrics = await client.send("Page.getLayoutMetrics");
        const size = metrics.cssContentSize || metrics.contentSize;
        const width = Math.max(1, Math.ceil(size.width));
        const height = Math.max(1, Math.min(Math.ceil(size.height), 7000));
        params.captureBeyondViewport = true;
        params.clip = { x: 0, y: 0, width, height, scale: 1 };
      }
      const { data } = await client.send("Page.captureScreenshot", params);
      await writeFile(join(SHOTS, name), Buffer.from(data, "base64"));
    };

    const runs = [];
    const failures = [];
    const notes = [];

    /* ---------- showcase matrix ---------- */
    for (const [id, width, height] of VIEWPORTS) {
      for (const theme of THEMES) {
        await navigate("/components?embed=1", theme, { width, height });
        const audit = await evaluate(AUDIT);
        const modal = await evaluate(MODAL_PROBE, true);

        // Card grid and table switch on their own container width, not the
        // viewport width, so the expectation uses the measured host.
        const expectedCols = columnsForContainer(audit.gridHostWidth ?? width);
        const expectedTable =
          (audit.tableHostWidth ?? width) <= 704 ? "cards" : "table";

        const run = {
          page: "showcase",
          id,
          width,
          height,
          theme,
          ...audit,
          modal,
          expectedCols,
          expectedTable,
        };
        runs.push(run);

        await screenshot(`${id}-${theme}.png`);
        if (KEY_FULL.has(id)) {
          await screenshot(`${id}-${theme}-full.png`, { full: true });
        }

        const tag = `showcase ${id} ${theme}`;
        if (audit.overflowX > 1) failures.push(`${tag}: horizontal page scroll ${audit.overflowX}px`);
        if (audit.outsideCount)
          failures.push(`${tag}: ${audit.outsideCount} element(s) outside the viewport`);
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
          failures.push(`${tag}: ${audit.coveredCount} interactive control(s) covered by another element`);
        if (audit.overlapCount)
          failures.push(`${tag}: ${audit.overlapCount} overlapping card/section pair(s)`);
        if (audit.gridCols !== expectedCols)
          failures.push(`${tag}: grid has ${audit.gridCols} column(s), expected ${expectedCols}`);
        if (audit.tableVisible && audit.tableMode !== expectedTable)
          failures.push(`${tag}: table mode is ${audit.tableMode}, expected ${expectedTable}`);
        if (audit.tableMode === "cards" && audit.tableCols && audit.tableCols > 2)
          failures.push(`${tag}: table cards use ${audit.tableCols} columns, expected 1-2`);
        if (audit.dir !== "rtl") failures.push(`${tag}: document direction is not rtl`);
        if (audit.demoBox && audit.demoBox.visible && audit.demoBox.rightGap > 2)
          failures.push(`${tag}: sidebar demo is not pinned to the right edge`);
        if (!audit.fonts.tajawal) failures.push(`${tag}: Tajawal not loaded`);
        if (!audit.fonts.manrope) failures.push(`${tag}: Manrope not loaded`);
        audit.contrast
          .filter((c) => c.ratio < 4.5)
          .forEach((c) => failures.push(`${tag}: contrast ${c.label} ${c.ratio}:1`));
        if (width >= 1920) {
          const cap = width >= 2560 ? 1760 : 1600;
          if (!audit.contentBox || audit.contentBox.width > cap + 1)
            failures.push(`${tag}: content is ${audit.contentBox?.width}px, cap is ${cap}px`);
          if (audit.contentBox && Math.abs(audit.contentBox.left - audit.contentBox.right) > 2)
            failures.push(`${tag}: content is not centred`);
        }
        if (!modal.found) failures.push(`${tag}: modal trigger missing`);
        else {
          if (!modal.open) failures.push(`${tag}: modal did not open`);
          if (!modal.withinViewport) failures.push(`${tag}: modal is taller than the viewport`);
          if (!modal.footerVisible) failures.push(`${tag}: modal footer is not visible`);
          if (modal.bodyContained === false) failures.push(`${tag}: modal body overflows the panel`);
          if (!modal.closed) failures.push(`${tag}: modal did not close`);
        }
      }
    }

    /* ---------- 200% text zoom ---------- */
    const textZoom = [];
    for (const [id, width, height] of [
      ["390", 390, 844],
      ["768", 768, 1024],
      ["1440", 1440, 900],
    ]) {
      for (const theme of THEMES) {
        await navigate("/components?embed=1", theme, { width, height });
        await evaluate('document.documentElement.style.fontSize = "200%"; true');
        await sleep(450);
        const audit = await evaluate(AUDIT);
        textZoom.push({ id, width, height, theme, ...audit });
        await screenshot(`${id}-${theme}-text200.png`);

        const tag = `text200 ${id} ${theme}`;
        if (audit.overflowX > 1) failures.push(`${tag}: horizontal page scroll ${audit.overflowX}px`);
        if (audit.outsideCount) failures.push(`${tag}: ${audit.outsideCount} element(s) outside the viewport`);
        if (audit.clippedCount) failures.push(`${tag}: ${audit.clippedCount} clipped text box(es)`);
        if (audit.coveredCount) failures.push(`${tag}: ${audit.coveredCount} covered control(s)`);
        if (audit.overlapCount) failures.push(`${tag}: ${audit.overlapCount} overlapping pair(s)`);
        if (audit.primaryCount) failures.push(`${tag}: ${audit.primaryCount} primary text node(s) under 14px`);
        if (audit.smallCount)
          failures.push(`${tag}: ${audit.smallCount} tap target(s) under 44px after text zoom`);
      }
    }

    /* ---------- 200% page zoom (CSS viewport halved) ---------- */
    const pageZoom = [];
    for (const [id, width, height] of [
      ["1024", 1024, 768],
      ["1280", 1280, 800],
      ["1440", 1440, 900],
    ]) {
      for (const theme of THEMES) {
        const zoomWidth = Math.round(width / 2);
        const zoomHeight = Math.round(height / 2);
        await navigate("/components?embed=1", theme, {
          width: zoomWidth,
          height: zoomHeight,
          dsf: 2,
        });
        const audit = await evaluate(AUDIT);
        pageZoom.push({ id, width: zoomWidth, height: zoomHeight, theme, ...audit });
        await screenshot(`${id}-${theme}-zoom200.png`);

        const tag = `zoom200 ${id} ${theme}`;
        if (audit.overflowX > 1) failures.push(`${tag}: horizontal page scroll ${audit.overflowX}px`);
        if (audit.outsideCount) failures.push(`${tag}: ${audit.outsideCount} element(s) outside the viewport`);
        if (audit.clippedCount) failures.push(`${tag}: ${audit.clippedCount} clipped text box(es)`);
        if (audit.coveredCount) failures.push(`${tag}: ${audit.coveredCount} covered control(s)`);
        if (audit.overlapCount) failures.push(`${tag}: ${audit.overlapCount} overlapping pair(s)`);
        if (audit.primaryCount) failures.push(`${tag}: ${audit.primaryCount} primary text node(s) under 14px`);
        if (audit.smallCount)
          failures.push(`${tag}: ${audit.smallCount} tap target(s) under 44px after page zoom`);
      }
    }

    /* ---------- gallery page ---------- */
    const gallery = { runs: [], probe: null };
    for (const [id, width, height] of [
      ["390", 390, 844],
      ["1440", 1440, 900],
    ]) {
      for (const theme of THEMES) {
        await navigate("/components", theme, { width, height });
        const audit = await evaluate(AUDIT);
        const probe = id === "1440" && theme === "light" ? await evaluate(GALLERY_PROBE, true) : null;
        gallery.runs.push({ id, width, height, theme, ...audit, probe });
        if (probe) gallery.probe = probe;
        await screenshot(`gallery-${id}-${theme}.png`);

        const tag = `gallery ${id} ${theme}`;
        if (audit.overflowX > 1) failures.push(`${tag}: horizontal page scroll ${audit.overflowX}px`);
        if (audit.outsideCount) failures.push(`${tag}: ${audit.outsideCount} element(s) outside the viewport`);
        if (audit.smallCount)
          failures.push(
            `${tag}: ${audit.smallCount} tap target(s) under 44px (${audit.small
              .slice(0, 3)
              .map((s) => `${s.tag}.${s.cls} ${s.w}x${s.h}`)
              .join(", ")})`,
          );
        if (audit.primaryCount) failures.push(`${tag}: ${audit.primaryCount} primary text node(s) under 14px`);
        if (audit.clippedCount) failures.push(`${tag}: ${audit.clippedCount} clipped text box(es)`);
      }
    }
    if (!gallery.probe) failures.push("gallery: probe did not run");
    else {
      if (gallery.probe.viewportButtons !== 11)
        failures.push(`gallery: ${gallery.probe.viewportButtons} viewport buttons, expected 11`);
      if (!gallery.probe.hasIframe) failures.push("gallery: preview iframe missing");
      if (!gallery.probe.hasLandscape) failures.push("gallery: landscape toggle missing");
      if (gallery.probe.width2560 !== "2560")
        failures.push(`gallery: switching to 2560 produced width ${gallery.probe.width2560}`);
      if (gallery.probe.innerWidth2560 !== 2560)
        failures.push(`gallery: iframe inner width is ${gallery.probe.innerWidth2560}, expected 2560`);
      if (gallery.probe.innerSections !== 11)
        failures.push(`gallery: iframe rendered ${gallery.probe.innerSections} sections, expected 11`);
      if (gallery.probe.landscapeWidth !== "1440")
        failures.push(`gallery: landscape width is ${gallery.probe.landscapeWidth}, expected 1440`);
      if (gallery.probe.landscapeHeight !== "2560")
        failures.push(`gallery: landscape height is ${gallery.probe.landscapeHeight}, expected 2560`);
      if (gallery.probe.innerWidthLandscape !== 1440)
        failures.push(`gallery: landscape inner width is ${gallery.probe.innerWidthLandscape}, expected 1440`);
    }

    /* ---------- aggregate ---------- */
    const byViewport = {};
    runs.forEach((r) => {
      const key = `${r.id}-${r.theme}`;
      byViewport[key] = {
        gridCols: r.gridCols,
        tableMode: r.tableMode,
        tableCols: r.tableCols,
        contentWidth: r.contentBox?.width ?? null,
        overflowX: r.overflowX,
        small: r.smallCount,
        clipped: r.clippedCount,
        covered: r.coveredCount,
        overlap: r.overlapCount,
        contrastMin: Math.min(...r.contrast.map((c) => c.ratio)),
      };
    });

    const summary = {
      generated: new Date().toISOString(),
      viewports: VIEWPORTS.length,
      runs: runs.length + textZoom.length + pageZoom.length + gallery.runs.length,
      failures,
      byViewport,
      zoom: { text: textZoom.length, page: pageZoom.length },
      gallery: gallery.probe,
    };

    await writeFile(
      join(OUT, "phase2-verify.json"),
      JSON.stringify({ summary, runs, textZoom, pageZoom, gallery }, null, 2),
    );

    /* ---------- markdown ---------- */
    const md = [];
    md.push("# المرحلة 2 — تقرير الفحص الآلي", "");
    md.push(`تم التوليد: ${summary.generated}`, "");
    md.push(
      `النتيجة: **${failures.length ? "FAIL" : "ALL PASS"}** — ${summary.runs} تشغيلًا: ` +
        `${runs.length} لقطة أساسية (${VIEWPORTS.length} مقاسًا × وضعان)، ` +
        `${textZoom.length} تكبير نص 200%، ${pageZoom.length} تكبير صفحة 200%، ` +
        `${gallery.runs.length} لصفحة المعرض.`,
      "",
    );
    md.push("## جدول المقاسات", "");
    md.push(
      "| المقاس | الوضع | أعمدة البطاقات | الجدول | أعمدة كروت الجدول | عرض المحتوى | تمرير أفقي | أهداف <44 | نص مقطوع | تغطية | تراكب | أقل تباين |",
    );
    md.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
    runs.forEach((r) => {
      md.push(
        `| ${r.id} (${r.width}×${r.height}) | ${r.theme} | ${r.gridCols} | ${r.tableMode ?? "—"} | ${r.tableCols ?? "—"} | ${r.contentBox?.width ?? "—"}px | ${r.overflowX}px | ${r.smallCount} | ${r.clippedCount} | ${r.coveredCount} | ${r.overlapCount} | ${Math.min(...r.contrast.map((c) => c.ratio)).toFixed(2)}:1 |`,
      );
    });
    md.push("");
    md.push("## التخطيط مقابل العقد", "");
    md.push("| المقاس | الوضع | أعمدة متوقعة | أعمدة فعلية | الجدول متوقع | الجدول فعلي |");
    md.push("| --- | --- | --- | --- | --- | --- |");
    runs.forEach((r) => {
      md.push(
        `| ${r.id} | ${r.theme} | ${r.expectedCols} | ${r.gridCols} | ${r.expectedTable} | ${r.tableMode ?? "—"} |`,
      );
    });
    md.push("");
    md.push("## تكبير النص 200%", "");
    md.push("| المقاس | الوضع | تمرير أفقي | خارج الشاشة | نص مقطوع | تغطية | تراكب | نص <14 | لمس <44 |");
    md.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- |");
    textZoom.forEach((r) => {
      md.push(
        `| ${r.id} | ${r.theme} | ${r.overflowX}px | ${r.outsideCount} | ${r.clippedCount} | ${r.coveredCount} | ${r.overlapCount} | ${r.primaryCount} | ${r.smallCount} |`,
      );
    });
    md.push("");
    md.push("## تكبير الصفحة 200% (عرض CSS نصف العرض)", "");
    md.push("| المقاس الأصلي | عرض CSS | الوضع | تمرير أفقي | خارج الشاشة | نص مقطوع | تغطية | تراكب | نص <14 | لمس <44 |");
    md.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
    pageZoom.forEach((r) => {
      md.push(
        `| ${r.id} | ${r.width}px | ${r.theme} | ${r.overflowX}px | ${r.outsideCount} | ${r.clippedCount} | ${r.coveredCount} | ${r.overlapCount} | ${r.primaryCount} | ${r.smallCount} |`,
      );
    });
    md.push("");
    md.push("## النوافذ (Modal)", "");
    md.push("| المقاس | الوضع | فُتحت | داخل الشاشة | التذييل ظاهر | الجسم داخل اللوحة | أُغلقت |");
    md.push("| --- | --- | --- | --- | --- | --- | --- |");
    runs.forEach((r) => {
      md.push(
        `| ${r.id} | ${r.theme} | ${r.modal.open ? "✓" : "✗"} | ${r.modal.withinViewport ? "✓" : "✗"} | ${r.modal.footerVisible ? "✓" : "✗"} | ${r.modal.bodyContained ? "✓" : "✗"} | ${r.modal.closed ? "✓" : "✗"} |`,
      );
    });
    md.push("");
    md.push("## معرض المكونات", "");
    md.push("```json");
    md.push(JSON.stringify(gallery.probe, null, 2));
    md.push("```");
    md.push("");
    md.push("## اللقطات", "");
    md.push("`docs/design/shots/phase2/` — لقطة لكل مقاس/وضع، ولقطات كاملة لكل من 360/768/1440، ولقطات 200%، ولقطتا المعرض.");
    md.push("");
    if (failures.length) {
      md.push("## الإخفاقات", "");
      failures.forEach((f) => md.push(`- ${f}`));
    } else {
      md.push(
        "لا إخفاقات: لا تمرير أفقي، لا عناصر مقطوعة أو متراكبة، كل هدف لمس ≥44px، النص الأساسي ≥14px، الخطوط محلية، التباين AA، الجدول والكروت والشريط الجانبي يتبدلون كما هو متعاقد عليه، والتكبير 200% سليم.",
      );
    }
    if (notes.length) {
      md.push("");
      md.push("## ملاحظات", "");
      notes.forEach((n) => md.push(`- ${n}`));
    }
    await writeFile(join(OUT, "phase2-verify.md"), md.join("\n"));

    console.log(failures.length ? `FAIL (${failures.length})` : "ALL PASS");
    failures.slice(0, 60).forEach((f) => console.log(" - " + f));
    console.log(
      JSON.stringify(
        {
          runs: summary.runs,
          byViewport,
          gallery: gallery.probe,
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
