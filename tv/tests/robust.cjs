// Things going wrong: sound refused, autoplay refused, nothing plays, the player script blocked, storage blocked, odd links.
const { chromium, ok, eq, open, state, done } = require('./lib.cjs');
(async () => {
  const b = await chromium.launch();
  let o, p, s;
  // 1. a phone that will not start a video with sound from a tap outside the player
  o = await open(b, { mobile: true, init: 'window.__stuck = true;' }); p = o.page;
  s = await state(p); ok(s.on && s.P.muted && s.pill, 'sound-refusing phone: TV still comes on silently');
  await p.evaluate(() => document.querySelector('[data-sec="top"] .pstv-card[data-v]').click());
  await p.waitForTimeout(1700); s = await state(p); ok(s.on, 'sound-refusing phone: screen is never left covered');
  eq(s.P.state, -1, 'sound-refusing phone: video did not start with sound (as simulated)');
  await p.waitForTimeout(3300); s = await state(p);
  ok(s.P.state === 1 && s.P.muted && s.pill && !s.soundOn, 'sound-refusing phone: falls back to playing silently with "Tap for sound"', s.P);
  eq(s.mode, 'vod', 'sound-refusing phone: the chosen video is the one playing');
  eq(p.errs, [], 'sound-refusing phone: no script errors'); await o.ctx.close();

  // 2. a browser that will not autoplay at all (low power mode)
  o = await open(b, { mobile: true, init: 'window.__noStart = true;' }); p = o.page;
  s = await state(p); ok(!s.on && !s.led && !s.pill, 'no autoplay: the screen waits, dark, with its button'); eq(s.poster, 'Turn on the TV', 'no autoplay: button reads "Turn on the TV"');
  ok(s.title.length > 3 && s.next, 'no autoplay: the channel banner still shows NOW and NEXT');
  await p.tap('#pstv-poster'); await p.waitForTimeout(1800); s = await state(p);
  ok(s.on, 'no autoplay: after a tap the real player is uncovered so it can be tapped');
  await p.evaluate(() => { window.__noStart = false; window.__main.emit(1); }); await p.waitForTimeout(200); s = await state(p);
  ok(s.on && s.led, 'no autoplay: playing once the viewer taps the player');
  eq(p.errs, [], 'no autoplay: no script errors'); await o.ctx.close();

  // 3. nothing will play (every video refuses)
  o = await open(b, { init: 'window.__failAll = true;' }); p = o.page; await p.waitForTimeout(1500);
  s = await state(p); ok(!s.on, 'nothing plays: the screen goes back to its poster'); eq(s.poster, 'Watch on YouTube', 'nothing plays: the button offers YouTube');
  const loads = s.P.calls.length; await p.waitForTimeout(1500); s = await state(p);
  ok((await p.evaluate(() => window.__main.calls.length)) <= 12, 'nothing plays: it stops trying instead of looping', s.P.calls.length);
  await p.evaluate(() => { window.__opened = []; window.open = (u, t, f) => { window.__opened.push([u, t, f]); return null; }; });
  await p.click('#pstv-poster'); const opened = await p.evaluate(() => window.__opened);
  ok(opened.length === 1 && /^https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}$/.test(opened[0][0]) && opened[0][1] === '_blank', 'nothing plays: the button opens the video on YouTube in a new tab', opened);
  eq(p.errs, [], 'nothing plays: no script errors'); await o.ctx.close();

  // 4. YouTube's player script never arrives
  o = await open(b, { fake: false, init: '' }); await o.ctx.close();
  {
    const ctx = await b.newContext({ viewport: { width: 1366, height: 800 } }); p = await ctx.newPage(); p.errs = [];
    p.on('pageerror', e => p.errs.push(e.message));
    await p.route('**/iframe_api', r => r.abort());
    await p.route('**/oembed**', r => r.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"title":"Fetched title"}' }));
    await p.route('**/embed/**', r => r.fulfill({ contentType: 'text/html', body: '<body>embed</body>' }));
    await p.goto(require('./lib.cjs').BASE, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(1200);
    s = await state(p); ok(!s.on && s.title.length > 3 && s.rows.length === 4, 'no player script: the page still shows the channel and the rows');
    await p.click('#pstv-poster'); await p.waitForTimeout(600); s = await state(p); ok(!s.plain, 'no player script: waits a little for the script first');
    await p.waitForTimeout(10200); s = await state(p);
    ok(s.plain && /youtube\.com\/embed\/[\w-]{11}\?autoplay=1&playsinline=1&rel=0(&start=\d+)?$/.test(s.plain), 'no player script: falls back to a plain YouTube embed with sound', s.plain); ok(s.on, 'no player script: screen is on');
    const id = await p.evaluate(() => document.querySelector('[data-sec="top"] .pstv-card[data-v]').getAttribute('data-v'));
    await p.evaluate(() => document.querySelector('[data-sec="top"] .pstv-card[data-v]').click()); await p.waitForTimeout(300); s = await state(p);
    ok(s.plain.includes('/embed/' + id + '?'), 'no player script: a chosen video plays in the plain embed', s.plain); eq(s.mode, 'vod', 'no player script: on demand');
    await p.click('#pstv-b-next'); await p.waitForTimeout(200); s = await state(p); ok(!s.plain.includes('/embed/' + id + '?') && /\/embed\/[\w-]{11}\?/.test(s.plain), 'no player script: Next works');
    await p.click('#pstv-ch-up'); await p.waitForTimeout(300); s = await state(p); ok(s.mode === 'tv' && s.num === '02' && /start=\d+|autoplay=1/.test(s.plain), 'no player script: changing channel works', s.plain);
    await p.click('#pstv-b-live'); await p.waitForTimeout(300); s = await state(p); ok(s.mode === 'vod' || s.liveFrame, 'no player script: Live works');
    eq(p.errs, [], 'no player script: no script errors'); await ctx.close();
  }

  // 5. storage blocked
  o = await open(b, { init: 'Object.defineProperty(window, "localStorage", { get() { throw new Error("blocked"); } });' }); p = o.page;
  s = await state(p); ok(s.on && s.chans === 11, 'storage blocked: the page works');
  await p.click('#pstv-ch-up'); await p.waitForTimeout(200); s = await state(p); eq(s.num, '02', 'storage blocked: channels change');
  eq(p.errs, [], 'storage blocked: no script errors'); await o.ctx.close();

  // 6. links
  o = await open(b, { query: '?v=NcglnAtOalk' }); p = o.page; s = await state(p);
  ok(s.mode === 'vod' && s.P.first.id === 'NcglnAtOalk' && s.P.muted && s.back, 'a ?v= link opens that video (silent until tapped)', s.P.first); await o.ctx.close();
  o = await open(b, { query: '?ch=gu' }); p = o.page; s = await state(p); ok(s.num === '03' && s.name === 'Gujarati' && s.sel === 'gu', 'a ?ch= link opens that channel'); await o.ctx.close();
  o = await open(b, { query: '?v=%3Cscript%3E&ch=nope' }); p = o.page; s = await state(p); ok(s.mode === 'tv' && s.num === '01', 'a broken link is ignored'); eq(p.errs, [], 'a broken link causes no errors'); await o.ctx.close();
  // the last channel is remembered
  o = await open(b, {}); p = o.page; await p.click('#pstv-ch-up'); await p.click('#pstv-ch-up'); await p.waitForTimeout(200);
  await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(1200); s = await state(p); eq(s.num, '03', 'the last channel is remembered on the next visit'); await o.ctx.close();
  // two copies of the script do not fight
  o = await open(b, {}); p = o.page;
  await p.evaluate(() => { const s = document.createElement('script'); s.textContent = document.getElementById('pstv-script').textContent; document.body.appendChild(s); }); await p.waitForTimeout(300);
  s = await state(p); ok(s.chans === 11 && s.players >= 1 && (await p.evaluate(() => window.__players.filter(x => x.isMain).length)) === 1, 'running the script twice does nothing extra'); await o.ctx.close();

  await b.close();
  done('robust');
})().catch(e => { console.error('CRASH', e); process.exit(2); });
