import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

import {
  marketingRoot,
  overlayRoot,
  rawRoot,
  rel,
  repoRoot,
} from './support/env.js';

/**
 * Turns the step marks produced by the recorders into a render plan and the
 * matching title/caption PNGs.
 *
 * Nothing here invents a timing: every caption starts at the wall-clock mark of
 * the step that asserted the element it talks about. The only fixed numbers are
 * the title card length and the caption length rules, which are both in
 * captions.ar.json.
 */

const PRE_ROLL_MS = 450; // kept before the first step so the page is not cut mid-paint
const GAP_MS = 250; // breathing room before the next caption replaces this one
const BOTTOM_PX = 64; // caption distance from the bottom edge
const TAIL_GUARD_MS = 200;

const ffTime = (ms) => (ms / 1000).toFixed(3);

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

const captionsPath = path.join(marketingRoot, 'captions.ar.json');
const captionsFile = readJson(captionsPath);
const meta = captionsFile.meta;
const TITLE_MS = Number(meta.titleCardMs ?? 2500);
const MIN_CAPTION_MS = Number(meta.minCaptionMs ?? 3000);
const MAX_CAPTION_MS = Number(meta.maxCaptionMs ?? 4000);
const FPS = Number(meta.fps ?? 25);
const WIDTH = Number(meta.width ?? 1920);
const HEIGHT = Number(meta.height ?? 1080);

const sceneArg = (() => {
  const index = process.argv.indexOf('--scene');
  return index >= 0 ? process.argv[index + 1] : 'all';
})();

const requestedScenes =
  sceneArg === 'all'
    ? Object.keys(captionsFile.scenes)
    : String(sceneArg)
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);

if (requestedScenes.length === 0) {
  throw new Error('No scene requested.');
}

// ---------------------------------------------------------------------------
// Validation: a caption is only allowed if it is readable and allowed by
// docs/not-covered.md. Each rule below is a hard stop, not a warning.
// ---------------------------------------------------------------------------

const BANNED_FRAGMENTS = [
  'تطبيق',
  'أرقام موثوقة',
  'إدارة بلا فوضى',
  'أمان ووضوح',
  'أوفلاين',
  'بدون إنترنت',
  'واتساب تلقائي',
  'إشعار تلقائي',
];

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function validateCaption(sceneKey, stepId, text) {
  const problems = [];
  if (!text || !text.trim()) {
    problems.push(`scene ${sceneKey} step "${stepId}": empty caption`);
    return problems;
  }
  if (/\{\{[^}]+\}\}/.test(text)) {
    problems.push(
      `scene ${sceneKey} step "${stepId}": unresolved placeholder in "${text}"`,
    );
  }
  for (const fragment of BANNED_FRAGMENTS) {
    if (text.includes(fragment)) {
      problems.push(
        `scene ${sceneKey} step "${stepId}": banned wording "${fragment}" in "${text}"`,
      );
    }
  }
  if (/[,.!?;:]/.test(text)) {
    problems.push(
      `scene ${sceneKey} step "${stepId}": English punctuation in "${text}"`,
    );
  }
  const words = countWords(text);
  if (words > 8) {
    problems.push(
      `scene ${sceneKey} step "${stepId}": ${words} words, maximum is 8 ("${text}")`,
    );
  }
  return problems;
}

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

function readManifest(clipId) {
  const file = path.join(rawRoot, clipId, 'clip.json');
  if (!fs.existsSync(file)) {
    throw new Error(
      `Scene clip "${clipId}" has no manifest at ${rel(file)}. Record it first.`,
    );
  }
  return readJson(file);
}

function captionDurationMs(text) {
  const words = countWords(text);
  const wanted = 1500 + words * 400;
  return Math.min(MAX_CAPTION_MS, Math.max(MIN_CAPTION_MS, wanted));
}

