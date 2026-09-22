#!/usr/bin/env node
// Translation tooling, modeled on Contraband's id|text workflow.
//
// English JSON is the source. Translations live in data/i18n/<lang>/ as flat
// overlays { "<path>": "<text>" }; anything missing falls back to English.
// Translators never edit JSON: they get plain `path|text` lines.
//
//   node scripts/i18n.js extract <lang> [dir]   write <dir>/<lang>/<unit>.txt for untranslated strings
//   node scripts/i18n.js assemble <lang> [dir]  read <dir>/<lang>/<unit>.txt -> data/i18n/<lang>/…json
//   node scripts/i18n.js check <lang> <unit…>   validate draft translations without writing
//   node scripts/i18n.js status [lang]          coverage report
//
// Units: "ui" (site chrome, from data/i18n/en/ui.json), "eles" (framework), and one
// per activity id. Default drafts dir: $ELE_DRAFTS or ./.drafts (git-ignored).
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const I18N = path.join(ROOT, 'data/i18n');
const ACT_DIR = path.join(ROOT, 'data/activities');

// Fields that are data, not prose. Never extracted.
const SKIP = [
  /^id$/, /^audience$/, /^roles\.\d+$/, /^grades\.\d+$/, /^strands\.\d+$/, /^mode$/, /^eles\.\d+$/,
  /^steps\.\d+\.phase$/, /^connections\.\d+\.url$/, /^handouts\.\d+\.(id|type)$/,
  /^handouts\.\d+\.items\.\d+\.answer$/,           // derived from the translated category
  /^roles\.\d+\.(code|activityLabel|correlationLabel)$/, /^roles\.\d+\.quote\.author$/,
  /^roles\.\d+\.areas\.\d+\.(id|num)$/, /^roles\.\d+\.areas\.\d+\.indicators\.\d+\.(id|correlation)$/,
  /^source$/,
  /^weeks\.\d+\.(week|ele)$/, /^weeks\.\d+\.days\.\d+\.(kind|format|strand|related|scene)$/,
  /^openers\.\d+\.(id|grades\.\d+|strands\.\d+|eles\.\d+|format|mode|related)$/,
];

