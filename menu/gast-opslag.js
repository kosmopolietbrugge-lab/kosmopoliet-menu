/* ============================================================
   Kosmopoliet — eigen opslag voor de klantenkaarten. Laadt als EERSTE script, vóór js/data.js.

   Staan het OS en een klantenkaart open in dezelfde browser, dan delen ze dezelfde localStorage. De kaart schrijft daar elke
   paar seconden de GASTVERSIE van de menukaart weg, zonder gearchiveerde en niet-voorradige gerechten. Het OS las die versie
   en bewaarde ze bij de volgende wijziging op de Kissing Karrots Server: gerechten verdwenen of kwamen terug met een nieuwe code.
   Daarom krijgt elke kosmo-sleutel hier het voorvoegsel "gast:". Het OS laadt dit bestand niet en ziet die sleutels niet.
   ============================================================ */
(function () {
  'use strict';
  var S = window.Storage && window.Storage.prototype; if (!S) return;
  var lees = S.getItem, schrijf = S.setItem, wis = S.removeItem, ls = null;
  try { ls = window.localStorage; } catch (e) { return; }
  function sleutel(o, k) { k = String(k); return (o === ls && k.indexOf('kosmo-') === 0) ? 'gast:' + k : k; }
  S.getItem = function (k) { return lees.call(this, sleutel(this, k)); };
  S.setItem = function (k, v) { return schrijf.call(this, sleutel(this, k), v); };
  S.removeItem = function (k) { return wis.call(this, sleutel(this, k)); };
})();
