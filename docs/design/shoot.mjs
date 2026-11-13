/**
 * Renders the three direction HTML files at 1440 and 390 in both themes
 * and writes full-page PNGs into ./shots.
 *
 * Run: node shoot.mjs [a|b|c]
 */
import { spawn } from "node:child_process";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SHOTS = join(ROOT, "shots");
const PROFILE = join(process.env.TEMP || "/tmp", "opencode", "chrome-shot-profile");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9333;

const only = (process.argv[2] || "").toLowerCase();

const targets = ["a", "b", "c"]
  .filter((d) => !only || d === only)
  .flatMap((d) =>
    ["light", "dark"].flatMap((theme) =>
      [
        { width: 1440, label: "desktop" },
        { width: 390, label: "mobile" },
      ].map((view) => ({
        direction: d,
        theme,
        ...view,
        file: `direction-${d}.html`,
        out: `direction-${d}-${theme}-${view.width}.png`,
      })),
    ),
  );

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
  await mkdir(SHOTS, { recursive: true });
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
      mobile: target.width < 600,
    });

    const url =
      pathToFileURL(join(ROOT, target.file)).href + `?theme=${target.theme}`;
    const loaded = client.once("Page.loadEventFired");
    await client.send("Page.navigate", { url });
    await loaded;
    await client.send("Runtime.evaluate", {
      expression: "document.fonts.ready.then(() => true)",
      awaitPromise: true,
    });
    await sleep(450);

    const metrics = await client.send("Page.getLayoutMetrics");
    const size = metrics.cssContentSize || metrics.contentSize;
    const width = target.width;
    const height = Math.min(Math.ceil(size.height), 12000);

    await client.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: target.width < 600,
    });
    await sleep(250);

    const shot = await client.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
      clip: { x: 0, y: 0, width, height, scale: 1 },
    });

    await writeFile(join(SHOTS, target.out), Buffer.from(shot.data, "base64"));
    console.log(`${target.out}  ${width}x${height}`);

    client.close();
    await fetch(`http://127.0.0.1:${PORT}/json/close/${created.id}`);
  }

  chrome.kill();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
