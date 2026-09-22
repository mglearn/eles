#!/usr/bin/env node
// Builds the static site from data/eles.json + data/activities/*.json, in every
// language that has data/i18n/<lang>/ui.json. English is at the site root; other
// languages are mirrored under /<lang>/ with the same page paths.
//   index.html              catalog + ELE matrix
//   framework.html          ELE browser with coverage
//   guide.html              how to use the bank (learning-first principles)
//   activities/<id>.html    facilitator guide
//   handouts/<id>.html      print-ready handout packet + facilitator key
//   assets/catalog[.<lang>].js  catalog data for filtering
// Translations: data/i18n/<lang>/{ui,eles}.json and activities/<id>.json, flat
// { "<json path>": "<text>" } overlays (see scripts/i18n.js). Missing strings fall
// back to English.
// Usage: node scripts/build.js
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const I18N = path.join(ROOT, 'data/i18n');
const ELES_EN = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/eles.json'), 'utf8'));
const ACT_DIR = path.join(ROOT, 'data/activities');
// An activity is published once it has an entry in data/standards.json (added at
// final review). Anything else in data/activities/ is a draft and is not built.
const STD_FILE = path.join(ROOT, 'data/standards.json');
const PUBLISHED = fs.existsSync(STD_FILE) ? new Set(Object.keys(JSON.parse(fs.readFileSync(STD_FILE, 'utf8')))) : null;
const ALL_ACTS = fs.readdirSync(ACT_DIR).filter(f => f.endsWith('.json'))
  .map(f => JSON.parse(fs.readFileSync(path.join(ACT_DIR, f), 'utf8')));
const ACTS_EN = ALL_ACTS.filter(a => !PUBLISHED || PUBLISHED.has(a.id));
const DRAFTS = ALL_ACTS.filter(a => PUBLISHED && !PUBLISHED.has(a.id)).map(a => a.id);
const UI_EN = JSON.parse(fs.readFileSync(path.join(I18N, 'en/ui.json'), 'utf8'));

// Every language offered in the picker (Contraband's set). Only those with a
// ui.json are built and listed.
const ALL_LANGS = [
  { code: 'en', label: 'English', dir: 'ltr' },
  { code: 'es', label: 'Español', dir: 'ltr' },
  { code: 'vi', label: 'Tiếng Việt', dir: 'ltr' },
  { code: 'ar', label: 'العربية', dir: 'rtl' },
  { code: 'hi', label: 'हिन्दी', dir: 'ltr' },
  { code: 'ur', label: 'اردو', dir: 'rtl' },
  { code: 'zh', label: '中文', dir: 'ltr' },
];
const LANGS = ALL_LANGS.filter(l => fs.existsSync(path.join(I18N, l.code, 'ui.json')));

// ---------- overlays ----------
const readJson = p => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null);
function applyOverlay(obj, overlay) {
  const out = JSON.parse(JSON.stringify(obj));
  for (const [p, v] of Object.entries(overlay || {})) {
    const keys = p.split('.');
    let o = out;
    for (let i = 0; i < keys.length - 1 && o != null; i++) o = o[keys[i]];
    if (o != null && typeof o[keys[keys.length - 1]] === 'string') o[keys[keys.length - 1]] = v;
  }
  return out;
}
function localizeActivity(a, lang) {
  if (lang === 'en') return { ...a, translated: true };
  const ov = readJson(path.join(I18N, lang, 'activities', `${a.id}.json`));
  const out = applyOverlay(a, ov);
  // sort answers are keys into the categories list; follow the translated category
  out.handouts.forEach((h, i) => {
    if (h.type !== 'sort') return;
    const en = a.handouts[i].categories;
    h.items.forEach(it => { const k = en.indexOf(it.answer); if (k >= 0) it.answer = h.categories[k]; });
  });
  out.translated = !!ov && Object.keys(ov).length > 0;
  return out;
}

// ---------- photos (optional; see scripts/import_images.py) ----------
const IMG_MANIFEST = readJson(path.join(ROOT, 'data/images.json')) || {};
const hasImg = n => IMG_MANIFEST[n] && fs.existsSync(path.join(ROOT, 'assets/img', n + '.jpg'));
const BAND = { 'K-2': 'k2', '3-5': '35', '6-8': '68', '9-12': '912', 'Higher Ed': 'he', 'K-12': 'pl' };
function imgFor(a) {
  const band = a.audience === 'pl' ? 'pl' : BAND[a.grades[0]];
  return [`act-${a.id}`, ...a.strands.map(st => `cat-${band}-${st}`)].find(hasImg) || null;
}
const USES_PHOTOS = Object.keys(IMG_MANIFEST).some(hasImg);
// Standards alignment (see data/standards-catalog.json, standards.html)
const STD_CAT = readJson(path.join(ROOT, 'data/standards-catalog.json'));
const STD = readJson(path.join(ROOT, 'data/standards.json')) || {};
const STD_GROUPS = ['teks', 'elps', 'udl', 'sst'];
// TEKS chapter sections by grade band, for citing (paraphrased; see tea.texas.gov)
const TEKS_SECTIONS = {
  ta: { 'K-2': '§126.5–§126.7', '3-5': '§126.8–§126.10', '6-8': '§126.17–§126.19' },
  elar: { 'K-2': '§110.2–§110.4', '3-5': '§110.5–§110.7', '6-8': '§110.22–§110.24', '9-12': '§110.36–§110.39' },
};
// Search topics (data/topics.json): tag each activity from its English text
const TOPICS = (readJson(path.join(ROOT, 'data/topics.json')) || { topics: [] }).topics;
const allText = o => typeof o === 'string' ? o : Array.isArray(o) ? o.map(allText).join(' ') : o && typeof o === 'object' ? Object.values(o).map(allText).join(' ') : '';
const ACT_TOPICS = {};
for (const a of ACTS_EN) {
  const head = [a.title, a.tagline, a.overview].join(' ').toLowerCase(), body = allText(a).toLowerCase();
  const count = (txt, w) => txt.split(w).length - 1;
  ACT_TOPICS[a.id] = TOPICS.filter(tp => tp.synonyms.some(w => head.includes(w) || count(body, w) >= 2)).map(tp => tp.id);
}
const HERO_TOPICS = ['screentime', 'deepfakes', 'privacy', 'hallucination', 'copyright'];
// Guide page: activities for the screen-time conversation (missing ids are skipped)
const SCREEN_ACTS = ['minutes-with-a-purpose', 'screens-at-school-screens-at-home', 'does-this-need-a-screen', 'screen-time-green-time', 'evidence-before-tools', 'five-question-rollout-check', 'the-feed-game', 'algorithm-autopsy'];
// TCEA's own ELE infographic slides (source_materials deck), shown on the framework page
const INFOGRAPHICS = readJson(path.join(ROOT, 'data/infographics.json')) || [];

// ---------- helpers ----------
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const md = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*\p{L}\p{N}])\*(?!\s)(.+?)\*(?![\p{L}\p{N}])/gu, '$1<em>$2</em>');
const write = (rel, html) => { const p = path.join(ROOT, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, html); };
const fill = (s, vars = {}) => String(s).replace(/\{([a-z]+)\}/gi, (m, k) => (vars[k] !== undefined ? vars[k] : m));
const gradeLabel = g => g.replace('-', '–');
const areaOf = id => id.replace(/\.\d$/, '.0');
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

const ICON = {
  unplugged: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l4 4v14H6z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M15 3v4h4M9 12h7M9 16h5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  digital: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M8 20h8M12 16v4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  hybrid: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h8l3 3v11H3z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><rect x="13" y="3" width="8" height="10" rx="1.2" fill="var(--paper,#fff)" stroke="currentColor" stroke-width="1.7"/></svg>',
  clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  print: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
  globe: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M3 12h18M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>',
};
const FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap" rel="stylesheet">';

