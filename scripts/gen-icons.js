'use strict';

// Generates renderer/icons.js from assets/icons/*.svg, so the rail can show
// each provider's own app icon instead of a text label. The SVGs are inlined
// (not loaded at runtime) to keep the CSP simple and avoid file:// issues.

const fs = require('fs');
const path = require('path');

const ICONS_DIR = path.join(__dirname, '..', 'assets', 'icons');

// Provider id -> SVG file. Route details are displayed in the provider label.
const MAPPING = {
  claudeCode: 'claude.svg',
  codex: 'openai.svg',
  openRouter: 'openrouter.svg',
  deepSeek: 'deepseek.svg',
  kimi: 'kimi.svg',
  xiaomiMiMo: 'xiaomimimo.svg',
  antigravity: 'google.svg',
  vercelAiGateway: 'vercel.svg',
  minimax: 'minimax.svg',
  zhipu: 'zhipu.svg',
  ofox: 'ofox.svg',
};

function normalize(svg) {
  let s = svg
    .replace(/<title>[\s\S]*?<\/title>/, '') // drop the tooltip text
    .replace(/\sstyle=["'][^"']*["']/, '') // drop flex/line-height helpers
    .replace(/(\swidth)=(["'])[^"']*\2/, '$1="1em"') // let CSS size it
    .replace(/(\sheight)=(["'])[^"']*\2/, '$1="1em"')
    .trim();
  return s;
}

let out = "'use strict';\n\n// Provider app icons, inlined from assets/icons (see scripts/gen-icons.js).\nwindow.PULSE_ICONS = {\n";
for (const [id, spec] of Object.entries(MAPPING)) {
  const files = Array.isArray(spec) ? spec : [spec];
  const parts = [];
  let missing = false;
  for (const file of files) {
    const src = path.join(ICONS_DIR, file);
    if (!fs.existsSync(src)) {
      console.warn('missing icon:', file);
      missing = true;
      continue;
    }
    parts.push(normalize(fs.readFileSync(src, 'utf8')));
  }
  if (missing && !parts.length) continue;
  out += `  ${JSON.stringify(id)}: ${JSON.stringify(parts.join(''))},\n`;
}
out += '};\n';

const dest = path.join(__dirname, '..', 'renderer', 'icons.js');
fs.writeFileSync(dest, out);
console.log('wrote', dest, out.length, 'bytes');

