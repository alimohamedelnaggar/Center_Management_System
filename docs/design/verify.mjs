/**
 * Automated checks for the three direction mockups:
 *  - no page-level horizontal scrolling at 390 / 768 / 1440
 *  - local fonts actually load (document.fonts.check + status)
 *  - touch targets are at least 44x44 on the 390 viewport (reported, not fatal
 *    for inline links and text-only controls)
 *
 * Run: node verify.mjs
 * Writes: verify-report.md
 */
import { spawn } from "node:child_process";
import { writeFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const PROFILE = join(process.env.TEMP || "/tmp", "opencode", "chrome-verify-profile");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9444;

const DIRECTIONS = {
  a: {
    label: "A — «دفتر»",
    fonts: [
      ["IBM Plex Sans Arabic", "إدارة مركزك بوضوح"],
      ["IBM Plex Mono", "12,450.00"],
    ],
  },
  b: {
    label: "B — «نبض»",
    fonts: [
      ["Tajawal", "إدارة مركزك بإيقاع واحد"],
      ["Manrope", "18,900.00"],
    ],
  },
  c: {
    label: "C — «حِرفة»",
    fonts: [
      ["Rubik", "إدارة مركزك بحرفة"],
      ["DM Sans", "9,300.00"],
    ],
  },
};

const VIEWPORTS = [
  { width: 390, height: 844, label: "موبايل 390" },
  { width: 768, height: 1024, label: "تابلت 768" },
  { width: 1440, height: 900, label: "ديسكتوب 1440" },
];

function connect(url) {
  const ws = new WebSocket(url);
  let nextId = 1;
  const pending = new Map();
  const listeners = new Map();

  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
      return;
    }
    if (msg.method) {
      const list = listeners.get(msg.method) || [];
      list.forEach((fn) => fn(msg.params));
      listeners.delete(msg.method);
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
    once(method) {
      return new Promise((resolve) => listeners.set(method, [resolve]));
    },
    close: () => ws.close(),
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Runs in the page: collects overflow, fonts and touch-target data. */
const probe = (fonts) => {
  const doc = document.documentElement;
  const vw = doc.clientWidth;
  const pageOverflow = doc.scrollWidth - vw;

  const clippedAncestor = (el) => {
    for (let p = el.parentElement; p && p !== doc; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (
        s.overflowX === "auto" ||
        s.overflowX === "scroll" ||
        s.overflowX === "hidden" ||
        s.overflowX === "clip" ||
        s.overflowY === "hidden" ||
        s.overflowY === "clip"
      ) {
        return p;
      }
    }
    return null;
  };

  const offenders = [];
  const all = document.querySelectorAll("body *");
  for (const el of all) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    const outside = r.right > vw + 1 || r.left < -1;
    if (!outside) continue;
    if (clippedAncestor(el)) continue;
    const s = getComputedStyle(el);
    if (s.position === "fixed") continue;
    offenders.push({
      tag: el.tagName.toLowerCase(),
      cls: (el.className || "").toString().slice(0, 60),
      left: Math.round(r.left),
      right: Math.round(r.right),
    });
    if (offenders.length >= 8) break;
  }

  const fontResults = fonts.map(([family, sample]) => ({
    family,
    loaded: document.fonts.check(`16px "${family}"`, sample),
    computed: getComputedStyle(document.body).fontFamily,
  }));

  const small = [];
  for (const el of document.querySelectorAll("button, a, input, select, [role=button]")) {
    let target = el;
    if (el.tagName === "INPUT" && (el.type === "checkbox" || el.type === "radio")) {
      target = el.closest("label") || el;
    }
    const r = target.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const s = getComputedStyle(target);
    if (s.visibility === "hidden") continue;
    if (s.display === "inline" && el.tagName === "A") continue;
    if (r.height < 44 || r.width < 44) {
      small.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className || "").toString().slice(0, 40),
        label: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 34),
        w: Math.round(r.width),
        h: Math.round(r.height),
      });
    }
    if (small.length >= 40) break;
  }

  return {
    vw,
    pageOverflow,
    offenders,
    fonts: fontResults,
    fontsStatus: document.fonts.status,
    small,
  };
};

