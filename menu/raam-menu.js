/* ============================================================
   Kosmopoliet — etalagekaart: de hele kaart op één pagina (raam-menu.html)
   Haalt dezelfde gegevens op als de klantkaart en de website-kaart (via menu/gast-sync.js) en gebruikt dezelfde regels voor volgorde,
   soort en prijs (menu/menu-ui.js). Verandert er iets in het OS, dan verandert deze pagina vanzelf mee.
   Geen mandje, geen tafel: enkel kijken. De pagina zoekt zelf de grootste lettergrootte en het aantal kolommen waarmee alles net op het scherm past.
   ============================================================ */
(function () {
  'use strict';
  var D = window.KosmoData, UI = window.KosmoMenuUI;

  function $(s) { return document.querySelector(s); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
  function ucfirst(s) { s = String(s == null ? '' : s).trim(); return s.charAt(0).toUpperCase() + s.slice(1); }
  function price(it) { return UI.price(D, it, 'p', true); }

  // Een promotie eindigt zonder dat de kaart ververst: elke halve minuut kijken of er iets wijzigde en dan opnieuw tekenen.
  var _promoSig = '';
  function promoSig() { try { return D.getItems(null, true).map(function (i) { return D.promoActivePct ? D.promoActivePct(i) : 0; }).join(','); } catch (e) { return ''; } }

  /* ---------- tekenen ---------- */
  function render() {
    var v = D.getVisual();
    $('#r-logo').src = D.resolveImg(v.logo) || 'assets/img/mark-gold.png';
    $('#r-name').textContent = v.name || 'Kosmopoliet';
    $('#r-baseline').textContent = v.baseline || '';

    var cats = UI.cats(D), spec = cats.filter(function (c) { return c.id === 'specials'; })[0], rest = cats.filter(function (c) { return c !== spec; });
    var sp = $('#r-specials'), cols = $('#r-cols');

    var specItems = spec ? UI.items(D, spec) : [];
    if (specItems.length) {
      sp.hidden = false;
      sp.innerHTML = '<h2 class="r-spec-title">' + esc(spec.name) + '</h2><div class="r-spec-list">' + specItems.map(function (it) {
        return '<div class="r-card"><b>' + esc(ucfirst(it.name)) + '</b>' + (it.short ? '<small>' + esc(it.short) + '</small>' : '') + price(it) + '</div>';
      }).join('') + '</div>';
    } else { sp.hidden = true; sp.innerHTML = ''; }

    cols.innerHTML = rest.map(function (c) {
      var items = UI.items(D, c); if (!items.length) return '';
      return '<section class="r-cat k-' + UI.kind(c) + '"><h2>' + esc(c.name) + '</h2><ul>' + items.map(function (it) {
        return '<li class="r-it"><span class="n">' + esc(ucfirst(it.name)) + '</span><i class="dots"></i>' + price(it) + '</li>';
      }).join('') + '</ul></section>';
    }).join('') || (specItems.length ? '' : '<p class="r-empty">De kaart is nog leeg.</p>');
    fit();
  }

  /* ---------- passen ---------- */
  // Zoekt de combinatie (lettergrootte, aantal kolommen) met de grootste letters die nog net in het scherm past. ?kolommen=3 in het adres dwingt een aantal af.
  var raam = document.getElementById('raam'), sheet = document.getElementById('sheet');
  function fits(u, n) {
    sheet.style.setProperty('--n', n); raam.style.fontSize = u + 'px';
    return sheet.offsetHeight <= window.innerHeight + 0.5 && sheet.scrollWidth <= window.innerWidth + 1;
  }
  function fit() {
    var force = parseInt(new URLSearchParams(location.search).get('kolommen'), 10), best = { u: 0, n: 3 };
    var tries = force >= 1 && force <= 8 ? [force] : [1, 2, 3, 4, 5, 6];
    tries.forEach(function (n) {
      var lo = 5, hi = 56;
      if (!fits(lo, n)) { if (!best.u) best = { u: lo, n: n, over: true }; return; }
      for (var i = 0; i < 9; i++) { var mid = (lo + hi) / 2; if (fits(mid, n)) lo = mid; else hi = mid; }
      if (lo > best.u || best.over) best = { u: lo, n: n };
    });
    fits(Math.floor(best.u * 10) / 10 || 5, best.n);
  }
  var _rt; window.addEventListener('resize', function () { clearTimeout(_rt); _rt = setTimeout(fit, 150); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);

  /* ---------- scherm wakker houden, volledig scherm, muis verbergen ---------- */
  var _lock = null;
  function keepAwake() { try { if (navigator.wakeLock && !document.hidden) navigator.wakeLock.request('screen').then(function (l) { _lock = l; }).catch(function () {}); } catch (e) {} }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { keepAwake(); try { render(); } catch (e) {} } });
  document.addEventListener('dblclick', function () {
    try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); } catch (e) {}
  });
  var _idle; function wake() { document.body.classList.remove('idle'); clearTimeout(_idle); _idle = setTimeout(function () { document.body.classList.add('idle'); }, 3000); }
  document.addEventListener('mousemove', wake); wake();

  /* ---------- starten ---------- */
  function init() {
    if (!D || !UI) { document.body.innerHTML = '<p style="padding:40px;color:#fff">Data-laag niet geladen.</p>'; return; }
    var gastReady = (window.KosmoGastReady && window.KosmoGastReady.catch(function () {})) || Promise.resolve();
    gastReady.then(function () {
      D.ready(function () {
        render(); keepAwake(); _promoSig = promoSig();
        D.subscribe(function (kind) { if (kind === 'data') render(); });
        setInterval(function () { var s = promoSig(); if (s !== _promoSig) { _promoSig = s; render(); } }, 30000);
        // Een scherm dat dagen blijft staan: elke nacht om 04:xx de pagina helemaal opnieuw laden (nieuwe code, geheugen leeg).
        setInterval(function () { var d = new Date(); if (d.getHours() === 4 && d.getMinutes() < 2 && performance.now() > 3600000) location.reload(); }, 60000);
      });
    });
  }
  document.addEventListener('DOMContentLoaded', init);
})();
