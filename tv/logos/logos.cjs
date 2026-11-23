// Paramshanti TV — logo options. Each mark is a small SVG drawn in a 120 box; the sheet shows every option the same way.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const HERE = __dirname;
const GOLD = '<linearGradient id="GID" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe489"/><stop offset=".55" stop-color="#f2bf3f"/><stop offset="1" stop-color="#cf9a24"/></linearGradient>';
const INK = '#17120a';
// --- the marks: [key, name, Hindi note, tile style ('gold' = dark drawing on a gold tile, 'ink' = gold drawing on a dark tile), drawing]
// in a drawing, F = the drawing colour, B = the tile colour (for cut-outs)
const MARKS = [
  ['tv-play', 'Classic TV', 'टीवी + play', 'gold', `
    <rect x="23" y="41" width="74" height="52" rx="13" fill="none" stroke="F" stroke-width="7.5"/>
    <path d="M45 24 L60 39 L75 24" fill="none" stroke="F" stroke-width="7.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M53.5 55.5 L53.5 78.5 L73.5 67 Z" fill="F" stroke="F" stroke-width="3" stroke-linejoin="round"/>`],
  ['sunrise', 'Sunrise screen', 'स्क्रीन में उगता सूरज', 'ink', `
    <rect x="20" y="34" width="80" height="60" rx="15" fill="none" stroke="F" stroke-width="7"/>
    <path d="M40 87 A20 20 0 0 1 80 87 Z" fill="F"/>
    <g stroke="F" stroke-width="5" stroke-linecap="round">
      <path d="M60 59 L60 51"/><path d="M43.4 66.5 L37.6 60.9"/><path d="M76.6 66.5 L82.4 60.9"/><path d="M33.5 82 L26.5 80.5" transform="translate(4 -1)"/><path d="M86.5 82 L93.5 80.5" transform="translate(-4 -1)"/>
    </g>`],
  ['play-sun', 'Sun of peace', 'सूरज + play', 'ink', `
    <circle cx="60" cy="60" r="23" fill="F"/>
    <path d="M54 49.5 L54 70.5 L72.5 60 Z" fill="B" stroke="B" stroke-width="3" stroke-linejoin="round"/>
    <g stroke="F" stroke-width="6" stroke-linecap="round">
      ${Array.from({ length: 12 }, (_, i) => { const a = i * 30 * Math.PI / 180, r1 = 32.5, r2 = 41; return `<path d="M${(60 + r1 * Math.cos(a)).toFixed(1)} ${(60 + r1 * Math.sin(a)).toFixed(1)} L${(60 + r2 * Math.cos(a)).toFixed(1)} ${(60 + r2 * Math.sin(a)).toFixed(1)}"/>`; }).join('')}
    </g>`],
  ['lotus', 'Lotus TV', 'कमल पर टीवी', 'gold', `
    <rect x="28" y="21" width="64" height="45" rx="12" fill="F"/>
    <path d="M54 33.5 L54 53.5 L71.5 43.5 Z" fill="B" stroke="B" stroke-width="3" stroke-linejoin="round"/>
    <g fill="F">
      <path d="M60 73 C52.5 82,52.5 94,60 101 C67.5 94,67.5 82,60 73 Z"/>
      <path d="M60 73 C52.5 82,52.5 94,60 101 C67.5 94,67.5 82,60 73 Z" transform="rotate(-36 60 101) translate(0 2)"/>
      <path d="M60 73 C52.5 82,52.5 94,60 101 C67.5 94,67.5 82,60 73 Z" transform="rotate(36 60 101) translate(0 2)"/>
      <path d="M60 76 C53.5 84,53.5 94,60 101 C66.5 94,66.5 84,60 76 Z" transform="rotate(-70 60 101) translate(0 4)"/>
      <path d="M60 76 C53.5 84,53.5 94,60 101 C66.5 94,66.5 84,60 76 Z" transform="rotate(70 60 101) translate(0 4)"/>
    </g>`],
  ['infinity', 'Behad (infinity)', 'बेहद = अनंत ∞', 'ink', `
    <path d="M60 60 C50 42,18 40,18 60 C18 80,50 78,60 60 C70 42,102 40,102 60 C102 80,70 78,60 60 Z" fill="none" stroke="F" stroke-width="8.5" stroke-linejoin="round"/>
    <path d="M76.5 53 L76.5 67 L89 60 Z" fill="F" stroke="F" stroke-width="2.5" stroke-linejoin="round"/>`],
  ['meditate', 'Meditation screen', 'स्क्रीन में ध्यान', 'gold', `
    <rect x="20" y="24" width="80" height="72" rx="17" fill="none" stroke="F" stroke-width="7"/>
    <circle cx="60" cy="47" r="7.5" fill="F"/>
    <path d="M60 58 C49 58,44 67,43.5 76 L76.5 76 C76 67,71 58,60 58 Z" fill="F"/>
    <rect x="36" y="76" width="48" height="9" rx="4.5" fill="F"/>`],
  ['monogram', 'P monogram', 'P अक्षर में स्क्रीन', 'gold', `
    <path d="M40 98 L40 30 L66 30 A22 22 0 0 1 66 74 L40 74" fill="none" stroke="F" stroke-width="13" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M57 43.5 L57 60.5 L72 52 Z" fill="F" stroke="F" stroke-width="2.5" stroke-linejoin="round"/>`],
  ['jyoti', 'Jyoti (flame)', 'ज्योति + play', 'ink', `
    <path d="M60 14 C63 30,88 42,88 66 A28 28 0 0 1 32 66 C32 54,40 46,46 36 C48 44,52 47,55 47 C55 36,57 24,60 14 Z" fill="F"/>
    <path d="M53.5 56.5 L53.5 79.5 L73.5 68 Z" fill="B" stroke="B" stroke-width="3" stroke-linejoin="round"/>
    <path d="M40 103 Q60 110 80 103" fill="none" stroke="F" stroke-width="6" stroke-linecap="round"/>`],
  ['aura', 'Aura signal', 'आभा = प्रसारण', 'gold', `
    <circle cx="60" cy="60" r="8.5" fill="F"/>
    <path d="M37 99 C37 82,48 75,60 75 C72 75,83 82,83 99 Z" fill="F"/>
    <g fill="none" stroke="F" stroke-width="6" stroke-linecap="round">
      <path d="M42.5 56 A18.5 18.5 0 0 1 77.5 56"/><path d="M31.5 51 A30 30 0 0 1 88.5 51"/><path d="M20.5 46 A41.5 41.5 0 0 1 99.5 46"/>
    </g>`],
];
// two colourways, neither uses black: 'sun' = white drawing on a saffron-gold tile, 'white' = gold drawing on a white tile
const SUN = '<linearGradient id="GID" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffcb45"/><stop offset=".5" stop-color="#f6a016"/><stop offset="1" stop-color="#e27a02"/></linearGradient>';
const mark = (m, size, style) => {
  style = style || 'sun';
  const id = 'g' + Math.random().toString(36).slice(2, 8);
  const tile = style === 'sun' ? `url(#${id})` : '#ffffff', draw = style === 'sun' ? '#ffffff' : `url(#${id})`;
  const body = m[4].replace(/"F"/g, `"${draw}"`).replace(/"B"/g, `"${tile}"`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 120 120"><defs>${SUN.replace('GID', id)}</defs><rect x="2" y="2" width="116" height="116" rx="30" fill="${tile}"/>${style === 'white' ? `<rect x="3.5" y="3.5" width="113" height="113" rx="28.5" fill="none" stroke="url(#${id})" stroke-width="3"/>` : ''}${body}</svg>`;
};
module.exports = { MARKS, mark, SUN };

if (require.main === module) (async () => {
  const face = (w, set, range) => `@font-face{font-family:'Poppins';font-weight:${w};src:url(node_modules/@fontsource/poppins/files/poppins-${set}-${w}-normal.woff2) format('woff2');unicode-range:${range}}`;
  const LATIN = 'U+0000-00FF,U+2000-206F,U+2212', DEVA = 'U+0900-097F,U+200C-200D';
  const css = [500, 600, 700, 800].map(w => face(w, 'latin', LATIN) + face(w, 'devanagari', DEVA)).join('') + `
    *{box-sizing:border-box;margin:0;padding:0} body{font-family:'Poppins',sans-serif;background:#fff7e3;-webkit-font-smoothing:antialiased}
    .sheet{width:2400px;padding:70px 70px 60px}
    .head{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:44px}
    .head h1{font-weight:800;font-size:64px;letter-spacing:-.03em;color:#9a6400} .head h1 b{color:#ee8f08} .head p{font-weight:600;font-size:30px;color:#b07a10}
    .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:34px}
    .card{border-radius:36px;overflow:hidden;background:#ffffff;box-shadow:0 30px 60px -40px rgba(190,120,10,.55),inset 0 0 0 2px #f6dfa6}
    .light{position:relative;padding:38px 40px 34px;display:grid;justify-items:center;gap:26px}
    .no{position:absolute;left:30px;top:26px;width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,#ffcb45,#e27a02);color:#fff;font-weight:800;font-size:38px;display:grid;place-items:center}
    .nm{position:absolute;right:34px;top:34px;text-align:right;font-weight:600;font-size:24px;color:#b07a10;line-height:1.3} .nm small{display:block;font-weight:500;font-size:21px;color:#c79a4a}
    .pair{display:flex;align-items:flex-end;gap:22px;margin-top:52px}
    .lock{display:flex;align-items:center;gap:20px;white-space:nowrap}
    .wm{font-weight:700;font-size:56px;letter-spacing:-.025em;color:#9a6400;line-height:1} .wm b{font-weight:800;color:#ee8f08}
    .band{background:linear-gradient(135deg,#ffc53a,#f39a12 55%,#e27a02);padding:30px 40px;display:flex;align-items:center;justify-content:space-between;gap:20px}
    .band .wm{color:#fff;font-size:46px} .band .wm b{color:#fff6cf}
    .tiny{display:flex;align-items:center;gap:9px;font-weight:700;font-size:19px;color:#fff;letter-spacing:-.01em;white-space:nowrap} .tiny b{color:#fff6cf}
    .foot{margin-top:40px;font-weight:500;font-size:28px;color:#b07a10;text-align:center}`;
  const card = (m, i) => `<div class="card"><div class="light"><span class="no">${i + 1}</span><span class="nm">${m[1]}<small>${m[2]}</small></span>
      <div class="pair">${mark(m, 240, 'sun')}${mark(m, 124, 'white')}</div>
      <div class="lock">${mark(m, 84, 'sun')}<span class="wm">Paramshanti <b>TV</b></span></div></div>
    <div class="band"><div class="lock" style="gap:16px">${mark(m, 70, 'white')}<span class="wm">Paramshanti <b>TV</b></span></div>
      <div style="display:grid;gap:12px;justify-items:end"><span class="tiny">${mark(m, 34, 'white')}<span>Paramshanti <b>TV</b></span></span><span class="tiny">${mark(m, 34, 'white')}<span>परमशांति <b>TV</b></span></span></div></div></div>`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><base href="http://localhost:8767/"><style>${css}</style></head><body><div class="sheet">
    <div class="head"><h1>Paramshanti <b>TV</b> — logo options</h1><p>नंबर बताइए · pick a number</p></div>
    <div class="grid">${MARKS.map(card).join('')}</div>
    <p class="foot">हर लोगो दो रंग-रूप में: केसरिया-सुनहरा और सफ़ेद · no black anywhere</p></div></body></html>`;
  fs.writeFileSync(path.join(HERE, 'sheet.html'), html);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 2400, height: 1200 }, deviceScaleFactor: 1 });
  await p.goto('http://localhost:8767/sheet.html', { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(HERE, 'logo-options.png'), fullPage: true });
  await b.close(); console.log('sheet done');
})();
