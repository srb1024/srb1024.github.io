/* Scroll behaviour and the image lightbox.
   The pinned card stack is the only complicated part: cards stick under the
   header and pass over one another, driven by four CSS variables per card
   that this file recalculates on every scroll frame. */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var wide = window.matchMedia('(min-width: 900px)');

  var head = document.querySelector('.hero, .case__head');
  var mast = document.querySelector('.masthead');
  var work = document.querySelector('.work');
  var entries = work ? Array.prototype.slice.call(work.querySelectorAll('.entry')) : [];

  var stacked = false;
  var dwellPx = 0;
  var STAGGER = 10;    // px each card pins below the previous, matches the CSS
  var FADE_PX = 220;   // card fades over the last 220px of the next one's approach

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  // Read the pin offset from the CSS so there is one source of truth.
  function pinTop() {
    if (!entries.length) { return 88; }
    var t = parseFloat(getComputedStyle(entries[0]).top);
    return isNaN(t) ? 88 : t;
  }

  function tallest() {
    var h = 0;
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].offsetHeight > h) { h = entries[i].offsetHeight; }
    }
    return h;
  }

  // Document-relative top, ignoring sticky offset and transforms.
  function flowTop(el) {
    var y = 0;
    while (el) { y += el.offsetTop; el = el.offsetParent; }
    return y;
  }

  // Pin only if every card fits on screen. Try normal spacing, then the
  // compact tier, then give up and let the cards stack in flow.
  function evaluateStack() {
    if (!work || entries.length < 2) { return; }
    var want = !reduce && wide.matches;

    if (want) {

      // Apply the layout first: heights differ once cards go two-column.
      work.classList.add('is-stacked');
      work.classList.remove('is-tight');
      var avail = window.innerHeight - pinTop() - 24;

      if (tallest() > avail) {

        work.classList.add('is-tight');
        if (tallest() > avail) {
          work.classList.remove('is-tight');
          want = false;
        }
      }
    }
    work.classList.toggle('is-stacked', want);
    if (!want) { work.classList.remove('is-tight'); }

    if (want) {
      var last = entries[entries.length - 1];
      var band = work.closest('.band');
      var bandPad = band ? parseFloat(getComputedStyle(band).paddingBottom) || 0 : 0;
      dwellPx = Math.round(pinTop() + (entries.length - 1) * STAGGER + last.offsetHeight);
      last.style.marginBottom = dwellPx + 'px';
      work.style.marginBottom = '-' + Math.round(dwellPx + bandPad) + 'px';
    } else {
      work.style.removeProperty('margin-bottom');
      entries[entries.length - 1].style.removeProperty('margin-bottom');
    }

    if (want !== stacked) {
      stacked = want;
      entries.forEach(function (el, i) {
        if (stacked) {
          el.classList.remove('reveal', 'is-shown');
          el.style.setProperty('--i', i);
        } else {
          el.classList.add('reveal', 'is-shown');
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

  var hashLock = false;
  ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(function (ev) {
    window.addEventListener(ev, function () { hashLock = true; }, { passive: true, once: true });
  });
  window.addEventListener('load', function () { setTimeout(function () { hashLock = true; }, 1200); });

  // A case study's back link names the card it came from, so land on that
  // card rather than at the top of the section. Stops the moment the user
  // scrolls, so it never fights them while the layout is still settling.
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
      var workEnd = flowTop(work) + work.offsetHeight - y;
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
        // enter: arriving from the bottom. cover: how far the next card has
        // come over this one. fade: next card almost pinned, so this one goes.
        var enter = clamp01((vh - t.top) / Math.max(1, vh - (pin + i * STAGGER)));
        var cover = 0, fade = 0, exit = 0;

        if (i < lastIdx) {
          cover = clamp01((t.top + t.h - tops[i + 1].top) / Math.max(1, t.h));
          var remaining = tops[i + 1].top - (pin + (i + 1) * STAGGER);
          fade = clamp01(1 - remaining / FADE_PX);
        // Last card has no successor, so it fades out during its own hold.
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

  evaluateStack();

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

  function hideWrap(img) {
    var wrap = img.closest('[data-optional-wrap]') || img;
    wrap.hidden = true;
  }
  // Images that are not in place yet hide themselves, caption and all.
  document.querySelectorAll('img[data-optional]').forEach(function (img) {
    img.addEventListener('error', function () { hideWrap(img); });
    if (img.complete && img.naturalWidth === 0) { hideWrap(img); }
  });

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

    // Size from the file's own pixels: 1.5x on a standard screen, native on a
    // 2x screen, and never past the viewport. Small exports stay small rather
    // than being blown up into mush.
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
