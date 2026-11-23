// The schedule and the live card against the clock, checked with an independent calculation from catalog.json.
const { chromium, ok, eq, open, state, done } = require('./lib.cjs');
const D = require('../catalog.json');
const EPOCH = Date.UTC(2026, 0, 1) / 1000;
function wheel(k) { const ch = D.C.find(c => c.k === k); const it = ch.tv.map(id => ({ id, d: D.V[id][1], t: D.V[id][0] })).filter(x => x.d); return { it, tot: it.reduce((a, x) => a + x.d, 0) }; }
function slot(k, ms) {
  const w = wheel(k); let pos = ((ms / 1000 - EPOCH) % w.tot + w.tot) % w.tot, i = 0;
  while (pos >= w.it[i].d) { pos -= w.it[i].d; i++; }
  const nx = w.it[(i + 1) % w.it.length];
  return { ...w.it[i], off: pos, start: ms - pos * 1000, end: ms + (w.it[i].d - pos) * 1000, next: nx };
}
const fmt = (ms, tz) => new Date(ms).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: tz });
const ist = (h, m, day = 23) => Date.UTC(2026, 10, day, h, m) - 330 * 60000;        // a wall-clock time in India, November 2026
(async () => {
  const b = await chromium.launch();
  let o, p, s;
  // --- what is on, for several channels and moments
  const moments = [ist(6, 3), ist(13, 47), ist(19, 20), ist(23, 58), ist(2, 11, 24), Date.UTC(2027, 2, 9, 4, 30), Date.UTC(2031, 6, 1, 11, 11)];
  let n = 0;
  for (const k of ['hi', 'en', 'gu', 'med']) for (const t0 of moments) {
    let t = t0, e = slot(k, t);
    if (e.end - t < 90000) { t += 120000; e = slot(k, t); }                     // stay clear of the hand-over between programmes
    o = await open(b, { clock: new Date(t), query: '?ch=' + k, context: { timezoneId: 'Asia/Kolkata' }, settle: 800 }); p = o.page; s = await state(p);
    const tag = `[${k} @ ${new Date(t).toISOString()}] `;
    eq(s.title, e.t, tag + 'NOW is the programme the clock says');
    eq(s.sub, fmt(e.start, 'Asia/Kolkata') + ' – ' + fmt(e.end, 'Asia/Kolkata'), tag + 'its start and end times');
    eq(s.next, fmt(e.end, 'Asia/Kolkata') + ' ' + e.next.t, tag + 'NEXT and its time');
    eq(s.P.first.id, e.id, tag + 'that video is the one loaded');
    ok(Math.abs((s.P.first.pv.start || 0) - Math.floor(e.off)) <= 2, tag + 'joined at the right second', { got: s.P.first.pv.start, want: Math.floor(e.off) });
    ok(Math.abs(s.bar - (e.off / e.d * 100)) < 1.5, tag + 'progress bar matches', { got: s.bar, want: e.off / e.d * 100 });
    eq(s.clock, fmt(t + 800, 'Asia/Kolkata'), tag + 'clock shows the time');
    const chans = await p.evaluate(() => [...document.querySelectorAll('.pstv-chan')].map(c => [c.getAttribute('data-ch'), c.querySelector('.pstv-chan-now').textContent]));
    ok(chans.every(([ck, title]) => title === slot(ck, t + 800).t), tag + 'every channel tile shows what is on that channel', chans.filter(([ck, title]) => title !== slot(ck, t + 800).t));
    await o.ctx.close(); n++;
  }
  // --- the hand-over between programmes
  {
    let t = ist(15, 0), e = slot('hi', t); t = e.end - 40000; e = slot('hi', t);
    o = await open(b, { clock: new Date(t), context: { timezoneId: 'Asia/Kolkata' }, settle: 800 }); p = o.page; s = await state(p);
    eq(s.title, e.t, 'hand-over: before the end, the current programme is on');
    await p.clock.fastForward(45000); await p.evaluate(() => window.__main.emit(0)); await p.clock.runFor(300); s = await state(p);
    eq(s.title, e.next.t, 'hand-over: when it ends, the NEXT programme starts'); ok(/^load:[\w-]{11}@[0-9]$/.test(s.P.calls.filter(c => c.startsWith('load:')).pop()), 'hand-over: it starts from its beginning', s.P.calls);
    eq(s.sub.split(' – ')[0], fmt(e.end, 'Asia/Kolkata'), 'hand-over: the banner shows the new start time');
    // the video finishing a little early must not replay its last seconds
    const e2 = slot('hi', e.end + 5000);
    await p.clock.fastForward((e2.d - 20) * 1000 - 5000); await p.evaluate(() => window.__main.emit(0)); await p.clock.runFor(300); s = await state(p);
    eq(s.title, e2.next.t, 'hand-over: a video that ends a few seconds early moves on, it does not replay its ending');
    // minutes pass: banner, clock and tiles keep up without any tap
    const c0 = s.clock, b0 = s.bar; await p.clock.runFor(125000); s = await state(p);
    ok(s.clock !== c0, 'time passing: the clock moves on its own', [c0, s.clock]); ok(s.bar > b0, 'time passing: the progress bar moves on its own', [b0, s.bar]);
    eq(p.errs, [], 'hand-over: no script errors'); await o.ctx.close();
  }
  // --- the TV left off: the poster keeps up with the schedule
  {
    let t = ist(9, 0), e = slot('hi', t); t = e.end - 30000;
    o = await open(b, { clock: new Date(t), init: 'window.__noStart = true;', context: { timezoneId: 'Asia/Kolkata' }, settle: 800 }); p = o.page;
    await p.clock.runFor(62000); s = await state(p);
    eq(s.title, e.next.t, 'TV off: the banner moves to the next programme by itself');
    await p.evaluate(() => { window.__noStart = false; }); await p.click('#pstv-poster'); await p.clock.runFor(400); s = await state(p);
    eq(s.P.vid || s.P.first.id, e.next.id, 'TV off: turning it on plays what is on air now, not what was on when the page opened', s.P);
    await o.ctx.close();
  }
  // --- live card and Live button
  const live = async (t, tz) => { const x = await open(b, { clock: new Date(t), context: { timezoneId: tz || 'Asia/Kolkata' }, settle: 800 }); return x; };
  o = await live(ist(21, 50)); p = o.page; s = await state(p);
  eq(s.liveH, 'Live meditation in 10 min', '21:50 IST: counts down'); eq(s.liveS, 'Every day at 10 PM India time', 'in India no second time zone is shown'); eq(s.liveB, 'Last live', '21:50 IST: offers the last live');
  await p.click('#pstv-b-live'); await p.clock.runFor(300); s = await state(p); ok(s.mode === 'vod' && !s.liveFrame && s.sub === 'Latest live satsang', 'before live time the Live button plays the last live satsang', { mode: s.mode, sub: s.sub });
  await o.ctx.close();
  o = await live(ist(21, 56)); p = o.page; s = await state(p);
  eq(s.liveH, 'Live meditation is on now', '21:56 IST: live time'); eq(s.liveB, 'Watch live', '21:56 IST: button says Watch live');
  await p.click('#pstv-b-live'); await p.clock.runFor(300); s = await state(p);
  ok(s.mode === 'live' && s.liveFrame && s.badge === 'Live' && s.title === 'Live meditation' && s.livePressed === 'true' && s.back, 'at live time the Live button opens the live stream', s);
  const src = await p.evaluate(() => document.getElementById('pstv-liveframe').src); eq(src, 'https://www.youtube.com/embed/live_stream?channel=UC01X7d2bKFGxdk8tQ0ZKzOQ&autoplay=1&playsinline=1&rel=0', 'the live stream is the main channel');
  ok(s.P.calls.includes('pause') && !s.pill, 'the TV channel pauses under the live stream');
  await p.click('#pstv-b-tv'); await p.clock.runFor(300); s = await state(p); ok(s.mode === 'tv' && !s.liveFrame && s.livePressed === 'false', 'Back to TV leaves the live stream');
  await p.click('#pstv-live-b'); await p.clock.runFor(300); s = await state(p); ok(s.liveFrame, 'the card button opens the live stream too');
  await p.click('#pstv-ch-up'); await p.clock.runFor(300); s = await state(p); ok(!s.liveFrame && s.mode === 'tv' && s.num === '02', 'changing channel leaves the live stream');
  await o.ctx.close();
  o = await live(ist(23, 39)); s = await state(o.page); eq(s.liveH, 'Live meditation is on now', '23:39 IST: still live time'); await o.ctx.close();
  o = await live(ist(23, 41)); s = await state(o.page); eq(s.liveH, 'Live meditation in 22 h 19 min', '23:41 IST: counts to tomorrow'); await o.ctx.close();
  o = await live(ist(0, 30, 24)); s = await state(o.page); eq(s.liveH, 'Live meditation in 21 h 30 min', '00:30 IST: counts to tonight'); await o.ctx.close();
  o = await live(ist(12, 0), 'America/New_York'); s = await state(o.page); eq(s.liveS, 'Every day at 10 PM India time · 11:30 am your time', 'New York: local time of the live is shown'); eq(s.liveH, 'Live meditation in 10 h 0 min', 'noon IST: ten hours to go'); await o.ctx.close();
  o = await live(ist(12, 0), 'Europe/London'); s = await state(o.page); eq(s.liveS, 'Every day at 10 PM India time · 4:30 pm your time', 'London: local time of the live is shown'); await o.ctx.close();
  await b.close();
  console.log('moments checked:', n);
  done('clock');
})().catch(e => { console.error('CRASH', e); process.exit(2); });
