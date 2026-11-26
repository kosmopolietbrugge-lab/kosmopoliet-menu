/* ============================================================
   Kosmopoliet OS — shared data layer
   Single source of truth for the customer menu + backend editors.
   Persisted in localStorage so the OS and the guest ordering app
   (menu.html) share the same categories, items and visual settings.

   NOTE on table sync: guests at one table share a live basket.
   Here that runs on localStorage + BroadcastChannel, which syncs
   across tabs/windows on the SAME device instantly. For true
   cross-device sync, swap the TableSync transport for a WebSocket
   or Firebase backend — the API below stays identical.
   ============================================================ */
(function () {
  'use strict';

  const KEY = 'kosmo-menu-data-v1';
  const SESSION_KEY = 'kosmo-session'; // per toestel, NIET gesynct
  // Naamlijstje van het team, per toestel, ZONDER wachtwoorden. Enkel om de
  // schermen te kunnen tekenen zonder telkens de server te bevragen. Niet
  // gesynct: het komt van de server, niet van een ander toestel.
  const ROSTER_KEY = 'kosmo-roster'; // per toestel, NIET gesynct
  // Clearanceniveaus: 'help' < 'staff' < 'management'
  //
  // De teamleden stonden hier tot v0.58.8 als SEED_USERS, mét hun wachtwoord in
  // leesbare tekst, en werden mee opgeslagen in `kosmo-menu-data`. Dat pakket
  // gaat via de sync naar élk toestel dat de app opent — ook naar het toestel
  // van een gast die de QR-code scant. Sinds v0.59.0 wonen ze op de Kissing Karrots Server
  // (server-crew.js) en komt hier nooit meer een wachtwoord langs: de app stuurt
  // er één op en krijgt ja of nee terug.
  // Standaard clearance per module (mod::<id>) en per sectie (<moduleId>::<titel>).
  // Niet vermeld = 'help' (iedereen). Bewerkbaar door management (data.clearance override, gesynct).
  const DEFAULT_CLEARANCE = {
    'mod::menu': 'staff', 'mod::business': 'staff', 'mod::marketing': 'staff', 'mod::housekeeping': 'staff', 'mod::settings': 'staff',
    // KosmoKrew
    'kosmokrew::Teamleden': 'management', 'kosmokrew::Beschikbaarheid': 'help', 'kosmokrew::Roosters maken': 'management',
    // Extra modules (v0.116.0, js/extra-modules.js)
    'kosmokrew::Prikklok': 'help', 'kosmokrew::Fooienverdeling': 'management', 'kosmokrew::Prestaties naar Liantis': 'management',
    'barzaal::Betaalterminal': 'staff', 'barzaal::Betalen aan tafel (QR)': 'staff', 'barzaal::Voorschotten & no-shows': 'staff', 'barzaal::Cadeaubonnen': 'staff', 'barzaal::Afhaal & online bestellingen': 'help', 'barzaal::Loyaliteit': 'staff', 'barzaal::Groepen & events': 'staff', 'barzaal::Fiscale kassa (GKS)': 'management', 'barzaal::Bestelvoorstel': 'staff', 'barzaal::Onderhoud melden': 'help',
    'keuken::Bestelvoorstel': 'staff', 'keuken::Afhaal & online bestellingen': 'help', 'keuken::Onderhoud melden': 'help', 'menu::Verspilling': 'staff', 'menu::Bestelvoorstel': 'staff',
    'business::Fiscale kassa (GKS)': 'management', 'business::Bankkoppeling': 'management', 'business::Afwijkingsmeldingen': 'management', 'business::Cadeaubonnen': 'staff', 'business::Fooienverdeling': 'management', 'business::Prestaties naar Liantis': 'management',
    'marketing::Groepen & events': 'staff', 'marketing::Cadeaubonnen': 'staff', 'marketing::Voorschotten & no-shows': 'staff', 'housekeeping::Onderhoud': 'help', 'housekeeping::Bestelvoorstel': 'staff', 'housekeeping::Afval & duurzaamheid': 'staff',
    // Keuken
    'keuken::Items en categorieen keuken': 'staff', 'keuken::Bestellingen en voorraad keuken': 'staff', 'keuken::Verspilling': 'staff',
    // Bar/zaal
    'barzaal::Items en categorieen bar': 'staff', 'barzaal::Bestellingen en voorraad bar': 'staff', 'barzaal::Dagafsluiting': 'staff', 'barzaal::Reserveringen': 'staff',
    // F&B (alles staff)
    'menu::Prijzen leveranciers': 'management', 'housekeeping::Prijzen leveranciers': 'management',
    'housekeeping::Bonnen zonder tegenhanger': 'management', 'housekeeping::Nieuwe ingrediënten uit facturen': 'management',
    'menu::Menukaart (alle categorieen)': 'staff', 'menu::Recepten': 'staff', 'menu::Menu in opbouw': 'staff', 'menu::F&B cost analyse': 'staff', 'menu::F&B rekenmodule': 'staff', 'menu::Foodcost': 'staff', 'menu::Menu-analyse': 'staff', 'menu::Margecontributie / Mix-marge': 'staff', 'menu::Klantmenu (QR)': 'staff', 'menu::Seizoen & specials': 'staff',
    // Business
    'business::Dashboard & KPI': 'management', 'business::Omzet & rapporten': 'staff', 'business::Dagomzet': 'management', 'business::Boekhouding': 'management', 'business::Balans': 'management', 'business::BTW': 'staff', 'business::Lonen & afbetalingen': 'management', 'business::Kostengroepen': 'management', 'business::Documentenarchief': 'management', 'business::Bedrijfsmodel': 'staff', 'business::Personeelsplanning': 'staff', 'business::Cashflow': 'management', 'business::Doelen': 'management', 'business::Rentabiliteit': 'management',
    // Marketing (alles staff)
    'marketing::Campagnes': 'staff', 'marketing::Social media': 'staff', 'marketing::Reviews': 'staff', 'marketing::Nieuwsbrief': 'staff', 'marketing::Loyaliteit': 'staff', 'marketing::Gastenbestand': 'staff',
    // Housekeeping (alles staff)
    'housekeeping::Schoonmaak': 'staff', 'housekeeping::Onderhoud': 'staff', 'housekeeping::Leveranciers': 'staff', 'housekeeping::Inkoop & bestellingen': 'staff', 'housekeeping::Afval & duurzaamheid': 'staff', 'housekeeping::Voorraad centraal': 'staff',
  };

  /* ---------- Default content (plant-based eetcafé) ---------- */
  const DEFAULTS = {
    visual: {
      name: 'Kosmopoliet',
      baseline: 'plant based eetcafé - Brugge',
      heroImg: 'assets/img/hero.jpg',
      logo: 'assets/img/mark-gold.png',
      disclaimer:
        'Alle gerechten zijn 100% plantaardig. Vermeld allergieën steeds aan onze bediening — ' +
        'ondanks alle zorg kunnen sporen van allergenen aanwezig zijn. Prijzen in euro, incl. btw.',
    },
    // source = welke backend-module de categorie beheert
    categories: [
      { id: 'ontbijt',   name: 'Ontbijt & Brunch',    source: 'keuken',  course: 1 },
      { id: 'voor',      name: 'Voorgerechten',        source: 'keuken',  course: 1 },
      { id: 'bowls',     name: 'Bowls & Salades',      source: 'keuken',  course: 2 },
      { id: 'hoofd',     name: 'Hoofdgerechten',       source: 'keuken',  course: 2 },
      { id: 'dessert',   name: 'Desserts',             source: 'keuken',  course: 3 },
      { id: 'warm',      name: 'Warme dranken',        source: 'barzaal' },
      { id: 'fris',      name: 'Frisdranken & Sappen', source: 'barzaal' },
      { id: 'alcohol',   name: 'Bieren & Wijnen',      source: 'barzaal' },
    ],
    items: [
      { id: 'i1', cat: 'ontbijt', name: 'Kosmo Brunchplank', pairAlc: 'i19', pairNonAlc: 'i16', price: 18.5,
        short: 'Rijk assortiment voor twee — zoet én hartig.',
        long: 'Een royale plank om te delen: geroosterd zuurdesem, huisgemaakte hummus, avocado, seizoensfruit, granola met kokosyoghurt en een warme mini-pannenkoek.',
        extra: 'Ideaal om te delen. Dagelijks vers samengesteld.',
        allergens: ['Gluten', 'Soja', 'Noten', 'Sesam'] },
      { id: 'i2', cat: 'ontbijt', name: 'Avocado Toast', price: 12.0,
        short: 'Zuurdesem, avocado, kerstomaat, kiemen.',
        long: 'Krokant geroosterd zuurdesembrood met romige avocado, gemarineerde kersttomaatjes, radijs, kiemgroenten en een vleugje citroen-olijfolie.',
        extra: 'Voeg gerookte tofu toe (+3).',
        allergens: ['Gluten'] },
      { id: 'i3', cat: 'ontbijt', name: 'Overnight Oats', price: 8.5,
        short: 'Havermout, chia, plantaardige melk, fruit.',
        long: 'Nacht geweekte havermout met chiazaad en amandelmelk, afgewerkt met vers seizoensfruit, ahornsiroop en geroosterde amandelen.',
        extra: 'Glutenvrije haver op aanvraag.',
        allergens: ['Noten'] },

      { id: 'i4', cat: 'voor', name: 'Bloemkool Wings', price: 9.5,
        short: 'Krokante bloemkool, buffalo-glaze, bieslook.',
        long: 'Gefrituurde bloemkoolroosjes in een pittige buffalo-glaze, afgewerkt met bieslook en een frisse dip op basis van cashew.',
        extra: 'Pittigheidsgraad: medium.',
        allergens: ['Gluten', 'Noten'] },
      { id: 'i5', cat: 'voor', name: 'Mezze Trio', price: 11.0,
        short: 'Hummus, baba ganoush, muhammara + brood.',
        long: 'Drie huisgemaakte spreads — klassieke hummus, gerookte baba ganoush en pittige muhammara — met warm platbrood en olijven.',
        extra: '',
        allergens: ['Gluten', 'Sesam', 'Noten'] },

      { id: 'i6', cat: 'bowls', name: 'Boeddha Bowl', pairAlc: 'i19', pairNonAlc: 'i17', price: 16.0,
        short: 'Quinoa, geroosterde groenten, tahini-dressing.',
        long: 'Voedzame bowl met quinoa, geroosterde zoete aardappel, kikkererwten, rodekool, avocado en een romige tahini-dressing.',
        extra: 'Van nature glutenvrij.',
        allergens: ['Sesam'] },
      { id: 'i7', cat: 'bowls', name: 'Poké Bowl Tempeh', price: 17.0,
        short: 'Sushirijst, gemarineerde tempeh, edamame, mango.',
        long: 'Frisse poké met sushirijst, teriyaki-tempeh, edamame, mango, komkommer, wakame en sesam.',
        extra: '',
        allergens: ['Soja', 'Sesam'] },
      { id: 'i8', cat: 'bowls', name: 'Caesar 2.0', price: 14.5,
        short: 'Little gem, krokante kikkererwt, cashew-caesar.',
        long: 'Knapperige little gem sla met geroosterde kikkererwten, croutons en een romige cashew-caesardressing.',
        extra: '',
        allergens: ['Gluten', 'Noten', 'Mosterd'] },

      { id: 'i9', cat: 'hoofd', name: 'Seitan Stoofpotje', pairAlc: 'i18', pairNonAlc: 'i16', price: 21.0,
        short: 'Vlaams stoofpotje met seitan & frietjes.',
        long: 'Ambachtelijk stoofpotje van seitan in een rijke saus op basis van bruin bier, geserveerd met verse frietjes en mayonaise.',
        extra: 'Bevat alcohol (bier) in de bereiding.',
        allergens: ['Gluten', 'Soja', 'Mosterd'] },
      { id: 'i10', cat: 'hoofd', name: 'Wild Mushroom Risotto', pairAlc: 'i19', pairNonAlc: 'i17', price: 19.5,
        short: 'Romige risotto, bospaddenstoelen, truffel.',
        long: 'Romige risotto met een mix van bospaddenstoelen, afgewerkt met truffelolie, rucola en plantaardige parmezaan.',
        extra: 'Van nature glutenvrij.',
        allergens: ['Noten'] },
      { id: 'i11', cat: 'hoofd', name: 'Smash Burger', pairAlc: 'i18', pairNonAlc: 'i17', price: 18.0,
        short: 'Dubbele patty, cheddar, huisfrietjes.',
        long: 'Twee sappige plantaardige patties met gesmolten vegan cheddar, augurk, ui en huissaus in een briochebroodje. Met frietjes.',
        extra: 'Ook glutenvrij broodje mogelijk.',
        allergens: ['Gluten', 'Soja', 'Mosterd', 'Sesam'] },

      { id: 'i12', cat: 'dessert', name: 'Chocolademousse', pairAlc: 'i19', pairNonAlc: 'i14', price: 8.0,
        short: 'Luchtige mousse van pure chocolade.',
        long: 'Zijdezachte mousse van 70% pure chocolade op basis van aquafaba, afgewerkt met cacaonibs en zeezout.',
        extra: '',
        allergens: ['Soja'] },
      { id: 'i13', cat: 'dessert', name: 'Cheesecake Speculoos', price: 8.5,
        short: 'Cashew-cheesecake met speculooscrumble.',
        long: 'Romige no-bake cheesecake op basis van cashew met een krokante speculoosbodem en karamelsaus.',
        extra: '',
        allergens: ['Gluten', 'Noten'] },

      { id: 'i14', cat: 'warm', name: 'Flat White', price: 3.6,
        short: 'Dubbele espresso, gestoomde havermelk.',
        long: 'Specialty espresso met zijdezachte gestoomde havermelk. Standaard met haver, ook amandel of soja mogelijk.',
        extra: 'Cafeïnevrij op aanvraag.',
        allergens: [] },
      { id: 'i15', cat: 'warm', name: 'Verse Muntthee', price: 3.4,
        short: 'Verse muntblaadjes, kokend water.',
        long: 'Pot verse muntthee met citroen en een vleugje agave naar keuze.',
        extra: '',
        allergens: [] },

      { id: 'i16', cat: 'fris', name: 'Huisgemaakte Limonade', price: 4.2,
        short: 'Wisselende smaak van het seizoen.',
        long: 'Dagverse limonade met seizoensfruit en kruiden. Vraag onze bediening naar de smaak van vandaag.',
        extra: '',
        allergens: [] },
      { id: 'i17', cat: 'fris', name: 'Green Detox Sap', price: 5.5,
        short: 'Appel, komkommer, spinazie, gember, limoen.',
        long: 'Vers geperst sap boordevol groen: appel, komkommer, spinazie, selder, gember en limoen.',
        extra: '',
        allergens: [] },

      { id: 'i18', cat: 'alcohol', name: 'Brugse Zot Blond', price: 4.8,
        short: 'Lokaal blond bier, 6%.',
        long: 'Verfrissend blond bier van Brugse bodem, fruitig en licht hoppig. 6% vol.',
        extra: 'Enkel voor +18. Drink met mate.',
        allergens: ['Gluten'] },
      { id: 'i19', cat: 'alcohol', name: 'Natural Wine (glas)', price: 6.5,
        short: 'Wisselende natuurwijn, vegan gevinifieerd.',
        long: 'Glas natuurwijn uit kleine wijngaarden, zonder toevoegingen en vegan gevinifieerd. Wit of rood.',
        extra: 'Enkel voor +18. Vraag de selectie van de week.',
        allergens: ['Sulfiet'] },
    ],
  };

  /* ---------- Persistence ---------- */
  // v0.65.0: een gerecht hoort voortaan bij één of meer categorieën (cats,
  // niet langer enkel het oude, enkelvoudige cat) en "bar of keuken" is een
  // eigenschap van het GERECHT (station), niet van de categorie — een
  // categorie is enkel nog een weergavegroep. Bestaande data (enkel cat,
  // geen station) wordt hier eenmalig genormaliseerd: cats = [cat], station
  // = de bron van die categorie op dat moment. Nadien is station leidend.
  // Receptvoorvoegsels (MRF-, MRD-…) horen bij de recepten, nooit op de kaart. Een toestel met oude code kan ze
  // wegschrijven (incident 4 nov 2026): klantkaart, publieke kaart, bediening en keuken lezen allemaal via hier.
  var RECEPT_PREFIX_RE = /^\s*(?:KR|BR|MRF|MRD|BRF|BRD)-\s*/i;
  function normalizeItems(data) {
    var changed = false;
    data.items.forEach(function (it) {
      if (RECEPT_PREFIX_RE.test(it.name || '')) { it.name = it.name.replace(RECEPT_PREFIX_RE, ''); changed = true; }
      if (!Array.isArray(it.cats)) { it.cats = it.cat ? [it.cat] : []; changed = true; }
      if (!it.station) {
        var c0 = data.categories.find(function (c) { return c.id === it.cats[0]; });
        it.station = (c0 && c0.source) || 'keuken';
        changed = true;
      }
    });
    return changed;
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) { var d0 = clone(DEFAULTS); normalizeItems(d0); return d0; }
      const data = JSON.parse(raw);
      data.visual = Object.assign({}, DEFAULTS.visual, data.visual || {});
      data.categories = data.categories || clone(DEFAULTS.categories);
      data.items = data.items || clone(DEFAULTS.items);
      // Teamleden en personeelscode horen hier niet meer thuis (v0.59.0). Zaten
      // ze er nog in — van een toestel dat vóór de verhuis gecachet werd — dan
      // gooien we ze hier weg. Zo verdwijnen de oude, leesbare wachtwoorden bij
      // het eerstvolgende opslaan ook uit de browseropslag.
      if (data.users || data.staffPin != null) { delete data.users; delete data.staffPin; }
      if (normalizeItems(data)) save(data);
      return data;
    } catch (e) { var d1 = clone(DEFAULTS); normalizeItems(d1); return d1; }
  }
  function save(data) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
    broadcast('data');
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function uid(p) { return (p || 'x') + Math.random().toString(36).slice(2, 8); }

  /* ---------- Broadcast (cross-tab notifications) ---------- */
  let bc = null;
  try { bc = new BroadcastChannel('kosmo-os'); } catch (e) { bc = null; }
  function broadcast(kind, payload) {
    try { if (bc) bc.postMessage({ kind, payload }); } catch (e) {}
  }
  // same-tab subscribers (used by cross-device sync to re-render this tab)
  var _subs = [];
  function emit(kind, payload) { _subs.slice().forEach(function (f) { try { f(kind, payload); } catch (e) {} }); }

  /* ---------- Visual settings ---------- */
  function getVisual() { return load().visual; }
  function setVisual(patch) {
    const d = load();
    const oud = d.visual || {};
    d.visual = Object.assign({}, oud, patch);
    // Elke startfoto die ooit gebruikt werd, blijft in de bibliotheek staan (v0.106.0).
    ['heroImg', 'osHeroImg'].forEach(function (k) { if (patch && k in patch && patch[k] !== oud[k]) d.visual.heroLib = _heroOnthoud(d.visual, [oud[k], patch[k]]); });
    save(d);
    return d.visual;
  }

  /* ---------- Startfoto's (v0.106.0) ----------
     Eén bibliotheek voor de foto bovenaan het OS (startscherm) en bovenaan de klantenkaart. Ze staat in `visual`, zodat
     de gastkaart ze meekrijgt. Een foto met een periode (dd/mm, jaarloos) is een themafoto: binnen die periode gaat ze
     vóór de standaardfoto van het OS en/of de klantenkaart, daarna komt vanzelf de standaard terug. */
  var HERO_STD = [
    { id: 'std', src: 'assets/img/hero.jpg', naam: 'Standaard', van: '', tot: '', os: false, menu: false },
    { id: 'halloween', src: 'assets/img/hero-halloween.jpg', naam: 'Halloween', van: '10-24', tot: '10-31', os: true, menu: false },
    { id: 'klaproos', src: 'assets/img/hero-klaproos.jpg', naam: 'Wapenstilstand (klaproos)', van: '11-04', tot: '11-11', os: true, menu: false }
  ];
  function _heroMd(s) { return /^\d\d-\d\d$/.test(String(s || '')) ? s : ''; }
  function _heroBinnen(md, van, tot) { if (!van || !tot) return false; return van <= tot ? (md >= van && md <= tot) : (md >= van || md <= tot); }
  function _heroOnthoud(v, srcs) {
    var lib = Array.isArray(v.heroLib) ? v.heroLib.slice() : [];
    (srcs || []).forEach(function (src) {
      if (!src || HERO_STD.some(function (x) { return x.src === src; })) return;
      var x = lib.filter(function (y) { return y.src === src; })[0];
      if (x) x.laatst = Date.now();
      else lib.push({ id: uid('hero'), src: src, naam: 'Eerder gebruikt', van: '', tot: '', os: false, menu: false, laatst: Date.now() });
    });
    return lib;
  }
  // De volledige bibliotheek: ingebouwde foto's (tenzij verwijderd), opgeslagen foto's, en de huidige standaardfoto's.
  function heroLib(v) {
    v = v || getVisual() || {};
    var eigen = Array.isArray(v.heroLib) ? v.heroLib : [], weg = Array.isArray(v.heroWeg) ? v.heroWeg : [], out = [];
    HERO_STD.forEach(function (s) { if (weg.indexOf(s.id) >= 0 && s.id !== 'std') return; var e = eigen.filter(function (x) { return x.id === s.id; })[0]; out.push(Object.assign({}, s, e || {}, { src: s.src, vast: true })); });
    eigen.forEach(function (x) { if (!HERO_STD.some(function (s) { return s.id === x.id; }) && x.src) out.push(Object.assign({}, x)); });
    _heroOnthoud({ heroLib: out }, [v.heroImg, v.osHeroImg]).forEach(function (x) { if (!out.some(function (y) { return y.src === x.src; })) out.push(x); });
    out.forEach(function (x) { x.van = _heroMd(x.van); x.tot = _heroMd(x.tot); });
    return out;
  }
  function heroStandaard(doel, v) { v = v || getVisual() || {}; return (doel === 'os' ? v.osHeroImg : v.heroImg) || 'assets/img/hero.jpg'; }
  // Welke themafoto geldt op die dag voor 'os' of 'menu' (of null).
  function heroThema(doel, datum, v) {
    v = v || getVisual() || {}; var md = String(datum || todayStr()).slice(5, 10);
    return heroLib(v).filter(function (x) { return x[doel] && _heroBinnen(md, x.van, x.tot); })[0] || null;
  }
  function heroVoor(doel, datum) { var v = getVisual() || {}, t = heroThema(doel, datum, v); return t ? t.src : heroStandaard(doel, v); }
  // Eén foto in de bibliotheek aanpassen (naam, periode, waar ze geldt). Ingebouwde foto's bewaren enkel hun aanpassingen.
  function setHero(id, patch) {
    var v = getVisual() || {}, lib = Array.isArray(v.heroLib) ? v.heroLib.slice() : [], x = lib.filter(function (y) { return y.id === id; })[0];
    if (!x) { var bron = heroLib(v).filter(function (y) { return y.id === id; })[0]; if (!bron) return null; x = { id: id, src: bron.src, naam: bron.naam, van: bron.van, tot: bron.tot, os: bron.os, menu: bron.menu }; lib.push(x); }
    ['naam', 'van', 'tot', 'os', 'menu'].forEach(function (k) { if (patch && k in patch) x[k] = k === 'van' || k === 'tot' ? _heroMd(patch[k]) : k === 'naam' ? String(patch[k] || '').trim() : !!patch[k]; });
    setVisual({ heroLib: lib }); return x;
  }
  function addHero(src, naam) {
    if (!src) return null; var v = getVisual() || {}, lib = Array.isArray(v.heroLib) ? v.heroLib.slice() : [];
    var x = lib.filter(function (y) { return y.src === src; })[0];
    if (!x) { x = { id: uid('hero'), src: src, naam: String(naam || 'Nieuwe foto'), van: '', tot: '', os: false, menu: false, laatst: Date.now() }; lib.push(x); setVisual({ heroLib: lib }); }
    return x;
  }
  function removeHero(id) {
    if (id === 'std') return false; var v = getVisual() || {};
    var x = heroLib(v).filter(function (y) { return y.id === id; })[0]; if (!x) return false;
    if (x.src === v.heroImg || x.src === v.osHeroImg) return false; // eerst een andere standaardfoto kiezen
    var patch = { heroLib: (v.heroLib || []).filter(function (y) { return y.id !== id; }) };
    if (x.vast) patch.heroWeg = (v.heroWeg || []).concat([id]);
    setVisual(patch); return true;
  }

  /* ---------- Personeelscode (tafel 0 = personeel, gratis) ----------
     De code zelf staat op de Kissing Karrots Server en komt hier nooit meer binnen.
     We sturen wat de gebruiker intikte op en krijgen ja of nee terug —
     zo valt ze niet uit de browseropslag te vissen. Beide functies geven
     een belofte (Promise) terug; de aanroeper wacht het antwoord af. */
  function checkStaffPin(pin) {
    return api('POST', '/auth/pin', { pin: String(pin == null ? '' : pin).trim() })
      .then(function (r) { if (r && r.ok && r.token) { try { sessionStorage.setItem('kosmo-stafftoken', r.token); } catch (e) {} } return !!(r && r.ok); })
      .catch(function () { return false; });   // pc onbereikbaar = niet binnen
  }
  function setStaffPin(pin) {
    return api('POST', '/crew/pin', { pin: String(pin == null ? '' : pin).trim().slice(0, 8) })
      .then(function (r) { return !!(r && r.ok); });
  }
  function hasStaffPin() { return api('GET', '/crew/pin').then(function (r) { return !!(r && r.set); }).catch(function () { return false; }); }

  /* ---------- Categories ---------- */
  function getCategories(source) {
    const cats = load().categories;
    return source ? cats.filter(c => c.source === source) : cats;
  }
  function addCategory(name, source, course) {
    const d = load();
    const c = { id: uid('c'), name: name || 'Nieuwe categorie', source: source || 'keuken', course: Math.max(1, parseInt(course, 10) || 1), vatCode: defaultVatForSource(source || 'keuken') };
    d.categories.push(c); save(d); return c;
  }

  /* ---------- btw-codes (fiscaal — additief, achterwaarts compatibel) ---------- */
  // A 21% (dranken/alcohol) · B 12% (maaltijd ter plaatse) · C 6% (take-away) · D 0% · X buiten btw.
  var VAT_RATES = { A: 21, B: 12, C: 6, D: 0, X: 0 };
  function defaultVatForSource(source) { return source === 'barzaal' ? 'A' : 'B'; }
  function vatRate(code) { return VAT_RATES[code] != null ? VAT_RATES[code] : 12; }
  // Effectieve btw-code van een item: eigen override, anders het eigen station
  // (bar/keuken), anders — voor data van vóór v0.65.0 — de categorie.
  function vatCodeFor(item) {
    if (!item) return 'B';
    if (item.vatCode) return item.vatCode;
    if (item.station) return defaultVatForSource(item.station);
    var cat = load().categories.find(function (c) { return c.id === (item.cats && item.cats[0]); });
    if (cat && cat.vatCode) return cat.vatCode;
    return defaultVatForSource(cat && cat.source);
  }
  function updateCategory(id, patch) {
    const d = load();
    const c = d.categories.find(x => x.id === id);
    if (c) { Object.assign(c, patch); save(d); }
    return c;
  }
  // Verwijdert de categorie. Een gerecht dat ook in een ándere categorie
  // staat, blijft bestaan (enkel deze categorie valt weg uit zijn cats) — pas
  // wanneer een gerecht nergens anders meer bij hoort, verdwijnt het mee.
  function removeCategory(id) {
    const d = load();
    d.categories = d.categories.filter(c => c.id !== id);
    d.items.forEach(function (it) { if (Array.isArray(it.cats)) it.cats = it.cats.filter(function (cid) { return cid !== id; }); });
    d.items = d.items.filter(function (it) { return it.cats && it.cats.length > 0; });
    save(d);
  }
  function moveCategory(id, dir) {
    const d = load();
    const i = d.categories.findIndex(c => c.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= d.categories.length) return;
    const [c] = d.categories.splice(i, 1);
    d.categories.splice(j, 0, c);
    save(d);
  }

  /* ---------- Items ---------- */
  // Een gerecht kan bij meerdere categorieën staan (cats) — getItems(catId)
  // geeft dus elk gerecht terug dat catId er één van heeft.
  // Gearchiveerde gerechten (archived) zijn van de standaardkaart af: ze verdwijnen uit klantmenu, bediening en analyses,
  // maar blijven bewaard (historiek, terugzetten). Enkel met opts.includeArchived komen ze mee.
  // available:false = tijdelijk niet voorradig (blijft op de standaardkaart, verborgen voor gasten).
  function getItems(catId, onlyAvailable, opts) {
    let items = load().items;
    if (!(opts && opts.includeArchived)) items = items.filter(i => !i.archived);
    if (catId) items = items.filter(i => Array.isArray(i.cats) && i.cats.indexOf(catId) >= 0);
    if (onlyAvailable) items = items.filter(i => i.available !== false);
    return items;
  }
  function setAvailable(id, val) { return updateItem(id, { available: !!val }); }
  function setArchived(id, on) { return updateItem(id, { archived: !!on, archivedAt: on ? businessDate(Date.now()) : '' }); }
  function getItem(id) { return load().items.find(i => i.id === id); }
  // Verplaatst een gerecht één plek op/neer BINNEN catId (dir -1/+1) — de
  // volgorde in de klantkaart en in Menukaart-beheer. Belangrijk voor
  // verkoop: een duurder "ankergerecht" bovenaan laat de rest van de
  // categorie redelijker geprijsd aanvoelen (prijsanker-effect). Werkt door
  // het gerecht in de globale items-array te wisselen met zijn buur BINNEN
  // deze categorie — voor een gerecht dat ook in andere categorieën staat,
  // verschuift dat de volgorde daar licht mee (zelfde compromis als de rest
  // van de app: één platte lijst, geen aparte volgorde per categorie).
  function moveItem(id, catId, dir) {
    const d = load();
    const inCat = d.items.filter(function (i) { return Array.isArray(i.cats) && i.cats.indexOf(catId) >= 0; });
    const i = inCat.findIndex(function (i2) { return i2.id === id; });
    const j = i + dir;
    if (i < 0 || j < 0 || j >= inCat.length) return;
    const a = inCat[i], b = inCat[j];
    const ga = d.items.indexOf(a), gb = d.items.indexOf(b);
    d.items[ga] = b; d.items[gb] = a;
    save(d);
  }
  // Voegt catId toe aan de categorieën van een gerecht (indien nog niet aanwezig).
  function addItemCategory(id, catId) {
    const d = load();
    const it = d.items.find(x => x.id === id);
    if (it) { if (!Array.isArray(it.cats)) it.cats = []; if (it.cats.indexOf(catId) < 0) it.cats.push(catId); save(d); }
    return it;
  }
  // Haalt catId weg uit de categorieën van een gerecht — maar nooit de laatste
  // (een gerecht moet ergens getoond blijven; gebruik removeItem om het echt weg te halen).
  function removeItemCategory(id, catId) {
    const d = load();
    const it = d.items.find(x => x.id === id);
    if (it && Array.isArray(it.cats) && it.cats.length > 1) { it.cats = it.cats.filter(function (c) { return c !== catId; }); save(d); }
    return it;
  }
  // Effectieve verkoopprijs incl. promotiekorting (%). round2 is hoisted.
  function effectivePrice(it) {
    if (!it) return 0;
    var pp = Number(it.price || 0), pct = promoActivePct(it);
    if (pct > 0) return round2(pp * (1 - pct / 100));
    return round2(pp);
  }
  // Promotie: percentage + einddatum (promoUntil, ISO). Zonder einddatum loopt ze door (oude gerechten); nieuwe promoties krijgen standaard 24 uur.
  // De korting geldt enkel zolang ze actief is; daarna rekent het OS en de gastenkaart vanzelf weer met de normale prijs.
  function promoInfo(it, now) {
    var pct = Number(it && it.promoPct || 0); if (!(pct > 0 && pct <= 100)) return null;
    var u = it.promoUntil ? Date.parse(it.promoUntil) : NaN, has = !isNaN(u), t = now == null ? Date.now() : now;
    return { pct: pct, until: has ? u : null, active: !has || u > t, expired: has && u <= t };
  }
  function promoActivePct(it, now) { var p = promoInfo(it, now); return p && p.active ? p.pct : 0; }
  function promoDefaultUntil(now) { return new Date((now == null ? Date.now() : now) + 24 * 3600000).toISOString(); }
  function _p2(n) { return (n < 10 ? '0' : '') + n; }
  // ISO <-> waarde van een datetime-local veld (lokale tijd)
  function promoToInput(iso) { var t = iso ? new Date(iso) : null; if (!t || isNaN(t.getTime())) return ''; return t.getFullYear() + '-' + _p2(t.getMonth() + 1) + '-' + _p2(t.getDate()) + 'T' + _p2(t.getHours()) + ':' + _p2(t.getMinutes()); }
  function promoFromInput(v) { if (!v) return ''; var t = new Date(v); return isNaN(t.getTime()) ? '' : t.toISOString(); }
  function promoUntilLabel(ms) { var t = new Date(ms); return _p2(t.getDate()) + '/' + _p2(t.getMonth() + 1) + ' ' + _p2(t.getHours()) + ':' + _p2(t.getMinutes()); }
  // Gang van een item: eigen 'course' (>0) of anders de gang van zijn (eerste) categorie (99 = onbekend/drank).
  function itemCourse(it) {
    if (!it) return 99;
    if (Number(it.course) > 0) return Number(it.course);
    var cat = load().categories.find(function (c) { return c.id === (it.cats && it.cats[0]); });
    return (cat && cat.course) ? cat.course : 99;
  }
  // Alle drankjes: dit is nu een eigenschap van het gerecht zelf (station),
  // niet van de categorie waarin het toevallig staat.
  function getDrinkItems() {
    return load().items.filter(function (i) { return i.station === 'barzaal' && !i.archived; });
  }
  function addItem(catId, patch) {
    const d = load();
    var srcCat = d.categories.find(function (c) { return c.id === catId; });
    const it = Object.assign(
      { id: uid('i'), cats: catId ? [catId] : [], station: (srcCat && srcCat.source) || 'keuken', name: 'Nieuw item', price: 0, promoPct: 0, course: 0, short: '', long: '', extra: '', allergens: [], img: '', available: true, pairAlc: '', pairNonAlc: '' },
      patch || {});
    d.items.push(it); save(d); return it;
  }
  function updateItem(id, patch) {
    const d = load();
    const it = d.items.find(x => x.id === id);
    if (it) { Object.assign(it, patch); save(d); }
    return it;
  }
  function removeItem(id) {
    const d = load();
    d.items = d.items.filter(i => i.id !== id);
    save(d);
  }

  /* ---------- Placeholder image (used when an item has no photo) ---------- */
  const CAT_TINT = {
    ontbijt: '#E4B569', voor: '#D98F6B', bowls: '#8FB6A3', hoofd: '#C77F6B',
    dessert: '#C77FA6', warm: '#B08968', fris: '#ADD8E6', alcohol: '#9A7BB0',
  };
  function tintFor(catId) { return CAT_TINT[catId] || '#E4B569'; }
  function placeholder(item) {
    const tint = tintFor(item && item.cats && item.cats[0]);
    const initials = ((item && item.name) || '?').trim().slice(0, 1).toUpperCase();
    const leaf = '<path d="M18 74c0-28 22-50 56-50 0 34-22 52-48 52a20 20 0 0 1-8-2z" fill="rgba(255,255,255,.28)"/>';
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 100 100">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="' + tint + '"/>' +
      '<stop offset="1" stop-color="#2C2A2B"/></linearGradient></defs>' +
      '<rect width="100" height="100" fill="url(#g)"/>' +
      '<g transform="translate(8,4) scale(0.5)" opacity="0.5">' + leaf + '</g>' +
      '<text x="50" y="60" font-family="Georgia,serif" font-size="34" fill="rgba(255,255,255,.9)" ' +
      'text-anchor="middle">' + initials + '</text></svg>';
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
  }
  function imgFor(item) {
    var r = item && item.img;
    if (r) {
      if (r.indexOf('idb:') === 0) { var k = r.slice(4); if (_imgCache[k]) return _imgCache[k]; if (_mediaBase) { hydrateImage(k); return _mediaBase + k; } return placeholder(item); }
      return r;
    }
    return placeholder(item);
  }

  /* ---------- Photo storage (IndexedDB) ---------- */
  var _imgCache = {};
  var _mediaDB = null;
  // ---- media/foto-sync tussen toestellen ----
  var _mediaBase = '';        // bv. 'media/' als de centrale server bereikbaar is
  var _onImage = null;        // sync-hook: (key, dataUrl) -> upload naar server
  var _hydrating = {};        // keys die momenteel van de server gehaald worden
  var _hydrateTimer = null;
  function setMediaMode(base) { _mediaBase = base || ''; }
  function onImage(fn) { _onImage = fn; }
  function putImageAt(key, dataUrl) {
    _imgCache[key] = dataUrl;
    openMedia().then(function (db) { if (!db) return; try { db.transaction('images', 'readwrite').objectStore('images').put(dataUrl, key); } catch (e) {} });
  }
  function _blobToDataURL(blob, cb) { try { var fr = new FileReader(); fr.onload = function () { cb(fr.result); }; fr.onerror = function () { cb(null); }; fr.readAsDataURL(blob); } catch (e) { cb(null); } }
  function hydrateImage(key) {
    if (!key || _imgCache[key] || _hydrating[key] || !_mediaBase || typeof fetch === 'undefined') return;
    _hydrating[key] = 1;
    fetch(_mediaBase + key).then(function (r) { if (!r.ok) throw 0; return r.blob(); })
      .then(function (b) { _blobToDataURL(b, function (durl) { delete _hydrating[key]; if (durl) { putImageAt(key, durl); clearTimeout(_hydrateTimer); _hydrateTimer = setTimeout(function () { broadcast('data'); emit('data'); }, 300); } }); })
      .catch(function () { delete _hydrating[key]; });
  }
  function openMedia() {
    return new Promise(function (res) {
      try {
        if (typeof indexedDB === 'undefined') return res(null);
        var r = indexedDB.open('kosmo-media', 1);
        r.onupgradeneeded = function () { r.result.createObjectStore('images'); };
        r.onsuccess = function () { _mediaDB = r.result; res(_mediaDB); };
        r.onerror = function () { res(null); };
      } catch (e) { res(null); }
    });
  }
  function loadImages() {
    return openMedia().then(function (db) {
      if (!db) return;
      return new Promise(function (res) {
        try {
          var tx = db.transaction('images', 'readonly');
          var st = tx.objectStore('images');
          var kq = st.getAllKeys(), vq = st.getAll();
          tx.oncomplete = function () { (kq.result || []).forEach(function (k, i) { _imgCache[k] = vq.result[i]; }); res(); };
          tx.onerror = function () { res(); };
        } catch (e) { res(); }
      });
    });
  }
  function putImage(dataUrl) {
    return openMedia().then(function (db) {
      if (!db) return dataUrl;
      var key = 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      return new Promise(function (res) {
        try {
          var tx = db.transaction('images', 'readwrite');
          tx.objectStore('images').put(dataUrl, key);
          tx.oncomplete = function () { _imgCache[key] = dataUrl; try { if (_onImage) _onImage(key, dataUrl); } catch (e) {} res('idb:' + key); };
          tx.onerror = function () { res(dataUrl); };
        } catch (e) { res(dataUrl); }
      });
    });
  }
  function delImage(ref) {
    if (!ref || ref.indexOf('idb:') !== 0) return;
    var key = ref.slice(4); delete _imgCache[key];
    openMedia().then(function (db) { if (db) { try { db.transaction('images', 'readwrite').objectStore('images').delete(key); } catch (e) {} } });
  }
  function resolveImg(ref) {
    if (!ref) return '';
    if (ref.indexOf('idb:') === 0) { var k = ref.slice(4); if (_imgCache[k]) return _imgCache[k]; if (_mediaBase) { hydrateImage(k); return _mediaBase + k; } return ''; }
    return ref;
  }
  function ready(cb) {
    try { loadImages().then(function () { if (cb) cb(); }, function () { if (cb) cb(); }); }
    catch (e) { if (cb) cb(); }
  }

  /* ---------- Table basket sync ---------- */
  function basketKey(table) { return 'kosmo-basket-t' + String(table); }
  function getBasket(table) {
    try { return JSON.parse(localStorage.getItem(basketKey(table)) || '[]'); }
    catch (e) { return []; }
  }
  function setBasket(table, lines) {
    try { localStorage.setItem(basketKey(table), JSON.stringify(lines)); } catch (e) {}
    broadcast('basket', { table: String(table) });
  }
  const NOTE_MAX = 20; // customer note per dish, travels with the order
  function addToBasket(table, itemId, qty, note) {
    const lines = getBasket(table);
    const l = lines.find(x => x.id === itemId);
    if (l) { l.qty += (qty || 1); if (note != null) l.note = String(note).slice(0, NOTE_MAX); }
    else lines.push({ id: itemId, qty: (qty || 1), note: note ? String(note).slice(0, NOTE_MAX) : '' });
    setBasket(table, lines.filter(x => x.qty > 0));
    return getBasket(table);
  }
  function setNote(table, itemId, note) {
    const lines = getBasket(table);
    const l = lines.find(x => x.id === itemId);
    if (l) { l.note = String(note == null ? '' : note).slice(0, NOTE_MAX); setBasket(table, lines); }
    return lines;
  }
  function setQty(table, itemId, qty) {
    let lines = getBasket(table);
    const l = lines.find(x => x.id === itemId);
    if (l) l.qty = qty;
    lines = lines.filter(x => x.qty > 0);
    setBasket(table, lines);
    return lines;
  }
  function basketCount(table) {
    return getBasket(table).reduce((n, l) => n + l.qty, 0);
  }
  function clearBasket(table) { setBasket(table, []); }

  /* ============================================================
     Orders + service system (Fase 3 - bestelworkflow)
     One shared communication instrument with two sides:
       - bar/zaal (FOH): confirms incoming guest orders, splits
         bar vs. kitchen, sets course + progress, opens tables.
       - keuken (BOH): ticks off finished items.
     Runs through this seam so it can later sync cross-device
     without rewriting service.js / app.js.
     progress: blue = nog niet processen, groen = nu processen,
               rood = afgewerkt (keuken vinkt af).
     ============================================================ */
  const OKEY = 'kosmo-orders-v1';
  const CKEY = 'kosmo-chat-v1';

  function loadOrders() { try { return JSON.parse(localStorage.getItem(OKEY) || '[]'); } catch (e) { return []; } }
  function saveOrders(list) { try { localStorage.setItem(OKEY, JSON.stringify(list)); } catch (e) {} broadcast('orders'); }

  /* "Bar of keuken" heeft drie namen, elk op zijn eigen laag (bewust zo gelaten: de opgeslagen gegevens hernoemen zou een migratie
     van alle bestellingen en betalingen vragen):
       categorie.source  'barzaal' | 'keuken'   waar een categorie standaard vandaan komt (menukaart)
       item.station      'barzaal' | 'keuken'   waar dit gerecht gemaakt wordt; wint van de categorie (Specials, v0.91)
       bestelregel.dest  'bar'     | 'kitchen'  waar de bon heen gaat (service, rapporten, btw)
     Dit is de ENIGE plek die van de eerste twee naar de derde vertaalt (tests/sleutels.test.js bewaakt dat, v0.130.0). */
  function destVanStation(station) { return station === 'barzaal' ? 'bar' : 'kitchen'; }
  function destForItem(itemId) {
    const it = getItem(itemId); if (!it) return 'kitchen';
    if (it.station) return destVanStation(it.station);
    const cat = load().categories.find(c => c.id === (it.cats && it.cats[0]));
    return destVanStation(cat && cat.source);
  }

  function getOrder(id) { return loadOrders().find(o => o.id === id); }
  function getTableOrders(table) { return loadOrders().filter(o => String(o.table) === String(table)); }

  // Wat de gast zelf koos om op de bon te zetten. Enkel de 14 allergenen en de twee soorten: geen vrije tekst van buitenaf.
  const BON_ALLERGENEN = ['Gluten', 'Schaaldieren', 'Eieren', 'Vis', 'Pinda', 'Soja', 'Melk', 'Noten', 'Selderij', 'Mosterd', 'Sesam', 'Sulfiet', 'Lupine', 'Weekdieren'];
  const ALLERGEEN_SUB = { Gluten: ['Tarwe', 'Spelt', 'Kamut', 'Rogge', 'Gerst', 'Haver'], Noten: ['Amandel', 'Hazelnoot', 'Walnoot', 'Cashew', 'Pecan', 'Paranoot', 'Pistache', 'Macadamia'] };
  function bonAllergie(a) {
    if (!a || !Array.isArray(a.lijst)) return '';
    const lijst = BON_ALLERGENEN.filter(function (x) { return a.lijst.indexOf(x) >= 0; });
    const naam = function (x) {
      const wil = (a.subs && Array.isArray(a.subs[x])) ? a.subs[x] : [], s = (ALLERGEEN_SUB[x] || []).filter(function (y) { return wil.indexOf(y) >= 0; });
      return s.length ? x + ' (' + s.join(', ') + ')' : x;
    };
    return lijst.length ? (a.soort === 'intolerantie' ? 'INTOLERANTIE: ' : 'ALLERGIE: ') + lijst.map(naam).join(', ') : '';
  }
  function placeOrder(table, basketLines, allergie) {
    const src = (basketLines && basketLines.length) ? basketLines : getBasket(table);
    if (!src.length) return null;
    const bonTekst = bonAllergie(allergie);
    // Activatiepoort: enkel bestellen op een door de bediening geactiveerde tafel (gratis tafels uitgezonderd)
    if (!isFreeTable(table) && !isTableActive(table)) return { error: 'not_active', table: String(table) };
    const now = Date.now();
    const cats = load().categories;
    const isStaff = isFreeTable(table); // tafel 0 = personeel · crew = gratis
    const openO = _openOrders(table);
    const sessionId = openO.length ? openO[0].sessionId : uid('sess');
    var persons = openO.length ? (openO[0].persons || 0) : 0;
    if (!persons) { var _lk = getTableLink(table); if (_lk && _lk.covers) persons = _lk.covers; }
    const lines = src.map(function (l) {
      const it = getItem(l.id) || {};
      const cat = cats.find(function (c) { return c.id === (it.cats && it.cats[0]); });
      const dest = destForItem(l.id);
      const full = Number(it.price || 0);
      const eff = isStaff ? 0 : effectivePrice(it);
      const promoOn = (!isStaff && promoActivePct(it) > 0 && eff < full - 0.001);
      return {
        id: uid('ol'), itemId: l.id, name: it.name || 'Onbekend',
        dest: dest, qty: l.qty || 1, price: eff, priceOrig: promoOn ? full : null, promoPct: promoOn ? promoActivePct(it) : 0,
        note: bonTekst ? bonTekst + (l.note ? ' · ' + String(l.note).slice(0, NOTE_MAX) : '') : (l.note || '').slice(0, NOTE_MAX),
        course: dest === 'bar' ? 1 : (Number(it.course) > 0 ? Number(it.course) : (cat && cat.course ? cat.course : 1)),
        vatCode: vatCodeFor(it), vatRate: vatRate(vatCodeFor(it)), paidQty: 0,
        progress: 'blue', confirmed: false, done: false, voided: false,
      };
    });
    const order = { id: uid('ord'), table: String(table), staff: isStaff, sessionId: sessionId, persons: persons, createdAt: now, confirmedAt: null, status: 'to_confirm', lines: lines };
    const all = loadOrders(); all.push(order); saveOrders(all);
    clearBasket(table);
    return order;
  }

  function confirmOrder(id) {
    const all = loadOrders(); const o = all.find(x => x.id === id); if (!o) return null;
    if (!(o.persons > 0)) return null; // zaal moet eerst aantal personen invoeren
    o.status = 'open'; o.confirmedAt = Date.now();
    var kitchen = o.lines.filter(function (l) { return !l.voided && l.dest !== 'bar'; });
    var minC = kitchen.length ? Math.min.apply(null, kitchen.map(function (l) { return l.course; })) : 1;
    o.lines.forEach(function (l) {
      if (l.voided) return;
      l.confirmed = true;
      // dranken/bar: geen gangen, meteen te serveren (groen). keuken: eerste gang groen, rest blauw
      l.progress = (l.dest === 'bar') ? 'green' : ((l.course === minC) ? 'green' : 'blue');
      l.done = false;
    });
    var hadKitchen = all.some(function (x) { return x !== o && String(x.table) === String(o.table) && x.status === 'open' && x.lines.some(function (l) { return l.confirmed && !l.voided && l.dest !== 'bar'; }); });
    var newKitchen = o.lines.some(function (l) { return !l.voided && l.dest !== 'bar'; });
    saveOrders(all);
    if (hadKitchen && newKitchen) { addChat('system', 'Tafel ' + o.table + ' — nieuwe items toegevoegd'); }
    return o;
  }
  // FOH tikt 'volgende gang': laagste nog-blauwe gang van de tafel wordt groen (bij keuken)
  function advanceCourse(table) {
    const all = loadOrders();
    var courses = {};
    all.forEach(function (o) {
      if (String(o.table) !== String(table) || o.status !== 'open') return;
      o.lines.forEach(function (l) { if (l.voided || l.dest === 'bar') return; if (l.progress === 'blue') courses[l.course] = true; });
    });
    var blue = Object.keys(courses).map(Number).sort(function (a, b) { return a - b; });
    if (!blue.length) return null;
    var next = blue[0];
    all.forEach(function (o) {
      if (String(o.table) !== String(table) || o.status !== 'open') return;
      o.lines.forEach(function (l) { if (!l.voided && l.course === next && l.progress === 'blue') l.progress = 'green'; });
    });
    saveOrders(all); return next;
  }
  function _find(orderId, lineId) {
    const all = loadOrders();
    const o = all.find(x => x.id === orderId); if (!o) return null;
    const l = o.lines.find(x => x.id === lineId); if (!l) return null;
    return { all: all, o: o, l: l };
  }
  function updateLine(orderId, lineId, patch) {
    const f = _find(orderId, lineId); if (!f) return null;
    Object.assign(f.l, patch);
    if (patch.progress) f.l.done = patch.progress === 'red';
    if (patch.done != null) f.l.progress = patch.done ? 'red' : (f.l.progress === 'red' ? 'green' : f.l.progress);
    saveOrders(f.all);
    return f.l;
  }
  function setLineCourse(orderId, lineId, course) { return updateLine(orderId, lineId, { course: Math.max(1, parseInt(course, 10) || 1) }); }
  function setLineQty(orderId, lineId, qty) {
    const f = _find(orderId, lineId); if (!f) return null;
    qty = parseInt(qty, 10) || 0;
    if (qty <= 0) { f.o.lines = f.o.lines.filter(x => x.id !== lineId); }
    else f.l.qty = qty;
    saveOrders(f.all); return f.o;
  }
  function voidLine(orderId, lineId) { return updateLine(orderId, lineId, { voided: true }); }
  // handmatige prijsaanpassing (korting) op een geserveerd/besteld item (per stuk)
  function setLinePrice(orderId, lineId, price) {
    const f = _find(orderId, lineId); if (!f) return null;
    price = parseFloat(price); if (!isFinite(price) || price < 0) return f.l;
    if (f.l.priceOrig == null) f.l.priceOrig = f.l.price;
    f.l.price = price; saveOrders(f.all); return f.l;
  }

  function _liveLines(dest, includeVoided) {
    const out = [];
    loadOrders().forEach(function (o) {
      if (o.status !== 'open') return;
      o.lines.forEach(function (l) {
        if (!l.confirmed) return;
        if (l.voided && !includeVoided) return;
        if (dest && l.dest !== dest) return;
        out.push(Object.assign({ orderId: o.id, table: o.table, createdAt: o.createdAt, confirmedAt: o.confirmedAt }, l));
      });
    });
    return out;
  }
  function getKitchenLines() { return _liveLines('kitchen', true); }
  function getBarLines() { return _liveLines('bar', true); }
  function getPendingOrders() { return loadOrders().filter(o => o.status === 'to_confirm'); }

  function getActiveTableNumbers() {
    const s = {};
    loadOrders().forEach(function (o) { if (o.status !== 'closed') s[String(o.table)] = true; });
    return Object.keys(s);
  }
  function getTableStatus(table) {
    return getActiveTableNumbers().indexOf(String(table)) >= 0 ? 'occupied' : 'free';
  }
  function closeTable(table, note) {
    const all = loadOrders(); let n = 0; var now = Date.now();
    all.forEach(function (o) { if (String(o.table) === String(table) && o.status !== 'closed') { o.status = 'closed'; o.closedAt = now; if (note != null) o.billNote = String(note).slice(0, 100); n++; } });
    if (n) { saveOrders(all); setBillNote(table, ''); clearBillRequest(table); _onTableClosed(table); }
    return n;
  }
  // opmerking op de rekening, per tafel (gesynct); gewist bij afrekenen
  function getBillNote(table) { var d = load(); return (d.billNotes && d.billNotes[String(table)]) || ''; }
  function setBillNote(table, note) { const d = load(); d.billNotes = d.billNotes || {}; if (note) d.billNotes[String(table)] = String(note).slice(0, 100); else delete d.billNotes[String(table)]; save(d); }
  /* ---------- Daghistoriek + Z-rapport (dagafsluiting) ---------- */
  function _isToday(ms) { var d = new Date(ms), n = new Date(); return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate(); }
  function getDayHistory() { return loadOrders().filter(function (o) { return _isToday(o.createdAt); }).sort(function (a, b) { return a.createdAt - b.createdAt; }); }
  /* ---------- Tafelrooster (FOH kan tafels bijmaken) ---------- */
  const TKEY = 'kosmo-tables-v1';
  function loadTables() {
    try { var t = JSON.parse(localStorage.getItem(TKEY) || 'null'); if (Array.isArray(t)) return t.map(String); } catch (e) {}
    var d = []; for (var i = 1; i <= 20; i++) d.push(String(i)); return d;
  }
  function saveTables(list) { try { localStorage.setItem(TKEY, JSON.stringify(list)); } catch (e) {} broadcast('tables'); }
  function getTables() { var list = loadTables().slice(); getActiveTableNumbers().forEach(function (a) { if (list.indexOf(a) < 0) list.push(a); }); return list; }
  function addTable(label) {
    var list = loadTables();
    if (label == null || label === '') { var n = 1; while (list.indexOf(String(n)) >= 0) n++; label = String(n); }
    label = String(label); if (list.indexOf(label) < 0) { list.push(label); saveTables(list); }
    return label;
  }
  function removeTable(label) {
    label = String(label);
    saveTables(loadTables().filter(function (x) { return x !== label; }));
    _tableRefs(label, null);
  }
  // Alle plaatsen in de gedeelde instellingen die een tafel bij naam noemen (v0.111.0).
  // Hernoemen (nieuw = naam) of verwijderen (nieuw = null) werkt ze allemaal in één keer bij. Tot nu
  // bleven toekenningsregels, samenvoegbare reeksen, niet-reserveerbaar, kostenplaats en de
  // tafelactivatie op de oude naam staan: tafel 24 werd "24 M", maar de regel voor grote groepen zocht nog "24".
  function _tableRefs(oldL, newL) {
    var st = getResvSettings(), patch = {};
    function swapList(list) { var out = [], seen = {}; (list || []).forEach(function (x) { x = String(x); var y = x === oldL ? newL : x; if (y != null && !seen[y]) { seen[y] = 1; out.push(y); } }); return out; }
    ['tableSeats', 'tableSeatsMax', 'tableZones', 'tablePos', 'tableCostType'].forEach(function (k) {
      var m = st[k] || {}; if (m[oldL] == null) return;
      var mm = Object.assign({}, m); if (newL != null && mm[newL] == null) mm[newL] = mm[oldL]; delete mm[oldL]; patch[k] = mm;
    });
    ['freeTables', 'noReserve'].forEach(function (k) { if ((st[k] || []).map(String).indexOf(oldL) >= 0) patch[k] = swapList(st[k]); });
    if ((st.tableGroups || []).some(function (g) { return g.map(String).indexOf(oldL) >= 0; })) patch.tableGroups = st.tableGroups.map(swapList).filter(function (g) { return g.length > 1; });
    if ((st.assignRules || []).some(function (r) { return (r.order || []).map(String).indexOf(oldL) >= 0; })) patch.assignRules = st.assignRules.map(function (r) { return Object.assign({}, r, { order: swapList(r.order) }); });
    if (Object.keys(patch).length) saveResvSettings(patch);
    var a = loadActive(); if (a[oldL] != null) { if (newL != null) a[newL] = a[oldL]; delete a[oldL]; saveActive(a); }
  }
  // Tafelnamen in de instellingen die niet (meer) in het tafelrooster staan, en reserveerbare tafels zonder toekenningsregel.
  function tableConfigIssues() {
    var st = getResvSettings(), tabs = loadTables(), has = {}; tabs.forEach(function (t) { has[t] = 1; });
    var unknown = {};
    function chk(t) { t = String(t); if (!has[t]) unknown[t] = 1; }
    (st.assignRules || []).forEach(function (r) { (r.order || []).forEach(chk); });
    (st.tableGroups || []).forEach(function (g) { g.forEach(chk); });
    (st.noReserve || []).forEach(chk);
    var inRule = {}; (st.assignRules || []).forEach(function (r) { (r.order || []).forEach(function (t) { inRule[String(t)] = 1; }); });
    var noRule = (st.assignRules || []).length ? tabs.filter(function (t) { return !inRule[t] && isReservable(t); }) : [];
    return { unknown: Object.keys(unknown), noRule: noRule };
  }
  // som van de gewone zitplaatsen van alle reserveerbare tafels (ter vergelijking met de ingestelde capaciteit)
  function reservableSeats() { return loadTables().filter(isReservable).reduce(function (s2, t) { return s2 + tableSeatsOf(t); }, 0); }
  // Gratis tafel: rekeningen komen op €0 (tafel 0 = personeel, elke tafel met 'crew' in de naam, of expliciet in freeTables).
  function isFreeTable(t) {
    t = String(t); if (t === '0') return true; if (/crew/i.test(t)) return true;
    var st = getResvSettings(); return (st.freeTables || []).map(String).indexOf(t) >= 0;
  }
  // Tafel hernoemen: migreert de gedeelde config (zitplaatsen/zone/positie/gratis) én reservatie-toewijzingen mee.
  function renameTable(oldL, newL) {
    oldL = String(oldL); newL = String(newL == null ? '' : newL).trim();
    if (!newL || oldL === newL) return false;
    var list = loadTables(); var i = list.indexOf(oldL); if (i < 0) return false;
    if (list.indexOf(newL) >= 0) return false; // bestaat al
    if (_openOrders(oldL).length) return false; // in gebruik: eerst afrekenen of verplaatsen (Service > tafel > Verplaats)
    list[i] = newL; saveTables(list);
    _tableRefs(oldL, newL);
    var lk = getTableLink(oldL); if (lk) { setTableLink(newL, lk); clearTableLink(oldL); }
    var rs = loadResv(), ch = false;
    rs.forEach(function (r) { if (r.tableIds && r.tableIds.map(String).indexOf(oldL) >= 0) { r.tableIds = r.tableIds.map(function (x) { return String(x) === oldL ? newL : x; }); ch = true; } });
    if (ch) saveResv(rs);
    return true;
  }
  // verwijder enkel de HOOGSTE numerieke tafel (niet als die bezet is)
  function removeHighestTable() {
    var list = loadTables();
    var nums = list.filter(function (x) { return /^\d+$/.test(x); }).map(Number);
    if (!nums.length) return null;
    var lbl = String(Math.max.apply(null, nums));
    if (getActiveTableNumbers().indexOf(lbl) >= 0) return null; // bezet -> niet verwijderen
    saveTables(list.filter(function (x) { return x !== lbl; }));
    return lbl;
  }

  /* ---------- Gang-/ticketafwerking + voortgang ---------- */
  // keuken werkt per GANG af (niet per item): zet alle keukenregels van tafel+gang op progress
  function setCourseProgress(table, course, progress) {
    const all = loadOrders(); var touched = false;
    all.forEach(function (o) {
      if (String(o.table) !== String(table) || o.status !== 'open') return;
      o.lines.forEach(function (l) { if (l.voided || l.dest === 'bar' || !l.confirmed) return; if (l.course === course) { l.progress = progress; l.done = progress === 'red'; touched = true; } });
    });
    if (touched) { saveOrders(all); }
    return touched;
  }
  // bar: één ticket per tafel afwerken -> alle drankregels van de tafel geserveerd (rood)
  function serveBar(table) {
    const all = loadOrders(); var touched = false;
    all.forEach(function (o) {
      if (String(o.table) !== String(table) || o.status !== 'open') return;
      o.lines.forEach(function (l) { if (l.voided || l.dest !== 'bar' || !l.confirmed) return; if (l.progress !== 'red') { l.progress = 'red'; l.done = true; touched = true; } });
    });
    if (touched) { saveOrders(all); }
    return touched;
  }
  // voortgang van de gangen van een tafel (voor de tafel-overlay + keukenoverzicht)
  function getTableCourses(table) {
    var cs = {};
    loadOrders().forEach(function (o) {
      if (String(o.table) !== String(table) || o.status !== 'open') return;
      o.lines.forEach(function (l) { if (l.voided || l.dest === 'bar' || !l.confirmed) return; if (!cs[l.course]) cs[l.course] = { course: l.course, total: 0, red: 0, green: 0, blue: 0 }; cs[l.course].total++; cs[l.course][l.progress] = (cs[l.course][l.progress] || 0) + 1; });
    });
    return Object.keys(cs).map(function (k) { return cs[k]; }).sort(function (a, b) { return a.course - b.course; }).map(function (c) { c.status = c.red === c.total ? 'red' : (c.green > 0 ? 'green' : 'blue'); return c; });
  }

  /* ---------- Terugzetten (daghistoriek / foutief wegklikken) ---------- */
  // zet regels terug op actief (groen) en heropent een gesloten/gearchiveerde order
  function _reopen(pred) {
    const all = loadOrders(); var touched = false;
    all.forEach(function (o) {
      var any = false;
      o.lines.forEach(function (l) { if (pred(o, l)) { l.progress = 'green'; l.done = false; l.voided = false; l.confirmed = true; any = true; touched = true; } });
      if (any && o.status === 'closed') { o.status = 'open'; o.confirmedAt = o.confirmedAt || Date.now(); delete o.closedAt; delete o.autoArchived; }
    });
    if (touched) saveOrders(all);
    return touched;
  }
  function restoreTable(table) { return _reopen(function (o, l) { return String(o.table) === String(table); }); }

  /* ---------- Sessies, personen, betalingen, rapportage (Fase 2b) ---------- */
  const PKEY = 'kosmo-payments-v1';
  const RKEY = 'kosmo-reports-v1';
  function vatForDest(dest) { return dest === 'bar' ? 21 : 12; } // drank 21%, eten 12% (BE horeca, ter plaatse)
  function _openOrders(table) { return loadOrders().filter(function (o) { return String(o.table) === String(table) && o.status !== 'closed'; }); }
  function getPersons(table) { var os = _openOrders(table); for (var i = 0; i < os.length; i++) { if (os[i].persons) return os[i].persons; } var lk = getTableLink(table); return (lk && lk.covers) ? lk.covers : 0; }
  function setPersons(table, n) { n = parseInt(n, 10) || 0; const all = loadOrders(); all.forEach(function (o) { if (String(o.table) === String(table) && o.status !== 'closed') o.persons = n; }); saveOrders(all); return n; }

  function getPayments() { try { return JSON.parse(localStorage.getItem(PKEY) || '[]'); } catch (e) { return []; } }
  function savePayments(list) { try { localStorage.setItem(PKEY, JSON.stringify(list)); } catch (e) {} broadcast('orders'); }
  function getReports() { try { return JSON.parse(localStorage.getItem(RKEY) || '[]'); } catch (e) { return []; } }
  function saveReports(list) { try { localStorage.setItem(RKEY, JSON.stringify(list)); } catch (e) {} broadcast('data'); }

  // openstaande (nog niet betaalde) regels van een tafel
  function getOpenBill(table) {
    var lines = [];
    getTableOrders(table).forEach(function (o) {
      if (o.status === 'closed') return;
      o.lines.forEach(function (l) { if (l.confirmed && !l.voided) { var rem = l.qty - (l.paidQty || 0); if (rem > 0) lines.push(Object.assign({ orderId: o.id, remaining: rem }, l)); } });
    });
    return lines;
  }
  // rekening (deels) afrekenen: allocations = [{orderId, lineId, qty}], method = betaalwijze
  // Wettelijke afronding op 5 cent bij contante betaling (art. van kracht sinds het
  // afschaffen van de 1- en 2-centmunt). Enkel de fysiek gewisselde cash wordt
  // afgerond — de btw-relevante verkoopprijs (gross/net/vat) blijft exact, tot op de
  // cent, zoals de kassabon en de boekhouding vereisen. round2 is hoisted.
  function roundToCash(amount) { return Math.round(amount * 20) / 20; }
  function settleBill(table, allocations, method) {
    const all = loadOrders(); var settled = [];
    (allocations || []).forEach(function (a) {
      var o = all.find(function (x) { return x.id === a.orderId; }); if (!o) return;
      var l = o.lines.find(function (x) { return x.id === a.lineId; }); if (!l) return;
      var rem = l.qty - (l.paidQty || 0); var q = Math.min(rem, a.qty == null ? rem : parseInt(a.qty, 10) || 0);
      if (q <= 0) return;
      l.paidQty = (l.paidQty || 0) + q;
      settled.push({ itemId: l.itemId, name: l.name, qty: q, price: l.price, vatCode: l.vatCode || null, vatRate: l.vatRate != null ? l.vatRate : vatForDest(l.dest), dest: l.dest });
    });
    if (!settled.length) return null;
    var gross = settled.reduce(function (s2, x) { return s2 + x.price * x.qty; }, 0);
    var net = settled.reduce(function (s2, x) { return s2 + (x.price * x.qty) / (1 + (x.vatRate || 0) / 100); }, 0);
    var isCash = payTypeFor(method) === 'CASH';
    var cashReceived = isCash ? roundToCash(gross) : gross;
    var rounding = round2(cashReceived - gross);
    var relO = all.filter(function (o) { return String(o.table) === String(table) && o.status !== 'closed'; });
    var sid = relO.length ? relO[0].sessionId : null;
    var persons = relO.length ? (relO[0].persons || 0) : 0;
    var pay = { id: uid('pay'), table: String(table), sessionId: sid, at: Date.now(), method: method || 'cash', lines: settled, gross: round2(gross), net: round2(net), vat: round2(gross - net), rounding: rounding, cashReceived: round2(cashReceived), persons: persons };
    var pays = getPayments(); pays.push(pay); savePayments(pays);
    saveOrders(all);
    var _lk = getTableLink(table); if (_lk && _lk.guestId) { var _g = getGuest(_lk.guestId); if (_g) updateGuest(_lk.guestId, { totalSpend: round2((_g.totalSpend || 0) + pay.gross), lastVisit: businessDate(pay.at) }); }
    // Verkoop -> afname: de verkochte regels trekken - via het kaartrecept -
    // hun ingredienten van de centrale voorraad af. Afgeschermd: faalt dit,
    // dan mag het afrekenen er nooit onder lijden.
    try { if (window.FNB && FNB.depleteForSaleBatch) FNB.depleteForSaleBatch(settled); } catch (e) {}
    _maybeCloseSession(table);
    return pay;
  }
  function round2(x) { return Math.round((x + Number.EPSILON) * 100) / 100; }
  function _maybeCloseSession(table) {
    const all = loadOrders();
    var rel = all.filter(function (o) { return String(o.table) === String(table) && o.status !== 'closed'; });
    if (!rel.length) return;
    if (rel.some(function (o) { return o.status === 'to_confirm'; })) return;
    var openLeft = false;
    rel.forEach(function (o) { o.lines.forEach(function (l) { if (l.confirmed && !l.voided && (l.qty - (l.paidQty || 0)) > 0) openLeft = true; }); });
    if (!openLeft) { var now = Date.now(); rel.forEach(function (o) { o.status = 'closed'; o.closedAt = now; }); saveOrders(all); setBillNote(table, ''); clearBillRequest(table); _onTableClosed(table); }
  }

  // rapport uit betalingen: bruto/netto/btw per tarief, per betaalwijze, eten vs drank, covers
  function computeReport(payments) {
    var gross = 0, net = 0, byRate = {}, byMethod = {}, food = { qty: 0, gross: 0, net: 0 }, drink = { qty: 0, gross: 0, net: 0 }, covers = {}, items = {}, itemsCount = 0;
    (payments || []).forEach(function (p) {
      gross += p.gross; net += p.net;
      byMethod[p.method] = (byMethod[p.method] || 0) + p.gross;
      if (p.sessionId) covers[p.sessionId] = Math.max(covers[p.sessionId] || 0, p.persons || 0);
      p.lines.forEach(function (l) {
        var g = l.price * l.qty, n = g / (1 + (l.vatRate || 0) / 100), r = l.vatRate || 0;
        if (!byRate[r]) byRate[r] = { gross: 0, net: 0, vat: 0 };
        byRate[r].gross += g; byRate[r].net += n; byRate[r].vat += g - n;
        var b = l.dest === 'bar' ? drink : food; b.qty += l.qty; b.gross += g; b.net += n;
        if (p.synthetic) return; // dagomzet uit het overzicht: geen afzonderlijke items
        itemsCount += l.qty;
        var it = items[l.itemId] || (items[l.itemId] = { itemId: l.itemId, name: l.name, dest: l.dest, qty: 0, gross: 0 });
        it.qty += l.qty; it.gross += g;
      });
    });
    var totCovers = 0; Object.keys(covers).forEach(function (k) { totCovers += covers[k]; });
    var nSess = Object.keys(covers).length;
    return { gross: round2(gross), net: round2(net), vat: round2(gross - net), payments: (payments || []).length, sessions: nSess, covers: totCovers, itemsCount: itemsCount, avgPerCustomer: round2(totCovers ? gross / totCovers : 0), avgPerSession: round2(nSess ? gross / nSess : 0), byRate: byRate, byMethod: byMethod, food: food, drink: drink, items: items };
  }
  // ---- bedrijfsdag: omzet NA middernacht telt bij de gestarte dag (cutoff-uur) ----
  const DAY_CUTOFF_HOUR = 6; // vóór 06:00 hoort bij de vorige (gestarte) dag
  function _q(n) { return (n < 10 ? '0' : '') + n; }
  function _fmtDate(d) { return d.getFullYear() + '-' + _q(d.getMonth() + 1) + '-' + _q(d.getDate()); }
  function businessDate(ms) { var d = new Date((ms == null ? Date.now() : ms) - DAY_CUTOFF_HOUR * 3600000); return _fmtDate(d); }
  function _dateKey(ms) { return businessDate(ms); }
  function _isTodayMs(ms) { return businessDate(ms) === businessDate(Date.now()); }
  // Afrekeningen in een periode. Naast de echte afrekeningen van het OS komt er per dag uit het inkomstenoverzicht één
  // samengestelde afrekening bij (synthetic: true; betaalwijze "inkomstenoverzicht") — maar enkel voor dagen waarop het OS zelf
  // geen afrekeningen heeft. Zo werken alle rapporten (omzet, KPI, doelen, weken/kwartalen, weekdagen) met de echte omzet.
  // Functies die op afzonderlijke verkopen steunen (uur, drankaanhechting, menu-engineering) vragen enkel de echte (realOnly).
  /* Kassa actief vanaf (kosmo-kassa-v1): vóór die datum telt een betaling in de kassa niet als omzet en duwt ze geen dag uit de inkomstenlijst weg
     (5 nov 2026: testbetalingen haalden zo drie echte dagen uit de rapporten). Zonder datum telt de kassa niet, tenzij er nog geen inkomstenlijst is. */
  var KASSAKEY = 'kosmo-kassa-v1';
  function getKassaVanaf() { try { return (JSON.parse(localStorage.getItem(KASSAKEY) || '{}') || {}).vanaf || ''; } catch (e) { return ''; } }
  function setKassaVanaf(d) { try { localStorage.setItem(KASSAKEY, JSON.stringify({ vanaf: /^\d{4}-\d{2}-\d{2}$/.test(d || '') ? d : '' })); } catch (e) {} try { emit('data'); } catch (e) {} }
  function kassaTeltOp(d) { var v = getKassaVanaf(); return v ? d >= v : !loadIncome().days.length; }
  // Alle betalingen: de lopende lijst plus het maandarchief (v0.119.0). Rapporten en "op welke dagen draaide de kassa" kijken naar alles.
  var PARCH_PREFIX = 'kosmo-payments-archief-';
  function _archiefMaanden(prefix) {
    var uit = [];
    try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf(prefix) === 0) uit.push(k.slice(prefix.length)); } } catch (e) {}
    return uit.sort();
  }
  function _leesLijst(k) { try { var a = JSON.parse(localStorage.getItem(k) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function getAllPayments() {
    var uit = getPayments(), gezien = {};
    uit.forEach(function (p) { gezien[p.id] = 1; });
    _archiefMaanden(PARCH_PREFIX).forEach(function (m) { _leesLijst(PARCH_PREFIX + m).forEach(function (p) { if (!gezien[p.id]) { gezien[p.id] = 1; uit.push(p); } }); });
    return uit;
  }
  function _kassaBetalingen() { return getAllPayments().filter(function (p) { return kassaTeltOp(businessDate(p.at)); }); }
  function kassaGenegeerd() { return getAllPayments().length - _kassaBetalingen().length; }
  function paymentsInRange(startStr, endStr, realOnly) {
    var real = _kassaBetalingen().filter(function (p) { var bd = businessDate(p.at); return bd >= startStr && bd <= endStr; });
    if (realOnly) return real;
    var inc = loadIncome(); if (!inc.days.length) return real;
    var pos = {}; _kassaBetalingen().forEach(function (p) { pos[businessDate(p.at)] = 1; });
    var out = real.slice();
    inc.days.forEach(function (d) { if (d.date < startStr || d.date > endStr || pos[d.date]) return; var p = _incomePayment(d); if (p) out.push(p); });
    return out;
  }
  // Eén dag uit het inkomstenoverzicht als afrekening: per btw-tarief één regel (btw-bedrag volgens het overzicht); het netto-totaal van
  // de dag blijft exact wat in het overzicht staat. Netto dat niet door een btw-rij gedekt is (ontbrekende rij), krijgt 12 % (voeding)
  // of 21 % (dranken); is er meer btw-gedekt netto dan het dagtotaal, dan worden de regels evenredig verkleind.
  // Verdeling van één omzetdag over de btw-tarieven: [{ r, n (netto), v (btw) }]. Sinds v0.107.0 geldt altijd: som netto = netto van de
  // dag (op de cent), som btw = de btw zoals in de lijst. Dus bruto = netto + btw, in elk scherm (rapporten, boekhouding, btw-aangifte).
  // Voordien rekende elk tarief "btw ÷ tarief" en week het netto per dag enkele centen af, en het bruto in de boekhouding enkele euro.
  function _incomeSplit(d) {
    if (!d || !(d.net > 0)) return [];
    var base = Object.keys(d.btw || {}).filter(function (r) { return Number(d.btw[r]) > 0 && Number(r) > 0; }).map(function (r) { return { r: Number(r), n: d.btw[r] / (Number(r) / 100), v: Number(d.btw[r]) }; });
    var sum = base.reduce(function (t, x) { return t + x.n; }, 0), resid = d.net - sum;
    if (resid > 0.05) {
      // het ontbrekende netto verdelen over drank (21 %) en eten (12 %), naar wat het overzicht per groep zegt
      var n21 = base.filter(function (x) { return x.r === 21; }).reduce(function (t, x) { return t + x.n; }, 0), nFood = sum - n21;
      var gapD = Math.max(0, (d.netDrink || 0) - n21), gapF = Math.max(0, (d.netFood || 0) - nFood), gt = gapD + gapF;
      var addD = gt > 0 ? resid * gapD / gt : 0, addF = resid - addD;
      var put = function (rate, n) { if (!(n > 0.005)) return; var hit = base.filter(function (x) { return x.r === rate; })[0]; if (hit) hit.n += n; else base.push({ r: rate, n: n, v: 0 }); };
      put(21, addD); put(12, addF);
    }
    sum = base.reduce(function (t, x) { return t + x.n; }, 0);
    if (!base.length) base.push({ r: 12, n: d.net, v: 0 });
    else if (sum > 0) { var k = d.net / sum; base.forEach(function (x) { x.n = round2(x.n * k); }); }
    // afrondingsrest (centen) op het grootste deel, zodat de som exact het netto van de dag is
    var rest = round2(d.net - base.reduce(function (t, x) { return t + x.n; }, 0));
    if (rest) { var big = base.slice().sort(function (a, b) { return b.n - a.n; })[0]; big.n = round2(big.n + rest); }
    return base;
  }
  function _incomePayment(d) {
    var split = _incomeSplit(d); if (!split.length) return null;
    var lines = [], gross = 0, net = 0, vat = 0;
    split.forEach(function (x) {
      var g = x.n + x.v; gross += g; net += x.n; vat += x.v;
      lines.push({ itemId: null, name: (x.r === 21 ? 'Dranken ' : 'Voeding ') + x.r + '%', qty: 1, price: g, vatRate: x.r, dest: x.r === 21 ? 'bar' : 'kitchen' });
    });
    return { id: 'inc-' + d.date, at: new Date(d.date + 'T12:00:00').getTime(), method: 'inkomstenoverzicht', synthetic: true, sessionId: 'inc-' + d.date, persons: d.klanten || 0, lines: lines, gross: round2(gross), net: round2(net), vat: round2(vat) };
  }
  function dayReport(dateStr) { return computeReport(paymentsInRange(dateStr, dateStr)); }
  function rangeReport(startStr, endStr) { return computeReport(paymentsInRange(startStr, endStr)); }
  function getDayPayments() { var t = businessDate(Date.now()); return paymentsInRange(t, t); }
  function getLiveReport() { return computeReport(getDayPayments()); }

  // ---- kalender-hulp ----
  function _parse(str) { var a = String(str).split('-'); return new Date(+a[0], +a[1] - 1, +a[2]); }
  function _addDays(d, n) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; }
  function _mondayOf(d) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); var day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); return x; }
  function isoWeek(d) { var x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); var dn = (x.getUTCDay() + 6) % 7; x.setUTCDate(x.getUTCDate() - dn + 3); var ft = new Date(Date.UTC(x.getUTCFullYear(), 0, 4)); var wk = 1 + Math.round(((x - ft) / 86400000 - 3 + ((ft.getUTCDay() + 6) % 7)) / 7); return { year: x.getUTCFullYear(), week: wk }; }

  // dagrapporten van de lopende week (ma–zo), met weeknr
  function getRunningWeek() {
    var today = _parse(businessDate(Date.now()));
    var mon = _mondayOf(today), sun = _addDays(mon, 6);
    var iw = isoWeek(mon);
    var days = [];
    for (var i = 0; i < 7; i++) { var d = _addDays(mon, i); var ds = _fmtDate(d); days.push({ date: ds, report: dayReport(ds) }); }
    return { year: iw.year, week: iw.week, monday: _fmtDate(mon), sunday: _fmtDate(sun), days: days, total: rangeReport(_fmtDate(mon), _fmtDate(sun)) };
  }

  // periodiek: volledige jaren, kwartalen, weken (die volledig in de periode vallen) + dagrapporten
  function getPeriodBreakdown(startStr, endStr) {
    if (startStr > endStr) { var tmp = startStr; startStr = endStr; endStr = tmp; }
    var start = _parse(startStr), end = _parse(endStr);
    var out = { start: startStr, end: endStr, years: [], quarters: [], weeks: [], days: [] };
    // dagen met omzet
    var byDay = {}, dayOrder = [];
    paymentsInRange(startStr, endStr).forEach(function (p) { var bd = businessDate(p.at); if (!byDay[bd]) { byDay[bd] = []; dayOrder.push(bd); } byDay[bd].push(p); });
    dayOrder.sort();
    dayOrder.forEach(function (ds) { out.days.push({ label: ds, date: ds, report: computeReport(byDay[ds]) }); });
    var hasPay = function (a, b) { return paymentsInRange(a, b).length > 0; };
    // volledige jaren
    for (var y = start.getFullYear(); y <= end.getFullYear(); y++) {
      var jan1 = _fmtDate(new Date(y, 0, 1)), dec31 = _fmtDate(new Date(y, 11, 31));
      if (jan1 >= startStr && dec31 <= endStr && hasPay(jan1, dec31)) out.years.push({ label: 'Jaar ' + y, report: rangeReport(jan1, dec31) });
    }
    // volledige kwartalen
    for (var yy = start.getFullYear(); yy <= end.getFullYear(); yy++) {
      for (var qi = 0; qi < 4; qi++) {
        var qs = _fmtDate(new Date(yy, qi * 3, 1)), qe = _fmtDate(new Date(yy, qi * 3 + 3, 0));
        if (qs >= startStr && qe <= endStr && hasPay(qs, qe)) out.quarters.push({ label: 'Q' + (qi + 1) + ' ' + yy, report: rangeReport(qs, qe) });
      }
    }
    // volledige weken (ma–zo)
    var wk = _mondayOf(start);
    if (_fmtDate(wk) < startStr) wk = _addDays(wk, 7);
    for (; ;) {
      var ws = _fmtDate(wk), we = _fmtDate(_addDays(wk, 6));
      if (ws > endStr) break;
      if (we <= endStr && ws >= startStr && hasPay(ws, we)) { var iw2 = isoWeek(wk); out.weeks.push({ label: 'Week ' + iw2.week + ' (' + iw2.year + ')', report: rangeReport(ws, we) }); }
      wk = _addDays(wk, 7);
    }
    return out;
  }

  // ---- Business-analyses (afgeleid uit betalingen/orders) ----
  function getHourly(startStr, endStr) {
    var arr = []; for (var i = 0; i < 24; i++) arr.push({ hour: i, gross: 0, count: 0 });
    paymentsInRange(startStr, endStr, true).forEach(function (p) { var h = new Date(p.at).getHours(); arr[h].gross += p.gross; arr[h].count++; });
    arr.forEach(function (a) { a.gross = round2(a.gross); }); return arr;
  }
  function getByWeekday(startStr, endStr) {
    var g = [], cov = [], dts = []; for (var i = 0; i < 7; i++) { g.push(0); cov.push({}); dts.push({}); }
    paymentsInRange(startStr, endStr).forEach(function (p) { var bd = businessDate(p.at); var wd = (_parse(bd).getDay() + 6) % 7; g[wd] += p.gross; dts[wd][bd] = 1; if (p.sessionId) cov[wd][bd + ':' + p.sessionId] = Math.max(cov[wd][bd + ':' + p.sessionId] || 0, p.persons || 0); });
    return g.map(function (gross, i) { var c = 0; Object.keys(cov[i]).forEach(function (k) { c += cov[i][k]; }); var occ = Object.keys(dts[i]).length; return { day: i, gross: round2(gross), covers: c, occurrences: occ, avgGross: round2(occ ? gross / occ : 0) }; });
  }
  function comparePeriods(startStr, endStr) {
    if (startStr > endStr) { var t = startStr; startStr = endStr; endStr = t; }
    var s = _parse(startStr), e = _parse(endStr);
    var lenDays = Math.round((e - s) / 86400000) + 1;
    var prevEnd = _addDays(s, -1), prevStart = _addDays(prevEnd, -(lenDays - 1));
    var cur = rangeReport(startStr, endStr), prev = rangeReport(_fmtDate(prevStart), _fmtDate(prevEnd));
    function gpct(a, b) { return b ? round2((a - b) / b * 100) : (a ? 100 : 0); }
    return { current: cur, previous: prev, prevStart: _fmtDate(prevStart), prevEnd: _fmtDate(prevEnd), growth: { gross: gpct(cur.gross, prev.gross), net: gpct(cur.net, prev.net), covers: gpct(cur.covers, prev.covers), avgPerCustomer: gpct(cur.avgPerCustomer, prev.avgPerCustomer) } };
  }
  function _median(a) { if (!a.length) return 0; a = a.slice().sort(function (x, y) { return x - y; }); var m = Math.floor(a.length / 2); return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; }
  // Menu-engineering: populariteit (aantal verkocht) x marge/stuk. Echte
  // contributiemarge zodra een gerecht aan een kaartrecept hangt (dezelfde
  // F&B-rekenkern hergebruikt, niet overgetikt - zie fnbSalesCost hieronder,
  // zelfde patroon); zonder koppeling valt de indeling terug op prijs/stuk
  // als grove benadering (costKnown: false op dat item, zichtbaar in de UI).
  function getMenuEngineering(startStr, endStr) {
    var rep = rangeReport(startStr, endStr);
    var F = window.FNB;
    var items = Object.keys(rep.items || {}).map(function (k) {
      var it = rep.items[k];
      var out = { itemId: it.itemId, name: it.name, dest: it.dest, qty: it.qty, gross: round2(it.gross), unit: round2(it.qty ? it.gross / it.qty : 0), costKnown: false, marginUnit: null, foodcostPct: null };
      var kr = (F && F.kaartByMenuItem) ? F.kaartByMenuItem(it.itemId) : null;
      if (kr && F.calcKaart) {
        var r = F.calcKaart(kr);
        var unitExcl = out.unit / (1 + (r.vat || 0) / 100);
        var fc = r.totalFoodcostPerPortion || r.foodcostPerPortion || 0;
        var dc = r.directCostPerPortion != null ? r.directCostPerPortion : fc; // marge houdt rekening met verbruiksmateriaal; foodcost% blijft zuivere voeding
        out.costKnown = true; out.marginUnit = round2(unitExcl - dc); out.foodcostPct = unitExcl > 0 ? round2(fc / unitExcl * 100) : 0;
      }
      return out;
    });
    var bron = 'kassa', mixDagen = 0;
    // Nog geen verkopen per gerecht (de kassa is niet gekoppeld)? Dan de aantallen uit Mix-marge (kosmo-mix-v1: geschat of
    // ingevoerd over mix.days dagen), omgerekend naar deze periode. Duidelijk een schatting (bron: 'schatting').
    if (!items.length && F && F.db && F.calcKaart) {
      var mix = null; try { mix = JSON.parse(localStorage.getItem('kosmo-mix-v1') || 'null'); } catch (e) {}
      if (mix && mix.qty) {
        mixDagen = Number(mix.days) || 0;
        var span = Math.max(1, Math.round((Date.parse(endStr + 'T12:00:00') - Date.parse(startStr + 'T12:00:00')) / 864e5) + 1), fac = mixDagen > 0 ? span / mixDagen : 1;
        (F.db().kaartRecipes || []).forEach(function (kr) {
          var q = Number(mix.qty[kr.id]); if (!(q > 0) || kr.archived) return;
          var ids = Object.keys(kr.menuItemIds || {}).map(function (c) { return kr.menuItemIds[c]; }).concat(kr.menuItemId ? [kr.menuItemId] : []);
          var it = null; for (var i = 0; i < ids.length && !it; i++) { var x = getItem(ids[i]); if (x && !x.archived) it = x; }
          if (!it) return;
          var qty = Math.round(q * fac), unit = round2(effectivePrice(it)), r = F.calcKaart(kr);
          var unitExcl = unit / (1 + (r.vat || 0) / 100), fc = r.totalFoodcostPerPortion || r.foodcostPerPortion || 0, dc = r.directCostPerPortion != null ? r.directCostPerPortion : fc;
          items.push({ itemId: it.id, name: it.name, dest: destForItem(it.id), qty: qty, gross: round2(qty * unit), unit: unit, costKnown: true, marginUnit: round2(unitExcl - dc), foodcostPct: unitExcl > 0 ? round2(fc / unitExcl * 100) : 0 });
        });
        if (items.length) bron = 'schatting';
      }
    }
    if (!items.length) return { items: [], medianQty: 0, medianUnit: 0, bron: bron };
    var mq = _median(items.map(function (x) { return x.qty; }));
    var mu = _median(items.map(function (x) { return x.costKnown ? x.marginUnit : x.unit; }));
    items.forEach(function (it) {
      var val = it.costKnown ? it.marginUnit : it.unit;
      var pop = it.qty >= mq, high = val >= mu;
      it.cls = pop && high ? 'star' : (pop && !high ? 'workhorse' : (!pop && high ? 'puzzle' : 'dog'));
    });
    items.sort(function (a, b) { return b.gross - a.gross; });
    return { items: items, medianQty: mq, medianUnit: round2(mu), bron: bron, mixDagen: mixDagen };
  }
  // Omzetgewogen mix-marge per bron (eten/drank), enkel over verkopen met een
  // gekende kostprijs (recept gekoppeld) - plus welk deel van de omzet dat
  // dekt (coveragePct), zodat duidelijk is hoe volledig het cijfer is.
  // Zelfde iteratiepatroon als fnbSalesCost, enkel gesplitst per bron.
  function fnbMixMargin(startStr, endStr) {
    var F = window.FNB;
    var g = { food: { knownNet: 0, knownCost: 0, groupNet: 0 }, drink: { knownNet: 0, knownCost: 0, groupNet: 0 } };
    paymentsInRange(startStr, endStr).forEach(function (p) {
      (p.lines || []).forEach(function (l) {
        var q = Number(l.qty || 0); if (!q) return;
        var key = l.dest === 'bar' ? 'drink' : 'food';
        var net = Number(l.price || 0) * q / (1 + Number(l.vatRate || 0) / 100);
        g[key].groupNet += net;
        var kr = (F && F.kaartByMenuItem && l.itemId) ? F.kaartByMenuItem(l.itemId) : null;
        if (kr && F.calcKaart) {
          var r = F.calcKaart(kr);
          g[key].knownNet += net; g[key].knownCost += (r.totalFoodcostPerPortion || r.foodcostPerPortion || 0) * q;
        }
      });
    });
    function finish(x) {
      return { mixFoodcostPct: x.knownNet > 0 ? round2(x.knownCost / x.knownNet * 100) : null, coveragePct: x.groupNet > 0 ? round2(x.knownNet / x.groupNet * 100) : 0, knownNet: round2(x.knownNet), groupNet: round2(x.groupNet) };
    }
    var res = { food: finish(g.food), drink: finish(g.drink) };
    // Schatting uit inkoop ÷ omzet (per groep): wat je in de periode aan voeding/dranken aankocht tegenover wat je verkocht. Geen
    // verbruik per gerecht, wel een bruikbare maatstaf zolang kaartrecepten en kassa niet gekoppeld zijn.
    var sp = spendByCategory(startStr, endStr), rep2 = rangeReport(startStr, endStr);
    var buyFood = sp['Voeding'] || 0, buyDrink = (sp['Dranken – alcoholisch'] || 0) + (sp['Dranken – non-alcoholisch & koffie'] || 0);
    var fNet = rep2.food ? rep2.food.net : 0, dNet = rep2.drink ? rep2.drink.net : 0;
    res.estimate = { foodPct: fNet > 0 && buyFood > 0 ? round2(buyFood / fNet * 100) : null, drinkPct: dNet > 0 && buyDrink > 0 ? round2(buyDrink / dNet * 100) : null, buyFood: round2(buyFood), buyDrink: round2(buyDrink), foodNet: round2(fNet), drinkNet: round2(dNet) };
    return res;
  }
  function getPaymentMix(startStr, endStr) {
    var rep = rangeReport(startStr, endStr), total = rep.gross;
    var out = Object.keys(rep.byMethod).map(function (m) { return { method: m, gross: round2(rep.byMethod[m]), share: total ? round2(rep.byMethod[m] / total * 100) : 0 }; });
    out.sort(function (a, b) { return b.gross - a.gross; });
    return { methods: out, total: round2(total) };
  }
  function getDiscountsVoids(startStr, endStr) {
    var disc = 0, voidVal = 0, voidCount = 0;
    loadOrdersInRange(startStr, endStr).forEach(function (o) { var bd = businessDate(o.createdAt); if (bd < startStr || bd > endStr) return; o.lines.forEach(function (l) { if (l.voided) { voidVal += (l.priceOrig != null ? l.priceOrig : l.price) * l.qty; voidCount += l.qty; } else if (l.confirmed && l.priceOrig != null && l.priceOrig > l.price) { disc += (l.priceOrig - l.price) * l.qty; } }); });
    return { discount: round2(disc), voidValue: round2(voidVal), voidCount: voidCount };
  }
  // Wat er via promoties is weggegeven: verschil tussen volle en betaalde prijs op bevestigde, niet-geannuleerde regels. Bron: de OS-bestellingen.
  function getPromoReport(startStr, endStr) {
    var by = {}, total = 0, qty = 0;
    loadOrdersInRange(startStr, endStr).forEach(function (o) {
      var bd = businessDate(o.createdAt); if (bd < startStr || bd > endStr) return;
      (o.lines || []).forEach(function (l) {
        if (l.voided || !l.confirmed || l.priceOrig == null || !(l.priceOrig > l.price)) return;
        var d = (l.priceOrig - l.price) * (l.qty || 1), k = l.itemId || l.name, b = by[k] = by[k] || { itemId: l.itemId, name: l.name, qty: 0, discount: 0 };
        b.qty += l.qty || 1; b.discount += d; total += d; qty += l.qty || 1;
      });
    });
    var items = Object.keys(by).map(function (k) { by[k].discount = round2(by[k].discount); return by[k]; }).sort(function (a, b) { return b.discount - a.discount; });
    return { discount: round2(total), qty: qty, items: items };
  }
  function getDrinkAttach(startStr, endStr) {
    var sess = {}; paymentsInRange(startStr, endStr, true).forEach(function (p) { if (!p.sessionId) return; if (!sess[p.sessionId]) sess[p.sessionId] = false; p.lines.forEach(function (l) { if (l.dest === 'bar') sess[p.sessionId] = true; }); });
    var keys = Object.keys(sess), withD = keys.filter(function (k) { return sess[k]; }).length;
    return { sessions: keys.length, withDrink: withD, rate: keys.length ? round2(withD / keys.length * 100) : 0 };
  }
  /* ---------- Omzetdoelen (management) ---------- */
  function getGoals() { var d = load(); return d.goals || {}; }
  function setGoal(period, amount) { const d = load(); d.goals = d.goals || {}; if (amount == null || amount === '') delete d.goals[period]; else d.goals[period] = parseFloat(amount) || 0; save(d); return d.goals; }
  // handige periode-shortcuts (bedrijfsdatum)
  function todayStr() { return businessDate(Date.now()); }
  function weekRange() { var w = getRunningWeek(); return { start: w.monday, end: w.sunday }; }
  function monthRange() { var d = _parse(businessDate(Date.now())); return { start: _fmtDate(new Date(d.getFullYear(), d.getMonth(), 1)), end: _fmtDate(new Date(d.getFullYear(), d.getMonth() + 1, 0)) }; }

  /* ---------- Archief van gesloten bestellingen (v0.118.0) ----------
     Alle bestellingen stonden in één document (kosmo-orders-v1) dat nooit kleiner werd: elk toestel, de gastenkaart op de server
     en de browseropslag (± 5 MB) droegen zo de volledige geschiedenis mee. Bij het dag afsluiten verhuizen gesloten bestellingen
     die ouder zijn dan ARCHIEF_NA_DAGEN naar een archief per maand (kosmo-orders-archief-JJJJ-MM, maand van aanmaak).
     Eerst het archief bewaren, dan pas de live lijst inkorten: mislukt het archief, dan verandert er niets.
     Rapporten over een periode lezen live + archief (loadOrdersInRange). */
  var ARCHIEF_PREFIX = 'kosmo-orders-archief-', ARCHIEF_NA_DAGEN = 7;
  function _archiefSleutel(maand) { return ARCHIEF_PREFIX + maand; }
  function loadOrderArchief(maand) { return _leesLijst(_archiefSleutel(maand)); }
  function _volgendeMaand(m) { var j = parseInt(m.slice(0, 4), 10), n = parseInt(m.slice(5, 7), 10) + 1; if (n > 12) { n = 1; j++; } return j + '-' + (n < 10 ? '0' : '') + n; }
  // Verplaatst lijst-items naar hun maandarchief. Eerst het archief bewaren, dan pas de live lijst inkorten.
  function _naarArchief(prefix, items, maandVan) {
    var perMaand = {};
    items.forEach(function (x) { var m = maandVan(x); (perMaand[m] = perMaand[m] || []).push(x); });
    Object.keys(perMaand).forEach(function (m) {
      var bestaand = _leesLijst(prefix + m), gezien = {};
      bestaand.forEach(function (x) { gezien[x.id] = 1; });
      perMaand[m].forEach(function (x) { if (!gezien[x.id]) bestaand.push(x); });
      localStorage.setItem(prefix + m, JSON.stringify(bestaand)); // gooit bij volle opslag: de aanroeper laat de live lijst dan staan
    });
  }
  function archiveOldOrders(nu) {
    var grens = businessDate((nu == null ? Date.now() : nu) - ARCHIEF_NA_DAGEN * 86400000);
    var oud = function (o) { return o && o.status === 'closed' && o.closedAt && businessDate(o.closedAt) < grens; };
    var all = loadOrders(), weg = all.filter(oud);
    if (!weg.length) return 0;
    try { _naarArchief(ARCHIEF_PREFIX, weg, function (o) { return businessDate(o.createdAt || o.closedAt).slice(0, 7); }); } catch (e) { return 0; }
    saveOrders(all.filter(function (o) { return !oud(o); }));
    return weg.length;
  }
  // Betalingen veranderen niet meer na het afrekenen; na ARCHIEF_NA_DAGEN gaan ze naar kosmo-payments-archief-JJJJ-MM (v0.119.0).
  function archiveOldPayments(nu) {
    var grens = businessDate((nu == null ? Date.now() : nu) - ARCHIEF_NA_DAGEN * 86400000);
    var oud = function (p) { return p && p.at && businessDate(p.at) < grens; };
    var all = getPayments(), weg = all.filter(oud);
    if (!weg.length) return 0;
    try { _naarArchief(PARCH_PREFIX, weg, function (p) { return businessDate(p.at).slice(0, 7); }); } catch (e) { return 0; }
    savePayments(all.filter(function (p) { return !oud(p); }));
    return weg.length;
  }
  function loadOrdersInRange(startStr, endStr) {
    var uit = loadOrders(), gezien = {};
    uit.forEach(function (o) { gezien[o.id] = 1; });
    if (!/^\d{4}-\d{2}/.test(String(startStr)) || !/^\d{4}-\d{2}/.test(String(endStr))) return uit;
    var m = String(startStr).slice(0, 7), eind = String(endStr).slice(0, 7), stop = 0;
    while (m <= eind && stop++ < 240) { loadOrderArchief(m).forEach(function (o) { if (!gezien[o.id]) { gezien[o.id] = 1; uit.push(o); } }); m = _volgendeMaand(m); }
    return uit;
  }

  // 'Z-rapport – dag afsluiten' = rapport bewaren in Business (GEEN werkdata wissen)
  function closeDay() {
    var rep = computeReport(getDayPayments()); rep.date = businessDate(Date.now()); rep.savedAt = Date.now();
    var reps = getReports().filter(function (r) { return r.date !== rep.date; }); reps.push(rep); saveReports(reps);
    try { if (kassaTeltOp(rep.date) && typeof window !== 'undefined' && window.KosmoVoorbereiding) window.KosmoVoorbereiding.boekZ(rep); } catch (e) {}
    // dag dicht = geactiveerde tafels zonder openstaande bestelling weer vrij (v0.111.0)
    try { var a = loadActive(), ch = false; Object.keys(a).forEach(function (t) { if (t !== '0' && !_openOrders(t).length) { delete a[t]; ch = true; } }); if (ch) saveActive(a); } catch (e) {}
    // oude gesloten bestellingen naar het maandarchief (v0.118.0)
    try { rep.archived = archiveOldOrders(); rep.archivedPayments = archiveOldPayments(); } catch (e) {}
    return rep;
  }
  // gesloten sessies van vandaag (een tafelnummer kan meermaals voorkomen)
  function getDaySessions() {
    var bySid = {}, order = [], pays = getPayments();
    loadOrders().forEach(function (o) {
      if (o.status !== 'closed' || !o.closedAt || !_isTodayMs(o.closedAt)) return;
      var sid = o.sessionId || ('s' + o.table + '-' + o.closedAt);
      if (!bySid[sid]) { bySid[sid] = { sessionId: sid, table: o.table, persons: o.persons || 0, openedAt: o.createdAt, closedAt: o.closedAt, lines: [] }; order.push(sid); }
      var e = bySid[sid]; e.persons = Math.max(e.persons, o.persons || 0); e.openedAt = Math.min(e.openedAt, o.createdAt); e.closedAt = Math.max(e.closedAt, o.closedAt);
      o.lines.forEach(function (l) { e.lines.push(l); });
    });
    order.forEach(function (sid) { bySid[sid].payments = pays.filter(function (p) { return p.sessionId === sid; }); });
    return order.map(function (k) { return bySid[k]; }).sort(function (a, b) { return b.closedAt - a.closedAt; });
  }

  /* ---------- Betaalwijzen (Settings, management) ---------- */
  function getPaymentMethods() { var d = load(); return (d.paymentMethods && d.paymentMethods.length) ? d.paymentMethods : ['cash', 'card']; }
  function addPaymentMethod(name, payType) { const d = load(); d.paymentMethods = getPaymentMethods().slice(); name = String(name || '').trim(); if (name && d.paymentMethods.indexOf(name) < 0) { d.paymentMethods.push(name); if (payType) { d.paymentTypes = d.paymentTypes || {}; d.paymentTypes[name] = payType; } save(d); } return d.paymentMethods; }
  function removePaymentMethod(name) { const d = load(); d.paymentMethods = getPaymentMethods().filter(function (m) { return m !== name; }); if (d.paymentTypes) delete d.paymentTypes[name]; save(d); return d.paymentMethods; }

  /* ---------- Betaalwijze-types (fiscaal — PaymentType-enum, additief) ---------- */
  var PAY_TYPES = [
    ['CASH', 'Cash / contant'], ['CARD_DEBIT', 'Bancontact / debet'], ['CARD_CREDIT', 'Kredietkaart'],
    ['CARD_UNKNOWN', 'Kaart (onbekend)'], ['CHEQUE_MEAL', 'Maaltijdcheque'], ['CHEQUE_OTHER', 'Andere cheque'],
    ['APP', 'App (Payconiq, ...)'], ['ONLINE', 'Online betaling'], ['VOUCHER_STORE', 'Cadeaubon (eigen)'],
    ['VOUCHER_OTHER', 'Andere bon'], ['CUSTOMER_CREDIT', 'Klantkrediet'], ['OTHER', 'Andere'], ['UNKNOWN', 'Onbekend']
  ];
  function guessPayType(name) {
    var n = String(name || '').toLowerCase();
    if (/cash|contant/.test(n)) return 'CASH';
    if (/bancontact|debet|maestro/.test(n)) return 'CARD_DEBIT';
    if (/visa|master|krediet|credit/.test(n)) return 'CARD_CREDIT';
    if (/payconiq|app/.test(n)) return 'APP';
    if (/maaltijd|swile|monizze|edenred|ticket/.test(n)) return 'CHEQUE_MEAL';
    if (/online/.test(n)) return 'ONLINE';
    if (/bon|voucher|cadeau/.test(n)) return 'VOUCHER_STORE';
    if (/card|kaart/.test(n)) return 'CARD_UNKNOWN';
    return 'UNKNOWN';
  }
  function getPaymentTypeMap() { var d = load(); return d.paymentTypes || {}; }
  function payTypeFor(name) { var m = getPaymentTypeMap(); return m[name] || guessPayType(name); }
  function setPaymentType(name, payType) { var d = load(); d.paymentTypes = d.paymentTypes || {}; d.paymentTypes[name] = payType || 'UNKNOWN'; save(d); return d.paymentTypes; }

  /* ---------- Toestel-identiteit (fiscaal — lokaal per toestel, NIET gesynct) ---------- */
  function _uuid() { try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID(); } catch (e) {} return 'dev-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); }
  function getDeviceId() { var v = null; try { v = localStorage.getItem('kosmo-device-id'); } catch (e) {} if (!v) { v = _uuid(); try { localStorage.setItem('kosmo-device-id', v); } catch (e) {} } return v; }
  function getTerminalLabel() { try { return localStorage.getItem('kosmo-terminal') || ''; } catch (e) { return ''; } }
  function setTerminalLabel(v) { try { localStorage.setItem('kosmo-terminal', String(v == null ? '' : v).slice(0, 40)); } catch (e) {} return getTerminalLabel(); }

  /* ---------- Kostenplaats-type per tafel (fiscaal — CostCenterType, additief) ---------- */
  var COST_TYPES = ['TABLE', 'CHAIR', 'ROOM', 'CUSTOMER', 'ON_HOLD', 'KIOSK', 'PLATFORM', 'WEBSHOP', 'OTHER'];
  function getTableCostTypes() { try { return getResvSettings().tableCostType || {}; } catch (e) { return {}; } }
  // Kostenplaats-type: expliciete override per tafel, anders afgeleid van de herkomst
  // (gast-QR = KIOSK, personeel/bediening = TABLE).

  // sessie terugzetten (foutief afgerekend): heropent orders + wist betalingen van die sessie
  function restoreSession(sessionId) {
    const all = loadOrders(); var touched = false;
    all.forEach(function (o) { if (o.sessionId === sessionId && o.status === 'closed') { o.status = 'open'; delete o.closedAt; o.lines.forEach(function (l) { l.paidQty = 0; }); touched = true; } });
    if (touched) { saveOrders(all); savePayments(getPayments().filter(function (p) { return p.sessionId !== sessionId; })); }
    return touched;
  }

  /* ---------- Chat (shared between bar/zaal and keuken) ---------- */
  function getChat() { try { return JSON.parse(localStorage.getItem(CKEY) || '[]'); } catch (e) { return []; } }
  function addChat(side, text) {
    text = String(text == null ? '' : text).trim(); if (!text) return null;
    const list = getChat();
    const msg = { id: uid('msg'), side: side === 'keuken' ? 'keuken' : (side === 'system' ? 'system' : 'bar'), text: text.slice(0, 240), at: Date.now() };
    list.push(msg);
    try { localStorage.setItem(CKEY, JSON.stringify(list.slice(-200))); } catch (e) {}
    broadcast('chat'); return msg;
  }
  function clearChat() { try { localStorage.removeItem(CKEY); } catch (e) {} broadcast('chat'); }
  /* ---------- Rekening vragen (klantmenu) + standaardberichten ---------- */
  function getAskBill() { var d = load(); return !!d.askBillEnabled; }
  function setAskBill(v) { const d = load(); d.askBillEnabled = !!v; save(d); return d.askBillEnabled; }
  function requestBill(table) { const d = load(); d.billRequests = d.billRequests || {}; d.billRequests[String(table)] = Date.now(); save(d); return addChat('system', 'Tafel ' + table + ' vraagt de rekening'); }
  function getBillRequests() { var d = load(); return d.billRequests || {}; }
  function hasBillRequest(table) { var r = getBillRequests(); return !!r[String(table)]; }
  function clearBillRequest(table) { const d = load(); if (d.billRequests && d.billRequests[String(table)] != null) { delete d.billRequests[String(table)]; save(d); } }
  function getStdMessages() { var d = load(); return (d.stdMessages && d.stdMessages.length) ? d.stdMessages : ['Komt eraan', 'Nog 5 minuten', 'Is uitverkocht', 'Allergie: opletten', 'Bijna klaar']; }
  function addStdMessage(txt) { const d = load(); d.stdMessages = getStdMessages().slice(); txt = String(txt || '').trim().slice(0, 80); if (txt && d.stdMessages.indexOf(txt) < 0) { d.stdMessages.push(txt); save(d); } return d.stdMessages; }
  function removeStdMessage(txt) { const d = load(); d.stdMessages = getStdMessages().filter(function (m) { return m !== txt; }); save(d); return d.stdMessages; }

  /* subscribe to live changes */
  function subscribe(cb) {
    _subs.push(cb);
    if (bc) {
      bc.addEventListener('message', (e) => cb(e.data && e.data.kind, e.data && e.data.payload));
    }
    window.addEventListener('storage', (e) => {
      if (!e.key) return;
      if (e.key.indexOf('kosmo-basket-') === 0) cb('basket', { key: e.key });
      if (e.key === KEY) cb('data', {});
      if (e.key === OKEY) cb('orders', {});
      if (e.key === CKEY) cb('chat', {});
      if (e.key === TKEY) cb('tables', {});
      if (e.key === AKEY) cb('tables', {});
      if (e.key === TODOKEY) cb('todos', {});
      if (e.key === EXTRAKEY) cb('extrahours', {});
    });
  }

  function reset() { try { localStorage.removeItem(KEY); } catch (e) {} broadcast('data'); }

  /* ---------- Gebruikers, rollen & sessie (KosmoKrew) ---------- */
  const ROLE_RANK = { visitor: 1, help: 1, staff: 2, management: 3 }; // visitor = bezoeker (v0.117.0): kijkt zoals help, schrijft niets
  function roleRank(r) { return ROLE_RANK[r] || 1; }
  // Hernoemde tegels behouden hun eerder ingestelde toegangsniveau (sleutel = module::tegelnaam).
  const LEGACY_TILE_KEYS = { 'menu::Recepten': 'menu::F&B rekenmodule', 'menu::F&B cost analyse': 'menu::Foodcost', 'keuken::Voorbereidende fiche': 'keuken::Voorbereiding' };
  function _clearanceIngesteld(key) { var d = load(); if (d.clearance && d.clearance[key]) return d.clearance[key]; var old = LEGACY_TILE_KEYS[key]; if (old && d.clearance && d.clearance[old]) return d.clearance[old]; return DEFAULT_CLEARANCE[key] || 'help'; }
  // Tegels die afgeschermde gegevens tonen of bewerken (js/db-toegang.js), kunnen niet lager staan. Rapporten (omzet, btw, balans,
  // bedrijfsmodel, KPI, cashflow, rentabiliteit) werken voor staff met de cijferspiegel en zijn vrij in te stellen.
  var CLEARANCE_MIN = {
    'business::Dagomzet': 'management', 'business::Boekhouding': 'management', 'business::Lonen & afbetalingen': 'management', 'business::Kostengroepen': 'management',
    'business::Documentenarchief': 'management', 'marketing::Gastenbestand': 'staff',
    // Inkoopcontrole (v0.135.0): leest de documenten, die enkel management krijgt.
    'housekeeping::Bonnen zonder tegenhanger': 'management', 'housekeeping::Nieuwe ingrediënten uit facturen': 'management',
    // Extra modules: wie de gegevens niet krijgt (js/db-toegang.js), kan de tegel niet openen.
    'kosmokrew::Fooienverdeling': 'management', 'business::Fooienverdeling': 'management', 'kosmokrew::Prestaties naar Liantis': 'management', 'business::Prestaties naar Liantis': 'management',
    'business::Bankkoppeling': 'management', 'business::Afwijkingsmeldingen': 'management',
    'barzaal::Betaalterminal': 'staff', 'barzaal::Betalen aan tafel (QR)': 'staff', 'barzaal::Voorschotten & no-shows': 'staff', 'marketing::Voorschotten & no-shows': 'staff', 'barzaal::Cadeaubonnen': 'staff', 'marketing::Cadeaubonnen': 'staff', 'business::Cadeaubonnen': 'staff',
    'barzaal::Loyaliteit': 'staff', 'marketing::Loyaliteit': 'staff', 'marketing::Reviews': 'staff', 'marketing::Nieuwsbrief': 'staff', 'barzaal::Groepen & events': 'staff', 'marketing::Groepen & events': 'staff'
  };
  function clearanceMinimum(key) { return CLEARANCE_MIN[key] || null; }
  function getClearance(key) { var v = _clearanceIngesteld(key), m = CLEARANCE_MIN[key]; return m && roleRank(v) < roleRank(m) ? m : v; }
  function setClearance(key, level) { const d = load(); d.clearance = d.clearance || {}; d.clearance[key] = level; save(d); return level; }
  /* ---------- Praten met de Kissing Karrots Server ----------
     Eén plek waar alle /auth/- en /crew/-aanvragen langsgaan, zodat de
     foutafhandeling en de cookie-instelling niet op tien plaatsen herhaald
     staan. `credentials: same-origin` is nodig: zonder die regel stuurt de
     browser de sessiecookie niet mee en lijkt elke aanvraag onaangemeld. */
  function api(method, path, body) {
    var opts = { method: method, credentials: 'same-origin', headers: {}, cache: 'no-store' };
    if (body !== undefined) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
    return fetch(path, opts).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (j) {
        if (!res.ok) { var e = new Error((j && j.error) || ('server gaf ' + res.status)); e.status = res.status; throw e; }
        return j;
      });
    });
  }

  /* ---------- Teamleden ----------
     De echte lijst woont op de Kissing Karrots Server. Hier houden we een kopie zonder
     wachtwoorden, zodat de schermen meteen getekend kunnen worden en blijven
     werken als de pc even wegvalt. getUsers() blijft dus gewoon een lijst
     teruggeven, net als voorheen — enkel de bron is veranderd. */
  function loadRoster() { try { return JSON.parse(localStorage.getItem(ROSTER_KEY) || '[]'); } catch (e) { return []; } }
  function saveRoster(list) { try { localStorage.setItem(ROSTER_KEY, JSON.stringify(list || [])); } catch (e) {} }
  function getUsers() { return loadRoster(); }

  // Haalt de lijst op bij de pc en ververst de lokale kopie. Lukt dat niet
  // (pc plat, geen netwerk), dan blijft de vorige kopie staan.
  function refreshUsers() {
    return api('GET', '/crew/roster').then(function (r) {
      saveRoster(r.users || []); broadcast('data');
      return r.users || [];
    }).catch(function () { return loadRoster(); });
  }

  // Namen voor het aanmeldscherm. Deze mag zónder sessie: het keuzelijstje
  // moet ingevuld zijn vóór iemand aangemeld is.
  function loginNames() {
    return api('GET', '/auth/names').then(function (r) { return (r.users || []).map(function (u) { return u.name; }); })
      .catch(function () { return getUsers().filter(function (u) { return u.hasPass !== false; }).map(function (u) { return u.name; }); });
  }

  /* ---------- Aanmelden ----------
     Geeft een belofte terug: {id,name,role} bij een juist wachtwoord, null
     bij een verkeerd. Gooit een fout als de pc onbereikbaar is — dat is iets
     anders dan een verkeerd wachtwoord en verdient een andere boodschap. */
  function authUser(name, pass) {
    return api('POST', '/auth/login', { name: name, pass: pass })
      .then(function (r) { setSession(r.user); refreshUsers(); try { if (window.KosmoSync && window.KosmoSync.restart) window.KosmoSync.restart(); } catch (e) {} return r.user; })
      .catch(function (e) { if (e.status === 401) return null; throw e; });
  }

  // Wie ben ik volgens de pc? Bij het opstarten opgevraagd, zodat een
  // ingetrokken sessie of een gewijzigde rol meteen doorwerkt.
  function whoAmI() {
    var voor = getSession();
    return api('GET', '/auth/me').then(function (r) {
      setSession(r.user);
      // Andere rol dan bij de vorige start: de sync opnieuw, zodat wat afgeschermd is meteen verdwijnt of verschijnt.
      if (voor && r.user && voor.role !== r.user.role) { try { if (window.KosmoSync && window.KosmoSync.restart) window.KosmoSync.restart(); } catch (e) {} }
      return r.user;
    })
      .catch(function (e) { if (e.status === 401) { clearSession(); try { if (window.KosmoSync && window.KosmoSync.opruimen) window.KosmoSync.opruimen(); } catch (x) {} return null; } return getSession(); });
  }

  function addUser(patch) {
    return api('POST', '/crew/user', patch || {}).then(function (r) { return refreshUsers().then(function () { return r.user; }); });
  }
  function updateUser(id, patch) {
    return api('POST', '/crew/user', Object.assign({ id: id }, patch || {})).then(function () { return refreshUsers(); });
  }
  function removeUser(id) {
    return api('DELETE', '/crew/user/' + encodeURIComponent(id)).then(function () { return refreshUsers(); });
  }
  function logoutServer() {
    return api('POST', '/auth/logout', {}).catch(function () {}).then(function () { clearSession(); saveRoster([]); try { if (window.KosmoSync && window.KosmoSync.opruimen) return window.KosmoSync.opruimen(); } catch (e) {} });
  }
  // sessie = wie op DIT toestel is ingelogd (niet gesynct)
  function getSession() { try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch (e) { return null; } }
  function setSession(u) { try { localStorage.setItem(SESSION_KEY, JSON.stringify(u)); } catch (e) {} }
  function clearSession() { try { localStorage.removeItem(SESSION_KEY); } catch (e) {} }

  /* ---------- Eigen profiel (v0.61.0) ----------
     Naam, contact, adres, bankrekeningnummer — net als het wachtwoord, leven
     die enkel op de Kissing Karrots Server (kosmo-crew.json), nooit in de gesynchroniseerde
     menukaart-data. Elk toestel vraagt ze op i.p.v. ze lokaal te bewaren.
     Bijwerken loopt gewoon via het bestaande updateUser(id, patch) — dezelfde
     /crew/user-route aanvaardt deze velden nu ook voor de eigenaar zelf. */
  function getProfile(id) {
    return api('GET', '/crew/profile' + (id ? ('?id=' + encodeURIComponent(id)) : '')).then(function (r) { return r.profile; });
  }

  /* ---------- To-do voor management (v0.61.0) ----------
     Gewone gesynchroniseerde lijst (geen geheimen zoals bij kosmo-crew.json).
     Gevuld vanaf twee kanten: de server (bij een zelfbedieningswijziging aan
     iemands profiel) en hier (bij ingevoerde extra uren). Wegklikken = verwijderen. */
  var TODOKEY = 'kosmo-todos-v1';
  function loadTodos() { try { return JSON.parse(localStorage.getItem(TODOKEY) || '[]'); } catch (e) { return []; } }
  function saveTodos(list) { try { localStorage.setItem(TODOKEY, JSON.stringify(list)); } catch (e) {} broadcast('todos'); try { emit('todos'); } catch (e) {} }
  function getTodos() { return loadTodos().filter(function (t) { return !t.weg; }).sort(function (a, b) { return (b.at || 0) - (a.at || 0); }); }
  function addTodo(name, message) { var list = loadTodos(); list.push({ id: uid('td'), name: name, message: message, at: Date.now() }); saveTodos(list); return list; }
  // Een to-do met een sleutel (v0.135.0, uit de inkoop) wordt bij wegklikken verborgen tot zijn stand verandert;
  // anders zou de volgende ronde hem meteen terugzetten. De rest wordt gewoon verwijderd.
  function dismissTodo(id) {
    var list = loadTodos(), t = list.find(function (x) { return x.id === id; });
    if (t && t.sleutel) { t.weg = true; t.wegStand = t.stand; saveTodos(list); }
    else saveTodos(list.filter(function (x) { return x.id !== id; }));
  }
  /* ---------- To-do's en berichten per persoon (v0.112.0) ----------
     Woont op de Kissing Karrots Server (server-inbox.js), niet in de sync: elk toestel krijgt enkel de post van wie er
     aangemeld is. Hier enkel een laatste kopie in het geheugen (niet in localStorage: een gedeeld toestel bewaart niets). */
  var _inbox = { items: [], verstuurd: [], team: [], at: 0 };
  function getTeamPost() { return _inbox; }
  function teamPostOpen() { return _inbox.items.filter(function (i) { return !i.klaar; }).length; }
  function loadTeamPost() { return api('GET', '/crew/inbox').then(function (j) { _inbox = { items: j.items || [], verstuurd: j.verstuurd || [], team: j.team || [], at: Date.now() }; try { emit('inbox'); } catch (e) {} return _inbox; }); }
  function clearTeamPost() { _inbox = { items: [], verstuurd: [], team: [], at: 0 }; try { emit('inbox'); } catch (e) {} }
  function sendTeamPost(soort, aan, tekst, tegen) { return api('POST', '/crew/inbox', { soort: soort, aan: aan, tekst: tekst, tegen: tegen || '' }).then(function (r) { return loadTeamPost().then(function () { return r; }); }); }
  function setTeamPostDone(id, klaar) { return api('POST', '/crew/inbox/' + encodeURIComponent(id) + '/klaar', { klaar: klaar !== false }).then(loadTeamPost); }
  function removeTeamPost(id) { return api('DELETE', '/crew/inbox/' + encodeURIComponent(id)).then(loadTeamPost); }

  /* ---------- Extra uren (buiten het rooster) (v0.61.0) ----------
     Uren buiten het rooster (KosmoKrew › Roosters, v0.113.0): wat iemand extra werkte, zelf ingegeven.
     Elke invoer meldt zichzelf automatisch bij de to-do van management. */
  var EXTRAKEY = 'kosmo-extrauren-v1';
  function loadExtraHours() { try { return JSON.parse(localStorage.getItem(EXTRAKEY) || '[]'); } catch (e) { return []; } }
  function saveExtraHours(list) { try { localStorage.setItem(EXTRAKEY, JSON.stringify(list)); } catch (e) {} broadcast('extrahours'); try { emit('extrahours'); } catch (e) {} }
  function getExtraHours(forUid) { var l = loadExtraHours().slice().sort(function (a, b) { return (b.at || 0) - (a.at || 0); }); return forUid ? l.filter(function (e) { return e.uid === forUid; }) : l; }
  function addExtraHours(patch) {
    patch = patch || {};
    var rec = { id: uid('eh'), uid: patch.uid, name: patch.name || '', date: patch.date || todayStr(), hours: Number(patch.hours) || 0, reason: String(patch.reason || '').slice(0, 200), at: Date.now() };
    var list = loadExtraHours(); list.push(rec); saveExtraHours(list);
    addTodo(rec.name, rec.name + ' gaf extra uren in: ' + rec.hours + 'u op ' + rec.date + (rec.reason ? (' — ' + rec.reason) : '') + '.');
    return rec;
  }
  function removeExtraHours(id) { saveExtraHours(loadExtraHours().filter(function (e) { return e.id !== id; })); }
  function extraHoursSum(forUid, from, to) {
    return getExtraHours(forUid).filter(function (e) { return (!from || e.date >= from) && (!to || e.date <= to); })
      .reduce(function (s, e) { return s + (Number(e.hours) || 0); }, 0);
  }
  function yearRange() { var y = businessDate(Date.now()).slice(0, 4); return { start: y + '-01-01', end: y + '-12-31' }; }

  /* ---------- Public API ---------- */
  /* ================= CRM: gastendatabase (Zenchef-compatibel) =================
     E-mail is de unieke sleutel (zoals Zenchef). Import uit Zenchef-CSV
     (Title, Last Name, First Name, Email, Phone, Language + extra's). */
  var GKEY = 'kosmo-guests-v1';
  function loadGuests() { try { return JSON.parse(localStorage.getItem(GKEY) || '[]'); } catch (e) { return []; } }
  function saveGuests(list) { try { localStorage.setItem(GKEY, JSON.stringify(list)); } catch (e) {} broadcast('guests'); }
  function normEmail(e) { return String(e || '').trim().toLowerCase(); }
  function normLang(l) { return String(l || '').trim().toUpperCase().slice(0, 2) || 'NL'; }
  function _uniq(a) { var s = {}, o = []; (a || []).forEach(function (x) { x = String(x).trim(); if (x && !s[x]) { s[x] = 1; o.push(x); } }); return o; }
  function getGuests() { return loadGuests(); }
  function getGuest(id) { return loadGuests().find(function (g) { return g.id === id; }); }
  function _blankGuest() {
    return { id: uid('g'), title: '', firstName: '', lastName: '', email: '', phone: '', lang: 'NL',
      birthday: '', allergies: [], prefs: '', notes: '', tags: [], vip: false, blacklist: false,
      visits: 0, noShows: 0, totalSpend: 0, lastVisit: '', source: 'manueel', createdAt: Date.now() };
  }
  function _mergeGuest(existing, patch) {
    // Bij import: bestaande gegevens behouden; enkel lege velden aanvullen, lijsten samenvoegen, tellers max.
    var out = {};
    Object.keys(patch).forEach(function (k) {
      var v = patch[k];
      if (v === '' || v == null) return;
      if (Array.isArray(v)) { out[k] = _uniq((existing[k] || []).concat(v)); return; }
      if (k === 'visits' || k === 'noShows') { out[k] = Math.max(Number(existing[k] || 0), Number(v || 0)); return; }
      if (k === 'source') { out[k] = existing[k] || v; return; }
      var cur = existing[k];
      if (cur === '' || cur == null || cur === false) out[k] = v; // enkel aanvullen als leeg
    });
    return out;
  }
  function upsertGuest(patch) {
    var d = loadGuests();
    var email = normEmail(patch.email);
    var existing = email ? d.find(function (g) { return normEmail(g.email) === email; }) : null;
    if (existing) { Object.assign(existing, _mergeGuest(existing, patch)); saveGuests(d); return { guest: existing, created: false }; }
    var g = Object.assign(_blankGuest(), patch); if (!g.id) g.id = uid('g'); if (g.lang) g.lang = normLang(g.lang); d.push(g); saveGuests(d); return { guest: g, created: true };
  }
  function addGuestManual(patch) { return upsertGuest(Object.assign({ source: 'manueel' }, patch || {})).guest; }
  function updateGuest(id, patch) { var d = loadGuests(); var g = d.find(function (x) { return x.id === id; }); if (g) { if (patch.lang) patch.lang = normLang(patch.lang); Object.assign(g, patch); saveGuests(d); } return g; }
  function removeGuest(id) { saveGuests(loadGuests().filter(function (g) { return g.id !== id; })); }

  /* ---------- Leveranciers, inkoop, documenten, kasboek, btw, afbetalingen, bedrijfsmodel, kostengroepen, matching ----------
     Verhuisd naar js/data-boekhouding.js (v0.118.0), zodat dit bestand over de werking van de zaak gaat en het boekhoudgedeelte
     apart te lezen is. De kern roept er maar één functie uit aan: spendByCategory (hieronder doorgegeven). */
  function spendByCategory(from, to) { var B = window.KosmoData && window.KosmoData._boekhouding; return B ? B.spendByCategory(from, to) : {}; }
  function _lastDay(month) { var y = +month.slice(0, 4), m = +month.slice(5, 7); return month + '-' + String(new Date(y, m, 0).getDate()).padStart(2, '0'); }
  /* ---------- Inkomsten: werkelijke omzet per dag uit het inkomstenoverzicht (zie tools/import-inkomsten.js) ----------
     De kassa in het OS draait nog niet voor de hele zaak; het overzicht bevat de echte dagomzet (netto, bruto, btw per tarief,
     klanten). Een dag waarop het OS zélf afrekeningen heeft, telt NIET uit het overzicht (anders dubbel). Daarnaast staat hier
     de aftrekbare btw op uitgaven uit de spreadsheet (vatIn, januari–april), voor zover er nog geen facturen in het OS zijn. */
  var INCOMEKEY = 'kosmo-income-v1';
  function loadIncome() { try { var o = JSON.parse(localStorage.getItem(INCOMEKEY) || 'null'); if (o && o.days) { if (!o.vatIn) o.vatIn = []; if (!o.vatPaid) o.vatPaid = []; return o; } } catch (e) {} return { days: [], vatIn: [], vatPaid: [] }; }
  function saveIncome(o) { try { localStorage.setItem(INCOMEKEY, JSON.stringify(o)); } catch (e) {} broadcast('income'); try { emit('data'); } catch (e) {} }
  function getIncome() { return loadIncome(); }
  function importIncome(payload) {
    var cur = loadIncome(), by = {}, vb = {};
    cur.days.forEach(function (d) { by[d.date] = d; }); ((payload && payload.days) || []).forEach(function (d) { if (d && d.date) by[d.date] = d; });
    cur.days = Object.keys(by).sort().map(function (k) { return by[k]; });
    cur.vatIn.forEach(function (v) { vb[v.month] = v; }); ((payload && payload.vatIn) || []).forEach(function (v) { if (v && v.month) vb[v.month] = v; });
    cur.vatIn = Object.keys(vb).sort().map(function (k) { return vb[k]; });
    var pb = {}; cur.vatPaid.forEach(function (v) { pb[v.month] = v; }); ((payload && payload.vatPaid) || []).forEach(function (v) { if (v && v.month) pb[v.month] = v; });
    cur.vatPaid = Object.keys(pb).sort().map(function (k) { return pb[k]; });
    saveIncome(cur); return { days: cur.days.length, vatIn: cur.vatIn.length, vatPaid: cur.vatPaid.length };
  }
  // Btw die al aan de fiscus betaald is (maandbedragen uit de spreadsheet); een maand telt mee zodra ze de gekozen periode raakt.
  function vatPaidSummary(from, to) {
    var out = { total: 0, months: [] };
    loadIncome().vatPaid.forEach(function (v) {
      if (from && _lastDay(v.month) < from) return; if (to && v.month + '-01' > to) return;
      out.total += v.amount; out.months.push({ month: v.month, amount: v.amount });
    });
    out.total = round2(out.total); return out;
  }
  /* (afbetalingen, bedrijfsmodel, kostengroepen en matching: zie js/data-boekhouding.js) */
  // CSV-parser (scheidingsteken ; of , automatisch; quotes ondersteund; BOM verwijderd)
  function parseCSV(text) {
    text = String(text || '').replace(/^﻿/, '');
    var firstLine = text.split(/\r?\n/)[0] || '';
    var delim = (firstLine.split(';').length > firstLine.split(',').length) ? ';' : ',';
    var rows = [], row = [], cur = '', i = 0, inQ = false;
    while (i < text.length) {
      var ch = text[i];
      if (inQ) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else inQ = false; } else cur += ch; }
      else { if (ch === '"') inQ = true; else if (ch === delim) { row.push(cur); cur = ''; } else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; } else if (ch === '\r') {} else cur += ch; }
      i++;
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (c) { return String(c).trim() !== ''; }); });
  }
  var GUEST_HEADERS = {
    title: ['title', 'titel', 'civility', 'civilite', 'civilité', 'aanhef'],
    firstName: ['first name', 'firstname', 'prenom', 'prénom', 'voornaam'],
    lastName: ['last name', 'lastname', 'nom', 'achternaam', 'naam', 'surname'],
    email: ['email', 'e-mail', 'e mail', 'mail', 'courriel'],
    phone: ['phone', 'telephone', 'téléphone', 'tel', 'gsm', 'mobile', 'telefoon', 'numero'],
    lang: ['language', 'langue', 'taal', 'lang', 'langage'],
    birthday: ['birthday', 'birthdate', 'date of birth', 'anniversaire', 'verjaardag', 'geboortedatum', 'dob'],
    allergies: ['allergies', 'allergies tags', 'allergens', 'allergieen', 'allergieën', 'dietary', 'dieet', 'regime'],
    prefs: ['allergies notes', 'preferences', 'voorkeuren', 'prefs'],
    notes: ['notes', 'note', 'guest notes', 'notities', 'opmerkingen', 'remarks', 'commentaire'],
    tags: ['tags', 'guest tags', 'labels', 'segments', 'segment'],
    visits: ['visits', 'covers', 'bezoeken', 'visites', 'nb visites'],
    noShows: ['has no show', 'no show', 'no-show'],
    blacklist: ['is blacklisted', 'blacklisted', 'zwarte lijst'],
    vip: ['vip']
  };
  function _mapHeader(h) {
    var k = String(h || '').trim().toLowerCase();
    for (var c in GUEST_HEADERS) { if (GUEST_HEADERS[c].indexOf(k) >= 0) return c; }
    // Zenchef: "Bookings number <restaurantnaam>" = aantal bezoeken
    if (k.indexOf('bookings number') === 0 || k.indexOf('booking number') === 0) return 'visits';
    return null;
  }
  function importGuests(text) {
    var rows = parseCSV(text);
    if (rows.length < 2) return { added: 0, updated: 0, skipped: 0, total: 0, error: 'Geen gegevens gevonden (of enkel een kopregel).' };
    var headers = rows[0].map(_mapHeader);
    if (headers.every(function (h) { return !h; })) return { added: 0, updated: 0, skipped: 0, total: 0, error: 'Geen herkenbare kolommen (verwacht o.a. Email, First/Last Name, Phone).' };
    var res = { added: 0, updated: 0, skipped: 0, total: 0 };
    // In-memory verwerking: één keer laden, alles mergen, één keer bewaren.
    // (Vroeger riep dit upsertGuest per rij -> load+save per rij = O(n^2), wat bij
    //  grote exports zoals 2000+ gasten de browser deed vastlopen.)
    var list = loadGuests();
    var byEmail = {};
    list.forEach(function (gst) { var e = normEmail(gst.email); if (e) byEmail[e] = gst; });
    for (var r = 1; r < rows.length; r++) {
      var cells = rows[r], patch = {};
      headers.forEach(function (c, ci) { if (!c) return; var v = (cells[ci] || '').trim(); if (!v) return;
        if (c === 'allergies' || c === 'tags') patch[c] = v.split(/[;,/|]/).map(function (x) { return x.trim(); }).filter(Boolean);
        else if (c === 'vip' || c === 'blacklist') patch[c] = /^(1|true|ja|yes|oui|x)$/i.test(v);
        else if (c === 'noShows') patch.noShows = /^(1|true|ja|yes|oui|x)$/i.test(v) ? 1 : 0;
        else if (c === 'visits') patch.visits = parseInt(v, 10) || 0;
        else patch[c] = v; });
      res.total++;
      if (!patch.email && !patch.phone && !patch.lastName) { res.skipped++; continue; }
      patch.source = 'zenchef-import';
      var em = normEmail(patch.email);
      var existing = em ? byEmail[em] : null;
      if (existing) { Object.assign(existing, _mergeGuest(existing, patch)); res.updated++; }
      else {
        var ng = Object.assign(_blankGuest(), patch);
        if (!ng.id) ng.id = uid('g');
        if (ng.lang) ng.lang = normLang(ng.lang);
        list.push(ng); if (em) byEmail[em] = ng; res.added++;
      }
    }
    saveGuests(list);
    return res;
  }
  function _birthMonth(b) { if (!b) return 0; b = String(b).trim();
    var iso = b.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/); if (iso) return parseInt(iso[2], 10);
    var eu = b.match(/^(\d{1,2})[-\/.](\d{1,2})/); if (eu) { var a = parseInt(eu[1], 10), m = parseInt(eu[2], 10); return a > 12 ? a % 12 || 0 : m; }
    return 0; }
  // ---- Tags-taxonomie + code-vertaling (Zenchef-codes -> leesbare labels) ----
  var TAG_LABELS = {
    'tags.new': 'Nieuw', 'tags.recent': 'Recent', 'tags.regular': 'Regelmatig', 'tags.frequent': 'Zeer regelmatig',
    'tags.loyal': 'Vaste gast', 'tags.reactivate': 'Te reactiveren', 'tags.lost': 'Verloren',
    'tags.vip': 'VIP', 'tags.blacklist': 'Zwarte lijst', 'tags.noshow': 'No-show', 'tags.no_show': 'No-show'
  };
  // codes die de frequentie/segmentatie dupliceren — niet apart tonen (onze eigen labels dekken dit)
  var TAG_FREQ_HIDDEN = /^tags\.(new|recent|regular|frequent|loyal|reactivate|lost)$/i;
  function tagLabel(code) {
    if (!code) return '';
    var k = String(code).trim();
    if (TAG_LABELS[k]) return TAG_LABELS[k];
    var s = k.replace(/^tags?\./i, '').replace(/[._-]+/g, ' ').trim();
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : k;
  }
  function isFreqTag(code) { return TAG_FREQ_HIDDEN.test(String(code || '')); }
  // Curated taxonomie (voor een latere tag-picker; gebaseerd op de Zenchef-categorieën)
  var TAG_TAXONOMY = {
    event: { label: 'Type gebeurtenis', tags: ['Verjaardag', 'Huwelijksverjaardag', 'Jubileum', 'Zakelijk', 'Romantisch diner', 'Familie-evenement', 'Groep', 'Bruiloft', 'Pers', 'Privé-evenement', 'Laatste minuut'] },
    diet: { label: 'Allergieën & dieet', tags: ['Gluten', 'Lactose', 'Noten', 'Pinda\'s', 'Schaaldieren', 'Vis', 'Eieren', 'Soja', 'Vegetarisch', 'Veganistisch', 'Pescotarisch'] },
    vip: { label: 'VIP / relatie', tags: ['Vrienden & familie', 'VIP 1', 'VIP 2', 'VIP 3', 'VIP 4', 'VIP 5'] },
    warning: { label: 'Waarschuwing', tags: ['Zwarte lijst', 'No-show'] }
  };

  // ---- Gast-segmentatie (Zenchef-achtige frequentielabels) ----
  // Afgeleid uit visits (bezoeken) + lastVisit (recency). lastVisit ontbreekt bij
  // Zenchef-import; dan wordt puur op bezoekaantal gesegmenteerd. Drempels zijn tunebaar.
  var FREQ_LABELS = { nieuw: 'Nieuw', recent: 'Recent', regelmatig: 'Regelmatig', vaste_gast: 'Vaste gast', te_reactiveren: 'Te reactiveren', verloren: 'Verloren' };
  function _daysSince(dstr) { if (!dstr) return null; var t = Date.parse(String(dstr).slice(0, 10)); if (isNaN(t)) return null; return Math.floor((Date.now() - t) / 86400000); }
  function guestFrequency(g) {
    g = g || {}; var v = Number(g.visits || 0); var d = _daysSince(g.lastVisit);
    if (d != null) { if (d > 365 && v >= 1) return 'verloren'; if (d > 180 && v >= 3) return 'te_reactiveren'; }
    if (v <= 1) return 'nieuw';
    if (v >= 10) return 'vaste_gast';
    if (v >= 4) return 'regelmatig';
    return 'recent';
  }
  function filterGuests(f) {
    f = f || {}; var q = (f.search || '').trim().toLowerCase(), mon = f.birthdayMonth || 0;
    return loadGuests().filter(function (g) {
      if (f.vip && !g.vip) return false;
      if (f.blacklist && !g.blacklist) return false;
      if (f.frequency && guestFrequency(g) !== f.frequency) return false;
      if (f.lang && normLang(g.lang) !== normLang(f.lang)) return false;
      if (f.allergy && !(g.allergies || []).some(function (a) { return a.toLowerCase().indexOf(String(f.allergy).toLowerCase()) >= 0; })) return false;
      if (f.minVisits && (g.visits || 0) < f.minVisits) return false;
      if (f.tag && !(g.tags || []).some(function (t) { return t.toLowerCase() === String(f.tag).toLowerCase(); })) return false;
      if (mon && _birthMonth(g.birthday) !== mon) return false;
      if (q) { var hay = ((g.firstName || '') + ' ' + (g.lastName || '') + ' ' + (g.email || '') + ' ' + (g.phone || '')).toLowerCase(); if (hay.indexOf(q) < 0) return false; }
      return true;
    });
  }
  function guestStats() {
    var g = loadGuests(); var vip = 0, withMail = 0, withPhone = 0, black = 0, freq = {};
    g.forEach(function (x) { if (x.vip) vip++; if (x.email) withMail++; if (x.phone) withPhone++; if (x.blacklist) black++; var f = guestFrequency(x); freq[f] = (freq[f] || 0) + 1; });
    return { total: g.length, vip: vip, withEmail: withMail, withPhone: withPhone, blacklist: black, freq: freq };
  }
  function exportGuestsCSV(list) {
    list = list || loadGuests();
    var head = ['Title', 'Last Name', 'First Name', 'Email', 'Phone', 'Language'];
    var lines = [head.join(',')];
    list.forEach(function (g) {
      var row = [g.title || '', g.lastName || '', g.firstName || '', g.email || '', g.phone || '', normLang(g.lang)];
      lines.push(row.map(function (c) { c = String(c); return /[",\n;]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(','));
    });
    return lines.join('\r\n');
  }

  /* ================= KosmoTable: reserveringsmotor (Zenchef-breed) ================= */
  var RSVKEY = 'kosmo-reservations-v1', RSVSKEY = 'kosmo-resv-settings-v1';
  var RESV_DEFAULTS = {
    // NB (Fase 0-consolidatie): het oude lunch/diner "services"-model is verwijderd.
    // Beschikbaarheid en openingsuren komen volledig uit "weekdays" (+ dayOverrides).
    closedDates: [],                     // ['2026-12-25', ...]
    rooms: ['Zaal', 'Terras', 'Toog'],   // zones/ruimtes
    defaultDuration: 90,                 // fallback-seatingduur als durationByCovers niets geeft
    durationByCovers: [{ max: 2, min: 75 }, { max: 4, min: 90 }, { max: 8, min: 120 }, { max: 999, min: 150 }],
    capacityPerService: 40,
    maxAdvanceDays: 120,
    // ----- Tafelconfiguratie (bewerkbaar in Reserveringen) -----
    seatingDuration: 150,                // standaard bezettingsduur per tafel (min) = 2u30
    doubleSeating: false,                // dubbele bezetting per avond (2 turns) aan/uit
    defaultSeats: 2,                     // 1 tafel = 2 gasten, tenzij hieronder anders
    tableSeats: {                        // typische zitplaatsen per tafel
      '2': 1, '3': 1, '4': 1, '5': 1, '6': 1,   // bar: 1 stoel per nummer
      '23': 12,                                   // grote groepstafel
    },
    tableSeatsMax: { '10': 3, '23': 12 },// uitzonderlijke max (bv. tafel 10 kan 3, tafel 23 tot 12)
    tableZones: {},                      // { tafelnummer: zone } — tafel-naar-zone toewijzing (gedeeld)
    tablePos: {},                        // { tafelnummer: {x,y} } — positie op de plattegrond in % (0-100), gedeeld
    freeTables: [],                      // tafels waarvan rekeningen op €0 komen (crew/personeel eet gratis)
    noReserve: [],                       // tafels die NIET online/automatisch reserveerbaar zijn (toog/terras soms, crew altijd)
    tableGroups: [                       // samenvoegbare (aaneengesloten) reeksen
      ['7', '8', '9', '10'],
      ['11', '12', '13', '14', '15'],
      ['16', '17', '18', '19', '20'],
      ['21', '22', '23'],
    ],
    // Automatische tafeltoekenning: per groepsgrootte een voorkeurs-tafelvolgorde.
    // De eerste vrije, reserveerbare tafel die past wordt gekozen; past er geen enkele
    // tafel, dan wordt aaneengesloten samengevoegd binnen tableGroups. Geïsoleerde
    // tafel 1 (naast de bar/vitrine) staat bewust achteraan.
    assignRules: [
      { maxPax: 2, order: ['7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '25', '26', '2', '3', '4', '5', '6', '1'] },
      { maxPax: 6, order: ['16', '17', '18', '19', '20', '11', '12', '13', '14', '15', '7', '8', '9', '10', '21', '22', '23'] },
      { maxPax: 99, order: ['24', '23', '22', '21', '16', '17', '18', '19', '20', '11', '12', '13', '14', '15'] }
    ],
    // ----- Per-weekdag reserveringsconfig -----
    slotInterval: 15,                    // interval van tijdkeuzes (min): 5/10/15/...
    // mode: 'hourly' = open per uur (flexibel, 1 bezetting) | 'double' = vaste seatingmomenten (2 turns)
    weekdays: {                          // 0=zo,1=ma,...6=za
      0: { open: false },
      1: { open: false },
      2: { open: true, openTime: '17:30', kitchenClose: '21:00', venueClose: '23:00', mode: 'hourly' },
      3: { open: true, openTime: '17:30', kitchenClose: '21:00', venueClose: '23:00', mode: 'hourly' },
      4: { open: true, openTime: '17:30', kitchenClose: '21:00', venueClose: '23:00', mode: 'hourly' },
      5: { open: true, openTime: '17:30', kitchenClose: '21:30', venueClose: '00:00', mode: 'double' },
      6: { open: true, openTime: '17:30', kitchenClose: '21:30', venueClose: '00:00', mode: 'double' },
    },
    dayOverrides: {},                    // { 'YYYY-MM-DD': { mode:'hourly'|'double', closed:true, openTime, kitchenClose, venueClose } }
    resvClosedDates: [],                 // dagen waarvoor NIEUWE reservaties gestopt zijn (bestaande blijven)
    depositEnabled: false,
    depositThresholdCovers: 10,           // eigenaar 12/11/2026: voorschot als optie bij groepen vanaf 10 personen
    depositPerPerson: 15,                 // enkel bij depositMode 'pp'
    depositMode: 'pct',                   // eigenaar 12/11/2026: standaard 50 % van de verwachte rekening ('pct') of een vast bedrag per persoon ('pp')
    depositPct: 50,
    depositSpendPP: 0,                    // verwachte besteding per persoon (incl. btw); 0 = gemiddelde uit de omzet van de laatste 90 dagen
    depositCancelHours: 2,                // kosteloos annuleren tot zoveel uur vooraf; later of niet komen = voorschot ingehouden
    occasions: ['Verjaardag', 'Jubileum', 'Zakelijk', 'Romantisch', 'Groep', 'Andere'],
    sources: ['telefoon', 'walk-in', 'widget', 'web', 'google', 'instagram', 'e-mail'],
    prescribers: [],
    confirmTemplate: 'Beste {naam}, je reservatie bij Kosmopoliet op {datum} om {tijd} voor {aantal} personen is bevestigd. Tot dan!',
    reminderTemplate: 'Beste {naam}, kleine herinnering aan je reservatie morgen om {tijd} voor {aantal} personen. Tot snel bij Kosmopoliet!',
  };
  var RESV_STATUSES = ['pending', 'confirmed', 'seated', 'completed', 'no_show', 'cancelled', 'waitlist'];
  function loadResvSettings() { try { return JSON.parse(localStorage.getItem(RSVSKEY) || 'null'); } catch (e) { return null; } }
  function getResvSettings() { var d = loadResvSettings(); if (!d) { d = clone(RESV_DEFAULTS); localStorage.setItem(RSVSKEY, JSON.stringify(d)); } var out = clone(RESV_DEFAULTS); Object.keys(d).forEach(function (k) { out[k] = d[k]; });
    // v0.116.1: het oude standaardgetal 8 stond nooit op het scherm en het voorschot stond nooit aan; de nieuwe standaard is 10 (eigenaar 12/11/2026).
    if (!out.depositEnabled && out.depositThresholdCovers === 8) out.depositThresholdCovers = 10;
    return out; }
  function saveResvSettings(patch) { var d = getResvSettings(); Object.assign(d, patch || {}); localStorage.setItem(RSVSKEY, JSON.stringify(d)); broadcast('resvsettings'); return d; }

  function _toMin(hhmm) { var m = String(hhmm || '').match(/(\d{1,2}):(\d{2})/); return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : 0; }
  function _fromMin(n) { n = ((n % 1440) + 1440) % 1440; var h = Math.floor(n / 60), m = n % 60; return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m; }
  function durationForCovers(covers) { var st = getResvSettings(); covers = parseInt(covers, 10) || 1; var r = (st.durationByCovers || []).find(function (x) { return covers <= x.max; }); return r ? r.min : st.defaultDuration; }

  // Reserveerbaar? Gratis tafels (crew/personeel) nooit; verder alles behalve wat in noReserve staat.
  function isReservable(t) { t = String(t); if (isFreeTable(t)) return false; return (getResvSettings().noReserve || []).map(String).indexOf(t) < 0; }
  // Welke tafels zijn bezet door overlappende reservaties op dat moment?
  function _occupiedTablesAt(date, tStart, dur, excludeId) {
    var occ = {};
    getReservations({ date: date }).forEach(function (r) {
      if (r.id === excludeId) return;
      if (['cancelled', 'no_show', 'waitlist'].indexOf(r.status) >= 0) return;
      var rs = _toMin(r.time), re = rs + (r.durationMin || dur);
      if (rs < tStart + dur && re > tStart) (r.tableIds || []).forEach(function (t) { occ[String(t)] = true; });
    });
    return occ;
  }
  // Automatische tafeltoekenning: best-fit (minste verspilde plaatsen), samenvoegen verkozen boven
  // een te grote losse tafel, en de assignRules-volgorde als voorkeur bij gelijkwaardige opties
  // (zo belandt bv. de geïsoleerde tafel 1 achteraan).
  function autoAssignTable(resv) {
    resv = resv || {}; var pax = parseInt(resv.covers, 10) || 1;
    var st = getResvSettings();
    var rules = (st.assignRules || []).slice().sort(function (a, b) { return a.maxPax - b.maxPax; });
    var rule = rules.filter(function (r) { return pax <= r.maxPax; })[0] || rules[rules.length - 1];
    var order = rule ? (rule.order || []).map(String) : [];
    function orderIdx(t) { var i = order.indexOf(String(t)); return i < 0 ? 9999 : i; }
    var dur = parseInt(resv.durationMin, 10) || durationForCovers(pax);
    var tStart = _toMin(resv.time || '19:00');
    var occ = _occupiedTablesAt(resv.date, tStart, dur, resv.id);
    var cands = [];
    // losse tafels (reserveerbaar, vrij, capaciteit >= pax)
    getTables().forEach(function (t) {
      t = String(t); if (isReservable(t) && !occ[t]) { var cap = tableSeatsMaxOf(t); if (cap >= pax) cands.push({ tables: [t], waste: cap - pax, n: 1, pref: orderIdx(t) }); }
    });
    // samenvoegen: minimale aaneengesloten vrije reeks per startpunt binnen elke reeks
    (getTableCfg().groups || []).forEach(function (grp) {
      for (var s = 0; s < grp.length; s++) {
        var run = [], cap = 0;
        for (var j = s; j < grp.length; j++) {
          var t = String(grp[j]);
          if (isReservable(t) && !occ[t]) { run.push(t); cap += tableSeatsOf(t); if (cap >= pax) { cands.push({ tables: run.slice(), waste: cap - pax, n: run.length, pref: orderIdx(run[0]) }); break; } }
          else break;
        }
      }
    });
    if (!cands.length) return [];
    cands.sort(function (a, b) { return a.waste - b.waste || a.n - b.n || a.pref - b.pref; });
    return cands[0].tables;
  }

  function loadResv() { var l; try { l = JSON.parse(localStorage.getItem(RSVKEY) || '[]'); } catch (e) { return []; } return Array.isArray(l) ? _rapportenUitReservaties(l) : []; }
  /* Tot v0.121.0 schreef het Z-rapport per vergissing in de reservatielijst (live: 14 jul, 8 aug, 7 sep 2026). Een rapport heeft
     geen id maar wel byMethod en savedAt; een reservatie heeft altijd een id. Wat er zo staat, verhuist naar de rapportenlijst
     (een dag die daar al staat, blijft zoals hij is). Gebeurt bij elk lezen, zodat ook een oude kopie op een ander toestel opgeruimd wordt. (v0.122.0) */
  function _rapportenUitReservaties(l) {
    var isRap = function (x) { return !!x && typeof x === 'object' && !x.id && !!x.byMethod && x.savedAt !== undefined; };
    var rap = l.filter(isRap); if (!rap.length) return l;
    var reps = getReports(), dagen = {}; reps.forEach(function (r) { dagen[r.date] = 1; });
    rap.forEach(function (r) { if (!dagen[r.date]) { reps.push(r); dagen[r.date] = 1; } });
    saveReports(reps);
    var rest = l.filter(function (x) { return !isRap(x); });
    try { localStorage.setItem(RSVKEY, JSON.stringify(rest)); } catch (e) {}
    broadcast('reservations');
    return rest;
  }
  function saveResv(list) { try { localStorage.setItem(RSVKEY, JSON.stringify(list)); } catch (e) {} broadcast('reservations'); }
  function getReservations(filter) {
    filter = filter || {}; var q = (filter.q || '').toLowerCase();
    return loadResv().filter(function (r) {
      if (filter.date && r.date !== filter.date) return false;
      if (filter.from && r.date < filter.from) return false;
      if (filter.to && r.date > filter.to) return false;
      if (filter.status && r.status !== filter.status) return false;
      if (filter.service && r.service !== filter.service) return false;
      if (filter.guestId && r.guestId !== filter.guestId) return false;
      if (q) { var h = ((r.firstName || '') + ' ' + (r.lastName || '') + ' ' + (r.email || '') + ' ' + (r.phone || '') + ' ' + (r.ref || '')).toLowerCase(); if (h.indexOf(q) < 0) return false; }
      return true;
    }).sort(function (a, b) { return (a.date + a.time).localeCompare(b.date + b.time); });
  }
  function getReservation(id) { return loadResv().find(function (r) { return r.id === id; }); }
  function addReservation(data) {
    data = data || {}; var list = loadResv(); var st = getResvSettings();
    var guestId = data.guestId || null;
    if (!guestId && (normEmail(data.email) || data.lastName)) {
      guestId = upsertGuest({ title: data.title, firstName: data.firstName, lastName: data.lastName, email: data.email, phone: data.phone, lang: data.lang, source: 'reservatie' }).guest.id;
    }
    var covers = parseInt(data.covers, 10) || 1;
    var r = {
      id: uid('rsv'), ref: 'R' + String(Date.now()).slice(-6),
      date: data.date || _fmtDate(new Date()), time: data.time || '19:00',
      durationMin: parseInt(data.durationMin, 10) || durationForCovers(covers),
      covers: covers, guestId: guestId,
      title: data.title || '', firstName: data.firstName || '', lastName: data.lastName || '',
      email: data.email || '', phone: data.phone || '', lang: normLang(data.lang || 'NL'),
      tableIds: data.tableIds || [], service: data.service || '', room: data.room || '',
      source: data.source || 'telefoon', status: data.status || 'confirmed',
      occasion: data.occasion || '', notes: data.notes || '', staffNotes: data.staffNotes || '', tags: data.tags || [],
      prescriber: data.prescriber || '',
      deposit: data.deposit || { required: false, amount: 0, status: 'none' },
      confirmationSent: false, reminderSent: false,
      _countedVisit: false, _countedNoShow: false,
      createdAt: Date.now(), updatedAt: Date.now(),
    };
    // Automatische tafeltoekenning bij binnenkomst (indien nog geen tafel gekozen).
    if ((!r.tableIds || !r.tableIds.length) && (r.status === 'confirmed' || r.status === 'pending')) {
      try { var auto = autoAssignTable(r); if (auto.length) { r.tableIds = auto; r.autoAssigned = true; } } catch (e) {}
    }
    list.push(r); saveResv(list);
    _applyGuestCounters(r);
    return r;
  }
  function updateReservation(id, patch) { var d = loadResv(); var r = d.find(function (x) { return x.id === id; }); if (r) { Object.assign(r, patch); r.updatedAt = Date.now(); saveResv(d); } return r; }
  function _applyGuestCounters(r) {
    if (!r.guestId) return; var g = getGuest(r.guestId); if (!g) return; var patch = {};
    if ((r.status === 'seated' || r.status === 'completed') && !r._countedVisit) { patch.visits = (g.visits || 0) + 1; patch.lastVisit = r.date; r._countedVisit = true; }
    if (r.status === 'no_show' && !r._countedNoShow) { patch.noShows = (g.noShows || 0) + 1; r._countedNoShow = true; }
    if (Object.keys(patch).length) { updateGuest(r.guestId, patch); var d = loadResv(); var rr = d.find(function (x) { return x.id === r.id; }); if (rr) { rr._countedVisit = r._countedVisit; rr._countedNoShow = r._countedNoShow; saveResv(d); } }
  }
  function setReservationStatus(id, status) {
    if (RESV_STATUSES.indexOf(status) < 0) return null;
    var d = loadResv(); var r = d.find(function (x) { return x.id === id; }); if (!r) return null;
    r.status = status; r.updatedAt = Date.now();
    if (status === 'seated') r.seatedAt = Date.now();
    if (status === 'completed') r.completedAt = Date.now();
    if (status === 'cancelled') r.cancelledAt = Date.now();
    saveResv(d); _applyGuestCounters(r); return r;
  }
  /* ---------- Voorschot bij groepen (v0.116.2) ---------- */
  // Gemiddelde besteding per gast (incl. btw) over de laatste dagen met klanten; 0 als er geen gegevens zijn.
  function avgSpendPerGuest(dagen) {
    var van = _fmtDate(new Date(Date.now() - (dagen || 90) * 86400000)), som = 0, kl = 0;
    ((getIncome() || {}).days || []).forEach(function (x) { if (x.date >= van && Number(x.klanten) > 0) { som += Number(x.brutoFood || 0) + Number(x.brutoDrink || 0); kl += Number(x.klanten); } });
    return kl ? round2(som / kl) : 0;
  }
  // Het voorgestelde voorschot voor een groep: % van de verwachte rekening (afgerond op de euro) of een vast bedrag per persoon.
  function depositAmountFor(covers, st) {
    st = st || getResvSettings(); covers = parseInt(covers, 10) || 0;
    if (st.depositMode === 'pp') return round2(covers * (Number(st.depositPerPerson) || 0));
    var pp = Number(st.depositSpendPP) > 0 ? Number(st.depositSpendPP) : avgSpendPerGuest(90);
    return Math.round(covers * pp * (Number(st.depositPct) || 0) / 100);
  }
  // Wat er met het voorschot moet gebeuren volgens de annulatieregel: terug (tijdig geannuleerd), ingehouden (laat of niet gekomen), verrekend (gekomen).
  function depositAdvice(r, st) {
    if (!r || !r.deposit || !r.deposit.required) return null;
    st = st || getResvSettings();
    if (r.status === 'no_show') return 'ingehouden';
    if (r.status === 'seated' || r.status === 'completed') return 'verrekend';
    if (r.status !== 'cancelled') return null;
    var start = new Date(r.date + 'T' + (r.time || '00:00') + ':00').getTime(), wanneer = Number(r.cancelledAt || r.updatedAt || 0);
    if (!wanneer) return null;
    return (start - wanneer) / 3600000 >= (Number(st.depositCancelHours) || 0) ? 'terug' : 'ingehouden';
  }
  function removeReservation(id) { saveResv(loadResv().filter(function (r) { return r.id !== id; })); }
  function markSent(id, kind) { var p = {}; p[kind === 'reminder' ? 'reminderSent' : 'confirmationSent'] = true; return updateReservation(id, p); }
  function fillTemplate(tpl, r) {
    var nm = ((r.firstName || '') + ' ' + (r.lastName || '')).trim() || 'gast';
    return String(tpl || '').replace(/{naam}/g, nm).replace(/{datum}/g, r.date).replace(/{tijd}/g, r.time).replace(/{aantal}/g, r.covers).replace(/{tafel}/g, (r.tableIds || []).join(', '));
  }

  // Sluitingsuur na middernacht (bv. 00:00) telt als volgende dag t.o.v. het openingsuur
  function _endMin(t, openMin) { var m = _toMin(t); return m <= openMin ? m + 1440 : m; }
  // Effectieve dagconfig: weekdag-standaard, overschreven door een datum-uitzondering
  function getDayConfig(date) {
    var st = getResvSettings(); var dow = _parse(date).getDay();
    var base = (st.weekdays && st.weekdays[dow]) ? st.weekdays[dow] : null;
    var cfg = Object.assign({ open: false, openTime: '17:30', kitchenClose: '21:00', venueClose: '23:00', mode: 'hourly' }, base || {});
    var ov = (st.dayOverrides && st.dayOverrides[date]) ? st.dayOverrides[date] : null;
    if (ov) cfg = Object.assign({}, cfg, ov);
    if ((st.closedDates || []).indexOf(date) >= 0) cfg.open = false;
    return cfg;
  }
  function isDoubleSeating(date) { date = date || businessDate(Date.now()); return getDayConfig(date).mode === 'double'; }
  function _daysBetween(a, b) { return Math.round((_parse(b).getTime() - _parse(a).getTime()) / 86400000); }
  // Reservaties gesloten voor NIEUWE boekingen op die dag (bestaande blijven gelden)
  function isResvClosed(date) { var st = getResvSettings(); return (st.resvClosedDates || []).indexOf(date) >= 0; }
  function setResvClosed(date, on) {
    var st = getResvSettings(); var list = (st.resvClosedDates || []).slice(); var i = list.indexOf(date);
    if (on && i < 0) list.push(date); else if (!on && i >= 0) list.splice(i, 1);
    saveResvSettings({ resvClosedDates: list }); return on;
  }
  function toggleResvClosed(date) { return setResvClosed(date, !isResvClosed(date)); }

  // Beschikbaarheid o.b.v. de per-dag config: 'hourly' = per interval tot keukensluiting;
  // 'double' = vaste turns die elk volledig binnen de keukenuren passen.
  function availability(date, covers) {
    covers = parseInt(covers, 10) || 1; var st = getResvSettings();
    var cfg = getDayConfig(date);
    var out = { date: date, open: true, reason: '', mode: cfg.mode, services: [] };
    var maxAdv = parseInt(st.maxAdvanceDays, 10) || 120;
    if (_daysBetween(businessDate(Date.now()), date) > maxAdv) { out.open = false; out.reason = 'Nog niet open voor reservaties (max ' + maxAdv + ' dagen vooruit)'; return out; }
    if (isResvClosed(date)) { out.open = false; out.reason = 'Reservaties gesloten voor deze dag'; return out; }
    if (!cfg.open) { out.open = false; out.reason = 'Gesloten deze dag'; return out; }
    var dur = parseInt(st.seatingDuration, 10) || 150;
    var interval = parseInt(st.slotInterval, 10) || 15;
    var cap = st.capacityPerService || 40;
    var openMin = _toMin(cfg.openTime);
    var kitchenMin = _endMin(cfg.kitchenClose, openMin);
    var dayResv = getReservations({ date: date }).filter(function (r) { return r.status !== 'cancelled' && r.status !== 'no_show' && r.status !== 'waitlist'; });
    function remainingAt(t) { var used = 0, ns = t, ne = t + dur; dayResv.forEach(function (r) { if (r.override) return; var rs = _toMin(r.time), re = rs + (r.durationMin || dur); if (rs < ne && re > ns) used += (r.covers || 0); }); return cap - used; }
    var slots = [], starts = [];
    if (cfg.mode === 'double') {
      for (var tt = openMin; tt + dur <= kitchenMin; tt += dur) starts.push(tt);
      if (!starts.length) starts.push(openMin);
    } else {
      for (var t2 = openMin; t2 <= kitchenMin; t2 += interval) starts.push(t2);
    }
    starts.forEach(function (t) { var rem = remainingAt(t); slots.push({ time: _fromMin(t), remaining: rem, ok: rem >= covers }); });
    out.services.push({ id: 'day', name: cfg.mode === 'double' ? 'Vaste seatings' : 'Doorlopend', capacity: cap, slots: slots });
    return out;
  }
  function resvDayStats(date) {
    var list = getReservations({ date: date });
    var covers = 0, byStatus = {}; RESV_STATUSES.forEach(function (s2) { byStatus[s2] = 0; });
    list.forEach(function (r) { byStatus[r.status] = (byStatus[r.status] || 0) + 1; if (r.status !== 'cancelled' && r.status !== 'no_show' && r.status !== 'waitlist') covers += (r.covers || 0); });
    return { count: list.length, covers: covers, byStatus: byStatus };
  }

  /* ========== KosmoTable ⇄ Kassa ⇄ Tafelplan: de lijm ========== */
  function getTableLink(table) { var d = load(); return (d.tableLinks && d.tableLinks[String(table)]) || null; }
  function setTableLink(table, link) { var d = load(); d.tableLinks = d.tableLinks || {}; d.tableLinks[String(table)] = Object.assign({}, d.tableLinks[String(table)] || {}, link || {}); save(d); }
  function clearTableLink(table) { var d = load(); if (d.tableLinks && d.tableLinks[String(table)]) { delete d.tableLinks[String(table)]; save(d); } }
  function _onTableClosed(table) { try { deactivateTable(table); } catch (e) {} var lk = getTableLink(table); if (lk) { if (lk.reservationId) { try { setReservationStatus(lk.reservationId, 'completed'); } catch (e) {} } clearTableLink(table); } }

  // Reservatie 'zetten' = gasten aangekomen -> kassasessie: personen + gast koppelen aan de tafel.
  function seatReservation(resvId, tableIds) {
    var r = getReservation(resvId); if (!r) return null;
    var tabs = (tableIds && tableIds.length) ? tableIds.map(String) : ((r.tableIds || []).map(String));
    if (tabs.length) updateReservation(resvId, { tableIds: tabs });
    setReservationStatus(resvId, 'seated');
    if (tabs.length) { setPersons(tabs[0], r.covers); tabs.forEach(function (t) { setTableLink(t, { guestId: r.guestId || null, reservationId: resvId, seatedAt: Date.now(), covers: r.covers }); try { activateTable(t); } catch (e) {} }); }
    return getReservation(resvId);
  }

  // Gecombineerde tafeltoestand voor het tafelplan (reservering + kassa + rekening).
  function getFloorPlan(date) {
    var today = date || businessDate(Date.now());
    var resvs = getReservations({ date: today });
    return getTables().map(function (t) {
      var openBill = getOpenBill(t);
      var active = isTableActive(t);
      var occupied = openBill.length > 0 || _openOrders(t).length > 0 || active;
      var billreq = false; try { billreq = hasBillRequest(t); } catch (e) {}
      var link = getTableLink(t);
      var tRes = resvs.filter(function (r) { return (r.tableIds || []).map(String).indexOf(String(t)) >= 0 && r.status !== 'cancelled' && r.status !== 'no_show' && r.status !== 'completed'; });
      var nextRes = tRes.filter(function (r) { return r.status === 'confirmed' || r.status === 'pending' || r.status === 'waitlist'; }).sort(function (a, b) { return a.time.localeCompare(b.time); })[0] || null;
      var seatedRes = tRes.filter(function (r) { return r.status === 'seated'; })[0] || null;
      var total = 0; openBill.forEach(function (l) { total += l.price * l.remaining; });
      var status = billreq ? 'billreq' : (occupied ? 'seated' : (nextRes ? 'reserved' : 'free'));
      var guest = (link && link.guestId) ? getGuest(link.guestId) : (seatedRes && seatedRes.guestId ? getGuest(seatedRes.guestId) : (nextRes && nextRes.guestId ? getGuest(nextRes.guestId) : null));
      return { table: String(t), status: status, occupied: occupied, active: active, hasOrders: openBill.length > 0 || _openOrders(t).length > 0, billreq: billreq, covers: getPersons(t), total: round2(total), reservation: seatedRes || nextRes, allReservations: tRes.slice().sort(function (a, b) { return String(a.time).localeCompare(String(b.time)); }), guest: guest, link: link };
    });
  }
  function getUpcomingArrivals(date) {
    var today = date || businessDate(Date.now());
    return getReservations({ date: today }).filter(function (r) { return r.status === 'confirmed' || r.status === 'pending'; });
  }

  /* ================= Tafelconfiguratie + capaciteit ================= */
  function getTableCfg() {
    var st = getResvSettings();
    return {
      seatingDuration: parseInt(st.seatingDuration, 10) || 150,
      doubleSeating: !!st.doubleSeating,
      defaultSeats: parseInt(st.defaultSeats, 10) || 2,
      seats: st.tableSeats || {},
      seatsMax: st.tableSeatsMax || {},
      zones: st.tableZones || {},
      pos: st.tablePos || {},
      groups: (st.tableGroups || []).map(function (g) { return g.map(String); }),
    };
  }
  // typische zitplaatsen (voor bezetting/planning)
  function tableSeatsOf(t) { var c = getTableCfg(); t = String(t); return c.seats[t] != null ? parseInt(c.seats[t], 10) : c.defaultSeats; }
  // maximale zitplaatsen (uitzonderlijk, bv. tafel 10 -> 3, tafel 23 -> 12)
  function tableSeatsMaxOf(t) { var c = getTableCfg(); t = String(t); return c.seatsMax[t] != null ? parseInt(c.seatsMax[t], 10) : tableSeatsOf(t); }
  // in welke samenvoegbare reeks zit deze tafel? (of null)
  // in welke zone/ruimte hoort deze tafel? (leeg = niet toegewezen)
  function tableZoneOf(t) { var c = getTableCfg(); t = String(t); return c.zones[t] || ''; }
  // positie op de plattegrond in % (of null als nog niet geplaatst)
  function seatingDuration() { return getTableCfg().seatingDuration; }

  /* ---------- Tafelactivatie (bediening opent tafel voor bestellingen) ---------- */
  /* ---------- Actieve tafels: eigen sync-sleutel, los van de menukaart ----------
     Stond tot v0.60.1 als d.activatedTables ín de grote kosmo-menu-data-v1.
     Elke wijziging aan die data - een prijs, een tafelnotitie, een reservatie-
     koppeling, om het even van welk toestel - herschrijft het HELE document.
     Wijzigen twee toestellen rond hetzelfde moment iets erin, dan wint de
     laatste schrijfbeurt met haar eigen (mogelijk verouderde) kopie van
     activatedTables: een deactivatie kan zo stil overschreven worden door een
     op zich onschuldige, ongerelateerde wijziging van een ander toestel. Eigen
     sleutel = eigen document = geen botsing meer met ongerelateerde velden. */
  const AKEY = 'kosmo-active-tables-v1';
  function loadActive() {
    try {
      var raw = JSON.parse(localStorage.getItem(AKEY) || 'null');
      if (raw && typeof raw === 'object') return raw;
    } catch (e) {}
    // eenmalige migratie: stond het nog in de oude, grote menukaart-data?
    var d = load();
    if (d.activatedTables && Object.keys(d.activatedTables).length) {
      var migrated = d.activatedTables;
      delete d.activatedTables; save(d);
      saveActive(migrated);
      return migrated;
    }
    return {};
  }
  function saveActive(obj) { try { localStorage.setItem(AKEY, JSON.stringify(obj)); } catch (e) {} broadcast('tables'); }
  function _activated() { return loadActive(); }
  // Een activatie geldt voor één werkdag (v0.111.0). Tot dan bleef een tafel die ooit geactiveerd werd
  // maar nooit afgerekend of afgesloten (testbestelling gewist, gasten weg zonder bestelling) wekenlang
  // als "bezet" in Service staan. Van een vorige werkdag en zonder openstaande bestelling = niet meer actief.
  function _activationStale(t, ms) { return !ms || (businessDate(ms) !== businessDate(Date.now()) && _openOrders(t).length === 0); }
  function isTableActive(t) { t = String(t); if (t === '0') return true; var ms = _activated()[t]; return !!ms && !_activationStale(t, ms); }
  // ruimt verlopen activaties ook echt op (één schrijfbeurt, enkel als er iets te ruimen valt)
  function pruneStaleActivations() {
    var a = loadActive(), weg = [];
    Object.keys(a).forEach(function (t) { if (t !== '0' && _activationStale(t, a[t])) weg.push(t); });
    if (!weg.length) return [];
    weg.forEach(function (t) { delete a[t]; }); saveActive(a);
    return weg;
  }
  function activateTable(t) { t = String(t); var a = loadActive(); if (!a[t]) { a[t] = Date.now(); saveActive(a); } return true; }
  function deactivateTable(t) { t = String(t); var a = loadActive(); if (a[t]) { delete a[t]; saveActive(a); } return true; }
  // een tafel is "in gebruik" als ze geactiveerd is OF openstaande bestellingen heeft
  function isTableInUse(t) { return isTableActive(t) || _openOrders(t).length > 0; }

  /* ---------- Avond-reservaties per tafel (bezettingsprognose) ---------- */
  function getTableReservations(table, date) {
    var day = date || businessDate(Date.now()); table = String(table);
    return getReservations({ date: day })
      .filter(function (r) { return (r.tableIds || []).map(String).indexOf(table) >= 0 && r.status !== 'cancelled' && r.status !== 'no_show'; })
      .sort(function (a, b) { return String(a.time).localeCompare(String(b.time)); });
  }
  // Verdeel de reservaties van een tafel over twee shifts (turns) op basis van de
  // seating-duur: eerste seating = shift1 (bovenhelft), tweede seating = shift2 (onderhelft).
  function getTableShifts(table, date) {
    var day = date || businessDate(Date.now());
    var dur = seatingDuration();
    var start = _toMin(getDayConfig(day).openTime);
    var s1 = [], s2 = [];
    getTableReservations(table, day).forEach(function (r) {
      if (_toMin(r.time) < start + dur) s1.push(r); else s2.push(r);
    });
    return { shift1: s1, shift2: s2 };
  }

  /* ---------- Tafeltransfer (x -> y) ---------- */
  function moveTable(from, to) {
    from = String(from); to = String(to);
    if (!from || !to || from === to) return { moved: false, reason: 'same' };
    var all = loadOrders();
    var movedAny = false, hadConfirmed = false;
    all.forEach(function (o) {
      if (String(o.table) !== from || o.status === 'closed') return;
      o.table = to; o.movedFrom = from; movedAny = true;
      if (o.lines.some(function (l) { return l.confirmed && !l.voided; })) hadConfirmed = true;
    });
    if (movedAny) saveOrders(all);
    // koppelingen meeverhuizen
    var lk = getTableLink(from); if (lk) { setTableLink(to, lk); clearTableLink(from); }
    var note = getBillNote(from); if (note) { setBillNote(to, note); setBillNote(from, ''); }
    var reqs = getBillRequests(); if (reqs[from] != null) { var d = load(); d.billRequests = d.billRequests || {}; d.billRequests[to] = reqs[from]; delete d.billRequests[from]; save(d); }
    if (isTableActive(from)) { activateTable(to); deactivateTable(from); }
    // reservaties die op 'from' stonden mee verplaatsen
    getReservations({ date: businessDate(Date.now()) }).forEach(function (r) {
      if ((r.tableIds || []).map(String).indexOf(from) >= 0) {
        var ids = r.tableIds.map(String).map(function (x) { return x === from ? to : x; });
        updateReservation(r.id, { tableIds: ids });
      }
    });
    if (movedAny && hadConfirmed) { addChat('system', 'Tafel ' + from + ' is voortaan tafel ' + to); }
    broadcast('orders');
    return { moved: movedAny, hadConfirmed: hadConfirmed };
  }
  // vorige tafelnummer (voor doorstreping in ticket board); null als niet verplaatst
  function getTableMovedFrom(table) {
    table = String(table); var from = null;
    loadOrders().forEach(function (o) { if (String(o.table) === table && o.status === 'open' && o.movedFrom) from = String(o.movedFrom); });
    return from;
  }

  /* ---------- Walk-in capaciteit (1 oogopslag) ---------- */
  // Een tafel is vrij voor een walk-in als ze niet in gebruik is en niet binnen de
  // seating-duur al gereserveerd staat (rekening houden met latere reservaties).
  function _reservedSoon(table, nowMin, day) {
    var dur = seatingDuration();
    return getTableReservations(table, day).some(function (r) {
      if (r.status === 'seated' || r.status === 'completed') return false;
      var rs = _toMin(r.time); return rs < nowMin + dur && rs + (r.durationMin || dur) > nowMin;
    });
  }
  function walkinFreeTables(date) {
    var day = date || businessDate(Date.now());
    var now = new Date(); var nowMin = now.getHours() * 60 + now.getMinutes();
    return getTables().filter(function (t) {
      if (String(t) === '0') return false;
      if (isTableInUse(t)) return false;
      if (_reservedSoon(t, nowMin, day)) return false;
      return true;
    }).map(String);
  }
  // grootste gezelschap dat nu nog als walk-in kan zitten (enkel + aaneengesloten samenvoeging)
  function walkinCapacity(date) {
    var cfg = getTableCfg();
    var free = walkinFreeTables(date);
    var freeSet = {}; free.forEach(function (t) { freeSet[t] = true; });
    var best = 0, freeSeats = 0;
    // losse tafels
    free.forEach(function (t) { var m = tableSeatsMaxOf(t); freeSeats += tableSeatsOf(t); if (m > best) best = m; });
    // aaneengesloten vrije runs binnen een samenvoegbare reeks
    cfg.groups.forEach(function (g) {
      var runSeats = 0, runMax = 0;
      g.forEach(function (t) {
        if (freeSet[t]) { runSeats += tableSeatsOf(t); if (runSeats > runMax) runMax = runSeats; }
        else { runSeats = 0; }
      });
      if (runMax > best) best = runMax;
    });
    function canSeat(n) {
      if (free.some(function (t) { return tableSeatsMaxOf(t) >= n; })) return true;
      return cfg.groups.some(function (g) {
        var run = 0; return g.some(function (t) { if (freeSet[t]) { run += tableSeatsOf(t); if (run >= n) return true; } else { run = 0; } return false; });
      });
    }
    return { freeTables: free.length, freeSeats: freeSeats, maxParty: best, canSeat: canSeat,
             for2: canSeat(2), for4: canSeat(4), for6: canSeat(6) };
  }

  window.KosmoData = {
    ALLERGEEN_SUB: ALLERGEEN_SUB, getVisual, setVisual, heroLib, heroStandaard, heroThema, heroVoor, setHero, addHero, removeHero,
    checkStaffPin, setStaffPin, hasStaffPin, getUsers, authUser, addUser, updateUser, removeUser, roleRank, clearanceMinimum, refreshUsers,
    loginNames, whoAmI, logoutServer, getClearance, setClearance, getSession, setSession, clearSession, avgSpendPerGuest, depositAmountFor,
    depositAdvice, getCategories, addCategory, updateCategory, removeCategory, moveCategory, vatCodeFor, vatRate, defaultVatForSource,
    VAT_RATES, getItems, getItem, addItem, updateItem, removeItem, setAvailable, setArchived, getDrinkItems, effectivePrice, itemCourse,
    promoInfo, promoActivePct, promoDefaultUntil, promoToInput, promoFromInput, promoUntilLabel, getPromoReport, addItemCategory,
    removeItemCategory, moveItem, placeholder, imgFor, tintFor, resolveImg, putImage, delImage, ready, loadImages, setMediaMode, onImage,
    putImageAt, getBasket, setBasket, addToBasket, setNote, setQty, basketCount, clearBasket, subscribe, broadcast, emit, placeOrder,
    getOrder, getTableOrders, confirmOrder, updateLine, setLineCourse, setLineQty, voidLine, setLinePrice, getKitchenLines, getBarLines,
    getPendingOrders, advanceCourse, getActiveTableNumbers, getTableStatus, getOpenBill, closeTable, getPersons, setPersons, settleBill,
    getPayments, getDayPayments, getLiveReport, getDaySessions, closeDay, archiveOldOrders, archiveOldPayments, getAllPayments, loadOrdersInRange, loadOrderArchief, getReports,
    computeReport, getPaymentMethods, addPaymentMethod, removePaymentMethod, restoreSession, getPaymentTypeMap, payTypeFor, setPaymentType,
    guessPayType, PAY_TYPES, getDeviceId, getTerminalLabel, setTerminalLabel, getTableCostTypes, COST_TYPES, getDayHistory, destForItem,
    getBillNote, setBillNote, businessDate, dayReport, rangeReport, getRunningWeek, getPeriodBreakdown, getHourly, getByWeekday,
    comparePeriods, getMenuEngineering, fnbMixMargin, getPaymentMix, getDiscountsVoids, getDrinkAttach, getGoals, setGoal, todayStr,
    weekRange, monthRange, yearRange, getProfile, getTodos, addTodo, dismissTodo, getTeamPost, teamPostOpen, loadTeamPost, clearTeamPost,
    sendTeamPost, setTeamPostDone, removeTeamPost, getExtraHours, addExtraHours, removeExtraHours, extraHoursSum, getTables, addTable,
    removeTable, removeHighestTable, renameTable, tableConfigIssues, reservableSeats, isFreeTable, setCourseProgress, serveBar,
    getTableCourses, restoreTable, getChat, addChat, clearChat, getAskBill, setAskBill, requestBill, getBillRequests, hasBillRequest,
    clearBillRequest, getStdMessages, addStdMessage, removeStdMessage, getGuests, getGuest, addGuestManual, upsertGuest, updateGuest,
    removeGuest, getKassaVanaf, setKassaVanaf, kassaTeltOp, kassaGenegeerd, getIncome, importIncome, vatPaidSummary, importGuests,
    filterGuests, guestStats, guestFrequency, FREQ_LABELS, tagLabel, isFreqTag, TAG_TAXONOMY, exportGuestsCSV, parseCSV, getResvSettings,
    saveResvSettings, getReservations, getReservation, addReservation, updateReservation, setReservationStatus, removeReservation, markSent,
    fillTemplate, availability, resvDayStats, durationForCovers, RESV_STATUSES, getDayConfig, isDoubleSeating, isResvClosed, setResvClosed,
    toggleResvClosed, getTableLink, setTableLink, clearTableLink, seatReservation, getFloorPlan, getUpcomingArrivals, getTableCfg,
    tableSeatsOf, tableSeatsMaxOf, tableZoneOf, seatingDuration, isReservable, autoAssignTable, isTableActive, activateTable,
    deactivateTable, isTableInUse, pruneStaleActivations, getTableReservations, getTableShifts, moveTable, getTableMovedFrom,
    walkinFreeTables, walkinCapacity, reset, DEFAULTS
  };
  // Interne naad voor js/data-boekhouding.js (v0.118.0): de functies die het boekhoudgedeelte van de kern nodig heeft. Niet opsombaar,
  // dus onzichtbaar voor wie KosmoData overloopt. Ontbreekt het boekhoudbestand (klantenkaart, gastmotor), dan werkt de kern gewoon.
  Object.defineProperty(window.KosmoData, '_kern', { value: { loadExtraHours: loadExtraHours, broadcast: broadcast, emit: emit, uid: uid, round2: round2, todayStr: todayStr, _kassaBetalingen: _kassaBetalingen, businessDate: businessDate, loadIncome: loadIncome, _incomeSplit: _incomeSplit, rangeReport: rangeReport, computeReport: computeReport, paymentsInRange: paymentsInRange, _lastDay: _lastDay } });
})();
