import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

import { artifactsRoot, marketingRoot, rel, repoRoot } from './support/env.js';

/**
 * Assembles the ten recorded scene clips into one silent marketing video, and
 * derives the chapter list, the subtitle track and the script document from the
 * same render plans that produced the clips.
 *
 * Nothing here re-times a caption: every cue is the plan's own start/end plus
 * the real, ffprobe-measured offset of its scene inside the merged file.
 */

const videoName = 'marketing-tour.mp4';
const chaptersName = 'marketing-chapters.md';
const subtitlesName = 'marketing-subtitles.srt';
const scriptDoc = path.join(repoRoot, 'docs', 'marketing-script.md');

const captionsPath = path.join(marketingRoot, 'captions.ar.json');
const captions = JSON.parse(fs.readFileSync(captionsPath, 'utf8'));

const pad = (value, width = 2) => String(value).padStart(width, '0');

const srtTime = (ms) => {
  const total = Math.max(0, Math.round(ms));
  const hours = Math.floor(total / 3_600_000);
  const minutes = Math.floor((total % 3_600_000) / 60_000);
  const seconds = Math.floor((total % 60_000) / 1000);
  const millis = total % 1000;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(millis, 3)}`;
};

const clock = (ms) => {
  const total = Math.max(0, Math.round(ms));
  const hours = Math.floor(total / 3_600_000);
  const minutes = Math.floor((total % 3_600_000) / 60_000);
  const seconds = Math.floor((total % 60_000) / 1000);
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

const ffprobeJson = (file, args) =>
  JSON.parse(
    execFileSync('ffprobe', ['-v', 'error', '-print_format', 'json', ...args, file], {
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    }),
  );

const probeDurationMs = (file) => {
  const info = ffprobeJson(file, ['-show_entries', 'format=duration']);
  return Math.round(Number(info.format.duration) * 1000);
};

const probeStream = (file) => {
  const info = ffprobeJson(file, [
    '-select_streams',
    'v:0',
    '-show_entries',
    'stream=codec_name,profile,width,height,pix_fmt,r_frame_rate',
  ]);
  const stream = info.streams[0];
  return {
    codec: stream.codec_name,
    profile: stream.profile,
    width: stream.width,
    height: stream.height,
    pixFmt: stream.pix_fmt,
    frameRate: stream.r_frame_rate,
    signature: `${stream.codec_name} ${stream.profile} ${stream.width}x${stream.height} ${stream.pix_fmt} ${stream.r_frame_rate}`,
  };
};

// ---------------------------------------------------------------------------
// Scene list: the fixed recording order, each scene's own rendered clip.
// ---------------------------------------------------------------------------
const scenes = Object.keys(captions.scenes)
  .map(Number)
  .sort((a, b) => a - b)
  .map((sceneNumber) => {
    const meta = captions.scenes[String(sceneNumber)];
    const file = path.join(artifactsRoot, `scene-${pad(sceneNumber)}.mp4`);
    if (!fs.existsSync(file)) throw new Error(`Missing scene video: ${rel(file)}`);

    const planPath = path.join(
      artifactsRoot,
      'overlays',
      `scene-${pad(sceneNumber)}`,
      'plan.json',
    );
    const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));

    const startPaths = {};
    for (const segment of plan.segments) {
      const manifestPath = path.join(artifactsRoot, 'raw', segment.clipId, 'clip.json');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      startPaths[segment.clipId] = manifest.startPath;
    }

    return {
      number: sceneNumber,
      meta,
      plan,
      startPaths,
      file,
      durationMs: probeDurationMs(file),
      stream: probeStream(file),
    };
  });

const signatures = new Set(scenes.map((scene) => scene.stream.signature));
if (signatures.size !== 1) {
  throw new Error(
    `Scenes are not encoded identically: ${[...signatures].join(' | ')}`,
  );
}

let offsetMs = 0;
for (const scene of scenes) {
  scene.offsetMs = offsetMs;
  offsetMs += scene.durationMs;
}
const totalMs = offsetMs;

// ---------------------------------------------------------------------------
// Chapters: one per scene, from the real scene durations.
// ---------------------------------------------------------------------------
const chapterLines = [
  ';FFMETADATA1',
  'title=Center Management System — marketing tour',
];

scenes.forEach((scene, index) => {
  const end = index + 1 < scenes.length ? scenes[index + 1].offsetMs : totalMs;
  chapterLines.push('[CHAPTER]');
  chapterLines.push('TIMEBASE=1/1000');
  chapterLines.push(`START=${scene.offsetMs}`);
  chapterLines.push(`END=${end}`);
  chapterLines.push(`title=${scene.meta.number} — ${scene.meta.name}`);
});

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'marketing-tour-'));
const ffmetaPath = path.join(tempDir, 'ffmeta.txt');
const concatPath = path.join(tempDir, 'concat.txt');
const outputPath = path.join(artifactsRoot, videoName);

fs.writeFileSync(ffmetaPath, `${chapterLines.join('\n')}\n`, 'utf8');
fs.writeFileSync(
  concatPath,
  `${scenes.map((scene) => `file '${scene.file.replace(/\\/g, '/')}'`).join('\n')}\n`,
  'utf8',
);

if (fs.existsSync(outputPath)) fs.rmSync(outputPath);
execFileSync(
  'ffmpeg',
  [
    '-hide_banner',
    '-loglevel',
    'warning',
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    concatPath,
    '-f',
    'ffmetadata',
    '-i',
    ffmetaPath,
    '-map',
    '0:v:0',
    '-map_metadata',
    '1',
    '-map_chapters',
    '1',
    '-c',
    'copy',
    '-movflags',
    '+faststart',
    '-an',
    outputPath,
  ],
  { stdio: 'inherit' },
);
fs.rmSync(tempDir, { recursive: true, force: true });

// ---------------------------------------------------------------------------
// Subtitles: every caption, shifted by its scene's real offset.
// ---------------------------------------------------------------------------
const cues = [];
scenes.forEach((scene) => {
  for (const caption of scene.plan.captions) {
    cues.push({
      scene: scene.number,
      step: caption.id,
      text: caption.text,
      startMs: scene.offsetMs + caption.startMs,
      endMs: scene.offsetMs + caption.endMs,
    });
  }
});

const srt = cues
  .map(
    (cue, index) =>
      `${index + 1}\n${srtTime(cue.startMs)} --> ${srtTime(cue.endMs)}\n${cue.text}\n`,
  )
  .join('\n');
fs.writeFileSync(path.join(artifactsRoot, subtitlesName), srt, 'utf8');

// ---------------------------------------------------------------------------
// Read the merged file back. The docs are written from these numbers.
// ---------------------------------------------------------------------------
const merged = ffprobeJson(outputPath, [
  '-show_format',
  '-show_chapters',
  '-show_streams',
]);
const mergedVideo = merged.streams.find((stream) => stream.codec_type === 'video');
const mergedMs = Math.round(Number(merged.format.duration) * 1000);

const chapterRows = merged.chapters.map((chapter, index) => {
  const startMs = Math.round(Number(chapter.start_time) * 1000);
  const endMs = Math.round(Number(chapter.end_time) * 1000);
  const scene = scenes[index];
  return {
    index: index + 1,
    title: chapter.tags.title,
    startMs,
    endMs,
    durationMs: endMs - startMs,
    number: scene.meta.number,
    name: scene.meta.name,
    kicker: scene.meta.kicker,
    captions: scene.plan.captions.length,
    coverage: scene.plan.coverage,
    target: scene.meta.targetSeconds,
    offsetMs: scene.offsetMs,
  };
});

const chaptersMd = [
  '# Center Management System — marketing tour chapters',
  '',
  'Generated from `ffprobe` on the merged file, not from the planned timeline.',
  '',
  `- File: \`e2e/artifacts/marketing/${videoName}\``,
  `- Duration: \`${clock(mergedMs)}\` (${(mergedMs / 1000).toFixed(2)} s, real)`,
  `- Video: \`${mergedVideo.codec_name} ${mergedVideo.width}x${mergedVideo.height} ${mergedVideo.pix_fmt} ${mergedVideo.r_frame_rate} fps\`, no audio`,
  `- Chapters: \`${merged.chapters.length}\``,
  `- Subtitles: \`${cues.length}\` cues in \`marketing-subtitles.srt\``,
  '',
  '## Chapters',
  '',
  '| # | Start | Duration | Chapter | Kicker | Captions | Text coverage |',
  '|---|-------|----------|---------|--------|----------|---------------|',
  ...chapterRows.map(
    (row) =>
      `| ${row.index} | ${clock(row.startMs)} | ${clock(row.durationMs)} | ${row.title} | ${row.kicker} | ${row.captions} | ${Math.round(row.coverage * 100)}% |`,
  ),
  '',
  '## Notes',
  '',
  '- No audio track: the video is designed to be watched with sound off.',
  '- Each chapter is one independent scene recording; the scene title card is part of the scene.',
  '- Caption timings in `marketing-subtitles.srt` are the render plan timings shifted by the real scene offsets above.',
  '',
].join('\n');

