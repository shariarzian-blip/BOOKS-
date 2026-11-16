// node build.mjs  →  index.html (निर्माण-पुस्तिका) + bhag-1-nange-paon.md + bhag-2-behad.md
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { series, bible, films, notes } from './content.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const MOVES = {
  macro: ['मैक्रो · रैक-फ़ोकस', '<circle cx="60" cy="30" r="15"/><circle cx="60" cy="30" r="2.5" fill="currentColor"/><path d="M28 12v-4h8M92 12v-4h-8M28 48v4h8M92 48v4h-8"/>'],
  track: ['ट्रैकिंग', '<rect x="18" y="14" width="22" height="14"/><path d="M40 21h6"/><path d="M12 42h92"/><path d="M96 36l8 6-8 6"/><path d="M20 48v4M36 48v4M52 48v4M68 48v4M84 48v4"/>'],
  push: ['पुश-इन', '<rect x="14" y="6" width="92" height="48"/><rect x="46" y="22" width="28" height="16"/><path d="M14 6l32 16M106 6L74 22M14 54l32-16M106 54L74 38"/><path d="M26 30h12M33 25l6 5-6 5M94 30H82M87 25l-6 5 6 5"/>'],
  pull: ['पुल-बैक', '<rect x="14" y="6" width="92" height="48"/><rect x="46" y="22" width="28" height="16"/><path d="M14 6l32 16M106 6L74 22M14 54l32-16M106 54L74 38"/><path d="M38 30H24M30 25l-6 5 6 5M82 30h14M90 25l6 5-6 5"/>'],
  static: ['स्थिर', '<rect x="34" y="8" width="52" height="30"/><path d="M60 16v14M53 23h14"/><path d="M60 38v6M60 44l-14 10M60 44l14 10M60 44v10"/>'],
  crane: ['आरोहण', '<path d="M22 54h76"/><path d="M60 54V8"/><path d="M53 16l7-8 7 8"/><path d="M68 50h8M68 44h8M68 35h8M68 22h8"/>'],
  descend: ['अवरोहण', '<path d="M22 54h76"/><path d="M60 6v44"/><path d="M53 42l7 8 7-8"/><path d="M68 10h8M68 23h8M68 32h8M68 38h8"/>'],
};

const secs = (t) => t.split(':').reduce((a, b) => a * 60 + Number(b), 0);
const dur = (tc) => { const [a, b] = tc.split('–'); return secs(b) - secs(a); };

function voHtml(lines) {
  return lines.map((l) => {
    if (l.startsWith('~ ')) return `<p class="cue">${esc(l.slice(2))}</p>`;
    if (l.startsWith('» ')) { const [who, text] = l.slice(2).split(' :: '); return `<p class="say"><span>${esc(who)}</span>${esc(text)}</p>`; }
    return `<p>${esc(l)}</p>`;
  }).join('\n');
}
function voMd(lines) {
  return lines.map((l) => {
    if (l.startsWith('~ ')) return `> *(${l.slice(2)})*`;
    if (l.startsWith('» ')) { const [who, text] = l.slice(2).split(' :: '); return `> **${who}:** “${text}”`; }
    return `> ${l}`;
  }).join('\n>\n');
}

