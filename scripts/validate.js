#!/usr/bin/env node
// Validates every data/activities/*.json against data/SCHEMA.md.
// Usage: node scripts/validate.js [file ...]   (exit 1 on any error)
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ELES = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/eles.json'), 'utf8'));
const INDICATORS = new Set();
for (const r of ELES.roles) for (const a of r.areas) for (const i of a.indicators) INDICATORS.add(i.id);

const SCHEMA = fs.readFileSync(path.join(ROOT, 'data/SCHEMA.md'), 'utf8');
const APPROVED = new Set((SCHEMA.match(/\| (https:\/\/[^\s|]+) \|/g) || []).map(s => s.slice(2, -2)));

const ENUM = {
  audience: ['pl', 'student'],
  roles: ['teachers', 'librarians', 'coaches', 'leaders', 'faculty', 'staff'],
  grades: ['K-2', '3-5', '6-8', '9-12', 'Higher Ed', 'K-12'],
  strands: ['genai', 'digcit', 'medialit'],
  mode: ['unplugged', 'digital', 'hybrid'],
  phase: ['Hook', 'Explore', 'Model', 'Practice', 'Apply', 'Create', 'Debrief', 'Reflect', 'Transfer'],
  handout: ['cards', 'sort', 'worksheet', 'table', 'checklist', 'reading', 'rubric'],
};
const PLACEHOLDER = /\b(lorem|ipsum|TODO|TBD|insert (an? )?(example|text|here)|placeholder)\b|\[[A-Z][A-Za-z ]+\]/;

function validate(file) {
  const errs = [];
  const warn = [];
  let a;
  try { a = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return { errs: [`invalid JSON: ${e.message}`], warn }; }
  const e = m => errs.push(m);
  const str = (k, min = 1) => { if (typeof a[k] !== 'string' || a[k].trim().length < min) e(`"${k}" must be a string (min ${min} chars)`); };
  const arr = (k, lo, hi, v = a[k]) => {
    if (!Array.isArray(v)) return e(`"${k}" must be an array`), false;
    if (v.length < lo || v.length > hi) e(`"${k}" needs ${lo}–${hi} entries (has ${v.length})`);
    return true;
  };
  const inEnum = (k, list, v) => { if (!list.includes(v)) e(`"${k}" value "${v}" not in [${list.join(', ')}]`); };

  const base = path.basename(file, '.json');
  if (a.id !== base) e(`"id" (${a.id}) must equal filename (${base})`);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.id || '')) e('"id" must be kebab-case');
  str('title', 4); str('tagline', 20); str('overview', 120); str('groupSize', 3);
  str('unplugged', 40); str('digital', 40); str('whyTech', 30); str('transfer', 30);
  inEnum('audience', ENUM.audience, a.audience);
  inEnum('mode', ENUM.mode, a.mode);
  if (a.audience === 'pl') { if (arr('roles', 1, 6)) a.roles.forEach(r => inEnum('roles', ENUM.roles, r)); }
  else if (a.roles && a.roles.length) e('"roles" is for PL activities only');
  if (arr('grades', 1, 5)) a.grades.forEach(g => inEnum('grades', ENUM.grades, g));
  if (arr('strands', 1, 3)) a.strands.forEach(s => inEnum('strands', ENUM.strands, s));
  if (!Number.isInteger(a.minutes) || a.minutes < 10 || a.minutes > 240) e('"minutes" must be an integer 10–240');
  if (arr('eles', 1, 5)) a.eles.forEach(id => { if (!INDICATORS.has(id)) e(`unknown ELE indicator "${id}"`); });
  arr('objectives', 2, 4); arr('prep', 1, 6); arr('lookFors', 2, 5); arr('reflection', 2, 4);
  if (!a.materials || !Array.isArray(a.materials.print) || !Array.isArray(a.materials.digital)) e('"materials" needs print[] and digital[]');
  if (arr('steps', 4, 9)) {
    let sum = 0;
    a.steps.forEach((s, i) => {
      inEnum(`steps[${i}].phase`, ENUM.phase, s.phase);
      if (!Number.isInteger(s.minutes) || s.minutes < 1) e(`steps[${i}].minutes must be a positive integer`);
      sum += s.minutes || 0;
      if (!s.title || !s.body || s.body.length < 60) e(`steps[${i}] needs title and a substantive body`);
    });
    if (Math.abs(sum - a.minutes) > Math.max(5, a.minutes * 0.15)) e(`step minutes sum to ${sum}, but "minutes" is ${a.minutes}`);
  }
  if (arr('adaptations', 2, 5)) a.adaptations.forEach((x, i) => { if (!x.label || !x.text) e(`adaptations[${i}] needs label and text`); });
  if (a.connections !== undefined && arr('connections', 0, 3)) a.connections.forEach(c => {
    if (!APPROVED.has(c.url)) e(`connection URL not on approved list: ${c.url}`);
    if (!c.title) e('connection needs a title');
  });
  if (arr('handouts', 1, 3)) a.handouts.forEach((h, i) => {
    const p = `handouts[${i}]`;
    if (!h.id || !h.title) e(`${p} needs id and title`);
    inEnum(`${p}.type`, ENUM.handout, h.type);
    switch (h.type) {
      case 'cards': if (arr(`${p}.cards`, 6, 16, h.cards)) h.cards.forEach((c, j) => { if (!c.front) e(`${p}.cards[${j}] needs front`); }); break;
      case 'sort':
        if (arr(`${p}.categories`, 2, 4, h.categories) && arr(`${p}.items`, 6, 16, h.items))
          h.items.forEach((it, j) => { if (!it.text || !h.categories.includes(it.answer)) e(`${p}.items[${j}] needs text and an answer matching a category`); });
        break;
      case 'worksheet': if (arr(`${p}.sections`, 3, 8, h.sections)) h.sections.forEach((s, j) => { if (!s.prompt) e(`${p}.sections[${j}] needs prompt`); }); break;
      case 'table':
        if (arr(`${p}.columns`, 2, 5, h.columns) && Array.isArray(h.rows))
          h.rows.forEach((r, j) => { if (!Array.isArray(r) || r.length !== h.columns.length) e(`${p}.rows[${j}] must have ${h.columns.length} cells`); });
        else if (!Array.isArray(h.rows)) e(`${p}.rows must be an array`);
        break;
      case 'checklist': arr(`${p}.items`, 5, 14, h.items); break;
      case 'reading': arr(`${p}.paragraphs`, 2, 10, h.paragraphs); break;
      case 'rubric':
        if (arr(`${p}.levels`, 3, 5, h.levels) && arr(`${p}.criteria`, 3, 5, h.criteria))
          h.criteria.forEach((c, j) => { if (!c.name || !Array.isArray(c.descriptors) || c.descriptors.length !== h.levels.length) e(`${p}.criteria[${j}] needs name and ${h.levels.length} descriptors`); });
        break;
    }
  });
  const text = JSON.stringify(a);
  const m = text.match(PLACEHOLDER);
  if (m) e(`placeholder-looking text: "${m[0]}"`);
  if (/https?:\/\//.test(text.replace(/"url":"[^"]*"/g, ''))) warn.push('contains a URL outside "connections"');
  return { errs, warn };
}