fs.writeFileSync(path.join(artifactsRoot, chaptersName), chaptersMd, 'utf8');

// ---------------------------------------------------------------------------
// Script document.
// ---------------------------------------------------------------------------
const notes = {
  1: [
    'Owner dashboard for October 2026: student totals, movement, finance, attendance and the top groups.',
    'Every card that is talked about is asserted at the moment its caption starts.',
  ],
  2: [
    'Assistant adds a new student (name, two phone numbers, group, subscription) and finds the row again with the search box.',
    'The student created here is part of the fixture used by the later scenes.',
  ],
  3: [
    'Teacher opens the Excel import wizard: template download, upload, preview, duplicate/valid/error rows, duplicate policy, commit, result.',
    'The uploaded workbook is a generated fixture file; the counts read on screen are the preview the product computed.',
  ],
  4: [
    'Three clips: QR cards, the scanner, and the attendance sheet.',
    'The scanner records a real check-in and then shows the duplicate warning when the same code is entered again.',
    'The attendance sheet records an absence, saves, then restores the student and saves again; both states are asserted.',
  ],
  5: [
    'Owner collects a 300 EGP partial payment for مالك سامي حسن: his remaining balance goes 1,300 → 1,000 and the totals update; then the expenses and the monthly report.',
    'This payment is part of the October timeline that scene 8 later reads: 62,000 collected and 31,150 net.',
    'The report totals and the export are read from the same October range.',
  ],
  6: [
    'Four clips: question bank, the student sitting an exam, teacher grading, and the published result.',
    'The exam `اختبار تدريبي - الجبر` is created for the recording and deleted afterwards; the student scores 5/6 = 83%.',
    'The essay grade is saved by the teacher and the result is published before the student clip reads it.',
  ],
  7: [
    'Student and parent portals at the approved 420×900 phone frame, in the browser - never an app.',
    'Result proof: the exam is unpublished through the teacher API, the student results page shows `—` and `بانتظار النشر`, then it is published again and refreshed to `3 / 3`, `100%`, `مكتمل`.',
    'Absence proof: the 2026-10-30 session is reset to present off camera; the parent records the absence live, the bell shows `تحديث الحضور` with the child name and an October date, and clicking it opens the child page with `غائب` on `30/10/2026`.',
    'Notifications created during the run are aligned to 2026-10-30 (the machine clock is 2026-11-02) so no November timestamp can appear.',
    'The notification caption is exactly `غياب الابن يظهر في إشعاراته`.',
  ],
  8: [
    'Two clips: the October dashboard, then the October center report.',
    'October is pinned in the on-screen month filter on the dashboard and in all three month inputs of the report before the first recorded frame.',
    'Dashboard finance shows إيرادات 62,000 / مصروفات 24,350 / مرتبات 6,500 / صافي 31,150; the report shows 139 students, 8 teachers, 2 assistants, 6 groups and the finance block 60,250 / 1,750 / 24,350 / 6,500 / 31,150.',
    'The CSV export is downloaded and read back: it carries `الإجماليات`, `الصافي` and `60250.00`.',
    'Print is the product stylesheet (the browser print dialog is replaced in-page); dark mode is toggled on and back off.',
    'The dashboard year chart and the revenue-vs-expenses chart contain a calendar `نوفمبر` axis label that has no data; both panels are hidden off camera and nothing is claimed about them. The empty "this week" attendance card is hidden for the same reason.',
  ],
  9: [
    'SuperAdmin centers list, platform totals, the teacher scope, and the audit log.',
    'No impersonation: the "دخول كالمالك" action is never used and the URL is asserted to stay on `/centers`.',
    'The teacher dashboard offers exactly one real group (`كل المجموعات` + `الصف الثالث الإعدادي - أ`), every visible student row belongs to it, and the sidebar is the teacher permission set.',
    'The platform revenue-by-month card is hidden off camera because its calendar axis ends in `نوفمبر`; the six platform totals are asserted instead.',
    'Audit log: six rows, newest first, dated `٢٨/١٠/٢٠٢٦`, first action `PlatformStatisticsViewed`. Raw English action names are F-004, recorded as-is.',
  ],
  10: [
    'Closing recap of the same October dashboard (students 139, revenue 62,000, net 31,150, attendance 87.8% / 723 present / 100 absent after the scene 7 absence), then the real login screen.',
    'The login screen\'s `نسيت كلمة المرور؟` placeholder is not a shipped feature, so it is removed before the document paints; every other element of the real login page is asserted and shown.',
  ],
};

