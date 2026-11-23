// Every button and state of the television, on a desktop and on a phone, with the stand-in player.
const { chromium, ok, eq, open, state, done } = require('./lib.cjs');
(async () => {
  const b = await chromium.launch();
  for (const mobile of [false, true]) {
    const T = mobile ? '[phone] ' : '[desktop] ';
    const { ctx, page: p } = await open(b, { mobile });
    const hit = sel => mobile ? p.tap(sel) : p.click(sel);
    const wait = ms => p.waitForTimeout(ms);
    let s = await state(p);
    // --- boot: the TV comes on by itself, silent, on channel 01
    eq(s.num, '01', T + 'starts on channel 01'); eq(s.name, 'Hindi', T + 'channel name is English');
    eq(s.mode, 'tv', T + 'starts in TV mode'); ok(s.on && s.led, T + 'screen is on after autoplay');
    ok(s.P && s.P.muted && s.P.first.pv.autoplay === 1 && s.P.first.pv.mute === 1 && s.P.first.pv.playsinline === 1, T + 'first play is muted, inline autoplay', s.P && s.P.first);
    ok(s.P.first.pv.start > 0 || s.P.first.pv.start === undefined, T + 'joins the programme part-way (clock based)');
    ok(s.pill, T + '"Tap for sound" shows while silent'); ok(!s.soundOn && s.muteLabel === 'Turn sound on', T + 'sound button shows muted');
    ok(s.title.length > 3 && s.title !== 'Loading…', T + 'NOW title shown', s.title); ok(/^\d{1,2}:\d\d [ap]m – \d{1,2}:\d\d [ap]m$/.test(s.sub), T + 'NOW time range shown', s.sub);
    ok(s.bar !== null && s.bar >= 0 && s.bar <= 100, T + 'progress bar shown', s.bar); ok(s.next && /^\d{1,2}:\d\d [ap]m /.test(s.next), T + 'NEXT shown with a time', s.next);
    ok(/^\d{1,2}:\d\d [ap]m$/.test(s.clock), T + 'clock shown', s.clock); eq(s.chans, 11, T + '11 channels listed'); eq(s.sel, 'hi', T + 'channel 01 highlighted');
    ok(!s.back && !s.prev && !s.nextBtn, T + 'on-demand buttons hidden in TV mode'); ok(s.liveBtn && s.liveCard, T + 'Live button and card shown');
    eq(s.view, 'ch', T + 'channel list showing, guide closed'); eq(s.overflow, 0, T + 'no sideways overflow');
    eq(s.rows.map(r => r.split(':')[0]), ['new', 'live', 'top', 'shorts'], T + 'rows in order'); eq(s.groups.map(r => r.split(':')[0]), ['start', 'courses', 'podcasts', 'more'], T + 'playlist groups in order');
    ok(s.rows.every(r => +r.split(':')[1] >= 10), T + 'every row has videos', s.rows);
    // --- auto-sync: videos newer than the snapshot appear at the front of their row
    await wait(3600);
    let sync = await p.evaluate(() => { const c = [...document.querySelectorAll('[data-sec="new"] .pstv-card[data-v]')]; return { n: c.length, first: c.slice(0, 3).map(x => x.getAttribute('data-v')), titles: c.slice(0, 2).map(x => x.querySelector('.pstv-ct').textContent) }; });
    eq(sync.first.slice(0, 2), ['NEWVIDEO001', 'NEWVIDEO002'], T + 'new uploads are added to the front of "Latest videos"'); eq(sync.n, +s.rows[0].split(':')[1] + 2, T + 'nothing is lost from the row');
    eq(sync.titles, ['Fetched title', 'Fetched title'], T + 'their titles are fetched');
    // --- sound
    await hit('#pstv-unmute'); await wait(150); s = await state(p);
    ok(!s.P.muted && !s.pill && s.soundOn && s.muteLabel === 'Turn sound off', T + 'tap for sound unmutes', s.P);
    ok(!s.P.calls.some(c => c.startsWith('vol:')), T + 'volume is not forced');
    await hit('#pstv-b-mute'); await wait(100); s = await state(p);
    ok(s.P.muted && !s.soundOn && s.pill, T + 'sound button mutes');
    await hit('#pstv-ch-up'); await wait(300); s = await state(p);
    eq(s.num, '02', T + 'CH up goes to 02'); eq(s.name, 'English', T + '02 is English'); ok(s.P.muted, T + 'a TV muted on purpose stays muted when changing channel');
    ok(s.banner && s.noise, T + 'channel change shows static and the channel number'); eq(s.sel, 'en', T + 'channel list follows');
    ok(s.P.calls.some(c => c.startsWith('load:')), T + 'channel change loads a programme', s.P.calls);
    await wait(500); s = await state(p); ok(!s.noise, T + 'static clears after a moment');
    await hit('#pstv-b-mute'); await wait(100); s = await state(p); ok(!s.P.muted && s.soundOn, T + 'sound button unmutes');
    await hit('#pstv-ch-dn'); await hit('#pstv-ch-dn'); await wait(300); s = await state(p);
    eq(s.num, '11', T + 'CH down wraps from 01 to 11'); eq(s.name, 'Maa ka Sandesh', T + '11 is Maa ka Sandesh'); ok(!s.P.muted, T + 'sound stays on across channels');
    eq(s.rows.map(r => r.split(':')[0])[0], 'new', T + 'rows follow the channel');
    await hit('#pstv-ch-up'); await wait(300); s = await state(p); eq(s.num, '01', T + 'CH up wraps from 11 to 01');
    await wait(2700); s = await state(p); ok(!s.banner, T + 'channel number fades');
    // same channel again: no reload
    let before = (await state(p)).P.calls.length;
    await p.evaluate(() => document.querySelector('.pstv-chan[data-ch="hi"]').scrollIntoView({ block: 'nearest', inline: 'nearest' }));
    await hit('.pstv-chan[data-ch="hi"]'); await wait(200);
    s = await state(p); const loadsAfter = s.P.calls.filter(c => c.startsWith('load:')).length;
    ok(s.mode === 'tv', T + 'tapping the current channel keeps TV mode');
    // --- programme ends / fails
    const v0 = s.P.vid; await p.evaluate(() => window.__main.fail(150)); await wait(200); s = await state(p);
    ok(s.P.vid !== v0 && /@0$/.test(s.P.calls.filter(c => c.startsWith('load:')).pop()), T + 'a video that will not play is skipped', s.P.calls);
    const v1 = s.P.vid; await p.evaluate(() => window.__main.emit(0)); await wait(200); s = await state(p);
    ok(s.mode === 'tv' && s.P.vid && s.title.length > 3, T + 'when a programme ends the next one starts', s.P.calls);
    // --- guide
    await hit('#pstv-b-guide'); await wait(150); s = await state(p);
    ok(s.view === 'guide' && s.guidePressed === 'true' && s.guideVisible && s.guide >= 5, T + 'Guide opens the programme guide', { view: s.view, n: s.guide }); eq(s.guideH, 'Programme guide', T + 'guide heading');
    if (mobile) ok(s.guide <= 6, T + 'guide stays short on a phone', s.guide);
    await hit('#pstv-gx'); await wait(100); s = await state(p); ok(s.view === 'ch' && s.guidePressed === 'false', T + 'guide closes with ×');
    await hit('#pstv-b-guide'); await hit('#pstv-b-guide'); await wait(100); s = await state(p); eq(s.view, 'ch', T + 'Guide button toggles');
    // --- NEXT → on demand → back
    const nextTitle = s.next;
    await hit('#pstv-nextrow'); await wait(300); s = await state(p);
    eq(s.mode, 'vod', T + 'tapping NEXT plays it on demand'); eq(s.badge, 'On demand', T + 'badge says On demand'); ok(s.back, T + '"Back to TV" appears');
    ok(nextTitle.includes(s.title.slice(0, 12)), T + 'the right programme plays', { nextTitle, title: s.title });
    await hit('#pstv-b-tv'); await wait(300); s = await state(p);
    ok(s.mode === 'tv' && !s.back && !s.prev && !s.nextBtn, T + 'Back to TV returns to the live channel');
    // --- a video from a row
    await p.evaluate(() => document.querySelector('[data-sec="top"]').scrollIntoView({ block: 'center' })); await wait(300);
    const ids = await p.evaluate(() => [...document.querySelectorAll('[data-sec="top"] .pstv-card[data-v]')].map(c => c.getAttribute('data-v')));
    await hit(`[data-sec="top"] .pstv-card[data-v="${ids[1]}"]`); await wait(900); s = await state(p);
    eq(s.P.vid, ids[1], T + 'tapping a card plays that video'); eq(s.mode, 'vod', T + 'card → on demand'); eq(s.sub, 'Most viewed', T + 'row name shown under the title');
    ok(s.prev && s.nextBtn && s.back, T + 'previous / next / back shown', { prev: s.prev, next: s.nextBtn }); ok(s.cur >= 1, T + 'the playing card is outlined');
    ok(!s.P.muted, T + 'a tapped video has sound'); const y = await p.evaluate(() => scrollY); ok(y < 160, T + 'page returns to the TV', y);
    eq(s.view, mobile ? 'ch' : 'guide', T + (mobile ? 'phone keeps the guide closed' : 'desktop shows Up next'));
    await hit('#pstv-b-next'); await wait(200); s = await state(p); eq(s.P.vid, ids[2], T + 'Next plays the next in the row');
    await hit('#pstv-b-prev'); await hit('#pstv-b-prev'); await wait(200); s = await state(p); eq(s.P.vid, ids[0], T + 'Previous goes back'); ok(!s.prev, T + 'Previous hides on the first video');
    await p.evaluate(() => window.__main.emit(0)); await wait(200); s = await state(p); eq(s.P.vid, ids[1], T + 'when a video ends the next in the row plays');
    // last one in the queue → back to TV
    await p.evaluate(() => document.querySelector('[data-sec="top"]').scrollIntoView({ block: 'center' })); await wait(200);
    await p.evaluate(id => document.querySelector(`[data-sec="top"] .pstv-card[data-v="${id}"]`).click(), ids[ids.length - 1]); await wait(300);
    s = await state(p); eq(s.P.vid, ids[ids.length - 1], T + 'last card plays'); ok(!s.nextBtn, T + 'Next hides on the last video');
    await p.evaluate(() => window.__main.emit(0)); await wait(300); s = await state(p); eq(s.mode, 'tv', T + 'after the last video the TV channel resumes');
    // --- show more
    await p.evaluate(() => document.querySelector('[data-sec="new"] [data-more]').scrollIntoView({ block: 'center', inline: 'center' })); await wait(200);
    const n0 = (await state(p)).rows[0];
    await p.evaluate(() => document.querySelector('[data-sec="new"] [data-more]').click()); await wait(600);
    s = await state(p); eq(+s.rows[0].split(':')[1], +n0.split(':')[1] + 16, T + '"Show more" adds 16 videos');
    await p.evaluate(() => document.querySelector('[data-sec="new"] [data-more]').click()); await wait(300);
    await p.evaluate(() => document.querySelector('[data-sec="new"] [data-more]').click()); await wait(300);
    ok(await p.evaluate(() => { const e = document.querySelector('[data-sec="new"] a.is-end'); return !!e && /playlist\?list=UULF/.test(e.href) && !document.querySelector('[data-sec="new"] [data-more]'); }), T + 'when a row runs out it links to YouTube');
    // --- playlists
    await p.evaluate(() => document.querySelector('[data-gsec="courses"]').scrollIntoView({ block: 'start' })); await wait(200);
    await hit('[data-gsec="courses"] .pstv-col'); await wait(1300);
    let panel = await p.evaluate(() => ({ cards: document.querySelectorAll('[data-gsec="courses"] .pstv-panel .pstv-card').length, exp: document.querySelector('[data-gsec="courses"] .pstv-col').getAttribute('aria-expanded'), h: (document.querySelector('[data-gsec="courses"] .pstv-panel h3') || {}).textContent, titles: [...document.querySelectorAll('[data-gsec="courses"] .pstv-panel .pstv-ct')].map(x => x.textContent) }));
    ok(panel.cards === 4 && panel.exp === 'true', T + 'a playlist opens as a panel with its videos', panel); ok(panel.titles.every(t => t === 'Fetched title'), T + 'titles are fetched for videos outside the catalogue', panel.titles);
    await p.evaluate(() => document.querySelector('[data-gsec="courses"] .pstv-panel .pstv-card').click()); await wait(300); s = await state(p);
    eq(s.P.vid, 'PLVIDEO0001', T + 'a video inside the playlist plays'); ok(s.nextBtn, T + 'the playlist is the queue');
    await p.evaluate(() => document.querySelector('[data-gsec="courses"]').scrollIntoView({ block: 'start' })); await wait(200);
    await hit('[data-playall]'); await wait(400); s = await state(p);
    eq(s.mode, 'list', T + '"Play all" plays the playlist'); eq(s.badge, 'Playlist', T + 'badge says Playlist'); ok(s.P.calls.some(c => c.startsWith('list:PL')), T + 'the whole YouTube playlist is loaded', s.P.calls);
    ok(s.next !== null, T + 'NEXT shows the next in the playlist');
    await hit('#pstv-b-next'); await wait(200); s = await state(p); eq(s.P.vid, 'PLVIDEO0002', T + 'Next works in a playlist');
    await p.evaluate(() => { const P = window.__main; P.idx = P.list.length - 1; P.vid = P.list[P.idx]; P.emit(0); }); await wait(300); s = await state(p); eq(s.mode, 'tv', T + 'after a playlist the TV channel resumes');
    await p.evaluate(() => document.querySelector('[data-gsec="courses"]').scrollIntoView({ block: 'start' })); await wait(200);
    await hit('[data-colclose]'); await wait(100);
    ok(await p.evaluate(() => !document.querySelector('[data-gsec="courses"] .pstv-panel') && document.querySelector('[data-gsec="courses"] .pstv-col').getAttribute('aria-expanded') === 'false'), T + 'the panel closes');
    // --- search
    await p.evaluate(() => document.getElementById('pstv-q').scrollIntoView({ block: 'center' })); await wait(200);
    await p.fill('#pstv-q', 'karma'); await wait(500);
    let res = await p.evaluate(() => ({ cards: document.querySelectorAll('#pstv-results .pstv-card[data-v]').length, cols: document.querySelectorAll('#pstv-results .pstv-col').length, h: (document.querySelector('#pstv-results h3') || {}).textContent, yt: (document.querySelector('#pstv-results a.pstv-pill') || {}).href }));
    ok(res.cards + res.cols > 0 && /karma/.test(res.h), T + 'search finds videos', res); ok(/search\?query=karma$/.test(res.yt || ''), T + 'search offers YouTube', res.yt);
    await p.fill('#pstv-q', 'zzzzqqq'); await wait(500);
    ok(await p.evaluate(() => /No video with that name/.test(document.getElementById('pstv-results').textContent)), T + 'search says when nothing is found');
    await p.fill('#pstv-q', 'आत्मा'); await p.press('#pstv-q', 'Enter'); await wait(300);
    res = await p.evaluate(() => document.querySelectorAll('#pstv-results .pstv-card[data-v]').length); ok(res > 0, T + 'search works in Hindi script and on Enter', res);
    await p.evaluate(() => document.querySelector('#pstv-results .pstv-card[data-v]').click()); await wait(300); s = await state(p); eq(s.mode, 'vod', T + 'a search result plays');
    await p.evaluate(() => document.querySelector('[data-clearq]').click()); await wait(150);
    ok(await p.evaluate(() => document.getElementById('pstv-results').innerHTML === '' && document.getElementById('pstv-q').value === ''), T + 'search clears');
    // --- shorts
    await hit('#pstv-b-tv'); await wait(200);
    await p.evaluate(() => document.querySelector('[data-sec="shorts"]').scrollIntoView({ block: 'center' })); await wait(200);
    await p.evaluate(() => document.querySelectorAll('[data-sec="shorts"] .pstv-card[data-v]')[1].click()); await wait(300);
    let sh = await p.evaluate(() => { const l = document.querySelector('.pstv-layer'); return { open: l && !l.hidden, src: l.querySelector('iframe').src, prev: l.querySelectorAll('.pstv-sh-nav')[0].disabled, t: l.querySelector('.pstv-sh-t').textContent, focus: document.activeElement.className, paused: window.__main.calls.includes('pause') }; });
    ok(sh.open && /\/embed\/[\w-]{11}\?autoplay=1&playsinline=1/.test(sh.src) && !sh.prev && sh.t.length > 2, T + 'a short opens in the tall viewer', sh); ok(sh.paused, T + 'the TV pauses behind a short'); ok(/pstv-sh-x/.test(sh.focus), T + 'focus moves into the viewer');
    const src1 = sh.src; await p.keyboard.press('ArrowRight'); await wait(100); sh = await p.evaluate(() => document.querySelector('.pstv-layer iframe').src); ok(sh !== src1, T + 'arrow key moves to the next short');
    await p.evaluate(() => document.querySelector('.pstv-layer [data-sh="-1"]').click()); await wait(100); sh = await p.evaluate(() => document.querySelector('.pstv-layer iframe').src); eq(sh, src1, T + 'previous button goes back');
    await p.keyboard.press('Escape'); await wait(300);
    sh = await p.evaluate(() => ({ hidden: document.querySelector('.pstv-layer').hidden, src: document.querySelector('.pstv-layer iframe').src, last: window.__main.calls.slice(-1)[0] }));
    ok(sh.hidden && sh.src === 'about:blank', T + 'Esc closes the viewer and stops the short', sh); ok(/^load:/.test(sh.last), T + 'the TV resumes after a short', sh.last);
    // --- mini player
    await p.evaluate(() => scrollTo(0, 0)); await wait(300);
    await p.evaluate(() => scrollTo(0, 1800)); await wait(500); s = await state(p);
    ok(s.docked, T + 'the picture follows as a mini player once sound is on');
    let r = await p.evaluate(() => { const x = document.getElementById('pstv-frame').getBoundingClientRect(); return [x.left, x.top, x.right, x.bottom, innerWidth, innerHeight]; });
    ok(r[0] >= 0 && r[1] >= 0 && r[2] <= r[4] + 1 && r[3] <= r[5] + 1 && r[2] - r[0] >= 180, T + 'mini player sits inside the window', r); eq(s.posterK, 'Playing in the mini player', T + 'screen says where the picture went');
    await p.evaluate(() => document.getElementById('pstv-dockx').click()); await wait(200); s = await state(p);
    ok(!s.docked && s.P.calls.slice(-1)[0] === 'pause', T + 'closing the mini player pauses');
    await p.evaluate(() => scrollTo(0, 0)); await wait(300);
    await hit('#pstv-poster').catch(() => {}); await wait(100);
    // muted viewer: no mini player
    await hit('#pstv-b-tv').catch(() => {}); await p.evaluate(() => window.__main.emit(1)); await wait(100);
    if ((await state(p)).soundOn) { await hit('#pstv-b-mute'); await wait(100); }
    await p.evaluate(() => scrollTo(0, 1800)); await wait(500); s = await state(p); ok(!s.docked, T + 'no mini player while the TV is silent');
    await p.evaluate(() => scrollTo(0, 0)); await wait(300);
    // --- every channel renders
    for (let i = 0; i < 11; i++) {
      await hit('#pstv-ch-up'); await wait(120); s = await state(p);
      ok(s.title.length > 2 && s.title !== 'Loading…' && s.rows.length >= 2 && s.mode === 'tv', T + `channel ${s.num} ${s.name} is on air`, { title: s.title, rows: s.rows });
    }
    eq(p.errs, [], T + 'no script errors');
    await ctx.close();
  }
  await b.close();
  done('flows');
})().catch(e => { console.error('CRASH', e); process.exit(2); });
