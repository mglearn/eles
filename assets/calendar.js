// Daily Opener a Day: a school-year flip calendar.
// School days are mapped to content by week: the Nth school week gets week N's
// openers, and the weekday picks the day (Mon warm-up … Fri I can). Weekends and,
// by default, the typical Texas holidays are skipped. Teachers can set their own
// first day. The current day is in the URL hash (#2026-09-22) for sharing.
(function () {
  'use strict';
  const C = window.ELE_CAL; if (!C) return;
  const UI = C.ui, T = k => UI[k] || k;
  const $ = id => document.getElementById(id);
  const flip = $('calFlip');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = { get(k, d) { try { return localStorage.getItem('ele.cal.' + k) ?? d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('ele.cal.' + k, v); } catch (e) {} } };

  // ---- dates (local, no time zones) ----
  const pad = n => String(n).padStart(2, '0');
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const mondayOf = d => addDays(d, -((d.getDay() + 6) % 7));
  const locale = { en: 'en-US', es: 'es-US', vi: 'vi-VN' }[C.lang] || C.lang;
  const fmt = (d, o) => d.toLocaleDateString(locale, o);

  let level = store.get('level', 'k5');
  let start = store.get('start', C.year.start);
  let useHol = store.get('hol', '1') === '1';
  let days = [], index = 0;

  function build() {
    days = [];
    const hol = new Set(useHol ? C.year.holidays : []);
    let d = parse(start), lastMon = null, weekNo = 0;
    for (let guard = 0; guard < 400 && weekNo <= C.weeks.length; guard++, d = addDays(d, 1)) {
      const wd = d.getDay();
      if (wd === 0 || wd === 6 || hol.has(ymd(d))) continue;
      const mon = ymd(mondayOf(d));
      if (mon !== lastMon) { weekNo++; lastMon = mon; }
      if (weekNo > C.weeks.length) break;
      const week = C.weeks[weekNo - 1];
      days.push({ date: new Date(d), key: ymd(d), week, day: week.days[wd - 1], dayIdx: wd - 1 });
    }
  }

  // ---- rendering ----
  function pageHTML(entry, note) {
    const { date, week, day } = entry;
    const prompt = day[level];
    const opts = day.options && day.options.length ? `<ul class="fp-options">${day.options.map(o => `<li>${o}</li>`).join('')}</ul>` : '';
    return `<article class="fp" data-strand="${day.strand}">
      <div class="fp-rings" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
      <header class="fp-date">
        <div class="fp-dow">${fmt(date, { weekday: 'long' })}</div>
        <div class="fp-num">${date.getDate()}</div>
        <div class="fp-mon">${fmt(date, { month: 'long', year: 'numeric' })}</div>
        <div class="fp-daynum">${T('cal.dayNum').replace('{n}', index + 1)} · ${T('cal.week').replace('{n}', week.week)}</div>
      </header>
      ${note ? `<p class="fp-note">${note}</p>` : ''}
      <div class="fp-body">
        ${day.img ? `<figure class="fp-photo"><img src="${day.img.src}" alt="${day.img.alt.replace(/"/g, '&quot;')}"></figure>` : ''}
        <div class="fp-text">
          <p class="fp-kind"><span class="fp-k">${T('cal.kind.' + day.kind)}</span><span class="fp-f">${T('fmt.' + day.format)}</span><span class="fp-s s-${day.strand}">${T('strand.' + day.strand)}</span></p>
          <h2 class="fp-title">${day.title}</h2>
          <div class="fp-prompt">${prompt}${opts}</div>
          ${day.answer ? `<details class="fp-answer"><summary>${T('cal.answer')}</summary><div>${day.answer}</div></details>` : ''}
          <details class="fp-teacher"><summary>${T('cal.teacher')}</summary><div>${day.teacher}${day.related ? ` <a href="${day.related.href}">${T('cal.related').replace('{title}', day.related.title || '')}</a>` : ''}</div></details>
        </div>
      </div>
      <footer class="fp-week"><span class="fp-ele">${week.ele}</span><span><strong>${week.title}.</strong> ${week.eleText}</span></footer>
    </article>`;
  }

  function show(i, dir, note) {
    if (!days.length) return;
    index = Math.max(0, Math.min(days.length - 1, i));
    const html = pageHTML(days[index], note);
    const old = flip.querySelector('.fp');
    if (old && !reduce && dir) {
      const next = document.createElement('div'); next.innerHTML = html; const nw = next.firstElementChild;
      nw.classList.add(dir > 0 ? 'enter-next' : 'enter-prev');
      old.classList.add(dir > 0 ? 'leave-next' : 'leave-prev');
      flip.appendChild(nw);
      setTimeout(() => { old.remove(); nw.classList.remove('enter-next', 'enter-prev'); }, 520);
    } else flip.innerHTML = html;
    history.replaceState(null, '', '#' + days[index].key);
    $('calPrev').disabled = index === 0; $('calNext').disabled = index === days.length - 1;
    if (!$('calMonth').hidden) renderMonth();
  }
  const go = d => show(index + d, d);

  function openToDate(key, silent) {
    const target = parse(key);
    let i = days.findIndex(x => x.key === key), note = '';
    if (i < 0) {
      if (!days.length) return;
      if (target < days[0].date) { i = 0; note = silent ? '' : T('cal.before'); }
      else if (target > days[days.length - 1].date) { i = days.length - 1; note = silent ? '' : T('cal.after'); }
      else { i = days.findIndex(x => x.date > target); note = silent ? '' : T('cal.noSchool'); }
    }
    show(i, 0, note);
  }

  // ---- month view ----
  function renderMonth() {
    const box = $('calMonth'); if (!days.length) return;
    const byKey = new Map(days.map((x, i) => [x.key, i]));
    const first = days[0].date, last = days[days.length - 1].date, todayKey = ymd(new Date());
    let html = `<p class="cm-jump">${T('cal.jump')}</p><div class="cm-months">`;
    for (let m = new Date(first.getFullYear(), first.getMonth(), 1); m <= last; m = new Date(m.getFullYear(), m.getMonth() + 1, 1)) {
      html += `<section class="cm"><h3>${fmt(m, { month: 'long', year: 'numeric' })}</h3><div class="cm-grid">`;
      ['1', '2', '3', '4', '5'].forEach(wd => { const ref = addDays(mondayOf(new Date(2026, 0, 5)), Number(wd) - 1); html += `<span class="cm-h">${fmt(ref, { weekday: 'narrow' })}</span>`; });
      const firstMon = mondayOf(m);
      for (let d = firstMon; d.getMonth() === m.getMonth() || d < m; d = addDays(d, 1)) {
        const wd = d.getDay(); if (wd === 0 || wd === 6) continue;
        if (d.getMonth() !== m.getMonth()) { html += '<span></span>'; continue; }
        const k = ymd(d), i = byKey.get(k);
        html += i !== undefined
          ? `<button type="button" class="cm-d${i === index ? ' on' : ''}${k === todayKey ? ' today' : ''}" data-i="${i}" title="${fmt(d, { weekday: 'long', month: 'long', day: 'numeric' })}">${d.getDate()}</button>`
          : `<span class="cm-d off${k === todayKey ? ' today' : ''}">${d.getDate()}</span>`;
      }
      html += '</div></section>';
    }
    box.innerHTML = html + '</div>';
    box.querySelectorAll('button[data-i]').forEach(b => b.addEventListener('click', () => { const i = Number(b.dataset.i); show(i, i > index ? 1 : -1); }));
  }

  // ---- controls ----
  function setLevel(l) {
    level = l; store.set('level', l);
    document.querySelectorAll('[data-level]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.level === l)));
    show(index, 0);
  }
  document.querySelectorAll('[data-level]').forEach(b => b.addEventListener('click', () => setLevel(b.dataset.level)));
  $('calPrev').addEventListener('click', () => go(-1));
  $('calNext').addEventListener('click', () => go(1));
  $('calToday').addEventListener('click', () => openToDate(ymd(new Date())));
  const toggle = (btn, panel) => $(btn).addEventListener('click', () => { const p = $(panel); p.hidden = !p.hidden; $(btn).setAttribute('aria-expanded', String(!p.hidden)); if (panel === 'calMonth' && !p.hidden) renderMonth(); });
  toggle('calMonthBtn', 'calMonth'); toggle('calSettingsBtn', 'calSettings');
  $('calStart').value = start; $('calHol').checked = useHol;
  $('calStart').addEventListener('change', e => { if (!e.target.value) return; start = e.target.value; store.set('start', start); const k = days[index] && days[index].key; build(); openToDate(k || start, true); });
  $('calHol').addEventListener('change', e => { useHol = e.target.checked; store.set('hol', useHol ? '1' : '0'); const k = days[index] && days[index].key; build(); openToDate(k, true); });
  $('calReset').addEventListener('click', () => { start = C.year.start; useHol = true; store.set('start', start); store.set('hol', '1'); $('calStart').value = start; $('calHol').checked = true; build(); openToDate(ymd(new Date())); });
  $('calProject').addEventListener('click', () => {
    const wrap = document.querySelector('.flip-wrap');
    document.body.classList.toggle('cal-projecting');
    if (document.body.classList.contains('cal-projecting') && wrap.requestFullscreen) wrap.requestFullscreen().catch(() => {});
    else if (document.fullscreenElement) document.exitFullscreen();
    $('calProject').textContent = document.body.classList.contains('cal-projecting') ? T('cal.exit') : T('cal.project');
  });
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && document.body.classList.contains('cal-projecting')) { document.body.classList.remove('cal-projecting'); $('calProject').textContent = T('cal.project'); } });
  document.addEventListener('keydown', e => {
    if (e.target.closest('input, textarea, select')) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); go(1); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(-1); }
    else if (e.key === 't' || e.key === 'T') openToDate(ymd(new Date()));
  });
  let sx = null;
  flip.addEventListener('pointerdown', e => { sx = e.clientX; });
  flip.addEventListener('pointerup', e => { if (sx !== null && Math.abs(e.clientX - sx) > 60 && !e.target.closest('summary, a')) go(e.clientX < sx ? 1 : -1); sx = null; });

  // ---- start ----
  build();
  const hash = location.hash.slice(1);
  document.querySelectorAll('[data-level]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.level === level)));
  openToDate(/^\d{4}-\d{2}-\d{2}$/.test(hash) ? hash : ymd(new Date()), /^\d{4}-\d{2}-\d{2}$/.test(hash));
})();
