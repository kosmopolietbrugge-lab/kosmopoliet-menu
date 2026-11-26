/* ============================================================
   Kosmopoliet — de kaartteksten zelf vertalen (gerechten, omschrijvingen, categorieën).

   De schermteksten van de gastkaart staan in js/i18n.js. Wat de zaak zelf op de kaart zet (namen, omschrijvingen,
   categorieën) verandert elke week en kan daar niet staan. Dat komt uit twee bronnen, de eerste wint:
     1. visual.kaartVertaling in de kaartgegevens: { "<Nederlandse tekst>": { en, fr, de, es, pt, ne } }
        Gevuld vanuit Menukaart-beheer (knop "Vertaal met AI"); reist mee naar de gastkaart en de website.
     2. de vaste basis in menu/kaart-vertaling-basis.js: { "<Nederlandse tekst>": [en, fr, de, es, pt, ne] | 1 }
   De gastkaart geeft beide aan I18N; die vertaalt elke tekst op het scherm zodra de gast een taal kiest
   (of de taal van zijn telefoon niet Nederlands is). Ontbreekt een taal, dan toont I18N het Engels.
   Sleutels mogen {n} bevatten (elk getal), net als in js/i18n.js.
   ============================================================ */
(function () {
  'use strict';
  var TALEN = ['en', 'fr', 'de', 'es', 'pt', 'ne'];
  var NUM = /\d+(?:[.,]\d+)*/g;
  function norm(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
  function basis() { return window.KosmoKaartBasis || {}; }
  function eigen(D) {
    try { var v = (D && D.getVisual && D.getVisual()) || {}; return v.kaartVertaling && typeof v.kaartVertaling === 'object' ? v.kaartVertaling : {}; } catch (e) { return {}; }
  }

  // Alle teksten die een gast kan zien: categorienamen, naam/omschrijving van beschikbare gerechten, kaartvoet.
  function teksten(D) {
    var uit = {}, v = {};
    try { v = D.getVisual() || {}; } catch (e) {}
    function zet(s) { s = norm(s); if (s && /[A-Za-zÀ-ÿ]{2}/.test(s)) uit[s] = 1; }
    (D.getCategories() || []).forEach(function (c) { if (!c.verborgen) zet(c.name); });
    (D.getItems(null, true) || []).forEach(function (it) { zet(it.name); zet(it.short); zet(it.long); zet(it.extra); });
    zet(v.disclaimer);
    return Object.keys(uit);
  }

  // De vertaling van één tekst in één taal, of null. 1 in de basis = blijft hetzelfde.
  function vind(D, s, taal) {
    s = norm(s);
    var e = eigen(D), b = basis(), i = TALEN.indexOf(taal), t = s.replace(NUM, '{n}');
    var x = (e[s] && e[s][taal]) || (e[t] && e[t][taal]);
    if (x) return x;
    var y = b[s] != null ? b[s] : b[t];
    if (y === 1) return s;
    return (y && y[i]) || null;
  }
  // Teksten die in minstens één taal nog geen vertaling hebben.
  function ontbrekend(D) {
    return teksten(D).filter(function (s) { return TALEN.some(function (l) { return !vind(D, s, l); }); });
  }

  // Op de gastkaart: alle vertalingen aan I18N geven. Opnieuw roepen na elke wijziging van de kaart.
  var laatste = '';
  function toepassen(D) {
    if (!window.I18N || !window.I18N.add) return;
    var e = eigen(D), b = basis(), per = {};
    TALEN.forEach(function (l, i) {
      var m = {};
      Object.keys(b).forEach(function (k) { var y = b[k]; if (y !== 1 && y && y[i]) m[k] = y[i]; });
      Object.keys(e).forEach(function (k) { var x = e[k] && e[k][l]; if (typeof x === 'string' && x.trim()) m[norm(k)] = x.trim(); });
      per[l] = m;
    });
    var sig = ''; try { sig = JSON.stringify(e); } catch (x) {}
    if (sig === laatste && toepassen._klaar) return;
    laatste = sig; toepassen._klaar = true;
    TALEN.forEach(function (l) { window.I18N.add(l, per[l]); });
  }

  /* ---------- in het OS: ontbrekende teksten laten vertalen door de AI-koppeling (/ai/lees) ----------
     Per keer 5 teksten × 6 talen = 30 velden (de koppeling neemt er hoogstens 40). Het resultaat komt in
     visual.kaartVertaling; de mens kan het daarna altijd nog aanpassen of wissen. */
  var NAAM = { en: 'Engels', fr: 'Frans', de: 'Duits', es: 'Spaans', pt: 'Portugees (Europees)', ne: 'Nepalees (Devanagari)' };
  function aiPakket(lijst) {
    var velden = [], tekst = [];
    lijst.forEach(function (s, n) {
      tekst.push('t' + n + ': ' + s);
      TALEN.forEach(function (l) { velden.push({ id: 't' + n + '_' + l, label: 'tekst t' + n + ' vertaald naar het ' + NAAM[l], type: 'tekst' }); });
    });
    return {
      taak: 'Vertaal de kaartteksten van een plantaardig eetcafé in Brugge. Merknamen, eigennamen en cocktailnamen blijven ongewijzigd; getallen, % en cl blijven staan. ' +
        'Staat er "NL / EN", geef dan enkel de vertaling (zonder schuine streep). Kort en natuurlijk, zoals op een menukaart.',
      velden: velden, tekst: tekst.join('\n')
    };
  }
  function aiLees(lijst, velden) {
    var uit = {};
    lijst.forEach(function (s, n) {
      var r = {};
      TALEN.forEach(function (l) { var x = velden && velden['t' + n + '_' + l]; if (typeof x === 'string' && x.trim()) r[l] = x.trim().slice(0, 600); });
      if (Object.keys(r).length) uit[s] = r;
    });
    return uit;
  }
  // Vertaalt de ontbrekende teksten; voortgang(klaar, totaal) na elk pakket. Geeft een belofte met het aantal vertaalde teksten.
  function vertaalMetAI(D, voortgang) {
    var lijst = ontbrekend(D), totaal = lijst.length, gedaan = 0;
    function volgende() {
      if (!lijst.length) return Promise.resolve(gedaan);
      var pak = lijst.splice(0, 5);
      return fetch('/ai/lees', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(aiPakket(pak)) })
        .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || 'De AI kon dit niet vertalen.'); return j; }); })
        .then(function (j) {
          var nieuw = aiLees(pak, j.velden), v = D.getVisual() || {}, kv = Object.assign({}, v.kaartVertaling || {});
          Object.keys(nieuw).forEach(function (k) { kv[k] = Object.assign({}, kv[k] || {}, nieuw[k]); gedaan++; });
          D.setVisual({ kaartVertaling: kv });
          if (voortgang) voortgang(totaal - lijst.length, totaal);
          return volgende();
        });
    }
    return volgende();
  }

  window.KosmoKaartVertaling = { TALEN: TALEN, teksten: teksten, vind: vind, ontbrekend: ontbrekend, toepassen: toepassen, aiPakket: aiPakket, aiLees: aiLees, vertaalMetAI: vertaalMetAI };
})();
