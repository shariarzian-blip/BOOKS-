// The freshly built block inside the real published page (its own Squarespace styles, real YouTube), at many screen sizes.
// Nothing is published: the page is fetched and the block is swapped in on the way to the test browser.
const { chromium, ok, eq, done } = require('./lib.cjs');
const fs = require('fs'), path = require('path');
const URL = process.env.PSTV_SITE || 'https://www.paramshantiblogs.org/paramshanti-tv';
const EMBED = fs.readFileSync(path.join(__dirname, '..', 'squarespace-embed.html'), 'utf8');
const OUT = process.env.PSTV_SHOTS || '';
const sizes = (process.env.PSTV_SIZES ? JSON.parse(process.env.PSTV_SIZES) : [[320, 640], [360, 740], [375, 667], [390, 844], [414, 896], [430, 932], [600, 960], [768, 1024], [820, 1180], [1024, 768], [1280, 720], [1366, 768], [1440, 900], [1920, 1080], [844, 390]]);
(async () => {
  const b = await chromium.launch();
  for (const [w, h] of sizes) {
    const phone = w < 768 || h < 500;
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: phone, hasTouch: phone });
    const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
    await p.route(URL, async route => {
      const resp = await route.fetch(); let html = await resp.text();
      const a = html.indexOf('<!-- Paramshanti TV'), z = html.indexOf('</script>', html.indexOf('id="pstv-script"')) + 9;
      if (a < 0 || z < 9) return route.fulfill({ response: resp });
      await route.fulfill({ response: resp, body: html.slice(0, a) + EMBED + html.slice(z) });
    });
    await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await p.waitForTimeout(7000);
    const T = `[${w}×${h}] `;
    const g = await p.evaluate(() => {
      const r = s => { const e = document.querySelector(s); if (!e) return null; const x = e.getBoundingClientRect(); return { l: Math.round(x.left), t: Math.round(x.top + scrollY), r: Math.round(x.right), b: Math.round(x.bottom + scrollY), w: Math.round(x.width), h: Math.round(x.height) }; };
      const root = document.getElementById('pstv'), cs = e => getComputedStyle(e);
      const ctl = [...document.querySelectorAll('.pstv-ctl > *')].filter(e => e.offsetParent).map(e => { const x = e.getBoundingClientRect(); return Math.round((x.top + x.height / 2) / 12); });   // rows by vertical centre
      // every visible thing must sit inside the window, except what lives in a sideways-scrolling strip
      const inWin = e => { const x = e.getBoundingClientRect(); return x.left >= -1 && x.right <= innerWidth + 1; };
      const clippedByParent = e => { for (let n = e.parentElement; n && n !== root.parentElement; n = n.parentElement) { if (/(hidden|clip|auto|scroll)/.test(cs(n).overflowX) && inWin(n)) return true; } return false; };
      const outside = [...root.querySelectorAll('*')].filter(e => e.offsetParent && !e.closest('.pstv-probe') && !e.matches('.pstv-rail, .pstv-chlist')).filter(e => { const x = e.getBoundingClientRect(); return x.width > 0 && !inWin(e) && !clippedByParent(e); }).map(e => e.tagName + '.' + (e.id || e.className)).slice(0, 6);
      const clipped = [...root.querySelectorAll('.pstv-btn, .pstv-pill, .pstv-chan strong, .pstv-osd-name strong, .pstv-clock')].filter(e => e.offsetParent && e.scrollWidth > e.clientWidth + 1).map(e => (e.id || e.className) + ':' + e.textContent.trim().slice(0, 20));
      return {
        vw: innerWidth, vh: innerHeight, docW: document.documentElement.scrollWidth, w: root.getAttribute('data-w'), edge: root.hasAttribute('data-edge'), root: r('#pstv'), tv: r('.pstv-tv'), screen: r('#pstv-screen'), ctl: r('.pstv-ctl'), side: r('#pstv-side'), chlist: r('#pstv-chlist'),
        ctlRows: new Set(ctl).size, outside, clipped, font: cs(root).fontFamily.slice(0, 16), fonts: [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family).filter((v, i, a) => a.indexOf(v) === i),
        title: document.getElementById('pstv-title').textContent, chans: document.querySelectorAll('.pstv-chan').length, logos: [...document.querySelectorAll('.pstv-chan .pstv-logo img')].filter(i => i.complete && i.naturalWidth > 0).length,
        rows: [...document.querySelectorAll('[data-sec]')].map(s => s.querySelectorAll('.pstv-card[data-v]').length), wrapPad: (() => { const c = root.closest('.content-wrapper'); return c ? [cs(c).paddingTop, cs(c).paddingBottom] : null; })(),
        h2: (() => { const e = root.querySelector('.pstv-h2'); return [cs(e).fontFamily.slice(0, 16), cs(e).fontWeight, cs(e).textTransform, cs(e).marginTop]; })(),
        iframe: !!document.querySelector('#pstv-frame iframe'), serif: [...root.querySelectorAll('*')].filter(e => e.offsetParent && /Playfair|Georgia|serif\s*$/.test(cs(e).fontFamily) && !/sans-serif\s*$/.test(cs(e).fontFamily) && !/monospace/.test(cs(e).fontFamily)).length,
      };
    });
    eq(g.docW, g.vw, T + 'no sideways scrolling'); eq(g.outside, [], T + 'nothing sticks out of the window'); eq(g.clipped, [], T + 'no label is cut off');
    ok(g.fonts.includes('Psh20 DM Sans') && /DM Sans/.test(g.font), T + 'the site\'s sans font is used', g.fonts); eq(g.serif, 0, T + 'no serif text anywhere');
    eq(g.h2.slice(1), ['600', 'none', '0px'], T + 'headings keep our styling inside Squarespace');
    eq(g.wrapPad, ['0px', '0px'], T + 'no empty band above or below the block');
    ok(g.title.length > 3 && g.title !== 'Loading…' && g.chans === 11 && g.rows.length === 4 && g.rows.every(n => n >= 10), T + 'TV banner, 11 channels and rows are filled', { title: g.title, rows: g.rows });
    ok(g.logos >= 10, T + 'channel logos load', g.logos); ok(g.iframe, T + 'the real YouTube player is created');
    if (w < 768) {
      ok(g.tv.l === 0 && g.tv.w === g.vw && g.screen.w === g.vw, T + 'phone: the picture runs edge to edge', g.screen);
      ok(g.ctlRows === 1, T + 'phone: the remote fits on one line', g.ctlRows); ok(g.chlist.t > g.ctl.b - 2, T + 'phone: channels are below the remote');
      ok(g.tv.b + 70 <= g.vh + g.root.t + 260, T + 'phone: TV, banner and remote sit near the top', [g.tv.b, g.vh]);
    } else {
      ok(g.tv.l >= 16 && g.vw - (g.w === 'l' ? g.side.r : g.tv.r) >= 16, T + 'wide: there is a margin on both sides', [g.tv.l, g.side.r, g.vw]);
      if (g.w === 'l') { ok(g.side.l > g.tv.r && g.side.w >= 330, T + 'wide: channel list beside the TV', g.side); ok(g.ctl.b <= g.vh + 4 || h < 760, T + 'wide: TV and remote fit in the first screen', [g.ctl.b, g.vh]); }
      ok(g.screen.h <= g.vh, T + 'the picture is never taller than the window', [g.screen.h, g.vh]);
    }
    eq(errs, [], T + 'no script errors on the real page');
    if (OUT && [[390, 844], [1440, 900], [768, 1024], [320, 640], [844, 390], [1920, 1080]].some(s => s[0] === w && s[1] === h)) {
      await p.screenshot({ path: path.join(OUT, `site-${w}x${h}.png`) });
      const H = await p.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < H; y += 500) { await p.evaluate(v => scrollTo(0, v), y); await p.waitForTimeout(120); }
      await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(1200);
      if (w === 390 || w === 1440) await p.screenshot({ path: path.join(OUT, `site-${w}x${h}-full.png`), fullPage: true });
    }
    await ctx.close();
  }
  // real YouTube, real page: new uploads appear, a playlist opens, pictures load
  {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
    await p.route(URL, async route => { const resp = await route.fetch(); let html = await resp.text(); const a = html.indexOf('<!-- Paramshanti TV'), z = html.indexOf('</script>', html.indexOf('id="pstv-script"')) + 9; await route.fulfill({ response: resp, body: html.slice(0, a) + EMBED + html.slice(z) }); });
    await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 }); await p.waitForTimeout(16000);
    const H = await p.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < H; y += 450) { await p.evaluate(v => scrollTo(0, v), y); await p.waitForTimeout(350); }
    const pics = await p.evaluate(() => { const im = [...document.querySelectorAll('#pstv img')].filter(i => i.offsetParent); return { n: im.length, broken: im.filter(i => i.complete && !i.naturalWidth).map(i => i.src.slice(-40)), grey: im.filter(i => i.complete && i.naturalWidth === 120).length }; });
    ok(pics.n > 100 && pics.broken.length === 0, 'real YouTube: every thumbnail loads', pics); eq(pics.grey, 0, 'real YouTube: no grey placeholder thumbnails');
    const waits = await p.evaluate(() => document.querySelectorAll('#pstv .pstv-ct.is-wait').length); eq(waits, 0, 'real YouTube: no title is left blank');
    const first = await p.evaluate(() => [...document.querySelectorAll('[data-sec="new"] .pstv-card[data-v]')].slice(0, 2).map(c => [c.getAttribute('data-v'), c.querySelector('.pstv-ct').textContent.slice(0, 50)]));
    console.log('  newest two in "Latest videos" right now:', JSON.stringify(first));
    await p.evaluate(() => document.querySelector('[data-gsec="courses"]').scrollIntoView({ block: 'start' })); await p.waitForTimeout(400);
    await p.click('[data-gsec="courses"] .pstv-col'); await p.waitForTimeout(9000);
    const panel = await p.evaluate(() => ({ cards: document.querySelectorAll('[data-gsec="courses"] .pstv-panel .pstv-card[data-v]').length, blank: document.querySelectorAll('[data-gsec="courses"] .pstv-panel .pstv-ct.is-wait').length, count: (document.querySelector('[data-gsec="courses"] .pstv-panel small') || {}).textContent }));
    ok(panel.cards >= 10 && panel.blank <= 2, 'real YouTube: a playlist opens with its real videos and titles', panel);
    await p.click('[data-sec="new"] [data-more]', { force: true }).catch(() => {}); await p.waitForTimeout(1500);
    eq(errs, [], 'real YouTube: no script errors');
    if (OUT) await p.screenshot({ path: path.join(OUT, 'site-playlist.png') });
    await ctx.close();
  }
  await b.close();
  done('site');
})().catch(e => { console.error('CRASH', e); process.exit(2); });
