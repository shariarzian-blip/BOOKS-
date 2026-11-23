const { MARKS, mark } = require('./logos.cjs');
const fs = require('fs');
const out = '/home/user/BOOKS-/tv/logos/svg/';
MARKS.forEach((m, i) => { for (const st of ['sun', 'white']) fs.writeFileSync(`${out}logo-${i + 1}-${m[0]}-${st}.svg`, mark(m, 512, st).replace(/id="g\w+"/, 'id="g"').replace(/url\(#g\w+\)/g, 'url(#g)') + '\n'); });
console.log(fs.readdirSync(out).length, 'svg files');
