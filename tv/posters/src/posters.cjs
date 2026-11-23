// Paramshanti TV launch posters (1:1). Builds each poster as HTML and photographs it at 2160×2160.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const HERE = __dirname, OUT = path.join(HERE, 'out');
const only = process.argv[2] || '';

const face = (fam, file, weight, range) => `@font-face{font-family:'${fam}';font-style:normal;font-weight:${weight};src:url(${file}) format('woff2');${range ? 'unicode-range:' + range : ''}}`;
const LATIN = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
const DEVA = 'U+0900-097F,U+1CD0-1CF9,U+200C-200D,U+20A8,U+20B9,U+20F0,U+25CC,U+A830-A839,U+A8E0-A8FF,U+11B00-11B09';
let FONTS = '';
for (const w of [400, 500, 600, 700, 800]) {
  FONTS += face('Poppins', `node_modules/@fontsource/poppins/files/poppins-latin-${w}-normal.woff2`, w, LATIN);
  FONTS += face('Poppins', `node_modules/@fontsource/poppins/files/poppins-devanagari-${w}-normal.woff2`, w, DEVA);
}
FONTS += face('JBMono', 'node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-800-normal.woff2', 800);

const CSS = `
${FONTS}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1080px;height:1080px;background:#000}
body{font-family:'Poppins','Noto Sans Devanagari','Noto Sans Gujarati','Noto Sans Telugu','Noto Sans Bengali','Noto Sans Kannada','Noto Sans Gurmukhi',sans-serif;-webkit-font-smoothing:antialiased;text-rendering:geometricPrecision}
.art{position:relative;width:1080px;height:1080px;overflow:hidden;--gold:#ffd54a;--gold2:#f2bf3f;--gold3:#c9992b;--ink:#241b06;--cream:#fff8e6;--red:#e5372b}
.dark{background:radial-gradient(90% 70% at 50% 58%,#3b2c0b 0%,#1b1408 46%,#0a0907 100%);color:var(--cream)}
.light{background:radial-gradient(80% 60% at 50% 42%,#fff3c9 0%,#fff9e9 52%,#fffdf6 100%);color:var(--ink)}
.rays{position:absolute;left:50%;top:58%;width:1900px;height:1900px;margin:-950px 0 0 -950px;border-radius:50%;
  background:repeating-conic-gradient(from 0deg,rgba(255,213,74,.085) 0 4deg,rgba(255,213,74,0) 4deg 12deg);-webkit-mask-image:radial-gradient(circle,#000 0,rgba(0,0,0,.55) 30%,transparent 62%);mask-image:radial-gradient(circle,#000 0,rgba(0,0,0,.55) 30%,transparent 62%)}
.light .rays{background:repeating-conic-gradient(from 0deg,rgba(201,153,43,.13) 0 4deg,rgba(201,153,43,0) 4deg 12deg)}
.grain{position:absolute;inset:0;opacity:.05;background-image:radial-gradient(#fff 0.6px,transparent 0.7px);background-size:5px 5px}
.light .grain{opacity:.06;background-image:radial-gradient(#8a6d1f 0.6px,transparent 0.7px)}
.frame{position:absolute;inset:22px;border-radius:34px;border:1.5px solid rgba(255,213,74,.28);pointer-events:none}
.light .frame{border-color:rgba(201,153,43,.4)}

/* brand */
.brand{display:flex;align-items:center;gap:14px;font-weight:700;font-size:30px;letter-spacing:-.01em;white-space:nowrap}
.brand .tile{width:54px;height:54px;border-radius:15px;background:linear-gradient(135deg,#ffe082,#f2bf3f);display:grid;place-items:center;color:#2b2006;box-shadow:0 10px 24px -10px rgba(242,191,63,.9)}
.brand b{font-weight:800;color:var(--gold)}
.light .brand b{color:#b07f12}
.top{position:absolute;left:64px;right:64px;top:58px;display:flex;align-items:center;justify-content:space-between}
.tag{display:inline-flex;align-items:center;gap:10px;height:46px;padding:0 20px;border-radius:999px;font-weight:700;font-size:19px;letter-spacing:.12em;text-transform:uppercase;white-space:nowrap}
.tag i{width:11px;height:11px;border-radius:50%;background:var(--red);box-shadow:0 0 0 5px rgba(229,55,43,.22)}
.dark .tag{background:rgba(255,255,255,.08);border:1.5px solid rgba(255,213,74,.5);color:var(--gold)}
.light .tag{background:#1b1408;color:var(--gold)}
.hi .tag{letter-spacing:.02em;font-size:22px}

/* type */
.kicker{font-weight:600;font-size:22px;letter-spacing:.34em;text-transform:uppercase;color:var(--gold)}
.light .kicker{color:#a97a14}
.hi .kicker{letter-spacing:.06em;font-size:26px}
h1{font-weight:800;letter-spacing:-.035em;line-height:1.02}
.hi h1{letter-spacing:-.01em;line-height:1.22}
.g{background:linear-gradient(180deg,#ffe58a 0%,#f2bf3f 55%,#d59f25 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
.light .g{background:linear-gradient(180deg,#d59f25 0%,#a8780f 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
.sub{font-weight:500;letter-spacing:-.01em}
.dark .sub{color:#f3e7c6}
.light .sub{color:#5a4613}
.chips{display:flex;flex-wrap:wrap;gap:12px}
.chip{height:50px;padding:0 22px;border-radius:999px;display:inline-flex;align-items:center;gap:10px;font-weight:600;font-size:22px;white-space:nowrap}
.dark .chip{background:rgba(255,255,255,.07);border:1.5px solid rgba(255,255,255,.2);color:#fff}
.light .chip{background:#fff;border:1.5px solid #ecd9a0;color:#4a390d;box-shadow:0 8px 18px -12px rgba(138,109,31,.6)}
.chip b{color:var(--gold);font-weight:800}
.light .chip b{color:#a8780f}
.cta{display:inline-flex;align-items:center;gap:18px;height:84px;padding:0 14px 0 14px;border-radius:999px;background:linear-gradient(135deg,#ffe082,#f2bf3f);color:#231a05;box-shadow:0 22px 44px -18px rgba(242,191,63,.85),inset 0 0 0 1.5px rgba(255,255,255,.55);white-space:nowrap}
.cta .go{height:58px;padding:0 24px 0 20px;border-radius:999px;background:#1b1408;color:var(--gold);display:inline-flex;align-items:center;gap:10px;font-weight:700;font-size:24px}
.cta .url{font-weight:700;font-size:30px;letter-spacing:-.015em;padding-right:22px}
.light .cta{background:#1b1408;color:#fff;box-shadow:0 22px 44px -20px rgba(27,20,8,.8)}
.light .cta .go{background:linear-gradient(135deg,#ffe082,#f2bf3f);color:#231a05}
.light .cta .url{color:#fff}
.mono{font-family:'JBMono','Noto Sans Mono',monospace;font-weight:800;font-variant-numeric:tabular-nums}

/* the television */
.tv{position:relative;border-radius:26px;padding:13px 13px 0;background:linear-gradient(180deg,#2a2a2e,#0b0b0d);box-shadow:0 0 0 1.5px #44444a,inset 0 1.5px 0 #6a6a72,0 50px 90px -30px rgba(0,0,0,.85),0 0 120px -10px rgba(255,200,60,.28)}
.light .tv{box-shadow:0 0 0 1.5px #3a3a40,inset 0 1.5px 0 #6a6a72,0 50px 80px -34px rgba(60,44,8,.7)}
.tv .scr{position:relative;aspect-ratio:16/9;border-radius:11px;overflow:hidden;background:#000}
.tv .scr .pic{position:absolute;inset:0;background-repeat:no-repeat;background-size:cover}
.tv .scr::after{content:'';position:absolute;inset:0;background:linear-gradient(115deg,rgba(255,255,255,.16) 0%,rgba(255,255,255,0) 28%);pointer-events:none}
.tv .osd{padding:16px 10px 4px;display:grid;gap:11px;color:#fff}
.tv .row1{display:flex;align-items:center;gap:13px}
.tv .num{font-size:42px;line-height:1;color:var(--gold);text-shadow:0 0 18px rgba(255,213,74,.5)}
.tv .lg{width:46px;height:46px;border-radius:50%;object-fit:cover;flex:none}
.tv .nm{display:flex;flex-direction:column;gap:5px;margin-right:auto}
.tv .nm strong{font-weight:600;font-size:23px;line-height:1.05}
.tv .nm span{display:flex;align-items:center;gap:7px;font-weight:600;font-size:12.5px;letter-spacing:.15em;color:var(--gold);text-transform:uppercase}
.tv .nm span::before{content:'';width:9px;height:9px;border-radius:50%;background:var(--red)}
.tv .clk{font-size:20px;color:#fff}
.tv .now{display:grid;grid-template-columns:62px minmax(0,1fr);gap:13px;align-items:start}
.tv .now>div{min-width:0}
.tv .osd{min-width:0}
.tv .now>i{font-style:normal;font-weight:700;font-size:12.5px;letter-spacing:.13em;text-align:center;padding:6px 0;border-radius:5px;background:var(--gold);color:#14110a;margin-top:3px}
.tv .now p{font-weight:500;font-size:21px;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tv .bar{height:5px;border-radius:5px;background:rgba(255,255,255,.2);margin-top:10px;overflow:hidden}
.tv .bar b{display:block;height:100%;background:var(--gold);border-radius:5px}
.tv .chin{height:30px;display:flex;align-items:center;justify-content:center;gap:11px;font-weight:600;font-size:9.5px;letter-spacing:.36em;color:#8d8d95}
.tv .chin i{width:7px;height:7px;border-radius:50%;background:#3ddc84;box-shadow:0 0 9px #3ddc84}
.stand{width:230px;height:17px;margin:0 auto;background:linear-gradient(180deg,#2a2a2e,#0e0e11);clip-path:polygon(16% 0,84% 0,100% 100%,0 100%)}
.live{position:absolute;left:18px;top:18px;display:inline-flex;align-items:center;gap:9px;height:40px;padding:0 15px;border-radius:9px;background:var(--red);color:#fff;font-weight:700;font-size:18px;letter-spacing:.14em}
.live i{width:10px;height:10px;border-radius:50%;background:#fff}

/* phone */
.phone{position:relative;width:404px;height:836px;border-radius:62px;padding:13px;background:linear-gradient(160deg,#3a3a40,#0d0d10);box-shadow:0 0 0 2px #55555c,0 60px 90px -40px rgba(40,28,4,.75),0 30px 50px -30px rgba(40,28,4,.5)}
.phone .in{position:relative;width:100%;height:100%;border-radius:50px;overflow:hidden;background:#0c0c0e}
.phone .in img{position:absolute;left:0;top:34px;width:100%;height:auto}
.phone .bar0{position:absolute;left:0;top:0;right:0;height:34px;background:#0c0c0e;z-index:2}
.phone .isl{position:absolute;z-index:3;left:50%;top:10px;width:104px;height:26px;margin-left:-52px;border-radius:20px;background:#000}
`;

