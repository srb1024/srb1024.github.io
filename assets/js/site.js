/* srb1024.github.io : site behaviour
   1. Reveal project entries as they scroll into view.
   2. Hide optional images (portrait, screenshots) if the file is missing,
      so the page looks finished before every asset exists.
   No dependencies. */
(function () {
  'use strict';

  /* ---- 1. Reveal ---------------------------------------------- */
  var entries = document.querySelectorAll('.entry');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!('IntersectionObserver' in window) || reduce) {
    entries.forEach(function (el) { el.classList.add('is-shown'); });
  } else {
    var io = new IntersectionObserver(function (rows) {
      rows.forEach(function (row, i) {
        if (row.isIntersecting) {
          var el = row.target;
          setTimeout(function () { el.classList.add('is-shown'); }, i * 90);
          io.unobserve(el);
        }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    entries.forEach(function (el) { io.observe(el); });
  }

  /* ---- 2. Optional images ------------------------------------- */
  function hideWrap(img) {
    var wrap = img.closest('[data-optional-wrap]') || img;
    wrap.hidden = true;
  }
  document.querySelectorAll('img[data-optional]').forEach(function (img) {
    img.addEventListener('error', function () { hideWrap(img); });
    /* Already failed before this script ran */
    if (img.complete && img.naturalWidth === 0) { hideWrap(img); }
  });
})();
