// Daily openers page: filters, text search, and a full-screen projector view.
(function () {
  const cards = [...document.querySelectorAll('.op')];
  const form = document.getElementById('opf');
  const q = document.getElementById('opq');
  const count = document.getElementById('opcount');
  const UI = window.ELE_OPUI || {};
  const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  const checked = name => [...form.querySelectorAll(`input[name="${name}"]:checked`)].map(i => i.value);
  function apply() {
    const band = checked('band'), strand = checked('strand'), format = checked('format'), text = norm(q.value.trim());
    let n = 0;
    cards.forEach(c => {
      const ok = (!band.length || band.includes(c.dataset.band))
        && (!strand.length || strand.some(s => c.dataset.strands.split(' ').includes(s)))
        && (!format.length || format.includes(c.dataset.format))
        && (!text || text.split(/\s+/).every(w => c.dataset.text.includes(w)));
      c.hidden = !ok; if (ok) n++;
    });
    document.querySelectorAll('.op-band').forEach(sec => { sec.hidden = !sec.querySelector('.op:not([hidden])'); });
    count.textContent = String(UI.count || '{n} of {total}').replace('{n}', n).replace('{total}', cards.length);
  }
  form.addEventListener('change', apply);
  q.addEventListener('input', apply);
  const p = new URLSearchParams(location.search);
  if (p.get('q')) q.value = p.get('q');
  apply();

  // projector view
  const stage = document.getElementById('stage'), sTitle = document.getElementById('stageTitle'), sPrompt = document.getElementById('stagePrompt');
  let cur = -1, opener = null;
  const visible = () => cards.filter(c => !c.hidden);
  function show(i) {
    const list = visible(); if (!list.length) return;
    cur = (i + list.length) % list.length;
    const c = list[cur];
    sTitle.textContent = c.querySelector('h3').textContent;
    sPrompt.innerHTML = c.querySelector('.op-prompt').innerHTML;
    stage.hidden = false; document.body.classList.add('staging');
    history.replaceState(null, '', '#' + c.id);
    stage.querySelector('#stNext').focus();
  }
  function close() { stage.hidden = true; document.body.classList.remove('staging'); if (opener) opener.focus(); }
  cards.forEach(c => c.querySelector('.op-project').addEventListener('click', e => { opener = e.currentTarget; show(visible().indexOf(c)); }));
  document.getElementById('stNext').addEventListener('click', () => show(cur + 1));
  document.getElementById('stPrev').addEventListener('click', () => show(cur - 1));
  document.getElementById('stClose').addEventListener('click', close);
  document.addEventListener('keydown', e => {
    if (stage.hidden) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); show(cur + 1); }
    else if (e.key === 'ArrowLeft') show(cur - 1);
  });
})();
