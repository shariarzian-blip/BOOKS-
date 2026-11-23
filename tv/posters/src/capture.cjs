// A real screenshot of the phone page, with the TV shown "on", for the phone mock-up in the posters.
const { chromium } = require('playwright');
const fs = require('fs');
const D = require('/home/user/BOOKS-/tv/catalog.json');
const URL = 'https://www.paramshantiblogs.org/paramshanti-tv';
const EMBED = fs.readFileSync('/home/user/BOOKS-/tv/squarespace-embed.html', 'utf8');
const EPOCH = Date.UTC(2026, 0, 1) / 1000;
function when(k, id, frac) {            // a moment at which this video is on air on that channel
  const ch = D.C.find(c => c.k === k), it = ch.tv.map(v => ({ id: v, d: D.V[v][1] })).filter(x => x.d), tot = it.reduce((a, x) => a + x.d, 0);
  let at = 0; for (const x of it) { if (x.id === id) break; at += x.d; }
  const d = it.find(x => x.id === id).d, base = Date.UTC(2026, 10, 24, 12, 0) / 1000;      // around 24 Nov 2026, evening in India
  const cyc = Math.floor((base - EPOCH) / tot);
  return (EPOCH + cyc * tot + at + d * frac) * 1000;
}
(async () => {
  const id = process.argv[2] || 'ecdLO9qo79k', t = when('hi', id, 0.34);
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, timezoneId: 'Asia/Kolkata' });
  const p = await ctx.newPage();
  await p.clock.install({ time: new Date(t) });
  await p.route(URL, async route => { const resp = await route.fetch(); let html = await resp.text(); const a = html.indexOf('<!-- Paramshanti TV'), z = html.indexOf('</script>', html.indexOf('id="pstv-script"')) + 9; await route.fulfill({ response: resp, body: html.slice(0, a) + EMBED + html.slice(z) }); });
  await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.clock.runFor(4000); await p.waitForTimeout(5000);
  const top = await p.evaluate((id) => {
    const s = document.getElementById('pstv-screen'), f = document.getElementById('pstv-frame');
    s.classList.add('is-on'); document.querySelector('.pstv-tv').classList.add('is-on');
    f.innerHTML = '<img src="https://i.ytimg.com/vi/' + id + '/maxresdefault.jpg" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover">';
    document.getElementById('pstv-unmute').hidden = true; document.getElementById('pstv-b-mute').setAttribute('data-on', '1');
    return Math.round(document.getElementById('pstv').getBoundingClientRect().top + scrollY);
  }, id);
  await p.waitForTimeout(2500);
  console.log('title:', await p.evaluate(() => document.getElementById('pstv-title').textContent), '| clock:', await p.evaluate(() => document.getElementById('pstv-clock').textContent), '| top', top);
  await p.evaluate(y => scrollTo(0, y), top); await p.waitForTimeout(600);
  await p.screenshot({ path: 'assets/phone-screen.png' });
  await b.close();
})();
