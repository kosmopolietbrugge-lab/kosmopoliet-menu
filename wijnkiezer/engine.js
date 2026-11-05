/* ============================================================
   Wijnkiezer — gedeelde engine
   Data laden, huisstijl toepassen, filteren, smaakmatch en food pairing.
   Wordt gebruikt door de klant-app (index.html), de backoffice (beheer.html)
   en het horeca-advies (horeca.html).
   ============================================================ */
(function () {
  'use strict';

  var DRAFT_KEY = 'wijnkiezer-concept-v1';

  /* ---------- Vaste lijsten (taxonomie) ---------- */
  var KLEUREN = [
    ['rood', 'Rood'], ['wit', 'Wit'], ['rose', 'Rosé'], ['bubbels', 'Bubbels'],
    ['zoet', 'Zoet / dessert'], ['versterkt', 'Port & sherry']
  ];
  var INGREDIENTEN = [
    ['aperitief', 'Aperitief / hapjes'], ['groenten', 'Groenten'], ['paddenstoelen', 'Paddenstoelen'],
    ['peulvruchten', 'Peulvruchten'], ['plantaardig-eiwit', 'Tofu / seitan / tempeh'],
    ['pasta-risotto', 'Pasta & risotto'], ['vis', 'Vis'], ['schaaldieren', 'Schaal- & schelpdieren'],
    ['gevogelte', 'Gevogelte'], ['varken', 'Varken'], ['rund', 'Rund'], ['lam', 'Lam'], ['wild', 'Wild'],
    ['kaas-zacht', 'Zachte kaas'], ['kaas-hard', 'Harde kaas'], ['kaas-blauw', 'Blauwe kaas'],
    ['fruitdessert', 'Fruitdessert'], ['chocolade', 'Chocolade']
  ];
  var BEREIDING = [
    ['rauw', 'Rauw'], ['gestoomd', 'Gestoomd / gepocheerd'], ['gebakken', 'Gebakken'],
    ['gegrild', 'Gegrild / BBQ'], ['gestoofd', 'Gestoofd'], ['gefrituurd', 'Gefrituurd'], ['gerookt', 'Gerookt']
  ];
  var SMAKEN = [
    ['zuur', 'Zuur / fris'], ['zoet', 'Zoet'], ['zout', 'Zout'], ['pittig', 'Pikant'],
    ['umami', 'Umami'], ['romig', 'Romig / vettig'], ['bitter', 'Bitter'], ['kruidig', 'Kruidig / aromatisch']
  ];
  var SMAAKASSEN = [
    ['body', 'Body', 'licht', 'vol'], ['zoet', 'Zoetheid', 'droog', 'zoet'],
    ['zuur', 'Frisheid', 'zacht', 'fris'], ['tannine', 'Tannine', 'soepel', 'stevig'],
    ['fruit', 'Fruit', 'ingetogen', 'uitbundig'], ['hout', 'Hout', 'geen', 'veel']
  ];

  function label(list, key) { for (var i = 0; i < list.length; i++) if (list[i][0] === key) return list[i][1]; return key; }

  /* ---------- Data ---------- */
  function load(opts) {
    opts = opts || {};
    var draft = null;
    if (opts.preferDraft) { try { draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch (e) {} }
    if (draft) return Promise.resolve(normalize(draft));
    return fetch((opts.base || '') + 'wijnen.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('wijnen.json ' + r.status); return r.json(); })
      .then(normalize);
  }
  function getDraft() { try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch (e) { return null; } }
  function saveDraft(db) { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(db)); return true; } catch (e) { return false; } }
  function clearDraft() { try { localStorage.removeItem(DRAFT_KEY); } catch (e) {} }

  function normalize(db) {
    db.instellingen = db.instellingen || {};
    db.wijnen = (db.wijnen || []).map(normWine);
    return db;
  }
  function num(v, d) { var n = parseFloat(v); return isNaN(n) ? d : n; }
  function normWine(w) {
    w = w || {};
    var s = w.smaak || {};
    return {
      id: String(w.id || slug(w.naam || 'wijn') + '-' + Math.random().toString(36).slice(2, 6)),
      naam: w.naam || '', producent: w.producent || '', jaar: w.jaar || null,
      kleur: w.kleur || 'rood', land: w.land || '', regio: w.regio || '',
      druiven: arr(w.druiven), prijs: (w.prijs === null || w.prijs === '' || w.prijs === undefined) ? null : num(w.prijs, null),
      inhoud: num(w.inhoud, 75), alcohol: (w.alcohol === null || w.alcohol === '' || w.alcohol === undefined) ? null : num(w.alcohol, null),
      vegan: w.vegan === true || w.vegan === false ? w.vegan : null, bio: !!w.bio,
      smaak: { body: num(s.body, 3), zoet: num(s.zoet, 1), zuur: num(s.zuur, 3), tannine: num(s.tannine, 1), fruit: num(s.fruit, 3), hout: num(s.hout, 1) },
      aromas: arr(w.aromas), pairing: arr(w.pairing),
      serveertemp: w.serveertemp || '', omschrijving: w.omschrijving || '', url: w.url || '', foto: w.foto || '',
      actief: w.actief !== false, uitgelicht: !!w.uitgelicht, bron: w.bron || 'fiche',
      inkoop: (w.inkoop === undefined || w.inkoop === '' ) ? null : num(w.inkoop, null)
    };
  }
  function arr(v) {
    if (Array.isArray(v)) return v.map(function (x) { return String(x).trim(); }).filter(Boolean);
    if (!v) return [];
    return String(v).split(/[;,|]/).map(function (x) { return x.trim(); }).filter(Boolean);
  }
  function slug(s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40); }

  /* ---------- Huisstijl ---------- */
  function applyTheme(st) {
    var k = (st && st.kleuren) || {};
    var r = document.documentElement.style;
    if (k.primair) r.setProperty('--primair', k.primair);
    if (k.accent) r.setProperty('--accent', k.accent);
    if (k.achtergrond) r.setProperty('--bg', k.achtergrond);
    if (k.oppervlak) r.setProperty('--surface', k.oppervlak);
    if (k.tekst) r.setProperty('--text', k.tekst);
    if (st.fontTitel) r.setProperty('--fd', st.fontTitel);
    if (st.fontTekst) r.setProperty('--fb', st.fontTekst);
    var m = document.querySelector('meta[name=theme-color]'); if (m && k.primair) m.setAttribute('content', k.primair);
  }

  /* ---------- Filteren ---------- */
  function filter(wines, f, st) {
    f = f || {};
    return wines.filter(function (w) {
      if (!w.actief) return false;
      if (st && st.toonDemo === false && w.bron === 'demo') return false;
      if (f.kleuren && f.kleuren.length && f.kleuren.indexOf(w.kleur) < 0) return false;
      if (f.landen && f.landen.length && f.landen.indexOf(w.land) < 0) return false;
      if (f.prijsMin != null && w.prijs != null && w.prijs < f.prijsMin) return false;
      if (f.prijsMax != null && w.prijs != null && w.prijs > f.prijsMax) return false;
      if (f.vegan && w.vegan !== true) return false;
      if (f.bio && !w.bio) return false;
      if (f.pairing && f.pairing.length && !f.pairing.some(function (p) { return w.pairing.indexOf(p) >= 0; })) return false;
      if (f.q) {
        var hay = [w.naam, w.producent, w.land, w.regio, w.druiven.join(' '), w.aromas.join(' '), w.omschrijving].join(' ').toLowerCase();
        if (f.q.toLowerCase().split(/\s+/).some(function (t) { return t && hay.indexOf(t) < 0; })) return false;
      }
      return true;
    });
  }

  /* Smaakmatch: hoe dicht ligt een wijn bij het gewenste profiel (0–100) */
  function tasteScore(w, target) {
    var keys = Object.keys(target || {}).filter(function (k) { return target[k] != null; });
    if (!keys.length) return 50;
    var d = 0; keys.forEach(function (k) { d += Math.abs((w.smaak[k] || 0) - target[k]); });
    return Math.round(100 - (d / (keys.length * 4)) * 100);
  }

  /* ---------- Food pairing ----------
     dish = { ing:[...], bereiding:[...], smaken:[...], intensiteit:1-5 }
     Geeft { score:0-100, redenen:[{t, plus:bool}] } terug.
     Regels gebaseerd op klassieke sommelierprincipes; gewichten zijn bijstelbaar. */
  function pair(w, dish) {
    var s = 50, R = [];
    var sm = w.smaak, ing = dish.ing || [], ber = dish.bereiding || [], fl = dish.smaken || [];
    var bubbels = w.kleur === 'bubbels', zoetw = w.kleur === 'zoet' || w.kleur === 'versterkt';
    function add(n, t) { s += n; if (t) R.push({ t: t, plus: n > 0 }); }
    function has(a, k) { return a.indexOf(k) >= 0; }

    var match = ing.filter(function (i) { return w.pairing.indexOf(i) >= 0; });
    if (match.length) add(Math.min(26, 16 + match.length * 5), 'Klassieke combinatie met ' + match.map(function (m) { return label(INGREDIENTEN, m).toLowerCase(); }).join(', '));

    var inten = dish.intensiteit || 3, diff = Math.abs(sm.body - inten);
    if (diff === 0) add(10, 'Body en intensiteit van het gerecht zijn in evenwicht');
    else if (diff >= 2) add(-8 * diff, sm.body > inten ? 'Wijn is te krachtig voor dit gerecht' : 'Wijn is te licht voor dit gerecht');

    if (has(fl, 'zoet') || has(ing, 'fruitdessert') || has(ing, 'chocolade')) {
      if (sm.zoet >= 4) add(16, 'Wijn is minstens zo zoet als het gerecht');
      else if (sm.zoet <= 2) add(-22, 'Zoet gerecht maakt een droge wijn zuur en dun');
    } else if (zoetw && !has(ing, 'kaas-blauw') && !has(fl, 'zout') && !has(fl, 'pittig')) add(-14, 'Dessertwijn is te zoet voor een hartig gerecht');

    if (has(fl, 'zuur')) { if (sm.zuur >= 4) add(10, 'Frisse zuren houden stand tegen het zuur in het gerecht'); else if (sm.zuur <= 2) add(-12, 'Zuur gerecht laat deze wijn vlak smaken'); }
    if (has(fl, 'pittig')) {
      if (sm.tannine >= 4) add(-14, 'Pikant + stevige tannines = branderig');
      if (w.alcohol && w.alcohol >= 14) add(-6, 'Hoog alcohol versterkt de pikantheid');
      if (sm.zoet >= 2 || sm.fruit >= 4) add(9, 'Fruit of een vleugje zoet tempert het pikante');
    }
    if (has(fl, 'zout')) { if (bubbels) add(10, 'Bubbels en zout: een topcombinatie'); if (sm.zoet >= 3) add(8, 'Zoet en zout versterken elkaar'); }
    if (has(fl, 'umami')) { if (sm.tannine >= 4) add(-10, 'Umami maakt tannines bitterder'); else if (sm.fruit >= 4) add(5, 'Rijp fruit vangt de umami op'); }
    if (has(fl, 'romig')) {
      if (sm.zuur >= 4 || bubbels) add(8, 'Frisheid snijdt door het romige');
      if (sm.hout >= 3 && sm.body >= 3) add(6, 'Houtgerijpte volheid sluit aan bij het romige');
    }
    if (has(fl, 'bitter') && sm.tannine >= 4) add(-8, 'Bitter + tannine stapelt op');
    if (has(fl, 'kruidig') && sm.fruit >= 4) add(5, 'Aromatische wijn ondersteunt de kruiden');

    if (has(ber, 'gegrild') || has(ber, 'gerookt')) { if (sm.body >= 3) add(6, 'Grill- en rooktoetsen vragen om wat body'); if (sm.hout >= 3) add(4); }
    if ((has(ber, 'rauw') || has(ber, 'gestoomd')) && sm.body <= 2) add(6, 'Lichte bereiding, lichte wijn');
    if (has(ber, 'gefrituurd') && (bubbels || sm.zuur >= 4)) add(9, 'Frisheid of bubbels reinigen het gehemelte na gefrituurd');
    if (has(ber, 'gestoofd') && sm.body >= 4) add(6, 'Stoofgerecht en volle wijn');

    if ((has(ing, 'vis') || has(ing, 'schaaldieren')) && sm.tannine >= 4) add(-15, 'Tannine en vis geven een metaalsmaak');
    if ((has(ing, 'rund') || has(ing, 'lam') || has(ing, 'wild')) && sm.tannine >= 3) add(8, 'Tannines en eiwit verzachten elkaar');
    if (has(ing, 'paddenstoelen') && (w.aromas.join(' ').match(/bosgrond|aard|truffel/))) add(6, 'Aardse toetsen spiegelen de paddenstoelen');

    s = Math.max(0, Math.min(100, Math.round(s)));
    return { score: s, redenen: R };
  }

  function rankForDish(wines, dish, n) {
    return wines.map(function (w) { var p = pair(w, dish); return { w: w, score: p.score, redenen: p.redenen }; })
      .sort(function (a, b) { return b.score - a.score; }).slice(0, n || wines.length);
  }

  /* Gerecht automatisch profileren uit naam + omschrijving (voor menukaart-advies).
     Trefwoorden zijn een vertrekpunt; in horeca.html kan je alles manueel bijstellen. */
  var KW = [
    [/(truffel|zwam|champignon|portobello|paddenstoel|shiitake|enoki|oesterzwam|mushroom)/, 'ing', 'paddenstoelen'],
    [/(linzen|daal|dal\b|kikkererwt|bonen|humus|hummus|falafel)/, 'ing', 'peulvruchten'],
    [/(seitan|tofu|tempeh|burger|nomet)/, 'ing', 'plantaardig-eiwit'],
    [/(pasta|linguine|spaghetti|risotto|gnocchi|tagliatelle|lasagne)/, 'ing', 'pasta-risotto'],
    [/(zalm|kabeljauw|tonijn|vis\b|zeebaars|tarbot|fish)/, 'ing', 'vis'],
    [/(garnaal|kreeft|\boesters?\b|mossel|scampi|sint-jakobs)/, 'ing', 'schaaldieren'],
    [/(kip|eend|kalkoen|gevogelte|chicken)/, 'ing', 'gevogelte'],
    [/(rund|steak|entrecote|beef)/, 'ing', 'rund'], [/(lam\b|lamsvlees)/, 'ing', 'lam'], [/(varken|spek|ham\b)/, 'ing', 'varken'],
    [/(chocola|brownie|mousse au chocolat|callebaut|callebout)/, 'ing', 'chocolade'],
    [/(taart|fruit|sorbet|ijs\b|ijs |crumble|dame blanche|kardemom)/, 'ing', 'fruitdessert'],
    [/(olijf|olijven|bruschetta|kroket|amuse|lookbro|nootjes|chips)/, 'ing', 'aperitief'],
    [/(groente|courgette|paprika|biet|pompoen|venkel|salade|slaatje|tomaat|zeewier|wakame|zeesla|zeekraal|koolrabi)/, 'ing', 'groenten'],
    [/(gegrild|grill|geroosterd|bbq|barbecue)/, 'ber', 'gegrild'], [/(gerookt|rook)/, 'ber', 'gerookt'],
    [/(gefrituurd|kroket|gepaneerd|wedges|frietjes|tempura|amuses)/, 'ber', 'gefrituurd'],
    [/(stoof|stoverij|gestoofd|daal|curry)/, 'ber', 'gestoofd'], [/(rauw|tartaar|carpaccio|salade|slaatje)/, 'ber', 'rauw'],
    [/(citroen|limoen|zuur|gefermenteerd|kappers|azijn|tomaat|salsa|dressing|yoghurt|yoghurt)/, 'sm', 'zuur'],
    [/(pikant|pittig|spicy|chili|jalape|harissa|sriracha|peper)/, 'sm', 'pittig'],
    [/(zeewier|wakame|zeesla|zeekraal|soja|miso|truffel|paddenstoel|portobello|zwam|tomaat|parmez)/, 'sm', 'umami'],
    [/(room|roomsaus|kaas|cheddar|veganaise|mayo|emulsie|rouille|boter|aioli|pesto|haverroom)/, 'sm', 'romig'],
    [/(olijf|kappers|zout|gezouten|chips|zeekraal)/, 'sm', 'zout'],
    [/(chocola|taart|ijs\b|ijs |suiker|karamel|honing|dame blanche|kardemom ijs)/, 'sm', 'zoet'],
    [/(basilicum|koriander|munt|dragon|dille|bieslook|kruiden|kardemom|gember|specerij)/, 'sm', 'kruidig'],
    [/(rucola|radicchio|witloof|cacao|grapefruit)/, 'sm', 'bitter']
  ];
  function profileDish(name, desc, course) {
    var t = (String(name || '') + ' ' + String(desc || '')).toLowerCase();
    var d = { ing: [], bereiding: [], smaken: [], intensiteit: 3 };
    KW.forEach(function (k) {
      if (!k[0].test(t)) return;
      var tgt = k[1] === 'ing' ? d.ing : k[1] === 'ber' ? d.bereiding : d.smaken;
      if (tgt.indexOf(k[2]) < 0) tgt.push(k[2]);
    });
    if (course === 'dessert') { if (d.smaken.indexOf('zoet') < 0) d.smaken.push('zoet'); d.intensiteit = 3; }
    else {
      var heavy = /(stoof|stoverij|burger|truffel|daal|risotto|steak|wild|gestoofd|flammkuchen|portobello)/.test(t);
      var light = /(salade|slaatje|olijf|rauw|gestoomd|soep|bruschetta)/.test(t);
      d.intensiteit = heavy ? 4 : light ? 2 : 3;
      if (course === 'tapas' && d.intensiteit > 3) d.intensiteit = 3;
    }
    if (!d.ing.length) d.ing.push(course === 'dessert' ? 'fruitdessert' : 'groenten');
    return d;
  }

  /* ---------- Hulpjes ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function euro(n) { return n == null ? 'prijs op aanvraag' : '€ ' + Number(n).toFixed(2).replace('.', ','); }
  function veganLabel(v) { return v === true ? 'Vegan' : v === false ? 'Niet vegan' : 'Vegan: onbekend'; }
  function bars(sm) {
    return '<div class="bars">' + SMAAKASSEN.map(function (a) {
      var v = sm[a[0]] || 0;
      return '<div class="bar"><span class="bl">' + a[1] + '</span><span class="bt"><i style="width:' + (v * 20) + '%"></i></span><span class="bx">' + a[2] + ' · ' + a[3] + '</span></div>';
    }).join('') + '</div>';
  }

  window.Wijnkiezer = {
    KLEUREN: KLEUREN, INGREDIENTEN: INGREDIENTEN, BEREIDING: BEREIDING, SMAKEN: SMAKEN, SMAAKASSEN: SMAAKASSEN,
    label: label, load: load, normalize: normalize, normWine: normWine, arr: arr, slug: slug,
    getDraft: getDraft, saveDraft: saveDraft, clearDraft: clearDraft, DRAFT_KEY: DRAFT_KEY,
    applyTheme: applyTheme, filter: filter, tasteScore: tasteScore, pair: pair, rankForDish: rankForDish,
    profileDish: profileDish, esc: esc, euro: euro, veganLabel: veganLabel, bars: bars
  };
})();