function buildPlan(sceneKey) {
  const scene = captionsFile.scenes[sceneKey];
  if (!scene) {
    throw new Error(`captions.ar.json has no scene "${sceneKey}".`);
  }
  const clipIds = scene.clips ?? [];
  if (clipIds.length === 0) {
    throw new Error(`Scene ${sceneKey} lists no clips.`);
  }

  const problems = [];
  const warnings = [];

  const segments = [];
  let cursor = TITLE_MS;

  for (const clipId of clipIds) {
    const manifest = readManifest(clipId);
    if (!manifest.videoPath) {
      throw new Error(`Clip "${clipId}" has no video file in its manifest.`);
    }
    const videoAbs = path.join(repoRoot, manifest.videoPath);
    if (!fs.existsSync(videoAbs)) {
      throw new Error(`Clip video is missing: ${manifest.videoPath}`);
    }
    const seekMs = Math.max(0, Number(manifest.contextLeadInMs) - PRE_ROLL_MS);
    const preRollMs = Number(manifest.contextLeadInMs) - seekMs;
    const durationMs = Number(manifest.durationMs) + preRollMs;

    if (manifest.consoleErrors?.length) {
      warnings.push(
        `clip ${clipId} logged ${manifest.consoleErrors.length} console error(s) ` +
          `(documented finding): ${manifest.consoleErrors[0]}`,
      );
    }

    segments.push({
      clipId,
      role: manifest.role,
      roleLabel: manifest.roleLabel,
      videoAbs,
      videoRel: manifest.videoPath,
      seekMs,
      preRollMs,
      durationMs,
      startMs: cursor,
      endMs: cursor + durationMs,
      rawDurationMs: null,
      steps: manifest.steps ?? [],
    });

    cursor += durationMs;
  }

  const totalMs = cursor;
  const captions = [];

  segments.forEach((segment, index) => {
    for (const step of segment.steps) {
      const definition = scene.steps?.[step.id];
      if (!definition) {
        problems.push(
          `scene ${sceneKey} step "${step.id}" was recorded but has no caption in captions.ar.json`,
        );
        continue;
      }
      const startMs = segment.startMs + segment.preRollMs + Number(step.atMs);
      captions.push({
        id: step.id,
        text: definition.text,
        segment: index,
        clipId: segment.clipId,
        startMs,
        segmentEndMs: segment.endMs,
        desiredMs: captionDurationMs(definition.text),
      });
    }
  });

  // The renderer needs a caption for every recorded step, because the promise of
  // the video is that every line is proven by something already asserted on
  // screen. A caption with no step is just as wrong: nobody saw that screen.
  for (const stepId of Object.keys(scene.steps ?? {})) {
    if (!captions.some((caption) => caption.id === stepId)) {
      problems.push(
        `scene ${sceneKey} caption "${stepId}" has no recorded step`,
      );
    }
  }

  captions.sort((a, b) => a.startMs - b.startMs);

  captions.forEach((caption, index) => {
    problems.push(...validateCaption(sceneKey, caption.id, caption.text));
    const next = captions[index + 1];
    const limits = [caption.segmentEndMs - TAIL_GUARD_MS];
    if (next) limits.push(next.startMs - GAP_MS);
    const limitMs = Math.min(...limits) - caption.startMs;
    caption.durationMs = Math.min(caption.desiredMs, limitMs);
    caption.endMs = caption.startMs + caption.durationMs;

    if (caption.durationMs < MIN_CAPTION_MS) {
      problems.push(
        `scene ${sceneKey} step "${caption.id}" would show for ` +
          `${Math.round(caption.durationMs)} ms, minimum is ${MIN_CAPTION_MS} ms. ` +
          `Move the next step at least ${Math.ceil(
            MIN_CAPTION_MS + GAP_MS - limitMs,
          )} ms later.`,
      );
    }
    if (caption.durationMs < caption.desiredMs) {
      warnings.push(
        `scene ${sceneKey} step "${caption.id}" is clamped to ` +
          `${Math.round(caption.durationMs)} ms (wanted ${caption.desiredMs} ms)`,
      );
    }
  });

  const uncoveredMs = captions.reduce((sum, c) => sum + c.durationMs, 0);
  const coverage = totalMs > 0 ? uncoveredMs / totalMs : 0;

  return {
    sceneKey,
    number: scene.number,
    name: scene.name,
    kicker: scene.kicker,
    title: `${scene.number} — ${scene.name}`,
    targetSeconds: Number(scene.targetSeconds ?? 0),
    titleMs: TITLE_MS,
    totalMs,
    fps: FPS,
    width: WIDTH,
    height: HEIGHT,
    coverage,
    segments,
    captions,
    problems,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Overlay artwork (HTML -> PNG with Playwright, real Cairo font)
// ---------------------------------------------------------------------------

const fontData = fs
  .readFileSync(path.join(marketingRoot, 'assets', 'fonts', 'Cairo-Variable.ttf'))
  .toString('base64');

const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
function arabicNumber(value) {
  return String(value)
    .split('')
    .map((char) => (/[0-9]/.test(char) ? ARABIC_DIGITS[Number(char)] : char))
    .join('');
}

const baseCss = `
  @font-face {
    font-family: 'Cairo';
    src: url(data:font/ttf;base64,${fontData}) format('truetype');
    font-weight: 200 1000;
    font-display: block;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: transparent; }
  body {
    font-family: 'Cairo', sans-serif;
    -webkit-font-smoothing: antialiased;
    width: ${WIDTH}px;
    height: ${HEIGHT}px;
    overflow: hidden;
  }
`;

function titleHtml(plan) {
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8"><style>
${baseCss}
  .card {
    position: relative;
    width: ${WIDTH}px;
    height: ${HEIGHT}px;
    overflow: hidden;
    background:
      radial-gradient(1200px 700px at 78% 18%, rgba(56, 132, 255, 0.55), transparent 62%),
      radial-gradient(900px 620px at 12% 88%, rgba(29, 78, 216, 0.45), transparent 60%),
      linear-gradient(135deg, #061127 0%, #0B1C40 46%, #122A63 100%);
  }
  .ring {
    position: absolute;
    border-radius: 50%;
    border: 2px solid rgba(147, 197, 253, 0.16);
  }
  .ring.r1 { width: 1180px; height: 1180px; left: -420px; top: -330px; }
  .ring.r2 { width: 760px; height: 760px; left: -210px; bottom: -400px; border-color: rgba(147, 197, 253, 0.1); }
  .glow {
    position: absolute;
    border-radius: 50%;
    filter: blur(10px);
  }
  .glow.g1 { width: 340px; height: 340px; right: 210px; top: 120px; background: rgba(96, 165, 250, 0.18); }
  .glow.g2 { width: 200px; height: 200px; right: 660px; bottom: 190px; background: rgba(56, 189, 248, 0.12); }

  .num {
    position: absolute;
    left: 96px;
    top: 50%;
    transform: translateY(-52%);
    font-size: 420px;
    font-weight: 800;
    line-height: 1;
    color: rgba(255, 255, 255, 0.075);
    letter-spacing: -8px;
  }

  .content {
    position: absolute;
    right: 132px;
    top: 50%;
    transform: translateY(-50%);
    text-align: right;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }
  .kicker {
    font-size: 40px;
    font-weight: 600;
    color: #7DD3FC;
    letter-spacing: 1px;
    margin-bottom: 18px;
  }
  .name {
    font-size: 122px;
    font-weight: 800;
    line-height: 1.12;
    color: #FFFFFF;
  }
  .bar {
    width: 132px;
    height: 8px;
    border-radius: 99px;
    background: linear-gradient(90deg, #38BDF8, #2563EB);
    margin-top: 34px;
  }
  .brand {
    position: absolute;
    right: 132px;
    bottom: 84px;
    font-size: 30px;
    font-weight: 600;
    color: rgba(226, 240, 255, 0.62);
  }
  .count {
    position: absolute;
    left: 108px;
    bottom: 84px;
    font-size: 28px;
    font-weight: 600;
    color: rgba(147, 197, 253, 0.8);
    letter-spacing: 1px;
  }
</style></head>
<body>
  <div class="card">
    <div class="ring r1"></div>
    <div class="ring r2"></div>
    <div class="glow g1"></div>
    <div class="glow g2"></div>
    <div class="num">${plan.number}</div>
    <div class="content">
      <div class="kicker">${plan.kicker}</div>
      <div class="name">${plan.name}</div>
      <div class="bar"></div>
    </div>
    <div class="brand">نظام إدارة المراكز التعليمية</div>
    <div class="count">القسم ${plan.number} من ${arabicNumber(10)}</div>
  </div>
</body></html>`;
}

function captionHtml(text) {
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8"><style>
${baseCss}
  body {
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding-bottom: ${BOTTOM_PX}px;
  }
  .cap {
    display: inline-block;
    max-width: 1440px;
    padding: 26px 62px 30px;
    border-radius: 32px;
    background: rgba(7, 17, 36, 0.9);
    border: 1px solid rgba(147, 197, 253, 0.18);
    box-shadow: 0 24px 60px rgba(2, 6, 23, 0.45);
    color: #F8FAFC;
    font-size: 56px;
    font-weight: 700;
    line-height: 1.4;
    text-align: center;
    white-space: normal;
    text-wrap: balance;
  }
</style></head>
<body><div class="cap" id="cap">${text}</div></body></html>`;
}

async function renderArtwork(browser, plan) {
  const outDir = path.join(overlayRoot, `scene-${String(plan.sceneKey).padStart(2, '0')}`);
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  const page = await browser.newPage({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
  });

  const titlePath = path.join(outDir, 'title.png');
  await page.setContent(titleHtml(plan), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: titlePath });

  const captionPaths = [];
  for (let index = 0; index < plan.captions.length; index += 1) {
    const caption = plan.captions[index];
    const file = path.join(
      outDir,
      `cap-${String(index + 1).padStart(2, '0')}-${caption.id}.png`,
    );
    await page.setContent(captionHtml(caption.text), { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.locator('#cap').screenshot({ path: file, omitBackground: true });
    caption.png = file;
    captionPaths.push(file);
  }

  await page.close();

  return { outDir, titlePath, captionPaths };
}

// ---------------------------------------------------------------------------

const browser = await chromium.launch();
const summaries = [];

try {
  const plans = [];
  for (const key of requestedScenes) {
    const plan = buildPlan(key);
    plans.push(plan);
  }

  const problems = plans.flatMap((plan) => plan.problems);
  if (problems.length > 0) {
    throw new Error(
      'Timeline is not renderable:\n  - ' + problems.join('\n  - '),
    );
  }

  for (const plan of plans) {
    for (const warning of plan.warnings) {
      console.log(`[overlays] warning: ${warning}`);
    }
    const artwork = await renderArtwork(browser, plan);
    const outDir = artwork.outDir;

    const renderPlan = {
      sceneKey: plan.sceneKey,
      number: plan.number,
      name: plan.name,
      kicker: plan.kicker,
      title: plan.title,
      targetSeconds: plan.targetSeconds,
      titleMs: plan.titleMs,
      totalMs: plan.totalMs,
      fps: plan.fps,
      width: plan.width,
      height: plan.height,
      captionBottomPx: BOTTOM_PX,
      captionFadeMs: 240,
      titlePng: artwork.titlePath,
      segments: plan.segments.map((segment) => ({
        clipId: segment.clipId,
        role: segment.role,
        roleLabel: segment.roleLabel,
        videoAbs: segment.videoAbs,
        videoRel: segment.videoRel,
        seekMs: segment.seekMs,
        preRollMs: segment.preRollMs,
        durationMs: segment.durationMs,
        startMs: segment.startMs,
        endMs: segment.endMs,
      })),
      captions: plan.captions.map((caption) => ({
        id: caption.id,
        text: caption.text,
        clipId: caption.clipId,
        startMs: caption.startMs,
        endMs: caption.endMs,
        durationMs: caption.durationMs,
        png: caption.png,
      })),
      coverage: Number(plan.coverage.toFixed(3)),
      renderedAt: new Date().toISOString(),
    };

    fs.writeFileSync(
      path.join(outDir, 'plan.json'),
      JSON.stringify(renderPlan, null, 2),
      'utf8',
    );

    summaries.push(renderPlan);
    console.log(
      `[overlays] scene ${plan.number} (${plan.name}): ` +
        `${ffTime(plan.totalMs)}s, ${renderPlan.captions.length} captions, ` +
        `caption coverage ${(plan.coverage * 100).toFixed(0)}% -> ${rel(outDir)}`,
    );
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify({ scenes: summaries.map((s) => s.number) }));