const ICON_TV = '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="6.5" width="19" height="13" rx="2.6"/><path d="M8 2.5l4 4 4-4"/><path d="M10.2 10.2v5.6l4.8-2.8z" fill="currentColor" stroke="none"/></svg>';
const PLAY = '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg>';
const URLTXT = 'paramshantiblogs.org/tv';
const brand = lang => `<div class="brand"><span class="tile">${ICON_TV}</span><span>${lang === 'hi' ? 'परमशांति' : 'Paramshanti'} <b>TV</b></span></div>`;
const cta = (label) => `<div class="cta"><span class="go">${PLAY}${label}</span><span class="url">${URLTXT}</span></div>`;
const tv = (o) => `<div class="tvwrap" style="width:${o.w}px"><div class="tv"><div class="scr"><div class="pic" style="background-image:url(${o.img});background-size:${o.zoom ? o.zoom + '%' : 'cover'};background-position:${o.pos || '50% 30%'}"></div>${o.live ? '<span class="live"><i></i>LIVE</span>' : ''}</div>
  <div class="osd"><div class="row1"><b class="num mono">${o.num}</b><img class="lg" src="${o.logo}"><span class="nm"><strong>${o.name}</strong><span>${o.badge || 'On air · 24×7'}</span></span><span class="clk mono">${o.clock || '10:00 pm'}</span></div>
  <div class="now"><i>NOW</i><div><p>${o.now}</p><div class="bar"><b style="width:${o.pct || 42}%"></b></div></div></div></div>
  <div class="chin"><span>PARAMSHANTI TV</span><i></i></div></div><div class="stand"></div></div>`;

