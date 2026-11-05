/* ============================================================
   Wijnkiezer — cadeaumodus en hoeveelheidscalculator
   Gebruikt window.WK (kaart, fiche, toast…) uit app.js.
   ============================================================ */
(function () {
  'use strict';
  var W = window.Wijnkiezer, esc = W.esc;
  var $ = function (id) { return document.getElementById(id); };
  function wines() { return window.WK ? WK.wines() : []; }
  function st() { return window.WK ? WK.st() : {}; }
  function eur(n) { return '€ ' + Number(n).toFixed(2).replace('.', ','); }
  function chips(list, cur, multi, grp) {
    return list.map(function (c) {
      var on = multi ? cur.indexOf(c[0]) >= 0 : String(cur) === String(c[0]);
      return '<button class="chip' + (on ? ' on' : '') + '" data-g="' + grp + '" data-k="' + c[0] + '">' + c[1] + '</button>';
    }).join('');
  }
  function choices(list, cur, grp) {
    return list.map(function (c) { return '<button class="choice' + (c[0] === cur ? ' on' : '') + '" data-g="' + grp + '" data-k="' + c[0] + '"><b>' + c[1] + '</b><small>' + c[2] + '</small></button>'; }).join('');
  }
  function send(subject, text) {
    var mail = st().email;
    if (mail) { location.href = 'mailto:' + encodeURIComponent(mail) + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(text); return; }
    if (navigator.share) { navigator.share({ title: subject, text: text }).catch(function () {}); return; }
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { WK.toast('Gekopieerd: plak het in een bericht of e-mail'); });
    else prompt('Kopieer deze tekst', text);
  }

  /* ============================================================
     CADEAUMODUS
     ============================================================ */
  var VOOR = [
    ['kenner', 'Wijnkenner', 'Kent zijn klassiekers, zoekt karakter'],
    ['liefhebber', 'Liefhebber', 'Drinkt graag en geregeld wijn'],
    ['beginner', 'Beginnende proever', 'Houdt het liefst toegankelijk'],
    ['onbekend', 'Weet ik niet', 'Een veilige keuze die iedereen smaakt']
  ];
  var GELEG = [
    ['verjaardag', 'Verjaardag'], ['bedankje', 'Bedankje'], ['eindejaar', 'Kerst & nieuwjaar'], ['housewarming', 'Housewarming'],
    ['huwelijk', 'Huwelijk / jubileum'], ['zakelijk', 'Relatiegeschenk (zakelijk)']
  ];
  var CMAX = 200;
  var AANTAL = [[1, '1 fles'], [2, '2 flessen'], [3, '3 flessen'], [6, 'Kistje van 6']];
  var KAART = {
    verjaardag: 'Gelukkige verjaardag! Op een jaar vol mooie momenten. Proost!',
    bedankje: 'Dankjewel, van harte. Geniet ervan!',
    eindejaar: 'Prettige feestdagen en een smaakvol nieuwjaar!',
    housewarming: 'Proficiat met jullie nieuwe thuis! Op vele gezellige avonden.',
    huwelijk: 'Proficiat! Op de liefde en op nog vele mooie jaren samen.',
    zakelijk: 'Bedankt voor de fijne samenwerking. Op een succesvol nieuw jaar!'
  };
  var cd = { voor: 'onbekend', gel: 'verjaardag', kleuren: [], budget: [15, 40], aantal: 1, mix: true, stuks: 1, vegan: false, gekozen: null };

  function giftScore(w, perFles) {
    var s = 50, R = [], sm = w.smaak;
    function add(n, t) { s += n; if (t) R.push(t); }
    if (w.prijs != null && perFles) {
      var target = perFles * 0.85, fit = 1 - Math.abs(target - w.prijs) / target;
      add(Math.round(Math.max(-1, fit) * 18), fit > 0.6 ? 'Mooi binnen je budget' : null);
    } else if (w.prijs == null) add(-6);
    if (cd.voor === 'kenner') {
      if (sm.hout >= 3 || sm.body >= 4) add(10, 'Karaktervolle wijn voor een kenner');
      if (w.prijs != null && w.prijs >= 25) add(6);
      if (w.bron === 'demo' && /chablis|bourgogne|rioja|champagne|sauternes/i.test(w.naam + w.regio)) add(4, 'Klassieke appellatie');
    } else if (cd.voor === 'beginner') {
      if (sm.fruit >= 4) add(10, 'Toegankelijk en fruitig');
      if (sm.tannine <= 2) add(8, 'Soepel, zonder harde tannines');
      if (sm.tannine >= 4 || sm.hout >= 4) add(-10);
    } else {
      var crowd = sm.body >= 2 && sm.body <= 4 && sm.tannine <= 3 && sm.zoet <= 2;
      if (crowd) add(cd.voor === 'onbekend' ? 12 : 6, 'Smaakt bijna iedereen');
      if (sm.zoet >= 4 && cd.kleuren.indexOf('zoet') < 0) add(-12);
    }
    if (cd.gel === 'huwelijk' && w.kleur === 'bubbels') add(14, 'Bubbels om op te klinken');
    if (cd.gel === 'eindejaar') { if (w.kleur === 'bubbels') add(8, 'Feestelijk voor de eindejaarsperiode'); if (w.kleur === 'rood' && sm.body >= 4) add(8, 'Vol en warm voor de wintermaanden'); if (w.kleur === 'versterkt') add(5); }
    if (cd.gel === 'zakelijk') { if (sm.tannine <= 3 && sm.zoet <= 2) add(6, 'Veilige keuze voor een zakelijke relatie'); if (w.bio) add(3, 'Bio'); }
    if (cd.gel === 'housewarming' && sm.fruit >= 4) add(4);
    if (w.uitgelicht) add(8, 'Aanrader van het huis');
    return { score: Math.max(0, Math.min(100, Math.round(s))), redenen: R };
  }

  function pakketten() {
    var bmax = cd.budget[1] >= CMAX ? 0 : cd.budget[1], perFles = bmax ? bmax / cd.aantal : 0, minFles = cd.budget[0] / cd.aantal * 0.8;
    var fx = { kleuren: cd.kleuren, prijsMin: null, prijsMax: null }; if (cd.vegan) fx.vegan = true;
    var pr = WK.pre();
    var pool = WK.f(fx)
      .filter(function (w) { return (pr.formaten.length || W.formaat(w) !== 'halve') && (pr.alcohol === 'vrij' || !(w.alcohol != null && w.alcohol <= 0.5)); })
      .filter(function (w) { return w.prijs == null || ((!perFles || w.prijs <= perFles * 1.05) && w.prijs >= minFles); });
    var rank = pool.map(function (w) { var g = giftScore(w, perFles || (cd.budget[0] ? cd.budget[0] / cd.aantal * 1.3 : 0)); return { w: w, score: g.score, redenen: g.redenen }; })
      .sort(function (a, b) { return b.score - a.score; });
    var out = [], usedFirst = [];
    for (var p = 0; p < 3 && rank.length; p++) {
      var avail = rank.filter(function (r) { return usedFirst.indexOf(r.w.id) < 0; }); if (!avail.length) break;
      var set = [avail[0]];
      if (cd.aantal > 1 && cd.mix) {
        var distinct = Math.min(cd.aantal, 3);
        while (set.length < distinct) {
          var next = avail.find(function (r) { return set.indexOf(r) < 0 && !set.some(function (x) { return x.w.kleur === r.w.kleur; }); }) ||
            avail.find(function (r) { return set.indexOf(r) < 0; });
          if (!next) break; set.push(next);
        }
      }
      // flessen verdelen over de gekozen wijnen
      var flessen = set.map(function () { return 0; });
      for (var i = 0; i < cd.aantal; i++) flessen[i % set.length]++;
      var regels = set.map(function (r, j) { return { w: r.w, n: flessen[j] }; });
      var totaal = 0, onbekend = false;
      regels.forEach(function (r) { if (r.w.prijs == null) onbekend = true; else totaal += r.w.prijs * r.n; });
      out.push({ regels: regels, totaal: totaal, onbekend: onbekend, score: Math.round(set.reduce(function (a, r) { return a + r.score; }, 0) / set.length), redenen: set[0].redenen });
      usedFirst.push(avail[0].w.id);
    }
    return out;
  }

  function renderCadeau() {
    var v = $('v-cadeau');
    v.innerHTML =
      '<div class="step"><h2>Voor wie is het cadeau?</h2><div class="choices">' + choices(VOOR, cd.voor, 'voor') + '</div></div>' +
      '<div class="step"><h2>Wat is de gelegenheid?</h2><div class="chips">' + chips(GELEG, cd.gel, false, 'gel') + '</div></div>' +
      '<div class="step"><h2>Wat drinkt de ontvanger graag?</h2><p class="sub">Niets aanduiden = weet ik niet.</p><div class="chips">' + chips(W.KLEUREN, cd.kleuren, true, 'kleuren') + '</div>' +
      '<label class="tog" style="margin-top:10px"><input type="checkbox" id="c-vegan"' + (cd.vegan ? ' checked' : '') + '> Ontvanger eet/drinkt vegan</label></div>' +
      '<div class="step"><h2>Budget en grootte</h2>' +
      '<p class="sub">Budget per cadeau (min – max)</p><div id="c-bud"></div>' +
      '<p class="sub" style="margin-top:12px">Aantal flessen per cadeau</p><div class="chips">' + chips(AANTAL, cd.aantal, false, 'aantal') + '</div>' +
      (cd.aantal > 1 ? '<p class="sub" style="margin-top:12px">Samenstelling</p><div class="chips">' + chips([['1', 'Verschillende wijnen'], ['0', 'Allemaal dezelfde']], cd.mix ? '1' : '0', false, 'mix') + '</div>' : '') +
      '<label class="tog" style="margin-top:14px">Aantal cadeaus <input type="number" id="c-stuks" min="1" value="' + cd.stuks + '" class="search" style="width:90px;margin-left:8px"> <small class="meta">bv. voor klanten of personeel</small></label></div>' +
      '<div id="c-res"></div><div id="c-kaart"></div>';
    W.dualRange($('c-bud'), { min: 0, max: CMAX, step: 5, value: cd.budget, fmt: function (v, k) { return k === 'max' && v >= CMAX ? '€ ' + CMAX + '+' : '€ ' + v; },
      onChange: function (v) { cd.budget = v; cd.gekozen = null; clearTimeout(renderCadeau._t); renderCadeau._t = setTimeout(renderCadeauRes, 120); } });
    renderCadeauRes();
  }
  function renderCadeauRes() {
    var P = pakketten(), N = Math.max(1, cd.stuks | 0);
    var html = '<h2 style="margin:6px 0 10px">Onze cadeausuggesties</h2>';
    if (!P.length) { $('c-res').innerHTML = html + '<div class="empty">Geen wijnen binnen deze keuzes. Verhoog het budget of laat de kleur open.</div>'; $('c-kaart').innerHTML = ''; return; }
    html += '<div class="grid">' + P.map(function (p, i) {
      var tot = p.totaal ? eur(p.totaal) + (p.onbekend ? ' + prijs op aanvraag' : '') : 'prijs op aanvraag';
      var over = cd.budget[1] < CMAX && p.totaal > cd.budget[1];
      return '<div class="step gift' + (cd.gekozen === i ? ' on' : '') + '" style="margin:0">' +
        '<div class="row" style="justify-content:space-between"><b class="gift-t">' + ['Onze topkeuze', 'Alternatief', 'Iets anders'][i] + '</b><span class="tag">' + p.score + '% match</span></div>' +
        '<ul class="gift-l">' + p.regels.map(function (r) { return '<li><a href="#" data-fiche="' + esc(r.w.id) + '">' + r.n + ' × ' + esc(r.w.naam) + '</a> <span class="meta">' + (r.w.prijs != null ? eur(r.w.prijs) : 'op aanvraag') + '</span></li>'; }).join('') + '</ul>' +
        (p.redenen.length ? '<ul class="why">' + p.redenen.slice(0, 3).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' : '') +
        '<p class="price" style="margin:10px 0 2px">' + tot + (N > 1 ? ' <span class="meta">per cadeau</span>' : '') + '</p>' +
        (N > 1 && p.totaal ? '<p class="meta" style="margin:0">' + N + ' cadeaus: <b>' + eur(p.totaal * N) + '</b>' + (p.onbekend ? ' + op aanvraag' : '') + '</p>' : '') +
        (over ? '<p class="meta" style="color:#9b3b3b;margin:4px 0 0">Iets boven budget</p>' : '') +
        '<button class="cta' + (cd.gekozen === i ? '' : ' alt') + '" style="margin-top:10px" data-kies="' + i + '">' + (cd.gekozen === i ? '✓ Gekozen' : 'Kies dit cadeau') + '</button></div>';
    }).join('') + '</div>';
    if (N >= 10 || cd.gel === 'zakelijk') html += '<p class="demo-note" style="margin-top:12px">Zakelijke bestelling of meer dan 10 cadeaus? Vraag in de winkel naar volumeprijzen, levering en personalisatie.</p>';
    $('c-res').innerHTML = html;
    renderKaartje(P);
  }
  function renderKaartje(P) {
    if (cd.gekozen == null || !P[cd.gekozen]) { $('c-kaart').innerHTML = ''; return; }
    var msg = cd.msg != null ? cd.msg : KAART[cd.gel] || '';
    $('c-kaart').innerHTML = '<div class="step" style="margin-top:14px"><h2>Kaartje</h2>' +
      '<div class="form" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px">' +
      '<label class="meta">Voor<input class="search" id="c-voor" value="' + esc(cd.aan || '') + '"></label>' +
      '<label class="meta">Van<input class="search" id="c-van" value="' + esc(cd.van || '') + '"></label></div>' +
      '<label class="meta" style="display:block;margin-top:10px">Tekst op het kaartje<textarea class="search" id="c-msg" rows="3">' + esc(msg) + '</textarea></label>' +
      '<label class="tog"><input type="checkbox" id="c-inpak"' + (cd.inpak !== false ? ' checked' : '') + '> Graag mooi ingepakt</label>' +
      '<div class="row" style="margin-top:12px">' + (st().bestellen !== false ? '<button class="cta" id="c-cart">In mandje</button>' : '') + '<button class="cta alt" id="c-send">Deel</button>' +
      '<button class="cta alt" id="c-fav">Zet in Bewaard</button></div>' +
      '<p class="sub" style="margin-top:8px">Het kaartje en de inpakwens gaan mee met je bestelling.</p></div>';
    ['c-voor', 'c-van', 'c-msg'].forEach(function (id) { $(id).oninput = function () { cd[{ 'c-voor': 'aan', 'c-van': 'van', 'c-msg': 'msg' }[id]] = this.value; }; });
    $('c-inpak').onchange = function () { cd.inpak = this.checked; };
    $('c-fav').onclick = function () { P[cd.gekozen].regels.forEach(function (r) { if (!WK.isFav(r.w.id)) WK.toggleFav(r.w.id); }); WK.toast('Toegevoegd aan Bewaard'); };
    if ($('c-cart')) $('c-cart').onclick = function () {
      var p = P[cd.gekozen], N = Math.max(1, cd.stuks | 0);
      var note = 'Cadeau (' + W.label(GELEG, cd.gel) + (N > 1 ? ', ' + N + ' stuks' : '') + (cd.aan ? ', voor ' + cd.aan : '') + ')' + (cd.inpak !== false ? ' · inpakken' : '') +
        ' · kaartje' + (cd.van ? ' van ' + cd.van : '') + ': "' + ($('c-msg').value || '') + '"';
      WKOrder.addMany(p.regels.map(function (r) { return { id: r.w.id, n: r.n * N }; }), note);
    };
    $('c-send').onclick = function () {
      var p = P[cd.gekozen], N = Math.max(1, cd.stuks | 0);
      var t = 'Cadeaubestelling via de Wijnkiezer\n\n' +
        'Gelegenheid: ' + W.label(GELEG, cd.gel) + '\nVoor: ' + W.label(VOOR, cd.voor) + (cd.aan ? ' (' + cd.aan + ')' : '') + '\n' +
        'Aantal cadeaus: ' + N + '\n\nPer cadeau:\n' + p.regels.map(function (r) { return '- ' + r.n + ' × ' + r.w.naam + (r.w.prijs != null ? ' (' + eur(r.w.prijs) + ')' : ''); }).join('\n') +
        '\n\nTotaal: ' + (p.totaal ? eur(p.totaal * N) : '—') + (p.onbekend ? ' + prijs op aanvraag' : '') +
        '\nInpakken: ' + (cd.inpak !== false ? 'ja' : 'nee') +
        '\n\nKaartje' + (cd.van ? ' (van ' + cd.van + ')' : '') + ':\n' + ($('c-msg').value || '') + '\n\nNaam en telefoon besteller: ';
      send('Cadeaubestelling', t);
    };
  }
  function bindCadeau() {
    var v = $('v-cadeau');
    v.addEventListener('click', function (e) {
      var f = e.target.closest('[data-fiche]'); if (f) { e.preventDefault(); WK.openFiche(f.dataset.fiche); return; }
      var k = e.target.closest('[data-kies]'); if (k) { cd.gekozen = +k.dataset.kies; renderCadeauRes(); $('c-kaart').scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
      var b = e.target.closest('[data-g]'); if (!b) return;
      var g = b.dataset.g, val = b.dataset.k;
      if (g === 'kleuren') { var i = cd.kleuren.indexOf(val); if (i >= 0) cd.kleuren.splice(i, 1); else cd.kleuren.push(val); }
      else if (g === 'budget' || g === 'aantal') cd[g] = +val;
      else if (g === 'mix') cd.mix = val === '1';
      else { cd[g] = val; if (g === 'gel') cd.msg = null; }
      cd.gekozen = null; renderCadeau();
    });
    v.addEventListener('change', function (e) {
      if (e.target.id === 'c-vegan') { cd.vegan = e.target.checked; cd.gekozen = null; renderCadeauRes(); }
    });
    v.addEventListener('input', function (e) {
      if (e.target.id === 'c-stuks') { cd.stuks = Math.max(1, +e.target.value || 1); renderCadeauRes(); }
    });
  }

  /* ============================================================
     HOEVEELHEIDSCALCULATOR
     Vuistregel: 2 glazen het eerste uur, daarna 1 glas per uur.
     Stille wijn: 6 glazen van 12,5 cl per fles; bubbels: 7 flûtes per fles.
     ============================================================ */
  var TYPES = [
    ['receptie', 'Receptie / aperitief', 'Staand, hapjes'],
    ['diner', 'Diner aan tafel', 'Aperitief + wijn bij het eten'],
    ['walking', 'Walking dinner', 'Kleine gerechtjes, lang'],
    ['feest', 'Feest / BBQ', 'Ontspannen, buiten of binnen']
  ];
  var TEMPO = [['0.8', 'Rustig'], ['1', 'Gemiddeld'], ['1.25', 'Feestelijk']];
  var SPLIT = {
    receptie: { zomer: { bubbels: .5, wit: .25, rose: .15, rood: .10 }, winter: { bubbels: .5, wit: .2, rose: .05, rood: .25 } },
    diner: { zomer: { wit: .45, rose: .15, rood: .40 }, winter: { wit: .35, rose: 0, rood: .65 } },
    walking: { zomer: { bubbels: .3, wit: .35, rose: .1, rood: .25 }, winter: { bubbels: .3, wit: .3, rose: .05, rood: .35 } },
    feest: { zomer: { bubbels: .15, wit: .3, rose: .3, rood: .25 }, winter: { bubbels: .2, wit: .3, rose: .1, rood: .4 } }
  };
  var GLAZEN_PER_FLES = { bubbels: 7, wit: 6, rose: 6, rood: 6, zoet: 8 };
  var hv = { gasten: 40, uren: 4, type: 'receptie', seizoen: (new Date().getMonth() >= 3 && new Date().getMonth() <= 8) ? 'zomer' : 'winter', tempo: '1', niet: 10, marge: true, dozen: false, dessert: false, keuze: {}, extra: {} };

  function bereken() {
    var drinkers = Math.max(0, Math.round(hv.gasten * (1 - hv.niet / 100)));
    var perPers = (hv.uren >= 1 ? 2 + (hv.uren - 1) : 2 * hv.uren) * parseFloat(hv.tempo);
    var glazen = drinkers * perPers, split = SPLIT[hv.type][hv.seizoen], res = {};
    if (hv.type === 'diner') { res.bubbels = drinkers * 1; glazen = Math.max(0, glazen - drinkers); }
    Object.keys(split).forEach(function (k) { res[k] = (res[k] || 0) + glazen * split[k]; });
    if (hv.dessert) res.zoet = drinkers;
    var fl = {};
    Object.keys(res).forEach(function (k) {
      if (!res[k]) return;
      var n = res[k] / GLAZEN_PER_FLES[k]; if (hv.marge) n *= 1.1;
      n = Math.ceil(n); if (hv.dozen) n = Math.ceil(n / 6) * 6;
      n += hv.extra[k] || 0;
      if (n > 0) fl[k] = n;
    });
    return { drinkers: drinkers, perPers: perPers, glazenTot: Object.keys(res).reduce(function (a, k) { return a + res[k]; }, 0), flessen: fl };
  }
  function kandidaten(kleur) {
    return WK.f({ kleuren: [kleur] })
      .map(function (w) { var sm = w.smaak, s = (w.uitgelicht ? 20 : 0) + (sm.tannine <= 3 ? 8 : 0) + (sm.zoet <= 2 || kleur === 'zoet' ? 6 : 0) + (w.prijs != null ? 10 - Math.min(10, w.prijs / 4) : 0) + (w.bron === 'demo' ? 0 : 3); return { w: w, s: s }; })
      .sort(function (a, b) { return b.s - a.s; }).map(function (x) { return x.w; });
  }
  function renderHoeveel() {
    var v = $('v-hoeveel');
    v.innerHTML =
      '<div class="step"><h2>Hoeveel flessen heb ik nodig?</h2><p class="sub">Voor een feest, receptie, diner of bedrijfsevent.</p>' +
      '<div class="hv-in">' +
      '<label>Aantal volwassen gasten<input type="number" class="search" id="h-gasten" min="1" value="' + hv.gasten + '"></label>' +
      '<label>Duur (uren)<input type="number" class="search" id="h-uren" min="0.5" step="0.5" value="' + hv.uren + '"></label>' +
      '<label>Niet-drinkers (%)<input type="number" class="search" id="h-niet" min="0" max="100" step="5" value="' + hv.niet + '"></label>' +
      '</div>' +
      '<p class="sub" style="margin-top:14px">Budget per fles</p><div id="h-bud"></div>' +
      '<p class="sub" style="margin-top:14px">Soort event</p><div class="choices">' + choices(TYPES, hv.type, 'type') + '</div>' +
      '<p class="sub" style="margin-top:14px">Seizoen</p><div class="chips">' + chips([['zomer', 'Lente / zomer'], ['winter', 'Herfst / winter']], hv.seizoen, false, 'seizoen') + '</div>' +
      '<p class="sub" style="margin-top:14px">Tempo van de gasten</p><div class="chips">' + chips(TEMPO, hv.tempo, false, 'tempo') + '</div>' +
      '<div style="margin-top:14px">' +
      '<label class="tog"><input type="checkbox" id="h-marge"' + (hv.marge ? ' checked' : '') + '> 10 % reserve</label>' +
      '<label class="tog"><input type="checkbox" id="h-dozen"' + (hv.dozen ? ' checked' : '') + '> Afronden per doos van 6</label>' +
      (hv.type === 'diner' ? '<label class="tog"><input type="checkbox" id="h-dessert"' + (hv.dessert ? ' checked' : '') + '> Dessertwijn bij het dessert</label>' : '') +
      '<p class="sub" style="margin-top:6px">Vegan, bio, land…? <button class="lnk" data-open-pre>Stel je voorkeuren in</button></p></div></div>' +
      '<div id="h-res"></div>';
    WK.budgetSlider($('h-bud'));
    renderHoeveelRes();
  }
  function renderHoeveelRes() {
    var r = bereken(), rows = '', totaal = 0, onbekend = false, totFl = 0;
    var order = ['bubbels', 'wit', 'rose', 'rood', 'zoet'];
    order.forEach(function (k) {
      var n = r.flessen[k]; if (!n) return; totFl += n;
      var cands = kandidaten(k), sel = cands.find(function (w) { return w.id === hv.keuze[k]; }) || cands[0];
      var sub = sel && sel.prijs != null ? sel.prijs * n : null;
      if (sub != null) totaal += sub; else onbekend = true;
      rows += '<tr><td><span class="tag k-' + k + '">' + esc(W.label(W.KLEUREN, k)) + '</span></td>' +
        '<td class="hv-n"><button class="chip" data-adj="' + k + '" data-d="-1" aria-label="min">−</button> <b>' + n + '</b> <button class="chip" data-adj="' + k + '" data-d="1" aria-label="plus">+</button></td>' +
        '<td>' + (cands.length ? '<select class="search hv-sel" data-kleur="' + k + '">' + cands.map(function (w) { return '<option value="' + esc(w.id) + '"' + (w === sel ? ' selected' : '') + '>' + esc(w.naam) + ' · ' + (w.prijs != null ? eur(w.prijs) : 'op aanvraag') + '</option>'; }).join('') + '</select>' : '<span class="meta">geen wijn in deze selectie</span>') + '</td>' +
        '<td class="price">' + (sub != null ? eur(sub) : '—') + '</td></tr>';
    });
    var water = Math.ceil(hv.gasten * (0.5 + hv.uren * 0.25));
    var nietDr = hv.gasten - r.drinkers;
    $('h-res').innerHTML = '<div class="kpi-row">' +
      '<div><b>' + totFl + '</b><small>flessen in totaal</small></div>' +
      '<div><b>' + (Math.round(r.perPers * 10) / 10).toString().replace('.', ',') + '</b><small>glazen per drinkende gast</small></div>' +
      '<div><b>' + r.drinkers + '</b><small>gasten die wijn drinken</small></div>' +
      '<div><b>' + (totaal ? eur(totaal) : '—') + '</b><small>geschat totaal' + (onbekend ? ' (+ op aanvraag)' : '') + '</small></div></div>' +
      (rows ? '<div class="tbl-wrap"><table class="tbl hv-t"><tr><th>Soort</th><th>Flessen</th><th>Wijn</th><th>Subtotaal</th></tr>' + rows + '</table></div>' : '<div class="empty">Vul het aantal gasten en de duur in.</div>') +
      '<ul class="why" style="margin-top:12px">' +
      '<li>Vuistregel: 2 glazen het eerste uur, daarna 1 glas per uur' + (hv.tempo !== '1' ? ', aangepast aan het tempo' : '') + '.</li>' +
      '<li>1 fles = 6 glazen wijn of 7 flûtes bubbels' + (hv.dessert ? ', dessertwijn ± 8 kleine glaasjes' : '') + '.</li>' +
      (hv.type === 'diner' ? '<li>Bij een diner rekenen we 1 glas bubbels als aperitief per gast.</li>' : '') +
      '<li>Voorzie daarnaast ± ' + water + ' l water' + (nietDr ? ' en alcoholvrije dranken voor ' + nietDr + ' gasten' : '') + '.</li></ul>' +
      (rows ? '<div class="row" style="margin-top:12px">' + (st().bestellen !== false ? '<button class="cta" id="h-cart">Alles in mandje</button>' : '') + '<button class="cta alt" id="h-send">Deel lijstje</button><button class="cta alt" id="h-fav">Zet in Bewaard</button><button class="cta alt" onclick="print()">Afdrukken</button></div>' +
        '<p class="sub" style="margin-top:8px">Twijfel je? In de winkel helpen we je graag verder met het juiste aantal en de keuze.</p>' : '');
  }
  function gekozen() {
    var r = bereken(), l = [];
    Object.keys(r.flessen).forEach(function (k) { var c = kandidaten(k), w = c.find(function (x) { return x.id === hv.keuze[k]; }) || c[0]; if (w) l.push({ k: k, n: r.flessen[k], w: w }); });
    return l;
  }
  function bindHoeveel() {
    var v = $('v-hoeveel');
    v.addEventListener('click', function (e) {
      var a = e.target.closest('[data-adj]');
      if (a) { var k = a.dataset.adj, cur = bereken().flessen[k] || 0, d = +a.dataset.d * (hv.dozen ? 6 : 1); if (cur + d >= 0) hv.extra[k] = (hv.extra[k] || 0) + d; renderHoeveelRes(); return; }
      if (e.target.id === 'h-fav') { gekozen().forEach(function (g) { if (!WK.isFav(g.w.id)) WK.toggleFav(g.w.id); }); WK.toast('Toegevoegd aan Bewaard'); return; }
      if (e.target.id === 'h-cart') { WKOrder.addMany(gekozen().map(function (g) { return { id: g.w.id, n: g.n }; }), W.label(TYPES, hv.type) + ' · ' + hv.gasten + ' gasten · ' + hv.uren + ' uur'); return; }
      if (e.target.id === 'h-send') {
        var l = gekozen(), tot = 0, onb = false;
        var t = 'Bestellijst via de Wijnkiezer\n\n' + W.label(TYPES, hv.type) + ' · ' + hv.gasten + ' gasten · ' + hv.uren + ' uur\n\n' +
          l.map(function (g) { if (g.w.prijs != null) tot += g.w.prijs * g.n; else onb = true; return '- ' + g.n + ' × ' + g.w.naam + (g.w.prijs != null ? ' (' + eur(g.w.prijs) + '/fles)' : ''); }).join('\n') +
          '\n\nGeschat totaal: ' + (tot ? eur(tot) : '—') + (onb ? ' + prijs op aanvraag' : '') + '\n\nNaam en telefoon: \nGewenste afhaal-/leverdatum: ';
        send('Bestellijst event', t); return;
      }
      var b = e.target.closest('[data-g]'); if (!b) return;
      hv[b.dataset.g] = b.dataset.k; hv.extra = {}; renderHoeveel();
    });
    v.addEventListener('input', function (e) {
      var id = e.target.id, map = { 'h-gasten': 'gasten', 'h-uren': 'uren', 'h-niet': 'niet' };
      if (map[id]) { hv[map[id]] = Math.max(0, parseFloat(e.target.value) || 0); hv.extra = {}; renderHoeveelRes(); }
    });
    v.addEventListener('change', function (e) {
      var id = e.target.id;
      if (e.target.classList.contains('hv-sel')) { hv.keuze[e.target.dataset.kleur] = e.target.value; renderHoeveelRes(); return; }
      var map = { 'h-marge': 'marge', 'h-dozen': 'dozen', 'h-dessert': 'dessert' };
      if (map[id]) { hv[map[id]] = e.target.checked; hv.extra = {}; renderHoeveelRes(); }
    });
  }

  var bound = false;
  window.WKTools = {
    init: function () { if (bound) return; bound = true; bindCadeau(); bindHoeveel(); },
    cadeau: function () { if (!$('v-cadeau').innerHTML) renderCadeau(); else renderCadeauRes(); },
    hoeveel: function () { if (!$('v-hoeveel').innerHTML) renderHoeveel(); else renderHoeveelRes(); },
    _bereken: bereken, _hv: hv
  };
})();
