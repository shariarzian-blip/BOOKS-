// पोस्टर की सात पट्टियाँ: काँटा, फटी धरती, तारों तले बालक, नेत्र, एक ब्रह्मांड, गैलेक्सी, मल्टीवर्स।
(function () {
  var TAU = Math.PI * 2;
  function rng(seed) {
    return function () {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }
  function grad(g, x0, y0, x1, y1, stops) {
    var gr = g.createLinearGradient(x0, y0, x1, y1);
    stops.forEach(function (s, i) { gr.addColorStop(i / (stops.length - 1), s); });
    return gr;
  }
  function glow(g, x, y, r, inner, outer) {
    var gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, inner);
    gr.addColorStop(1, outer);
    g.fillStyle = gr;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  var art = {
    heat: function (g, w, h, r) {
      g.fillStyle = grad(g, 0, 0, 0, h, ['#FCF6DA', '#EAD388']);
      g.fillRect(0, 0, w, h);
      glow(g, w * 0.84, -h * 0.2, h * 1.7, 'rgba(255,255,255,.95)', 'rgba(255,255,255,0)');
      g.strokeStyle = '#2A1A10';
      g.lineCap = 'round';
      var x0 = -10, y0 = h * 0.82, x1 = w * 0.66, y1 = h * 0.24;
      g.lineWidth = 2.4;
      g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(w * 0.3, h * 0.74, x1, y1); g.stroke();
      g.lineWidth = 1.3;
      for (var i = 1; i < 15; i++) {
        var t = i / 15, u = 1 - t;
        var x = u * u * x0 + 2 * u * t * w * 0.3 + t * t * x1;
        var y = u * u * y0 + 2 * u * t * h * 0.74 + t * t * y1;
        var len = 9 + r() * 12, a = -1.2 + (i % 2 ? 1 : -1) * (0.9 + r() * 0.4);
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); g.stroke();
      }
    },
    earth: function (g, w, h, r) {
      g.fillStyle = grad(g, 0, 0, 0, h, ['#BC6B33', '#8A4320']);
      g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(48,20,8,.85)';
      g.lineWidth = 1.2;
      for (var i = 0; i < 16; i++) {
        var x = r() * w, y = r() * h * 0.3 - 6;
        g.beginPath(); g.moveTo(x, y);
        for (var k = 0; k < 9; k++) {
          x += (r() - 0.5) * 46; y += 6 + r() * 14;
          g.lineTo(x, y);
          if (r() < 0.3) { g.lineTo(x + (r() - 0.5) * 60, y + r() * 12); g.moveTo(x, y); }
        }
        g.stroke();
      }
    },
    night: function (g, w, h, r) {
      g.fillStyle = grad(g, 0, 0, 0, h, ['#0B1230', '#1E2B58']);
      g.fillRect(0, 0, w, h);
      for (var i = 0; i < 110; i++) {
        g.fillStyle = 'rgba(240,238,225,' + (0.3 + r() * 0.7) + ')';
        g.beginPath(); g.arc(r() * w, r() * h * 0.78, 0.4 + r() * 1.1, 0, TAU); g.fill();
      }
      g.fillStyle = '#05070F';
      g.fillRect(0, h * 0.8, w, h * 0.2);
      var bx = w * 0.17, by = h * 0.8;
      g.beginPath(); g.arc(bx + 1.5, by - 19, 3.6, 0, TAU); g.fill();
      g.beginPath(); g.moveTo(bx - 3.5, by); g.lineTo(bx - 2, by - 15); g.lineTo(bx + 4, by - 15); g.lineTo(bx + 4.5, by); g.fill();
    },
    eye: function (g, w, h, r) {
      g.fillStyle = '#08080F';
      g.fillRect(0, 0, w, h);
      var cx = w / 2, cy = h / 2, R = Math.max(h * 1.5, w * 0.34);
      for (var i = 0; i < 260; i++) {
        var a = r() * TAU, r0 = h * 0.3 + r() * h * 0.2, r1 = r0 + r() * (R - r0);
        g.strokeStyle = (i % 3 ? 'hsla(42,80%,62%,' : 'hsla(176,55%,58%,') + (0.12 + r() * 0.3) + ')';
        g.lineWidth = 0.6 + r() * 1.2;
        g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); g.stroke();
      }
      glow(g, cx, cy, h * 0.95, 'rgba(255,252,240,1)', 'rgba(255,240,200,0)');
      g.fillStyle = '#FFFDF4';
      g.beginPath(); g.arc(cx, cy, h * 0.36, 0, TAU); g.fill();
    },
    sun: function (g, w, h, r) {
      g.fillStyle = '#06122A';
      g.fillRect(0, 0, w, h);
      for (var i = 0; i < 60; i++) {
        g.fillStyle = 'rgba(230,236,250,' + (0.2 + r() * 0.5) + ')';
        g.fillRect(r() * w, r() * h, 1, 1);
      }
      var sx = w * 0.13, sy = h * 0.5;
      glow(g, sx, sy, h * 1.5, 'rgba(242,181,68,.6)', 'rgba(242,181,68,0)');
      g.fillStyle = '#FFF0BE';
      g.beginPath(); g.arc(sx, sy, h * 0.26, 0, TAU); g.fill();
      for (var k = 1; k <= 6; k++) {
        var rx = w * (0.1 + k * 0.125), ry = rx * 0.15;
        g.strokeStyle = 'rgba(240,236,220,.38)';
        g.lineWidth = 1;
        g.setLineDash([7, 3 + r() * 3]);
        g.beginPath(); g.ellipse(sx, sy, rx, ry, 0, 0, TAU); g.stroke();
        g.setLineDash([]);
        var a = -0.9 + r() * 1.8;
        g.fillStyle = k === 3 ? '#6FB1FF' : '#E9E2CC';
        g.beginPath(); g.arc(sx + Math.cos(a) * rx, sy + Math.sin(a) * ry, k === 3 ? 3.2 : 2, 0, TAU); g.fill();
      }
    },
    galaxy: function (g, w, h, r) {
      g.fillStyle = '#110925';
      g.fillRect(0, 0, w, h);
      var cx = w / 2, cy = h / 2;
      for (var i = 0; i < 2200; i++) {
        var t = Math.pow(r(), 0.7), th = t * 4.4 * Math.PI + (i % 2) * Math.PI;
        var rad = 10 + t * w * 0.5, j = (r() - 0.5) * (14 + t * 46);
        var x = cx + Math.cos(th) * rad + j, y = cy + (Math.sin(th) * rad + (r() - 0.5) * (14 + t * 46)) * 0.3;
        g.fillStyle = 'hsla(' + (38 + t * 210) + ',' + (70 - t * 20) + '%,' + (78 - t * 12) + '%,' + (0.25 + r() * 0.6) + ')';
        g.fillRect(x, y, 0.6 + r() * 1.2, 0.6 + r() * 1.2);
      }
      glow(g, cx, cy, h * 0.9, 'rgba(233,169,60,.55)', 'rgba(233,169,60,0)');
      g.strokeStyle = '#F6C56A';
      g.lineWidth = 3;
      g.beginPath(); g.ellipse(cx, cy, h * 0.44, h * 0.4, 0, 0, TAU); g.stroke();
      g.fillStyle = '#000';
      g.beginPath(); g.ellipse(cx, cy, h * 0.4, h * 0.36, 0, 0, TAU); g.fill();
    },
    multi: function (g, w, h, r) {
      g.fillStyle = '#05040A';
      g.fillRect(0, 0, w, h);
      for (var i = 0; i < 34; i++) {
        var x = r() * w * 0.92, y = r() * h, rad = 6 + r() * h * 0.46, hue = Math.round(r() * 17) * 21;
        var gr = g.createRadialGradient(x - rad * 0.3, y - rad * 0.3, 0, x, y, rad);
        gr.addColorStop(0, 'hsla(' + hue + ',75%,70%,.22)');
        gr.addColorStop(1, 'hsla(' + hue + ',75%,55%,.03)');
        g.fillStyle = gr;
        g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill();
        g.strokeStyle = 'hsla(' + hue + ',75%,74%,.6)';
        g.lineWidth = 1;
        g.stroke();
      }
      g.fillStyle = grad(g, w * 0.62, 0, w, 0, ['rgba(250,238,198,0)', 'rgba(250,238,198,.55)', 'rgba(255,252,240,1)']);
      g.fillRect(w * 0.62, 0, w * 0.38, h);
    }
  };
  function paint() {
    var list = document.querySelectorAll('.strip canvas');
    for (var i = 0; i < list.length; i++) {
      var c = list[i], w = c.clientWidth, h = c.clientHeight;
      if (!w || !h) continue;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
      var g = c.getContext('2d');
      g.scale(dpr, dpr);
      art[c.dataset.art](g, w, h, rng(i * 977 + 13));
    }
  }
  var timer;
  paint();
  window.addEventListener('resize', function () { clearTimeout(timer); timer = setTimeout(paint, 120); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(paint);

  // प्रॉम्प्ट कॉपी
  document.addEventListener('click', function (e) {
    var b = e.target.closest('.prompt button');
    if (!b) return;
    var pre = b.parentNode.querySelector('pre');
    function done(ok) {
      b.textContent = ok ? 'कॉपी हो गया' : 'चुन लिया, अब कॉपी करें';
      setTimeout(function () { b.textContent = 'कॉपी करें'; }, 1800);
    }
    function select() {
      var range = document.createRange();
      range.selectNodeContents(pre);
      var sel = window.getSelection();
      sel.removeAllRanges(); sel.addRange(range);
      done(false);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(pre.textContent).then(function () { done(true); }, select);
    } else select();
  });
})();