const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : fs.readdirSync(path.join(ROOT, 'data/activities')).filter(f => f.endsWith('.json')).map(f => path.join(ROOT, 'data/activities', f));
let bad = 0;
const ids = new Map();
for (const f of files) {
  const { errs, warn } = validate(f);
  const t = (() => { try { return JSON.parse(fs.readFileSync(f, 'utf8')).title; } catch { return null; } })();
  if (t) { const k = t.toLowerCase(); if (ids.has(k)) errs.push(`duplicate title with ${ids.get(k)}`); ids.set(k, path.basename(f)); }
  if (errs.length || warn.length) console.log(`\n${path.basename(f)}`);
  errs.forEach(x => console.log('  ✗ ' + x));
  warn.forEach(x => console.log('  ! ' + x));
  if (errs.length) bad++;
}
// standards.json: every activity mapped, catalog codes only
const stdPath = path.join(ROOT, 'data/standards.json');
if (fs.existsSync(stdPath) && !process.argv.slice(2).length) {
  const cat = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/standards-catalog.json'), 'utf8'));
  const std = JSON.parse(fs.readFileSync(stdPath, 'utf8'));
  const ids = files.map(f => path.basename(f, '.json'));
  const errs = [];
  const drafts = ids.filter(id => !std[id]);
  if (drafts.length) console.log(`  ! drafts (not published until mapped in standards.json): ${drafts.join(', ')}`);
  for (const [id, m] of Object.entries(std)) {
    if (!ids.includes(id)) errs.push(`${id}: no such activity`);
    for (const g of ['teks', 'elps', 'udl', 'sst']) (m[g] || []).forEach(c => { if (!(c in cat[g])) errs.push(`${id}: unknown ${g} code ${c}`); });
  }
  errs.forEach(e => console.log('  ✗ standards.json ' + e));
  if (errs.length) bad++;
}
console.log(`\n${files.length - bad}/${files.length} activity files valid.`);
process.exit(bad ? 1 : 0);
