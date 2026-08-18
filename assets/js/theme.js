/* srb1024.github.io : palette from the background photograph

   Samples assets/img/bg.jpg, finds its dominant colour and its strongest
   secondary, and writes them into the CSS variables everything else is
   built from. Swap the photograph and the whole site retunes itself.

   Also measures the bright end of the image and sets a scrim behind the
   text accordingly, so a light photograph does not leave white type
   stranded.

   The result is cached against the image URL, so only the first visit
   does the work. If anything fails, the defaults in site.css stand. */
(function () {
  'use strict';

  var VERSION = 2;
  var ROOT = document.documentElement;

  /*  colour helpers  */
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h = 0, s = 0, l = (max + min) / 2, d = max - min;
    if (d) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) { h = ((g - b) / d + (g < b ? 6 : 0)); }
      else if (max === g) { h = (b - r) / d + 2; }
      else { h = (r - g) / d + 4; }
      h *= 60;
    }
    return [h, s, l];
  }
  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360 / 360;
    if (!s) { var v = Math.round(l * 255); return [v, v, v]; }
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    function hue(t) {
      if (t < 0) { t += 1; } if (t > 1) { t -= 1; }
      if (t < 1 / 6) { return p + (q - p) * 6 * t; }
      if (t < 1 / 2) { return q; }
      if (t < 2 / 3) { return p + (q - p) * (2 / 3 - t) * 6; }
      return p;
    }
    return [hue(h + 1 / 3), hue(h), hue(h - 1 / 3)].map(function (c) {
      return Math.round(c * 255);
    });
  }
  function lum(rgb) {
    var c = rgb.map(function (v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  function contrast(a, b) {
    var la = lum(a), lb = lum(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }
  function hex(rgb) {
    return '#' + rgb.map(function (v) {
      return ('0' + Math.max(0, Math.min(255, v)).toString(16)).slice(-2);
    }).join('');
  }
  function triplet(rgb) { return rgb.join(','); }

  /*  apply and cache  */
  function apply(vars) {
    for (var k in vars) {
      if (Object.prototype.hasOwnProperty.call(vars, k)) {
        ROOT.style.setProperty(k, vars[k]);
      }
    }
  }

  /*  read the photograph  */
  function sample(img) {
    var W = 200;
    var H = Math.max(1, Math.round(img.naturalHeight * W / img.naturalWidth));
    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    var ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, W, H);
    var px = ctx.getImageData(0, 0, W, H).data;

    var BUCKETS = 36;                 
    var weight = new Array(BUCKETS).fill(0);
    var hSum = new Array(BUCKETS).fill(0);
    var sSum = new Array(BUCKETS).fill(0);
    var hist = new Array(100).fill(0); /* luminance histogram, for the scrim */
    var total = 0, n = 0;

    for (var i = 0; i < px.length; i += 4) {
      var r = px[i], g = px[i + 1], b = px[i + 2];
      hist[Math.min(99, Math.floor(lum([r, g, b]) * 100))] += 1; n += 1;

      var hsl = rgbToHsl(r, g, b), h = hsl[0], s = hsl[1], l = hsl[2];
      /* skip near-black, near-white and washed-out pixels: the colour of a
         photograph lives in its saturated midtones, not its background */
      if (l < 0.12 || l > 0.92 || s < 0.22) { continue; }
      var w = s * l;
      var idx = Math.min(BUCKETS - 1, Math.floor(h / (360 / BUCKETS)));
      weight[idx] += w; hSum[idx] += h * w; sSum[idx] += s * w;
      total += w;
    }
    if (total < 12) { return null; }   /* monochrome or too dark to read */

    function pick(exclude) {
      var best = -1, bestW = 0;
      for (var k = 0; k < BUCKETS; k++) {
        if (!weight[k]) { continue; }
        if (exclude !== undefined) {
          var d = Math.abs(hSum[k] / weight[k] - exclude);
          if (Math.min(d, 360 - d) < 40) { continue; }
        }
        if (weight[k] > bestW) { bestW = weight[k]; best = k; }
      }
      return best;
    }

    var p = pick();
    if (p < 0) { return null; }
    var ph = hSum[p] / weight[p];
    var ps = Math.max(0.42, Math.min(0.86, sSum[p] / weight[p]));

    var q = pick(ph);
    var qh = q >= 0 ? hSum[q] / weight[q] : (ph + 42);
    var qs = q >= 0 ? Math.max(0.40, Math.min(0.80, sSum[q] / weight[q])) : ps * 0.8;

    var card = [16, 21, 30];
    var signal = hslToRgb(ph, ps * 0.78, 0.70);
    for (var L = 0.70; L <= 0.93 && contrast(signal, card) < 4.5; L += 0.02) {
      signal = hslToRgb(ph, ps * 0.78, L);
    }

    var rim = hslToRgb(ph, ps * 0.80, 0.66);
    var mid = hslToRgb(ph, ps, 0.56);
    var deep = hslToRgb(ph, Math.min(0.92, ps * 1.1), 0.38);
    var bright = hslToRgb(ph, ps, 0.62);
    var second = hslToRgb(qh, qs * 0.78, 0.64);

    var acc = 0, bright = 1;
    for (var k = 0; k < 100; k++) {
      acc += hist[k];
      if (acc >= n * 0.92) { bright = (k + 0.5) / 100; break; }
    }
    var need = 0.183;
    var scrim = 0;
    if (bright > need) {
      var want = Math.pow(need, 1 / 2.4) * 1.055 - 0.055;
      var have = Math.pow(bright, 1 / 2.4) * 1.055 - 0.055;
      scrim = Math.max(0, Math.min(0.62, 1 - want / have));
    }

    return {
      '--blue': hex(mid),
      '--blue-deep': hex(deep),
      '--blue-rim': hex(rim),
      '--blue-bright': hex(bright),
      '--gold': hex(second),
      '--signal': hex(signal),
      '--blue-rgb': triplet(mid),
      '--blue-rim-rgb': triplet(rim),
      '--blue-deep-rgb': triplet(deep),
      '--gold-rgb': triplet(second),
      '--signal-rgb': triplet(signal),
      '--scrim': scrim.toFixed(3)
    };
  }

  /*  run  */
  function url() {
    var v = getComputedStyle(ROOT).getPropertyValue('--bg-src').trim();
    var m = v.match(/url\((['"]?)(.*?)\1\)/);
    return m ? m[2] : '/assets/img/bg.jpg';
  }

  var src = url();
  var key = 'palette:' + VERSION + ':' + src;

  try {
    var cached = localStorage.getItem(key);
    if (cached) { apply(JSON.parse(cached)); }
  } catch (e) { /* private mode, no cache, no problem */ }

  var img = new Image();
  img.decoding = 'async';
  img.onload = function () {
    try {
      var vars = sample(img);
      if (!vars) { return; }
      apply(vars);
      try { localStorage.setItem(key, JSON.stringify(vars)); } catch (e2) {}
    } catch (e3) { /* tainted canvas or no 2d context: defaults stand */ }
  };
  img.src = src;
})();
