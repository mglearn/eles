// Catalog filtering for index.html. Filters live in the URL (?strand=genai&grade=6-8&area=T2.0&q=…)
// so any filtered view can be linked or bookmarked.
(function () {
  const data = window.ELE_CATALOG || [];
  const byId = Object.fromEntries(data.map(d => [d.id, d]));
  const form = document.getElementById('filters');
  const q = document.getElementById('q');
  const cards = [...document.querySelectorAll('#cards .card')];
  const count = document.getElementById('count');
  const empty = document.getElementById('empty');
  const areaNote = document.getElementById('areaNote');
  const cells = [...document.querySelectorAll('.mx-cell')];
  const KEYS = ['audience', 'strand', 'grade', 'mode', 'role', 'time'];
  const UI = window.ELE_UI || {};
  const t = (k, v = {}) => String(UI[k] || k).replace(/\{(\w+)\}/g, (m, x) => (v[x] !== undefined ? v[x] : m));
  // accent-insensitive: matches the normalization used for catalog text at build time
  const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  let area = null;

  const checked = name => [...form.querySelectorAll(`input[name="${name}"]:checked`)].map(i => i.value);
  const timeOk = (m, t) => t.some(v => (v === '30' && m <= 30) || (v === '60' && m > 30 && m <= 60) || (v === '61' && m > 60));

  function matches(d, f) {
    if (f.audience.length && !f.audience.includes(d.audience)) return false;
    if (f.strand.length && !f.strand.some(s => d.strands.includes(s))) return false;
    // "K-12" on a PL activity means it serves every band
    if (f.grade.length && !f.grade.some(g => d.grades.includes(g) || (g !== 'Higher Ed' && d.grades.includes('K-12')))) return false;
    if (f.mode.length && !f.mode.includes(d.mode)) return false;
    if (f.role.length && !f.role.some(r => d.roles.includes(r))) return false;
    if (f.time.length && !timeOk(d.minutes, f.time)) return false;
    if (area && !d.areas.includes(area)) return false;
    if (f.q) for (const w of f.q.split(/\s+/)) if (w && !d.text.includes(w.replace(/[–—]/g, '-'))) return false;
    return true;
  }

  function apply(push) {
    const f = Object.fromEntries(KEYS.map(k => [k, checked(k)]));
    f.q = norm(q.value.trim());
    let n = 0;
    for (const c of cards) { const ok = matches(byId[c.dataset.id], f); c.hidden = !ok; if (ok) n++; }
    count.textContent = n === data.length ? t('f.all', { n }) : t('f.some', { n, total: data.length });
    empty.hidden = n > 0;
    cells.forEach(c => c.setAttribute('aria-pressed', String(c.dataset.area === area)));
    if (area) {
      areaNote.hidden = false;
      areaNote.innerHTML = '';
      areaNote.append(t('f.area', { area: window.ELE_AREAS[area] }) + ' ');
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = t('f.allAreas');
      b.onclick = () => { area = null; apply(true); };
      areaNote.append(b);
    } else areaNote.hidden = true;
    if (push) {
      const p = new URLSearchParams();
      KEYS.forEach(k => f[k].forEach(v => p.append(k, v)));
      if (f.q) p.set('q', q.value.trim());
      if (area) p.set('area', area);
      const s = p.toString();
      history.replaceState(null, '', (s ? '?' + s : location.pathname) + (location.hash || ''));
    }
  }

  // restore from URL
  const params = new URLSearchParams(location.search);
  KEYS.forEach(k => params.getAll(k).forEach(v => {
    const i = form.querySelector(`input[name="${k}"][value="${CSS.escape(v)}"]`);
    if (i) i.checked = true;
  }));
  q.value = params.get('q') || '';
  area = params.get('area');

  form.addEventListener('change', () => apply(true));
  let t; q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => apply(true), 120); });
  document.getElementById('clear').addEventListener('click', () => {
    form.querySelectorAll('input[type=checkbox]').forEach(i => (i.checked = false));
    q.value = ''; area = null; apply(true);
  });
  cells.forEach(c => c.addEventListener('click', () => {
    area = area === c.dataset.area ? null : c.dataset.area;
    apply(true);
    document.getElementById('catalog').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }));
  const ft = document.getElementById('ftoggle');
  const setToggle = () => {
    const n = form.querySelectorAll('input[type=checkbox]:checked').length;
    ft.textContent = t(form.classList.contains('open') ? 'f.hide' : 'f.show') + (n ? ' ' + t('f.on', { n }) : '');
    ft.setAttribute('aria-expanded', String(form.classList.contains('open')));
  };
  ft.addEventListener('click', () => { form.classList.toggle('open'); setToggle(); });
  form.addEventListener('change', setToggle);
  document.getElementById('clear').addEventListener('click', setToggle);
  setToggle();
  apply(false);
})();
