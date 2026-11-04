/* ============================================================
   Kosmopoliet — online- en menubakkaart: de hele kaart op één pagina (raam-menu.html)
   Haalt dezelfde gegevens op als de klantkaart en de website-kaart (via menu/gast-sync.js) en gebruikt dezelfde regels voor volgorde,
   soort en prijs (menu/menu-ui.js). Verandert er iets in het OS, dan verandert deze pagina vanzelf mee.
   Geen mandje, geen tafel: enkel kijken. Staand blad: eerst Specials, daaronder eten in 3 kolommen, daaronder dranken in maximaal 3 kolommen.
   Met ?menubak=1 zoekt de pagina de grootste lettergrootte waarmee het hele blad op het scherm past. Op de website scrolt de kaart gewoon, op een leesbare grootte.
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
    // Bovenaan Specials (en Suggesties of Promoties, als die er zijn), daaronder eten, daaronder dranken.
    var cats = UI.cats(D);
    function zone(soort) {
      return cats.filter(function (c) { return UI.kind(c) === soort; }).map(function (c) {
        var items = UI.items(D, c); if (!items.length) return '';
        return '<section class="r-cat' + (soort === 'special' ? ' r-spec' : '') + '"><h2>' + esc(c.name) + '</h2><ul>' + items.map(function (it) {
          // De Engelse naam enkel bij gerechten: bij dranken staat er bijna hetzelfde twee keer.
          var d = String(it.name || '').split(' / ');
          return '<li class="r-it"><span class="n">' + esc(ucfirst(d[0])) + (d[1] && it.station !== 'barzaal' ? ' <em>' + esc(d.slice(1).join(' / ')) + '</em>' : '') + '</span>' + price(it) + '</li>';
        }).join('') + '</ul></section>';
      }).join('');
    }
    var spec = zone('special'), eten = zone('food'), drank = zone('drink');
    $('#r-spec').innerHTML = spec || (eten || drank ? '' : '<p class="r-empty">De kaart is nog leeg.</p>');
    $('#r-eten').innerHTML = eten;
    $('#r-drank').innerHTML = drank;
    fit();
  }

  /* ---------- passen ---------- */
  // Menubak: het blad staat rechtop (9:16). Is het scherm zelf staand, dan vult het blad het hele scherm; anders staat het in het midden.
  var raam = document.getElementById('raam'), sheet = document.getElementById('sheet');
  function fits(u) {
    raam.style.fontSize = u + 'px';
    return sheet.offsetHeight <= window.innerHeight + 0.5 && sheet.scrollWidth <= sheet.clientWidth + 1;
  }
  function fit() {
    var menubak = new URLSearchParams(location.search).get('menubak') === '1', w = window.innerWidth, h = window.innerHeight;
    document.body.classList.toggle('scrol', !menubak);
    sheet.style.setProperty('--n', menubak || w >= 760 ? 3 : 1);
    if (!menubak) { raam.style.fontSize = ''; sheet.style.width = ''; return; }
    sheet.style.width = (w / h > 9 / 16 ? Math.floor(h * 9 / 16) : w) + 'px';
    var lo = 4, hi = 60;
    for (var i = 0; i < 10; i++) { var mid = (lo + hi) / 2; if (fits(mid)) lo = mid; else hi = mid; }
    fits(Math.floor(lo * 10) / 10);
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
