#!/usr/bin/env node
// Builds the "ELE Activity Packets" collection for the Teacher Printables site:
//   ../printables/ele-packets/index.html
// A self-contained page in the Printables site's own style that lists every
// published ELE handout packet by grade level (professional learning by role),
// linking to the packets and facilitator guides on https://mglearn.github.io/eles/.
// Run after scripts/build.js. Usage: node scripts/build-printables-unit.js [outDir]
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.resolve(process.argv[2] || path.join(ROOT, '..', 'printables', 'ele-packets'));
const SITE = 'https://mglearn.github.io/eles/';
const readJson = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const std = readJson(path.join(ROOT, 'data/standards.json'));
const imgs = fs.existsSync(path.join(ROOT, 'data/images.json')) ? readJson(path.join(ROOT, 'data/images.json')) : {};
const acts = fs.readdirSync(path.join(ROOT, 'data/activities')).filter(f => f.endsWith('.json'))
  .map(f => readJson(path.join(ROOT, 'data/activities', f)))
  .filter(a => std[a.id])
  .sort((a, b) => a.title.localeCompare(b.title));

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const plain = s => String(s).replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1');
const STRAND = { genai: ['Gen AI', '#6b4a8e'], digcit: ['Digital citizenship', '#0e6b8a'], medialit: ['Media literacy', '#a8561a'] };
const ROLE = { teachers: 'Teachers', librarians: 'Librarians', coaches: 'Coaches', leaders: 'Leaders', faculty: 'Faculty', staff: 'Staff' };
const HTYPE = { cards: 'cut-apart cards', sort: 'card sort', worksheet: 'worksheet', table: 'organizer', checklist: 'checklist', reading: 'reading', rubric: 'rubric' };
const gradeText = g => g === 'Higher Ed' ? 'Higher Ed' : g.replace('-', '–');
const BAND = { 'K-2': 'k2', '3-5': '35', '6-8': '68', '9-12': '912', 'Higher Ed': 'he', 'K-12': 'pl' };
function photo(a) {
  const band = a.audience === 'pl' ? 'pl' : BAND[a.grades[0]];
  const name = [`act-${a.id}`, ...a.strands.map(s => `cat-${band}-${s}`)].find(n => imgs[n] && fs.existsSync(path.join(ROOT, 'assets/img/thumb', n + '.jpg')));
  return name ? `${SITE}assets/img/thumb/${name}.jpg` : null;
}

function card(a) {
  const [sLabel, color] = STRAND[a.strands[0]];
  const who = a.audience === 'pl' ? a.roles.map(r => ROLE[r]).join(', ') : 'Grades ' + a.grades.map(gradeText).join(', ');
  const types = [...new Set(a.handouts.map(h => HTYPE[h.type]))].join(', ');
  const img = photo(a);
  return `<article class="pk" style="--pa:${color}">
      ${img ? `<a class="pk-photo" href="${SITE}handouts/${a.id}.html"><img src="${img}" alt="" loading="lazy" width="720" height="480"></a>` : ''}
      <div class="pk-top"><span class="tag">${esc(sLabel)}</span><span class="grade">${esc(who)}</span></div>
      <div class="pk-body">
        <h3>${esc(a.title)}</h3>
        <p class="blurb">${esc(plain(a.tagline))}</p>
        <p class="facts">${a.minutes} minutes · ${a.handouts.length} handout${a.handouts.length === 1 ? '' : 's'} (${esc(types)}) · ${a.mode === 'unplugged' ? 'no devices needed' : a.mode}</p>
        <div class="pk-dl">
          <a class="pk-btn primary" href="${SITE}handouts/${a.id}.html">Print packet</a>
          <a class="pk-btn" href="${SITE}activities/${a.id}.html">Facilitator guide</a>
          <a class="pk-btn" href="${SITE}es/handouts/${a.id}.html" lang="es" hreflang="es">Español</a>
          <a class="pk-btn" href="${SITE}vi/handouts/${a.id}.html" lang="vi" hreflang="vi">Tiếng Việt</a>
        </div>
      </div>
    </article>`;
}

