/* Kosmopoliet OS — één plek om tekst veilig in HTML te zetten (v0.119.0).
   Vroeger stond dezelfde esc()-functie 18 keer gekopieerd, en escAttr() in app.js ontsnapte enkel " en <.
   Nu: één volledige versie (& < > " ') voor de OS-schermen, de klantenkaarten en de tests. Laadt vóór alle schermen. */
(function (root) {
  'use strict';
  var TEKENS = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return TEKENS[c]; }); }
  // Versie van deze code (v0.124.0). Moet gelijk zijn aan CACHE in sw.js; tools/controleer.js kijkt dat na, anders geen uitrol.
  // js/pouch-sync.js stuurt ze mee met elke aanvraag naar de databank; de server weigert schrijfacties van een andere versie.
  var VERSIE = 'v0.139.1';
  // Mail naar buiten (v0.131.0): leveranciers krijgen mail vanuit het zaakadres. De link opent Gmail in
  // dat account met een nieuw bericht klaar (aan, onderwerp, tekst); de gebruiker leest na en drukt zelf op verzenden.
  var ZAAK_MAIL = 'kosmopoliet.brugge@gmail.com';
  function mailLink(aan, onderwerp, tekst) {
    var naar = String(aan == null ? '' : aan).split(/[\s,;]+/).filter(function (a) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(a); });
    if (!naar.length) return '';
    return 'https://mail.google.com/mail/?authuser=' + encodeURIComponent(ZAAK_MAIL) + '&view=cm&fs=1&to=' + encodeURIComponent(naar.join(',')) +
      (onderwerp ? '&su=' + encodeURIComponent(onderwerp) : '') + (tekst ? '&body=' + encodeURIComponent(tekst) : '');
  }
  var api = { esc: esc, VERSIE: VERSIE, ZAAK_MAIL: ZAAK_MAIL, mailLink: mailLink };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) { root.KosmoHtml = api; root.KOSMO_VERSIE = VERSIE; }
})(typeof window !== 'undefined' ? window : this);