async function main() {
  rmSync(PROFILE, { recursive: true, force: true });
  const chrome = spawn(
    CHROME,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--no-first-run",
      "--no-default-browser-check",
      "--allow-file-access-from-files",
      "--force-device-scale-factor=1",
      `--user-data-dir=${PROFILE}`,
      `--remote-debugging-port=${PORT}`,
      "about:blank",
    ],
    { stdio: "ignore" },
  );

  let version;
  for (let i = 0; i < 60; i += 1) {
    try {
      version = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json();
      break;
    } catch {
      await sleep(250);
    }
  }
  if (!version) throw new Error("Chrome did not expose a debugging port");

  let md = `# التحقق الآلي من نماذج الاتجاهات الثلاثة\n\n`;
  md += `تم التشغيل في Chrome headless عبر CDP. لا تُحتسب عناصر التمرير الأفقي المقصودة داخل حاويات \`overflow-x: auto\` (مثل شريط إطارات الموبايل والجداول العريضة) كأخطاء تمرير للصفحة.\n\n`;

  let failures = 0;

  for (const [key, direction] of Object.entries(DIRECTIONS)) {
    md += `## الاتجاه ${direction.label}\n\n`;

    for (const theme of ["light", "dark"]) {
      for (const view of VIEWPORTS) {
        const created = await (
          await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" })
        ).json();
        const client = connect(created.webSocketDebuggerUrl);
        await client.ready;
        await client.send("Page.enable");
        await client.send("Runtime.enable");
        await client.send("Emulation.setDeviceMetricsOverride", {
          width: view.width,
          height: view.height,
          deviceScaleFactor: 1,
          mobile: view.width < 600,
        });

        const url =
          pathToFileURL(join(ROOT, `direction-${key}.html`)).href + `?theme=${theme}`;
        const loaded = client.once("Page.loadEventFired");
        await client.send("Page.navigate", { url });
        await loaded;
        await client.send("Runtime.evaluate", {
          expression: "document.fonts.ready.then(() => true)",
          awaitPromise: true,
        });
        await sleep(250);

        const { result } = await client.send("Runtime.evaluate", {
          expression: `(${probe.toString()})(${JSON.stringify(direction.fonts)})`,
          returnByValue: true,
        });
        const data = result.value;

        const themeLabel = theme === "light" ? "فاتح" : "ليلي";
        const overflowOk = data.pageOverflow <= 1 && data.offenders.length === 0;
        const fontsOk =
          data.fontsStatus === "loaded" && data.fonts.every((f) => f.loaded);
        if (!overflowOk || !fontsOk) failures += 1;

        md += `### ${themeLabel} / ${view.label}\n\n`;
        md += `- تمرير أفقي للصفحة: **${overflowOk ? "سليم" : "فشل"}** — \`scrollWidth - clientWidth = ${data.pageOverflow}px\`\n`;
        md += `- الخطوط: **${fontsOk ? "محملة" : "فشل"}** — \`${data.fontsStatus}\`\n`;
        for (const f of data.fonts) {
          md += `  - \`${f.family}\`: ${f.loaded ? "✓" : "✗"}\n`;
        }
        if (data.offenders.length) {
          md += `- عناصر خارج العرض:\n`;
          for (const o of data.offenders) {
            md += `  - \`<${o.tag} class="${o.cls}">\` → ${o.left}…${o.right}px\n`;
          }
        }
        if (data.small.length) {
          md += `- عناصر أقل من 44px (تحتاج مراجعة): ${data.small.length}\n`;
          for (const s of data.small) {
            md += `  - \`${s.tag}\` ${s.w}×${s.h}${s.label ? ` — «${s.label}»` : ""}\n`;
          }
        }
        md += `\n`;

        client.close();
        await fetch(`http://127.0.0.1:${PORT}/json/close/${created.id}`);
      }
    }
  }

  md += `## الخلاصة\n\n`;
  md +=
    failures === 0
      ? `كل الفحوصات الحرجة (التمرير الأفقي + تحميل الخطوط) نجحت في **${Object.keys(DIRECTIONS).length * 2 * VIEWPORTS.length}** حالة (3 اتجاهات × وضعين × 3 عروض).\n`
      : `**${failures}** حالة تحتاج تعديلًا. راجع التفاصيل أعلاه.\n`;

  writeFileSync(join(ROOT, "verify-report.md"), md, "utf8");
  console.log(failures === 0 ? "ALL PASS" : `${failures} FAILURES`);

  chrome.kill();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
