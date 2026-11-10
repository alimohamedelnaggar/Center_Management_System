/**
 * Downloads the local, OFL-licensed fonts used by the three design directions.
 *
 * Run from docs/design:  node fetch-fonts.mjs
 *
 * Output:
 *   fonts/<family>/<family>-<weight>-<subset>.woff2
 *   fonts/direction-a.css | direction-b.css | direction-c.css
 *   fonts/licenses/<family>-OFL.txt
 *
 * Nothing is fetched at runtime: the HTML files only reference local files.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const FONTS = join(ROOT, "fonts");
const LICENSES = join(FONTS, "licenses");

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

const FAMILIES = {
  "ibm-plex-sans-arabic": {
    css: "IBM Plex Sans Arabic:wght@400;500;600;700",
    license: "ibmplexsansarabic",
  },
  "ibm-plex-mono": {
    css: "IBM Plex Mono:wght@400;500;600;700",
    license: "ibmplexmono",
  },
  tajawal: {
    css: "Tajawal:wght@400;500;700",
    license: "tajawal",
  },
  manrope: {
    css: "Manrope:wght@400..800",
    license: "manrope",
  },
  rubik: {
    css: "Rubik:wght@400..700",
    license: "rubik",
  },
  "dm-sans": {
    css: "DM Sans:wght@400..700",
    license: "dmsans",
  },
};

const DIRECTIONS = {
  a: ["ibm-plex-sans-arabic", "ibm-plex-mono"],
  b: ["tajawal", "manrope"],
  c: ["rubik", "dm-sans"],
};

const SUBSETS = new Set(["arabic", "latin"]);

function slugWeight(weight) {
  return weight.trim().replace(/\s+/g, "_");
}

async function fetchText(url) {
  const response = await fetch(url, { headers: { "User-Agent": UA } });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} for ${url}`);
  }
  return response.text();
}

async function fetchBuffer(url) {
  const response = await fetch(url, { headers: { "User-Agent": UA } });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} for ${url}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function buildFamily(slug, config) {
  const cssUrl =
    `https://fonts.googleapis.com/css2?family=${config.css.replaceAll(" ", "+")}` +
    "&display=swap";
  const css = await fetchText(cssUrl);
  const dir = join(FONTS, slug);
  await mkdir(dir, { recursive: true });

  const blocks = [];
  const pattern = /\/\*\s*([a-z0-9-]+)\s*\*\/\s*@font-face\s*\{([^}]+)\}/gi;
  let match;

  while ((match = pattern.exec(css)) !== null) {
    const subset = match[1];
    const body = match[2];

    if (!SUBSETS.has(subset)) continue;

    const weight = body.match(/font-weight:\s*([^;]+);/i)?.[1]?.trim();
    const style = body.match(/font-style:\s*([^;]+);/i)?.[1]?.trim();
    const family = body.match(/font-family:\s*'([^']+)'/i)?.[1];
    const src = body.match(/url\(([^)]+)\)/i)?.[1];
    const range = body.match(/unicode-range:\s*([^;]+);/i)?.[1]?.trim();

    if (!weight || !family || !src || style !== "normal") continue;

    const file = `${slug}-${slugWeight(weight)}-${subset}.woff2`;
    const bytes = await fetchBuffer(src);
    await writeFile(join(dir, file), bytes);

    blocks.push({ family, weight, range, url: `./${slug}/${file}` });
    console.log(`${slug}/${file}  ${(bytes.length / 1024).toFixed(1)} KB`);
  }

  const licenseUrl =
    `https://raw.githubusercontent.com/google/fonts/main/ofl/` +
    `${config.license}/OFL.txt`;
  const license = await fetchText(licenseUrl);
  await writeFile(join(LICENSES, `${slug}-OFL.txt`), license, "utf8");
  console.log(`${slug} OFL.txt  ${(license.length / 1024).toFixed(1)} KB`);

  return blocks;
}

async function main() {
  await mkdir(LICENSES, { recursive: true });

  const bySlug = {};
  for (const [slug, config] of Object.entries(FAMILIES)) {
    bySlug[slug] = await buildFamily(slug, config);
  }

  for (const [direction, slugs] of Object.entries(DIRECTIONS)) {
    const blocks = slugs.flatMap((slug) => bySlug[slug]);
    const css = blocks
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

    await writeFile(join(FONTS, `direction-${direction}.css`), css + "\n", "utf8");
    console.log(`fonts/direction-${direction}.css  (${blocks.length} faces)`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
