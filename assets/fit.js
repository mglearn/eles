// Shrinks a handout sheet that runs slightly past one US Letter page, so it prints
// on one page instead of spilling a line or two onto the next. On screen each
// .sheet is laid out exactly like the printed page (8.5in wide, .45in margins),
// so measuring here predicts print. Sheets far over a page are left to flow.
(function () {
  const PAGE = 11 * 96;         // 11in at 96px/in, including the .45in padding
  const MAX_SHRINK = 0.66;      // below this, text gets too small: let it flow
  function fit() {
    document.querySelectorAll('.sheet').forEach(sh => {
      sh.style.zoom = '';
      if (sh.getBoundingClientRect().width < 8.4 * 96) return; // narrow screen: not print layout
      const prev = sh.style.minHeight;
      sh.style.minHeight = '0';
      const h = sh.getBoundingClientRect().height;
      sh.style.minHeight = prev;
      const scale = (PAGE * 0.97) / h;
      if (scale < 1 && scale >= MAX_SHRINK) {
        sh.style.zoom = scale.toFixed(3);
        sh.classList.add('fitted');
      }
    });
  }
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(fit);
})();
