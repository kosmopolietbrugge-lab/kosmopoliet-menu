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

  /* Ingrediënten in groepen. De groepssleutel (bv. "groenten") is zelf ook
     een geldige pairing-tag: een wijn die "groenten" heeft, past algemeen bij
     groenten; "asperge" is specifieker en weegt zwaarder. */
  var GROEPEN = [
    ['aperitief', 'Aperitief & hapjes', [['olijven-noten', 'Olijven, noten & chips'], ['gefrituurde-hapjes', 'Kroketjes & gefrituurde hapjes']]],
    ['groenten', 'Groenten', [
      ['asperge', 'Asperges'], ['artisjok', 'Artisjok'], ['tomaat', 'Tomaat'], ['paprika', 'Paprika'], ['aubergine', 'Aubergine'],
      ['courgette', 'Courgette'], ['pompoen', 'Pompoen & zoete aardappel'], ['wortelgroenten', 'Wortel, pastinaak & knolselder'],
      ['biet', 'Rode biet'], ['prei-ui', 'Prei, ui & look'], ['kool', 'Kool, spruitjes & broccoli'], ['bladgroen', 'Spinazie & bladgroen'],
      ['venkel', 'Venkel'], ['erwten-boontjes', 'Erwten & groene boontjes'], ['avocado', 'Avocado'], ['mais', 'Maïs'], ['witloof', 'Witloof & bittere sla']]],
    ['paddenstoelen', 'Paddenstoelen', [['champignon', 'Champignon & oesterzwam'], ['bospaddenstoelen', 'Bospaddenstoelen & portobello'], ['truffel', 'Truffel']]],
    ['peulvruchten', 'Peulvruchten', [['linzen', 'Linzen'], ['kikkererwten', 'Kikkererwten & hummus'], ['bonen', 'Bonen']]],
    ['plantaardig-eiwit', 'Plantaardig eiwit', [['tofu', 'Tofu'], ['tempeh', 'Tempeh'], ['seitan', 'Seitan'], ['noten-zaden', 'Noten & zaden'], ['vegan-kaas', 'Vegan kaas']]],
    ['zee', 'Uit de zee', [['zeewier', 'Zeewier & zeekraal'], ['vis', 'Vis'], ['schaaldieren', 'Schaal- & schelpdieren']]],
    ['granen', 'Pasta, rijst & granen', [['pasta-risotto', 'Pasta & risotto'], ['pizza-brood', 'Pizza, flammkuchen & brood'], ['granen-bulgur', 'Couscous, bulgur & quinoa']]],
    ['vlees', 'Vlees', [['gevogelte', 'Gevogelte'], ['varken', 'Varken'], ['rund', 'Rund'], ['lam', 'Lam'], ['wild', 'Wild']]],
    ['kaas', 'Kaas', [['kaas-zacht', 'Zachte kaas'], ['geitenkaas', 'Geitenkaas'], ['kaas-hard', 'Harde kaas'], ['kaas-blauw', 'Blauwe kaas']]],
    ['dessert', 'Dessert', [['fruitdessert', 'Fruit & taart'], ['chocolade', 'Chocolade'], ['karamel-noten', 'Karamel, noten & koekjes']]]
  ];
  var GROEP_VAN = {}, INGREDIENTEN = [];
  GROEPEN.forEach(function (g) {
    INGREDIENTEN.push([g[0], g[1]]);
    g[2].forEach(function (i) { GROEP_VAN[i[0]] = g[0]; INGREDIENTEN.push(i); });
  });

  var BEREIDING = [
    ['rauw', 'Rauw'], ['gestoomd', 'Gestoomd / gepocheerd'], ['gebakken', 'Gebakken'],
    ['gegrild', 'Gegrild / BBQ'], ['geroosterd', 'Geroosterd in de oven'], ['gestoofd', 'Gestoofd'], ['gefrituurd', 'Gefrituurd'], ['gerookt', 'Gerookt']
  ];
  var SMAKEN = [
    ['zuur', 'Zuur / fris'], ['zoet', 'Zoet'], ['zout', 'Zout'], ['pittig', 'Pikant'],
    ['umami', 'Umami'], ['romig', 'Romig / vettig'], ['bitter', 'Bitter'], ['kruidig', 'Kruidig / aromatisch']
  ];
  var KEUKENS = [
    ['mediterraan', 'Mediterraan', ['kruidig']], ['italiaans', 'Italiaans', ['zuur', 'umami']], ['aziatisch', 'Aziatisch', ['umami', 'zoet', 'zout']],
    ['thais', 'Thais / Vietnamees', ['pittig', 'zuur', 'kruidig']], ['indiaas', 'Indiaas', ['pittig', 'kruidig']], ['mexicaans', 'Mexicaans', ['pittig']],
    ['midden-oosten', 'Midden-Oosten', ['kruidig']], ['belgisch', 'Belgisch / Frans', ['romig']]
  ];
  var SMAAKASSEN = [
    ['body', 'Body', 'licht', 'vol'], ['zoet', 'Zoetheid', 'droog', 'zoet'],
    ['zuur', 'Frisheid', 'zacht', 'fris'], ['tannine', 'Tannine', 'soepel', 'stevig'],
    ['fruit', 'Fruit', 'ingetogen', 'uitbundig'], ['hout', 'Hout', 'geen', 'veel']
  ];
  var FORMATEN = [['halve', 'Halve fles (37,5 cl)'], ['fles', 'Fles (75 cl)'], ['magnum', 'Magnum (150 cl)'], ['ander', 'Ander formaat']];
  var LEVENSSTIJL = [
    ['vegan', 'Vegan'], ['bio', 'Bio'], ['biodynamisch', 'Biodynamisch'], ['natuurwijn', 'Natuurwijn'], ['sulfietarm', 'Zonder toegevoegde sulfieten']
  ];

  function label(list, key) { for (var i = 0; i < list.length; i++) if (list[i][0] === key) return list[i][1]; return key; }
  function formaat(w) { var c = w.inhoud || 75; return c <= 50 ? 'halve' : c >= 140 ? 'magnum' : (c >= 70 && c <= 80) ? 'fles' : 'ander'; }

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
  function nullNum(v) { return (v === null || v === '' || v === undefined) ? null : num(v, null); }
  function normWine(w) {
    w = w || {};
    var s = w.smaak || {};
    return {
      id: String(w.id || slug(w.naam || 'wijn') + '-' + Math.random().toString(36).slice(2, 6)),
      naam: w.naam || '', producent: w.producent || '', jaar: w.jaar || null,
      kleur: w.kleur || 'rood', land: w.land || '', regio: w.regio || '',
      druiven: arr(w.druiven), prijs: nullNum(w.prijs), inhoud: num(w.inhoud, 75), alcohol: nullNum(w.alcohol),
      vegan: w.vegan === true || w.vegan === false ? w.vegan : null, bio: !!w.bio,
      biodynamisch: !!w.biodynamisch, natuurwijn: !!w.natuurwijn, sulfietarm: !!w.sulfietarm,
      voorraad: w.voorraad !== false,
      smaak: { body: num(s.body, 3), zoet: num(s.zoet, 1), zuur: num(s.zuur, 3), tannine: num(s.tannine, 1), fruit: num(s.fruit, 3), hout: num(s.hout, 1) },
      aromas: arr(w.aromas), pairing: arr(w.pairing),
      serveertemp: w.serveertemp || '', omschrijving: w.omschrijving || '', url: w.url || '', foto: w.foto || '',
      actief: w.actief !== false, uitgelicht: !!w.uitgelicht, bron: w.bron || 'fiche',
      inkoop: nullNum(w.inkoop)
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
    st = st || {};
    var k = st.kleuren || {};
    var r = document.documentElement.style;
    if (k.primair) r.setProperty('--primair', k.primair);
    if (k.accent) r.setProperty('--accent', k.accent);
    if (k.achtergrond) r.setProperty('--bg', k.achtergrond);
    if (k.oppervlak) r.setProperty('--surface', k.oppervlak);
    if (k.tekst) r.setProperty('--text', k.tekst);
    if (st.fontTitel) r.setProperty('--fd', st.fontTitel);
    if (st.fontTekst) r.setProperty('--fb', st.fontTekst);
    var m = document.querySelector('meta[name=theme-color]'); if (m && k.achtergrond) m.setAttribute('content', k.achtergrond);
  }

  /* ---------- Pairing-tags ---------- */
  // Hoe goed past een wijn bij één ingrediënt: 2 = specifiek vermeld, 1 = via de groep, 0 = niet vermeld
  function pairLevel(w, key) {
    if (w.pairing.indexOf(key) >= 0) return 2;
    var g = GROEP_VAN[key];
    if (g && w.pairing.indexOf(g) >= 0) return 1;
    if (!g && w.pairing.some(function (p) { return GROEP_VAN[p] === key; })) return 1;  // groep gevraagd, wijn noemt een lid
    return 0;
  }

  /* ---------- Filteren ---------- */
  function filter(wines, f, st) {
    f = f || {};
    return wines.filter(function (w) {
      if (!w.actief) return false;
      if (st && st.toonDemo === false && w.bron === 'demo') return false;
      if (f.kleuren && f.kleuren.length && f.kleuren.indexOf(w.kleur) < 0) return false;
      if (f.landen && f.landen.length && f.landen.indexOf(w.land) < 0) return false;
      if (f.regios && f.regios.length && f.regios.indexOf(w.regio) < 0) return false;
      if (f.druiven && f.druiven.length && !f.druiven.some(function (d) { return w.druiven.indexOf(d) >= 0; })) return false;
      if (f.formaten && f.formaten.length && f.formaten.indexOf(formaat(w)) < 0) return false;
      if (f.prijsMin != null && w.prijs != null && w.prijs < f.prijsMin) return false;
      if (f.prijsMax != null && w.prijs != null && w.prijs > f.prijsMax) return false;
      if (f.vegan && w.vegan !== true) return false;
      if (f.bio && !w.bio) return false;
      if (f.biodynamisch && !w.biodynamisch) return false;
      if (f.natuurwijn && !w.natuurwijn) return false;
      if (f.sulfietarm && !w.sulfietarm) return false;
      if (f.alcohol === 'vrij' && !(w.alcohol != null && w.alcohol <= 0.5)) return false;
      if (f.alcohol === 'laag' && !(w.alcohol != null && w.alcohol <= 11)) return false;
      if (f.voorraad && !w.voorraad) return false;
      if (f.pairing && f.pairing.length && !f.pairing.some(function (p) { return pairLevel(w, p) > 0; })) return false;
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
     dish = { ing:[...], bereiding:[...], smaken:[...], keuken:[...], intensiteit:1-5 }
     Geeft { score:0-100, redenen:[{t, plus:bool}] } terug. */
  function aroma(w, re) { return re.test((w.aromas.join(' ') + ' ' + w.druiven.join(' ')).toLowerCase()); }
  var AARDS = /bosgrond|aard|truffel|paddenstoel|leder|pinot/;

  // Regels per specifiek ingrediënt (sommelierkennis, vooral voor groenten)
  var ING_REGELS = {
    asperge: function (w, s, add) {
      if (s.tannine >= 3) add(-14, 'Asperge maakt tannines metaalachtig');
      if (s.hout >= 3) add(-8, 'Hout overstemt de fijne asperge');
      if (w.kleur === 'wit' && s.zuur >= 4) add(12, 'Frisse droge witte wijn is de klassieker bij asperges');
      if (aroma(w, /sauvignon|riesling|gr[uü]ner|gras|kruisbes/)) add(6, 'Groene, grassige toetsen spiegelen de asperge');
    },
    artisjok: function (w, s, add) {
      if (s.tannine >= 3) add(-12, 'Artisjok laat rode wijn zoetig en metalig smaken');
      if (s.zuur >= 4 && s.hout <= 2) add(10, 'Frisse wijn zonder hout houdt stand tegen artisjok');
    },
    tomaat: function (w, s, add) {
      if (s.zuur >= 4) add(10, 'Tomaat vraagt om veel frisheid');
      else if (s.zuur <= 2) add(-10, 'De zuren van tomaat maken deze wijn vlak');
      if (aroma(w, /sangiovese|barbera|grenache/)) add(5, 'Mediterrane druif bij tomaat');
    },
    paprika: function (w, s, add) {
      if (w.kleur === 'rose') add(8, 'Rosé en paprika: een zuiders duo');
      if (aroma(w, /sauvignon|cabernet franc/)) add(5, 'Groene paprikatoets in de wijn');
      if (s.fruit >= 4 && s.tannine <= 3) add(4);
    },
    aubergine: function (w, s, add) {
      if (s.body >= 3 && s.tannine >= 2 && s.tannine <= 4) add(8, 'Aubergine kan een soepele rode wijn aan');
    },
    courgette: function (w, s, add) { if (s.body <= 3 && s.hout <= 2) add(6, 'Lichte groente, lichte wijn'); },
    pompoen: function (w, s, add) {
      if (w.kleur === 'wit' && (s.hout >= 3 || s.body >= 4)) add(10, 'Volle, romige witte wijn bij zoetige pompoen');
      if (aroma(w, /viognier|chardonnay|abrikoos/)) add(6, 'Abrikoos- en botertoetsen passen bij pompoen');
      if (s.tannine >= 4) add(-6);
    },
    wortelgroenten: function (w, s, add) {
      if (s.zoet >= 2 || s.fruit >= 4) add(7, 'Zoetige wortelgroenten houden van fruit of een vleugje zoet');
      if (s.tannine >= 4) add(-5);
    },
    biet: function (w, s, add) {
      if (aroma(w, AARDS)) add(9, 'Aardse toetsen sluiten aan bij rode biet');
      if (w.kleur === 'rose' || (w.kleur === 'rood' && s.tannine <= 2)) add(8, 'Rode biet en een lichte rode of rosé');
    },
    'prei-ui': function (w, s, add) { if (s.zuur >= 3 && s.body <= 3) add(5, 'Frisse wijn bij de zoetige prei en ui'); },
    kool: function (w, s, add) {
      if (s.tannine >= 4) add(-8, 'Bitter van kool + tannine stapelt op');
      if (s.fruit >= 4 && s.zuur >= 3) add(7, 'Aromatische, frisse wijn tempert het bittere van kool');
    },
    bladgroen: function (w, s, add) {
      if (s.tannine >= 3) add(-9, 'Spinazie maakt tannines droog en metalig');
      if (s.zuur >= 4) add(6, 'Frisheid bij bladgroen');
    },
    venkel: function (w, s, add) {
      if (s.zuur >= 4) add(7, 'Frisse wijn bij de anijstoets van venkel');
      if (aroma(w, /kruid|gras|sauvignon|vermentino/)) add(5);
    },
    'erwten-boontjes': function (w, s, add) {
      if (s.zuur >= 4 && s.body <= 3) add(8, 'Groene, frisse wijn bij erwten en boontjes');
      if (s.tannine >= 3) add(-6);
    },
    avocado: function (w, s, add) { if (s.zuur >= 4 || w.kleur === 'bubbels') add(8, 'Frisheid snijdt door de romige avocado'); },
    mais: function (w, s, add) { if (w.kleur === 'wit' && s.body >= 3) add(7, 'Ronde witte wijn bij zoete maïs'); },
    witloof: function (w, s, add) {
      if (s.tannine >= 3) add(-10, 'Witloof is bitter: tannine maakt het erger');
      if (s.fruit >= 4 || s.zoet >= 2) add(6, 'Fruit of een zachte zoet balanceert het bittere');
    },
    champignon: function (w, s, add) { if (s.body <= 3 && s.tannine <= 3) add(5, 'Milde paddenstoel, soepele wijn'); },
    bospaddenstoelen: function (w, s, add) {
      if (aroma(w, AARDS)) add(9, 'Aardse toetsen spiegelen de paddenstoelen');
      if (w.kleur === 'rood' && s.tannine <= 3) add(5, 'Soepele rode bij bospaddenstoelen');
    },
    truffel: function (w, s, add) {
      if (aroma(w, AARDS) || s.hout >= 3) add(10, 'Truffel vraagt om een complexe, gerijpte wijn');
      if (s.fruit >= 5 && s.hout <= 1) add(-4);
    },
    linzen: function (w, s, add) { if (s.body >= 3 && s.tannine <= 4) add(5, 'Aardse linzen en een middelzware wijn'); },
    bonen: function (w, s, add) { if (s.body >= 3) add(4); },
    kikkererwten: function (w, s, add) { if (s.zuur >= 3 && s.tannine <= 3) add(5, 'Frisse wijn bij nootachtige kikkererwten'); },
    tofu: function (w, s, add) { if (s.body <= 3) add(4, 'Tofu is neutraal: kies op de saus'); },
    tempeh: function (w, s, add) { if (s.body >= 3 && s.tannine <= 3) add(5, 'Nootachtige tempeh en een ronde wijn'); },
    seitan: function (w, s, add) { if (w.kleur === 'rood' && s.body >= 3 && s.tannine >= 2) add(7, 'Seitan heeft een vlezige textuur die een rode wijn aankan'); },
    'noten-zaden': function (w, s, add) { if (s.hout >= 2 || aroma(w, /noot|amandel|hazelnoot/)) add(6, 'Nootachtige toetsen in wijn en gerecht'); },
    'vegan-kaas': function (w, s, add) { if (s.zuur >= 4 || w.kleur === 'bubbels') add(6, 'Frisheid bij romige vegan kaas'); },
    zeewier: function (w, s, add) {
      if (w.kleur === 'bubbels' || s.zuur >= 4) add(10, 'Zilt zeewier vraagt om frisheid of bubbels');
      if (s.tannine >= 3) add(-10, 'Jodium en tannine botsen');
      if (aroma(w, /mineraal|krijt|oesterschelp|zilt/)) add(5, 'Minerale toets past bij de zilte zee');
    },
    'pizza-brood': function (w, s, add) { if (s.zuur >= 3 && s.fruit >= 4) add(5, 'Sappige, frisse wijn bij pizza of flammkuchen'); },
    geitenkaas: function (w, s, add) { if (aroma(w, /sauvignon/) || (w.kleur === 'wit' && s.zuur >= 5)) add(12, 'Geitenkaas en sauvignon blanc: een klassieker'); },
    'karamel-noten': function (w, s, add) { if (s.zoet >= 4 && (w.kleur === 'versterkt' || s.hout >= 2)) add(8, 'Gerijpte zoete wijn bij karamel en noten'); }
  };

  function pair(w, dish) {
    var s = 50, R = [];
    var sm = w.smaak, ing = dish.ing || [], ber = dish.bereiding || [], fl = (dish.smaken || []).slice();
    (dish.keuken || []).forEach(function (k) { var kk = KEUKENS.find(function (x) { return x[0] === k; }); if (kk) kk[2].forEach(function (t) { if (fl.indexOf(t) < 0) fl.push(t); }); });
    var bubbels = w.kleur === 'bubbels', zoetw = w.kleur === 'zoet' || w.kleur === 'versterkt';
    function add(n, t) { s += n; if (t) R.push({ t: t, plus: n > 0 }); }
    function has(a, k) { return a.indexOf(k) >= 0; }
    function hasG(g) { return ing.some(function (i) { return i === g || GROEP_VAN[i] === g; }); }

    var exact = [], viaGroep = [];
    ing.forEach(function (i) { var l = pairLevel(w, i); if (l === 2) exact.push(i); else if (l === 1) viaGroep.push(i); });
    if (exact.length) add(Math.min(26, 14 + exact.length * 6), 'Klassieke combinatie met ' + exact.map(function (m) { return label(INGREDIENTEN, m).toLowerCase(); }).join(', '));
    else if (viaGroep.length) add(Math.min(14, 6 + viaGroep.length * 4), 'Past algemeen bij ' + Array.from(new Set(viaGroep.map(function (m) { return label(INGREDIENTEN, GROEP_VAN[m] || m).toLowerCase(); }))).join(', '));

    ing.forEach(function (i) { if (ING_REGELS[i]) ING_REGELS[i](w, sm, add); });

    var inten = dish.intensiteit || 3, diff = Math.abs(sm.body - inten);
    if (diff === 0) add(10, 'Body en intensiteit van het gerecht zijn in evenwicht');
    else if (diff >= 2) add(-8 * diff, sm.body > inten ? 'Wijn is te krachtig voor dit gerecht' : 'Wijn is te licht voor dit gerecht');

    var dessert = has(fl, 'zoet') || hasG('dessert');
    if (dessert) {
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
    if (has(ber, 'geroosterd') && sm.body >= 3) add(4, 'Geroosterde smaken vragen om wat body');
    if ((has(ber, 'rauw') || has(ber, 'gestoomd')) && sm.body <= 2) add(6, 'Lichte bereiding, lichte wijn');
    if (has(ber, 'gefrituurd') && (bubbels || sm.zuur >= 4)) add(9, 'Frisheid of bubbels reinigen het gehemelte na gefrituurd');
    if (has(ber, 'gestoofd') && sm.body >= 4) add(6, 'Stoofgerecht en volle wijn');

    if ((has(ing, 'vis') || has(ing, 'schaaldieren')) && sm.tannine >= 4) add(-15, 'Tannine en vis geven een metaalsmaak');
    if (hasG('vlees') && ing.some(function (i) { return /rund|lam|wild/.test(i); }) && sm.tannine >= 3) add(8, 'Tannines en eiwit verzachten elkaar');

    s = Math.max(0, Math.min(100, Math.round(s)));
    // dubbele redenen weg
    var seen = {}; R = R.filter(function (r) { if (seen[r.t]) return false; seen[r.t] = 1; return true; });
    R.sort(function (a, b) { return (b.plus ? 1 : 0) - (a.plus ? 1 : 0); });
    return { score: s, redenen: R };
  }

  function rankForDish(wines, dish, n) {
    return wines.map(function (w) { var p = pair(w, dish); return { w: w, score: p.score, redenen: p.redenen }; })
      .sort(function (a, b) { return b.score - a.score; }).slice(0, n || wines.length);
  }

  /* Gerecht automatisch profileren uit naam + omschrijving (voor menukaart-advies).
     Trefwoorden zijn een vertrekpunt; in horeca.html kan je alles manueel bijstellen. */
  var KW = [
    [/asperge/, 'ing', 'asperge'], [/artisjok/, 'ing', 'artisjok'], [/tomaat|tomaten|salsa|passata|kerstoma/, 'ing', 'tomaat'],
    [/paprika|peper(?!s)|jalape/, 'ing', 'paprika'], [/aubergine/, 'ing', 'aubergine'], [/courgette/, 'ing', 'courgette'],
    [/pompoen(?!pit)|butternut|zoete aardappel|bataat/, 'ing', 'pompoen'], [/(?<!mieriks)wortel|pastinaak|knolselder|aardpeer|koolrabi/, 'ing', 'wortelgroenten'],
    [/biet/, 'ing', 'biet'], [/prei|\bui\b|uien|sjalot|look|knoflook/, 'ing', 'prei-ui'], [/kool(?!rabi)|spruit|broccoli|bloemkool/, 'ing', 'kool'],
    [/spinazie|snijbiet|boerenkool|bladgroen|rucola|microgreens|scheuten/, 'ing', 'bladgroen'], [/venkel/, 'ing', 'venkel'],
    [/(?<!kikker)erwt|boontjes|edamame/, 'ing', 'erwten-boontjes'], [/avocado|guacamole/, 'ing', 'avocado'], [/ma[iï]s/, 'ing', 'mais'],
    [/witloof|radicchio|andijvie/, 'ing', 'witloof'],
    [/truffel/, 'ing', 'truffel'], [/portobello|cantharel|eekhoorn|porcini|shiitake|bospadden/, 'ing', 'bospaddenstoelen'],
    [/champignon|oesterzwam|zwam|enoki|paddenstoel|mushroom/, 'ing', 'champignon'],
    [/linzen|daal|\bdal\b/, 'ing', 'linzen'], [/kikkererwt|hummus|humus|falafel|kikkererwtenmeel/, 'ing', 'kikkererwten'], [/bonen|chili sin/, 'ing', 'bonen'],
    [/tofu/, 'ing', 'tofu'], [/tempeh/, 'ing', 'tempeh'], [/seitan/, 'ing', 'seitan'], [/noot|noten|pinda|pompoenpit|sesam|cashew|hazelno/, 'ing', 'noten-zaden'],
    [/vegan cheddar|vegan kaas|kruidenkaas|cashewkaas/, 'ing', 'vegan-kaas'],
    [/zeewier|wakame|zeesla|zeekraal|nori|kombu|nomet/, 'ing', 'zeewier'],
    [/zalm|kabeljauw|tonijn|\bvis\b|zeebaars|tarbot|fish/, 'ing', 'vis'], [/garnaal|kreeft|\boesters?\b|mossel|scampi|sint-jakobs/, 'ing', 'schaaldieren'],
    [/pasta|linguine|spaghetti|risotto|gnocchi|tagliatelle|lasagne/, 'ing', 'pasta-risotto'],
    [/pizza|flammkuchen|bruschetta|ciabat|brood|focaccia/, 'ing', 'pizza-brood'], [/couscous|bulgur|quinoa|freekeh/, 'ing', 'granen-bulgur'],
    [/kip|eend|kalkoen|gevogelte|chicken/, 'ing', 'gevogelte'], [/rund|steak|entrecote|beef/, 'ing', 'rund'], [/\blam\b|lamsvlees/, 'ing', 'lam'], [/varken|spek|ham\b/, 'ing', 'varken'],
    [/geitenkaas|chevre/, 'ing', 'geitenkaas'],
    [/chocola|brownie|callebaut|callebout/, 'ing', 'chocolade'], [/karamel|speculoos|speculaas|praline|noga/, 'ing', 'karamel-noten'],
    [/taart|fruit|sorbet|crumble|dame blanche|ijs\b|ijs /, 'ing', 'fruitdessert'],
    [/olijf|olijven|chips|nootjes/, 'ing', 'olijven-noten'], [/kroket|amuse|bitterbal|loempia|tempura/, 'ing', 'gefrituurde-hapjes'],
    [/gegrild|grill|bbq|barbecue|gegrilld/, 'ber', 'gegrild'], [/geroosterd|\boven\b|ovengebakken/, 'ber', 'geroosterd'], [/gerookt|rook/, 'ber', 'gerookt'],
    [/gefrituurd|kroket|gepaneerd|wedges|frietjes|tempura|amuses/, 'ber', 'gefrituurd'],
    [/stoof|stoverij|gestoofd|daal|curry/, 'ber', 'gestoofd'], [/rauw|tartaar|carpaccio|salade|slaatje/, 'ber', 'rauw'],
    [/citroen|limoen|zuur|gefermenteerd|kappers|azijn|tomaat|salsa|dressing|yoghurt|sinaasappel/, 'sm', 'zuur'],
    [/pikant|pittig|spicy|chili|jalape|harissa|sriracha|sambal/, 'sm', 'pittig'],
    [/zeewier|wakame|zeesla|zeekraal|soja|miso|truffel|paddenstoel|portobello|zwam|tomaat|parmez/, 'sm', 'umami'],
    [/room|roomsaus|kaas|cheddar|veganaise|mayo|emulsie|rouille|boter|aioli|pesto|haverroom|tatziki|tzatziki/, 'sm', 'romig'],
    [/olijf|kappers|zout|gezouten|chips|zeekraal/, 'sm', 'zout'],
    [/chocola|taart|ijs\b|ijs |suiker|karamel|honing|dame blanche|siroop/, 'sm', 'zoet'],
    [/basilicum|koriander|munt|dragon|dille|bieslook|kruiden|kardemom|gember|specerij|komijn/, 'sm', 'kruidig'],
    [/rucola|radicchio|witloof|cacao|grapefruit/, 'sm', 'bitter'],
    [/thai|thaise|vietnam|citroengras/, 'keuken', 'thais'], [/curry|daal|tandoori|masala/, 'keuken', 'indiaas'], [/taco|burrito|mexic|jalape/, 'keuken', 'mexicaans'],
    [/miso|soja|ramen|sushi|teriyaki|wok/, 'keuken', 'aziatisch']
  ];
  function profileDish(name, desc, course) {
    var t = (String(name || '') + ' ' + String(desc || '')).toLowerCase();
    var d = { ing: [], bereiding: [], smaken: [], keuken: [], intensiteit: 3 };
    KW.forEach(function (k) {
      if (!k[0].test(t)) return;
      var tgt = k[1] === 'ing' ? d.ing : k[1] === 'ber' ? d.bereiding : k[1] === 'keuken' ? d.keuken : d.smaken;
      if (tgt.indexOf(k[2]) < 0) tgt.push(k[2]);
    });
    // specifieke paddenstoel gevonden? dan geen dubbele algemene champignon
    if (d.ing.indexOf('bospaddenstoelen') >= 0 || d.ing.indexOf('truffel') >= 0) d.ing = d.ing.filter(function (i) { return i !== 'champignon' || /champignon|oesterzwam|zwam/.test(t); });
    if (course === 'dessert') { if (d.smaken.indexOf('zoet') < 0) d.smaken.push('zoet'); d.intensiteit = 3; d.ing = d.ing.filter(function (i) { return GROEP_VAN[i] === 'dessert'; }); }
    else {
      d.ing = d.ing.filter(function (i) { return GROEP_VAN[i] !== 'dessert'; });
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

  /* Dubbele schuifregelaar (min – max). opts: {min,max,step,value:[a,b],fmt,onChange} */
  function dualRange(el, o) {
    var v = [o.value[0], o.value[1]];
    el.classList.add('dual');
    el.innerHTML = '<div class="dual-val"><span class="dv-a"></span><span class="dv-b"></span></div>' +
      '<div class="dual-track"><div class="dual-fill"></div>' +
      '<input type="range" class="da" aria-label="Minimum" min="' + o.min + '" max="' + o.max + '" step="' + (o.step || 1) + '" value="' + v[0] + '">' +
      '<input type="range" class="db" aria-label="Maximum" min="' + o.min + '" max="' + o.max + '" step="' + (o.step || 1) + '" value="' + v[1] + '"></div>';
    var a = el.querySelector('.da'), b = el.querySelector('.db'), fill = el.querySelector('.dual-fill');
    function upd(fire) {
      var x = +a.value, y = +b.value;
      if (x > y) { if (this === a) a.value = x = y; else b.value = y = x; }
      v = [x, y];
      var span = o.max - o.min || 1;
      fill.style.left = ((x - o.min) / span * 100) + '%'; fill.style.right = (100 - (y - o.min) / span * 100) + '%';
      var f = o.fmt || String;
      el.querySelector('.dv-a').textContent = f(x, 'min'); el.querySelector('.dv-b').textContent = f(y, 'max');
      if (fire && o.onChange) o.onChange(v.slice());
    }
    a.oninput = function () { upd.call(a, true); }; b.oninput = function () { upd.call(b, true); };
    upd(false);
    return { set: function (n) { a.value = n[0]; b.value = n[1]; upd(false); }, get: function () { return v.slice(); } };
  }

  window.Wijnkiezer = {
    KLEUREN: KLEUREN, INGREDIENTEN: INGREDIENTEN, GROEPEN: GROEPEN, GROEP_VAN: GROEP_VAN, BEREIDING: BEREIDING, SMAKEN: SMAKEN, KEUKENS: KEUKENS,
    SMAAKASSEN: SMAAKASSEN, FORMATEN: FORMATEN, LEVENSSTIJL: LEVENSSTIJL, formaat: formaat, pairLevel: pairLevel,
    label: label, load: load, normalize: normalize, normWine: normWine, arr: arr, slug: slug,
    getDraft: getDraft, saveDraft: saveDraft, clearDraft: clearDraft, DRAFT_KEY: DRAFT_KEY,
    applyTheme: applyTheme, filter: filter, tasteScore: tasteScore, pair: pair, rankForDish: rankForDish,
    profileDish: profileDish, esc: esc, euro: euro, veganLabel: veganLabel, bars: bars, dualRange: dualRange
  };
})();