const T = {
  en: {
    launched: 'Just launched', intro: 'Introducing', title: 'Paramshanti', sub1: "Bapuji's wisdom. 24×7. Free.", c1: '<b>11</b> channels', c2: '<b>8</b> languages', c3: 'Live daily · <b>10 PM</b> IST', watch: 'Watch now',
    now1: 'Satsang with Bapuji Dashrathbhai Patel', facts: '11 channels  ·  8 languages  ·  Live daily at 10 PM IST',
    podK: 'Podcasts', podH: 'Bapuji <span class="g">&</span> Anant Patel', podSub: '29 podcast series. One tap away.', podNow: 'Podcast · Bapuji with Anant Patel',
    medK: 'Channel 09 · Meditation', medH: 'Meditate with <span class="g">Sakshi Patel</span>', medSub: 'Guided meditations and talks, any time of day.', medNow: 'Guided meditation with Sakshi Patel',
    trioH: 'Satsang. Podcast.<br>Meditation.', trioSub: 'All on one TV. Free, round the clock.',
    bapuji: 'Bapuji Dashrathbhai Patel', bapujiR: 'Behad ka Param Gyan', anant: 'Anant Patel', anantR: 'Spiritual Podcast', sakshi: 'Sakshi Patel', sakshiR: 'Guided Meditation',
    chH: '<span class="g">11</span> channels.<br><span class="g">8</span> languages.', chSub: 'One TV for the whole Paramshanti family.',
    phK: 'No app · No login · Free', phH: 'Your TV,<br>in your <span class="g">pocket.</span>', s1: 'Open <b>paramshantiblogs.org/tv</b>', s2: 'Tap <b>play</b>', s3: 'Change channels with <b>CH</b>',
    liveK: 'Every night', liveH: 'Live meditation', liveT: '10 PM <small>IST</small>', liveSub: 'Join live on Paramshanti TV', liveNames: 'Anant Patel · Sakshi Patel', liveNow: 'Live meditation',
  },
  hi: {
    launched: 'शुभारंभ', intro: 'प्रस्तुत है', title: 'परमशांति', sub1: 'बेहद का परम ज्ञान · 24×7 · निःशुल्क', c1: '<b>11</b> चैनल', c2: '<b>8</b> भाषाएँ', c3: 'रोज़ रात <b>10 बजे</b> लाइव', watch: 'अभी देखें',
    now1: 'Satsang with Bapuji Dashrathbhai Patel', facts: '11 चैनल  ·  8 भाषाएँ  ·  रोज़ रात 10 बजे लाइव',
    podK: 'पॉडकास्ट', podH: 'बापूजी <span class="g">और</span> अनंत पटेल', podSub: '29 पॉडकास्ट सीरीज़। बस एक टैप दूर।', podNow: 'Podcast · Bapuji with Anant Patel',
    medK: 'चैनल 09 · ध्यान', medH: '<span class="g">साक्षी पटेल</span> के साथ ध्यान', medSub: 'गाइडेड मेडिटेशन और सत्संग, जब चाहें।', medNow: 'Guided meditation with Sakshi Patel',
    trioH: 'सत्संग. पॉडकास्ट.<br>मेडिटेशन.', trioSub: 'सब एक ही टीवी पर। निःशुल्क, चौबीसों घंटे।',
    bapuji: 'बापूजी दशरथभाई पटेल', bapujiR: 'बेहद का परम ज्ञान', anant: 'अनंत पटेल', anantR: 'आध्यात्मिक पॉडकास्ट', sakshi: 'साक्षी पटेल', sakshiR: 'गाइडेड मेडिटेशन',
    chH: '<span class="g">11</span> चैनल.<br><span class="g">8</span> भाषाएँ.', chSub: 'पूरे परमशांति परिवार के लिए एक टीवी।',
    phK: 'न ऐप · न लॉगिन · निःशुल्क', phH: 'आपका टीवी,<br>आपकी <span class="g">जेब में।</span>', s1: '<b>paramshantiblogs.org/tv</b> खोलें', s2: '<b>प्ले</b> दबाएँ', s3: '<b>CH</b> से चैनल बदलें',
    liveK: 'हर रात', liveH: 'लाइव मेडिटेशन', liveT: 'रात 10 बजे <small>IST</small>', liveSub: 'परमशांति TV पर लाइव जुड़ें', liveNames: 'अनंत पटेल · साक्षी पटेल', liveNow: 'Live meditation',
  },
};
const CH = [['01', 'Hindi', 'हिंदी', 'hi'], ['02', 'English', 'English', 'en'], ['03', 'Gujarati', 'ગુજરાતી', 'gu'], ['04', 'Telugu', 'తెలుగు', 'te'], ['05', 'Bengali', 'বাংলা', 'bn'], ['06', 'Marathi', 'मराठी', 'mr'],
  ['07', 'Kannada', 'ಕನ್ನಡ', 'kn'], ['08', 'Punjabi', 'ਪੰਜਾਬੀ', 'pa'], ['09', 'Meditation', 'ध्यान', 'med'], ['10', 'Podcast', 'पॉडकास्ट', 'pod'], ['11', 'Maa ka Sandesh', 'माँ का संदेश', 'maa']];

