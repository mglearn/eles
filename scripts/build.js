#!/usr/bin/env node
// Builds the static site from data/eles.json + data/activities/*.json.
//   index.html              catalog + ELE matrix
//   framework.html          ELE browser with coverage
//   guide.html              how to use the bank (learning-first principles)
//   activities/<id>.html    facilitator guide
//   handouts/<id>.html      print-ready handout packet + facilitator key
//   assets/catalog.js       catalog data for filtering
// Usage: node scripts/build.js
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ELES = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/eles.json'), 'utf8'));
const ACT_DIR = path.join(ROOT, 'data/activities');
const acts = fs.readdirSync(ACT_DIR).filter(f => f.endsWith('.json'))
  .map(f => JSON.parse(fs.readFileSync(path.join(ACT_DIR, f), 'utf8')))
  .sort((a, b) => a.title.localeCompare(b.title));

// ---------- lookups ----------
const IND = {};   // id -> {id,text,area,role}
const AREA = {};  // "T2.0" -> area
for (const r of ELES.roles) for (const a of r.areas) {
  AREA[a.id] = { ...a, role: r };
  for (const i of a.indicators) IND[i.id] = { ...i, area: a, role: r };
}
const areaOf = id => id.replace(/\.\d$/, '.0');
const STRAND = {
  genai: { name: 'Generative AI literacy', short: 'Gen AI', desc: 'How models predict, why they are confidently wrong, bias, prompting, disclosure, and keeping human judgment in the loop.' },
  digcit: { name: 'Digital citizenship', short: 'Digital citizenship', desc: 'Privacy, digital footprint, safety and security, respectful communication, credit and copyright, balance, and access.' },
  medialit: { name: 'Media literacy', short: 'Media literacy', desc: 'Lateral reading and SIFT, purpose and bias, manipulated and synthetic media, feeds and algorithms, and making media responsibly.' },
};
const MODE = {
  unplugged: { name: 'Unplugged', desc: 'Runs on paper and conversation. No devices needed.' },
  digital: { name: 'Digital', desc: 'Built around devices, with a paper fallback.' },
  hybrid: { name: 'Hybrid', desc: 'Paper and screens each do a job.' },
};
const ROLE = { teachers: 'Teachers', librarians: 'Librarians', coaches: 'Coaches', leaders: 'Leaders', faculty: 'Faculty', staff: 'Staff' };
const GRADES = ['K-2', '3-5', '6-8', '9-12', 'K-12', 'Higher Ed'];
const gradeLabel = g => g.replace('-', '–');

// ---------- photos (optional; see scripts/import_images.py) ----------
const IMG_MANIFEST = fs.existsSync(path.join(ROOT, 'data/images.json')) ? JSON.parse(fs.readFileSync(path.join(ROOT, 'data/images.json'), 'utf8')) : {};
const hasImg = n => IMG_MANIFEST[n] && fs.existsSync(path.join(ROOT, 'assets/img', n + '.jpg'));
const BAND = { 'K-2': 'k2', '3-5': '35', '6-8': '68', '9-12': '912', 'Higher Ed': 'he', 'K-12': 'pl' };
function imgFor(a) {
  const band = a.audience === 'pl' ? 'pl' : BAND[a.grades[0]];
  return [`act-${a.id}`, ...a.strands.map(st => `cat-${band}-${st}`)].find(hasImg) || null;
}
function pic(name, rel, { cls = 'photo', thumb = false, lazy = true, decorative = false } = {}) {
  if (!name) return '';
  const m = IMG_MANIFEST[name];
  const src = `${rel}assets/img/${thumb ? 'thumb/' : ''}${name}.jpg`;
  const w = thumb ? 720 : m.w, h = thumb ? Math.round(720 * m.h / m.w) : m.h;
  return `<img class="${cls}" src="${src}" width="${w}" height="${h}" alt="${decorative ? '' : esc(m.alt)}"${lazy ? ' loading="lazy" decoding="async"' : ''}>`;
}
const USES_PHOTOS = Object.keys(IMG_MANIFEST).some(hasImg);

// ---------- helpers ----------
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const md = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*\w])\*(?!\s)(.+?)\*(?!\w)/g, '$1<em>$2</em>');
const write = (rel, html) => { const p = path.join(ROOT, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, html); };
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const audienceLabel = a => a.audience === 'pl' ? 'Professional learning' : 'Student learning';
const whoLabel = a => a.audience === 'pl'
  ? (a.roles || []).map(r => ROLE[r]).join(', ')
  : a.grades.map(g => g === 'Higher Ed' ? 'Higher Ed' : 'Grades ' + gradeLabel(g)).join(', ');

