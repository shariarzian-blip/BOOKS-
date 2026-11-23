/* Paramshanti TV — player, 24×7 schedule, guide, rows and auto-sync. No API key: everything comes from
   the catalogue baked into #pstv-data plus the YouTube IFrame Player API and YouTube's public oEmbed. */
(function () {
  'use strict';
  var root = document.getElementById('pstv');
  var dataEl = document.getElementById('pstv-data');
  if (!root || !dataEl || root.__pstv) return;
  root.__pstv = 1;

  var D;
  try { D = JSON.parse(dataEl.textContent); } catch (e) { return; }
  var V = D.V, CH = D.C;
  var EPOCH = Date.UTC(2026, 0, 1) / 1000;      // the 24×7 loop is anchored here, so every viewer sees the same programme
  var IST = 330 * 60000;

  /* ---------- small helpers ---------- */
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function okId(s) { return typeof s === 'string' && /^[\w-]{11}$/.test(s); }
  function thumb(id, size) { return 'https://i.ytimg.com/vi/' + id + '/' + (size || 'mqdefault') + '.jpg'; }
  function fmtDur(s) {
    if (!s) return '';
    var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60;
    return (h ? h + ':' + (m < 10 ? '0' : '') : '') + m + ':' + (x < 10 ? '0' : '') + x;
  }
  function fmtClock(ms) {
    try { return new Date(ms).toLocaleTimeString(S.ui === 'hi' ? 'hi-IN' : 'en-IN', { hour: 'numeric', minute: '2-digit' }); }
    catch (e) { var d = new Date(ms); return d.getHours() + ':' + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes(); }
  }
  function title(id) { return (V[id] && V[id][0]) || ''; }
  function deva(s) { return /[\u0900-\u097F]/.test(s || ''); }
  function dv(s) { return deva(s) ? ' is-deva' : ''; }
  function markDeva(node) { node.classList.toggle('is-deva', deva(node.textContent)); }
  var ICON = {
    play: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg>',
    left: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
    right: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
    out: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-9 9"/></svg>',
    x: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 5l14 14M19 5L5 19"/></svg>',
    plus: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>'
  };

  /* ---------- words ---------- */
  var T = {
    hi: {
      brand: 'परमशांति', tagline: 'Behad ka Param Gyan · 24×7', search: 'वीडियो खोजें…', chan: 'चैनल',
      onair: 'ऑन एयर · 24×7', vod: 'आपकी पसंद', list: 'प्लेलिस्ट', livenow: 'लाइव',
      tv247: '24×7 टीवी', live: 'लाइव', prev: 'पिछला', next: 'अगला', share: 'शेयर', yt: 'YouTube पर देखें',
      unmute: 'आवाज़ चालू करें', turnon: 'टीवी चालू करें', nowplaying: 'अभी चल रहा है', mini: 'मिनी प्लेयर में चल रहा है',
      guide: 'कार्यक्रम सूची', upnext: 'आगे', now: 'अभी',
      today: 'आज का संदेश', todayK: "Today's pick", latestlive: 'ताज़ा लाइव सत्संग', latestliveK: 'Latest live satsang',
      latest: 'सबसे नया वीडियो', latestK: 'Latest video', watch: 'अभी देखें',
      viewall: 'सभी देखें', more: 'और दिखाएँ', playall: 'सभी चलाएँ', videos: 'वीडियो', course: 'कोर्स', podcast: 'पॉडकास्ट',
      openyt: 'YouTube पर खोलें', close: 'बंद करें', loading: 'लोड हो रहा है…',
      cantload: 'यह सूची अभी यहाँ नहीं खुल पाई। “सभी चलाएँ” दबाएँ या YouTube पर खोलें।',
      langs: 'हर भाषा में बापूजी', langsK: 'All channels', watchhere: 'यहाँ देखें', subscribe: 'सब्सक्राइब',
      liveTitle: 'लाइव मेडिटेशन', liveDaily: 'रोज़ रात 10 बजे (भारतीय समय)', liveIn: 'में शुरू', yourTime: 'आपके समय से',
      liveNowH: 'लाइव का समय है', liveNowS: 'अभी जुड़ें — बापूजी के साथ लाइव मेडिटेशन', joinLive: 'लाइव देखें', lastLive: 'पिछला लाइव',
      liveHelp: 'लाइव अभी शुरू नहीं हुआ? पिछला लाइव देखें', copied: 'लिंक कॉपी हो गया',
      results: 'खोज के नतीजे', resultsK: 'Search', noresults: 'इस पेज पर इस नाम का वीडियो नहीं मिला।', searchYT: 'YouTube चैनल पर खोजें',
      foot: 'सभी वीडियो सीधे YouTube से चलते हैं। नए वीडियो यहाँ अपने-आप जुड़ते रहते हैं।', subscribeYT: 'YouTube पर सब्सक्राइब करें',
      h: 'घं', m: 'मि', ch: 'चैनल'
    },
    en: {
      brand: 'Paramshanti', tagline: 'Behad ka Param Gyan · round the clock', search: 'Search videos…', chan: 'Channels',
      onair: 'On air · 24×7', vod: 'On demand', list: 'Playlist', livenow: 'Live',
      tv247: '24×7 TV', live: 'Live', prev: 'Previous', next: 'Next', share: 'Share', yt: 'Watch on YouTube',
      unmute: 'Tap for sound', turnon: 'Turn on the TV', nowplaying: 'Now playing', mini: 'Playing in the mini player',
      guide: 'Programme guide', upnext: 'Up next', now: 'Now',
      today: "Today's pick", todayK: 'आज का संदेश', latestlive: 'Latest live satsang', latestliveK: 'ताज़ा लाइव सत्संग',
      latest: 'Latest video', latestK: 'सबसे नया वीडियो', watch: 'Watch now',
      viewall: 'View all', more: 'Show more', playall: 'Play all', videos: 'videos', course: 'Course', podcast: 'Podcast',
      openyt: 'Open on YouTube', close: 'Close', loading: 'Loading…',
      cantload: 'This list could not be opened here just now. Press “Play all”, or open it on YouTube.',
      langs: 'Bapuji in every language', langsK: 'सभी चैनल', watchhere: 'Watch here', subscribe: 'Subscribe',
      liveTitle: 'Live meditation', liveDaily: 'Daily at 10 PM India time', liveIn: 'to go', yourTime: 'your time',
      liveNowH: 'It is live time', liveNowS: 'Join now — live meditation with Bapuji', joinLive: 'Watch live', lastLive: 'Last live',
      liveHelp: 'Live not started yet? Watch the last live', copied: 'Link copied',
      results: 'Search results', resultsK: 'खोज', noresults: 'No video with that name on this page.', searchYT: 'Search the YouTube channel',
      foot: 'All videos play directly from YouTube. New videos are added here automatically.', subscribeYT: 'Subscribe on YouTube',
      h: 'h', m: 'm', ch: 'Channel'
    }
  };
  function t(k) { return (T[S.ui] && T[S.ui][k]) || T.hi[k] || k; }
  function L(o) { return (S.ui === 'en' ? o.en : o.hi) || o.hi || o.en || ''; }       // a row / group title
  function K(o) { return (S.ui === 'en' ? o.hi : o.en) || ''; }                        // its kicker, in the other language

  /* ---------- state ---------- */
  var params = {};
  try { new URLSearchParams(location.search).forEach(function (v, k) { params[k] = v; }); } catch (e) { }
  var S = {
    ui: store('pstv.ui') === 'en' ? 'en' : 'hi',
    ch: CH[0], mode: 'tv', cur: null, slot: null, queue: [], qlabel: '', list: null,
    started: false, muted: true, bad: {}, errs: 0, dockOff: false, dockBroken: false, open: null
  };
  var wantCh = params.ch || store('pstv.ch');
  CH.forEach(function (c, i) { c.num = (i < 9 ? '0' : '') + (i + 1); if (c.k === wantCh) S.ch = c; });

  var el = {
    chips: $('pstv-chips'), screen: $('pstv-screen'), frame: $('pstv-frame'), poster: $('pstv-poster'), posterImg: $('pstv-poster-img'),
    posterK: $('pstv-poster-k'), posterT: $('pstv-poster-t'), unmute: $('pstv-unmute'), banner: $('pstv-banner'),
    badge: $('pstv-badge'), title: $('pstv-title'), sub: $('pstv-sub'), bTv: $('pstv-b-tv'), bLive: $('pstv-b-live'),
    bPrev: $('pstv-b-prev'), bNext: $('pstv-b-next'), bShare: $('pstv-b-share'), bYt: $('pstv-b-yt'),
    guideH: $('pstv-guide-h'), clock: $('pstv-clock'), glist: $('pstv-glist'), livecard: $('pstv-livecard'),
    liveH: $('pstv-live-h'), liveS: $('pstv-live-s'), liveB: $('pstv-live-b'), body: $('pstv-body'), q: $('pstv-q'),
    toast: $('pstv-toast'), subLink: $('pstv-sub-link'), probe: $('pstv-probe'), set: $('pstv-set')
  };

  /* ---------- responsive width classes (the block may be narrower than the window) ---------- */
  function measure() {
    var w = root.getBoundingClientRect().width;
    root.setAttribute('data-w', w >= 1040 ? 'l' : w >= 680 ? 'm' : 's');
  }
  measure();
  if (window.ResizeObserver) new ResizeObserver(measure).observe(root); else window.addEventListener('resize', measure);

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
    if (S.cur === id) renderNow();
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
    if (title(id) || tAsked[id]) return;
    if (tCache[id]) { setTitle(id, tCache[id]); return; }
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
  // YouTube answers a missing thumbnail with a 120px grey placeholder, not an error
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
  var P = null, Pready = false, pending = null, apiCbs = [], apiAsked = false;
  function apiReady() { return !!(window.YT && window.YT.Player); }
  function withAPI(cb) {
    if (apiReady()) return cb();
    apiCbs.push(cb);
    if (apiAsked) return;
    apiAsked = true;
    var prev = window.onYouTubeIframeAPIReady;
    function flush() { if (!apiReady()) return; clearInterval(poll); var a = apiCbs; apiCbs = []; a.forEach(function (f) { try { f(); } catch (e) { } }); }
    window.onYouTubeIframeAPIReady = function () { if (typeof prev === 'function') { try { prev(); } catch (e) { } } flush(); };
    var poll = setInterval(flush, 400);
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      var s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; s.async = true; document.head.appendChild(s);
    }
  }
  function playerVars(extra) {
    var pv = { autoplay: 1, mute: S.muted ? 1 : 0, playsinline: 1, rel: 0, iv_load_policy: 3, modestbranding: 1 };
    if (/^https?:/.test(location.protocol)) pv.origin = location.origin;
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
    P = new YT.Player('pstv-player', cfg);
  }
  var making = false;
  function run(job) {
    if (!Pready) {
      pending = job;
      if (!making) { making = true; withAPI(function () { var j = pending; pending = null; makePlayer(j); }); }
      return;
    }
    try {
      if (job.list) P.loadPlaylist({ list: job.list, listType: 'playlist', index: 0 });
      else P.loadVideoById({ videoId: job.id, startSeconds: Math.floor(job.start || 0) });
    } catch (e) { }
  }
  function onState(e) {
    var st = e.data;
    if (st === 1) {
      S.started = true; S.errs = 0;
      el.screen.classList.add('is-on');
      syncMuteUI();
      if (S.mode === 'list') {
        try { var d = P.getVideoData(); if (d && d.video_id) { S.cur = d.video_id; if (d.title && !title(d.video_id)) setTitle(d.video_id, d.title); renderNow(); renderGuide(); } } catch (x) { }
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
  function onError() {
    if (S.cur) S.bad[S.cur] = 1;
    if (++S.errs > 6) { el.screen.classList.remove('is-on'); return; }
    if (S.mode === 'tv') tuneTV();
    else if (S.mode === 'vod') { if (!step(1)) goTV(); }
    else if (S.mode === 'list') { try { P.nextVideo(); } catch (x) { goTV(); } }
  }
  function syncMuteUI() {
    var m = S.muted;
    try { if (Pready) m = P.isMuted(); } catch (e) { }
    S.muted = m;
    el.unmute.hidden = !(m && S.started && S.mode !== 'live');
  }
  function sound() {            // only ever called from a click, so the browser lets the sound through
    S.muted = false;
    try { if (Pready) { P.unMute(); P.setVolume(100); } } catch (e) { }
    el.unmute.hidden = true;
  }

  /* ---------- modes ---------- */
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
    if (m !== 'list') S.list = null;
    S.dockOff = false;
  }
  function tuneTV() {           // put on whatever the clock says is on air right now
    var now = Date.now(), s = slotAt(S.ch, now);
    if (!s) {                   // a channel with no timed programmes: fall back to its first row
      var r = S.ch.R[0];
      if (r && r.ids.length) return goVod(r.ids[0], r.ids, L(r), true);
      return;
    }
    // too close to the end, or a video that will not play here: move on to the next programme that will
    if (s.d - s.off < 15 || (s.id === S.cur && s.d - s.off < 45) || S.bad[s.id]) {
      var up = upcoming(S.ch, now, Math.min(wheel(S.ch).it.length, 40));
      for (var n = 1; n < up.length; n++) if (!S.bad[up[n].id]) { s = { i: up[n].i, id: up[n].id, d: up[n].d, off: 0, start: now }; break; }
    }
    S.slot = s; S.cur = s.id;
    run({ id: s.id, start: s.off });
    renderNow(); renderGuide();
  }
  function goTV(user) {
    setMode('tv');
    if (user) sound();
    tuneTV();
  }
  function goVod(id, queue, label, quiet) {
    if (!okId(id)) return;
    setMode('vod');
    S.queue = (queue && queue.length ? queue : [id]).slice();
    if (S.queue.indexOf(id) < 0) S.queue.unshift(id);
    S.qlabel = label || '';
    S.cur = id;
    if (!quiet) sound();
    run({ id: id, start: 0 });
    renderNow(); renderGuide(); markCurrent();
  }
  function goList(list, label, ids) {
    setMode('list');
    S.list = list; S.qlabel = label || ''; S.queue = []; S.listIds = ids || null; S.cur = ids && ids[0] ? ids[0] : null;
    sound();
    run({ list: list });
    renderNow(); renderGuide();
  }
  function goLive() {
    setMode('live');
    try { if (Pready) P.pauseVideo(); } catch (e) { }
    S.cur = null;
    liveFrame(true);
    el.screen.classList.add('is-on');
    el.unmute.hidden = true;
    renderNow(); renderGuide();
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
    var r = el.set.getBoundingClientRect();
    if (r.top < 0 || r.top > window.innerHeight * 0.45) {
      var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: window.pageYOffset + r.top - 84, behavior: reduce ? 'auto' : 'smooth' });
    }
  }

  /* ---------- live ---------- */
  function liveChannel() { return S.ch.live ? S.ch : CH[0]; }
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
    var c = liveChannel(), r = c.R.filter(function (x) { return x.k === 'live'; })[0];
    return r && r.ids.length ? { id: r.ids[0], ids: r.ids, row: r } : null;
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
      el.liveH.textContent = t('liveNowH');
      el.liveS.textContent = t('liveNowS');
      el.liveB.textContent = t('joinLive');
      el.liveB.setAttribute('data-act', 'live');
      el.liveB.hidden = false;
    } else {
      var mins = Math.max(1, Math.round(li.wait / 60000)), h = Math.floor(mins / 60), m = mins % 60;
      el.liveH.textContent = t('liveTitle') + ' · ' + (h ? h + ' ' + t('h') + ' ' : '') + m + ' ' + t('m') + ' ' + t('liveIn');
      el.liveS.textContent = t('liveDaily') + ' · ' + t('yourTime') + ' ' + fmtClock(li.start);
      el.liveB.textContent = t('lastLive');
      el.liveB.setAttribute('data-act', 'lastlive');
      el.liveB.hidden = !latestLive();
    }
  }

  /* ---------- now bar, poster, guide ---------- */
  function renderNow() {
    var name = S.ch.n + (S.ch.en && S.ch.en !== S.ch.n ? ' · ' + S.ch.en : '');
    var ttl = S.cur ? title(S.cur) : '', sub = S.ch.t;
    el.badge.setAttribute('data-mode', S.mode);
    if (S.mode === 'tv') {
      el.badge.textContent = t('onair') + ' · ' + S.ch.num + ' ' + S.ch.n;
      if (S.slot) sub = fmtClock(S.slot.start) + ' – ' + fmtClock(S.slot.start + S.slot.d * 1000) + ' · ' + S.ch.t;
    } else if (S.mode === 'live') {
      var lc = liveChannel();
      el.badge.textContent = t('livenow');
      ttl = t('liveTitle') + ' · ' + lc.t;
      sub = t('liveDaily');
    } else {
      el.badge.textContent = S.mode === 'list' ? t('list') : t('vod');
      if (S.qlabel) sub = S.qlabel + ' · ' + S.ch.t;
      if (S.mode === 'list' && !ttl) ttl = S.qlabel || t('loading');
    }
    markDeva(el.badge);
    el.title.textContent = ttl || t('loading');
    el.sub.textContent = sub;
    el.bTv.setAttribute('aria-pressed', S.mode === 'tv' ? 'true' : 'false');
    var can = S.mode === 'vod' || S.mode === 'list', i = S.queue.indexOf(S.cur);
    el.bPrev.disabled = !can || (S.mode === 'vod' && i <= 0);
    el.bNext.disabled = !can || (S.mode === 'vod' && i >= S.queue.length - 1);
    el.bYt.href = S.mode === 'live' ? 'https://www.youtube.com/' + liveChannel().h + '/live'
      : S.cur ? 'https://www.youtube.com/watch?v=' + S.cur + (S.list ? '&list=' + S.list : '') : 'https://www.youtube.com/' + S.ch.h;
    el.subLink.href = 'https://www.youtube.com/' + S.ch.h + '?sub_confirmation=1';
    if (S.cur && !title(S.cur)) needTitle(S.cur);
    // poster
    el.posterK.textContent = el.screen.classList.contains('is-docked') ? t('mini') : (S.mode === 'tv' ? t('nowplaying') + ' · ' + name : t('nowplaying'));
    markDeva(el.posterK);
    el.posterT.textContent = ttl;
    if (S.cur && el.posterImg.getAttribute('data-id') !== S.cur) {
      el.posterImg.setAttribute('data-id', S.cur);
      el.posterImg.setAttribute('data-fb', thumb(S.cur, 'mqdefault'));
      el.posterImg.src = thumb(S.cur, 'hq720');
    }
    renderLive();
  }
  function guideItem(o) {
    return '<li><button type="button" class="pstv-gi' + (o.now ? ' is-now' : '') + '"' + (o.now ? ' aria-current="true"' : ' data-g="' + o.id + '"') + '>' +
      '<span class="pstv-gtime">' + (o.now ? '<small class="' + dv(t('now')) + '">' + esc(t('now')) + '</small>' : '') + esc(o.time || '') + '</span>' +
      '<span><span class="pstv-gt" data-tt="' + o.id + '">' + esc(title(o.id) || '…') + '</span>' +
      (o.d ? '<span class="pstv-gd">' + fmtDur(o.d) + '</span>' : '') +
      (o.now && o.pct != null ? '<span class="pstv-gbar"><i style="width:' + o.pct.toFixed(1) + '%"></i></span>' : '') + '</span></button></li>';
  }
  var guideSig = '';
  function renderGuide(force) {
    var html = '', sig;
    if (S.mode === 'tv' || S.mode === 'live') {
      var up = upcoming(S.ch, Date.now(), 12), lead = true;
      if (S.mode === 'tv' && S.slot && up[0] && up[0].id !== S.slot.id) {    // a programme was skipped: start the list at what is really playing
        for (var c = 1; c < up.length; c++) if (up[c].id === S.slot.id) { up = up.slice(c); lead = false; break; }
      }
      up = up.slice(0, 10);
      sig = 'tv' + S.ui + S.ch.k + (up[0] ? up[0].id + up[0].start : '');
      el.guideH.textContent = t('guide');
      up.forEach(function (s, n) {
        if (n && S.bad[s.id]) return;
        html += guideItem({ id: s.id, d: s.d, time: fmtClock(s.start), now: n === 0, pct: n === 0 && lead ? Math.min(100, s.off / s.d * 100) : null });
      });
    } else if (S.mode === 'vod') {
      var i = Math.max(0, S.queue.indexOf(S.cur));
      sig = 'vod' + S.ui + S.cur + S.queue.length;
      el.guideH.textContent = t('upnext');
      S.queue.slice(i, i + 14).forEach(function (id, n) { if (!S.bad[id]) html += guideItem({ id: id, d: V[id] && V[id][1], now: n === 0, time: n === 0 ? '' : String(i + n + 1) }); });
    } else {
      sig = 'list' + S.ui + S.cur;
      el.guideH.textContent = t('upnext');
      var pl = [], pi = 0;
      try { pl = P.getPlaylist() || []; pi = Math.max(0, P.getPlaylistIndex()); } catch (e) { }
      if (!pl.length && S.listIds) { pl = S.listIds; pi = 0; }
      sig += pl.length;
      pl.slice(pi, pi + 14).forEach(function (id, n) { html += guideItem({ id: id, d: V[id] && V[id][1], now: n === 0, time: n === 0 ? '' : String(pi + n + 1) }); });
      S.queue = pl;
    }
    el.clock.textContent = fmtClock(Date.now());
    if (!force && sig === guideSig) {     // same programme: only move the progress bar
      var bar = el.glist.querySelector('.pstv-gbar i'), s0 = S.mode === 'tv' ? slotAt(S.ch, Date.now()) : null;
      if (bar && s0) bar.style.width = Math.min(100, s0.off / s0.d * 100).toFixed(1) + '%';
      return;
    }
    guideSig = sig;
    el.glist.innerHTML = html;
    el.glist.scrollTop = 0;
    var need = el.glist.querySelectorAll('[data-tt]');
    for (var k = 0; k < need.length; k++) needTitle(need[k].getAttribute('data-tt'));
  }
  function markCurrent() {
    var old = root.querySelectorAll('.pstv-card.is-cur');
    for (var i = 0; i < old.length; i++) old[i].classList.remove('is-cur');
    if (!S.cur || S.mode === 'tv') return;
    var now = root.querySelectorAll('.pstv-card[data-v="' + S.cur + '"]');
    for (var j = 0; j < now.length; j++) now[j].classList.add('is-cur');
  }
  function flashBanner() {
    el.banner.firstChild.textContent = t('ch') + ' ' + S.ch.num;
    el.banner.lastChild.textContent = S.ch.n + (S.ch.en && S.ch.en !== S.ch.n ? ' · ' + S.ch.en : '');
    el.banner.classList.add('is-show');
    clearTimeout(flashBanner.t);
    flashBanner.t = setTimeout(function () { el.banner.classList.remove('is-show'); }, 2400);
  }

  /* ---------- cards and sections ---------- */
  function card(id, short) {
    var ttl = title(id), d = V[id] && V[id][1];
    return '<button type="button" class="pstv-card' + (short ? ' is-short' : '') + '" data-v="' + id + '"' + (short ? ' data-short="1"' : '') + '>' +
      '<span class="pstv-th"><img loading="lazy" decoding="async" alt="" src="' + (short ? thumb(id, 'oar2') + '" data-fb="' + thumb(id, 'hqdefault') : thumb(id)) + '">' +
      (d && !short ? '<span class="pstv-dur">' + fmtDur(d) + '</span>' : '') + '<span class="pstv-pl">' + ICON.play + '</span></span>' +
      '<span class="pstv-ct' + (ttl ? '' : ' is-wait') + '" data-tt="' + id + '">' + esc(ttl || '…') + '</span></button>';
  }
  function head(o) {
    return '<div class="pstv-head"><div class="pstv-head-t">' + (o.k ? '<p class="pstv-kicker' + dv(o.k) + '">' + esc(o.k) + '</p>' : '') +
      '<h2 class="pstv-h2">' + esc(o.t) + '</h2></div>' +
      (o.href ? '<a class="pstv-more" target="_blank" rel="noopener" href="' + o.href + '">' + esc(t('viewall')) + ICON.out + '</a>' : '') +
      (o.arrows ? '<div class="pstv-arrows"><button type="button" class="pstv-arrow" data-scroll="-1" aria-label="' + esc(t('prev')) + '">' + ICON.left +
        '</button><button type="button" class="pstv-arrow" data-scroll="1" aria-label="' + esc(t('next')) + '">' + ICON.right + '</button></div>' : '') + '</div>';
  }
  function rowHTML(r) {
    var short = r.kind === 's', ids = r.ids.filter(function (id) { return !S.bad[id]; });
    return head({ k: K(r), t: L(r), href: 'https://www.youtube.com/playlist?list=' + r.l, arrows: 1 }) +
      '<div class="pstv-rail" data-row="' + r.k + '">' + ids.map(function (id) { return card(id, short); }).join('') +
      '<button type="button" class="pstv-card is-end' + (short ? ' is-short' : '') + '" data-more="' + r.k + '"><span>' + ICON.plus + esc(t('more')) + '</span></button></div>';
  }
  function colCard(p, g) {
    var tag = p.ty === 'c' ? t('course') : p.ty === 'p' ? t('podcast') : '';
    return '<button type="button" class="pstv-col" data-col="' + p.l + '" data-group="' + g.k + '" aria-expanded="false">' +
      '<span class="pstv-col-th"><span class="pstv-th">' + (p.cv ? '<img loading="lazy" decoding="async" alt="" src="' + thumb(p.cv) + '">' : '') +
      (tag ? '<span class="pstv-tag' + dv(tag) + '">' + esc(tag) + '</span>' : '') +
      '<span class="pstv-count"><b>' + (p.c || '') + '</b>' + esc(t('videos')) + '</span></span></span>' +
      '<span class="pstv-ct">' + esc(p.t) + '</span></button>';
  }
  function feature(k, kk, id, queueKey) {
    return '<button type="button" class="pstv-feature" data-v="' + id + '" data-queue="' + queueKey + '">' +
      '<p class="pstv-kicker' + dv(kk) + '">' + esc(kk) + '</p><h2 class="pstv-h2">' + esc(k) + '</h2>' +
      '<span class="pstv-th"><img loading="lazy" decoding="async" alt="" src="' + thumb(id, 'hq720') + '" data-fb="' + thumb(id) + '">' +
      (V[id] && V[id][1] ? '<span class="pstv-dur">' + fmtDur(V[id][1]) + '</span>' : '') + '<span class="pstv-pl">' + ICON.play + '</span></span>' +
      '<span class="pstv-feature-t" data-tt="' + id + '">' + esc(title(id) || '…') + '</span>' +
      '<span class="pstv-feature-m">' + ICON.play.replace('18" height="18', '13" height="13') + esc(t('watch')) + '</span></button>';
  }
  function rowOf(k) { return S.ch.R.filter(function (r) { return r.k === k; })[0]; }
  function duoHTML() {
    var top = rowOf('top') || rowOf('all') || S.ch.R[0], live = rowOf('live'), fresh = rowOf('new') || S.ch.R[0], html = '';
    if (top) {
      var pool = top.ids.filter(function (id) { return !S.bad[id] && (!V[id] || !V[id][1] || V[id][1] >= 150); });
      if (pool.length) html += feature(t('today'), t('todayK'), pool[Math.floor((Date.now() + IST) / 86400000) % pool.length], top.k);
    }
    if (live && live.ids.length) html += feature(t('latestlive'), t('latestliveK'), live.ids[0], 'live');
    else if (fresh && fresh.ids.length) html += feature(t('latest'), t('latestK'), fresh.ids[0], fresh.k);
    return html ? '<section class="pstv-sec" id="pstv-duo-sec"><div class="pstv-duo">' + html + '</div></section>' : '';
  }
  function langsHTML() {
    return '<section class="pstv-sec" id="pstv-langs-sec">' + head({ k: t('langsK'), t: t('langs') }) + '<div class="pstv-langs">' +
      CH.map(function (c) {
        return '<div class="pstv-lang' + (c === S.ch ? ' is-cur' : '') + '"><span class="pstv-lang-n">' + c.num + '</span>' +
          '<span class="pstv-lang-name">' + esc(c.n) + '</span><span class="pstv-lang-en">' + esc(c.t) + '</span>' +
          '<span class="pstv-lang-a"><button type="button" data-ch="' + c.k + '" data-top="1">' + esc(t('watchhere')) + '</button>' +
          '<a target="_blank" rel="noopener" href="https://www.youtube.com/' + c.h + '?sub_confirmation=1">' + esc(t('subscribe')) + ' ↗</a></span></div>';
      }).join('') + '</div></section>';
  }
  function renderChips() {
    el.chips.innerHTML = CH.map(function (c) {
      return '<button type="button" class="pstv-chip" role="tab" data-ch="' + c.k + '" aria-selected="' + (c === S.ch) + '" title="' + esc(c.t) + '"><i>' + c.num + '</i>' + esc(c.n) + '</button>';
    }).join('');
    var cur = el.chips.querySelector('[aria-selected="true"]');
    if (cur && cur.offsetLeft + cur.offsetWidth > el.chips.clientWidth) el.chips.scrollLeft = cur.offsetLeft - 20;
  }
  function renderBody() {
    var html = '<div id="pstv-results"></div>' + duoHTML();
    S.ch.R.forEach(function (r) { html += '<section class="pstv-sec" data-sec="' + r.k + '">' + rowHTML(r) + '</section>'; });
    S.ch.G.forEach(function (g) {
      if (!g.P.length) return;
      html += '<section class="pstv-sec" data-gsec="' + g.k + '">' + head({ k: K(g), t: L(g), href: 'https://www.youtube.com/' + S.ch.h + '/playlists', arrows: 1 }) +
        '<div class="pstv-rail">' + g.P.map(function (p) { return colCard(p, g); }).join('') + '</div><div data-panel="' + g.k + '"></div></section>';
    });
    html += langsHTML();
    el.body.innerHTML = html;
    S.open = null;
    watchTitles(el.body);
    markCurrent();
    if (el.q.value.trim().length > 1) search();
  }
  function applyWords() {
    root.setAttribute('lang', S.ui);
    var n = root.querySelectorAll('[data-t]');
    for (var i = 0; i < n.length; i++) { n[i].textContent = t(n[i].getAttribute('data-t')); markDeva(n[i]); }
    var a = root.querySelectorAll('[data-ta]');
    for (var j = 0; j < a.length; j++) { a[j].setAttribute('aria-label', t(a[j].getAttribute('data-ta'))); a[j].title = t(a[j].getAttribute('data-ta')); }
    el.q.placeholder = t('search'); el.q.setAttribute('aria-label', t('search'));
    var b = root.querySelectorAll('.pstv-ui button');
    for (var k = 0; k < b.length; k++) b[k].setAttribute('aria-pressed', b[k].getAttribute('data-ui') === S.ui ? 'true' : 'false');
  }
  function renderAll() { applyWords(); renderChips(); renderBody(); renderNow(); renderGuide(true); }

  function setChannel(key, user) {
    var c = CH.filter(function (x) { return x.k === key; })[0];
    if (!c || c === S.ch) return;
    S.ch = c; store('pstv.ch', key);
    renderChips(); renderBody();
    if (S.mode === 'tv' || S.mode === 'live') { if (user && S.started) sound(); setMode('tv'); tuneTV(); } else { renderNow(); renderGuide(true); }
    flashBanner();
    syncChannel();
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
  function mergeRow(ch, r, ids) {
    if (!ids.length) return false;
    r.all = ids;
    var have = {}; r.ids.forEach(function (id) { have[id] = 1; });
    var first = -1;
    for (var i = 0; i < ids.length; i++) if (have[ids[i]]) { first = i; break; }
    var before = r.ids.join();
    if (first < 0) r.ids = ids.slice(0, Math.max(r.ids.length, 12));
    else if (first > 0) r.ids = ids.slice(0, Math.min(first, 40)).concat(r.ids);
    r.ids.forEach(function (id) { if (!V[id]) V[id] = [tCache[id] || '', 0]; });
    return r.ids.join() !== before;
  }
  function syncChannel() {
    var ch = S.ch;
    if (ch._synced) return;
    ch._synced = 1;
    ch.R.forEach(function (r) {
      if (!r.s) return;
      probeList(r.l, function (ids) {
        if (!mergeRow(ch, r, ids) || ch !== S.ch) return;
        var sec = el.body.querySelector('[data-sec="' + r.k + '"]');
        if (sec) { sec.innerHTML = rowHTML(r); watchTitles(sec); markCurrent(); }
        if (r.k === 'live' || r.k === 'new') {
          var duo = $('pstv-duo-sec');
          if (duo) { var tmp = document.createElement('div'); tmp.innerHTML = duoHTML(); if (tmp.firstChild) { duo.replaceWith(tmp.firstChild); watchTitles(el.body); } }
          renderLive();
        }
      });
    });
  }
  function showMore(k, btn) {
    var r = rowOf(k);
    if (!r) return;
    var rail = btn.parentNode;
    function add(all) {
      var have = {}; r.ids.forEach(function (id) { have[id] = 1; });
      var extra = (all || []).filter(function (id) { return !have[id] && !S.bad[id]; }).slice(0, 16);
      if (!extra.length) { window.open('https://www.youtube.com/playlist?list=' + r.l, '_blank', 'noopener'); return; }
      extra.forEach(function (id) { if (!V[id]) V[id] = [tCache[id] || '', 0]; r.ids.push(id); });
      var tmp = document.createElement('div');
      tmp.innerHTML = extra.map(function (id) { return card(id, r.kind === 's'); }).join('');
      while (tmp.firstChild) rail.insertBefore(tmp.firstChild, btn);
      watchTitles(rail);
    }
    if (r.all) return add(r.all);
    btn.querySelector('span').lastChild.textContent = t('loading');
    probeList(r.l, function (ids) { r.all = ids; btn.querySelector('span').lastChild.textContent = t('more'); add(ids); });
  }

  /* ---------- collections: a playlist opens as a panel under its row ---------- */
  function findCol(gk, l) {
    var g = S.ch.G.filter(function (x) { return x.k === gk; })[0];
    return g ? g.P.filter(function (p) { return p.l === l; })[0] : null;
  }
  function closeCol() {
    if (!S.open) return;
    var holder = el.body.querySelector('[data-panel="' + S.open.g + '"]');
    if (holder) holder.innerHTML = '';
    var b = el.body.querySelectorAll('.pstv-col[aria-expanded="true"]');
    for (var i = 0; i < b.length; i++) b[i].setAttribute('aria-expanded', 'false');
    S.open = null;
  }
  function panelGrid(p, n) {
    var ids = (p.all || p.ids || []).filter(function (id) { return !S.bad[id]; });
    ids.forEach(function (id) { if (!V[id]) V[id] = [tCache[id] || '', 0]; });
    return '<div class="pstv-grid" data-colgrid="' + p.l + '">' + ids.slice(0, n).map(function (id) { return card(id); }).join('') + '</div>' +
      (ids.length > n ? '<div class="pstv-panel-foot"><button type="button" class="pstv-pill is-ghost" data-colmore="' + (n + 20) + '">' + esc(t('more')) + '</button></div>' : '');
  }
  function openCol(gk, l, btn) {
    var p = findCol(gk, l);
    if (!p) return;
    if (S.open && S.open.l === l) { closeCol(); return; }
    closeCol();
    S.open = { g: gk, l: l, p: p };
    if (btn) btn.setAttribute('aria-expanded', 'true');
    var holder = el.body.querySelector('[data-panel="' + gk + '"]');
    holder.innerHTML = '<div class="pstv-panel"><div class="pstv-panel-head"><h3>' + esc(p.t) + '<small>' + (p.c ? p.c + ' ' + esc(t('videos')) + ' · ' : '') + esc(S.ch.t) + '</small></h3>' +
      '<button type="button" class="pstv-pill" data-playall="' + l + '">' + ICON.play.replace('18" height="18', '14" height="14') + esc(t('playall')) + '</button>' +
      '<a class="pstv-pill is-ghost" target="_blank" rel="noopener" href="https://www.youtube.com/playlist?list=' + l + '">' + esc(t('openyt')) + ICON.out + '</a>' +
      '<button type="button" class="pstv-pill is-ghost is-x" data-colclose="1" aria-label="' + esc(t('close')) + '">' + ICON.x + '</button></div>' +
      '<div data-colbody="1"><p class="pstv-note">' + esc(t('loading')) + '</p></div></div>';
    var body = holder.querySelector('[data-colbody]');
    function paint() { body.innerHTML = panelGrid(p, 20); watchTitles(body); markCurrent(); }
    if (p.all || (p.ids && p.ids.length)) paint();
    if (!p.all) probeList(l, function (ids) {
      if (ids.length) p.all = ids;
      if (!S.open || S.open.l !== l) return;
      if (p.all) paint(); else if (!(p.ids && p.ids.length)) body.innerHTML = '<p class="pstv-note">' + esc(t('cantload')) + '</p>';
    });
    var r = holder.getBoundingClientRect();
    if (r.top > window.innerHeight * 0.7) window.scrollTo({ top: window.pageYOffset + r.top - window.innerHeight * 0.3, behavior: 'smooth' });
  }

  /* ---------- search ---------- */
  var norm = function (s) { return String(s).toLowerCase().replace(/\s+/g, ' ').trim(); };
  function search() {
    var box = $('pstv-results');
    if (!box) return;
    var q = norm(el.q.value);
    if (q.length < 2) { box.innerHTML = ''; return; }
    var words = q.split(' '), hits = [];
    for (var id in V) {
      if (S.bad[id]) continue;
      var tt = norm(V[id][0]);
      if (tt && words.every(function (w) { return tt.indexOf(w) >= 0; })) { hits.push(id); if (hits.length >= 30) break; }
    }
    var cols = [];
    S.ch.G.forEach(function (g) { g.P.forEach(function (p) { var tt = norm(p.t); if (words.every(function (w) { return tt.indexOf(w) >= 0; })) cols.push([p, g]); }); });
    var link = '<a class="pstv-pill is-ghost" target="_blank" rel="noopener" href="https://www.youtube.com/' + S.ch.h + '/search?query=' + encodeURIComponent(el.q.value.trim()) + '">' + esc(t('searchYT')) + ICON.out + '</a>';
    box.innerHTML = '<section class="pstv-sec"><div class="pstv-panel"><div class="pstv-panel-head"><h3>' + esc(t('results')) + '<small>“' + esc(el.q.value.trim()) + '”</small></h3>' + link +
      '<button type="button" class="pstv-pill is-ghost is-x" data-clearq="1" aria-label="' + esc(t('close')) + '">' + ICON.x + '</button></div>' +
      (cols.length ? '<div class="pstv-rail" style="margin-bottom:22px">' + cols.slice(0, 8).map(function (c) { return colCard(c[0], c[1]); }).join('') + '</div>' : '') +
      (hits.length ? '<div class="pstv-grid">' + hits.map(function (id) { return card(id); }).join('') + '</div>' : (cols.length ? '' : '<p class="pstv-note">' + esc(t('noresults')) + '</p>')) +
      '</div></section>';
  }

  /* ---------- shorts viewer ---------- */
  var sh = null;
  function shorts(ids, i) {
    if (!sh) {
      sh = document.createElement('div');
      sh.className = 'pstv-layer'; sh.hidden = true;
      sh.setAttribute('role', 'dialog'); sh.setAttribute('aria-modal', 'true'); sh.setAttribute('aria-label', 'Shorts');
      sh.innerHTML = '<button type="button" class="pstv-sh-x" data-sh="x" aria-label="Close">' + ICON.x + '</button><div class="pstv-sh">' +
        '<button type="button" class="pstv-sh-nav" data-sh="-1" aria-label="Previous">' + ICON.left + '</button>' +
        '<div class="pstv-sh-frame"><iframe title="Short" referrerpolicy="strict-origin-when-cross-origin" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>' +
        '<button type="button" class="pstv-sh-nav" data-sh="1" aria-label="Next">' + ICON.right + '</button><p class="pstv-sh-t"></p></div>';
      document.body.appendChild(sh);
      sh.addEventListener('click', function (e) {
        var b = e.target.closest ? e.target.closest('[data-sh]') : null;
        if (!b) { if (e.target === sh) shortsClose(); return; }
        var a = b.getAttribute('data-sh');
        if (a === 'x') shortsClose(); else shortsShow(sh.i + Number(a));
      });
    }
    sh.ids = ids; sh.back = document.activeElement;
    try { if (Pready && S.mode !== 'live') P.pauseVideo(); } catch (e) { }
    sh.hidden = false;
    shortsShow(i);
    sh.querySelector('.pstv-sh-x').focus();
  }
  function shortsShow(i) {
    if (i < 0 || i >= sh.ids.length) return;
    sh.i = i;
    var id = sh.ids[i], nav = sh.querySelectorAll('.pstv-sh-nav');
    sh.querySelector('iframe').src = 'https://www.youtube.com/embed/' + id + '?autoplay=1&playsinline=1&rel=0&loop=1&playlist=' + id;
    sh.querySelector('.pstv-sh-t').textContent = title(id);
    nav[0].disabled = i === 0; nav[1].disabled = i === sh.ids.length - 1;
  }
  function shortsClose() {
    if (!sh || sh.hidden) return;
    sh.hidden = true; sh.querySelector('iframe').src = 'about:blank';
    if (sh.back && sh.back.focus) sh.back.focus();
  }
  document.addEventListener('keydown', function (e) {
    if (!sh || sh.hidden) return;
    if (e.key === 'Escape') shortsClose();
    else if (e.key === 'ArrowRight') shortsShow(sh.i + 1);
    else if (e.key === 'ArrowLeft') shortsShow(sh.i - 1);
  });

  /* ---------- mini player when the screen scrolls away ---------- */
  function dock(on) {
    if (on === el.frame.classList.contains('is-docked')) return;
    el.frame.classList.toggle('is-docked', on);
    el.screen.classList.toggle('is-docked', on);
    renderNow();
    if (on) requestAnimationFrame(function () {    // a transformed ancestor would trap position:fixed; if so, give the idea up
      var r = el.frame.getBoundingClientRect();
      if (r.width < 40 || r.left < -2 || r.top < -2 || r.right > window.innerWidth + 2 || r.bottom > window.innerHeight + 2) { S.dockBroken = true; dock(false); }
    });
  }
  if (window.IntersectionObserver) new IntersectionObserver(function (es) {
    var vis = es[0].isIntersecting, playing = false;
    try { playing = S.mode === 'live' || (Pready && (P.getPlayerState() === 1 || P.getPlayerState() === 3)); } catch (e) { }
    dock(!vis && playing && S.started && !S.dockOff && !S.dockBroken);
  }, { threshold: 0.12 }).observe(el.screen);

  /* ---------- clicks ---------- */
  function share() {
    var u = location.origin + location.pathname + (S.cur ? '?v=' + S.cur : '') + (S.ch !== CH[0] ? (S.cur ? '&' : '?') + 'ch=' + S.ch.k : '');
    var ttl = (S.cur && title(S.cur)) || 'Paramshanti TV';
    if (navigator.share) { navigator.share({ title: ttl, url: u }).catch(function () { }); return; }
    function ok() { el.toast.textContent = t('copied'); el.toast.classList.add('is-show'); setTimeout(function () { el.toast.classList.remove('is-show'); }, 2000); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(u).then(ok, function () { window.prompt('', u); });
    else window.prompt('', u);
  }
  root.addEventListener('click', function (e) {
    var x = e.target.closest ? e.target.closest('button,a') : null;
    if (!x || !root.contains(x)) return;
    var a;
    if (x === el.poster) { sound(); if (S.mode === 'tv' && !S.started) tuneTV(); else if (Pready) { try { P.playVideo(); } catch (er) { } } return; }
    if (x === el.unmute) return sound();
    if (x === el.bTv) { goTV(true); return; }
    if (x === el.bLive) { var li = liveInfo(), l0 = latestLive(); if ((li && li.on) || !l0) goLive(); else goVod(l0.id, l0.ids, L(l0.row)); return; }
    if (x.getAttribute('data-act') === 'live') { goLive(); toStage(); return; }
    if (x.getAttribute('data-act') === 'lastlive') { var ll = latestLive(); if (ll) { goVod(ll.id, ll.ids, L(ll.row)); toStage(); } return; }
    if (x === el.bPrev) { sound(); step(-1); return; }
    if (x === el.bNext) { sound(); step(1); return; }
    if (x === el.bShare) return share();
    if (x.id === 'pstv-dockx') { S.dockOff = true; dock(false); try { if (S.mode === 'live') goTV(); else P.pauseVideo(); } catch (er) { } return; }
    if ((a = x.getAttribute('data-ui'))) { S.ui = a; store('pstv.ui', a); renderAll(); return; }
    if ((a = x.getAttribute('data-ch'))) { setChannel(a, true); if (x.getAttribute('data-top')) toStage(); return; }
    if ((a = x.getAttribute('data-g'))) {
      if (S.mode === 'list') { sound(); try { P.playVideoAt(Math.max(0, (P.getPlaylist() || []).indexOf(a))); } catch (er) { } }
      else if (S.mode === 'vod') goVod(a, S.queue, S.qlabel);
      else goVod(a, upcoming(S.ch, Date.now(), 14).map(function (s) { return s.id; }), t('tv247'));
      return;
    }
    if ((a = x.getAttribute('data-scroll'))) { var rail = x.closest('.pstv-sec').querySelector('.pstv-rail'); if (rail) rail.scrollBy({ left: Number(a) * rail.clientWidth * 0.82, behavior: 'smooth' }); return; }
    if ((a = x.getAttribute('data-more'))) return showMore(a, x);
    if ((a = x.getAttribute('data-col'))) return openCol(x.getAttribute('data-group'), a, x);
    if (x.getAttribute('data-colclose')) return closeCol();
    if ((a = x.getAttribute('data-colmore'))) { var p = S.open && S.open.p, body = x.closest('[data-colbody]'); if (p && body) { body.innerHTML = panelGrid(p, Number(a)); watchTitles(body); markCurrent(); } return; }
    if ((a = x.getAttribute('data-playall'))) { var pc = S.open && S.open.p; goList(a, pc ? pc.t : '', pc && pc.all); toStage(); return; }
    if (x.getAttribute('data-clearq')) { el.q.value = ''; search(); return; }
    if ((a = x.getAttribute('data-v'))) {
      var box = x.closest('.pstv-rail,.pstv-grid'), ids = [], label = '';
      if (box) { var cs = box.querySelectorAll('.pstv-card[data-v]'); for (var i = 0; i < cs.length; i++) ids.push(cs[i].getAttribute('data-v')); }
      if (x.getAttribute('data-short')) return shorts(ids.length ? ids : [a], Math.max(0, ids.indexOf(a)));
      var qk = x.getAttribute('data-queue'), sec = x.closest('.pstv-sec');
      if (qk && rowOf(qk)) { ids = rowOf(qk).ids; label = L(rowOf(qk)); }
      else if (box && box.getAttribute('data-colgrid') && S.open) { label = S.open.p.t; ids = (S.open.p.all || ids); }
      else if (sec) { var h2 = sec.querySelector('.pstv-h2'); label = h2 ? h2.textContent : ''; }
      goVod(a, ids, label); toStage();
    }
  });
  var qTimer;
  el.q.addEventListener('input', function () { clearTimeout(qTimer); qTimer = setTimeout(search, 180); });

  /* ---------- start ---------- */
  renderAll();
  if (okId(params.v)) { goVod(params.v, [params.v], '', true); needTitle(params.v); }
  else tuneTV();
  setInterval(function () {
    renderGuide(); renderLive();
    if (S.mode === 'tv' && S.slot && !S.started) {      // TV still off: keep the poster on whatever is on air
      var s = slotAt(S.ch, Date.now());
      if (s && s.id !== S.cur) { S.slot = s; S.cur = s.id; pending = Pready ? null : { id: s.id, start: s.off }; renderNow(); }
    }
  }, 20000);
  setTimeout(syncChannel, 2500);
})();