// Runs in <head> before paint: honor ?lang=, then a saved choice, then the browser
// language (Contraband's order), by moving to the same page in that language.
// A translated URL is always respected, so a shared Spanish link stays Spanish;
// only English (default) pages redirect on a saved or browser preference.
const LANG_BOOT = `(function(){var K='tcea.eles.lang',h=document.documentElement,cur=h.lang,alt={};
document.querySelectorAll('link[rel=alternate][hreflang]').forEach(function(l){alt[l.hreflang]=l.href});
var q=new URLSearchParams(location.search),want=q.get('lang'),saved=null;try{saved=localStorage.getItem(K)}catch(e){}
if(want&&alt[want]){try{localStorage.setItem(K,want)}catch(e){}}else if(cur!=='en'){want=cur}else{want=saved||((navigator.languages||[navigator.language]).map(function(x){return String(x).slice(0,2).toLowerCase()}).filter(function(x){return alt[x]})[0])||cur}
if(want!==cur&&alt[want]){q.delete('lang');var s=q.toString();location.replace(alt[want]+(s?'?'+s:'')+location.hash)}
else if(q.has('lang')){q.delete('lang');var s2=q.toString();history.replaceState(null,'',location.pathname+(s2?'?'+s2:'')+location.hash)}})();`;
const NAV_JS = `document.addEventListener('click',function(e){document.querySelectorAll('.navmenu[open]').forEach(function(m){if(!m.contains(e.target))m.removeAttribute('open')})});document.addEventListener('keydown',function(e){if(e.key==='Escape')document.querySelectorAll('.navmenu[open]').forEach(function(m){m.removeAttribute('open');m.querySelector('summary').focus()})});`;
const LANG_PICK = `document.querySelectorAll('.lang-pick select').forEach(function(s){s.addEventListener('change',function(){try{localStorage.setItem('tcea.eles.lang',s.value)}catch(e){}var o=s.options[s.selectedIndex];location.href=o.dataset.href+location.search+location.hash})});`;