const BANDS = ['K-2', '3-5', '6-8', '9-12', 'Higher Ed'];
const student = acts.filter(a => a.audience === 'student');
const pl = acts.filter(a => a.audience === 'pl');
const PL_GROUPS = [['Teachers & librarians', ['teachers', 'librarians']], ['Instructional coaches', ['coaches']], ['School leaders, faculty & staff', ['leaders', 'faculty', 'staff']]];
const bandSecs = BANDS.map(g => {
  const list = student.filter(a => a.grades.includes(g));
  return list.length ? `<h2 class="pk-gradehead" id="grades-${BAND[g]}">${g === 'Higher Ed' ? 'Higher education' : 'Grades ' + gradeText(g)} <span class="pk-count">${list.length} packets</span></h2>
  <div class="sp-grid">${list.map(card).join('\n')}</div>` : '';
}).join('\n');
const plSecs = PL_GROUPS.map(([label, roles]) => {
  const list = pl.filter(a => roles.includes(a.roles[0]));
  return list.length ? `<h3 class="pk-subhead">${esc(label)} <span class="pk-count">${list.length} packets</span></h3>
  <div class="sp-grid">${list.map(card).join('\n')}</div>` : '';
}).join('\n');

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ELE Activity Packets · Teacher Printables</title>
  <meta name="description" content="Free print-ready handout packets for Gen AI literacy, digital citizenship, and media literacy, K–16 and professional learning, organized by grade level. From the TCEA ELE Activity Bank.">
  <meta property="og:title" content="ELE Activity Packets · Teacher Printables">
  <meta property="og:image" content="https://mglearn.github.io/printables/assets/thumb-ele-packets.jpg">
  <link rel="stylesheet" href="../assets/styles.css">
  <script src="/printables/licensing-footer.js" defer></script>
  <style>
    :root{--line:#c8d0dc;--muted:#5a6680;--panel:#f4f6f9;--navy:#0A3476}
    .sp-head{max-width:1100px;margin:0 auto;padding:22px 20px 4px}
    .sp-head .back-link{font-weight:800;text-decoration:none}
    .sp-head h1{margin:.5rem 0 .35rem;font-size:clamp(1.6rem,3.4vw,2.3rem);line-height:1.08}
    .sp-head p{margin:.2rem 0 .5rem;color:var(--muted);font-weight:600;max-width:74ch}
    .sp-more{display:flex;flex-wrap:wrap;gap:10px;margin:10px 0 4px}
    .sp-more a{font-weight:800;text-decoration:none;border:1.5px solid var(--navy);color:var(--navy);border-radius:8px;padding:7px 12px;background:#fff}
    .sp-more a.primary{background:var(--navy);color:#fff}
    .sp-jump{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0 0}
    .sp-jump a{font-size:.8rem;font-weight:800;text-decoration:none;border:1.5px solid var(--line);background:#fff;color:#172033;border-radius:100px;padding:5px 12px}
    section.sp{max-width:1100px;margin:0 auto;padding:8px 20px 24px}
    .sp-grid{display:grid;grid-template-columns:1fr;gap:16px}
    @media(min-width:660px){.sp-grid{grid-template-columns:repeat(2,1fr)}}
    @media(min-width:980px){.sp-grid{grid-template-columns:repeat(3,1fr)}}
    .pk{display:flex;flex-direction:column;background:#fff;border:1px solid var(--line);border-top:6px solid var(--pa,#0A3476);border-radius:12px;overflow:hidden;color:inherit;box-shadow:0 6px 18px rgba(20,32,51,.07)}
    .pk-photo{display:block;line-height:0;background:var(--panel);aspect-ratio:3/2;overflow:hidden}
    .pk-photo img{width:100%;height:100%;object-fit:cover;transition:transform .18s}
    .pk-photo:hover img{transform:scale(1.02)}
    .pk .pk-top{padding:12px 16px 0;display:flex;align-items:center;flex-wrap:wrap;gap:8px}
    .pk .tag{font-size:.66rem;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#fff;background:var(--pa);border-radius:100px;padding:3px 10px}
    .pk .grade{font-size:.72rem;font-weight:800;color:var(--muted)}
    .pk .pk-body{padding:6px 16px 16px;display:flex;flex-direction:column;gap:6px;flex:1}
    .pk h3{margin:.15rem 0 0;font-size:1.08rem;color:#172033}
    .pk .blurb{margin:0;font-size:.88rem;color:#2c3a52;flex:1}
    .pk .facts{margin:0;font-size:.76rem;font-weight:700;color:var(--muted)}
    .pk-dl{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
    .pk-btn{font-size:.76rem;font-weight:800;text-decoration:none;border:1.5px solid var(--pa);color:var(--pa);background:#fff;border-radius:100px;padding:4px 11px}
    .pk-btn.primary{background:var(--pa);color:#fff}
    .pk-gradehead{margin:26px 0 10px;font-size:1.25rem;color:#172033;scroll-margin-top:12px}
    .pk-subhead{margin:18px 0 10px;font-size:1.05rem;color:#172033}
    .pk-count{color:var(--muted);font-weight:700;font-size:.82rem;margin-left:4px}
    @media (prefers-reduced-motion:reduce){.pk-photo img{transition:none}}
  </style>
</head>
<body>
  <header class="sp-head">
    <a class="back-link" href="../index.html">← Teacher Printables</a>
    <h1>ELE Activity Packets</h1>
    <p>Print-ready handout packets for <strong>Gen AI literacy, digital citizenship, and media literacy</strong>, from kindergarten through college, plus professional learning for teachers, coaches, and leaders. Every packet runs with no devices: cut-apart cards, card sorts, worksheets, readings, and a facilitator key on the last page. Packets are also available in Spanish and Vietnamese.</p>
    <p>Each one comes from the <a href="${SITE}">TCEA ELE Activity Bank</a>, where you'll find the full facilitator guide, step-by-step directions, and alignment to the TCEA Essential Learning Expectations, TEKS, ELPS, and UDL.</p>
    <div class="sp-more">
      <a class="primary" href="${SITE}">Visit the ELE Activity Bank</a>
      <a href="${SITE}packets.html">Packets on the main site</a>
      <a href="${SITE}standards.html">Standards alignment</a>
    </div>
    <nav class="sp-jump" aria-label="Jump to a grade level">${BANDS.filter(g => student.some(a => a.grades.includes(g))).map(g => `<a href="#grades-${BAND[g]}">${gradeText(g)}</a>`).join('')}<a href="#pl">Professional learning</a></nav>
  </header>
  <main>
    <section class="sp" aria-label="Packets by grade level">
      ${bandSecs}
      <h2 class="pk-gradehead" id="pl">Professional learning <span class="pk-count">${pl.length} packets</span></h2>
      ${plSecs}
    </section>
  </main>
  <footer>
    <p class="built">Teacher Printables · ELE Activity Packets</p>
    <p>Activities by Miguel Guhlin, built on the TCEA Essential Learning Expectations. Free to use, print, and adapt (CC BY-SA 4.0) · <a href="${SITE}">ELE Activity Bank</a> · <a href="../licensing.html">Licensing &amp; provenance</a></p>
  </footer>
</body>
</html>
`;
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'index.html'), html);
console.log(`Wrote ${path.relative(process.cwd(), path.join(OUT, 'index.html'))}: ${student.length} student and ${pl.length} professional learning packets.`);