function sceneHtml(f, s) {
  const [label, glyph] = MOVES[s.move];
  const inner = s.still
    ? `<img src="art/${s.still}.jpg" alt="${esc(s.title)}: मुख्य शॉट का संकल्प-चित्र" loading="lazy">`
    : `${s.dot ? '<i class="pt"></i>' : ''}<svg viewBox="0 0 120 60" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="${label}">${glyph}</svg>`;
  const spectrum = s.spectrum ? `<div class="spectrum" aria-hidden="true">${Array.from({ length: s.spectrum }, (_, i) => `<i style="--h:hsl(${i * 21} 72% 62%)"></i>`).join('')}</div>` : '';
  const supers = s.supers ? `<div class="supers"><b>स्क्रीन पर</b>${s.supers.map((x) => `<span>${esc(x)}</span>`).join('')}</div>` : '';
  return `<article class="scene" id="${f.id}-${s.n}" style="--bg:${s.bg};--ink:${s.ink};--acc:${s.acc}">
<div class="w">
<div class="slate">
<p class="no"><b>दृश्य ${s.n}</b><span>${s.tc}</span></p>
<h3>${esc(s.title)}</h3>
<figure class="frame${s.still ? ' has-still' : ''}">${inner}</figure>
<p class="cap"><b>${esc(s.arLabel)}</b> · ${label}<br>${esc(s.lens)}</p>
${spectrum}
</div>
<div class="body">
<div class="vo">
${voHtml(s.vo)}
</div>
${supers}
<dl class="dir">
<div><dt>दृश्य</dt><dd>${esc(s.scene)}</dd></div>
<div><dt>कैमरा</dt><dd>${esc(s.camera)}</dd></div>
<div><dt>VFX · After Effects</dt><dd>${esc(s.vfx)}</dd></div>
<div><dt>ध्वनि</dt><dd>${esc(s.sound)}</dd></div>
</dl>
<details class="prompt"><summary>मुख्य शॉट का AI प्रॉम्प्ट (अंग्रेज़ी में)</summary><pre>${esc(s.prompt)}</pre><button type="button">कॉपी करें</button></details>
</div>
</div>
</article>`;
}

function filmHtml(f, i) {
  return `<section class="film f${i + 1}" id="${f.id}">
<div class="film-head"><div class="w">
<div class="fh-text">
<p class="eyebrow">${esc(f.part)}</p>
<h2>${esc(f.title)}</h2>
<p class="tag">${esc(f.tagline)}</p>
<p class="meta"><span><b>अवधि</b> ${esc(f.runtime)}</span><span><b>फ़्रेम</b> ${esc(f.frame)}</span><span><b>स्वर</b> ${esc(f.voice)}</span></p>
</div>
<img class="kart" src="art/keyart-${i + 1}.jpg" alt="${esc(f.title)} का पोस्टर-चित्र" width="537" height="800">
<div class="script" aria-label="रंग-पटकथा">${f.scenes.map((s) => `<a href="#${f.id}-${s.n}" style="--bg:${s.bg};--ink:${s.ink};--d:${dur(s.tc)}" title="${esc(s.title)} · ${s.tc}">${s.n}</a>`).join('')}</div>
<p class="script-cap">रंग-पटकथा: हर खंड एक दृश्य है, चौड़ाई उसकी अवधि के अनुपात में। किसी खंड पर जाएँ तो वही दृश्य खुलेगा।</p>
</div></div>
${f.scenes.map((s) => sceneHtml(f, s)).join('\n')}
</section>`;
}

const strips = [[1, 'लौ', 'dark'], [2, 'कि'], [3, 'क'], null, [4, 'अ', 'core'], [5, 'लौ'], [6, 'कि'], [7, 'क']];