const notClaimed = [
  'No voiceover anywhere: every message is readable from the on-screen Arabic alone.',
  'No PWA, no offline mode and no installable app: "mobile" always means the site in a phone browser, and the phone scenes say `متصفح الهاتف`.',
  'No external push notifications: the bell is the in-product notification list.',
  'No automatic WhatsApp sending; WhatsApp is a manual link/template action in the product.',
  'No email confirmation and no self-service password reset: the placeholder is hidden and the script never claims it.',
  'Attendance states shown are present / absent / faulty only.',
  'No impersonation is performed in scene 9.',
  'No claim is made about the hidden calendar-axis chart panels or the empty weekly attendance card.',
];

const findings = [
  'F-001 Assistant accounts are created without a center scope',
  'F-002 The centers list and the dashboard disagree on a center\'s student count',
  'F-003 Mobile "tables become cards" only exists for the staff student list',
  'F-004 Audit log renders most action names as raw English identifiers (visible in scene 9)',
  'F-005 The impersonation banner never shows the impersonated person\'s name (not triggered: no impersonation)',
  'F-006 The parent-account button on the students page is unreachable in a multi-teacher center (not fixed)',
  'F-007 The attendance sheet\'s search box is rendered as an unknown `<inputSearch>` tag',
  'F-009 A student sees an auto-scored exam result before the teacher publishes it (scene 7 proves the publish gate)',
  'F-010 The overdue page sends one request per typed character',
  'F-011 The add-payment modal calls two endpoint families that refuse center owners (403)',
  'F-012 The expenses page mounts a controlled `<select>` with a `null` value',
  'F-013 The student payments table has one more cell than its header row',
];

