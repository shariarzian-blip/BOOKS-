// Shared helpers for the Paramshanti TV test scripts.
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');
const BASE = process.env.PSTV_URL || 'http://localhost:8765/tv.html';
const FAKE = fs.readFileSync(path.join(__dirname, 'fake-yt.js'), 'utf8');
let pass = 0, fail = 0; const fails = [];
function ok(cond, name, extra) {
  if (cond) { pass++; if (process.env.VERBOSE) console.log('  ok   ' + name); }
  else { fail++; fails.push(name + (extra !== undefined ? '  → ' + JSON.stringify(extra) : '')); console.log('  FAIL ' + name + (extra !== undefined ? '  → ' + JSON.stringify(extra) : '')); }
}
function eq(a, b, name) { ok(JSON.stringify(a) === JSON.stringify(b), name, { got: a, want: b }); }
async function open(browser, o = {}) {
  const ctx = await browser.newContext(o.mobile ? { ...devices[o.device || 'iPhone 13'] } : { viewport: o.viewport || { width: 1366, height: 800 }, deviceScaleFactor: 1, ...(o.context || {}) });
  const page = await ctx.newPage();
  page.errs = [];
  page.on('pageerror', e => page.errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_|net::|postMessage|web-share|compute-pressure|Failed to load resource/.test(m.text())) page.errs.push('console: ' + m.text().slice(0, 160)); });
  if (o.clock) await page.clock.install({ time: o.clock });
  if (o.fake !== false) {
    await page.route('**/iframe_api', r => r.fulfill({ contentType: 'text/javascript', body: FAKE }));
    await page.route('**/oembed**', r => r.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ title: 'Fetched title' }) }));
    await page.route('**/embed/**', r => r.fulfill({ contentType: 'text/html', body: '<!doctype html><body style="margin:0;background:#123">embed</body>' }));
  }
  if (o.init) await page.addInitScript(o.init);
  await page.goto(BASE + (o.query || ''), { waitUntil: 'domcontentloaded' });
  if (o.clock) await page.clock.runFor(o.settle || 1500); else await page.waitForTimeout(o.settle || 1500);
  return { ctx, page };
}
// what the page looks like right now
const state = page => page.evaluate(() => {
  const g = id => document.getElementById(id), vis = e => !!(e && e.offsetParent !== null && !e.hidden);
  const P = window.__main;
  return {
    num: g('pstv-osd-num').textContent, name: g('pstv-osd-name').textContent, badge: g('pstv-badge').textContent, mode: g('pstv-badge').getAttribute('data-mode'),
    title: g('pstv-title').textContent, sub: g('pstv-sub').textContent, next: g('pstv-nextrow').hidden ? null : g('pstv-next').textContent,
    bar: g('pstv-bar').hidden ? null : parseFloat(g('pstv-bar').firstChild.style.width), clock: g('pstv-clock').textContent,
    on: g('pstv-screen').classList.contains('is-on'), led: document.querySelector('.pstv-tv').classList.contains('is-on'),
    pill: vis(g('pstv-unmute')), soundOn: g('pstv-b-mute').getAttribute('data-on') === '1', muteLabel: g('pstv-b-mute').getAttribute('aria-label'),
    back: vis(g('pstv-b-tv')), prev: vis(g('pstv-b-prev')), nextBtn: vis(g('pstv-b-next')), liveBtn: vis(g('pstv-b-live')), livePressed: g('pstv-b-live').getAttribute('aria-pressed'),
    view: g('pstv-side').getAttribute('data-view'), guidePressed: g('pstv-b-guide').getAttribute('aria-pressed'), guideVisible: vis(g('pstv-glist')),
    guideH: g('pstv-guide-h').textContent, guide: [...document.querySelectorAll('#pstv-glist li')].filter(l => l.offsetParent).length,
    sel: (document.querySelector('.pstv-chan[aria-current="true"]') || { getAttribute() { return null; } }).getAttribute('data-ch'),
    chans: document.querySelectorAll('.pstv-chan').length, banner: g('pstv-banner').classList.contains('is-show'), noise: g('pstv-static').classList.contains('is-on'),
    docked: g('pstv-frame').classList.contains('is-docked'), poster: g('pstv-poster').getAttribute('aria-label'), posterLabel: g('pstv-poster-label').textContent, posterK: g('pstv-poster-k').textContent,
    liveFrame: !!g('pstv-liveframe'), plain: g('pstv-plain') ? g('pstv-plain').src : null,
    liveH: g('pstv-live-h').textContent, liveS: g('pstv-live-s').textContent, liveB: g('pstv-live-b').textContent, liveCard: vis(g('pstv-livecard')),
    cur: [...document.querySelectorAll('.pstv-card.is-cur')].length, rows: [...document.querySelectorAll('[data-sec]')].map(s => s.getAttribute('data-sec') + ':' + s.querySelectorAll('.pstv-card[data-v]').length),
    groups: [...document.querySelectorAll('[data-gsec]')].map(s => s.getAttribute('data-gsec') + ':' + s.querySelectorAll('.pstv-col').length),
    overflow: document.documentElement.scrollWidth - innerWidth, w: g('pstv').getAttribute('data-w'),
    P: P ? { vid: P.vid, muted: P.muted, state: P.state, calls: P.calls.slice(-4), first: { id: P.cfg.videoId, pv: P.cfg.playerVars } } : null,
    players: (window.__players || []).length,
  };
});
function done(label) {
  console.log(`${label}: ${pass} passed, ${fail} failed`);
  if (fail) { console.log(fails.map(f => '   - ' + f).join('\n')); process.exitCode = 1; }
}
module.exports = { chromium, devices, BASE, FAKE, ok, eq, open, state, done, counts: () => ({ pass, fail }) };
