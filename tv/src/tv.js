/* Paramshanti TV — the television, its channels and remote, and the rows of videos below it.
   No API key: the catalogue is baked into #pstv-data; newer videos are picked up through the YouTube
   IFrame Player API and YouTube's public oEmbed. */
(function () {
  'use strict';
  var root = document.getElementById('pstv');
  var dataEl = document.getElementById('pstv-data');
  if (!root || !dataEl || root.__pstv) return;
  root.__pstv = 1;

  var D;
  try { D = JSON.parse(dataEl.textContent); } catch (e) { return; }
  var V = D.V, CH = D.C;
  if (!V || !CH || !CH.length) return;
  var EPOCH = Date.UTC(2026, 0, 1) / 1000;      // the 24×7 loop is anchored here, so every viewer sees the same programme
  var IST = 330 * 60000;
  var API_WAIT = 10000;                         // how long to wait for YouTube's player script before using a plain embed

  /* ---------- small helpers ---------- */
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { } return null; }
  function okId(s) { return typeof s === 'string' && /^[\w-]{11}$/.test(s); }
  function thumb(id, size) { return 'https://i.ytimg.com/vi/' + id + '/' + (size || 'mqdefault') + '.jpg'; }
  function fmtDur(s) {
    if (!s) return '';
    var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60;
    return (h ? h + ':' + (m < 10 ? '0' : '') : '') + m + ':' + (x < 10 ? '0' : '') + x;
  }
  function fmtClock(ms) {
    try { return new Date(ms).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }); }
    catch (e) { var d = new Date(ms); return d.getHours() + ':' + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes(); }
  }
  function title(id) { return (V[id] && V[id][0]) || ''; }
  function closest(node, sel) { return node && node.closest ? node.closest(sel) : null; }
  function setText(node, text) { if (node.textContent !== text) node.textContent = text; }
  var ICON = {
    play: function (n) { return '<svg width="' + n + '" height="' + n + '" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg>'; },
    left: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
    right: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
    x: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 5l14 14M19 5L5 19"/></svg>',
    plus: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>'
  };

  /* ---------- state ---------- */
  var params = {};
  try { new URLSearchParams(location.search).forEach(function (v, k) { params[k] = v; }); } catch (e) { }
  var S = {
    ch: CH[0], mode: 'tv', cur: null, slot: null, queue: [], qlabel: '', list: null, listIds: null,
    started: false, muted: true, hush: false, bad: {}, errs: 0, dead: false, dockOff: false, dockBroken: false, open: null
  };
  var wantCh = params.ch || store('pstv.ch');
  CH.forEach(function (c, i) { c.num = (i < 9 ? '0' : '') + (i + 1); c.n = c.en || c.n || c.t; if (c.k === wantCh) S.ch = c; });
  function chan(key) { for (var i = 0; i < CH.length; i++) if (CH[i].k === key) return CH[i]; return null; }

  var el = {
    stage: $('pstv-set'), tv: closest($('pstv-screen'), '.pstv-tv'), screen: $('pstv-screen'), frame: $('pstv-frame'),
    poster: $('pstv-poster'), posterImg: $('pstv-poster-img'), posterLabel: $('pstv-poster-label'), posterK: $('pstv-poster-k'),
    unmute: $('pstv-unmute'), noise: $('pstv-static'), banner: $('pstv-banner'), osd: $('pstv-osd'),
    osdNum: $('pstv-osd-num'), osdLogo: $('pstv-osd-logo'), osdName: $('pstv-osd-name'), badge: $('pstv-badge'), clock: $('pstv-clock'),
    title: $('pstv-title'), sub: $('pstv-sub'), bar: $('pstv-bar'), nextRow: $('pstv-nextrow'), next: $('pstv-next'),
    bMute: $('pstv-b-mute'), bTv: $('pstv-b-tv'), bPrev: $('pstv-b-prev'), bNext: $('pstv-b-next'), bLive: $('pstv-b-live'), bGuide: $('pstv-b-guide'),
    side: $('pstv-side'), chlist: $('pstv-chlist'), guideH: $('pstv-guide-h'), glist: $('pstv-glist'),
    livecard: $('pstv-livecard'), liveH: $('pstv-live-h'), liveS: $('pstv-live-s'), liveB: $('pstv-live-b'),
    q: $('pstv-q'), body: $('pstv-body'), subLink: $('pstv-sub-link'), probe: $('pstv-probe')
  };

  /* ---------- fit: the block may be narrower than the window, or run edge to edge ---------- */
  function measure() {
    var r = root.getBoundingClientRect(), w = el.stage.getBoundingClientRect().width;      // the room the content really has
    root.setAttribute('data-w', w >= 900 ? 'l' : w >= 600 ? 'm' : 's');
    if (r.left < 12 || window.innerWidth - r.right < 12) root.setAttribute('data-edge', ''); else root.removeAttribute('data-edge');
    var rails = root.querySelectorAll('.pstv-rail');
    for (var i = 0; i < rails.length; i++) arrows(rails[i]);
  }
  (function () {              // when this block is the whole page, drop the empty band Squarespace leaves above and below it
    var fe = closest(root, '.fluid-engine'), wrap = closest(root, '.content-wrapper');
    if (fe && wrap && fe.querySelectorAll('.fe-block').length === 1) {
      wrap.style.setProperty('padding-top', '0', 'important');
      wrap.style.setProperty('padding-bottom', '0', 'important');
    }
  })();

  /* ---------- titles for videos that are newer than the baked catalogue ---------- */
  var tCache = {};
  try { tCache = JSON.parse(store('pstv.t') || '{}') || {}; } catch (e) { tCache = {}; }
  var tQueue = [], tBusy = 0, tAsked = {};
  function saveTitles() {
    var keys = Object.keys(tCache);
    if (keys.length > 700) keys.slice(0, keys.length - 700).forEach(function (k) { delete tCache[k]; });
    store('pstv.t', JSON.stringify(tCache));
  }
  function setTitle(id, text) {
    if (!V[id]) V[id] = ['', 0];
    V[id][0] = text;
    var nodes = root.querySelectorAll('[data-tt="' + id + '"]');
    for (var i = 0; i < nodes.length; i++) { nodes[i].textContent = text; nodes[i].classList.remove('is-wait'); }
    if (S.cur === id && S.mode !== 'live') setText(el.title, text);
  }
  function dropVideo(id) {
    S.bad[id] = 1;
    var nodes = root.querySelectorAll('.pstv-card[data-v="' + id + '"]');
    for (var i = 0; i < nodes.length; i++) nodes[i].remove();
  }
  function pumpTitles() {
    while (tBusy < 4 && tQueue.length) (function (id) {
      tBusy++;
      fetch('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent('https://www.youtube.com/watch?v=' + id))
        .then(function (r) { if (r.status === 401 || r.status === 403 || r.status === 404) { dropVideo(id); return null; } return r.ok ? r.json() : null; })
        .then(function (j) { if (j && j.title) { tCache[id] = j.title; setTitle(id, j.title); saveTitles(); } })
        .catch(function () { })
        .then(function () { tBusy--; pumpTitles(); });
    })(tQueue.shift());
  }
  function needTitle(id) {
    if (!okId(id) || title(id) || tAsked[id]) return;
    if (tCache[id]) { setTitle(id, tCache[id]); return; }
    if (!window.fetch) return;
    tAsked[id] = 1; tQueue.push(id); pumpTitles();
  }
  var titleIO = window.IntersectionObserver ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { titleIO.unobserve(e.target); needTitle(e.target.getAttribute('data-v')); } });
  }, { rootMargin: '200px' }) : null;
  function watchTitles(scope) {
    var nodes = scope.querySelectorAll('.pstv-card[data-v]');
    for (var i = 0; i < nodes.length; i++) {
      var id = nodes[i].getAttribute('data-v');
      if (title(id)) continue;
      if (tCache[id]) { setTitle(id, tCache[id]); continue; }
      if (titleIO) titleIO.observe(nodes[i]); else needTitle(id);
    }
  }
  // YouTube answers a missing thumbnail with a 120px grey placeholder rather than an error
  function imgFallback(e) {
    var img = e.target;
    if (!img || img.tagName !== 'IMG' || !img.getAttribute('data-fb')) return;
    if (e.type === 'error' || (img.naturalWidth && img.naturalWidth <= 120)) { var fb = img.getAttribute('data-fb'); img.removeAttribute('data-fb'); img.src = fb; }
  }
  root.addEventListener('load', imgFallback, true);
  root.addEventListener('error', imgFallback, true);

  /* ---------- the 24×7 programme wheel ---------- */
  function wheel(ch) {
    if (ch._w) return ch._w;
    var it = [], tot = 0;
    (ch.tv || []).forEach(function (id) {
      var d = V[id] && V[id][1];
      if (d) { it.push({ id: id, d: d, at: tot }); tot += d; }
    });
    return (ch._w = { it: it, tot: tot });
  }
  function slotAt(ch, ms) {
    var w = wheel(ch);
    if (!w.tot) return null;
    var pos = ((ms / 1000 - EPOCH) % w.tot + w.tot) % w.tot;
    for (var i = 0; i < w.it.length; i++) {
      var x = w.it[i];
      if (pos < x.at + x.d) return { i: i, id: x.id, d: x.d, off: pos - x.at, start: ms - (pos - x.at) * 1000 };
    }
    return null;
  }
  function upcoming(ch, ms, n) {
    var s = slotAt(ch, ms);
    if (!s) return [];
    var w = wheel(ch), out = [s], at = s.start + s.d * 1000, i = s.i;
    for (var k = 1; k < n; k++) {
      i = (i + 1) % w.it.length;
      out.push({ i: i, id: w.it[i].id, d: w.it[i].d, off: 0, start: at });
      at += w.it[i].d * 1000;
    }
    return out;
  }

  /* ---------- YouTube player ---------- */
  var P = null, Pready = false, pending = null, making = false, apiCbs = [], apiAsked = false, apiDown = false, asked = false;
  function apiReady() { return !!(window.YT && window.YT.Player); }
  function withAPI(cb) {
    if (apiReady()) return cb();
    apiCbs.push(cb);
    if (apiAsked) return;
    apiAsked = true;
    var prev = window.onYouTubeIframeAPIReady, poll;
    function flush() {
      if (!apiReady()) return;
      clearInterval(poll);
      var a = apiCbs; apiCbs = [];
      a.forEach(function (f) { try { f(); } catch (e) { } });
    }
    window.onYouTubeIframeAPIReady = function () { if (typeof prev === 'function') { try { prev(); } catch (e) { } } flush(); };
    poll = setInterval(flush, 400);
    setTimeout(function () { clearInterval(poll); }, 60000);
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      var s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; s.async = true; document.head.appendChild(s);
    }
    setTimeout(function () { if (!apiReady() && !P) { apiDown = true; if (pending && asked) { var j = pending; pending = null; plain(j); } } }, API_WAIT);
  }
  function plainOn() { return !!$('pstv-plain'); }
  function plain(job) {          // the player script never arrived: fall back to a bare YouTube embed
    var f = $('pstv-plain');
    if (!f) {
      f = document.createElement('iframe');
      f.id = 'pstv-plain';
      f.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen');
      f.setAttribute('allowfullscreen', '');
      f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      f.title = 'Video';
      el.frame.appendChild(f);
    }
    f.src = job.list
      ? 'https://www.youtube.com/embed/videoseries?list=' + encodeURIComponent(job.list) + '&autoplay=1&playsinline=1&rel=0'
      : 'https://www.youtube.com/embed/' + job.id + '?autoplay=1&playsinline=1&rel=0' + (job.start ? '&start=' + Math.floor(job.start) : '') + (S.muted ? '&mute=1' : '');
    S.started = true;
    lit(true);
    paintMute();
  }
  function lit(on) { el.screen.classList.toggle('is-on', on); if (el.tv) el.tv.classList.toggle('is-on', on); }
  function playerVars(extra) {
    var pv = { autoplay: 1, mute: S.muted ? 1 : 0, playsinline: 1, rel: 0, iv_load_policy: 3 };
    if (/^https?:$/.test(location.protocol)) pv.origin = location.origin;
    for (var k in extra) pv[k] = extra[k];
    return pv;
  }
  function makePlayer(job) {
    var extra = job.list ? { listType: 'playlist', list: job.list } : (job.start ? { start: Math.floor(job.start) } : {});
    var cfg = {
      width: '100%', height: '100%', playerVars: playerVars(extra),
      events: {
        onReady: function () {
          Pready = true;
          try { if (S.muted) P.mute(); else P.unMute(); } catch (e) { }
          if (pending) { var p = pending; pending = null; run(p); } else { try { P.playVideo(); } catch (e) { } }
        },
        onStateChange: onState, onError: onError
      }
    };
    if (job.id) cfg.videoId = job.id;
    try { P = new YT.Player('pstv-player', cfg); } catch (e) { P = null; apiDown = true; if (asked) plain(job); else pending = job; }
  }
  function run(job) {
    if (Pready) {
      try {
        if (job.list) P.loadPlaylist({ list: job.list, listType: 'playlist', index: 0 });
        else P.loadVideoById({ videoId: job.id, startSeconds: Math.floor(job.start || 0) });
      } catch (e) { }
      return;
    }
    if (apiDown) { if (asked) plain(job); else pending = job; return; }
    pending = job;
    if (!making) {
      making = true;
      withAPI(function () { if (apiDown) return; var j = pending; pending = null; if (j) makePlayer(j); });
    }
  }
  function onState(e) {
    var st = e.data;
    if (st === 1) {
      S.started = true; S.errs = 0; S.dead = false;
      lit(true);
      syncMute();
      if (S.mode === 'list') {
        try {
          var d = P.getVideoData();
          if (d && d.video_id) { S.cur = d.video_id; if (d.title && !title(d.video_id)) setTitle(d.video_id, d.title); }
        } catch (x) { }
        renderNow(); renderGuide();
      }
      markCurrent();
    } else if (st === 0) {
      if (S.mode === 'tv') tuneTV();
      else if (S.mode === 'vod') { if (!step(1)) goTV(); }
      else if (S.mode === 'list') {
        try { var pl = P.getPlaylist() || []; if (P.getPlaylistIndex() >= pl.length - 1) goTV(); } catch (x) { goTV(); }
      }
    }
  }
  function onError(e) {
    var code = e && e.data;
    if (S.cur) {
      S.bad[S.cur] = 1;
      if (code === 100 || code === 101 || code === 150) dropVideo(S.cur);     // removed, or not allowed to play outside YouTube
    }
    if (++S.errs > 6) { S.dead = true; lit(false); renderNow(); return; }       // nothing will play here: offer YouTube instead
    if (S.mode === 'tv') tuneTV();
    else if (S.mode === 'vod') { if (!step(1)) goTV(); }
    else if (S.mode === 'list') { try { P.nextVideo(); } catch (x) { goTV(); } }
  }

  /* ---------- sound ---------- */
  function paintMute() {
    el.unmute.hidden = !(S.muted && S.started && S.mode !== 'live' && !plainOn());
    el.bMute.setAttribute('data-on', S.muted ? '0' : '1');
    var label = S.muted ? 'Turn sound on' : 'Turn sound off';
    el.bMute.setAttribute('aria-label', label); el.bMute.title = label;
  }
  function syncMute() {
    try { if (Pready) S.muted = !!P.isMuted(); } catch (e) { }
    paintMute();
  }
  function unmute() {
    S.muted = false;
    try { if (Pready) { P.unMute(); if (P.getVolume() === 0) P.setVolume(100); } } catch (e) { }
    paintMute();
  }
  function mute() {
    S.muted = true;
    try { if (Pready) P.mute(); } catch (e) { }
    paintMute();
  }
  var gT1, gT2;
  function engage() {              // a tap that starts something: give it sound, unless the viewer muted the TV on purpose
    asked = true;
    if (!S.hush) unmute();
    clearTimeout(gT1); clearTimeout(gT2);
    // never leave the poster covering a player the viewer may need to tap
    gT1 = setTimeout(function () { if (!S.dead) lit(true); }, 1500);
    // some phones will not start a video with sound from a tap outside the player: start it silent instead
    gT2 = setTimeout(function () {
      if (!Pready || S.muted || S.mode === 'live') return;
      var st; try { st = P.getPlayerState(); } catch (e) { return; }
      if (st === -1 || st === 5) { S.muted = true; try { P.mute(); P.playVideo(); } catch (e) { } paintMute(); }
    }, 4500);
  }
  function powerOn() {             // the big button on the dark screen
    if (S.dead) { window.open(S.cur ? 'https://www.youtube.com/watch?v=' + S.cur : 'https://www.youtube.com/' + S.ch.h, '_blank', 'noopener'); return; }
    S.hush = false;
    engage();
    if (S.mode === 'tv' && !S.started) tuneTV();
    else if (Pready) { try { P.playVideo(); } catch (e) { } }
    else if (S.cur) run({ id: S.cur, start: 0 });
  }

  /* ---------- modes ---------- */
  function liveChannel() { return S.ch.live ? S.ch : CH[0]; }
  function liveFrame(on) {
    var f = $('pstv-liveframe');
    if (!on) { if (f) f.remove(); return; }
    if (!f) {
      f = document.createElement('iframe');
      f.id = 'pstv-liveframe';
      f.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen');
      f.setAttribute('allowfullscreen', '');
      f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      f.title = 'Live';
      el.frame.appendChild(f);
    }
    f.src = 'https://www.youtube.com/embed/live_stream?channel=' + encodeURIComponent(liveChannel().id) + '&autoplay=1&playsinline=1&rel=0';
  }
  function setMode(m) {
    S.mode = m;
    if (m !== 'live') liveFrame(false);
    if (m !== 'list') { S.list = null; S.listIds = null; }
    S.dockOff = false;
  }
  function view(v) {                   // side panel: the channel list, or the programme guide
    el.side.setAttribute('data-view', v);
    el.bGuide.setAttribute('aria-pressed', v === 'guide' ? 'true' : 'false');
  }
  function autoView(v) { view(root.getAttribute('data-w') === 'l' ? v : 'ch'); }   // stacked layouts keep the guide closed until asked
  function tuneTV() {                  // put on whatever the clock says is on air right now
    var now = Date.now(), s = slotAt(S.ch, now);
    if (!s) {                          // a channel with no timed programmes: play its first row instead
      var r = S.ch.R[0];
      if (r && r.ids.length) goVod(r.ids[0], r.ids, r.en, true);
      return;
    }
    // too close to the end, or a video that will not play here: move on to the next programme that will
    if (s.d - s.off < 15 || (s.id === S.cur && s.d - s.off < 45) || S.bad[s.id]) {
      var up = upcoming(S.ch, now, Math.min(wheel(S.ch).it.length, 40));
      for (var n = 1; n < up.length; n++) if (!S.bad[up[n].id]) { s = { i: up[n].i, id: up[n].id, d: up[n].d, off: 0, start: now }; break; }
    }
    S.slot = s; S.cur = s.id;
    run({ id: s.id, start: s.off });
    renderNow(); renderGuide(); markCurrent();
  }
  function goTV(user) {
    setMode('tv'); view('ch');
    if (user) engage();
    tuneTV();
  }
  function goVod(id, queue, label, silent) {
    if (!okId(id)) return;
    setMode('vod');
    S.queue = (queue && queue.length ? queue : [id]).filter(okId);
    if (S.queue.indexOf(id) < 0) S.queue.unshift(id);
    S.qlabel = label || '';
    S.cur = id;
    autoView(S.queue.length > 1 ? 'guide' : 'ch');
    if (!silent) engage();
    run({ id: id, start: 0 });
    renderNow(); renderGuide(); markCurrent();
  }
  function goList(list, label, ids) {
    setMode('list'); autoView('guide');
    S.list = list; S.qlabel = label || ''; S.queue = []; S.listIds = ids && ids.length ? ids : null; S.cur = S.listIds ? S.listIds[0] : null;
    engage();
    run({ list: list });
    renderNow(); renderGuide(); markCurrent();
  }
  function goLive() {
    setMode('live'); view('ch');
    asked = true;
    try { if (Pready) P.pauseVideo(); } catch (e) { }
    var pf = $('pstv-plain'); if (pf) pf.src = 'about:blank';
    S.cur = null;
    liveFrame(true);
    lit(true);
    renderNow(); renderGuide(); markCurrent();
  }
  function step(dir) {
    if (S.mode === 'list') { try { if (dir > 0) P.nextVideo(); else P.previousVideo(); } catch (e) { } return true; }
    if (S.mode !== 'vod') return false;
    var i = S.queue.indexOf(S.cur);
    for (var n = i + dir; n >= 0 && n < S.queue.length; n += dir) {
      if (!S.bad[S.queue[n]]) { S.cur = S.queue[n]; run({ id: S.cur, start: 0 }); renderNow(); renderGuide(); markCurrent(); return true; }
    }
    return false;
  }
  function toStage() {
    var r = el.stage.getBoundingClientRect();
    if (r.top < -4 || r.top > window.innerHeight * 0.4) {
      var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
      try { window.scrollTo({ top: window.pageYOffset + r.top - 12, behavior: reduce ? 'auto' : 'smooth' }); }
      catch (e) { window.scrollTo(0, window.pageYOffset + r.top - 12); }
    }
  }

  /* ---------- live ---------- */
  function liveInfo() {
    var c = liveChannel(), lv = c.live;
    if (!lv) return null;
    var now = Date.now(), ist = new Date(now + IST);
    var start = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate(), lv[0], lv[1]) - IST;
    var len = lv[2] * 60000;
    if (now > start + len) start += 86400000;
    return { start: start, on: now >= start - 5 * 60000 && now <= start + len, wait: start - now, ch: c };
  }
  function latestLive() {
    var c = liveChannel(), r = null;
    for (var i = 0; i < c.R.length; i++) if (c.R[i].k === 'live') r = c.R[i];
    if (!r) return null;
    var ids = r.ids.filter(function (id) { return !S.bad[id]; });
    return ids.length ? { id: ids[0], ids: ids, row: r } : null;
  }
  function renderLive() {
    var li = liveInfo();
    el.bLive.hidden = !li;
    el.livecard.hidden = !li;
    if (!li) return;
    el.bLive.classList.toggle('is-now', li.on);
    el.bLive.setAttribute('aria-pressed', S.mode === 'live' ? 'true' : 'false');
    el.livecard.classList.toggle('is-now', li.on);
    if (li.on) {
      el.liveH.textContent = 'Live meditation is on now';
      el.liveS.textContent = 'Join Bapuji live';
      el.liveB.textContent = 'Watch live';
      el.liveB.setAttribute('data-act', 'live');
      el.liveB.hidden = false;
    } else {
      var mins = Math.max(1, Math.round(li.wait / 60000)), h = Math.floor(mins / 60), m = mins % 60;
      el.liveH.textContent = 'Live meditation in ' + (h ? h + ' h ' : '') + m + ' min';
      var local = new Date().getTimezoneOffset() === -330 ? '' : ' · ' + fmtClock(li.start) + ' your time';
      el.liveS.textContent = 'Every day at 10 PM India time' + local;
      el.liveB.textContent = 'Last live';
      el.liveB.setAttribute('data-act', 'lastlive');
      el.liveB.hidden = !latestLive();
    }
  }

  /* ---------- the banner under the picture, the poster, the guide ---------- */
  function logo(c) {
    return '<i>' + esc((c.n || '?').charAt(0)) + '</i>' + (c.a ? '<img alt="" decoding="async" draggable="false" src="' + esc(c.a) + '" onerror="this.remove()">' : '');
  }
  function renderNow() {
    var ttl = S.cur ? title(S.cur) : '', sub = S.ch.t, nxt = null, pct = null, now = Date.now();
    el.badge.setAttribute('data-mode', S.mode);
    if (S.mode === 'tv') {
      setText(el.badge, 'On air · 24×7');
      if (S.slot) {
        sub = fmtClock(S.slot.start) + ' – ' + fmtClock(S.slot.start + S.slot.d * 1000);
        var on = slotAt(S.ch, now);
        if (on && on.id === S.slot.id) pct = Math.min(100, on.off / on.d * 100);
        var up = upcoming(S.ch, now, Math.min(wheel(S.ch).it.length, 12));
        var at = -1;
        for (var u = 0; u < up.length; u++) if (up[u].id === S.slot.id) { at = u; break; }
        for (var w = at + 1; w < up.length; w++) if (!S.bad[up[w].id]) { nxt = { id: up[w].id, pre: at < 0 ? '' : fmtClock(up[w].start) }; break; }
      }
    } else if (S.mode === 'live') {
      setText(el.badge, 'Live');
      ttl = 'Live meditation';
      sub = liveChannel().t;
    } else {
      setText(el.badge, S.mode === 'list' ? 'Playlist' : 'On demand');
      sub = S.qlabel || S.ch.t;
      if (S.mode === 'list' && !ttl) ttl = S.qlabel || 'Loading…';
      var qi = S.queue.indexOf(S.cur);
      for (var q = qi + 1; qi >= 0 && q < S.queue.length; q++) if (!S.bad[S.queue[q]]) { nxt = { id: S.queue[q], pre: '' }; break; }
    }
    setText(el.title, ttl || 'Loading…');
    setText(el.sub, sub);
    setText(el.osdNum, S.ch.num);
    setText(el.osdName, S.ch.n);
    if (el.osdLogo.getAttribute('data-k') !== S.ch.k) { el.osdLogo.setAttribute('data-k', S.ch.k); el.osdLogo.innerHTML = logo(S.ch); }
    el.bar.hidden = pct == null;
    if (pct != null) el.bar.firstChild.style.width = pct.toFixed(1) + '%';
    el.nextRow.hidden = !nxt;
    if (nxt) {
      el.nextRow.setAttribute('data-g', nxt.id);
      el.next.innerHTML = (nxt.pre ? '<b>' + esc(nxt.pre) + '</b> ' : '') + '<span data-tt="' + nxt.id + '">' + esc(title(nxt.id) || '…') + '</span>';
      needTitle(nxt.id);
    }
    // the remote shows only what does something right now
    var onDemand = S.mode === 'vod' || S.mode === 'list', i = S.queue.indexOf(S.cur);
    el.bTv.hidden = S.mode === 'tv';
    el.bPrev.hidden = !onDemand || (S.mode === 'vod' && i <= 0);
    el.bNext.hidden = !onDemand || (S.mode === 'vod' && (i < 0 || i >= S.queue.length - 1));
    el.subLink.href = 'https://www.youtube.com/' + S.ch.h + '?sub_confirmation=1';
    if (S.cur && !title(S.cur)) needTitle(S.cur);
    // poster
    setText(el.posterLabel, S.dead ? 'Watch on YouTube' : '');
    el.poster.setAttribute('aria-label', S.dead ? 'Watch on YouTube' : 'Turn on the TV');
    el.posterK.textContent = el.screen.classList.contains('is-docked') ? 'Playing in the mini player' : '';
    if (S.cur && el.posterImg.getAttribute('data-id') !== S.cur) {
      el.posterImg.setAttribute('data-id', S.cur);
      el.posterImg.setAttribute('data-fb', thumb(S.cur, 'mqdefault'));
      el.posterImg.src = thumb(S.cur, 'hq720');
    }
    paintMute();
    renderLive();
  }
  function guideItem(o) {
    return '<li><button type="button" class="pstv-gi' + (o.now ? ' is-now' : '') + '"' + (o.now ? ' aria-current="true"' : ' data-g="' + o.id + '"') + '>' +
      '<span class="pstv-gtime">' + (o.now ? '<small>Now</small>' : '') + esc(o.time || '') + '</span>' +
      '<span><span class="pstv-gt" data-tt="' + o.id + '">' + esc(title(o.id) || '…') + '</span>' +
      (o.d ? '<span class="pstv-gd">' + fmtDur(o.d) + '</span>' : '') + '</span></button></li>';
  }
  var guideSig = '';
  function renderGuide() {
    var html = '', sig;
    if (S.mode === 'tv' || S.mode === 'live') {
      var up = upcoming(S.ch, Date.now(), Math.min(wheel(S.ch).it.length, 14));
      if (S.mode === 'tv' && S.slot && up[0] && up[0].id !== S.slot.id) {      // a programme was skipped: start the list at what is really playing
        for (var c = 1; c < up.length; c++) if (up[c].id === S.slot.id) { up = up.slice(c); break; }
      }
      up = up.slice(0, 10);
      sig = 'tv' + S.ch.k + up.map(function (s) { return s.id; }).join() + Object.keys(S.bad).length;
      el.guideH.textContent = 'Programme guide';
      up.forEach(function (s, n) {
        if (n && S.bad[s.id]) return;
        html += guideItem({ id: s.id, d: s.d, time: fmtClock(s.start), now: n === 0 });
      });
    } else if (S.mode === 'vod') {
      var i = Math.max(0, S.queue.indexOf(S.cur));
      sig = 'vod' + S.cur + S.queue.length;
      el.guideH.textContent = 'Up next';
      S.queue.slice(i, i + 10).forEach(function (id, n) { if (!n || !S.bad[id]) html += guideItem({ id: id, d: V[id] && V[id][1], now: n === 0, time: n === 0 ? '' : String(i + n + 1) }); });
    } else {
      var pl = [], pi = 0;
      try { pl = P.getPlaylist() || []; pi = Math.max(0, P.getPlaylistIndex()); } catch (e) { }
      if (!pl.length && S.listIds) { pl = S.listIds; pi = Math.max(0, pl.indexOf(S.cur)); }
      sig = 'list' + S.cur + pl.length + pi;
      el.guideH.textContent = 'Up next';
      pl.slice(pi, pi + 10).forEach(function (id, n) { html += guideItem({ id: id, d: V[id] && V[id][1], now: n === 0, time: n === 0 ? '' : String(pi + n + 1) }); });
      S.queue = pl;
    }
    if (sig === guideSig) return;
    guideSig = sig;
    el.glist.innerHTML = html;
    el.glist.scrollTop = 0;
    var need = el.glist.querySelectorAll('[data-tt]');
    for (var k = 0; k < need.length; k++) needTitle(need[k].getAttribute('data-tt'));
  }
  function markCurrent() {
    var old = root.querySelectorAll('.pstv-card.is-cur');
    for (var i = 0; i < old.length; i++) old[i].classList.remove('is-cur');
    if (!S.cur || S.mode === 'tv' || S.mode === 'live') return;
    var now = root.querySelectorAll('.pstv-card[data-v="' + S.cur + '"]');
    for (var j = 0; j < now.length; j++) now[j].classList.add('is-cur');
  }
  function flash() {                   // static, then the channel number in the corner, as a TV does when you change channel
    el.banner.firstChild.textContent = S.ch.num;
    el.banner.lastChild.textContent = S.ch.n;
    el.banner.classList.add('is-show');
    el.noise.classList.add('is-on');
    clearTimeout(flash.t); clearTimeout(flash.n);
    flash.n = setTimeout(function () { el.noise.classList.remove('is-on'); }, 420);
    flash.t = setTimeout(function () { el.banner.classList.remove('is-show'); }, 2600);
  }

  /* ---------- channels ---------- */
  var chanSig = '';
  function renderChannels(force) {     // every channel with what is on it right now, like a set-top box channel list
    var now = Date.now(), slots = CH.map(function (c) { return slotAt(c, now); });
    var sig = S.ch.k + slots.map(function (x) { return x ? x.id : ''; }).join();
    if (!force && sig === chanSig) {
      var rows = el.chlist.querySelectorAll('.pstv-chan');
      for (var i = 0; i < rows.length; i++) { var b = rows[i].querySelector('.pstv-bar i'); if (b && slots[i]) b.style.width = Math.min(100, slots[i].off / slots[i].d * 100).toFixed(1) + '%'; }
      return;
    }
    chanSig = sig;
    var keepX = el.chlist.scrollLeft, keepY = el.chlist.scrollTop;
    el.chlist.innerHTML = CH.map(function (c, n) {
      var x = slots[n];
      return '<button type="button" class="pstv-chan" data-ch="' + c.k + '"' + (c === S.ch ? ' aria-current="true"' : '') + ' aria-label="Channel ' + (n + 1) + ', ' + esc(c.n) + '">' +
        '<b class="pstv-chan-n">' + c.num + '</b><span class="pstv-logo">' + logo(c) + '</span>' +
        '<span class="pstv-chan-t"><strong>' + esc(c.n) + '</strong>' +
        (x ? '<span class="pstv-chan-now">' + esc(title(x.id)) + '</span><span class="pstv-bar"><i style="width:' + Math.min(100, x.off / x.d * 100).toFixed(1) + '%"></i></span>'
           : '<span class="pstv-chan-now">' + esc(c.t) + '</span>') + '</span></button>';
    }).join('');
    el.chlist.scrollLeft = keepX; el.chlist.scrollTop = keepY;
  }
  function showChannel() {             // bring the current channel into view inside the list, without moving the page
    var cur = el.chlist.querySelector('[aria-current="true"]');
    if (!cur) return;
    var box = el.chlist.getBoundingClientRect(), r = cur.getBoundingClientRect();
    if (el.chlist.scrollWidth > el.chlist.clientWidth + 4) {
      if (r.left < box.left + 10 || r.right > box.right - 10) el.chlist.scrollLeft += r.left - box.left - 14;
    } else if (el.chlist.scrollHeight > el.chlist.clientHeight + 4) {
      if (r.top < box.top || r.bottom > box.bottom) el.chlist.scrollTop += r.top - box.top - 8;
    }
  }
  function setChannel(key, user) {
    var c = chan(key);
    if (!c) return;
    var same = c === S.ch;
    if (!same) { S.ch = c; store('pstv.ch', key); renderBody(); syncChannel(); }
    if (user) engage();
    if (!(same && S.mode === 'tv' && S.started)) { setMode('tv'); view('ch'); tuneTV(); }
    renderChannels(true); showChannel();
    flash();
  }
  function stepChannel(dir) {
    var i = CH.indexOf(S.ch);
    setChannel(CH[(i + dir + CH.length) % CH.length].k, true);
  }

  /* ---------- cards and sections ---------- */
  function card(id, short) {
    var ttl = title(id), d = V[id] && V[id][1];
    return '<button type="button" class="pstv-card' + (short ? ' is-short' : '') + '" data-v="' + id + '"' + (short ? ' data-short="1"' : '') + '>' +
      '<span class="pstv-th"><img loading="lazy" decoding="async" alt="" draggable="false" src="' + (short ? thumb(id, 'oar2') + '" data-fb="' + thumb(id, 'hqdefault') : thumb(id)) + '">' +
      (d && !short ? '<span class="pstv-dur">' + fmtDur(d) + '</span>' : '') + '<span class="pstv-pl">' + ICON.play(18) + '</span></span>' +
      '<span class="pstv-ct' + (ttl ? '' : ' is-wait') + '" data-tt="' + id + '">' + esc(ttl || '…') + '</span></button>';
  }
  function head(text) {
    return '<div class="pstv-head"><h2 class="pstv-h2">' + esc(text) + '</h2>' +
      '<div class="pstv-arrows"><button type="button" class="pstv-arrow" data-scroll="-1" aria-label="Scroll left">' + ICON.left +
      '</button><button type="button" class="pstv-arrow" data-scroll="1" aria-label="Scroll right">' + ICON.right + '</button></div></div>';
  }
  function rowHTML(r) {
    var short = r.kind === 's', ids = r.ids.filter(function (id) { return !S.bad[id]; });
    return head(r.en) + '<div class="pstv-rail" data-row="' + r.k + '">' + ids.map(function (id) { return card(id, short); }).join('') +
      '<button type="button" class="pstv-card is-end' + (short ? ' is-short' : '') + '" data-more="' + r.k + '"><span>' + ICON.plus + '<span>Show more</span></span></button></div>';
  }
  function colCard(p, g) {
    return '<button type="button" class="pstv-col" data-col="' + p.l + '" data-group="' + g.k + '" aria-expanded="false">' +
      '<span class="pstv-col-th"><span class="pstv-th">' + (p.cv ? '<img loading="lazy" decoding="async" alt="" draggable="false" src="' + thumb(p.cv) + '">' : '') +
      (p.c ? '<span class="pstv-dur">' + p.c + ' videos</span>' : '') + '</span></span>' +
      '<span class="pstv-ct">' + esc(p.t) + '</span></button>';
  }
  function rowOf(k) { for (var i = 0; i < S.ch.R.length; i++) if (S.ch.R[i].k === k) return S.ch.R[i]; return null; }
  function renderBody() {
    var html = '<div id="pstv-results"></div>';
    S.ch.R.forEach(function (r) { html += '<section class="pstv-sec" data-sec="' + r.k + '">' + rowHTML(r) + '</section>'; });
    S.ch.G.forEach(function (g) {
      if (!g.P.length) return;
      html += '<section class="pstv-sec" data-gsec="' + g.k + '">' + head(g.en) +
        '<div class="pstv-rail">' + g.P.map(function (p) { return colCard(p, g); }).join('') + '</div><div data-panel="' + g.k + '"></div></section>';
    });
    el.body.innerHTML = html;
    S.open = null;
    watchTitles(el.body);
    markCurrent();
    var rails = el.body.querySelectorAll('.pstv-rail');
    for (var i = 0; i < rails.length; i++) arrows(rails[i]);
    if (el.q.value.trim().length > 1) search();
  }
  function arrows(rail) {              // dim an arrow when there is nothing more that way
    var sec = closest(rail, '.pstv-sec');
    if (!sec || sec.querySelector('.pstv-rail') !== rail) return;
    var a = sec.querySelectorAll('.pstv-arrow');
    if (a.length < 2) return;
    var max = rail.scrollWidth - rail.clientWidth;
    a[0].disabled = rail.scrollLeft <= 2;
    a[1].disabled = rail.scrollLeft >= max - 2;
  }

  /* ---------- auto-sync: ask a hidden YouTube player what is in a playlist right now ---------- */
  var probeQ = [], probeBusy = false, probeMemo = {};
  function probeList(list, cb) {
    if (probeMemo[list]) return cb(probeMemo[list]);
    probeQ.push([list, cb]); pumpProbe();
  }
  function pumpProbe() {
    if (probeBusy || !probeQ.length) return;
    probeBusy = true;
    var job = probeQ.shift(), done = false, player = null, timer = null, poll = null;
    function finish(ids) {
      if (done) return; done = true;
      clearTimeout(timer); clearInterval(poll);
      try { if (player) player.destroy(); } catch (e) { }
      el.probe.innerHTML = '';
      ids = (ids || []).filter(okId);
      if (ids.length) probeMemo[job[0]] = ids;
      try { job[1](ids); } catch (e) { }
      probeBusy = false; setTimeout(pumpProbe, 60);
    }
    timer = setTimeout(function () { finish([]); }, 12000);
    withAPI(function () {
      if (done) return;
      var holder = document.createElement('div');
      el.probe.appendChild(holder);
      try {
        player = new YT.Player(holder, {
          width: 200, height: 113, playerVars: playerVars({ autoplay: 0, mute: 1, listType: 'playlist', list: job[0] }),
          events: {
            onReady: function () {
              var tries = 0;
              poll = setInterval(function () {
                var a = null; try { a = player.getPlaylist(); } catch (e) { }
                if (a && a.length) finish(a.slice()); else if (++tries > 20) finish([]);
              }, 300);
            },
            onError: function () { finish([]); }
          }
        });
      } catch (e) { finish([]); }
    });
  }
  function known(ids) { ids.forEach(function (id) { if (!V[id]) V[id] = [tCache[id] || '', 0]; }); }
  function mergeRow(r, ids) {
    if (!ids.length) return false;
    r.all = ids;
    var have = {}; r.ids.forEach(function (id) { have[id] = 1; });
    var first = -1;
    for (var i = 0; i < ids.length; i++) if (have[ids[i]]) { first = i; break; }
    var before = r.ids.join();
    // whatever comes before the first video we already have is new: put it in front, and never throw the old ones away
    if (first !== 0) r.ids = ids.slice(0, first < 0 ? 40 : Math.min(first, 40)).concat(r.ids);
    known(r.ids);
    return r.ids.join() !== before;
  }
  function syncChannel() {
    var ch = S.ch;
    if (ch._synced) return;
    ch._synced = 1;
    ch.R.forEach(function (r) {
      if (!r.s) return;
      probeList(r.l, function (ids) {
        if (!mergeRow(r, ids) || ch !== S.ch) return;
        var sec = el.body.querySelector('[data-sec="' + r.k + '"]');
        if (!sec) return;
        var old = sec.querySelector('.pstv-rail'), keep = old ? old.scrollLeft : 0;
        sec.innerHTML = rowHTML(r);
        var rail = sec.querySelector('.pstv-rail');
        if (keep > 0) rail.scrollLeft = keep;
        watchTitles(sec); markCurrent(); arrows(rail);
        if (r.k === 'live') renderLive();
      });
    });
  }
  function showMore(k, btn) {
    var r = rowOf(k);
    if (!r) return;
    var rail = btn.parentNode, label = btn.querySelector('span span');
    function add(all) {
      var have = {}; r.ids.forEach(function (id) { have[id] = 1; });
      var extra = (all || []).filter(function (id) { return !have[id] && !S.bad[id]; }).slice(0, 16);
      if (!extra.length) {
        btn.outerHTML = '<a class="pstv-card is-end' + (r.kind === 's' ? ' is-short' : '') + '" target="_blank" rel="noopener" href="https://www.youtube.com/playlist?list=' + r.l + '"><span>See all on YouTube</span></a>';
        arrows(rail);
        return;
      }
      known(extra);
      extra.forEach(function (id) { r.ids.push(id); });
      var tmp = document.createElement('div');
      tmp.innerHTML = extra.map(function (id) { return card(id, r.kind === 's'); }).join('');
      while (tmp.firstChild) rail.insertBefore(tmp.firstChild, btn);
      watchTitles(rail); markCurrent(); arrows(rail);
    }
    if (r.all) return add(r.all);
    if (btn.__busy) return;
    btn.__busy = 1;
    if (label) label.textContent = 'Loading…';
    probeList(r.l, function (ids) { btn.__busy = 0; if (label) label.textContent = 'Show more'; if (ids.length) r.all = ids; add(ids); });
  }

  /* ---------- playlists: one opens as a panel under its row ---------- */
  function findCol(gk, l) {
    for (var i = 0; i < CH.length; i++) for (var j = 0; j < CH[i].G.length; j++) {
      var g = CH[i].G[j];
      if (g.k !== gk) continue;
      for (var k = 0; k < g.P.length; k++) if (g.P[k].l === l) return g.P[k];
    }
    return null;
  }
  function closeCol() {
    if (!S.open) return;
    if (S.open.holder) S.open.holder.innerHTML = '';
    var b = root.querySelectorAll('.pstv-col[aria-expanded="true"]');
    for (var i = 0; i < b.length; i++) b[i].setAttribute('aria-expanded', 'false');
    S.open = null;
  }
  function panelGrid(p, n) {
    var ids = (p.all || p.ids || []).filter(function (id) { return !S.bad[id]; });
    known(ids);
    return '<div class="pstv-grid" data-colgrid="' + p.l + '">' + ids.slice(0, n).map(function (id) { return card(id); }).join('') + '</div>' +
      (ids.length > n ? '<div class="pstv-panel-foot"><button type="button" class="pstv-pill is-ghost" data-colmore="' + (n + 20) + '">Show more</button></div>' : '');
  }
  function openCol(gk, l, btn) {
    var p = findCol(gk, l);
    if (!p) return;
    if (S.open && S.open.l === l) { closeCol(); return; }
    closeCol();
    var sec = closest(btn, '.pstv-sec'), holder = sec ? sec.querySelector('[data-panel]') : null;
    if (!holder) return;
    S.open = { g: gk, l: l, p: p, holder: holder };
    btn.setAttribute('aria-expanded', 'true');
    holder.innerHTML = '<div class="pstv-panel"><div class="pstv-panel-head"><h3>' + esc(p.t) + (p.c ? '<small>' + p.c + ' videos</small>' : '') + '</h3>' +
      '<button type="button" class="pstv-pill" data-playall="' + l + '">' + ICON.play(14) + 'Play all</button>' +
      '<button type="button" class="pstv-pill is-ghost is-x" data-colclose="1" aria-label="Close">' + ICON.x + '</button></div>' +
      '<div data-colbody="1"><p class="pstv-note">Loading…</p></div></div>';
    var body = holder.querySelector('[data-colbody]');
    function paint() { body.innerHTML = panelGrid(p, 20); watchTitles(body); markCurrent(); }
    if (p.all || (p.ids && p.ids.length)) paint();
    if (!p.all) probeList(l, function (ids) {
      if (ids.length) p.all = ids;
      if (!S.open || S.open.l !== l) return;
      if (p.all) paint();
      else if (!(p.ids && p.ids.length)) body.innerHTML = '<p class="pstv-note">This playlist could not be opened here just now. Press “Play all”, or <a target="_blank" rel="noopener" href="https://www.youtube.com/playlist?list=' + l + '">open it on YouTube</a>.</p>';
    });
    var r = holder.getBoundingClientRect();
    if (r.top > window.innerHeight * 0.72) { try { window.scrollTo({ top: window.pageYOffset + r.top - window.innerHeight * 0.32, behavior: 'smooth' }); } catch (e) { } }
  }

  /* ---------- search ---------- */
  function norm(s) { return String(s).toLowerCase().replace(/\s+/g, ' ').trim(); }
  function search() {
    var box = $('pstv-results');
    if (!box) return;
    var raw = el.q.value.trim(), q = norm(raw);
    if (S.open && S.open.holder && box.contains(S.open.holder)) S.open = null;
    if (q.length < 2) { box.innerHTML = ''; return; }
    var words = q.split(' '), hits = [];
    function match(t) { t = norm(t); return !!t && words.every(function (w) { return t.indexOf(w) >= 0; }); }
    for (var id in V) {
      if (S.bad[id] || !match(V[id][0])) continue;
      hits.push(id);
      if (hits.length >= 30) break;
    }
    var cols = [];
    S.ch.G.forEach(function (g) { g.P.forEach(function (p) { if (match(p.t)) cols.push([p, g]); }); });
    box.innerHTML = '<section class="pstv-sec"><div class="pstv-panel"><div class="pstv-panel-head"><h3>Results for “' + esc(raw) + '”</h3>' +
      '<a class="pstv-pill is-ghost" target="_blank" rel="noopener" href="https://www.youtube.com/' + S.ch.h + '/search?query=' + encodeURIComponent(raw) + '">Search on YouTube</a>' +
      '<button type="button" class="pstv-pill is-ghost is-x" data-clearq="1" aria-label="Clear search">' + ICON.x + '</button></div>' +
      (cols.length ? '<div class="pstv-rail" style="margin-bottom:22px">' + cols.slice(0, 8).map(function (c) { return colCard(c[0], c[1]); }).join('') + '</div><div data-panel="search"></div>' : '') +
      (hits.length ? '<div class="pstv-grid">' + hits.map(function (id) { return card(id); }).join('') + '</div>' : (cols.length ? '' : '<p class="pstv-note">No video with that name here. Try “Search on YouTube”.</p>')) +
      '</div></section>';
    markCurrent();
  }

  /* ---------- shorts viewer ---------- */
  var sh = null;
  function shorts(ids, i) {
    if (!sh) {
      sh = document.createElement('div');
      sh.className = 'pstv-layer'; sh.hidden = true;
      sh.setAttribute('role', 'dialog'); sh.setAttribute('aria-modal', 'true'); sh.setAttribute('aria-label', 'Shorts');
      sh.innerHTML = '<button type="button" class="pstv-sh-x" data-sh="x" aria-label="Close">' + ICON.x + '</button><div class="pstv-sh">' +
        '<button type="button" class="pstv-sh-nav" data-sh="-1" aria-label="Previous short">' + ICON.left + '</button>' +
        '<div class="pstv-sh-frame"><iframe title="Short" referrerpolicy="strict-origin-when-cross-origin" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>' +
        '<button type="button" class="pstv-sh-nav" data-sh="1" aria-label="Next short">' + ICON.right + '</button><p class="pstv-sh-t"></p></div>';
      document.body.appendChild(sh);
      sh.addEventListener('click', function (e) {
        var b = closest(e.target, '[data-sh]');
        if (!b) { if (e.target === sh) shortsClose(); return; }
        var a = b.getAttribute('data-sh');
        if (a === 'x') shortsClose(); else shortsShow(sh.i + Number(a));
      });
      // keep the page behind from scrolling; a swipe outside the video moves to the next or previous short
      sh.addEventListener('wheel', function (e) { e.preventDefault(); }, { passive: false });
      sh.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });
      var t0 = null;
      sh.addEventListener('touchstart', function (e) { t0 = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null; }, { passive: true });
      sh.addEventListener('touchend', function (e) {
        if (!t0) return;
        var t = e.changedTouches[0], dx = t.clientX - t0.x, dy = t.clientY - t0.y; t0 = null;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 56) return;
        var fwd = Math.abs(dx) > Math.abs(dy) ? dx < 0 : dy < 0;
        shortsShow(sh.i + (fwd ? 1 : -1));
      }, { passive: true });
    }
    sh.ids = ids; sh.back = document.activeElement; sh.resume = false;
    try { if (Pready && S.mode !== 'live') { var st = P.getPlayerState(); sh.resume = st === 1 || st === 3; P.pauseVideo(); } } catch (e) { }
    sh.hidden = false;
    shortsShow(i);
    try { sh.querySelector('.pstv-sh-x').focus(); } catch (e) { }
  }
  function shortsShow(i) {
    if (!sh || i < 0 || i >= sh.ids.length) return;
    sh.i = i;
    var id = sh.ids[i], nav = sh.querySelectorAll('.pstv-sh-nav');
    sh.querySelector('iframe').src = 'https://www.youtube.com/embed/' + id + '?autoplay=1&playsinline=1&rel=0&loop=1&playlist=' + id;
    sh.querySelector('.pstv-sh-t').textContent = title(id);
    nav[0].disabled = i === 0; nav[1].disabled = i === sh.ids.length - 1;
  }
  function shortsClose() {
    if (!sh || sh.hidden) return;
    sh.hidden = true; sh.querySelector('iframe').src = 'about:blank';
    if (sh.resume) { if (S.mode === 'tv') tuneTV(); else { try { P.playVideo(); } catch (e) { } } }
    try { if (sh.back && sh.back.focus) sh.back.focus(); } catch (e) { }
  }
  document.addEventListener('keydown', function (e) {
    if (!sh || sh.hidden) return;
    if (e.key === 'Escape' || e.key === 'Esc') shortsClose();
    else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); shortsShow(sh.i + 1); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); shortsShow(sh.i - 1); }
  });

  /* ---------- mini player when the screen scrolls away ---------- */
  function dock(on) {
    if (on === el.frame.classList.contains('is-docked')) return;
    el.frame.classList.toggle('is-docked', on);
    el.screen.classList.toggle('is-docked', on);
    el.posterK.textContent = on ? 'Playing in the mini player' : '';
    if (on) requestAnimationFrame(function () {    // a transformed ancestor would trap position:fixed; if so, give the idea up
      var r = el.frame.getBoundingClientRect();
      if (r.width < 40 || r.height < 30 || r.left < -2 || r.top < -2 || r.right > window.innerWidth + 2 || r.bottom > window.innerHeight + 2) { S.dockBroken = true; dock(false); }
    });
  }
  if (window.IntersectionObserver) new IntersectionObserver(function (es) {
    var vis = es[es.length - 1].isIntersecting, playing = false;
    try { playing = S.mode === 'live' || plainOn() || (Pready && (P.getPlayerState() === 1 || P.getPlayerState() === 3)); } catch (e) { }
    // only follow the viewer once they are really watching (sound on, or the live stream)
    dock(!vis && playing && S.started && (S.mode === 'live' || !S.muted) && !S.dockOff && !S.dockBroken);
  }, { threshold: 0.12 }).observe(el.screen);

  /* ---------- taps and clicks ---------- */
  var justDragged = false;
  root.addEventListener('click', function (e) {
    if (justDragged) { justDragged = false; e.preventDefault(); e.stopPropagation(); return; }
    var x = closest(e.target, 'button,a');
    if (!x || !root.contains(x)) return;
    var a;
    if (x === el.poster) return powerOn();
    if (x === el.unmute) { S.hush = false; engage(); return; }
    if (x === el.bMute) { if (S.muted) { if (!S.started) powerOn(); else { S.hush = false; engage(); } } else { S.hush = true; mute(); } return; }
    if (x.id === 'pstv-ch-up') return stepChannel(1);
    if (x.id === 'pstv-ch-dn') return stepChannel(-1);
    if (x === el.bGuide) { view(el.side.getAttribute('data-view') === 'guide' ? 'ch' : 'guide'); return; }
    if (x.id === 'pstv-gx') return view('ch');
    if (x === el.bTv) return goTV(true);
    if (x === el.bLive) { var li = liveInfo(), l0 = latestLive(); if ((li && li.on) || !l0) goLive(); else goVod(l0.id, l0.ids, 'Latest live satsang'); return; }
    if (x.getAttribute('data-act') === 'live') { goLive(); toStage(); return; }
    if (x.getAttribute('data-act') === 'lastlive') { var ll = latestLive(); if (ll) { goVod(ll.id, ll.ids, 'Latest live satsang'); toStage(); } return; }
    if (x === el.bPrev) { engage(); step(-1); return; }
    if (x === el.bNext) { engage(); step(1); return; }
    if (x.id === 'pstv-dockx') {
      S.dockOff = true; dock(false);
      if (S.mode === 'live') goTV();
      else { try { P.pauseVideo(); } catch (er) { } var pf = $('pstv-plain'); if (pf) pf.src = 'about:blank'; }
      return;
    }
    if ((a = x.getAttribute('data-ch'))) return setChannel(a, true);
    if ((a = x.getAttribute('data-g'))) {
      if (S.mode === 'list') { engage(); try { P.playVideoAt(Math.max(0, (P.getPlaylist() || []).indexOf(a))); } catch (er) { } }
      else if (S.mode === 'vod') goVod(a, S.queue, S.qlabel);
      else goVod(a, upcoming(S.ch, Date.now(), Math.min(wheel(S.ch).it.length, 14)).map(function (s) { return s.id; }), S.ch.n + ' · from the guide');
      return;
    }
    if ((a = x.getAttribute('data-scroll'))) {
      var rail = closest(x, '.pstv-sec').querySelector('.pstv-rail');
      if (rail) { try { rail.scrollBy({ left: Number(a) * rail.clientWidth * 0.82, behavior: 'smooth' }); } catch (er) { rail.scrollLeft += Number(a) * rail.clientWidth * 0.82; } }
      return;
    }
    if ((a = x.getAttribute('data-more'))) return showMore(a, x);
    if ((a = x.getAttribute('data-col'))) return openCol(x.getAttribute('data-group'), a, x);
    if (x.getAttribute('data-colclose')) return closeCol();
    if ((a = x.getAttribute('data-colmore'))) {
      var p = S.open && S.open.p, body = closest(x, '[data-colbody]');
      if (p && body) { body.innerHTML = panelGrid(p, Number(a)); watchTitles(body); markCurrent(); }
      return;
    }
    if ((a = x.getAttribute('data-playall'))) { var pc = S.open && S.open.p; goList(a, pc ? pc.t : '', pc && pc.all); toStage(); return; }
    if (x.getAttribute('data-clearq')) { el.q.value = ''; search(); return; }
    if ((a = x.getAttribute('data-v'))) {
      var box = closest(x, '.pstv-rail,.pstv-grid'), ids = [], label = '';
      if (box) { var cs = box.querySelectorAll('.pstv-card[data-v]'); for (var i = 0; i < cs.length; i++) ids.push(cs[i].getAttribute('data-v')); }
      if (x.getAttribute('data-short')) return shorts(ids.length ? ids : [a], Math.max(0, ids.indexOf(a)));
      var sec = closest(x, '.pstv-sec'), h2 = sec ? sec.querySelector('.pstv-h2') : null;
      if (box && box.getAttribute('data-colgrid') && S.open) { label = S.open.p.t; ids = S.open.p.all || ids; }
      else label = h2 ? h2.textContent : 'Search';
      goVod(a, ids, label); toStage();
    }
  });
  var qTimer;
  el.q.addEventListener('input', function () { clearTimeout(qTimer); qTimer = setTimeout(search, 180); });
  el.q.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); clearTimeout(qTimer); search(); el.q.blur(); } });

  // swipe sideways on the channel banner to change channel
  var sw = null;
  el.osd.addEventListener('touchstart', function (e) { sw = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null; }, { passive: true });
  el.osd.addEventListener('touchend', function (e) {
    if (!sw) return;
    var t = e.changedTouches[0], dx = t.clientX - sw.x, dy = t.clientY - sw.y; sw = null;
    if (Math.abs(dx) > 56 && Math.abs(dx) > 2 * Math.abs(dy)) stepChannel(dx < 0 ? 1 : -1);
  }, { passive: true });

  // with a mouse, rows and the channel strip can be dragged sideways
  var drag = null;
  root.addEventListener('pointerdown', function (e) {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    var sc = closest(e.target, '.pstv-rail,.pstv-chlist');
    if (!sc || sc.scrollWidth <= sc.clientWidth + 2) return;
    drag = { el: sc, x: e.clientX, left: sc.scrollLeft, moved: false };
  });
  window.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) < 6) return;
    drag.moved = true;
    drag.el.classList.add('is-drag');
    drag.el.classList.add('is-free');        // once dragged with a mouse, the row stops snapping, so it stays where it is let go
    drag.el.scrollLeft = drag.left - dx;
  });
  function endDrag() {
    if (!drag) return;
    drag.el.classList.remove('is-drag');
    if (drag.moved) { justDragged = true; setTimeout(function () { justDragged = false; }, 60); }
    drag = null;
  }
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);
  root.addEventListener('dragstart', function (e) { if (closest(e.target, '.pstv-rail,.pstv-chlist')) e.preventDefault(); });
  root.addEventListener('scroll', function (e) {
    var t = e.target;
    if (!t || !t.classList || !t.classList.contains('pstv-rail') || t.__q) return;
    t.__q = 1;
    requestAnimationFrame(function () { t.__q = 0; arrows(t); });
  }, true);

  /* ---------- start ---------- */
  renderChannels(true);
  renderBody();
  measure();
  if (window.ResizeObserver) new ResizeObserver(measure).observe(root);
  window.addEventListener('resize', measure);
  showChannel();
  if (okId(params.v)) { goVod(params.v, [params.v], '', true); needTitle(params.v); }
  else tuneTV();
  el.clock.textContent = fmtClock(Date.now());
  setInterval(function () { el.clock.textContent = fmtClock(Date.now()); }, 5000);
  setInterval(function () {
    if (S.mode === 'tv' && S.slot && !S.started) {      // TV still off: keep the poster on whatever is on air
      var s = slotAt(S.ch, Date.now());
      if (s && s.id !== S.cur && !S.bad[s.id]) { S.slot = s; S.cur = s.id; if (!Pready) pending = { id: s.id, start: s.off }; }
    }
    renderNow(); renderGuide(); renderChannels();
  }, 20000);
  setTimeout(syncChannel, 2500);
})();