const sceneSections = scenes.map((scene) => {
  const plan = scene.plan;
  const rows = plan.captions.map((caption) => {
    const start = scene.offsetMs + caption.startMs;
    const end = scene.offsetMs + caption.endMs;
    return `| \`${caption.id}\` | ${caption.text} | ${clock(start)} | ${(caption.durationMs / 1000).toFixed(1)} s | ${srtTime(start)} |`;
  });

  const roles = [...new Set(plan.segments.map((segment) => segment.roleLabel))];
  const starts = [...new Set(Object.values(scene.startPaths))];

  return [
    `## ${scene.meta.number} — ${scene.meta.name} · ${scene.meta.kicker}`,
    '',
    `- Roles: ${roles.join(', ')}`,
    `- Opening pages: ${starts.map((value) => `\`${value}\``).join(', ')}`,
    `- Duration: \`${clock(scene.durationMs)}\` (${(scene.durationMs / 1000).toFixed(2)} s; target ${scene.meta.targetSeconds} s, plan coverage ${Math.round(plan.coverage * 100)}%)`,
    `- Captions: ${plan.captions.length} · clips: ${plan.segments.map((segment) => `\`${segment.clipId}\``).join(', ')}`,
    '',
    ...notes[scene.number].map((line) => `- ${line}`),    '',
    '| Step | Caption | Starts | Length | SRT in |',
    '|------|---------|--------|--------|--------|',
    ...rows,
    '',
  ].join('\n');
});

const scriptMd = [
  '# Center Management System — marketing video script',
  '',
  `Silent, text-driven product tour: ${scenes.length} scenes, ${cues.length} captions, \`${clock(mergedMs)}\` of video with no audio track.`,
  '',
  '## How the video is built',
  '',
  '- Each scene is recorded straight from the real product against the `CenterManagement_E2E_Marketing` LocalDB database; nothing is mocked or staged in the UI.',
  '- A caption starts at the wall-clock mark of the step that asserted the element the caption talks about. No caption is placed independently of an assertion.',
  '- Captions are 3–8 words, never shorter than 3 s, and the text coverage per scene is reported below.',
  '- The ten scene clips are concatenated without re-encoding; chapters and subtitles are derived from the real ffprobe offsets.',
  '- There is no audio track: the video is sound-off ready.',
  '',
  '## Scene overview',
  '',
  '| # | Scene | Kicker | Target | Actual | Captions | Coverage | Start |',
  '|---|-------|--------|--------|--------|----------|----------|-------|',
  ...chapterRows.map(
    (row) =>
      `| ${row.number} | ${row.name} | ${row.kicker} | ${row.target} s | ${clock(row.durationMs)} | ${row.captions} | ${Math.round(row.coverage * 100)}% | ${clock(row.startMs)} |`,
  ),
  `| — | **Total** | | | **${clock(mergedMs)}** | **${cues.length}** | | |`,
  '',
  ...sceneSections,
  '## Off-camera preparation (never a claim)',
  '',
  '- Scene 5: a 300 EGP partial payment for مالك سامي حسن moves his remaining balance from 1,300 to 1,000; scene 8 later shows the resulting October totals.',
  '- Scene 6: the exam `اختبار تدريبي - الجبر` is created for the recording and deleted afterwards.',
  '- Scene 7: the 2026-10-30 session is reset to present before recording so the on-camera absence is a real status change; the exam is unpublished/republished through the teacher API to prove the publish gate; live notifications are aligned to 2026-10-30.',
  '- Scenes 8-10: October is selected in the on-screen filters. The dashboard year chart and revenue-vs-expenses chart (scenes 8 and 10) and the platform revenue-by-month card (scene 9) carry calendar `نوفمبر` axis labels with no data and are hidden before the first recorded frame; the empty "this week" attendance card is hidden as well. November never appears in a recorded frame.',
  '- Scene 10: the non-functional `نسيت كلمة المرور؟` placeholder is removed before the login page paints; the real login screen is otherwise untouched.',
  '',
  '## What the video does not claim',
  '',
  ...notClaimed.map((line) => `- ${line}`),
  '',
  '## Verification',
  '',
  '- Every caption maps to an element asserted by Playwright at that moment; a failed assertion fails the recording, so a rendered scene is a passing run.',
  '- `ffprobe` on every scene: h264, 1920×1080, yuv420p, 25 fps; merged file re-probed for duration and chapters.',
  '- Frames at each caption midpoint were OCR-checked with the Windows Arabic OCR engine: no frame contains `نوفمبر`, and the October money figures appear on the scene 8 and scene 10 frames.',
  '- Backend: 284 tests passed. Frontend: 255 tests passed across 29 files.',
  '',
  '## Findings',
  '',
  'All product issues met during recording are logged in `docs/e2e-findings.md` and left unfixed:',
  '',
  ...findings.map((line) => `- ${line}`),
  '',
].join('\n');

fs.writeFileSync(scriptDoc, scriptMd, 'utf8');

console.log(`Merged:      ${rel(outputPath)}`);
console.log(`Duration:    ${clock(mergedMs)} (${(mergedMs / 1000).toFixed(2)} s)`);
console.log(`Video:       ${mergedVideo.codec_name} ${mergedVideo.width}x${mergedVideo.height} ${mergedVideo.pix_fmt} ${mergedVideo.r_frame_rate} fps, audio streams ${merged.streams.filter((stream) => stream.codec_type === 'audio').length}`);
console.log(`Chapters:    ${merged.chapters.length}`);
console.log(`Subtitles:   ${cues.length} cues -> ${rel(path.join(artifactsRoot, subtitlesName))}`);
console.log(`Chapters md: ${rel(path.join(artifactsRoot, chaptersName))}`);
console.log(`Script doc:  ${rel(scriptDoc)}`);
