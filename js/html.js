/* Kosmopoliet OS — één plek om tekst veilig in HTML te zetten (v0.119.0).
   Vroeger stond dezelfde esc()-functie 18 keer gekopieerd, en escAttr() in app.js ontsnapte enkel " en <.
   Nu: één volledige versie (& < > " ') voor de OS-schermen, de klantenkaarten en de tests. Laadt vóór alle schermen. */
(function (root) {
  'use strict';
  var TEKENS = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return TEKENS[c]; }); }
  // Versie van deze code (v0.124.0). Moet gelijk zijn aan CACHE in sw.js; tools/controleer.js kijkt dat na, anders geen uitrol.
  // js/pouch-sync.js stuurt ze mee met elke aanvraag naar de databank; de server weigert schrijfacties van een andere versie.
  var VERSIE = 'v0.125.0';
  var api = { esc: esc, VERSIE: VERSIE };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) { root.KosmoHtml = api; root.KOSMO_VERSIE = VERSIE; }
})(typeof window !== 'undefined' ? window : this);
