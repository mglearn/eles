// Shrinks a handout sheet that runs slightly past one US Letter page, so it prints
// on one page instead of spilling a line or two onto the next. Each sheet is
// measured at true page width (8.5in with .45in margins, like print) whatever the
// window size, and the shrink applies only when printing (see .fitted in site.css).
// Sheets far over a page are left to flow onto the next page.
(function () {
  const PAGE = 11 * 96;         // 11in at 96px/in, including the .45in padding
  const MAX_SHRINK = 0.66;      // below this, text gets too small: let it flow
  function fit() {
    document.querySelectorAll('.sheet').forEach(sh => {
      if (sh.hidden) return;
      const saved = sh.getAttribute('style') || '';
      sh.style.width = '8.5in'; sh.style.maxWidth = 'none'; sh.style.minHeight = '0'; sh.style.padding = '.45in';
      const h = sh.getBoundingClientRect().height;
      sh.setAttribute('style', saved);
      const scale = (PAGE * 0.97) / h;
      sh.classList.toggle('fitted', scale < 1 && scale >= MAX_SHRINK);
      sh.style.setProperty('--fit', scale < 1 && scale >= MAX_SHRINK ? scale.toFixed(3) : '1');
    });
  }
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(fit);
  window.addEventListener('beforeprint', fit);
})();