// ======================================================================
// One language's site
// ======================================================================
function buildLang(L) {
  const lang = L.code;
  const UI = { ...UI_EN, ...(readJson(path.join(I18N, lang, 'ui.json')) || {}) };
  const t = (k, vars) => fill(UI[k] ?? k, vars);
  const ELES = applyOverlay(ELES_EN, readJson(path.join(I18N, lang, 'eles.json')));
  const stdNotes = readJson(path.join(I18N, lang, 'standards.json')) || {};
  const acts = ACTS_EN.map(a => ({ ...localizeActivity(a, lang), stdNote: stdNotes[`${a.id}.note`] })).sort((a, b) => a.title.localeCompare(b.title, lang));
  const prefix = lang === 'en' ? '' : `${lang}/`;

  const IND = {};
  for (const r of ELES.roles) for (const a of r.areas) for (const i of a.indicators) IND[i.id] = { ...i, area: a, role: r };

  const STRANDS = ['genai', 'digcit', 'medialit'];
  const strandShort = s => t(`strand.${s}.short`);
  const whoLabel = a => a.audience === 'pl'
    ? (a.roles || []).map(r => t(`role.${r}`)).join(', ')
    : a.grades.map(g => g === 'Higher Ed' ? t('grade.he') : t('grade.band', { g: gradeLabel(g) })).join(', ');
  const gradeList = a => a.grades.map(g => g === 'Higher Ed' ? t('grade.he') : gradeLabel(g)).join(', ');
  const audienceLabel = a => t(`aud.${a.audience}`);
  const htype = x => t(`htype.${x}`);

  // Paths: `base` reaches this language's root, `root` reaches the site root (assets).
  const depthOf = p => p.split('/').length - 1;
  const ups = n => '../'.repeat(n);
  function page({ pagePath, title, desc, body, bodyClass = '', scripts = '', untranslated = false }) {
    const d = depthOf(pagePath);
    const base = ups(d), root = ups(d + (lang === 'en' ? 0 : 1));
    const alts = LANGS.map(o => ({ ...o, href: root + (o.code === 'en' ? '' : o.code + '/') + pagePath }));
    const absAlt = o => `https://mglearn.github.io/eles/${o.code === 'en' ? '' : o.code + '/'}${pagePath}`;
    const picker = LANGS.length > 1 ? `<label class="lang-pick">${ICON.globe}<span class="sr">${esc(t('lang.label'))}</span><select aria-label="${esc(t('lang.label'))}">${alts.map(o => `<option value="${o.code}" lang="${o.code}" data-href="${esc(o.href)}"${o.code === lang ? ' selected' : ''}>${esc(o.label)}</option>`).join('')}</select></label>` : '';
    const html = `<!DOCTYPE html>
<html lang="${lang}" dir="${L.dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
${hasImg('og-share') ? '<meta property="og:image" content="https://mglearn.github.io/eles/assets/img/og-share.jpg"><meta name="twitter:card" content="summary_large_image">' : ''}
${LANGS.length > 1 ? LANGS.map(o => `<link rel="alternate" hreflang="${o.code}" href="${absAlt(o)}">`).join('\n') + `\n<link rel="alternate" hreflang="x-default" href="${absAlt(LANGS[0])}">` : ''}
${LANGS.length > 1 ? `<script>${LANG_BOOT}</script>` : ''}
${FONTS}
<link rel="stylesheet" href="${root}assets/site.css">
<link rel="icon" href="${root}assets/favicon.svg" type="image/svg+xml">
</head>
<body class="${bodyClass}">
<a class="skip" href="#main">${esc(t('skip'))}</a>
<header class="topbar">
  <a class="brand" href="${base}index.html"><span class="brand-mark" aria-hidden="true">ELE</span><span>${esc(t('site.name'))}</span></a>
  <nav aria-label="${esc(t('nav.main'))}">
    <a href="${base}index.html#catalog">${esc(t('nav.activities'))}</a>
    <a href="${base}framework.html">${esc(t('nav.eles'))}</a>
    <details class="navmenu"><summary>${esc(t('nav.facilitator'))}</summary><div class="navmenu-panel">
      <a href="${base}guide.html">${esc(t('nav.menuGuide'))}</a><span class="navmenu-sep" aria-hidden="true">|</span>
      <a href="${base}standards.html">${esc(t('nav.standards'))}</a>
    </div></details>
    ${picker}
  </nav>
</header>
${lang !== 'en' ? `<p class="lang-notice noprint" lang="${lang}">${esc(t('lang.notice'))}${untranslated ? ' <strong>' + esc(t('lang.untranslated')) + '</strong>' : ''}</p>` : ''}
${body}
<footer class="site-foot">
  <div>
    <p><strong>${esc(t('site.fullName'))}.</strong> ${esc(t('foot.about'))}</p>
    <p>${fill(esc(t('foot.credit')), { mglearn: '<a href="https://mglearn.github.io/">mglearn</a>', eles: `<a href="https://tinyurl.com/tceaeles1">${esc(t('foot.elesLink'))}</a>`, license: '<a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>' })}</p>
    ${USES_PHOTOS ? `<p class="ai-note">${esc(t('foot.photos'))}</p>` : ''}
  </div>
  <nav aria-label="${esc(t('foot.tcea'))}">
    <p class="foot-h">${esc(t('foot.tcea'))}</p>
    <a href="https://tcea.org/">${esc(t('foot.tceaOrg'))}</a>
    <a href="https://blog.tcea.org/">${esc(t('foot.tceaBlog'))}</a>
    <a href="https://convention.tcea.org/">${esc(t('foot.tceaConvention'))}</a>
  </nav>
  <nav aria-label="${esc(t('nav.related'))}">
    <p class="foot-h">${esc(t('foot.more'))}</p>
    <a href="https://mglearn.github.io/tcea/eles/">${esc(t('foot.assistant'))}</a>
    <a href="https://mglearn.github.io/activities/">${esc(t('foot.hub'))}</a>
    <a href="https://mglearn.github.io/activities/digcit/">${esc(t('foot.digcit'))}</a>
    <a href="https://mglearn.github.io/activities/genailit/">${esc(t('foot.genailit'))}</a>
  </nav>
</footer>
<script>${NAV_JS}</script>
${LANGS.length > 1 ? `<script>${LANG_PICK}</script>` : ''}
${scripts.replace(/\{root\}/g, root)}
</body>
</html>`;
    write(prefix + pagePath, html);
  }

  function pic(name, rel, { cls = 'photo', thumb = false, lazy = true, decorative = false } = {}) {
    if (!name) return '';
    const m = IMG_MANIFEST[name];
    const src = `${rel}assets/img/${thumb ? 'thumb/' : ''}${name}.jpg`;
    const w = thumb ? 720 : m.w, h = thumb ? Math.round(720 * m.h / m.w) : m.h;
    const alt = (m.alts && m.alts[lang]) || m.alt;
    return `<img class="${cls}" src="${src}" width="${w}" height="${h}" alt="${decorative ? '' : esc(alt)}"${lazy ? ' loading="lazy" decoding="async"' : ''}>`;
  }
  const rootFrom = d => ups(d + (lang === 'en' ? 0 : 1));

  const stdLabel = (g, c) => t(`std.${g}.${c}`);
  const stdChip = (g, c, root) => `<a class="std std-${g}" href="${root}standards.html#${g}-${c.replace(/\./g, '-')}" title="${esc(stdLabel(g, c))}">${g === 'udl' ? c : esc(g === 'teks' || g === 'sst' ? stdLabel(g, c).replace(/^[^:]*:\s*/, '') : stdLabel(g, c))}</a>`;
  const teksSections = a => {
    const st = STD[a.id]; if (!st || !st.teks.length) return '';
    const bands = a.grades.includes('K-12') ? ['K-2', '3-5', '6-8', '9-12'] : a.grades.filter(g => g !== 'Higher Ed');
    const out = [];
    if (st.teks.some(c => c.startsWith('ta-'))) out.push('Technology Applications ' + bands.map(b => TEKS_SECTIONS.ta[b] || t('grade.hs')).filter((v, i, x) => x.indexOf(v) === i).join(', '));
    if (st.teks.some(c => c.startsWith('elar-'))) out.push('ELAR ' + bands.map(b => TEKS_SECTIONS.elar[b]).filter(Boolean).join(', '));
    return out.join('; ');
  };
  const strandChips = a => a.strands.map(s => `<span class="strand s-${s}">${esc(strandShort(s))}</span>`).join('');
  const eleChips = (ids, base) => ids.map(id => `<a class="ele" href="${base}framework.html#${id}" title="${esc(IND[id].role.short + ' ' + id.replace(/^[A-Z]+/, '') + ': ' + IND[id].text)}">${id}</a>`).join('');

  function card(a, base, root) {
    const im = imgFor(a);
    return `<article class="card${im ? ' has-photo' : ''}" data-id="${a.id}"${a.translated ? '' : ' lang="en"'}>
    ${im ? `<div class="card-photo">${pic(im, root, { thumb: true, decorative: true })}</div>` : ''}
    <div class="card-edge">${a.strands.map(s => `<span class="e-${s}"></span>`).join('')}</div>
    <p class="card-kind">${esc(audienceLabel(a))}<span>${esc(t('card.for', { who: whoLabel(a) }))}</span></p>
    <h3><a href="${base}activities/${a.id}.html">${esc(a.title)}</a></h3>
    <p class="card-tag">${md(a.tagline)}</p>
    <div class="card-meta">
      <span>${ICON.clock}${esc(t('min', { n: a.minutes }))}</span>
      <span class="mode m-${a.mode}">${ICON[a.mode]}${esc(t('mode.' + a.mode))}</span>
    </div>
    <div class="card-foot"><span class="chips">${strandChips(a)}</span><span class="eles">${eleChips(a.eles.slice(0, 3), base)}</span></div>
  </article>`;
  }

  const cover = {};
  for (const a of acts) for (const id of a.eles) (cover[id] = cover[id] || []).push(a);
  const areaCount = aid => new Set(Object.keys(cover).filter(id => areaOf(id) === aid).flatMap(id => cover[id].map(a => a.id))).size;

  // ---------- activity page ----------
  function activityPage(a) {
    const base = '../', root = rootFrom(1);
    const indicators = a.eles.map(id => {
      const i = IND[id];
      return `<li><a class="ele" href="${base}framework.html#${id}">${id}</a><div><span class="ind-area">${esc(i.role.short)} · ${esc(i.area.title)}</span>${esc(i.text)}</div></li>`;
    }).join('');
    let clock = 0;
    const steps = a.steps.map((s, n) => {
      const start = clock; clock += s.minutes;
      return `<li class="step">
      <div class="step-rail"><span class="step-n">${n + 1}</span><span class="step-time">${esc(t('act.stepTime', { a: start, b: clock }))}</span></div>
      <div class="step-body">
        <p class="step-phase">${esc(t('phase.' + s.phase))}</p>
        <h3>${esc(s.title)}</h3>
        <p>${md(s.body)}</p>
        ${s.note ? `<p class="step-note"><span>${esc(t('act.note'))}</span>${md(s.note)}</p>` : ''}
      </div></li>`;
    }).join('');
    const list = arr => `<ul>${arr.map(x => `<li>${md(x)}</li>`).join('')}</ul>`;
    const handoutList = a.handouts.map(h => `<li><a href="${base}handouts/${a.id}.html#handout-${esc(h.id)}"><span class="hl">${esc(h.id)}</span> ${esc(h.title)}</a> <span class="muted">(${esc(htype(h.type))})</span></li>`).join('');
    const related = acts.filter(b => b.id !== a.id)
      .map(b => ({ b, score: b.eles.filter(x => a.eles.includes(x)).length * 3 + b.eles.filter(x => a.eles.map(areaOf).includes(areaOf(x))).length + b.strands.filter(x => a.strands.includes(x)).length + (b.audience === a.audience ? 1 : 0) }))
      .sort((x, y) => y.score - x.score || x.b.id.localeCompare(y.b.id)).slice(0, 3).map(x => x.b);
    const im = imgFor(a);
    const body = `
<main id="main" class="act"${a.translated ? '' : ' lang="en"'}>
  <div class="act-head${im ? ' has-photo' : ''}">
    ${im ? `<figure class="act-photo">${pic(im, root, { lazy: false })}</figure>` : ''}
    <div class="act-head-text">
    <p class="crumbs"><a href="${base}index.html#catalog">${esc(t('act.all'))}</a> <span aria-hidden="true">/</span> ${esc(audienceLabel(a))}</p>
    <h1>${esc(a.title)}</h1>
    <p class="lede">${md(a.tagline)}</p>
    <div class="act-actions">
      <a class="btn btn-gold" href="${base}handouts/${a.id}.html">${ICON.print}${esc(t('act.printHandouts'))}</a>
      <button class="btn btn-line" type="button" onclick="window.print()">${esc(t('act.printGuide'))}</button>
    </div>
    </div>
  </div>
  <div class="act-grid">
    <aside class="glance" aria-label="${esc(t('act.glance'))}">
      <dl>
        <div><dt>${esc(t('act.time'))}</dt><dd>${ICON.clock}${esc(t('minutes', { n: a.minutes }))}</dd></div>
        <div><dt>${esc(t('act.mode'))}</dt><dd class="mode m-${a.mode}">${ICON[a.mode]}${esc(t('mode.' + a.mode))}</dd></div>
        <div><dt>${esc(t(a.audience === 'pl' ? 'act.for' : 'act.grades'))}</dt><dd>${esc(a.audience === 'pl' ? whoLabel(a) : gradeList(a))}</dd></div>
        ${a.audience === 'pl' ? `<div><dt>${esc(t('act.serving'))}</dt><dd>${esc(gradeList(a))}</dd></div>` : ''}
        <div><dt>${esc(t('act.group'))}</dt><dd>${esc(a.groupSize)}</dd></div>
        <div><dt>${esc(t('act.strands'))}</dt><dd class="chips">${strandChips(a)}</dd></div>
      </dl>
      <h2 class="glance-h">${esc(t('act.indicators'))}</h2>
      <ul class="indicators">${indicators}</ul>
      <h2 class="glance-h">${esc(t('act.handouts'))}</h2>
      <ul class="handout-list">${handoutList}</ul>
      <p class="glance-print"><a class="btn btn-gold" href="${base}handouts/${a.id}.html">${ICON.print}${esc(t('act.printHandouts'))}</a></p>
    </aside>
    <div class="act-main">
      <section><h2>${esc(t('act.overview'))}</h2><p class="overview">${md(a.overview)}</p>
        <h3 class="sub">${esc(t('act.objectives'))}</h3>${list(a.objectives)}</section>
      <section class="two">
        <div><h2>${esc(t('act.materials'))}</h2>
          <h3 class="sub">${esc(t('act.onPaper'))}</h3>${a.materials.print.length ? list(a.materials.print) : `<p class="muted">${esc(t('act.none'))}</p>`}
          <h3 class="sub">${esc(t('act.onScreen'))}</h3>${a.materials.digital.length ? list(a.materials.digital) : `<p class="muted">${esc(t('act.noneNeeded'))}</p>`}</div>
        <div><h2>${esc(t('act.prep'))}</h2><ol class="prep">${a.prep.map(x => `<li>${md(x)}</li>`).join('')}</ol></div>
      </section>
      <section><h2>${esc(t('act.steps'))}</h2><ol class="steps">${steps}</ol></section>
      <section class="paths">
        <h2>${esc(t('act.paths'))}</h2>
        <div class="path"><h3>${ICON.unplugged}${esc(t('act.unplugged'))}</h3><p>${md(a.unplugged)}</p></div>
        <div class="path"><h3>${ICON.digital}${esc(t('act.digital'))}</h3><p>${md(a.digital)}</p></div>
        <p class="why"><strong>${esc(t('act.why'))}</strong> ${md(a.whyTech)}</p>
      </section>
      <section class="evidence"><h2>${esc(t('act.evidence'))}</h2><p class="muted">${esc(t('act.evidenceSub'))}</p>${list(a.lookFors)}</section>
      <section><h2>${esc(t('act.adaptations'))}</h2><dl class="adapt">${a.adaptations.map(x => `<div><dt>${esc(x.label)}</dt><dd>${md(x.text)}</dd></div>`).join('')}</dl></section>
      ${STD[a.id] ? `<section class="stds"><h2>${esc(t('act.standards'))}</h2>${STD[a.id].note ? `<p>${esc(a.stdNote || STD[a.id].note)}</p>` : ''}<dl>${STD_GROUPS.filter(g => STD[a.id][g].length).map(g => `<div><dt>${esc(t('std.group.' + g))}</dt><dd>${STD[a.id][g].map(c => stdChip(g, c, base)).join('')}${g === 'teks' && teksSections(a) ? `<span class="std-sec">${esc(t('act.teksSections', { list: teksSections(a) }))}</span>` : ''}</dd></div>`).join('')}</dl><p class="std-more noprint"><a href="${base}standards.html#table">${esc(t('act.standardsMore'))}</a></p></section>` : ''}
      <section class="two">
        <div><h2>${esc(t('act.reflect'))}</h2>${list(a.reflection)}</div>
        <div><h2>${esc(t(a.audience === 'pl' ? 'act.transferPL' : 'act.transferStudent'))}</h2><p>${md(a.transfer)}</p></div>
      </section>
      ${a.connections && a.connections.length ? `<section><h2>${esc(t('act.connections'))}</h2><ul class="connections">${a.connections.map(c => `<li><a href="${esc(c.url)}">${esc(c.title)}</a>${c.note ? `<span>${md(c.note)}</span>` : ''}</li>`).join('')}</ul></section>` : ''}
      <section class="related noprint"><h2>${esc(t('act.related'))}</h2><div class="cards">${related.map(b => card(b, base, root)).join('')}</div></section>
    </div>
  </div>
</main>`;
    page({ pagePath: `activities/${a.id}.html`, title: `${a.title} | ${t('site.titleSuffix')}`, desc: a.tagline, body, untranslated: !a.translated });
  }

  // ---------- handouts ----------
  function handoutPage(a) {
    const base = '../', root = rootFrom(1);
    const sheetHead = (h, { name = true } = {}) => `<header class="sh-head">
    <div><p class="sh-kicker">${esc(t('ho.kicker', { id: h.id, title: a.title }))}</p><h2>${esc(h.title)}</h2></div>
    ${name ? `<div class="sh-name"><span>${esc(t('ho.name'))}</span><span>${esc(t('ho.date'))}</span></div>` : ''}
  </header>${h.instructions ? `<p class="sh-instr">${md(h.instructions)}</p>` : ''}`;
    let curH = null, firstOfH = false;
    const sheet = (inner, cls = '') => { const tag = curH ? ` data-h="${esc(curH)}"${firstOfH ? ` id="handout-${esc(curH)}"` : ''}` : ''; firstOfH = false; return `<section class="sheet ${cls}"${tag}>${inner}<footer class="sh-foot">${esc(t('ho.footer', { title: a.title }))}</footer></section>`; };
    const chunk = (arr, n) => arr.reduce((o, x, i) => (i % n ? o[o.length - 1].push(x) : o.push([x]), o), []);
    const pageNote = (p, n) => (n > 1 ? `<p class="sh-page">${esc(t('ho.sheetOf', { n: p + 1, total: n }))}</p>` : '');
    const keyHead = h => `<h3>${esc(t('ho.keyHead', { id: h.id, title: h.title }))}</h3>`;

    function renderHandout(h) {
      const out = [], key = [];
      switch (h.type) {
        case 'cards': {
          const pages = chunk(h.cards, 8);
          pages.forEach((cs, p) => out.push(sheet(`${sheetHead(h, { name: false })}${pageNote(p, pages.length)}
        <div class="cutgrid">${cs.map(c => `<div class="cut">${c.label ? `<p class="cut-label">${esc(c.label)}</p>` : ''}<p>${md(c.front)}</p></div>`).join('')}</div>`, 'sheet-cards')));
          if (h.cards.some(c => c.back)) key.push(`${keyHead(h)}<dl class="key">${h.cards.map((c, i) => `<div><dt>${esc(c.label || t('ho.card', { n: i + 1 }))}</dt><dd>${md(c.back || '')}</dd></div>`).join('')}</dl>`);
          break;
        }
        case 'sort': {
          out.push(sheet(`${sheetHead(h)}<div class="mat" style="--cols:${h.categories.length}">${h.categories.map(c => `<div class="mat-col"><h3>${esc(c)}</h3></div>`).join('')}</div>`, 'sheet-mat'));
          const pages = chunk(h.items, 12);
          pages.forEach((its, p) => out.push(sheet(`${sheetHead({ ...h, title: t('ho.toSort', { title: h.title }), instructions: t('ho.toSortInstr') }, { name: false })}${pageNote(p, pages.length)}<div class="cutgrid strips">${its.map(it => `<div class="cut"><p>${md(it.text)}</p></div>`).join('')}</div>`, 'sheet-cards')));
          key.push(`${keyHead(h)}<table class="keytable"><thead><tr><th>${esc(t('ho.item'))}</th><th>${esc(t('ho.sort'))}</th><th>${esc(t('ho.why'))}</th></tr></thead><tbody>${h.items.map(it => `<tr><td>${md(it.text)}</td><td><strong>${esc(it.answer)}</strong></td><td>${md(it.why || '')}</td></tr>`).join('')}</tbody></table>`);
          break;
        }
        case 'worksheet':
          out.push(sheet(`${sheetHead(h)}<ol class="ws">${h.sections.map(s => `<li><p>${md(s.prompt.replace(/^\s*\d+[.)]\s+/, ''))}</p>${s.boxes ? `<div class="ws-box" style="--h:${Math.max(3, s.lines || 5)}"></div>` : `<div class="ws-lines" style="--n:${s.lines || 3}"></div>`}</li>`).join('')}</ol>`));
          break;
        case 'table': {
          const rows = [...(h.rows || []), ...Array.from({ length: h.blankRows || 0 }, () => h.columns.map(() => ''))];
          out.push(sheet(`${sheetHead(h)}<table class="org" style="--cols:${h.columns.length}"><thead><tr>${h.columns.map(c => `<th>${md(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, i) => `<td${i === 0 && c ? ' class="rowhead"' : ''}>${md(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`));
          break;
        }
        case 'checklist': {
          const scale = h.scale && h.scale.length ? h.scale : null;
          out.push(sheet(`${sheetHead(h)}<table class="check"><thead><tr><th>${scale ? '' : `<span class="sr">${esc(t('ho.done'))}</span>`}</th>${scale ? scale.map(s => `<th class="sc">${esc(s)}</th>`).join('') : ''}</tr></thead><tbody>${h.items.map(it => scale
            ? `<tr><td>${md(it)}</td>${scale.map(() => '<td class="sc"><span class="box"></span></td>').join('')}</tr>`
            : `<tr><td><span class="box"></span>${md(it)}</td></tr>`).join('')}</tbody></table><div class="notes"><p>${esc(t('ho.notes'))}</p><div class="ws-lines" style="--n:4"></div></div>`));
          break;
        }
        case 'reading':
          out.push(sheet(`${sheetHead(h, { name: false })}<div class="reading">${h.paragraphs.map((p, i) => `<p><span class="pn">${i + 1}</span><span>${md(p)}</span></p>`).join('')}</div>`, 'sheet-reading'));
          break;
        case 'rubric':
          out.push(sheet(`${sheetHead(h)}<table class="rubric"><thead><tr><th>${esc(t('ho.criterion'))}</th>${h.levels.map(l => `<th>${esc(l)}</th>`).join('')}</tr></thead><tbody>${h.criteria.map(c => `<tr><th scope="row">${esc(c.name)}</th>${c.descriptors.map(d => `<td>${md(d)}</td>`).join('')}</tr>`).join('')}</tbody></table>`));
          break;
      }
      return { out, key };
    }

    const parts = a.handouts.map(h => { curH = h.id; firstOfH = true; const r = renderHandout(h); curH = null; return r; });
    const keys = parts.flatMap(p => p.key);
    const young = a.grades.every(g => g === 'K-2' || g === '3-5');
    const im = imgFor(a);
    const count = a.handouts.length === 1 ? t('ho.countOne') : t('ho.countMany', { n: a.handouts.length });
    const body = `
<main id="main" class="packet"${a.translated ? '' : ' lang="en"'}>
  <div class="packet-bar noprint">
    <div>
      <p class="crumbs"><a href="${base}activities/${a.id}.html">${esc(a.title)}</a> <span aria-hidden="true">/</span> ${esc(t('ho.crumb'))}</p>
      <h1>${esc(t('ho.pageTitle', { title: a.title }))}</h1>
      <p>${esc(t('ho.intro', { count, key: keys.length ? t('ho.withKey') : '' }))}</p>
    </div>
    <div class="packet-actions">
      <button class="btn btn-gold" type="button" onclick="window.print()">${ICON.print}${esc(t('ho.printAll'))}</button>
      <label class="toggle"><input type="checkbox" id="addcover"> ${esc(t('ho.addCover'))}</label>
      ${keys.length ? `<label class="toggle"><input type="checkbox" id="hidekey"> ${esc(t('ho.hideKey'))}</label>` : ''}
    </div>
    <nav class="only-bar" aria-label="${esc(t('ho.printOne'))}"><span>${esc(t('ho.printOne'))}</span>${a.handouts.map(h => `<a href="?only=${esc(h.id)}#handout-${esc(h.id)}" data-only="${esc(h.id)}"><span class="hl">${esc(h.id)}</span> ${esc(h.title)}</a>`).join('')}<a href="${base}handouts/${a.id}.html" class="only-all" hidden>${esc(t('ho.showAll'))}</a></nav>
  </div>
  <div class="sheets${young ? ' young' : ''}">
    ${sheet(`<div class="cover">
      ${im ? `<figure class="cover-photo">${pic(im, root, { lazy: false })}</figure>` : ''}
      <p class="sh-kicker">${esc(audienceLabel(a))} · ${esc(whoLabel(a))} · ${esc(t('minutes', { n: a.minutes }))}</p>
      <h2 class="cover-title">${esc(a.title)}</h2>
      <p class="cover-lede">${md(a.tagline)}</p>
      <p>${md(a.overview)}</p>
      <h3>${esc(t('ho.inPacket'))}</h3>
      <ul>${a.handouts.map(h => `<li>${esc(t('ho.packetItem', { id: h.id, title: h.title, type: htype(h.type) }))}</li>`).join('')}${keys.length ? `<li>${esc(t('ho.keyItem'))}</li>` : ''}</ul>
      <h3>${esc(t('ho.coverEles'))}</h3>
      <ul>${a.eles.map(id => `<li><strong>${id}</strong> ${esc(IND[id].text)}</li>`).join('')}</ul>
      <p class="cover-url">${esc(t('ho.coverUrl', { url: `mglearn.github.io/eles/${prefix}activities/${a.id}.html` }))}</p>
    </div>`, 'sheet-cover')}
    ${parts.flatMap(p => p.out).join('\n')}
    ${keys.length ? sheet(`<header class="sh-head"><div><p class="sh-kicker">${esc(t('ho.keyKicker', { title: a.title }))}</p><h2>${esc(t('ho.keyTitle'))}</h2></div></header>${keys.join('')}`, 'sheet-key') : ''}
  </div>
</main>`;
    page({ pagePath: `handouts/${a.id}.html`, title: `${t('ho.metaTitle', { title: a.title })} | ${t('site.titleSuffix')}`, desc: t('ho.metaDesc', { title: a.title }), body, bodyClass: 'is-packet no-cover', untranslated: !a.translated,
      scripts: `<script src="{root}assets/fit.js"></script><script>document.getElementById('hidekey')?.addEventListener('change',e=>document.body.classList.toggle('no-key',e.target.checked));document.getElementById('addcover').addEventListener('change',e=>document.body.classList.toggle('no-cover',!e.target.checked));(function(){var o=new URLSearchParams(location.search).get('only');if(!o)return;document.body.classList.add('only-one');document.querySelectorAll('.sheet').forEach(function(s){if(s.dataset.h!==o)s.hidden=true});document.querySelectorAll('[data-only]').forEach(function(a){if(a.dataset.only===o)a.setAttribute('aria-current','true')});document.querySelector('.only-all').hidden=false;})();</script>` });
  }

  // ---------- index ----------
  function indexPage() {
    const root = rootFrom(0);
    const nPL = acts.filter(a => a.audience === 'pl').length;
    const max = Math.max(1, ...ELES.roles.flatMap(r => r.areas.map(a => areaCount(a.id))));
    const matrix = `<div class="matrix" role="group" aria-label="${esc(t('home.matrixLabel'))}">
    <div class="mx-corner"></div>${[1, 2, 3, 4, 5].map(n => `<div class="mx-col">${n}.0</div>`).join('')}
    ${ELES.roles.map(r => `<div class="mx-row">${esc(r.short)}</div>${r.areas.map(ar => {
      const c = areaCount(ar.id);
      return `<button type="button" class="mx-cell lv${c === 0 ? 0 : c / max < 0.34 ? 1 : c / max < 0.67 ? 2 : 3}" data-area="${ar.id}" aria-label="${esc(t('home.cellLabel', { role: r.short, area: `${ar.num}.0 ${ar.title}`, n: c }))}"><span class="mx-title">${esc(ar.title)}</span><span class="mx-n">${c}</span></button>`;
    }).join('')}`).join('')}
  </div>`;
    const opt = (name, items) => items.map(([v, l]) => `<label class="pill"><input type="checkbox" name="${name}" value="${esc(v)}"><span>${esc(l)}</span></label>`).join('');
    const body = `
<main id="main">
  <section class="hero">
    <div class="hero-text">
      <h1>${esc(t('home.h1'))}</h1>
      <p>${esc(t('home.intro', { n: acts.length, pl: nPL, st: acts.length - nPL, un: acts.filter(a => a.mode === 'unplugged').length }))}</p>
      ${hasImg('hero-home') ? `<figure class="hero-photo">${pic('hero-home', root, { lazy: false })}</figure>` : ''}
      <p class="hero-note">${esc(t('home.note'))}</p>

    </div>
    <div class="hero-matrix">
      ${matrix}
      <p class="mx-caption">${esc(t('home.matrixCaption'))}</p>
      <form class="hero-search" role="search" action="#catalog" onsubmit="return false">
        <label for="hq" class="sr">${esc(t('hs.label'))}</label>
        <input id="hq" type="search" placeholder="${esc(t('hs.placeholder'))}" autocomplete="off">
        <button type="submit" class="btn btn-gold">${esc(t('hs.button'))}</button>
      </form>
      <p class="hero-topics"><span>${esc(t('hs.try'))}</span> ${HERO_TOPICS.map(id => `<a href="?q=${encodeURIComponent(t('topic.' + id))}#catalog" data-q="${esc(t('topic.' + id))}">${esc(t('topic.' + id))}</a>`).join(' ')}</p>
    </div>
  </section>

  <section id="catalog" class="catalog">
    <form class="filters" id="filters" aria-label="${esc(t('f.label'))}" onsubmit="return false">
      <div class="f-search"><label for="q">${esc(t('f.search'))}</label><input id="q" type="search" placeholder="${esc(t('f.placeholder'))}" autocomplete="off"><button type="button" class="btn btn-line f-toggle" id="ftoggle" aria-expanded="false" aria-controls="filters">${esc(t('f.show'))}</button></div>
      <fieldset><legend>${esc(t('f.who'))}</legend>${opt('audience', [['pl', t('f.educators')], ['student', t('f.students')]])}</fieldset>
      <fieldset><legend>${esc(t('f.strand'))}</legend>${opt('strand', STRANDS.map(s => [s, strandShort(s)]))}</fieldset>
      <fieldset><legend>${esc(t('f.grade'))}</legend>${opt('grade', [['K-2', 'K–2'], ['3-5', '3–5'], ['6-8', '6–8'], ['9-12', '9–12'], ['Higher Ed', t('grade.he')]])}</fieldset>
      <fieldset><legend>${esc(t('f.mode'))}</legend>${opt('mode', ['unplugged', 'digital', 'hybrid'].map(m => [m, t('mode.' + m)]))}</fieldset>
      <fieldset><legend>${esc(t('f.role'))}</legend>${opt('role', ['teachers', 'librarians', 'coaches', 'leaders', 'faculty', 'staff'].map(r => [r, t('role.' + r)]))}</fieldset>
      <fieldset><legend>${esc(t('f.time'))}</legend>${opt('time', [['30', t('f.t30')], ['60', t('f.t60')], ['61', t('f.t61')]])}</fieldset>
      <button type="button" class="btn btn-line" id="clear">${esc(t('f.clear'))}</button>
    </form>
    <div class="results">
      <div class="results-bar"><p id="count" aria-live="polite"></p><p id="areaNote" class="area-note" hidden></p></div>
      <div class="cards" id="cards">${acts.map(a => card(a, '', root)).join('')}</div>
      <p class="empty" id="empty" hidden>${esc(t('f.empty'))}</p>
    </div>
  </section>
</main>`;
    const uiForApp = Object.fromEntries(['f.show', 'f.hide', 'f.on', 'f.all', 'f.some', 'f.area', 'f.allAreas'].map(k => [k, t(k)]));
    page({ pagePath: 'index.html', title: t('home.title'), desc: t('home.desc'), body, bodyClass: 'home',
      scripts: `<script>window.ELE_UI=${JSON.stringify(uiForApp)};</script><script src="{root}assets/catalog${lang === 'en' ? '' : '.' + lang}.js"></script><script src="{root}assets/app.js"></script>` });
  }

  // ---------- framework ----------
  function frameworkPage() {
    const root = rootFrom(0);
    const photo = { T: 'teachers', S: 'students', L: 'leaders', C: 'coaches', AI: 'ai' };
    const body = `
<main id="main" class="fw">
  <div class="fw-head">
    <h1>${esc(t('fw.h1'))}</h1>
    <p class="lede">${esc(t('fw.lede'))}</p>
    ${hasImg('hero-framework') ? `<figure class="guide-photo">${pic('hero-framework', root, { lazy: false })}</figure>` : ''}
    ${INFOGRAPHICS.length ? `<section class="infographics" aria-labelledby="ig-h"><h2 id="ig-h">${esc(t('fw.visual'))}</h2><p class="muted">${esc(t('fw.visualSub'))}</p><div class="ig-strip">${INFOGRAPHICS.map(g => `<a href="${root}assets/img/eles/${g.file}.jpg" lang="en"><img src="${root}assets/img/eles/${g.file}-thumb.jpg" width="640" height="${Math.round(640 * g.h / g.w)}" alt="${esc(g.alt)}" loading="lazy" decoding="async"></a>`).join('')}</div></section>` : ''}
    <nav class="fw-tabs" aria-label="${esc(t('fw.roles'))}">${ELES.roles.map(r => `<a href="#${r.code}">${esc(r.short)}</a>`).join('')}</nav>
  </div>
  ${ELES.roles.map(r => `<section class="role" id="${r.code}">
    <div class="role-intro">
      <h2>${esc(r.name)}</h2>
      ${hasImg('role-' + photo[r.code]) ? `<figure class="role-photo">${pic('role-' + photo[r.code], root)}</figure>` : ''}
      <p>${esc(r.description)}</p>
      <blockquote><p>“${esc(r.quote.text)}”</p><cite>${esc(r.quote.author)}</cite></blockquote>
      <details><summary>${esc(t('fw.guiding'))}</summary><ul>${r.guidingQuestions.map(q => `<li>${esc(q)}</li>`).join('')}</ul></details>
    </div>
    ${r.areas.map(ar => `<div class="area" id="${ar.id}">
      <h3><span>${ar.num}.0</span>${esc(ar.title)}</h3>
      <ol class="ind">${ar.indicators.map(i => {
        const list = cover[i.id] || [];
        return `<li id="${i.id}"><div class="ind-text"><span class="ind-id">${i.id}</span><p>${esc(i.text)}</p>
          <details class="ind-ex"><summary>${esc(t('fw.example'))}</summary><p>${esc(i.example)}</p><p class="muted" lang="en">${esc(t(r.correlationLabel === 'TEKS' ? 'fw.corrTEKS' : 'fw.corrTEA'))}: ${esc(i.correlation)}</p></details></div>
          <div class="ind-acts">${list.length ? list.map(a => `<a href="activities/${a.id}.html"${a.translated ? '' : ' lang="en"'}><span class="dot d-${a.audience}"></span>${esc(a.title)}</a>`).join('') : `<span class="muted">${esc(t('fw.noActivity'))}</span>`}</div></li>`;
      }).join('')}</ol></div>`).join('')}
  </section>`).join('')}
  <p class="fw-source muted">${esc(t('fw.source'))}</p>
</main>`;
    page({ pagePath: 'framework.html', title: `${t('fw.title')} | ${t('site.titleSuffix')}`, desc: t('fw.desc'), body });
  }

  // ---------- guide ----------
  function guidePage() {
    const root = rootFrom(0);
    const li = keys => keys.map(k => `<li>${md(t(k))}</li>`).join('');
    const body = `
<main id="main" class="guide">
  <h1>${esc(t('g.title'))}</h1>
  <p class="lede">${esc(t('g.lede'))}</p>
  ${hasImg('hero-guide') ? `<figure class="guide-photo">${pic('hero-guide', root, { lazy: false })}</figure>` : ''}
  <section>
    <h2>${esc(t('g.s1.h'))}</h2>
    <p>${md(t('g.s1.p1'))}</p>
    <p>${md(t('g.s1.p2'))}</p>
  </section>
  <section>
    <h2>${esc(t('g.s2.h'))}</h2>
    <p>${md(t('g.s2.p'))}</p>
    <ol class="check5">${li(['g.s2.teacher', 'g.s2.student', 'g.s2.coach', 'g.s2.leader', 'g.s2.ai'])}</ol>
  </section>
  <section>
    <h2>${esc(t('g.s3.h'))}</h2>
    <dl class="strands">${STRANDS.map(k => `<div class="st-${k}"><dt>${esc(t(`strand.${k}.name`))}</dt><dd>${esc(t(`strand.${k}.desc`))} <a href="index.html?strand=${k}#catalog">${esc(t('g.s3.count', { n: acts.filter(a => a.strands.includes(k)).length }))}</a></dd></div>`).join('')}</dl>
  </section>
  <section>
    <h2>${esc(t('g.s4.h'))}</h2>
    <ul>${li(['g.s4.glance', 'g.s4.steps', 'g.s4.paths', 'g.s4.evidence', 'g.s4.adapt', 'g.s4.handouts'])}</ul>
  </section>
  <section>
    <h2>${esc(t('g.s5.h'))}</h2>
    <p>${md(t('g.s5.p'))}</p>
  </section>
  <section>
    <h2>${esc(t('g.s6.h'))}</h2>
    <ul>${li(['g.s6.a', 'g.s6.b', 'g.s6.c', 'g.s6.d'])}</ul>
  </section>
  <section id="screen-time">
    <h2>${esc(t('g.s8.h'))}</h2>
    <p>${md(t('g.s8.p1'))}</p>
    <p>${md(t('g.s8.p2'))}</p>
    <p>${md(t('g.s8.p3', { n: acts.filter(a => a.mode === 'unplugged').length }))}</p>
    <h3>${esc(t('g.s8.start'))}</h3>
    <ul class="st-acts">${SCREEN_ACTS.map(id => acts.find(a => a.id === id)).filter(Boolean).map(a => `<li><a href="activities/${a.id}.html"${a.translated ? '' : ' lang="en"'}>${esc(a.title)}</a> <span class="muted">${esc(a.audience === 'pl' ? t('aud.pl') : gradeList(a))}</span></li>`).join('')}</ul>
    <p><a href="index.html?mode=unplugged#catalog">${esc(t('g.s8.unplugged', { n: acts.filter(a => a.mode === 'unplugged').length }))}</a></p>
    <h3>${esc(t('g.s8.sources'))}</h3>
    <ul class="sources">
      <li><a href="https://capitol.texas.gov/tlodocs/89R/billtext/html/HB01481F.htm">${esc(t('g.s8.src1'))}</a></li>
      <li><a href="https://publications.aap.org/pediatrics/article/157/2/e2025075320/206129/Digital-Ecosystems-Children-and-Adolescents-Policy">${esc(t('g.s8.src2'))}</a></li>
      <li><a href="https://www.healthychildren.org/English/fmp/Pages/MediaPlan.aspx">${esc(t('g.s8.src3'))}</a></li>
      <li><a href="https://www.commonsensemedia.org/sites/default/files/research/report/8-18-census-integrated-report-final-web_0.pdf">${esc(t('g.s8.src4'))}</a></li>
    </ul>
  </section>
  <section>
    <h2>${esc(t('g.s7.h'))}</h2>
    <p>${fill(md(UI['g.s7.p']), { assistant: `<a href="https://mglearn.github.io/tcea/eles/">${esc(t('foot.assistant'))}</a>`, pdf: `<a href="https://tinyurl.com/tceaeles1">${esc(t('g.s7.pdf'))}</a>` })}</p>
  </section>
</main>`;
    page({ pagePath: 'guide.html', title: `${t('g.title')} | ${t('site.titleSuffix')}`, desc: t('g.desc'), body });
  }

  // ---------- standards ----------
  function standardsPage() {
    const used = (g, c) => acts.filter(a => STD[a.id] && STD[a.id][g].includes(c)).length;
    const codeList = (g, codes) => `<ul class="codes${g === 'teks' || g === 'sst' ? ' nocode' : ''}">${codes.map(c => `<li id="${g}-${c.replace(/\./g, '-')}">${g === 'elps' || g === 'udl' ? `<span class="code">${g === 'elps' ? '(c)(' + c.slice(1) + ')' : c}</span>` : ''}<span>${esc(stdLabel(g, c))}</span><a class="muted" href="#table" data-filter="${g}:${c}">${esc(t('std.used', { n: used(g, c) }))}</a></li>`).join('')}</ul>`;
    const udlGroups = [['engagement', ['7', '8', '9']], ['representation', ['1', '2', '3']], ['action', ['4', '5', '6']]];
    const rows = acts.map(a => {
      const st = STD[a.id];
      const cell = g => !st ? '' : st[g].length ? st[g].map(c => stdChip(g, c, '')).join('') : `<span class="muted">${esc(t(g === 'sst' || g === 'teks' ? 'std.table.na' : 'std.table.none'))}</span>`;
      const codes = st ? STD_GROUPS.flatMap(g => st[g].map(c => g + ':' + c)).join(' ') : '';
      return `<tr data-codes="${codes}" data-text="${esc(norm(a.title + ' ' + a.grades.join(' ') + ' ' + codes))}"${a.translated ? '' : ' lang="en"'}><th scope="row"><a href="activities/${a.id}.html">${esc(a.title)}</a><span class="muted">${esc(audienceLabel(a))} · ${esc(a.audience === 'pl' ? whoLabel(a) : gradeList(a))}</span></th>${STD_GROUPS.map(g => `<td>${cell(g)}</td>`).join('')}</tr>`;
    }).join('');
    const body = `
<main id="main" class="stdpage">
  <h1>${esc(t('std.title'))}</h1>
  <p class="lede">${esc(t('std.lede'))}</p>
  <p class="muted">${esc(t('std.disclaimer'))}</p>
  ${hasImg('hero-standards') ? `<figure class="guide-photo">${pic('hero-standards', '', { lazy: false })}</figure>` : ''}
  <nav class="fw-tabs" aria-label="${esc(t('std.jump'))}"><a href="#sst">${esc(t('std.group.sst'))}</a><a href="#teks">TEKS</a><a href="#elps">ELPS</a><a href="#udl">UDL</a><a href="#table">${esc(t('std.table.h'))}</a></nav>
  <section id="sst"><h2>${esc(t('std.sst.h'))}</h2><p>${md(t('std.sst.p1'))}</p><p>${md(t('std.sst.p2'))}</p><p>${md(t('std.sst.p3'))}</p>
    ${codeList('sst', Object.keys(STD_CAT.sst))}
    <p class="links"><a href="https://tea.texas.gov/data-reports/student-assessment-overview/house-bill-8-student-assessment">${esc(t('std.sst.tea'))}</a> <a href="https://mglearn.github.io/activities/sst/">${esc(t('std.sst.hub'))}</a></p></section>
  <section id="teks"><h2>${esc(t('std.teks.h'))}</h2><p>${md(t('std.teks.p1'))}</p><p>${md(t('std.teks.p2'))}</p><p>${md(t('std.teks.p3'))}</p>${codeList('teks', Object.keys(STD_CAT.teks))}</section>
  <section id="elps"><h2>${esc(t('std.elps.h'))}</h2><p>${md(t('std.elps.p1'))}</p>${codeList('elps', Object.keys(STD_CAT.elps))}<p>${md(t('std.elps.p2'))}</p>
    <h3>${esc(t('std.elps.tips'))}</h3><ul>${['t1', 't2', 't3', 't4', 't5'].map(k => `<li>${md(t('std.elps.' + k))}</li>`).join('')}</ul></section>
  <section id="udl"><h2>${esc(t('std.udl.h'))}</h2><p>${md(t('std.udl.p1'))}</p><p>${md(t('std.udl.p2'))}</p>
    <div class="udl-cols">${udlGroups.map(([k, nums]) => `<div><h3>${esc(t('std.udl.' + k))}</h3>${codeList('udl', Object.keys(STD_CAT.udl).filter(c => nums.includes(c.split('.')[0])))}</div>`).join('')}</div></section>
  <section id="table"><h2>${esc(t('std.table.h'))}</h2>
    <label class="tfilter"><span>${esc(t('std.table.filter'))}</span><input type="search" id="tq" placeholder="${esc(t('std.table.placeholder'))}"></label>
    <div class="table-wrap"><table class="align"><thead><tr><th>${esc(t('std.table.activity'))}</th>${STD_GROUPS.map(g => `<th>${esc(t('std.group.' + g))}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div></section>
</main>`;
    page({ pagePath: 'standards.html', title: `${t('std.title')} | ${t('site.titleSuffix')}`, desc: t('std.desc'), body,
      scripts: `<script>(function(){var q=document.getElementById('tq'),rows=[].slice.call(document.querySelectorAll('.align tbody tr'));function n(s){return s.normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase()}function go(){var v=n(q.value.trim());rows.forEach(function(r){r.hidden=v&&!(r.dataset.text.indexOf(v)>=0||r.dataset.codes.split(' ').indexOf(v)>=0)})}q.addEventListener('input',go);document.querySelectorAll('[data-filter]').forEach(function(a){a.addEventListener('click',function(){q.value=a.dataset.filter;go()})});var h=location.hash.match(/^#(teks|elps|udl|sst)-(.+)$/);})();</script>` });
  }

  // ---------- catalog data ----------
  function catalogJs() {
    const rows = acts.map(a => ({
      id: a.id, audience: a.audience, roles: a.roles || [], grades: a.grades, strands: a.strands, mode: a.mode, minutes: a.minutes,
      areas: [...new Set(a.eles.map(areaOf))],
      // English text is always searchable too, so an English term finds the activity in any language
      text: norm([a.title, a.tagline, a.overview, a.eles.join(' '), a.eles.map(id => IND[id].text + ' ' + IND[id].area.title).join(' '),
        a.strands.map(s => t(`strand.${s}.name`)).join(' '), a.handouts.map(h => h.title).join(' '), a.steps.map(s => s.title).join(' '), a.grades.join(' '),
        ...(lang === 'en' ? [] : (() => { const e = ACTS_EN.find(x => x.id === a.id); return [e.title, e.tagline]; })()),
        ...ACT_TOPICS[a.id].map(id => { const tp = TOPICS.find(x => x.id === id); return [tp.label, ...tp.synonyms, t('topic.' + id)].join(' '); })].join(' ')),
    }));
    const areas = {};
    for (const r of ELES.roles) for (const ar of r.areas) areas[ar.id] = `${r.short} ${ar.num}.0 ${ar.title}`;
    write(`assets/catalog${lang === 'en' ? '' : '.' + lang}.js`, `window.ELE_CATALOG=${JSON.stringify(rows)};\nwindow.ELE_AREAS=${JSON.stringify(areas)};\n`);
  }

  // ---------- write ----------
  fs.rmSync(path.join(ROOT, prefix, 'activities'), { recursive: true, force: true });
  fs.rmSync(path.join(ROOT, prefix, 'handouts'), { recursive: true, force: true });
  for (const a of acts) { activityPage(a); handoutPage(a); }
  indexPage(); frameworkPage(); guidePage(); standardsPage(); catalogJs();
  const done = acts.filter(a => a.translated).length;
  return { acts, cover, IND, done };
}

// ======================================================================
for (const L of ALL_LANGS) if (L.code !== 'en' && !LANGS.includes(L)) fs.rmSync(path.join(ROOT, L.code), { recursive: true, force: true });
let summary;
for (const L of LANGS) {
  const r = buildLang(L);
  if (L.code === 'en') summary = r;
  else console.log(`  ${L.code}: ${r.done}/${r.acts.length} activities translated`);
}
// 404 (English; GitHub Pages serves one for the whole site)
const UI = UI_EN;
write('404.html', `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(UI['404.title'])} | ${esc(UI['site.titleSuffix'])}</title>${FONTS}<link rel="stylesheet" href="/eles/assets/site.css"></head><body><header class="topbar"><a class="brand" href="/eles/"><span class="brand-mark" aria-hidden="true">ELE</span><span>${esc(UI['site.name'])}</span></a></header><main id="main" class="guide"><h1>${esc(UI['404.h1'])}</h1><p class="lede">${fill(esc(UI['404.p']), { link: `<a href="/eles/">${esc(UI['404.link'])}</a>` })}</p></main></body></html>`);
if (DRAFTS.length) console.log(`Drafts not published (no standards.json entry yet): ${DRAFTS.join(', ')}`);
console.log(`Built ${summary.acts.length} activities (${summary.acts.filter(a => a.audience === 'pl').length} PL, ${summary.acts.filter(a => a.audience === 'student').length} student) in ${LANGS.map(l => l.code).join(', ')}. ELE coverage: ${Object.keys(summary.cover).length}/75 indicators.`);
const missing = Object.keys(summary.IND).filter(id => !summary.cover[id]);
if (missing.length) console.log('Uncovered:', missing.join(' '));
