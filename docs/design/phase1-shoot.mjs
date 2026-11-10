/**
 * Phase 1 screenshots.
 *
 *   node phase1-shoot.mjs            -> all targets
 *   node phase1-shoot.mjs dashboard  -> only names containing "dashboard"
 *
 * Output: ../shots/phase1/*.png  (git-ignored like the rest of docs/design).
 * Chrome is driven over CDP so the viewport is exact; the in-app browser tools
 * cannot set a viewport.
 */
import { spawn } from "node:child_process";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const PHASE1 = join(ROOT, "phase1");
const OUT = join(ROOT, "shots", "phase1");
const PROFILE = join(process.env.TEMP || "/tmp", "opencode", "chrome-phase1-profile");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9444;

const only = (process.argv[2] || "").toLowerCase();

const compare = (page) =>
  ["before", "after"].flatMap((variant) =>
    ["light", "dark"].flatMap((theme) =>
      [
        { width: 1440, label: "1440" },
        { width: 390, label: "390" },
      ].map((view) => ({
        name: `${page}-${variant}-${theme}-${view.label}`,
        file: `compare-${page}.html`,
        query: `variant=${variant}&theme=${theme}`,
        ...view,
      })),
    ),
  );

const targets = [
  ...compare("dashboard"),
  ...compare("students"),
  {
    name: "dashboard-tweak-light-1440",
    file: "compare-dashboard.html",
    query: "variant=after&theme=light&tweak=1",
    width: 1440,
  },
  {
    name: "dashboard-tweak-dark-1440",
    file: "compare-dashboard.html",
    query: "variant=after&theme=dark&tweak=1",
    width: 1440,
  },
  ...[
    { width: 1440, label: "1440" },
    { width: 390, label: "390" },
  ].flatMap((view) =>
    ["light", "dark"].flatMap((theme) => [
      {
        name: `mobileB-${theme}-${view.label}`,
        file: "mobile-B.html",
        query: `theme=${theme}`,
        ...view,
      },
      {
        name: `portalsB-${theme}-${view.label}`,
        file: "portals-B.html",
        query: `theme=${theme}`,
        ...view,
      },
    ]),
  ),
  {
    name: "center-colors-1440",
    file: "center-colors.html",
    query: "",
    width: 1440,
  },
  {
    name: "center-colors-768",
    file: "center-colors.html",
    query: "",
    width: 768,
  },
].filter((t) => !only || t.name.toLowerCase().includes(only));

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

async function main() {
  await mkdir(OUT, { recursive: true });
  await rm(PROFILE, { recursive: true, force: true });

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
      "--font-render-hinting=none",
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

  for (const target of targets) {
    const created = await (
      await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" })
    ).json();
    const client = connect(created.webSocketDebuggerUrl);
    await client.ready;

    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: target.width,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    const url = pathToFileURL(join(PHASE1, target.file)).href + (target.query ? `?${target.query}` : "");
    await client.send("Page.navigate", { url });
    for (let i = 0; i < 40; i += 1) {
      const state = await client.send("Runtime.evaluate", {
        expression: "document.readyState",
        returnByValue: true,
      });
      if (state.result.value === "complete") break;
      await sleep(100);
    }
    await client.send("Runtime.evaluate", {
      expression: "document.fonts.ready.then(() => true)",
      awaitPromise: true,
    });
    await sleep(600);

    const metrics = await client.send("Page.getLayoutMetrics");
    const size = metrics.cssContentSize || metrics.contentSize;
    const measured = await client.send("Runtime.evaluate", {
      expression:
        "Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0, document.body ? document.body.offsetHeight : 0)",
      returnByValue: true,
    });
    const height = Math.min(
      Math.ceil(Math.max(size.height, measured.result.value || 0)),
      14000,
    );

    await client.send("Emulation.setDeviceMetricsOverride", {
      width: target.width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await sleep(300);

    // Re-measure after the resize: reflow can add or remove a few dozen pixels,
    // and a clip that is 59px short silently cuts the last card.
    const after = await client.send("Runtime.evaluate", {
      expression:
        "Math.max(document.documentElement.scrollHeight, document.body.scrollHeight, document.body.offsetHeight)",
      returnByValue: true,
    });
    const finalHeight = Math.min(
      Math.max(height, Math.ceil(after.result.value || 0)),
      14000,
    );
    if (finalHeight !== height) {
      await client.send("Emulation.setDeviceMetricsOverride", {
        width: target.width,
        height: finalHeight,
        deviceScaleFactor: 1,
        mobile: false,
      });
      await sleep(200);
    }

    const shot = await client.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
      clip: { x: 0, y: 0, width: target.width, height: finalHeight, scale: 1 },
    });

    await writeFile(join(OUT, `${target.name}.png`), Buffer.from(shot.data, "base64"));
    console.log(`${target.name}.png  ${target.width}x${finalHeight}`);

    client.close();
    await fetch(`http://127.0.0.1:${PORT}/json/close/${created.id}`);
  }

  chrome.kill();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
