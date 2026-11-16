// node posters.cjs  →  posters/*.jpg  (Magnific के चित्रों पर हिंदी शीर्षक)
// Playwright चाहिए: NODE_PATH=/opt/node-tools/node_modules node posters.cjs
const { chromium } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');
const art = (n) => 'file://' + path.join(__dirname, 'art-full', n.replace('.jpg', '.png'));
const head = `<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Mukta:wght@400;600&family=Rozha+One&family=Tiro+Devanagari+Hindi&display=swap">
<style>*{box-sizing:border-box;margin:0}body{background:#0A0B14;color:#F1ECDD;font-family:Mukta,sans-serif}
.d{font-family:'Rozha One',serif}.r{font-family:'Tiro Devanagari Hindi',serif}
.eye{font-weight:600;letter-spacing:.03em;word-spacing:.7em;font-size:25px}</style>`;

const strips = [[1, 'लौ', 'dark'], [2, 'कि'], [3, 'क'], null, [4, 'अ', 'core'], [5, 'लौ'], [6, 'कि'], [7, 'क']];
const series = `${head}<style>
#p{width:1024px;background:#0A0B14}
.top{height:96px;display:grid;place-items:center;color:#E3B552}
.s{position:relative;height:254px;margin-bottom:4px;background:center/cover}
.s span{position:absolute;inset:0;display:grid;place-items:center;font-size:186px;line-height:1;color:#F6F1E2;text-shadow:0 3px 30px rgba(0,0,0,.75),0 0 4px rgba(0,0,0,.5)}
.s.dark span{color:#0A0B14;text-shadow:0 0 30px rgba(255,255,255,.8)}
.s.core span{background:radial-gradient(closest-side,rgba(6,8,16,.84) 0 34%,rgba(6,8,16,0) 62%)}
.gap{height:22px}
.bot{padding:44px 40px 54px;text-align:center;display:grid;gap:14px}
.bot h1{font-size:74px;font-weight:400;line-height:1.25}
.bot p{font-size:25px;color:#A9A492}.bot .parts{font-size:27px;color:#F1ECDD}
</style><div id="p">
<div class="top eye">दो भागों की डॉक्यूमेंट्री</div>
${strips.map((s) => s ? `<div class="s ${s[2] || ''}" style="background-image:url(${art(`strip-${s[0]}.jpg`)})"><span class="d">${s[1]}</span></div>` : '<div class="gap"></div>').join('')}
<div class="bot"><h1 class="d">लौकिक · अलौकिक</h1><p class="parts r">भाग 1 · ऐसी दुनिया क्यों? &nbsp;&nbsp;|&nbsp;&nbsp; भाग 2 · बेहद</p><p>बापूजी दशरथभाई पटेल की लौकिक और अलौकिक कहानी</p></div>
</div>`;

const one = `${head}<style>
#p{position:relative;width:1074px;height:1600px;background:url(${art('keyart-1.jpg')}) center/cover;color:#2A160B;overflow:hidden}
.eye{position:absolute;top:96px;left:0;right:0;text-align:center;color:#5A2E14}
h1{position:absolute;top:176px;left:0;right:0;text-align:center;font-size:138px;font-weight:400;line-height:1.3;
 background:linear-gradient(rgba(40,14,4,.5),rgba(40,14,4,.5)),url(${art('strip-2.jpg')}) center/cover;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.tag{position:absolute;top:396px;left:0;right:0;text-align:center;font-size:42px;color:#4A2410}
.bot{position:absolute;left:0;right:0;bottom:44px;text-align:center;font-size:25px;color:#FBF3E1;text-shadow:0 2px 14px rgba(0,0,0,.85)}
</style><div id="p"><div class="eye">लौकिक · अलौकिक &nbsp;—&nbsp; भाग 1</div><h1 class="d">ऐसी दुनिया क्यों?</h1>
<p class="tag r">एक बालक, जिसने भगवान से सवाल किया</p>
<p class="bot">बापूजी दशरथभाई पटेल के जीवन पर आधारित · दो भागों की डॉक्यूमेंट्री</p></div>`;

const two = `${head}<style>
#p{position:relative;width:1074px;height:1600px;background:url(${art('keyart-2.jpg')}) center/cover;overflow:hidden}
.eye{position:absolute;top:1010px;left:0;right:0;text-align:center;color:#E3B552}
h1{position:absolute;top:1026px;left:0;right:0;text-align:center;font-size:176px;font-weight:400;line-height:1.25;letter-spacing:.06em;
 background:url(${art('strip-7.jpg')}) 97% 50%/300% auto;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;filter:drop-shadow(0 0 26px rgba(250,225,160,.35))}
.bot{position:absolute;left:0;right:0;bottom:22px;text-align:center;font-size:24px;color:#E9E3D0;text-shadow:0 2px 14px rgba(0,0,0,.95)}
</style><div id="p"><div class="eye">लौकिक · अलौकिक &nbsp;—&nbsp; भाग 2</div><h1 class="d">बेहद</h1>
<p class="bot">ब्रह्मांड के पार की यात्रा · बापूजी दशरथभाई पटेल के ज्ञान पर आधारित</p></div>`;

(async () => {
  const b = await chromium.launch();
  for (const [name, html] of [['laukik-alaukik', series], ['bhag-1-aisi-duniya-kyon', one], ['bhag-2-behad', two]]) {
    const tmp = path.join(__dirname, 'posters', `_${name}.html`);
    fs.writeFileSync(tmp, html);
    const p = await b.newPage({ viewport: { width: 1100, height: 1700 }, deviceScaleFactor: 2 });
    await p.goto('file://' + tmp, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(400);
    await p.locator('#p').screenshot({ path: path.join(__dirname, 'posters', `${name}.jpg`), type: 'jpeg', quality: 93 });
    await p.close();
    fs.unlinkSync(tmp);
  }
  await b.close();
})();
