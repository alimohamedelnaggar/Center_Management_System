import fs from 'node:fs';
import path from 'node:path';
import { expect } from '@playwright/test';

import {
  ensureDir,
  frontendBase,
  rawRoot,
  rel,
  viewport as defaultViewport,
} from './env.js';
import { createStorageState } from './auth-state.js';
import {
  clickWithCursor,
  clearHighlight,
  focusOn,
  hold,
  installCursor,
  moveCursorTo,
  moveCursorToPoint,
  scrollBy,
  smoothScrollTo,
  smoothScrollToLocator,
  typeInto,
} from './motion.js';

export async function waitForShell(page) {
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), {
    timeout: 60_000,
  });
  await page.locator('body').waitFor({ state: 'visible' });

  // The staff shell renders a sidebar; portals render their own header. Waiting
  // for either avoids a recorded half-painted frame without depending on a
  // SignalR connection ever going idle. A few pages (for example the QR cards)
  // use none of those landmarks, so painted body text is accepted as well -
  // otherwise the clip would sit on a static page for the whole 45 s timeout.
  await Promise.race([
    page.locator('aside').first().waitFor({ state: 'visible', timeout: 45_000 }),
    page.locator('header').first().waitFor({ state: 'visible', timeout: 45_000 }),
    page.locator('main').first().waitFor({ state: 'visible', timeout: 45_000 }),
    expect
      .poll(async () => (await page.locator('body').innerText()).trim().length, {
        timeout: 45_000,
      })
      .toBeGreaterThan(200),
  ]).catch(() => {});

  await hold(page, 700);
}

/**
 * Records one continuous clip with a genuine product session. Steps are marked
 * on the wall clock; the renderer converts each mark into a timestamp inside
 * the final scene (title card + trimmed clip offsets).
 */
export async function recordClip({
  browser,
  sceneId,
  clipId,
  role,
  startPath = '/',
  beforeStart = null,
  steps,
  tailMs = 1000,
  viewport = defaultViewport,
  slowMo = 90,
}) {
  const rawDir = ensureDir(path.join(rawRoot, clipId));
  const statePath = path.join(rawDir, 'state.json');

  // A fresh session per clip keeps every clip independent and stops a token
  // expiring halfway through a long recording.
  const { account } = await createStorageState(browser, role, statePath);

  const contextStartWall = Date.now();
  const context = await browser.newContext({
    viewport,
    screen: viewport,
    deviceScaleFactor: 1,
    locale: 'ar-EG',
    timezoneId: 'Africa/Cairo',
    colorScheme: 'light',
    ignoreHTTPSErrors: true,
    storageState: statePath,
    recordVideo: {
      dir: rawDir,
      size: viewport,
    },
    reducedMotion: 'no-preference',
  });

  const consoleErrors = [];
  const pageErrors = [];
  let page;
  let t0Wall = 0;
  let tEndWall = 0;
  const marks = [];
  let lastMarkAt = 0;

  try {
    page = await context.newPage();
    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text().slice(0, 500));
      }
    });
    page.on('pageerror', (error) => {
      pageErrors.push(String(error?.message || error).slice(0, 500));
    });

    await page.goto(`${frontendBase}${startPath}`, {
      waitUntil: 'domcontentloaded',
    });
    await waitForShell(page);

    // Optional preparation on the live page (for example pinning a month
    // filter) that must not be part of the recorded timeline: it runs before
    // the cursor is installed and before t0, so those frames are trimmed.
    if (beforeStart) {
      await beforeStart({ page, context, role, account, expect, hold: (ms) => hold(page, ms) });
    }

    await installCursor(page);

    // With the shell painted, t0 is the first usable frame of the clip.
    t0Wall = Date.now();
    lastMarkAt = t0Wall;

    const mark = (id, extra = {}) => {
      const at = Date.now();
      // Steps must stay readable: a caption needs at least ~3 s on screen.
      const gap = at - lastMarkAt;
      if (gap < 2600) {
        // eslint-disable-next-line no-console
        console.warn(
          `[${clipId}] step "${id}" came ${gap} ms after the previous step; ` +
          'captions will be clamped and may feel rushed.',
        );
      }
      lastMarkAt = at;
      const entry = {
        id,
        atMs: at - t0Wall,
        ...extra,
      };
      marks.push(entry);
      // eslint-disable-next-line no-console
      console.log(`[${clipId}] step ${id} @ ${entry.atMs} ms`);
      return entry;
    };

    const api = {
      page,
      sceneId,
      clipId,
      role,
      account,
      mark,
      hold: (ms) => hold(page, ms),
      installCursor: () => installCursor(page),
      moveCursorTo: (locator) => moveCursorTo(page, locator),
      moveCursorToPoint: (x, y) => moveCursorToPoint(page, x, y),
      focusOn: (locator, options) => focusOn(page, locator, options),
      click: (locator, options) => clickWithCursor(page, locator, options),
      type: (locator, text, options) => typeInto(page, locator, text, options),
      clearHighlight: () => clearHighlight(page),
      scroll: (y, options) => scrollBy(page, y, options),
      scrollTo: (target, options) =>
        typeof target === 'string'
          ? smoothScrollTo(page, target, options)
          : smoothScrollToLocator(page, target, options),
      expect,
      slowMo,
    };

    await steps(api);

    // A short clean tail keeps the last action readable before the cut.
    await hold(page, tailMs);
    tEndWall = Date.now();
  } finally {
    const video = page?.video?.() ?? null;
    await context.close();

    let videoPath = null;
    if (video) {
      try {
        videoPath = await video.path();
      } catch {
        videoPath = null;
      }
    }

    if (videoPath && fs.existsSync(videoPath)) {
      const target = path.join(rawDir, `${clipId}.webm`);
      fs.renameSync(videoPath, target);
      videoPath = target;
    }

    const manifest = {
      sceneId,
      clipId,
      role,
      roleLabel: account.label,
      startPath,
      recordedAt: new Date(contextStartWall).toISOString(),
      contextStartWall,
      t0Wall,
      tEndWall,
      contextLeadInMs: t0Wall - contextStartWall,
      durationMs: Math.max(0, tEndWall - t0Wall),
      videoPath: videoPath ? rel(videoPath) : null,
      steps: marks,
      consoleErrors,
      pageErrors,
    };

    fs.writeFileSync(
      path.join(rawDir, 'clip.json'),
      JSON.stringify(manifest, null, 2),
      'utf8',
    );

    // The raw recordings are large; keep only the manifest when the caller
    // explicitly asked to drop the source. Default keeps it for re-renders.
    if (process.env.MARKETING_DROP_RAW === '1' && videoPath) {
      fs.rmSync(videoPath, { force: true });
    }
  }

  return { rawDir, statePath };
}

export function readClipManifest(clipId) {
  const file = path.join(rawRoot, clipId, 'clip.json');
  if (!fs.existsSync(file)) {
    throw new Error(`Missing clip manifest: ${file}`);
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
