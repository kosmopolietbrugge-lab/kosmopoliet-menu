/* Kosmopoliet OS — één plek om tekst veilig in HTML te zetten (v0.119.0).
   Vroeger stond dezelfde esc()-functie 18 keer gekopieerd, en escAttr() in app.js ontsnapte enkel " en <.
   Nu: één volledige versie (& < > " ') voor de OS-schermen, de klantenkaarten en de tests. Laadt vóór alle schermen. */
(function (root) {
  'use strict';
  var TEKENS = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return TEKENS[c]; }); }
  var api = { esc: esc };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.KosmoHtml = api;
})(typeof window !== 'undefined' ? window : this);
