/* ============================================================
   Kosmopoliet — gast-sync voor de PUBLIEKE kaart (website, enkel kijken)

   Vervangt menu/gast-sync.js op de website. De echte versie praat met de
   centrale pc (/gast/kaart, mandje, bestellen). Deze leest enkel kaart.json,
   het bestand dat de server bij elke wijziging in het OS opnieuw wegschrijft.
   Geen mandje, geen tafel, geen bestelling: er is niets om naartoe te sturen.
   De rest van de pagina (website-menu.js, data.js, menu.css) is exact dezelfde
   code als in het OS, zodat de website-kaart altijd hetzelfde toont.
   ============================================================ */
(function () {
  'use strict';
  var D = window.KosmoData; if (!D) return;
  var DKEY = 'kosmo-menu-data-v1';
  var _set = localStorage.setItem.bind(localStorage);

  function pull() {
    return fetch('kaart.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (r) {
      if (!r || r.error) return;
      var nd = JSON.stringify({ visual: r.visual, categories: r.categories, items: r.items, askBillEnabled: false });
      if (nd === localStorage.getItem(DKEY)) return;
      _set(DKEY, nd);
      try { D.emit('data'); } catch (e) {}
    }).catch(function () {});
  }

  try { D.setMediaMode('media/'); } catch (e) {}
  window.KosmoGastReady = pull();
  setInterval(pull, 60000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) pull(); });
})();
