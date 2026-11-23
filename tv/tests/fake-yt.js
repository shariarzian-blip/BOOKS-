// A stand-in for YouTube's IFrame Player API, so every state of the page can be driven without real video.
(function () {
  var players = [];
  window.__players = players;
  window.__lists = window.__lists || {};
  // what a playlist "contains": two uploads newer than the page's snapshot, the snapshot itself, then older videos
  function listFor(id) {
    if (window.__lists[id]) return window.__lists[id].slice();
    var snap = [];
    try {
      JSON.parse(document.getElementById('pstv-data').textContent).C.forEach(function (c) { c.R.forEach(function (r) { if (r.l === id) snap = r.ids; }); });
    } catch (e) { }
    if (/^PL/.test(id) && !snap.length) return ['PLVIDEO0001', 'PLVIDEO0002', 'PLVIDEO0003', 'PLVIDEO0004'];
    var older = []; for (var i = 0; i < 30; i++) older.push('OLDERVID' + String(100 + i));
    return (/^UU/.test(id) ? ['NEWVIDEO001', 'NEWVIDEO002'] : []).concat(snap, older);
  }
  function Player(el, cfg) {
    var self = this;
    el = typeof el === 'string' ? document.getElementById(el) : el;
    var f = document.createElement('iframe');
    f.id = el.id; f.setAttribute('data-fake', '1');
    el.replaceWith(f);
    var pv = cfg.playerVars || {};
    this.cfg = cfg; this.isMain = f.id === 'pstv-player';
    this.vid = cfg.videoId || null; this.muted = !!pv.mute; this.volume = 100; this.state = -1; this.calls = [];
    this.list = []; this.idx = 0;
    if (pv.list) this.list = listFor(pv.list);
    this.emit = function (s) { self.state = s; if (cfg.events.onStateChange) cfg.events.onStateChange({ data: s, target: self }); };
    this.fail = function (code) { if (cfg.events.onError) cfg.events.onError({ data: code || 150, target: self }); };
    function start() {
      if (window.__noStart) { self.state = -1; return; }                          // a browser that will not start any video by itself
      if (window.__stuck && !self.muted) { self.state = -1; return; }             // a phone that will not start a video with sound from outside the player
      if (window.__failAll) { setTimeout(function () { self.fail(150); }, 20); return; }
      setTimeout(function () { self.emit(3); self.emit(1); }, 30);
    }
    this.loadVideoById = function (o) { self.calls.push('load:' + o.videoId + '@' + o.startSeconds); self.vid = o.videoId; self.list = []; self.state = -1; start(); };
    this.loadPlaylist = function (o) { self.calls.push('list:' + o.list); self.list = listFor(o.list); self.idx = 0; self.vid = self.list[0]; start(); };
    this.playVideo = function () { self.calls.push('play'); if (!self.vid) return; start(); };
    this.pauseVideo = function () { self.calls.push('pause'); self.emit(2); };
    this.nextVideo = function () { if (self.idx < self.list.length - 1) { self.idx++; self.vid = self.list[self.idx]; self.calls.push('next'); start(); } };
    this.previousVideo = function () { if (self.idx > 0) { self.idx--; self.vid = self.list[self.idx]; self.calls.push('prev'); start(); } };
    this.playVideoAt = function (i) { self.idx = i; self.vid = self.list[i]; self.calls.push('at:' + i); start(); };
    this.mute = function () { self.muted = true; self.calls.push('mute'); };
    this.unMute = function () { self.muted = false; self.calls.push('unmute'); };
    this.isMuted = function () { return self.muted; };
    this.getVolume = function () { return self.volume; };
    this.setVolume = function (v) { self.volume = v; self.calls.push('vol:' + v); };
    this.getPlayerState = function () { return self.state; };
    this.getPlaylist = function () { return self.list; };
    this.getPlaylistIndex = function () { return self.idx; };
    this.getVideoData = function () { return { video_id: self.vid, title: 'Title of ' + self.vid }; };
    this.getIframe = function () { return f; };
    this.destroy = function () { f.remove(); self.dead = true; };
    players.push(this);
    if (this.isMain) window.__main = this;
    setTimeout(function () {
      if (cfg.events.onReady) cfg.events.onReady({ target: self });
      if (self.isMain && self.vid && pv.autoplay && !window.__noAutoplay && self.state === -1 && !self.calls.length) start();
    }, 20);
  }
  window.YT = { Player: Player, PlayerState: { UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 } };
  if (typeof window.onYouTubeIframeAPIReady === 'function') window.onYouTubeIframeAPIReady();
})();