const html = `<title>लौकिक · अलौकिक</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Mukta:wght@400;600&family=Rozha+One&family=Tiro+Devanagari+Hindi&display=swap">
<style>
${readFileSync(join(here, 'page.css'), 'utf8')}</style>
<nav class="bar"><div class="w"><b>${esc(series.title)}</b><a href="#bhasha">फ़िल्म की भाषा</a><a href="#bhag-1">भाग 1</a><a href="#bhag-2">भाग 2</a><a href="#srot">स्रोत</a></div></nav>
<header class="hero"><div class="w">
<div class="poster" role="img" aria-label="सात पट्टियों का पोस्टर: बबूल का काँटा, फटी धरती पर नंगे पाँव, तारों तले बालक, नेत्र, सूर्य और कक्षाएँ, गैलेक्सी का केंद्र, मल्टीवर्स">
${strips.map((s) => s ? `<div class="strip${s[2] ? ' ' + s[2] : ''}"><img src="art/strip-${s[0]}.jpg" alt=""><span>${s[1]}</span></div>` : '<div class="gap"></div>').join('\n')}
</div>
<div class="intro">
<p class="eyebrow">${esc(series.kicker)}</p>
<h1>${esc(series.title)}</h1>
<p class="log">${esc(series.logline)}</p>
<p class="subj">${esc(series.subject)}</p>
<div class="parts">
${films.map((f) => `<a href="#${f.id}"><span class="eyebrow">${esc(f.part)}</span><strong>${esc(f.title)}</strong><small>${esc(f.tagline)}<br>${esc(f.runtime)} · ${esc(f.frame)}</small></a>`).join('\n')}
</div>
</div>
</div></header>

<section class="bible" id="bhasha"><div class="w">
<h2>फ़िल्म की भाषा</h2>
<div class="idea">
<div class="txt"><h3>एक विचार: हद से बेहद</h3>${bible.idea.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
<div class="ratios">
<div class="ratio"><i style="--y:26%"></i><span><b>भाग 1</b>क्षितिज ऊपर: ज़मीन ज़्यादा, आसमान कम</span></div>
<div class="ratio"><i style="--y:82%"></i><span><b>1997</b>क्षितिज उतरता है, आसमान खुलता है</span></div>
<div class="ratio"><i class="none"></i><span><b>भाग 2</b>क्षितिज नहीं: बेहद</span></div>
</div>
</div>
<div class="rules">
${Object.values(bible.rules).map((r) => `<div><h3>${esc(r.name)}</h3><ol>${r.items.map((x) => `<li><span>${esc(x)}</span></li>`).join('')}</ol></div>`).join('\n')}
</div>
<div><h3>बार-बार लौटने वाली छवियाँ</h3><dl class="motifs">${bible.motifs.map(([a, b]) => `<div><dt>${esc(a)}</dt><dd>${esc(b)}</dd></div>`).join('')}</dl></div>
<div><h3>चेहरे का नियम</h3><p class="face">${esc(bible.face)}</p></div>
<div><h3>कैमरा-गति: उपकरण</h3><dl class="motifs">${bible.rig.gear.map(([a, b]) => `<div><dt>${esc(a)}</dt><dd>${esc(b)}</dd></div>`).join('')}</dl></div>
<div class="rules one"><div><h3>कैमरा-गति: सात नियम</h3><ol>${bible.rig.laws.map((x) => `<li><span>${esc(x)}</span></li>`).join('')}</ol></div></div>
<div><h3>After Effects की पूरी पाइपलाइन</h3><div class="scroll"><table><thead><tr><th>चरण</th><th>औज़ार</th><th>किसलिए</th></tr></thead><tbody>${bible.ae.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>
<div><h3>हस्ताक्षर शॉट और उनकी विधि</h3><div class="scroll"><table><thead><tr><th>तकनीक</th><th>कहाँ</th><th>कैसे</th></tr></thead><tbody>${bible.vfx.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>
<div><h3>स्थान: जो जहाँ हुआ, वहीं जैसा दिखे</h3><div class="scroll"><table><thead><tr><th>जगह</th><th>कहाँ, कब</th><th>पर्दे पर क्या सही होना चाहिए</th></tr></thead><tbody>${bible.places.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div><ul class="sound gapt">${bible.placeRules.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
<div class="rules">${[bible.score.one, bible.score.two].map(([a, b]) => `<div><h3>${esc(a)}</h3><p class="para">${esc(b)}</p></div>`).join('')}</div>
<div><h3>तीन संगीत-सूत्र</h3><dl class="motifs">${bible.score.themes.map(([a, b]) => `<div><dt>${esc(a)}</dt><dd>${esc(b)}</dd></div>`).join('')}</dl></div>
<div><h3>ध्वनि-प्रभाव</h3><ul class="sound">${bible.score.sfx.map((x) => `<li>${esc(x)}</li>`).join('')}</ul><p class="spec gapt">${esc(bible.score.mix)}</p></div>
<div><h3>स्वर और कथन</h3><ul class="sound">${bible.sound.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
<div><h3>डिलीवरी</h3><p class="spec">${esc(bible.delivery)}</p></div>
</div></section>

${films.map(filmHtml).join('\n\n')}

<section class="notes" id="srot"><div class="w">
<h2>स्रोत और सच्चाई</h2>
<div><h3>यह स्क्रिप्ट किन पर आधारित है</h3><ul>${notes.sources.map(([a, b]) => `<li><b>${esc(a)}</b> ${esc(b)}</li>`).join('')}</ul></div>
<div><h3>कथन की नीति</h3><ul>${notes.policy.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
<div><h3>दोनों पुस्तकों में जहाँ अंतर है</h3><ul>${notes.gaps.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
<div><h3>जो जान-बूझकर नहीं लिया</h3><ul>${notes.left.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
<div><h3>नवीनतम ज्ञान से मिलान</h3><ul>${notes.latest.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
<div><h3>आर्काइव फ़ुटेज के लिए (पुस्तक में दिए वीडियो)</h3><ul>${notes.archive.map(([a, b]) => `<li><b>${esc(a)}</b> <a href="${b}">${b.replace('https://', '')}</a></li>`).join('')}</ul></div>
</div></section>
<script>
${readFileSync(join(here, 'page.js'), 'utf8')}</script>
`;
writeFileSync(join(here, 'index.html'), html);

