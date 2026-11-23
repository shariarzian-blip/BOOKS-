// Fingers, wheels, dragging and the keyboard: scrolling must go where the hand expects, and nothing may get stuck.
const { chromium, ok, eq, open, state, done } = require('./lib.cjs');
(async () => {
  const b = await chromium.launch();
  // ================= phone: touch =================
  {
    const { ctx, page: p } = await open(b, { mobile: true });
    const cdp = await ctx.newCDPSession(p);
    // a real finger: touch down, move in small steps, lift (the headless browser scrolls from these as a phone does)
    const swipe = async (x, y, dx, dy, steps = 14) => {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      for (let i = 1; i <= steps; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx * i / steps, y: y + dy * i / steps }] }); await p.waitForTimeout(14); }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    };
    const at = sel => p.evaluate(s => { const r = document.querySelector(s).getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), w: r.width, h: r.height, top: r.top }; }, sel);
    const scrollTo = sel => p.evaluate(s => { document.querySelector(s).scrollIntoView({ block: 'center' }); }, sel);
    const Y = () => p.evaluate(() => Math.round(scrollY));
    // a row: swipe sideways moves the row, not the page
    await scrollTo('[data-sec="new"] .pstv-rail'); await p.waitForTimeout(300);
    let c = await at('[data-sec="new"] .pstv-rail'), y0 = await Y();
    await swipe(c.x + 100, c.y, -260, 0); await p.waitForTimeout(400);
    let sl = await p.evaluate(() => document.querySelector('[data-sec="new"] .pstv-rail').scrollLeft);
    ok(sl > 150, 'phone: swiping a row sideways scrolls the row', sl); eq(await Y(), y0, 'phone: …and the page does not move');
    eq((await state(p)).mode, 'tv', 'phone: a swipe does not start a video');
    await p.waitForTimeout(900); sl = await p.evaluate(() => document.querySelector('[data-sec="new"] .pstv-rail').scrollLeft);
    await swipe(c.x - 100, c.y, 260, 0); await p.waitForTimeout(900);
    ok((await p.evaluate(() => document.querySelector('[data-sec="new"] .pstv-rail').scrollLeft)) < sl - 100, 'phone: swiping back scrolls the row back', sl);
    // a vertical swipe that starts on a row scrolls the page
    y0 = await Y(); await swipe(c.x, c.y, 0, -300); await p.waitForTimeout(400);
    ok((await Y()) > y0 + 200, 'phone: swiping up over a row scrolls the page', [y0, await Y()]);
    await swipe(c.x, c.y, 0, 300); await p.waitForTimeout(400);
    // the row can be swiped all the way to its end card
    await scrollTo('[data-sec="top"] .pstv-rail'); await p.waitForTimeout(300); c = await at('[data-sec="top"] .pstv-rail');
    for (let i = 0; i < 16; i++) await swipe(c.x + 120, c.y, -300, 0);
    await p.waitForTimeout(400);
    let end = await p.evaluate(() => { const r = document.querySelector('[data-sec="top"] .pstv-rail'), e = r.querySelector('[data-more]').getBoundingClientRect(); return { atEnd: r.scrollLeft >= r.scrollWidth - r.clientWidth - 2, endVisible: e.left < innerWidth && e.right > 0 }; });
    ok(end.atEnd && end.endVisible, 'phone: a row swipes to its end and shows "Show more"', end);
    // channel strip
    await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(300);
    c = await at('#pstv-chlist'); y0 = await Y();
    await swipe(c.x + 120, c.y, -300, 0); await p.waitForTimeout(400);
    ok((await p.evaluate(() => document.getElementById('pstv-chlist').scrollLeft)) > 150, 'phone: the channel strip swipes sideways'); eq(await Y(), y0, 'phone: …without moving the page');
    eq((await state(p)).num, '01', 'phone: swiping the strip does not change channel by accident');
    // channel banner: sideways swipe changes channel; vertical swipe scrolls the page
    c = await at('#pstv-osd');
    await swipe(c.x + 100, c.y, -220, 0); await p.waitForTimeout(500);
    let s = await state(p); eq(s.num, '02', 'phone: swiping the channel banner left goes to the next channel');
    await swipe(c.x - 100, c.y, 220, 0); await p.waitForTimeout(500); s = await state(p); eq(s.num, '01', 'phone: swiping it right goes back');
    y0 = await Y(); await swipe(c.x, c.y, 0, -260); await p.waitForTimeout(400); s = await state(p);
    ok((await Y()) > y0 + 150 && s.num === '01', 'phone: swiping up on the banner scrolls the page and keeps the channel', [y0, await Y(), s.num]);
    await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(300);
    // over the picture itself the page still scrolls
    c = await at('#pstv-screen'); y0 = await Y(); await swipe(c.x, c.y, 0, -260); await p.waitForTimeout(400);
    ok((await Y()) > y0 + 150, 'phone: swiping up over the picture scrolls the page', [y0, await Y()]);
    // tapping works after all that swiping
    await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(300);
    await p.tap('#pstv-ch-up'); await p.waitForTimeout(300); eq((await state(p)).num, '02', 'phone: buttons still respond after swiping');
    await p.tap('#pstv-ch-dn'); await p.waitForTimeout(300);
    await scrollTo('[data-sec="live"] .pstv-rail'); await p.waitForTimeout(300);
    await p.tap('[data-sec="live"] .pstv-card[data-v]'); await p.waitForTimeout(800); s = await state(p);
    ok(s.mode === 'vod' && (await Y()) < 160, 'phone: tapping a card plays it and brings the TV back into view', [s.mode, await Y()]);
    // shorts viewer: the page behind does not scroll; a swipe outside the video changes short
    await p.tap('#pstv-b-tv'); await scrollTo('[data-sec="shorts"] .pstv-rail'); await p.waitForTimeout(300);
    await p.tap('[data-sec="shorts"] .pstv-card[data-v]'); await p.waitForTimeout(400);
    y0 = await Y(); const src0 = await p.evaluate(() => document.querySelector('.pstv-layer iframe').src);
    const vp = p.viewportSize(); c = await at('.pstv-layer .pstv-sh-t');
    await swipe(c.x, c.y, -200, 0); await p.waitForTimeout(400);
    ok((await p.evaluate(() => document.querySelector('.pstv-layer iframe').src)) !== src0, 'phone: swiping in the shorts viewer goes to the next short'); eq(await Y(), y0, 'phone: the page behind the shorts viewer stays still');
    const tapTarget = await p.evaluate(() => { const x = document.querySelector('.pstv-layer .pstv-sh-x').getBoundingClientRect(); return [x.width, x.height]; });
    ok(tapTarget[0] >= 44 && tapTarget[1] >= 44, 'phone: the close button is big enough for a thumb', tapTarget);
    await p.tap('.pstv-layer .pstv-sh-x'); await p.waitForTimeout(300); ok(await p.evaluate(() => document.querySelector('.pstv-layer').hidden), 'phone: the shorts viewer closes');
    // every control is big enough to tap
    await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(200);
    const small = await p.evaluate(() => [...document.querySelectorAll('#pstv .pstv-ctl button, #pstv .pstv-chan, #pstv #pstv-live-b, #pstv .pstv-find input')].filter(e => e.offsetParent).map(e => { const r = e.getBoundingClientRect(); return [e.id || e.className, Math.round(r.width), Math.round(r.height)]; }).filter(x => x[2] < 38 || x[1] < 38));
    eq(small, [], 'phone: every control is at least 38px in both directions');
    const fs = await p.evaluate(() => parseFloat(getComputedStyle(document.getElementById('pstv-q')).fontSize)); ok(fs >= 16, 'phone: the search box will not make an iPhone zoom in (16px text)', fs);
    eq(p.errs, [], 'phone: no script errors'); await ctx.close();
  }
  // ================= desktop: wheel, drag, arrows, keyboard, resizing =================
  {
    const { ctx, page: p } = await open(b, { viewport: { width: 1366, height: 800 } });
    const at = sel => p.evaluate(s => { const r = document.querySelector(s).getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; }, sel);
    const Y = () => p.evaluate(() => Math.round(scrollY));
    // wheel over the picture scrolls the page
    let c = await at('#pstv-screen'); await p.mouse.move(c.x, c.y); let y0 = await Y(); await p.mouse.wheel(0, 300); await p.waitForTimeout(300);
    ok((await Y()) >= y0 + 250, 'desktop: the wheel over the picture scrolls the page', [y0, await Y()]);
    await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(200);
    // wheel over the channel list scrolls the list first, then the page (never stuck)
    c = await at('#pstv-chlist'); await p.mouse.move(c.x, c.y);
    // nothing inside the page scrolls up and down on its own, so the wheel can never get caught
    const traps = await p.evaluate(() => [...document.querySelectorAll('#pstv *')].filter(e => { const cs = getComputedStyle(e); return /(auto|scroll)/.test(cs.overflowY) && e.scrollHeight > e.clientHeight + 1 && e.offsetParent; }).map(e => e.id || e.className));
    eq(traps, [], 'desktop: no part of the page scrolls vertically inside itself');
    y0 = await Y(); await p.mouse.wheel(0, 300); await p.waitForTimeout(300);
    ok((await Y()) >= y0 + 250, 'desktop: the wheel over the channel list scrolls the page', [y0, await Y()]);
    await p.click('#pstv-b-guide'); await p.waitForTimeout(150); c = await at('#pstv-glist'); await p.mouse.move(c.x, c.y); y0 = await Y(); await p.mouse.wheel(0, 300); await p.waitForTimeout(300);
    ok((await Y()) >= y0 + 250, 'desktop: the wheel over the programme guide scrolls the page', [y0, await Y()]);
    await p.evaluate(() => scrollTo(0, 0)); await p.click('#pstv-b-guide'); await p.waitForTimeout(150);
    // wheel over a row scrolls the page (vertical) and the row (sideways)
    await p.evaluate(() => document.querySelector('[data-sec="new"] .pstv-rail').scrollIntoView({ block: 'center' })); await p.waitForTimeout(300);
    c = await at('[data-sec="new"] .pstv-rail'); await p.mouse.move(c.x, c.y); y0 = await Y(); await p.mouse.wheel(0, 240); await p.waitForTimeout(300);
    ok((await Y()) >= y0 + 200, 'desktop: the wheel over a row scrolls the page, the row does not trap it', [y0, await Y()]);
    await p.evaluate(() => document.querySelector('[data-sec="new"] .pstv-rail').scrollIntoView({ block: 'center' })); await p.waitForTimeout(300);
    c = await at('[data-sec="new"] .pstv-rail'); await p.mouse.move(c.x, c.y); await p.mouse.wheel(300, 0); await p.waitForTimeout(300);
    ok((await p.evaluate(() => document.querySelector('[data-sec="new"] .pstv-rail').scrollLeft)) > 200, 'desktop: a sideways wheel or trackpad swipe scrolls the row');
    await p.evaluate(() => { document.querySelector('[data-sec="new"] .pstv-rail').scrollLeft = 0; }); await p.waitForTimeout(200);
    // arrows
    let ar = await p.evaluate(() => [...document.querySelectorAll('[data-sec="new"] .pstv-arrow')].map(a => a.disabled)); eq(ar, [true, false], 'desktop: at the start the left arrow is dimmed, the right one is live');
    await p.click('[data-sec="new"] .pstv-arrow[data-scroll="1"]'); await p.waitForTimeout(900);
    let sl = await p.evaluate(() => document.querySelector('[data-sec="new"] .pstv-rail').scrollLeft); ok(sl > 400, 'desktop: the right arrow scrolls the row by about a screenful', sl);
    ar = await p.evaluate(() => [...document.querySelectorAll('[data-sec="new"] .pstv-arrow')].map(a => a.disabled)); eq(ar, [false, false], 'desktop: both arrows live in the middle');
    for (let i = 0; i < 8; i++) { await p.click('[data-sec="new"] .pstv-arrow[data-scroll="1"]', { force: true }).catch(() => {}); await p.waitForTimeout(600); }
    ar = await p.evaluate(() => [...document.querySelectorAll('[data-sec="new"] .pstv-arrow')].map(a => a.disabled)); eq(ar, [false, true], 'desktop: at the end the right arrow is dimmed');
    await p.click('[data-sec="new"] .pstv-arrow[data-scroll="-1"]'); await p.waitForTimeout(900);
    ok((await p.evaluate(() => { const r = document.querySelector('[data-sec="new"] .pstv-rail'); return r.scrollLeft < r.scrollWidth - r.clientWidth - 300; })), 'desktop: the left arrow scrolls back');
    await p.evaluate(() => { document.querySelector('[data-sec="new"] .pstv-rail').scrollLeft = 0; }); await p.waitForTimeout(300);
    // drag with the mouse
    c = await at('[data-sec="new"] .pstv-rail'); const before = (await state(p)).P.calls.length;
    await p.mouse.move(c.x + 200, c.y); await p.mouse.down(); await p.mouse.move(c.x + 100, c.y, { steps: 5 }); await p.mouse.move(c.x - 200, c.y, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(300);
    sl = await p.evaluate(() => document.querySelector('[data-sec="new"] .pstv-rail').scrollLeft); ok(sl > 370 && sl < 420, 'desktop: a row dragged with the mouse moves with the hand and stays where it is let go', sl);
    let s = await state(p); ok(s.mode === 'tv' && s.P.calls.length === before, 'desktop: dragging does not start a video', s.P.calls);
    ok(!(await p.evaluate(() => document.querySelector('[data-sec="new"] .pstv-rail').classList.contains('is-drag'))), 'desktop: drag state is cleared');
    c = await at('[data-sec="new"] .pstv-card[data-v]:nth-child(3)'); await p.mouse.click(c.x, c.y); await p.waitForTimeout(700); s = await state(p);
    eq(s.mode, 'vod', 'desktop: a plain click right after a drag still plays the video');
    await p.click('#pstv-b-tv'); await p.waitForTimeout(200);
    // keyboard
    await p.evaluate(() => document.querySelector('[data-sec="top"] .pstv-rail').scrollIntoView({ block: 'center' })); await p.waitForTimeout(200);
    await p.focus('[data-sec="top"] .pstv-card[data-v]'); await p.keyboard.press('Tab'); await p.keyboard.press('Tab');
    const fid = await p.evaluate(() => document.activeElement.getAttribute('data-v')); await p.keyboard.press('Enter'); await p.waitForTimeout(700); s = await state(p);
    ok(fid && s.P.vid === fid && s.mode === 'vod', 'keyboard: Tab to a card and Enter plays it', [fid, s.P.vid]);
    await p.focus('#pstv-ch-up'); await p.keyboard.press('Space'); await p.waitForTimeout(300); s = await state(p); eq(s.num, '02', 'keyboard: Space on CH works');
    const ring = await p.evaluate(() => { const e = document.getElementById('pstv-ch-up'); e.focus(); return getComputedStyle(e).outlineStyle; });
    await p.keyboard.press('Tab'); const ring2 = await p.evaluate(() => getComputedStyle(document.activeElement).outlineStyle + '|' + getComputedStyle(document.activeElement).outlineWidth);
    ok(/solid\|2px/.test(ring2), 'keyboard: the focused control shows a ring', ring2);
    const order = await p.evaluate(() => [...document.querySelectorAll('#pstv button, #pstv a, #pstv input')].filter(e => e.offsetParent && e.tabIndex >= 0).slice(0, 7).map(e => e.id || e.className.split(' ')[0]));
    ok(await p.evaluate(() => { const f = [...document.querySelectorAll('#pstv button, #pstv a, #pstv input')].filter(e => e.offsetParent && getComputedStyle(e).visibility !== 'hidden'); return !!f[0].closest('.pstv-tv') && f.findIndex(e => e.closest('.pstv-ctl')) < f.findIndex(e => e.closest('.pstv-body')); }), 'keyboard: focus goes TV → remote → rows', order);
    // labels for screen readers
    const unlabeled = await p.evaluate(() => [...document.querySelectorAll('#pstv button, #pstv a')].filter(e => e.offsetParent && !(e.textContent.trim() || e.getAttribute('aria-label'))).map(e => e.id || e.className));
    eq(unlabeled, [], 'every button has a name for screen readers');
    const imgs = await p.evaluate(() => [...document.querySelectorAll('#pstv img')].filter(i => !i.hasAttribute('alt')).length); eq(imgs, 0, 'every image has alt text set (empty for decoration)');
    // resizing the window: wide → tablet → phone → wide
    await p.click('#pstv-ch-dn'); await p.waitForTimeout(200);
    const vidBefore = (await state(p)).P.calls.length;
    for (const [w, h, want] of [[1100, 800, 'l'], [1024, 768, 'l'], [900, 800, 'm'], [700, 800, 'm'], [390, 800, 's'], [320, 640, 's'], [1920, 1080, 'l'], [1366, 800, 'l']]) {
      await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(350); s = await state(p);
      eq(s.w, want, `resize to ${w}px → layout "${want}"`); eq(s.overflow, 0, `resize to ${w}px → no sideways overflow`);
      const geo = await p.evaluate(() => { const r = e => document.querySelector(e).getBoundingClientRect(); const t = r('.pstv-tv'), c = r('#pstv-chlist'), ctl = r('.pstv-ctl'); return { tv: [Math.round(t.left), Math.round(t.right)], chBelow: c.top > t.bottom - 2, ctlIn: ctl.left >= 0 && ctl.right <= innerWidth + 1, vw: innerWidth }; });
      ok(geo.tv[0] >= 0 && geo.tv[1] <= geo.vw + 1 && geo.ctlIn, `resize to ${w}px → TV and remote inside the window`, geo);
      ok(want === 'l' ? !geo.chBelow : geo.chBelow, `resize to ${w}px → channels ${want === 'l' ? 'beside' : 'below'} the TV`, geo);
    }
    ok((await state(p)).P.calls.length === vidBefore, 'resizing does not restart the video');
    eq(p.errs, [], 'desktop: no script errors'); await ctx.close();
  }
  // ================= tablet touch (stacked layout, wider) =================
  {
    const { ctx, page: p } = await open(b, { mobile: true, device: 'iPad Mini' });
    const cdp = await ctx.newCDPSession(p);
    let s = await state(p); ok(s.w === 'm' || s.w === 's', 'tablet: stacked layout', s.w); eq(s.overflow, 0, 'tablet: no sideways overflow');
    const c = await p.evaluate(() => { const r = document.getElementById('pstv-chlist').getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x + 150, y: c.y }] });
    for (let i = 1; i <= 14; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: c.x + 150 - 400 * i / 14, y: c.y }] }); await p.waitForTimeout(14); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(400);
    ok((await p.evaluate(() => document.getElementById('pstv-chlist').scrollLeft)) > 200, 'tablet: the channel strip swipes');
    ok(await p.evaluate(() => getComputedStyle(document.querySelector('.pstv-arrows')).display !== 'none'), 'tablet: rows have arrows too');
    eq(p.errs, [], 'tablet: no script errors'); await ctx.close();
  }
  await b.close();
  done('gestures');
})().catch(e => { console.error('CRASH', e); process.exit(2); });
