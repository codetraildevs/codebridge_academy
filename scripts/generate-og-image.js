#!/usr/bin/env node
/**
 * generate-og-image.js — builds assets/images/og-image.jpg (1200x630)
 * the social preview image for Open Graph / Twitter cards.
 *
 * Design notes:
 * - sharp renders SVG via librsvg with no network access, so text uses
 *   system serif fonts (Georgia) — NOT the site webfonts.
 * - The logo is a wide 886x675 mark; it sits on a white rounded chip
 *   so it stays legible on the dark gradient.
 *
 * Re-run only when the og image needs to change:
 *   node scripts/generate-og-image.js
 */
const sharp = require('sharp');
const path = require('path');

const WIDTH = 1200;
const HEIGHT = 630;

async function main() {
  const logoWebp = path.join(__dirname, '..', 'assets', 'images', 'update_logo.webp');
  const out = path.join(__dirname, '..', 'assets', 'images', 'og-image.jpg');

  // Code-panel lines: [indent, width, color]
  const codeLines = [
    [0, 210, '#93C5FD'],
    [24, 150, '#F9A825'],
    [24, 240, '#E2E8F0'],
    [48, 120, '#86EFAC'],
    [48, 190, '#93C5FD'],
    [24, 160, '#E2E8F0'],
    [0, 200, '#F9A825'],
    [24, 230, '#E2E8F0'],
    [24, 110, '#86EFAC'],
  ].map(([indent, w, color], i) => {
    const y = 196 + i * 30;
    return `<rect x="${820 + indent}" y="${y}" width="${w}" height="10" rx="5" fill="${color}" opacity="0.85"/>`;
  }).join('\n      ');

  // 1. Background scene (everything except the raster logo)
  const base = Buffer.from(
    `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0057B8"/>
          <stop offset="55%" stop-color="#003D82"/>
          <stop offset="100%" stop-color="#00234F"/>
        </linearGradient>
        <linearGradient id="panel" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#0B1B33" stop-opacity="0.92"/>
          <stop offset="100%" stop-color="#081428" stop-opacity="0.85"/>
        </linearGradient>
      </defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#g)"/>

      <!-- soft glow behind code panel -->
      <circle cx="1000" cy="120" r="210" fill="#60A5FA" opacity="0.10"/>
      <circle cx="1140" cy="560" r="150" fill="#F3761A" opacity="0.08"/>

      <!-- orange brand spine -->
      <rect x="0" y="0" width="12" height="${HEIGHT}" fill="#F3761A"/>

      <!-- diagonal accent, bottom-left -->
      <path d="M0 ${HEIGHT * 0.86} L340 ${HEIGHT} L0 ${HEIGHT} Z" fill="#FFFFFF" opacity="0.05"/>

      <!-- logo chip card (logo raster composited on top of this) -->
      <rect x="80" y="64" width="120" height="120" rx="24" fill="#FFFFFF"/>
      <rect x="80" y="64" width="120" height="120" rx="24" fill="none" stroke="#0057B8" stroke-opacity="0.15" stroke-width="2"/>

      <!-- brand name beside chip -->
      <text x="224" y="112" font-family="Georgia, 'Times New Roman', serif"
            font-size="36" font-weight="700" fill="#FFFFFF">CodeBridge Academy</text>
      <text x="224" y="152" font-family="Georgia, 'Times New Roman', serif"
            font-size="20" fill="#9FC3E8">Software Development &amp; Tech Training</text>

      <!-- headline (two-tone, mirrors the hero) -->
      <text x="80" y="308" font-family="Georgia, 'Times New Roman', serif"
            font-size="56" font-weight="700" fill="#FFFFFF">Building Digital</text>
      <text x="80" y="376" font-family="Georgia, 'Times New Roman', serif"
            font-size="56" font-weight="700" fill="#F9A825">Solutions.</text>
      <text x="80" y="466" font-family="Georgia, 'Times New Roman', serif"
            font-size="56" font-weight="700" fill="#FFFFFF">Developing Future</text>
      <text x="80" y="534" font-family="Georgia, 'Times New Roman', serif"
            font-size="56" font-weight="700" fill="#F9A825">Professionals.</text>

      <!-- supporting line -->
      <text x="80" y="586" font-family="Georgia, 'Times New Roman', serif"
            font-size="22" fill="#C7DBF3">Software Development &amp; Tech Training — Kigali, Rwanda</text>

      <!-- decorative code editor panel -->
      <rect x="790" y="120" width="330" height="390" rx="16" fill="url(#panel)" stroke="#FFFFFF" stroke-opacity="0.12" stroke-width="1.5"/>
      <circle cx="820" cy="150" r="7" fill="#FF5F56"/>
      <circle cx="844" cy="150" r="7" fill="#FFBD2E"/>
      <circle cx="868" cy="150" r="7" fill="#27C93F"/>
      <rect x="820" y="172" width="270" height="2" rx="1" fill="#FFFFFF" opacity="0.10"/>
      ${codeLines}
    </svg>`
  );

  // 2. Logo (WebP) fitted inside the 120px chip with padding
  const logo = await sharp(logoWebp)
    .resize(88, 88, { fit: 'inside' })
    .png()
    .toBuffer();

  // 3. Compose: background scene + logo on the chip
  const logoMeta = await sharp(logo).metadata();
  await sharp(base)
    .composite([
      {
        input: logo,
        left: 80 + Math.round((120 - logoMeta.width) / 2),
        top: 64 + Math.round((120 - logoMeta.height) / 2),
      },
    ])
    .jpeg({ quality: 88 })
    .toFile(out);

  const outMeta = await sharp(out).metadata();
  console.log(`✔ assets/images/og-image.jpg — ${outMeta.width}x${outMeta.height}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
