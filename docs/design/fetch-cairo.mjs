/**
 * Downloads Cairo (OFL) for the "before" replicas only. The production app
 * currently asks for Cairo but ships no local file, so the replica loads it
 * locally to make the baseline reproducible on any machine.
 *
 * Run from docs/design: node fetch-cairo.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const FONTS = join(ROOT, "fonts");
const SLUG = "cairo";
const DIR = join(FONTS, SLUG);
const LICENSES = join(FONTS, "licenses");

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

async function fetchText(url) {
  const response = await fetch(url, { headers: { "User-Agent": UA } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
  return response.text();
}

async function fetchBuffer(url) {
  const response = await fetch(url, { headers: { "User-Agent": UA } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

async function main() {
  await mkdir(DIR, { recursive: true });
  await mkdir(LICENSES, { recursive: true });

  const css = await fetchText(
    "https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap",
  );

  const blocks = [];
  const pattern = /\/\*\s*([a-z0-9-]+)\s*\*\/\s*@font-face\s*\{([^}]+)\}/gi;
  let match;

  while ((match = pattern.exec(css)) !== null) {
    const subset = match[1];
    const body = match[2];
    if (subset !== "arabic" && subset !== "latin") continue;

    const weight = body.match(/font-weight:\s*([^;]+);/i)?.[1]?.trim();
    const style = body.match(/font-style:\s*([^;]+);/i)?.[1]?.trim();
    const family = body.match(/font-family:\s*'([^']+)'/i)?.[1];
    const src = body.match(/url\(([^)]+)\)/i)?.[1];
    const range = body.match(/unicode-range:\s*([^;]+);/i)?.[1]?.trim();

    if (!weight || !family || !src || style !== "normal") continue;

    const file = `${SLUG}-${weight}-${subset}.woff2`;
    const bytes = await fetchBuffer(src);
    await writeFile(join(DIR, file), bytes);

    blocks.push({ family, weight, range, url: `./${SLUG}/${file}` });
    console.log(`${SLUG}/${file}  ${(bytes.length / 1024).toFixed(1)} KB`);
  }

  const license = await fetchText(
    "https://raw.githubusercontent.com/google/fonts/main/ofl/cairo/OFL.txt",
  );
  await writeFile(join(LICENSES, `${SLUG}-OFL.txt`), license, "utf8");

  const out = blocks
    .map(
      (block) => `/* ${block.family} ${block.weight} */
@font-face {
  font-family: "${block.family}";
  font-style: normal;
  font-weight: ${block.weight};
  font-display: swap;
  src: url("${block.url}") format("woff2");
  unicode-range: ${block.range};
}`,
    )
    .join("\n\n");

  await writeFile(join(FONTS, "cairo.css"), out + "\n", "utf8");
  console.log(`fonts/cairo.css  (${blocks.length} faces)`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