const ICON = {
  unplugged: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l4 4v14H6z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M15 3v4h4M9 12h7M9 16h5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  digital: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M8 20h8M12 16v4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  hybrid: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h8l3 3v11H3z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><rect x="13" y="3" width="8" height="10" rx="1.2" fill="var(--paper,#fff)" stroke="currentColor" stroke-width="1.7"/></svg>',
  clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  print: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
};

const FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap" rel="stylesheet">';

function page({ title, desc, rel = '', body, bodyClass = '', scripts = '' }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
${hasImg('og-share') ? '<meta property="og:image" content="https://mglearn.github.io/eles/assets/img/og-share.jpg"><meta name="twitter:card" content="summary_large_image">' : ''}
${FONTS}
<link rel="stylesheet" href="${rel}assets/site.css">
<link rel="icon" href="${rel}assets/favicon.svg" type="image/svg+xml">
</head>
<body class="${bodyClass}">
<a class="skip" href="#main">Skip to content</a>
<header class="topbar">
  <a class="brand" href="${rel}index.html"><span class="brand-mark" aria-hidden="true">ELE</span><span>Activity Bank</span></a>
  <nav aria-label="Main">
    <a href="${rel}index.html#catalog">Activities</a>
    <a href="${rel}framework.html">The ELEs</a>
    <a href="${rel}guide.html">Facilitator guide</a>
  </nav>
</header>
${body}
<footer class="site-foot">
  <div>
    <p><strong>TCEA Essential Learning Expectations Activity Bank.</strong> Professional learning and K–16 student activities for Gen AI literacy, digital citizenship, and media literacy, on paper or on screen.</p>
    <p>Activities by Miguel Guhlin (<a href="https://mglearn.github.io/">mglearn</a>), built on the <a href="https://tinyurl.com/tceaeles1">TCEA Essential Learning Expectations</a> (CC BY-SA 2024). Shared under <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>: copy, adapt, and reuse with credit. No logins, no tracking.</p>
    ${USES_PHOTOS ? '<p class="ai-note">Photos on this site are AI-generated illustrations of fictional people, not real students or staff.</p>' : ''}
  </div>
  <nav aria-label="Related">
    <a href="https://mglearn.github.io/tcea/eles/">ELEs Alignment Assistant</a>
    <a href="https://mglearn.github.io/activities/">Learning Activities Hub</a>
    <a href="https://mglearn.github.io/activities/digcit/">Digital Citizenship Breakouts</a>
    <a href="https://mglearn.github.io/activities/genailit/">Gen AI Literacy Breakouts</a>
  </nav>
</footer>
${scripts}
</body>
</html>`;
}

const strandChips = a => a.strands.map(s => `<span class="strand s-${s}">${STRAND[s].short}</span>`).join('');
const eleChips = (ids, rel) => ids.map(id => `<a class="ele" href="${rel}framework.html#${id}" title="${esc(IND[id].role.short + ' ' + id.replace(/^[A-Z]+/, '') + ': ' + IND[id].text)}">${id}</a>`).join('');

// ---------- activity page ----------
function activityPage(a) {
  const rel = '../';
  const indicators = a.eles.map(id => {
    const i = IND[id];
    return `<li><a class="ele" href="${rel}framework.html#${id}">${id}</a><div><span class="ind-area">${esc(i.role.short)} · ${esc(i.area.title)}</span>${esc(i.text)}</div></li>`;
  }).join('');
  let t = 0;
  const steps = a.steps.map((s, n) => {
    const start = t; t += s.minutes;
    return `<li class="step">
      <div class="step-rail"><span class="step-n">${n + 1}</span><span class="step-time">${start}–${t} min</span></div>
      <div class="step-body">
        <p class="step-phase">${esc(s.phase)}</p>
        <h3>${esc(s.title)}</h3>
        <p>${md(s.body)}</p>
        ${s.note ? `<p class="step-note"><span>Facilitator note</span>${md(s.note)}</p>` : ''}
      </div></li>`;
  }).join('');
  const list = arr => `<ul>${arr.map(x => `<li>${md(x)}</li>`).join('')}</ul>`;
  const handoutList = a.handouts.map(h => `<li><span class="hl">${esc(h.id)}</span> ${esc(h.title)} <span class="muted">(${htype(h.type)})</span></li>`).join('');
  const related = acts.filter(b => b.id !== a.id)
    .map(b => ({ b, score: b.eles.filter(x => a.eles.includes(x)).length * 3 + b.eles.filter(x => a.eles.map(areaOf).includes(areaOf(x))).length + b.strands.filter(x => a.strands.includes(x)).length + (b.audience === a.audience ? 1 : 0) }))
    .sort((x, y) => y.score - x.score).slice(0, 3).map(x => x.b);

  const body = `
<main id="main" class="act">
  <div class="act-head${imgFor(a) ? ' has-photo' : ''}">
    ${imgFor(a) ? `<figure class="act-photo">${pic(imgFor(a), rel, { lazy: false })}</figure>` : ''}
    <div class="act-head-text">
    <p class="crumbs"><a href="${rel}index.html#catalog">All activities</a> <span aria-hidden="true">/</span> ${audienceLabel(a)}</p>
    <h1>${esc(a.title)}</h1>
    <p class="lede">${md(a.tagline)}</p>
    <div class="act-actions">
      <a class="btn btn-gold" href="${rel}handouts/${a.id}.html">${ICON.print}Print handouts</a>
      <button class="btn btn-line" type="button" onclick="window.print()">Print this guide</button>
    </div>
    </div>
  </div>
  <div class="act-grid">
    <aside class="glance" aria-label="At a glance">
      <dl>
        <div><dt>Time</dt><dd>${ICON.clock}${a.minutes} minutes</dd></div>
        <div><dt>Mode</dt><dd class="mode m-${a.mode}">${ICON[a.mode]}${MODE[a.mode].name}</dd></div>
        <div><dt>${a.audience === 'pl' ? 'For' : 'Grades'}</dt><dd>${esc(whoLabel(a))}</dd></div>
        ${a.audience === 'pl' ? `<div><dt>Serving</dt><dd>${a.grades.map(gradeLabel).join(', ')}</dd></div>` : ''}
        <div><dt>Group</dt><dd>${esc(a.groupSize)}</dd></div>
        <div><dt>Strands</dt><dd class="chips">${strandChips(a)}</dd></div>
      </dl>
      <h2 class="glance-h">ELE indicators</h2>
      <ul class="indicators">${indicators}</ul>
      <h2 class="glance-h">Handouts</h2>
      <ul class="handout-list">${handoutList}</ul>
    </aside>
    <div class="act-main">
      <section><h2>Overview</h2><p class="overview">${md(a.overview)}</p>
        <h3 class="sub">Objectives</h3>${list(a.objectives)}</section>
      <section class="two">
        <div><h2>Materials</h2>
          <h3 class="sub">On paper</h3>${a.materials.print.length ? list(a.materials.print) : '<p class="muted">None.</p>'}
          <h3 class="sub">On screen</h3>${a.materials.digital.length ? list(a.materials.digital) : '<p class="muted">None needed.</p>'}</div>
        <div><h2>Before you start</h2><ol class="prep">${a.prep.map(x => `<li>${md(x)}</li>`).join('')}</ol></div>
      </section>
      <section><h2>Step by step</h2><ol class="steps">${steps}</ol></section>
      <section class="paths">
        <h2>Paper or screen</h2>
        <div class="path"><h3>${ICON.unplugged}Unplugged</h3><p>${md(a.unplugged)}</p></div>
        <div class="path"><h3>${ICON.digital}Digital</h3><p>${md(a.digital)}</p></div>
        <p class="why"><strong>Does it need a screen?</strong> ${md(a.whyTech)}</p>
      </section>
      <section class="evidence"><h2>Evidence of learning</h2><p class="muted">What you should be able to see or collect if it worked.</p>${list(a.lookFors)}</section>
      <section><h2>Adaptations</h2><dl class="adapt">${a.adaptations.map(x => `<div><dt>${esc(x.label)}</dt><dd>${md(x.text)}</dd></div>`).join('')}</dl></section>
      <section class="two">
        <div><h2>Reflect</h2>${list(a.reflection)}</div>
        <div><h2>${a.audience === 'pl' ? 'Take it to your students' : 'What comes next'}</h2><p>${md(a.transfer)}</p></div>
      </section>
      ${a.connections && a.connections.length ? `<section><h2>Pairs well with</h2><ul class="connections">${a.connections.map(c => `<li><a href="${esc(c.url)}">${esc(c.title)}</a>${c.note ? `<span>${md(c.note)}</span>` : ''}</li>`).join('')}</ul></section>` : ''}
      <section class="related noprint"><h2>Related activities</h2><div class="cards">${related.map(b => card(b, rel)).join('')}</div></section>
    </div>
  </div>
</main>`;
  return page({ title: `${a.title} | ELE Activity Bank`, desc: a.tagline, rel, body });
}

function htype(t) {
  return { cards: 'cut-apart cards', sort: 'card sort', worksheet: 'worksheet', table: 'organizer', checklist: 'checklist', reading: 'reading', rubric: 'rubric' }[t];
}

// ---------- handout rendering ----------
function sheetHead(a, h, { name = true } = {}) {
  return `<header class="sh-head">
    <div><p class="sh-kicker">Handout ${esc(h.id)} for ${esc(a.title)}</p><h2>${esc(h.title)}</h2></div>
    ${name ? '<div class="sh-name"><span>Name</span><span>Date</span></div>' : ''}
  </header>${h.instructions ? `<p class="sh-instr">${md(h.instructions)}</p>` : ''}`;
}
const sheetFoot = a => `<footer class="sh-foot">TCEA ELE Activity Bank · ${esc(a.title)} · CC BY-SA 4.0 · mglearn.github.io/eles</footer>`;
const sheet = (a, inner, cls = '') => `<section class="sheet ${cls}">${inner}${sheetFoot(a)}</section>`;
const chunk = (arr, n) => arr.reduce((o, x, i) => (i % n ? o[o.length - 1].push(x) : o.push([x]), o), []);

function renderHandout(a, h) {
  const out = [];   // student-facing sheets
  const key = [];   // facilitator key blocks
  switch (h.type) {
    case 'cards': {
      const pages = chunk(h.cards, 8);
      pages.forEach((cs, p) => out.push(sheet(a, `${sheetHead(a, h, { name: false })}${pages.length > 1 ? `<p class="sh-page">Sheet ${p + 1} of ${pages.length}</p>` : ''}
        <div class="cutgrid">${cs.map(c => `<div class="cut">${c.label ? `<p class="cut-label">${esc(c.label)}</p>` : ''}<p>${md(c.front)}</p></div>`).join('')}</div>`, 'sheet-cards')));
      if (h.cards.some(c => c.back)) key.push(`<h3>Handout ${esc(h.id)}: ${esc(h.title)}</h3><dl class="key">${h.cards.map((c, i) => `<div><dt>${esc(c.label || 'Card ' + (i + 1))}</dt><dd>${md(c.back || '')}</dd></div>`).join('')}</dl>`);
      break;
    }
    case 'sort': {
      out.push(sheet(a, `${sheetHead(a, h)}<div class="mat" style="--cols:${h.categories.length}">${h.categories.map(c => `<div class="mat-col"><h3>${esc(c)}</h3></div>`).join('')}</div>`, 'sheet-mat'));
      const pages = chunk(h.items, 12);
      pages.forEach((its, p) => out.push(sheet(a, `${sheetHead(a, { ...h, title: h.title + ': cards to sort', instructions: 'Cut apart the strips. Sort each one onto the mat and be ready to explain why.' }, { name: false })}${pages.length > 1 ? `<p class="sh-page">Sheet ${p + 1} of ${pages.length}</p>` : ''}<div class="cutgrid strips">${its.map(it => `<div class="cut"><p>${md(it.text)}</p></div>`).join('')}</div>`, 'sheet-cards')));
      key.push(`<h3>Handout ${esc(h.id)}: ${esc(h.title)}</h3><table class="keytable"><thead><tr><th>Item</th><th>Sort</th><th>Why</th></tr></thead><tbody>${h.items.map(it => `<tr><td>${md(it.text)}</td><td><strong>${esc(it.answer)}</strong></td><td>${md(it.why || '')}</td></tr>`).join('')}</tbody></table>`);
      break;
    }
    case 'worksheet':
      out.push(sheet(a, `${sheetHead(a, h)}<ol class="ws">${h.sections.map(s => `<li><p>${md(s.prompt.replace(/^\s*\d+[.)]\s+/, ''))}</p>${s.boxes ? `<div class="ws-box" style="--h:${Math.max(3, s.lines || 5)}"></div>` : `<div class="ws-lines" style="--n:${s.lines || 3}"></div>`}</li>`).join('')}</ol>`));
      break;
    case 'table': {
      const blanks = Array.from({ length: h.blankRows || 0 }, () => h.columns.map(() => ''));
      const rows = [...(h.rows || []), ...blanks];
      out.push(sheet(a, `${sheetHead(a, h)}<table class="org" style="--cols:${h.columns.length}"><thead><tr>${h.columns.map(c => `<th>${md(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, i) => `<td${i === 0 && c ? ' class="rowhead"' : ''}>${md(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`, h.columns.length > 3 ? 'landscape-ish' : ''));
      break;
    }
    case 'checklist': {
      const scale = h.scale && h.scale.length ? h.scale : null;
      out.push(sheet(a, `${sheetHead(a, h)}<table class="check"><thead><tr><th>${scale ? '' : '<span class="sr">Done</span>'}</th>${scale ? scale.map(s => `<th class="sc">${esc(s)}</th>`).join('') : ''}</tr></thead><tbody>${h.items.map(it => scale
        ? `<tr><td>${md(it)}</td>${scale.map(() => '<td class="sc"><span class="box"></span></td>').join('')}</tr>`
        : `<tr><td><span class="box"></span>${md(it)}</td></tr>`).join('')}</tbody></table>${scale ? '' : ''}<div class="notes"><p>Notes</p><div class="ws-lines" style="--n:4"></div></div>`));
      break;
    }
    case 'reading':
      out.push(sheet(a, `${sheetHead(a, h, { name: false })}<div class="reading">${h.paragraphs.map((p, i) => `<p><span class="pn">${i + 1}</span><span>${md(p)}</span></p>`).join('')}</div>`, 'sheet-reading'));
      break;
    case 'rubric':
      out.push(sheet(a, `${sheetHead(a, h)}<table class="rubric"><thead><tr><th>Criterion</th>${h.levels.map(l => `<th>${esc(l)}</th>`).join('')}</tr></thead><tbody>${h.criteria.map(c => `<tr><th scope="row">${esc(c.name)}</th>${c.descriptors.map(d => `<td>${md(d)}</td>`).join('')}</tr>`).join('')}</tbody></table>`));
      break;
  }
  return { out, key };
}

function handoutPage(a) {
  const rel = '../';
  const parts = a.handouts.map(h => renderHandout(a, h));
  const keys = parts.flatMap(p => p.key);
  const young = a.grades.every(g => g === 'K-2' || g === '3-5');
  const body = `
<main id="main" class="packet">
  <div class="packet-bar noprint">
    <div>
      <p class="crumbs"><a href="${rel}activities/${a.id}.html">${esc(a.title)}</a> <span aria-hidden="true">/</span> Handouts</p>
      <h1>Handouts for ${esc(a.title)}</h1>
      <p>${plural(a.handouts.length, 'handout')}${keys.length ? ' plus a facilitator key on the last page' : ''}, and an optional cover page with the overview and ELE indicators. Prints on US Letter; choose “Fit to page” off and margins “Default.” Print the key separately if the room shouldn't see it.</p>
    </div>
    <div class="packet-actions">
      <button class="btn btn-gold" type="button" onclick="window.print()">${ICON.print}Print all</button>
      <label class="toggle"><input type="checkbox" id="addcover"> Include a cover page</label>
      ${keys.length ? '<label class="toggle"><input type="checkbox" id="hidekey"> Leave out the facilitator key</label>' : ''}
    </div>
  </div>
  <div class="sheets${young ? ' young' : ''}">
    ${sheet(a, `<div class="cover">
      ${imgFor(a) ? `<figure class="cover-photo">${pic(imgFor(a), rel, { lazy: false })}</figure>` : ''}
      <p class="sh-kicker">${audienceLabel(a)} · ${esc(whoLabel(a))} · ${a.minutes} minutes</p>
      <h2 class="cover-title">${esc(a.title)}</h2>
      <p class="cover-lede">${md(a.tagline)}</p>
      <p>${md(a.overview)}</p>
      <h3>In this packet</h3>
      <ul>${a.handouts.map(h => `<li>Handout ${esc(h.id)}: ${esc(h.title)} (${htype(h.type)})</li>`).join('')}${keys.length ? '<li>Facilitator key (last page)</li>' : ''}</ul>
      <h3>TCEA ELE indicators</h3>
      <ul>${a.eles.map(id => `<li><strong>${id}</strong> ${esc(IND[id].text)}</li>`).join('')}</ul>
      <p class="cover-url">Full facilitator guide: mglearn.github.io/eles/activities/${a.id}.html</p>
    </div>`, 'sheet-cover')}
    ${parts.flatMap(p => p.out).join('\n')}
    ${keys.length ? sheet(a, `<header class="sh-head"><div><p class="sh-kicker">Facilitator only for ${esc(a.title)}</p><h2>Answer key and notes</h2></div></header>${keys.join('')}`, 'sheet-key') : ''}
  </div>
</main>`;
  return page({ title: `Handouts: ${a.title} | ELE Activity Bank`, desc: `Print-ready handouts for ${a.title}.`, rel, body, bodyClass: 'is-packet no-cover',
    scripts: `<script src="../assets/fit.js"></script><script>document.getElementById('hidekey')?.addEventListener('change',e=>document.body.classList.toggle('no-key',e.target.checked));document.getElementById('addcover').addEventListener('change',e=>document.body.classList.toggle('no-cover',!e.target.checked));</script>` });
}

// ---------- catalog card ----------
function card(a, rel = '') {
  const im = imgFor(a);
  return `<article class="card${im ? ' has-photo' : ''}" data-id="${a.id}">
    ${im ? `<div class="card-photo">${pic(im, rel, { thumb: true, decorative: true })}</div>` : ''}
    <div class="card-edge">${a.strands.map(s => `<span class="e-${s}"></span>`).join('')}</div>
    <p class="card-kind">${a.audience === 'pl' ? 'Professional learning' : 'Student learning'}<span>${esc(whoLabel(a))}</span></p>
    <h3><a href="${rel}activities/${a.id}.html">${esc(a.title)}</a></h3>
    <p class="card-tag">${md(a.tagline)}</p>
    <div class="card-meta">
      <span>${ICON.clock}${a.minutes} min</span>
      <span class="mode m-${a.mode}">${ICON[a.mode]}${MODE[a.mode].name}</span>
    </div>
    <div class="card-foot"><span class="chips">${strandChips(a)}</span><span class="eles">${eleChips(a.eles.slice(0, 3), rel)}</span></div>
  </article>`;
}

// ---------- coverage ----------
const cover = {}; // indicator id -> [activity]
for (const a of acts) for (const id of a.eles) (cover[id] = cover[id] || []).push(a);
const areaCount = aid => new Set(Object.keys(cover).filter(id => areaOf(id) === aid).flatMap(id => cover[id].map(a => a.id))).size;

// ---------- index ----------
function indexPage() {
  const nPL = acts.filter(a => a.audience === 'pl').length;
  const nSt = acts.length - nPL;
  const nUn = acts.filter(a => a.mode === 'unplugged').length;
  const max = Math.max(1, ...ELES.roles.flatMap(r => r.areas.map(a => areaCount(a.id))));
  const matrix = `<div class="matrix" role="group" aria-label="ELE framework. Choose an area to filter activities.">
    <div class="mx-corner"></div>${[1, 2, 3, 4, 5].map(n => `<div class="mx-col">${n}.0</div>`).join('')}
    ${ELES.roles.map(r => `<div class="mx-row">${esc(r.short)}</div>${r.areas.map(ar => {
      const c = areaCount(ar.id);
      return `<button type="button" class="mx-cell lv${c === 0 ? 0 : c / max < 0.34 ? 1 : c / max < 0.67 ? 2 : 3}" data-area="${ar.id}" aria-label="${esc(r.short)} ${ar.num}.0 ${esc(ar.title)}: ${plural(c, 'activity').replace('activitys', 'activities')}"><span class="mx-title">${esc(ar.title)}</span><span class="mx-n">${c}</span></button>`;
    }).join('')}`).join('')}
  </div>`;
  const opt = (name, items) => items.map(([v, l]) => `<label class="pill"><input type="checkbox" name="${name}" value="${esc(v)}"><span>${esc(l)}</span></label>`).join('');
  const body = `
<main id="main">
  <section class="hero">
    <div class="hero-text">
      <h1>What does good learning look like today?</h1>
      <p>${acts.length} ready-to-run activities built on the TCEA Essential Learning Expectations: ${nPL} for professional learning and ${nSt} for K–16 classrooms. Each one weaves in Gen AI literacy, digital citizenship, or media literacy. Every activity comes with print-ready handouts, and ${nUn} need no devices at all.</p>
      ${hasImg('hero-home') ? `<figure class="hero-photo">${pic('hero-home', '', { lazy: false })}</figure>` : ''}
      <p class="hero-note">Technology use by itself is not evidence of learning. Each activity names the evidence to look for, and says plainly whether a screen earns its place.</p>
    </div>
    <div class="hero-matrix">
      ${matrix}
      <p class="mx-caption">Five roles, five key areas each. The more gold a cell, the more activities build that area; dashed cells have none yet. Choose a cell to see its activities.</p>
    </div>
  </section>

  <section id="catalog" class="catalog">
    <form class="filters" id="filters" aria-label="Filter activities" onsubmit="return false">
      <div class="f-search"><label for="q">Search</label><input id="q" type="search" placeholder="deepfakes, privacy, K–2, sorting…" autocomplete="off"><button type="button" class="btn btn-line f-toggle" id="ftoggle" aria-expanded="false" aria-controls="filters">Show filters</button></div>
      <fieldset><legend>Who is learning</legend>${opt('audience', [['pl', 'Educators (PL)'], ['student', 'Students']])}</fieldset>
      <fieldset><legend>Strand</legend>${opt('strand', Object.entries(STRAND).map(([k, v]) => [k, v.short]))}</fieldset>
      <fieldset><legend>Grade band</legend>${opt('grade', [['K-2', 'K–2'], ['3-5', '3–5'], ['6-8', '6–8'], ['9-12', '9–12'], ['Higher Ed', 'Higher Ed']])}</fieldset>
      <fieldset><legend>Mode</legend>${opt('mode', Object.entries(MODE).map(([k, v]) => [k, v.name]))}</fieldset>
      <fieldset><legend>Role</legend>${opt('role', Object.entries(ROLE).map(([k, v]) => [k, v]))}</fieldset>
      <fieldset><legend>Time</legend>${opt('time', [['30', 'Up to 30 min'], ['60', '31–60 min'], ['61', 'Over an hour']])}</fieldset>
      <button type="button" class="btn btn-line" id="clear">Clear filters</button>
    </form>
    <div class="results">
      <div class="results-bar"><p id="count" aria-live="polite"></p><p id="areaNote" class="area-note" hidden></p></div>
      <div class="cards" id="cards">${acts.map(a => card(a)).join('')}</div>
      <p class="empty" id="empty" hidden>No activities match these filters. Clear a filter or two, or try a broader search word.</p>
    </div>
  </section>
</main>`;
  return page({ title: 'ELE Activity Bank | TCEA Essential Learning Expectations', desc: 'Professional learning and K–16 student activities aligned to the TCEA ELEs, for Gen AI literacy, digital citizenship, and media literacy, digital and print.', body, bodyClass: 'home',
    scripts: '<script src="assets/catalog.js"></script><script src="assets/app.js"></script>' });
}

// ---------- framework ----------
function frameworkPage() {
  const body = `
<main id="main" class="fw">
  <div class="fw-head">
    <h1>The Essential Learning Expectations</h1>
    <p class="lede">TCEA's ELEs give teachers, students, coaches, school leaders, and anyone working with AI a common language for better learning. Each role has five key areas with three indicators each, written as “I know,” “I can,” and “I am aware.” Below each indicator are the activities in this bank that build it.</p>
    <nav class="fw-tabs" aria-label="Roles">${ELES.roles.map(r => `<a href="#${r.code}">${esc(r.short)}</a>`).join('')}</nav>
  </div>
  ${ELES.roles.map(r => `<section class="role" id="${r.code}">
    <div class="role-intro">
      <h2>${esc(r.name)}</h2>
      ${hasImg('role-' + { T: 'teachers', S: 'students', L: 'leaders', C: 'coaches', AI: 'ai' }[r.code]) ? `<figure class="role-photo">${pic('role-' + { T: 'teachers', S: 'students', L: 'leaders', C: 'coaches', AI: 'ai' }[r.code], '')}</figure>` : ''}
      <p>${esc(r.description)}</p>
      <blockquote><p>“${esc(r.quote.text)}”</p><cite>${esc(r.quote.author)}</cite></blockquote>
      <details><summary>Guiding questions</summary><ul>${r.guidingQuestions.map(q => `<li>${esc(q)}</li>`).join('')}</ul></details>
    </div>
    ${r.areas.map(ar => `<div class="area" id="${ar.id}">
      <h3><span>${ar.num}.0</span>${esc(ar.title)}</h3>
      <ol class="ind">${ar.indicators.map(i => {
        const list = cover[i.id] || [];
        return `<li id="${i.id}"><div class="ind-text"><span class="ind-id">${i.id}</span><p>${esc(i.text)}</p>
          <details class="ind-ex"><summary>Example from the ELEs</summary><p>${esc(i.example)}</p><p class="muted">${esc(r.correlationLabel)}: ${esc(i.correlation)}</p></details></div>
          <div class="ind-acts">${list.length ? list.map(a => `<a href="activities/${a.id}.html"><span class="dot d-${a.audience}"></span>${esc(a.title)}</a>`).join('') : '<span class="muted">No activity yet.</span>'}</div></li>`;
      }).join('')}</ol></div>`).join('')}
  </section>`).join('')}
  <p class="fw-source muted">Framework text from ${esc(ELES.source)} Alignment examples and TEKS/TEA correlations are quoted from the ELE documents.</p>
</main>`;
  return page({ title: 'The ELEs | ELE Activity Bank', desc: 'Browse all 75 TCEA Essential Learning Expectation indicators and the activities that build each one.', body });
}

// ---------- guide ----------
function guidePage() {
  const body = `
<main id="main" class="guide">
  <h1>Facilitator guide</h1>
  <p class="lede">How the bank is built, and how to plan a session or lesson with it.</p>
  ${hasImg('hero-guide') ? `<figure class="guide-photo">${pic('hero-guide', '', { lazy: false })}</figure>` : ''}

  <section>
    <h2>Start with the evidence, not the tool</h2>
    <p>The updated ELEs ask one question of every lesson, workshop, tool pilot, and campus initiative: <em>what does good learning look like today?</em> Technology use by itself is not evidence of learning. So every activity here starts from what learners should produce: a claim with evidence, a verification move, a revised draft, a decision they can defend. Tools come second.</p>
    <p>That is why every activity page has an <strong>Evidence of learning</strong> section, and a note answering <strong>does it need a screen?</strong> With growing pressure to limit screen time, an unplugged path is a feature, not a fallback.</p>
  </section>

  <section>
    <h2>A planning check for any role</h2>
    <p>Pick one lesson, PD session, tool pilot, or campus initiative. Choose the role lane that matters most, then ask what evidence is missing. If the work is strong, you can answer all five:</p>
    <ol class="check5">
      <li><strong>Teacher:</strong> what is the teacher designing, and what evidence do they want?</li>
      <li><strong>Student:</strong> what are learners doing, deciding, and explaining?</li>
      <li><strong>Coach:</strong> how will support happen? Listen, co-plan, model, measure, adjust.</li>
      <li><strong>Leader:</strong> what will leaders monitor? What is the vision, what evidence will guide us, what changes in instruction, who might be left out, and how will families understand the change?</li>
      <li><strong>AI:</strong> where does AI belong, if it belongs at all?</li>
    </ol>
  </section>

  <section>
    <h2>Three literacies, woven through</h2>
    <dl class="strands">${Object.entries(STRAND).map(([k, v]) => `<div class="st-${k}"><dt>${v.name}</dt><dd>${v.desc} <a href="index.html?strand=${k}#catalog">${acts.filter(a => a.strands.includes(k)).length} activities</a></dd></div>`).join('')}</dl>
  </section>

  <section>
    <h2>How each activity is laid out</h2>
    <ul>
      <li><strong>At a glance:</strong> time, mode, audience, group size, strands, and the ELE indicators it builds, each linked to the framework.</li>
      <li><strong>Step by step:</strong> a timed sequence with what to say and do, plus facilitator notes on likely misconceptions.</li>
      <li><strong>Paper or screen:</strong> how to run it with no devices, how to run it digitally, and whether the screen adds anything.</li>
      <li><strong>Evidence of learning:</strong> what you should be able to see or collect if it worked.</li>
      <li><strong>Adaptations:</strong> other grade bands, higher education, emergent bilingual learners, and more.</li>
      <li><strong>Handouts:</strong> a print-ready packet on US Letter (cards, sorts, worksheets, organizers, readings, rubrics) with a facilitator key on the last page.</li>
    </ul>
  </section>

  <section>
    <h2>Professional learning that models the classroom</h2>
    <p>Most PL activities ask educators to do the task as learners first, then step back and debrief as teachers, coaches, or leaders. That double pass matters: people teach the version of a skill they have felt. Close every session with the “Take it to your students” step, and bring student evidence back to a PLC or coaching conversation.</p>
  </section>

  <section>
    <h2>Using AI tools safely with students</h2>
    <ul>
      <li>Use only tools your district or institution has approved, and follow their age requirements.</li>
      <li>With students under 13, the teacher drives any AI tool on a shared screen. Printed mock AI outputs work just as well for most lessons here.</li>
      <li>Never enter student names, grades, or other personal information into an AI tool.</li>
      <li>Every mock article, post, and AI output in these handouts is fictional, and labeled that way.</li>
    </ul>
  </section>

  <section>
    <h2>Share and adapt</h2>
    <p>Everything here is CC BY-SA 4.0. Copy it, translate it, and remix it for your campus with credit. To align your own lessons or PD to the ELEs, try the <a href="https://mglearn.github.io/tcea/eles/">ELEs Alignment Assistant</a> or get the <a href="https://tinyurl.com/tceaeles1">ELE PDF</a>.</p>
  </section>
</main>`;
  return page({ title: 'Facilitator guide | ELE Activity Bank', desc: 'How to plan with the ELE Activity Bank: evidence first, a five-part planning check, and safe AI use.', body });
}

// ---------- catalog data ----------
function catalogJs() {
  const rows = acts.map(a => ({
    id: a.id, audience: a.audience, roles: a.roles || [], grades: a.grades, strands: a.strands, mode: a.mode, minutes: a.minutes,
    areas: [...new Set(a.eles.map(areaOf))],
    text: [a.title, a.tagline, a.overview, a.eles.join(' '), a.eles.map(id => IND[id].text + ' ' + IND[id].area.title).join(' '),
      a.strands.map(s => STRAND[s].name).join(' '), a.handouts.map(h => h.title).join(' '), a.steps.map(s => s.title).join(' '), a.grades.join(' ')].join(' ').toLowerCase(),
  }));
  const areas = {};
  for (const r of ELES.roles) for (const ar of r.areas) areas[ar.id] = `${r.short} ${ar.num}.0 ${ar.title}`;
  return `window.ELE_CATALOG=${JSON.stringify(rows)};\nwindow.ELE_AREAS=${JSON.stringify(areas)};\n`;
}

// ---------- write ----------
fs.rmSync(path.join(ROOT, 'activities'), { recursive: true, force: true });
fs.rmSync(path.join(ROOT, 'handouts'), { recursive: true, force: true });
for (const a of acts) { write(`activities/${a.id}.html`, activityPage(a)); write(`handouts/${a.id}.html`, handoutPage(a)); }
write('index.html', indexPage());
write('framework.html', frameworkPage());
write('guide.html', guidePage());
write('assets/catalog.js', catalogJs());
write('404.html', page({ title: 'Page not found | ELE Activity Bank', desc: 'Page not found', rel: '/eles/', body: '<main id="main" class="guide"><h1>That page isn\'t here</h1><p class="lede">The activity may have been renamed. <a href="/eles/">Browse all activities</a>.</p></main>' }));
const covered = Object.keys(cover).length;
console.log(`Built ${acts.length} activities (${acts.filter(a => a.audience === 'pl').length} PL, ${acts.filter(a => a.audience === 'student').length} student). ELE coverage: ${covered}/75 indicators.`);
const missing = Object.keys(IND).filter(id => !cover[id]);
if (missing.length) console.log('Uncovered:', missing.join(' '));