const files = ['bhag-1-nange-paon.md', 'bhag-2-behad.md'];
films.forEach((f, i) => {
  const md = `# ${f.title}

**${f.part}** · ${f.tagline}

| | |
|---|---|
| सीरीज़ | ${series.title} |
| अवधि | ${f.runtime} |
| फ़्रेम | ${f.frame} |
| स्वर | ${f.voice} |

कथन की पंक्तियाँ उद्धरण में हैं। *(कोष्ठक)* में निर्देश और विराम हैं। **नाम:** के साथ दूसरी आवाज़ें हैं।

${f.scenes.map((s) => `---

## दृश्य ${s.n} · ${s.title} · ${s.tc}

**फ़्रेम:** ${s.arLabel} · **कैमरा-गति:** ${MOVES[s.move][0]} · **लेंस:** ${s.lens}

${voMd(s.vo)}
${s.supers ? `\n**स्क्रीन पर:** ${s.supers.join(' / ')}\n` : ''}
**दृश्य.** ${s.scene}

**कैमरा.** ${s.camera}

**VFX · After Effects.** ${s.vfx}

**ध्वनि.** ${s.sound}

**AI प्रॉम्प्ट (मुख्य शॉट).**

\`\`\`
${s.prompt}
\`\`\`
`).join('\n')}`;
  writeFileSync(join(here, files[i]), md);
});

const li = (a) => a.map((x) => `- ${x}`).join('\n');
const tbl = (h, rows) => `| ${h.join(' | ')} |\n|${h.map(() => '---').join('|')}|\n${rows.map((r) => `| ${r.join(' | ')} |`).join('\n')}`;
writeFileSync(join(here, 'film-ki-bhasha.md'), `# ${series.title}: फ़िल्म की भाषा

${series.logline}

## एक विचार: हद से बेहद

${bible.idea.join('\n\n')}

## ${bible.rules.one.name}

${li(bible.rules.one.items)}

## ${bible.rules.two.name}

${li(bible.rules.two.items)}

## बार-बार लौटने वाली छवियाँ

${li(bible.motifs.map(([a, b]) => `**${a}.** ${b}`))}

## चेहरे का नियम

${bible.face}

## कैमरा-गति: उपकरण

${li(bible.rig.gear.map(([a, b]) => `**${a}.** ${b}`))}

## कैमरा-गति: सात नियम

${li(bible.rig.laws)}

## After Effects की पूरी पाइपलाइन

${tbl(['चरण', 'औज़ार', 'किसलिए'], bible.ae)}

## हस्ताक्षर शॉट और उनकी विधि

${tbl(['तकनीक', 'कहाँ', 'कैसे'], bible.vfx)}

## स्थान

${tbl(['जगह', 'कहाँ, कब', 'पर्दे पर क्या सही होना चाहिए'], bible.places)}

${li(bible.placeRules)}

## संगीत

**${bible.score.one[0]}.** ${bible.score.one[1]}

**${bible.score.two[0]}.** ${bible.score.two[1]}

${li(bible.score.themes.map(([a, b]) => `**${a}.** ${b}`))}

## ध्वनि-प्रभाव

${li(bible.score.sfx)}

${bible.score.mix}

## स्वर और कथन

${li(bible.sound)}

## डिलीवरी

${bible.delivery}
`);

const words = (f) => f.scenes.flatMap((s) => s.vo).filter((l) => !l.startsWith('~ ')).join(' ').split(/\s+/).length;
console.log(films.map((f) => `${f.title}: ${f.scenes.length} दृश्य, कथन ${words(f)} शब्द`).join('\n'));
