// शुरुआती 30 सेकंड के अक्षर: पारदर्शी PNG, 1920x1080। कोई छाया, चमक या आउटलाइन नहीं।
const { chromium } = require('playwright');
const path = require('node:path'); const fs = require('node:fs');
const head = `<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Mukta:wght@300;400;600&family=Rozha+One&display=swap">
<style>*{margin:0;box-sizing:border-box}html,body{background:transparent}#p{position:relative;width:1920px;height:1080px;overflow:hidden;font-family:Mukta,sans-serif;color:#F4EFE4}
.lt{position:absolute;left:128px;bottom:112px;border-left:2px solid #E3B552;padding-left:26px}
.lt b{display:block;font-weight:600;font-size:46px;line-height:1.25}.lt span{display:block;font-weight:300;font-size:30px;line-height:1.4;color:#D9D4C7}
.c{position:absolute;left:0;right:0;text-align:center}</style>`;
const pages = {
  intro: `${head}<div id="p"><p class="c" style="top:500px;font-weight:300;font-size:44px;word-spacing:.3em">उत्तर गुजरात</p></div>`,
  loc: `${head}<div id="p"><div class="lt"><b>मेहसाणा ज़िला, गुजरात</b><span>मई की दोपहर · 45° सेल्सियस</span></div></div>`,
  name: `${head}<div id="p"><div class="lt"><b>बापूजी दशरथभाई पटेल</b><span>विश्व परिवर्तक ईश्वरीय विद्यालय, अहमदाबाद</span></div></div>`,
  title: `${head}<div id="p"><p class="c" style="top:352px;font:400 216px/1.25 'Rozha One',serif">ऐसी दुनिया क्यों?</p></div>`,
  part: `${head}<div id="p"><p class="c" style="top:262px;font-weight:600;font-size:30px;word-spacing:.6em;color:#E3B552">लौकिक · अलौकिक — भाग एक</p></div>`,
  tag: `${head}<div id="p"><p class="c" style="top:716px;font-weight:300;font-size:44px">एक बालक, जिसने भगवान से सवाल किया</p></div>`,
};
(async () => {
  const b = await chromium.launch();
  for (const [n, html] of Object.entries(pages)) {
    const f = path.join(__dirname, `_${n}.html`); fs.writeFileSync(f, html);
    const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
    await p.goto('file://' + f, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
    await p.locator('#p').screenshot({ path: path.join(__dirname, `t-${n}.png`), omitBackground: true });
    await p.close(); fs.unlinkSync(f);
  }
  await b.close();
})();
