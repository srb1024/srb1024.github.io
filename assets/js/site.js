/* srb1024.github.io : site behaviour*/
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var wide = window.matchMedia('(min-width: 900px)');

  var head = document.querySelector('.hero, .case__head');
  var mast = document.querySelector('.masthead');
  var work = document.querySelector('.work');
  var entries = work ? Array.prototype.slice.call(work.querySelectorAll('.entry')) : [];

  var stacked = false;
  var dwellPx = 0;      /* last card's margin-bottom, measured when stacking is decided */
  var STAGGER = 10;     /* px each card pins below the previous, keep in sync with CSS */
  var FADE_PX = 220;    /* contents fade out over the last 220px of the next card's approach */

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  /* Where cards pin, in px, read from CSS so there's one source of truth */
  function pinTop() {
    if (!entries.length) { return 88; }
    var t = parseFloat(getComputedStyle(entries[0]).top);
    return isNaN(t) ? 88 : t;
  }

  /* Document-relative top of an element, ignoring sticky offset and transforms */
  function flowTop(el) {
    var y = 0;
    while (el) { y += el.offsetTop; el = el.offsetParent; }
    return y;
  }

  /* Decide whether the pinned stack is on */
  function evaluateStack() {
    if (!work || entries.length < 2) { return; }
    var want = !reduce && wide.matches;

    if (want) {
      /* Apply the layout first so heights are measured in two-column form */
      work.classList.add('is-stacked');
      var avail = window.innerHeight - pinTop() - 24;
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].offsetHeight > avail) { want = false; break; }
      }
    }
    work.classList.toggle('is-stacked', want);

    if (want) {
      var last = entries[entries.length - 1];
      dwellPx = parseFloat(getComputedStyle(last).marginBottom) || 0;
    }

    if (want !== stacked) {
      stacked = want;
      entries.forEach(function (el, i) {
        if (stacked) {
          el.classList.remove('reveal', 'is-shown');
          el.style.setProperty('--i', i);
        } else {
          el.classList.add('reveal', 'is-shown');   /* visible, no scroll link */
          el.style.removeProperty('--i');
          el.style.removeProperty('--enter');
          el.style.removeProperty('--cover');
          el.style.removeProperty('--fade');
          el.style.removeProperty('--exit');
          el.classList.remove('is-hidden');
        }
      });
    }
    landOnHash();
    requestTick();
  }

  /* Land on a card named in the URL hash */
  /* Layout settles in stages (fonts, images), so landing is repeated on each
     re-evaluation until the user touches the page or the page has been loaded
     for a moment. After that it never yanks the scroll position again. */
  var hashLock = false;
  ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(function (ev) {
    window.addEventListener(ev, function () { hashLock = true; }, { passive: true, once: true });
  });
  window.addEventListener('load', function () { setTimeout(function () { hashLock = true; }, 1200); });

  function landOnHash() {
    if (hashLock || !location.hash) { return; }
    var target;
    try { target = document.querySelector(location.hash); } catch (e) { return; }
    if (!target) { return; }
    var i = entries.indexOf(target);
    if (i === -1) { return; }
    if (stacked) {
      var y = flowTop(target) - (pinTop() + i * STAGGER);
      window.scrollTo(0, Math.max(0, y));
    } else {
      target.scrollIntoView();
    }
  }
  window.addEventListener('hashchange', function () {
    hashLock = false; landOnHash(); hashLock = true;
  });

  /*  Per-frame scroll work */
  var ticking = false;
  function tick() {
    ticking = false;
    var y = window.scrollY || window.pageYOffset || 0;
    var vh = window.innerHeight;

    if (head && !reduce) {
      var span = head.offsetHeight * 0.85 || 1;
      head.style.setProperty('--hx', clamp01(y / span).toFixed(3));
    }

    if (mast) { mast.classList.toggle('is-scrolled', y > 8); }

    if (stacked) {
      var pin = pinTop();
      var workEnd = flowTop(work) + work.offsetHeight - y;   /* container bottom, viewport-relative */
      var tops = [];
      var i, el, h, vis;

      for (i = 0; i < entries.length; i++) {
        el = entries[i];
        h = el.offsetHeight;
        vis = Math.max(pin + i * STAGGER, flowTop(el) - y);
        if (vis + h > workEnd) { vis = workEnd - h; }
        tops.push({ top: vis, h: h });
      }

      var lastIdx = entries.length - 1;
      for (i = 0; i < entries.length; i++) {
        el = entries[i];
        var t = tops[i];
        var enter = clamp01((vh - t.top) / Math.max(1, vh - (pin + i * STAGGER)));
        var cover = 0, fade = 0, exit = 0;

        if (i < lastIdx) {
          cover = clamp01((t.top + t.h - tops[i + 1].top) / Math.max(1, t.h));
          var remaining = tops[i + 1].top - (pin + (i + 1) * STAGGER);
          fade = clamp01(1 - remaining / FADE_PX);
        } else if (dwellPx > 0) {
          var slack = workEnd - (t.top + t.h);
          exit = clamp01(1 - slack / dwellPx);
        }

        el.style.setProperty('--enter', enter.toFixed(3));
        el.style.setProperty('--cover', cover.toFixed(3));
        el.style.setProperty('--fade', fade.toFixed(3));
        el.style.setProperty('--exit', exit.toFixed(3));
        el.classList.toggle('is-hidden', fade > 0.985 || exit > 0.985);
      }
    }
  }
  function requestTick() {
    if (!ticking) { ticking = true; requestAnimationFrame(tick); }
  }
  window.addEventListener('scroll', requestTick, { passive: true });

  /* Re-evaluate when sizes change */
  var resizeRaf = 0;
  function onResize() {
    if (resizeRaf) { return; }
    resizeRaf = requestAnimationFrame(function () { resizeRaf = 0; evaluateStack(); });
  }
  window.addEventListener('resize', onResize, { passive: true });
  if (wide.addEventListener) { wide.addEventListener('change', onResize); }
  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(onResize); }
  if ('ResizeObserver' in window && entries.length) {
    var ro = new ResizeObserver(onResize);
    entries.forEach(function (el) { ro.observe(el); });
  }
  window.addEventListener('load', onResize);

  /* One-shot reveal for minor elements  */
  evaluateStack();   /* must run first so cards know whether they're scroll-linked */

  var targets = Array.prototype.slice.call(document.querySelectorAll(
    '.entry, .band__head, .roles__side, .roles__main > p, .case__nav'
  )).filter(function (el) {
    return !(stacked && el.classList.contains('entry'));
  });

  if (!reduce && 'IntersectionObserver' in window) {
    targets.forEach(function (el) { el.classList.add('reveal'); });
    var io = new IntersectionObserver(function (rows) {
      var n = 0;
      rows.forEach(function (row) {
        if (!row.isIntersecting) { return; }
        var el = row.target;
        setTimeout(function () { el.classList.add('is-shown'); }, n * 70);
        n += 1;
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.06 });
    targets.forEach(function (el) { io.observe(el); });
  }

  /*  Optional images  */
  function hideWrap(img) {
    var wrap = img.closest('[data-optional-wrap]') || img;
    wrap.hidden = true;
  }
  document.querySelectorAll('img[data-optional]').forEach(function (img) {
    img.addEventListener('error', function () { hideWrap(img); });
    if (img.complete && img.naturalWidth === 0) { hideWrap(img); }
  });


  /* Lightbox for card images */
  (function () {
    var zoomables = Array.prototype.slice.call(
      document.querySelectorAll('.entry__shot img, .figure img')
    );
    if (!zoomables.length) { return; }

    var box, fig, big, cap, closeBtn, opener = null, resizeRaf = 0;

    function build() {
      box = document.createElement('div');
      box.className = 'lightbox';
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-modal', 'true');
      box.setAttribute('aria-label', 'Enlarged image');
      box.hidden = true;

      fig = document.createElement('figure');
      fig.className = 'lightbox__figure';
      big = document.createElement('img');
      big.className = 'lightbox__img';
      big.alt = '';
      cap = document.createElement('figcaption');
      cap.className = 'lightbox__cap';
      fig.appendChild(big);
      fig.appendChild(cap);

      closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'lightbox__close';
      closeBtn.setAttribute('aria-label', 'Close');
      closeBtn.innerHTML = '<span class="btn">Close <i>&times;</i></span>';

      box.appendChild(fig);
      box.appendChild(closeBtn);
      document.body.appendChild(box);

      /* Close on backdrop, on the image itself, or on the button */
      box.addEventListener('click', function (e) {
        if (e.target === box || e.target === big || closeBtn.contains(e.target)) { close(); }
      });
      document.addEventListener('keydown', function (e) {
        if (!box.hidden && e.key === 'Escape') { close(); }
      });
      window.addEventListener('resize', function () {
        if (box.hidden || resizeRaf) { return; }
        resizeRaf = requestAnimationFrame(function () { resizeRaf = 0; fit(); });
      }, { passive: true });
      big.addEventListener('load', fit);
    }

    /* Size to the file's own pixels. Upscaling is allowed only as far as it
       stays crisp: 1.5x on a standard screen, native size on a 2x screen,
       and never past 92% of the viewport in either direction. */
    function fit() {
      var nw = big.naturalWidth, nh = big.naturalHeight;
      if (!nw || !nh) { return; }
      var dpr = window.devicePixelRatio || 1;
      var maxUp = Math.max(1, 1.5 / dpr);
      var capH = cap.textContent ? cap.offsetHeight + 12 : 0;
      var vw = window.innerWidth * 0.92;
      var vh = window.innerHeight * 0.88 - capH;
      var scale = Math.min(maxUp, vw / nw, vh / nh);
      big.style.width = Math.round(nw * scale) + 'px';
      big.style.height = Math.round(nh * scale) + 'px';
    }

    var savedOverflow = '', savedPad = '';
    function lockScroll() {
      var gutter = window.innerWidth - document.documentElement.clientWidth;
      savedOverflow = document.documentElement.style.overflow;
      savedPad = document.documentElement.style.paddingRight;
      document.documentElement.style.overflow = 'hidden';
      if (gutter > 0) { document.documentElement.style.paddingRight = gutter + 'px'; }
    }
    function unlockScroll() {
      document.documentElement.style.overflow = savedOverflow;
      document.documentElement.style.paddingRight = savedPad;
    }

    function open(img) {
      if (!box) { build(); }
      opener = img;
      var figEl = img.closest('figure');
      var figCap = figEl ? figEl.querySelector('figcaption') : null;
      cap.textContent = figCap ? figCap.textContent.trim() : '';
      big.alt = img.alt || '';
      big.style.width = '';
      big.style.height = '';
      big.src = img.currentSrc || img.src;
      box.hidden = false;
      lockScroll();
      /* two frames so the opacity transition actually runs */
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { box.classList.add('is-open'); });
      });
      if (big.complete) { fit(); }
      closeBtn.focus();
    }

    function close() {
      box.classList.remove('is-open');
      unlockScroll();
      var done = function () {
        box.hidden = true;
        big.removeAttribute('src');
        if (opener) { opener.focus(); }
      };
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { done(); }
      else { setTimeout(done, 350); }
    }

    zoomables.forEach(function (img) {
      img.setAttribute('tabindex', '0');
      img.setAttribute('role', 'button');
      img.setAttribute('aria-label', (img.alt ? img.alt + '. ' : '') + 'Open larger');
      img.addEventListener('click', function () { open(img); });
      img.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(img); }
      });
    });
  })();

  requestTick();
})();
