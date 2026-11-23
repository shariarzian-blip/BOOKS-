// Paramshanti TV logo: the organisation's own emblem (rays around the seated figure) with "PARAMSHANTI TV" on one line.
//   node make.cjs        writes the SVG files here, ../src/logo.html (the pieces the TV page uses), and PNG/JPG copies if Playwright is installed
const fs = require('fs');
const path = require('path');
const B = require('./brand.json');          // made by trace.py from the files in source/
const TV = require('./tv-letters.json');    // the letters TV, in the typeface that matches the wordmark
const C = B.colors, E = B.emblem, W = B.word_en;
const n1 = v => Math.round(v * 10) / 10;
const here = f => path.join(__dirname, f);

// one ray is a slim leaf, sharp at the inner tip and widest about 70% of the way out; all 113 go into a single path
const LEAF = [[0, 0], [.3, -.07], [.52, -.46], [.7, -.46], [.84, -.46], [.95, -.2], [1, 0], [.95, .2], [.84, .46], [.7, .46], [.52, .46], [.3, .07], [0, 0]];
const RAYS = E.rays.map(([tx, ty, deg, len, wid]) => {
  const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  const p = LEAF.map(([x, y]) => `${n1(tx + x * len * c - y * wid * s)} ${n1(ty + x * len * s + y * wid * c)}`);
  return `M${p[0]}C${p.slice(1, 4).join(' ')}C${p.slice(4, 7).join(' ')}C${p.slice(7, 10).join(' ')}C${p.slice(10, 13).join(' ')}Z`;
}).join('');
const emblem = `<path fill="${C.orange}" d="${RAYS}"/><path fill="${C.yellow}" fill-rule="evenodd" d="${E.fig}"/>`;
const GAP = 62, LINE_W = n1(W.w + GAP + TV.w);                                   // PARAMSHANTI, a space, TV
const line = `<path fill="${C.magenta}" fill-rule="evenodd" d="${W.d}"/><path fill="${C.orange}" transform="translate(${W.w + GAP} 0)" d="${TV.d}"/>`;
const svg = (w, h, inner, bg) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="Paramshanti TV">${bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ''}${inner}</svg>\n`;
const g = (x, y, s, inner) => `<g transform="translate(${n1(x)} ${n1(y)})${s === 1 ? '' : ` scale(${s})`}">${inner}</g>`;

// stacked (the chosen logo): emblem above the name
const SW = Math.ceil(LINE_W + 80), SH = 1005;
const stacked = g((SW - E.w) / 2, 30, 1, emblem) + g((SW - LINE_W) / 2, 830, 1, line);
// horizontal: emblem beside the name, for narrow strips
const HS = .5, HW = Math.ceil(10 + E.w * HS + 56 + LINE_W + 10), HH = Math.ceil(E.h * HS + 20);
const horizontal = g(10, 10, HS, emblem) + g(10 + E.w * HS + 56, (HH - W.h) / 2, 1, line);

fs.writeFileSync(here('paramshanti-tv-logo.svg'), svg(SW, SH, stacked));
fs.writeFileSync(here('paramshanti-tv-logo-horizontal.svg'), svg(HW, HH, horizontal));
// the two pieces the TV page draws from (kept once in the page, shown wherever the logo appears)
const PAD = 4;
fs.writeFileSync(here('../src/logo.html'),
  `<svg class="pstv-defs" width="0" height="0" aria-hidden="true" focusable="false">` +
  `<symbol id="pstv-lg-e" viewBox="0 0 ${E.w} ${E.h}">${emblem}</symbol>` +
  `<symbol id="pstv-lg-w" viewBox="${-PAD} ${-PAD} ${n1(LINE_W + 2 * PAD)} ${W.h + 2 * PAD}">${line}</symbol></svg>\n`);
console.log('stacked', SW + '×' + SH, '| horizontal', HW + '×' + HH, '| name line', n1(LINE_W + 2 * PAD) + '×' + (W.h + 2 * PAD), '(ratio ' + ((LINE_W + 2 * PAD) / (W.h + 2 * PAD)).toFixed(3) + ')',
  '| page pieces', Math.round(fs.statSync(here('../src/logo.html')).size / 1024) + ' KB');

(async () => {
  let chromium; try { ({ chromium } = require('playwright')); } catch (e) { return console.log('Playwright not found: SVG only'); }
  const b = await chromium.launch(), p = await b.newPage({ deviceScaleFactor: 1 });
  const shot = async (file, w, h, inner, vw, vh, bg) => {
    await p.setViewportSize({ width: w, height: h });
    await p.setContent(`<body style="margin:0;background:${bg || 'transparent'}"><svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${vw} ${vh}">${inner}</svg>`);
    await p.screenshot({ path: here(file), omitBackground: !bg, type: file.endsWith('.jpg') ? 'jpeg' : 'png', ...(file.endsWith('.jpg') ? { quality: 94 } : {}) });
  };
  await shot('paramshanti-tv-logo.png', 2400, Math.round(2400 * SH / SW), stacked, SW, SH);
  await shot('paramshanti-tv-logo-horizontal.png', 2400, Math.round(2400 * HH / HW), horizontal, HW, HH);
  // square, on white, with room around it: for profile pictures and posts
  const Q = 2300; await shot('paramshanti-tv-logo-square.jpg', 2000, 2000, g((Q - SW) / 2, (Q - SH) / 2, 1, stacked), Q, Q, '#ffffff');
  await b.close(); console.log('PNG and JPG copies written');
})();
