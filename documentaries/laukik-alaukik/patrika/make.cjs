// पत्रिका: patrika.html → PDF (A4, 16 पन्ने) और जाँच के लिए हर पन्ने का PNG।
// चलाना: NODE_PATH=/opt/node-tools/node_modules node make.cjs
const { chromium } = require('playwright');
const path = require('node:path'); const fs = require('node:fs');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 3 });
  await p.goto('file://' + path.join(__dirname, 'patrika.html'), { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(600);
  // मिट्टी की बनावट वाले शीर्षक PDF में महीन रेखाएँ छोड़ते हैं (background-clip:text)।
  // इसलिए हर ऐसे शीर्षक को पहले पारदर्शी चित्र में बदलकर उसी जगह रख देते हैं।
  await p.addStyleTag({ content: '.shoot, .shoot body { background: transparent !important } .shoot * { visibility: hidden !important } .shoot .target { visibility: visible !important }' });
  const n = await p.locator('.tex').count();
  for (let i = 0; i < n; i++) {
    const el = p.locator('.tex').nth(i);
    await el.evaluate(e => { document.documentElement.classList.add('shoot'); e.classList.add('target'); });
    const buf = await el.screenshot({ omitBackground: true });
    await el.evaluate((e, url) => { document.documentElement.classList.remove('shoot'); e.classList.remove('target'); e.dataset.png = url; }, 'data:image/png;base64,' + buf.toString('base64'));
  }
  await p.evaluate(() => document.querySelectorAll('.tex').forEach(e => { e.style.background = `url(${e.dataset.png}) 0 0 / 100% 100% no-repeat`; e.style.webkitBackgroundClip = 'border-box'; e.style.backgroundClip = 'border-box'; delete e.dataset.png; }));
  await p.pdf({ path: path.join(__dirname, 'laukik-alaukik-patrika.pdf'), width: '210mm', height: '297mm', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  fs.mkdirSync(path.join(__dirname, '_pages'), { recursive: true });
  const pages = await p.locator('.pg').all();
  for (let i = 0; i < pages.length; i++) await pages[i].screenshot({ path: path.join(__dirname, '_pages', `p${String(i + 1).padStart(2, '0')}.png`) });
  // हर पन्ने पर पाठ बाहर तो नहीं बह रहा
  const over = await p.evaluate(() => [...document.querySelectorAll('.pg')].map((pg, i) => { const r = pg.getBoundingClientRect(); let worst = 0;
    pg.querySelectorAll('p,h2,h3,li,figcaption,.nums,.facts,.sciBox,.q').forEach(e => { const q = e.getBoundingClientRect(); if (q.height) worst = Math.max(worst, q.bottom - (r.bottom - 34), q.right - r.right); }); return [i + 1, Math.round(worst)]; }).filter(x => x[1] > 0));
  console.log('pages', pages.length, 'textured titles', n, 'overflow(px past folio line):', JSON.stringify(over));
  await b.close();
})();