function flatten(obj, prefix = '', out = {}) {
  if (typeof obj === 'string') { out[prefix] = obj; return out; }
  if (Array.isArray(obj)) obj.forEach((v, i) => flatten(v, prefix ? `${prefix}.${i}` : String(i), out));
  else if (obj && typeof obj === 'object') for (const [k, v] of Object.entries(obj)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  return out;
}
const translatable = flat => Object.fromEntries(Object.entries(flat).filter(([k, v]) => v.trim() && !SKIP.some(r => r.test(k))));

function units() {
  const u = { ui: JSON.parse(fs.readFileSync(path.join(I18N, 'en/ui.json'), 'utf8')) };
  u.eles = translatable(flatten(JSON.parse(fs.readFileSync(path.join(ROOT, 'data/eles.json'), 'utf8'))));
  const opDir = path.join(ROOT, 'data/openers');
  if (fs.existsSync(opDir)) for (const f of fs.readdirSync(opDir).filter(f => f.endsWith('.json')).sort())
    u['openers-' + path.basename(f, '.json')] = translatable(flatten(JSON.parse(fs.readFileSync(path.join(opDir, f), 'utf8'))));
  const calDir = path.join(ROOT, 'data/calendar');
  if (fs.existsSync(calDir)) for (const f of fs.readdirSync(calDir).filter(f => f.endsWith('.json')).sort())
    u['calendar-' + path.basename(f, '.json')] = translatable(flatten(JSON.parse(fs.readFileSync(path.join(calDir, f), 'utf8'))));
  const std = path.join(ROOT, 'data/standards.json');
  if (fs.existsSync(std)) u.standards = Object.fromEntries(Object.entries(JSON.parse(fs.readFileSync(std, 'utf8'))).filter(([, v]) => v.note).map(([k, v]) => [`${k}.note`, v.note]));
  for (const f of fs.readdirSync(ACT_DIR).filter(f => f.endsWith('.json')).sort())
    u[path.basename(f, '.json')] = translatable(flatten(JSON.parse(fs.readFileSync(path.join(ACT_DIR, f), 'utf8'))));
  return u;
}
const overlayPath = (lang, unit) => unit === 'ui' || unit === 'eles' || unit === 'standards'
  ? path.join(I18N, lang, `${unit}.json`)
  : unit.startsWith('calendar-') ? path.join(I18N, lang, 'calendar', `${unit.slice(9)}.json`)
  : unit.startsWith('openers-') ? path.join(I18N, lang, 'openers', `${unit.slice(8)}.json`)
  : path.join(I18N, lang, 'activities', `${unit}.json`);
function readOverlay(lang, unit) {
  const p = overlayPath(lang, unit);
  if (!fs.existsSync(p)) return {};
  const o = JSON.parse(fs.readFileSync(p, 'utf8'));
  return o.strings || o;
}

// Markers that must survive translation unchanged in number.
function markers(s) {
  return {
    bold: (s.match(/\*\*/g) || []).length,
    vars: (s.match(/\{[a-z]+\}/g) || []).sort().join(','),
    ids: (s.match(/\b(?:AI|[TSLC])\d\.\d\b/g) || []).sort().join(','),
  };
}

function extract(lang, dir) {
  const out = path.join(dir, lang);
  fs.mkdirSync(out, { recursive: true });
  let n = 0, files = 0;
  for (const [unit, strings] of Object.entries(units())) {
    const have = readOverlay(lang, unit);
    const todo = Object.entries(strings).filter(([k]) => !have[k]);
    if (!todo.length) continue;
    const lines = todo.map(([k, v]) => `${k}|${v.replace(/\r?\n/g, ' ')}`);
    fs.writeFileSync(path.join(out, `${unit}.en.txt`), lines.join('\n') + '\n');
    n += todo.length; files++;
  }
  console.log(`${lang}: ${n} strings in ${files} files -> ${out}/<unit>.en.txt`);
  console.log(`Translate each into ${out}/<unit>.${lang}.txt, same path|text lines, then run: assemble ${lang}`);
}

function assemble(lang, dir, { write = true, only = null } = {}) {
  const src = path.join(dir, lang);
  const all = units();
  let ok = 0, problems = 0;
  for (const f of fs.readdirSync(src).filter(f => f.endsWith(`.${lang}.txt`)).sort()) {
    const unit = f.slice(0, -`.${lang}.txt`.length);
    if (only && !only.includes(unit)) continue;
    const strings = all[unit];
    if (!strings) { console.log(`✗ ${f}: unknown unit`); problems++; continue; }
    const tr = {};
    const errs = [];
    fs.readFileSync(path.join(src, f), 'utf8').split(/\r?\n/).forEach((line, i) => {
      if (!line.trim()) return;
      const bar = line.indexOf('|');
      if (bar < 1) return errs.push(`line ${i + 1}: no path|text`);
      const k = line.slice(0, bar).trim(), v = line.slice(bar + 1).trim();
      if (!(k in strings)) return errs.push(`line ${i + 1}: unknown path ${k}`);
      if (!v) return errs.push(`${k}: empty`);
      const a = markers(strings[k]), b = markers(v);
      if (a.bold !== b.bold) errs.push(`${k}: ** count ${a.bold} → ${b.bold}`);
      if (a.vars !== b.vars) errs.push(`${k}: placeholders {…} changed`);
      if (a.ids !== b.ids) errs.push(`${k}: ELE ids changed (${a.ids} → ${b.ids})`);
      tr[k] = v;
    });
    const merged = { ...readOverlay(lang, unit), ...tr };
    const missing = Object.keys(strings).filter(k => !merged[k]);
    if (errs.length) { console.log(`✗ ${unit}: ${errs.length} problem(s)`); errs.slice(0, 12).forEach(e => console.log('   ' + e)); problems++; continue; }
    if (!write) {
      const miss = Object.keys(strings).filter(k => !tr[k]);
      if (miss.length) { console.log(`✗ ${unit}: ${miss.length} line(s) missing: ${miss.slice(0, 8).join(', ')}`); problems++; }
      else { console.log(`✓ ${unit}`); ok++; }
      continue;
    }
    const p = overlayPath(lang, unit);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    // keep only current paths, in source order
    const clean = Object.fromEntries(Object.keys(strings).filter(k => merged[k]).map(k => [k, merged[k]]));
    fs.writeFileSync(p, JSON.stringify(clean, null, 1) + '\n');
    ok++;
    if (missing.length) console.log(`! ${unit}: ${missing.length} string(s) still English: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '…' : ''}`);
  }
  if (only) for (const u of only) if (!fs.existsSync(path.join(src, `${u}.${lang}.txt`))) { console.log(`✗ ${u}: no ${u}.${lang}.txt yet`); problems++; }
  console.log(`${lang}: ${write ? 'assembled' : 'checked'} ${ok} unit(s), ${problems} with problems.`);
  process.exit(problems ? 1 : 0);
}

function status(only) {
  const all = units();
  const langs = only ? [only] : fs.readdirSync(I18N).filter(l => l !== 'en');
  for (const lang of langs) {
    let total = 0, done = 0; const partial = [];
    for (const [unit, strings] of Object.entries(all)) {
      const have = readOverlay(lang, unit);
      const n = Object.keys(strings).length, d = Object.keys(strings).filter(k => have[k]).length;
      total += n; done += d;
      if (d < n) partial.push(`${unit} ${d}/${n}`);
    }
    console.log(`${lang}: ${done}/${total} strings (${(100 * done / total).toFixed(1)}%)`);
    if (partial.length) console.log('  incomplete: ' + partial.slice(0, 20).join('; ') + (partial.length > 20 ? ` … +${partial.length - 20}` : ''));
  }
}

module.exports = { flatten, translatable, readOverlay, SKIP };

if (require.main === module) {
  const [cmd, lang, dir = process.env.ELE_DRAFTS || path.join(ROOT, '.drafts')] = process.argv.slice(2);
  if (cmd === 'extract' && lang) extract(lang, dir);
  else if (cmd === 'assemble' && lang) assemble(lang, dir);
  else if (cmd === 'check' && lang) assemble(lang, process.env.ELE_DRAFTS || path.join(ROOT, '.drafts'), { write: false, only: process.argv.slice(4).length ? process.argv.slice(4) : null });
  else if (cmd === 'status') status(lang);
  else console.log('usage: node scripts/i18n.js extract|assemble <lang> [dir] | status [lang]');
}
