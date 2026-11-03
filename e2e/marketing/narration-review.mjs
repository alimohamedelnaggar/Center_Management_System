// Builds the narration timing plan and the Arabic review document from the
// draft beats. Each beat is anchored to the caption whose id matches the step
// that asserted the element it talks about, so the spoken line never runs
// ahead of the screen.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..', '..');
const marketing = path.join(root, 'e2e', 'marketing');
const artifacts = path.join(root, 'e2e', 'artifacts', 'marketing');

const narration = JSON.parse(fs.readFileSync(path.join(marketing, 'narration.ar.json'), 'utf8'));
const timings = JSON.parse(fs.readFileSync(path.join(artifacts, 'scene-timings.json'), 'utf8'));

const WPS = narration.meta.wordsPerSecond;
const sceneStarts = new Map();
let cursor = 0;
for (const scene of timings.scenes) {
  sceneStarts.set(String(scene.scene), cursor);
  cursor += scene.durationMs;
}

const words = (text) => text.trim().split(/\s+/u).filter(Boolean).length;
const mmss = (ms) => {
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const out = {
  meta: {
    source: 'e2e/marketing/narration.ar.json',
    wordsPerSecond: WPS,
    generatedAt: new Date().toISOString(),
    note: 'localMs is inside the scene; globalMs is inside marketing-tour.mp4. gapMs is the quiet room until the next beat.',
  },
  scenes: [],
};

let totalWords = 0;
let totalSpeechMs = 0;
let totalBeats = 0;
const problems = [];

for (const [sceneKey, scene] of Object.entries(narration.scenes)) {
  const plan = JSON.parse(
    fs.readFileSync(path.join(artifacts, 'overlays', `scene-${String(sceneKey).padStart(2, '0')}`, 'plan.json'), 'utf8'),
  );
  const byCaption = new Map(plan.captions.map((caption) => [caption.id, caption]));
  const sceneStart = sceneStarts.get(sceneKey);
  const beats = [];

  for (const beat of scene.beats) {
    const caption = byCaption.get(beat.atStep);
    if (!caption) {
      problems.push(`scene ${sceneKey}: no caption anchored at step ${beat.atStep}`);
      continue;
    }
    const w = words(beat.text);
    const estMs = Math.round((w / WPS) * 1000);
    totalWords += w;
    totalSpeechMs += estMs;
    totalBeats += 1;
    beats.push({
      atStep: beat.atStep,
      caption: caption.text,
      text: beat.text,
      localMs: caption.startMs,
      globalMs: sceneStart + caption.startMs,
      local: mmss(caption.startMs),
      global: mmss(sceneStart + caption.startMs),
      words: w,
      estMs,
    });
  }

  for (let i = 0; i < beats.length; i += 1) {
    const next = beats[i + 1];
    const end = next ? next.localMs : scene.durationMs;
    const gap = end - beats[i].localMs;
    beats[i].gapMs = gap;
    beats[i].fits = beats[i].estMs <= gap;
    if (!beats[i].fits) {
      problems.push(
        `scene ${sceneKey} beat ${beats[i].atStep}: needs ${(beats[i].estMs / 1000).toFixed(1)}s but only ${(gap / 1000).toFixed(1)}s until the next beat`,
      );
    }
  }

  out.scenes.push({
    scene: Number(sceneKey),
    name: scene.name,
    durationMs: scene.durationMs,
    startMs: sceneStart,
    beats,
  });
}

fs.writeFileSync(path.join(marketing, 'narration-timing.json'), `${JSON.stringify(out, null, 2)}\n`, 'utf8');

const lines = [];
lines.push('# التعليق الصوتي — النسخة العربية المصرية');
lines.push('');
lines.push('مسودة للمراجعة قبل تركيب أي صوت. مفيش أي حاجة اتثبتت أو اتولدت لسه.');
lines.push('');
lines.push('## قواعد ثابتة');
lines.push('');
lines.push('- صوت مصري عامي، من غير صوت صاحب الفيديو. الصوت هيتولد بـ TTS مجاني.');
lines.push('- كل جملة بتبدأ عند اللحظة اللي العنصر بتاعها ظهر فيها على الشاشة، مش قبلها.');
lines.push('- مفيش أي رقم أو ميزة مش ظاهرة في الفيديو. مفيش ذكر لتطبيق موبايل أو PWA أو دفع أونلاين.');
lines.push('- الشهر الظاهر في المشهد الثامن هو أكتوبر فقط.');
lines.push(`- السرعة المفترضة ${WPS} كلمة/ثانية (تقريب صوتي؛ هيتأكد بعد أول عينة).`);
lines.push('');
lines.push('## ملخص');
lines.push('');
lines.push(`- ${totalBeats} جملة، ${totalWords} كلمة، حوالي ${Math.round(totalSpeechMs / 1000)} ثانية كلام.`);
lines.push(`- إجمالي الفيديو 11:06، يعني الكلام حوالي ${Math.round((totalSpeechMs / 666200) * 100)}% من المدة.`);
lines.push('- باقي الوقت موسيقى خفيفة وصور بتتنفس.');
lines.push('');

for (const scene of out.scenes) {
  const speech = scene.beats.reduce((sum, beat) => sum + beat.estMs, 0);
  lines.push(`## المشهد ${scene.scene} — ${scene.name}`);
  lines.push('');
  lines.push(
    `المدة ${(scene.durationMs / 1000).toFixed(1)} ثانية · يبدأ عند ${mmss(scene.startMs)} · ${scene.beats.length} جمل · حوالي ${Math.round(speech / 1000)} ثانية كلام`,
  );
  lines.push('');
  lines.push('| الوقت داخل المشهد | الوقت في الفيديو | الجملة | كلمات | تقدير النطق | متاح قبل الجملة اللي بعدها |');
  lines.push('| --- | --- | --- | --- | --- | --- |');
  for (const beat of scene.beats) {
    const fit = beat.fits ? '' : ' ⚠️';
    lines.push(
      `| ${beat.local} | ${beat.global} | ${beat.text}<br><sub>على الشاشة: ${beat.caption}</sub> | ${beat.words} | ${(beat.estMs / 1000).toFixed(1)} ث${fit} | ${(beat.gapMs / 1000).toFixed(1)} ث |`,
    );
  }
  lines.push('');
}

lines.push('## حاجات محتاجة قرارك');
lines.push('');
lines.push('1. النص نفسه: لو عايز جملة أقصر أو أبسط، قول رقم المشهد والجملة.');
lines.push('2. الأرقام: هتتكتب في ملف الصوت بالكلمات المصرية (مثلاً «مية تسعة وتلاتين») عشان الصوت ينطقها طبيعي، والشاشة تفضل بأرقامها. التقدير في الجدول بيحسب الرقم كلمة واحدة، فالنطق الحقيقي هيكون أطول شوية. لو مش موافق قول.');
lines.push('3. الموسيقى: ياتختار ملف mp3/wav عندك، ياتتولّد موسيقى خفيفة محلية من غير تحميل أي حاجة محفوظة الحقوق.');
lines.push('');
lines.push('## الخطوة اللي بعد الموافقة');
lines.push('');
lines.push('- هقول اسم حزمة الـ TTS وإصدارها بالظبط، وأستنى موافقتك قبل التثبيت.');
lines.push('- بعد التثبيت: عينتين قصيرتين، صوت ست وصوت راجل (لو متاح)، تسمعهم وتختار.');
lines.push('- بعد الاختيار: توليد كل جملة، تركيبها في مواضعها، وموسيقى بتنزل وقت الكلام، ثم ملف جديد `marketing-tour-vo.mp4`.');
lines.push('');

fs.writeFileSync(path.join(root, 'docs', 'marketing-narration-ar.md'), `${lines.join('\n')}\n`, 'utf8');

console.log(JSON.stringify({ scenes: out.scenes.length, beats: totalBeats, words: totalWords, speechSeconds: Math.round(totalSpeechMs / 1000), problems }, null, 2));
