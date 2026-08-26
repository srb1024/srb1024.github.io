/* Reads the palette out of the background photograph.
   Samples the image, takes its dominant hue and the strongest hue away from
   it, and writes them into the CSS colour tokens. Swap the photo and the
   site retunes itself. Falls back to the values in site.css if anything here
   fails. */
(function () {
  'use strict';

  var VERSION = 2;   // bump to discard palettes cached against the old image
  var ROOT = document.documentElement;

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

  function apply(vars) {
    for (var k in vars) {
      if (Object.prototype.hasOwnProperty.call(vars, k)) {
        ROOT.style.setProperty(k, vars[k]);
      }
    }
    paintIcon(vars['--blue-deep']);
  }

  function paintIcon(fill) {
    var link = document.querySelector('link[rel="icon"]');
    if (!fill || !link) { return; }
    var svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>" +
      "<rect width='64' height='64' rx='10' fill='" + fill + "'/>" +
      "<text x='32' y='42' font-family='system-ui,sans-serif' font-size='22' " +
      "font-weight='700' text-anchor='middle' fill='#ffffff'>SRB</text></svg>";
    link.href = 'data:image/svg+xml,' + encodeURIComponent(svg);
  }

  // Bin pixels by hue, weighted so vivid midtones count and the near-black
  // background does not.
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
    var hist = new Array(100).fill(0);
    var total = 0, n = 0;

    for (var i = 0; i < px.length; i += 4) {
      var r = px[i], g = px[i + 1], b = px[i + 2];
      hist[Math.min(99, Math.floor(lum([r, g, b]) * 100))] += 1; n += 1;

      var hsl = rgbToHsl(r, g, b), h = hsl[0], s = hsl[1], l = hsl[2];

      if (l < 0.12 || l > 0.92 || s < 0.22) { continue; }
      var w = s * l;
      var idx = Math.min(BUCKETS - 1, Math.floor(h / (360 / BUCKETS)));
      weight[idx] += w; hSum[idx] += h * w; sSum[idx] += s * w;
      total += w;
    }
    if (total < 12) { return null; }

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
    // Lift the link colour until it clears 4.5:1 on card glass, rather than
    // trusting the photograph to be kind.
    var signal = hslToRgb(ph, ps * 0.78, 0.70);
    for (var L = 0.70; L <= 0.93 && contrast(signal, card) < 4.5; L += 0.02) {
      signal = hslToRgb(ph, ps * 0.78, L);
    }

    var rim = hslToRgb(ph, ps * 0.80, 0.66);
    var mid = hslToRgb(ph, ps, 0.56);
    var deep = hslToRgb(ph, Math.min(0.92, ps * 1.1), 0.38);
    var bright = hslToRgb(ph, ps, 0.62);
    var second = hslToRgb(qh, qs * 0.78, 0.64);

    // Judge brightness on the top 8% of pixels, not the average: a dark photo
    // with one hot spot still needs a veil where the text lands.
    var acc = 0, topLum = 1;
    for (var k = 0; k < 100; k++) {
      acc += hist[k];
      if (acc >= n * 0.92) { topLum = (k + 0.5) / 100; break; }
    }
    var need = 0.183;
    var scrim = 0;
    if (topLum > need) {
      var want = Math.pow(need, 1 / 2.4) * 1.055 - 0.055;
      var have = Math.pow(topLum, 1 / 2.4) * 1.055 - 0.055;
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
  } catch (e) {  }

  // Cached against the image URL, so only the first visit does the work.
  var img = new Image();
  img.decoding = 'async';
  img.onload = function () {
    try {
      var vars = sample(img);
      if (!vars) { return; }
      apply(vars);
      try { localStorage.setItem(key, JSON.stringify(vars)); } catch (e2) {}
    } catch (e3) {
      // Tainted canvas, no 2d context, or a bug here: leave the site.css
      // defaults in place, but say so rather than failing silently.
      console.warn('theme.js could not read the palette:', e3);
    }
  };
  img.src = src;
})();