const P = {
  // 1 — the launch: Bapuji on the television
  launch: (t, lang) => `<div class="art dark ${lang}"><div class="rays"></div><div class="grain"></div><div class="frame"></div>
    <div class="top">${brand(lang)}<span class="tag"><i></i>${t.launched}</span></div>
    <div style="position:absolute;left:0;right:0;top:${lang === 'hi' ? 132 : 142}px;text-align:center">
      <div class="kicker">${t.intro}</div>
      <h1 style="font-size:${lang === 'hi' ? 100 : 112}px;margin-top:${lang === 'hi' ? 0 : 10}px">${t.title} <span class="g">TV</span></h1>
      <div class="sub" style="font-size:${lang === 'hi' ? 33 : 35}px;margin-top:${lang === 'hi' ? 2 : 12}px">${t.sub1}</div>
      <div style="font-weight:600;font-size:${lang === 'hi' ? 23 : 21}px;letter-spacing:${lang === 'hi' ? '0' : '.02em'};color:#ffd54a;margin-top:${lang === 'hi' ? 8 : 14}px;white-space:pre">${t.facts}</div>
    </div>
    <div style="position:absolute;left:50%;top:438px;transform:translateX(-50%)">${tv({ w: 578, img: 'assets/bapuji_speaking_2.jpg', zoom: 134, pos: '96% 0%', num: '01', logo: 'assets/logo_hi.jpg', name: 'Hindi', now: t.now1, clock: '10:00 pm', pct: 38 })}</div>
    <div style="position:absolute;left:0;right:0;bottom:52px;display:flex;justify-content:center">${cta(t.watch)}</div>
  </div>`,

  // 2 — three voices
  trio: (t, lang) => {
    const card = (img, pos, num, name, role, big) => `<div style="width:${big ? 330 : 286}px;text-align:center;margin-top:${big ? 0 : 54}px">
      <div style="position:relative;border-radius:30px;padding:10px;background:linear-gradient(180deg,#2a2a2e,#0b0b0d);box-shadow:0 0 0 1.5px #3a3a40,0 40px 60px -34px rgba(60,44,8,.75)">
        <div style="position:relative;height:${big ? 392 : 338}px;border-radius:21px;overflow:hidden"><img src="${img}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:${pos}">
          <div style="position:absolute;left:0;right:0;bottom:0;height:42%;background:linear-gradient(to top,rgba(10,8,3,.82),rgba(10,8,3,0))"></div>
          <div style="position:absolute;left:14px;bottom:12px;display:flex;align-items:center;gap:9px"><b class="mono" style="font-size:${big ? 36 : 31}px;color:#ffd54a;text-shadow:0 0 14px rgba(255,213,74,.6)">${num}</b><span style="font-weight:600;font-size:12px;letter-spacing:.15em;color:#ffd54a;display:flex;align-items:center;gap:6px"><i style="width:8px;height:8px;border-radius:50%;background:#e5372b"></i>ON AIR</span></div>
        </div></div>
      <div style="font-weight:700;font-size:${big ? (lang === 'hi' ? 27 : 23.5) : 25}px;letter-spacing:${big && lang !== 'hi' ? '-.025em' : '-.01em'};margin-top:18px;line-height:1.25;color:#241b06;white-space:nowrap">${name}</div>
      <div style="font-weight:600;font-size:19px;color:#a8780f;margin-top:3px">${role}</div></div>`;
    return `<div class="art light ${lang}"><div class="rays" style="top:54%"></div><div class="grain"></div><div class="frame"></div>
    <div class="top">${brand(lang)}<span class="tag"><i></i>${t.launched}</span></div>
    <div style="position:absolute;left:64px;right:64px;top:${lang === 'hi' ? 140 : 150}px;text-align:center">
      <h1 style="font-size:${lang === 'hi' ? 66 : 70}px;color:#241b06">${t.trioH.replace('<br>', ' ')}</h1>
      <div class="sub" style="font-size:29px;margin-top:${lang === 'hi' ? 6 : 14}px">${t.trioSub}</div>
    </div>
    <div style="position:absolute;left:0;right:0;top:${lang === 'hi' ? 372 : 366}px;display:flex;justify-content:center;align-items:flex-start;gap:26px">
      ${card('assets/anant.jpg', '50% 18%', '10', t.anant, t.anantR)}${card('assets/bapuji_hero_toned.jpg', '50% 16%', '01', t.bapuji, t.bapujiR, true)}${card('assets/sakshi.jpg', '50% 16%', '09', t.sakshi, t.sakshiR)}
    </div>
    <div style="position:absolute;left:0;right:0;bottom:54px;display:flex;justify-content:center">${cta(t.watch)}</div></div>`;
  },

  // 3 — the channels
  channels: (t, lang) => `<div class="art dark ${lang}"><div class="rays" style="top:40%"></div><div class="grain"></div><div class="frame"></div>
    <div class="top">${brand(lang)}<span class="tag"><i></i>${t.launched}</span></div>
    <div style="position:absolute;left:64px;right:64px;top:${lang === 'hi' ? 138 : 150}px">
      <h1 style="font-size:${lang === 'hi' ? 72 : 78}px">${t.chH.replace('<br>', ' ')}</h1>
      <div class="sub" style="font-size:28px;margin-top:${lang === 'hi' ? 2 : 12}px">${t.chSub}</div>
    </div>
    <div style="position:absolute;left:64px;right:64px;top:${lang === 'hi' ? 330 : 338}px;display:grid;grid-template-columns:repeat(3,1fr);gap:14px">
      ${CH.map(c => `<div style="display:flex;align-items:center;gap:14px;height:126px;padding:0 18px;border-radius:24px;background:linear-gradient(180deg,rgba(255,255,255,.085),rgba(255,255,255,.035));border:1.5px solid rgba(255,213,74,.26)">
        <b class="mono" style="font-size:38px;color:#ffd54a;text-shadow:0 0 16px rgba(255,213,74,.45)">${c[0]}</b><img src="assets/logo_${c[3]}.jpg" style="width:58px;height:58px;border-radius:50%;object-fit:cover;flex:none;box-shadow:0 0 0 2px rgba(255,213,74,.5)">
        <span style="min-width:0"><span style="display:block;font-weight:600;font-size:${c[1].length > 11 ? 19 : 23}px;line-height:1.15;color:#fff;white-space:nowrap">${c[1]}</span><span style="display:block;font-weight:500;font-size:18px;color:#d9c98f;margin-top:3px;white-space:nowrap">${c[2] === c[1] ? 'Bapuji in English' : c[2]}</span></span></div>`).join('')}
      <div style="display:flex;align-items:center;justify-content:center;gap:12px;height:126px;border-radius:24px;background:linear-gradient(135deg,#ffe082,#f2bf3f);color:#231a05;font-weight:800;font-size:28px;box-shadow:0 20px 40px -18px rgba(242,191,63,.8)">${PLAY}${t.watch}</div>
    </div>
    <div style="position:absolute;left:0;right:0;bottom:60px;text-align:center;font-weight:700;font-size:38px;letter-spacing:-.015em;color:#fff">${URLTXT.replace('/tv', '<span class="g">/tv</span>')}</div></div>`,

  // 4 — on the phone
  phone: (t, lang) => `<div class="art light ${lang}"><div class="rays" style="left:74%;top:52%"></div><div class="grain"></div><div class="frame"></div>
    <div class="top">${brand(lang)}<span class="tag"><i></i>${t.launched}</span></div>
    <div style="position:absolute;left:64px;top:${lang === 'hi' ? 196 : 208}px;width:560px">
      <div class="kicker">${t.phK}</div>
      <h1 style="font-size:${lang === 'hi' ? 80 : 88}px;margin-top:${lang === 'hi' ? 8 : 20}px;color:#241b06">${t.phH}</h1>
      <div style="margin-top:${lang === 'hi' ? 30 : 44}px;display:grid;gap:20px">
        ${[t.s1, t.s2, t.s3].map((s, i) => `<div style="display:flex;align-items:center;gap:18px"><b style="flex:none;width:58px;height:58px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,#ffe082,#f2bf3f);color:#231a05;font-weight:800;font-size:27px;box-shadow:0 12px 22px -12px rgba(242,191,63,.9)">${i + 1}</b><span class="step" style="font-weight:500;font-size:${i === 0 ? 27 : 29}px;color:#3a2c08;letter-spacing:-.01em;white-space:nowrap">${s}</span></div>`).join('')}
      </div>
    </div>
    <div style="position:absolute;right:44px;top:158px;transform:rotate(4deg) scale(.93);transform-origin:50% 50%"><div class="phone"><div class="in"><div class="bar0"></div><div class="isl"></div><img src="assets/phone-screen.png"></div></div></div>
    <div style="position:absolute;left:64px;bottom:64px"><div class="cta" style="padding:0 14px"><span class="go" style="background:linear-gradient(135deg,#ffe082,#f2bf3f);color:#231a05;font-size:28px;height:60px;padding:0 30px 0 24px">${PLAY}${t.watch}</span></div></div>
    <style>.step b{font-weight:700;color:#8a6410}</style></div>`,

  // 5 — live meditation
  live: (t, lang) => `<div class="art dark ${lang}"><div class="rays" style="top:60%"></div><div class="grain"></div><div class="frame"></div>
    <div class="top">${brand(lang)}<span class="tag" style="background:#e5372b;border-color:#e5372b;color:#fff"><i style="background:#fff;box-shadow:0 0 0 5px rgba(255,255,255,.25)"></i>Live</span></div>
    <div style="position:absolute;left:0;right:0;top:${lang === 'hi' ? 136 : 146}px;text-align:center">
      <div class="kicker">${t.liveK}</div>
      <h1 style="font-size:${lang === 'hi' ? 80 : 86}px;margin-top:${lang === 'hi' ? 0 : 10}px">${t.liveH}</h1>
      <div class="mono g" style="font-family:'Poppins',sans-serif;font-weight:800;font-size:${lang === 'hi' ? 70 : 76}px;letter-spacing:-.03em;line-height:1.15;margin-top:${lang === 'hi' ? 0 : 4}px">${t.liveT}</div>
    </div>
    <div style="position:absolute;left:50%;top:${lang === 'hi' ? 432 : 420}px;transform:translateX(-50%)">${tv({ w: 610, img: 'assets/anant_sakshi.jpg', pos: '50% 40%', num: '01', logo: 'assets/logo_hi.jpg', name: 'Hindi', badge: 'Live now', now: t.liveNow + ' · ' + T.en.liveNames, clock: '10:00 pm', pct: 12, live: true })}</div>
    <div style="position:absolute;left:0;right:0;bottom:54px;display:flex;justify-content:center">${cta(t.watch)}</div>
    <style>.g small{font-size:.5em;font-weight:700;letter-spacing:.02em}</style></div>`,

  // 6 — podcasts: Bapuji with Anant Patel
  podcast: (t, lang) => `<div class="art light ${lang}"><div class="rays" style="top:62%"></div><div class="grain"></div><div class="frame"></div>
    <div class="top">${brand(lang)}<span class="tag"><i></i>${t.launched}</span></div>
    <div style="position:absolute;left:0;right:0;top:${lang === 'hi' ? 138 : 150}px;text-align:center">
      <div class="kicker">${t.podK}</div>
      <h1 style="font-size:${lang === 'hi' ? 76 : 82}px;margin-top:${lang === 'hi' ? 0 : 12}px;color:#241b06">${t.podH}</h1>
      <div class="sub" style="font-size:31px;margin-top:${lang === 'hi' ? 2 : 14}px">${t.podSub}</div>
    </div>
    <div style="position:absolute;left:50%;top:${lang === 'hi' ? 402 : 396}px;transform:translateX(-50%)">${tv({ w: 640, img: 'assets/podcast_blue.jpg', pos: '50% 50%', num: '01', logo: 'assets/logo_hi.jpg', name: 'Hindi', now: t.podNow, clock: '9:15 pm', pct: 56 })}</div>
    <div style="position:absolute;left:0;right:0;bottom:54px;display:flex;justify-content:center">${cta(t.watch)}</div></div>`,

  // 7 — meditation with Sakshi Patel
  meditation: (t, lang) => `<div class="art dark ${lang}"><div class="rays" style="top:62%"></div><div class="grain"></div><div class="frame"></div>
    <div class="top">${brand(lang)}<span class="tag"><i></i>${t.launched}</span></div>
    <div style="position:absolute;left:0;right:0;top:${lang === 'hi' ? 138 : 150}px;text-align:center">
      <div class="kicker">${t.medK}</div>
      <h1 style="font-size:${lang === 'hi' ? 68 : 68}px;margin-top:${lang === 'hi' ? 2 : 14}px">${t.medH}</h1>
      <div class="sub" style="font-size:30px;margin-top:${lang === 'hi' ? 4 : 16}px">${t.medSub}</div>
    </div>
    <div style="position:absolute;left:50%;top:${lang === 'hi' ? 398 : 392}px;transform:translateX(-50%)">${tv({ w: 640, img: 'assets/sakshi_mic.jpg', pos: '50% 40%', num: '09', logo: 'assets/logo_med.jpg', name: 'Meditation', now: t.medNow, clock: '6:30 am', pct: 24 })}</div>
    <div style="position:absolute;left:0;right:0;bottom:54px;display:flex;justify-content:center">${cta(t.watch)}</div></div>`,
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1080, height: 1080 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on('requestfailed', r => console.log('missing:', r.url().slice(-60)));
  let n = 0;
  for (const [name, fn] of Object.entries(P)) for (const lang of ['en', 'hi']) {
    if (only && !`${name}-${lang}`.includes(only)) continue;
    const html = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><base href="http://localhost:8766/"><style>${CSS}</style></head><body>${fn(T[lang], lang)}</body></html>`;
    fs.writeFileSync(path.join(HERE, `p-${name}-${lang}.html`), html);
    await page.goto(`http://localhost:8766/p-${name}-${lang}.html`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);
    const over = await page.evaluate(() => [...document.querySelectorAll('.art *')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && !e.closest('.rays') && !e.classList.contains('rays') && !e.closest('.phone') && (r.left < 20 || r.right > 1060 || r.top < 20 || r.bottom > 1060) && getComputedStyle(e).position !== 'absolute'; }).map(e => e.tagName + ':' + (e.textContent || '').trim().slice(0, 24)).slice(0, 4));
    const clash = await page.evaluate(() => {
      const R = e => e.getBoundingClientRect(), hit = (a, b) => !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
      const out = [];
      const cta = document.querySelector('.cta'), phone = document.querySelector('.phone'), tvw = document.querySelector('.tvwrap');
      if (cta && phone && hit(R(cta), R(phone))) out.push('button overlaps phone');
      if (cta && tvw && hit(R(cta), R(tvw))) out.push('button overlaps TV by ' + Math.round(R(tvw).bottom - R(cta).top) + 'px');
      document.querySelectorAll('.tv .now p, .tv .nm strong, .cta, .brand, .tag, h1, .sub, .kicker, .step').forEach(e => { const rg = document.createRange(); rg.selectNodeContents(e); const r = rg.getBoundingClientRect(); if (r.left < 40 || r.right > 1040 || r.top < 40 || r.bottom > 1040) out.push('outside safe area: ' + e.className + ' ' + e.textContent.trim().slice(0, 20)); if (e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== 'visible') out.push('cut off: ' + e.textContent.trim().slice(0, 30)); });
      const tv = document.querySelector('.tv'); if (tv) { const t = R(tv); tv.querySelectorAll('.osd *').forEach(e => { const r = R(e); if (r.right > t.right + 1) out.push('spills out of the TV: ' + e.textContent.trim().slice(0, 20)); }); }
      const h = document.querySelector('.top'), h1 = document.querySelector('h1, .kicker'); if (h && h1 && R(h1).top < R(h).bottom + 6) out.push('heading too close to the top bar');
      return [...new Set(out)];
    });
    if (clash.length) console.log(`  ${name}-${lang}:`, clash);
    const file = path.join(OUT, `paramshanti-tv-${name}-${lang}`);
    await page.screenshot({ path: file + '.png' });
    await page.screenshot({ path: file + '.jpg', type: 'jpeg', quality: 93 });
    n++;
  }
  await b.close();
  console.log('posters made:', n);
})();
