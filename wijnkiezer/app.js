/* ============================================================
   Wijnkiezer — klant-app
   ============================================================ */
(function () {
  'use strict';
  var W = window.Wijnkiezer, esc = W.esc;
  var DB = null, ST = {}, WINES = [];
  var FAV_KEY = 'wijnkiezer-bewaard';
  var $ = function (id) { return document.getElementById(id); };
  var params = new URLSearchParams(location.search);

  /* ---------- bewaard ---------- */
  var favs = [];
  try { favs = JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); } catch (e) {}
  if (params.get('lijst')) favs = Array.from(new Set(favs.concat(params.get('lijst').split(','))));
  function saveFavs() { try { localStorage.setItem(FAV_KEY, JSON.stringify(favs)); } catch (e) {} updFavCnt(); }
  function isFav(id) { return favs.indexOf(id) >= 0; }
  function toggleFav(id) { var i = favs.indexOf(id); if (i >= 0) favs.splice(i, 1); else favs.push(id); saveFavs(); toast(i >= 0 ? 'Verwijderd uit je lijstje' : 'Bewaard in je lijstje'); }
  function updFavCnt() { var c = $('fav-cnt'); c.textContent = favs.length; c.hidden = !favs.length; }

  function toast(t) { var el = $('toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toast._t); toast._t = setTimeout(function () { el.classList.remove('on'); }, 1800); }

  /* ---------- tabs ---------- */
  document.querySelectorAll('.tabs button').forEach(function (b) {
    b.onclick = function () { show(b.dataset.v); };
  });
  function show(v) {
    document.querySelectorAll('.tabs button').forEach(function (x) { x.classList.toggle('on', x.dataset.v === v); });
    document.querySelectorAll('.view').forEach(function (x) { x.classList.toggle('on', x.id === 'v-' + v); });
    if (v === 'alle') renderList(); if (v === 'bewaard') renderFavs(); if (v === 'pairing') renderPair();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---------- kaart ---------- */
  function card(w, extra) {
    extra = extra || {};
    var tags = '<span class="tag k-' + w.kleur + '">' + esc(W.label(W.KLEUREN, w.kleur)) + '</span>';
    if (w.vegan === true) tags += '<span class="tag v">Vegan</span>';
    if (w.bio) tags += '<span class="tag v">Bio</span>';
    if (w.bron === 'demo') tags += '<span class="tag d">Demo</span>';
    w.aromas.slice(0, 3).forEach(function (a) { tags += '<span class="tag">' + esc(a) + '</span>'; });
    var why = '';
    if (extra.redenen && extra.redenen.length) why = '<ul class="why">' + extra.redenen.slice(0, 3).map(function (r) { return '<li class="' + (r.plus ? '' : 'min') + '">' + esc(r.t) + '</li>'; }).join('') + '</ul>';
    return '<article class="card" data-id="' + esc(w.id) + '">' +
      (extra.score != null ? '<div class="match" title="Match">' + extra.score + '%</div>' : '') +
      '<button class="fav" data-fav="' + esc(w.id) + '" aria-label="Bewaar">' + (isFav(w.id) ? '♥' : '♡') + '</button>' +
      '<h3>' + esc(w.naam) + '</h3>' +
      '<div class="meta">' + esc([w.land, w.regio].filter(Boolean).join(' · ')) + (w.druiven.length ? ' — ' + esc(w.druiven.join(', ')) : '') + '</div>' +
      (w.omschrijving ? '<p class="desc">' + esc(w.omschrijving) + '</p>' : '') +
      '<div class="tags">' + tags + '</div>' + why +
      '<div class="price" style="margin-top:auto">' + W.euro(w.prijs) + (w.inhoud && w.inhoud !== 75 ? ' <small class="meta">(' + w.inhoud + ' cl)</small>' : '') + '</div>' +
      '</article>';
  }
  document.addEventListener('click', function (e) {
    var f = e.target.closest('[data-fav]');
    if (f) { e.stopPropagation(); toggleFav(f.dataset.fav); f.textContent = isFav(f.dataset.fav) ? '♥' : '♡'; if ($('v-bewaard').classList.contains('on')) renderFavs(); return; }
    var c = e.target.closest('.card[data-id]');
    if (c) openFiche(c.dataset.id);
  });

  /* ---------- fiche ---------- */
  function openFiche(id) {
    var w = WINES.find(function (x) { return x.id === id; }); if (!w) return;
    var spec = [
      ['Kleur', W.label(W.KLEUREN, w.kleur)], ['Land', w.land], ['Regio', w.regio], ['Producent', w.producent],
      ['Jaargang', w.jaar], ['Druiven', w.druiven.join(', ')], ['Alcohol', w.alcohol != null ? w.alcohol + ' %' : ''],
      ['Inhoud', w.inhoud ? w.inhoud + ' cl' : ''], ['Serveren', w.serveertemp], ['Vegan', W.veganLabel(w.vegan).replace('Vegan: ', '')], ['Bio', w.bio ? 'ja' : '']
    ].filter(function (s) { return s[1]; });
    var url = w.url || (ST.webshop ? ST.webshop : '');
    $('sheet-body').innerHTML = '<div class="fiche">' +
      (w.foto ? '<img class="img" src="' + esc(w.foto) + '" alt="">' : '') +
      '<h2>' + esc(w.naam) + '</h2>' +
      '<p class="price" style="font-size:20px;margin:6px 0">' + W.euro(w.prijs) + '</p>' +
      (w.omschrijving ? '<p>' + esc(w.omschrijving) + '</p>' : '') +
      '<div class="spec">' + spec.map(function (s) { return '<div><small>' + esc(s[0]) + '</small>' + esc(s[1]) + '</div>'; }).join('') + '</div>' +
      '<h3>Smaakprofiel</h3>' + W.bars(w.smaak) +
      (w.aromas.length ? '<h3>Aroma’s</h3><div class="tags">' + w.aromas.map(function (a) { return '<span class="tag">' + esc(a) + '</span>'; }).join('') + '</div>' : '') +
      (w.pairing.length ? '<h3>Lekker bij</h3><div class="tags">' + w.pairing.map(function (a) { return '<span class="tag">' + esc(W.label(W.INGREDIENTEN, a)) + '</span>'; }).join('') + '</div>' : '') +
      (w.bron === 'kosmopoliet-kaart' ? '<p class="meta" style="margin-top:14px">Profiel afgeleid uit de proefnotitie; technische fiche nog te koppelen.</p>' : '') +
      '<div class="row" style="margin-top:18px">' +
      (url ? '<a class="cta" href="' + esc(url) + '" target="_blank" rel="noopener">' + (w.url ? 'Bekijk in de webshop' : 'Naar de webshop') + '</a>' : '') +
      '<button class="cta alt" data-fav="' + esc(w.id) + '">' + (isFav(w.id) ? '♥ Bewaard' : '♡ Bewaar') + '</button></div>' +
      '</div>';
    $('sheet').classList.add('on'); $('bd').classList.add('on');
    history.replaceState(null, '', '#w=' + encodeURIComponent(id));
  }
  function closeFiche() { $('sheet').classList.remove('on'); $('bd').classList.remove('on'); history.replaceState(null, '', location.pathname + location.search); }
  $('sx').onclick = closeFiche; $('bd').onclick = closeFiche;
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeFiche(); });

  /* ---------- 1. wizard ---------- */
  var GEL = [
    ['aperitief', 'Aperitief', 'Fris om mee te starten'], ['etentje', 'Bij het eten', 'Afgestemd op je gerecht'],
    ['feest', 'Feest', 'Iets om te klinken'], ['cadeau', 'Cadeau', 'Om indruk te maken'], ['zomaar', 'Zomaar', 'Gewoon lekker']
  ];
  var STIJL = [
    ['fris', 'Fris & licht', 'Sappig, levendig, verfrissend', { body: 2, zuur: 4, tannine: 1, hout: 1 }],
    ['fruitig', 'Fruitig & soepel', 'Toegankelijk, veel fruit', { body: 3, fruit: 5, tannine: 2 }],
    ['vol', 'Vol & krachtig', 'Stevig, rijk, met karakter', { body: 5, tannine: 4, hout: 3 }],
    ['zacht', 'Zacht & zoetig', 'Rond met een vleugje zoet', { zoet: 4, fruit: 4, zuur: 2 }],
    ['verras', 'Verras me', 'Laat het aan ons over', {}]
  ];
  var BUD = [['', 'Maakt niet uit'], ['0-12', 'Tot € 12'], ['12-20', '€ 12 – 20'], ['20-30', '€ 20 – 30'], ['30-999', 'Meer dan € 30']];
  var wz = { gel: 'zomaar', stijl: 'verras', kleuren: [], ing: [], bud: '' };

  function choiceHTML(list, cur) { return list.map(function (c) { return '<button class="choice' + (c[0] === cur ? ' on' : '') + '" data-k="' + c[0] + '"><b>' + c[1] + '</b><small>' + c[2] + '</small></button>'; }).join(''); }
  function chipsHTML(list, cur, multi) { return list.map(function (c) { var on = multi ? cur.indexOf(c[0]) >= 0 : cur === c[0]; return '<button class="chip' + (on ? ' on' : '') + '" data-k="' + c[0] + '">' + c[1] + '</button>'; }).join(''); }
  function bindSingle(el, key, rerender) { el.onclick = function (e) { var b = e.target.closest('[data-k]'); if (!b) return; wz[key] = b.dataset.k; rerender(); }; }
  function bindMulti(obj, el, key, rerender) { el.onclick = function (e) { var b = e.target.closest('[data-k]'); if (!b) return; var a = obj[key], i = a.indexOf(b.dataset.k); if (i >= 0) a.splice(i, 1); else a.push(b.dataset.k); rerender(); }; }
  function renderWizard() {
    $('w-gel').innerHTML = choiceHTML(GEL, wz.gel);
    $('w-stijl').innerHTML = choiceHTML(STIJL, wz.stijl);
    $('w-kleur').innerHTML = chipsHTML(W.KLEUREN, wz.kleuren, true);
    $('w-ing').innerHTML = chipsHTML(W.INGREDIENTEN.filter(function (i) { return i[0] !== 'aperitief'; }), wz.ing, true);
    $('w-bud').innerHTML = chipsHTML(BUD, wz.bud, false);
  }
  bindSingle($('w-gel'), 'gel', renderWizard); bindSingle($('w-stijl'), 'stijl', renderWizard);
  bindMulti(wz, $('w-kleur'), 'kleuren', renderWizard); bindMulti(wz, $('w-ing'), 'ing', renderWizard);
  bindSingle($('w-bud'), 'bud', renderWizard);
  $('w-reset').onclick = function () { wz = { gel: 'zomaar', stijl: 'verras', kleuren: [], ing: [], bud: '' }; $('w-vegan').checked = $('w-bio').checked = false; $('w-res').innerHTML = ''; renderWizard(); bindAll(); };
  function bindAll() { bindSingle($('w-gel'), 'gel', renderWizard); bindSingle($('w-stijl'), 'stijl', renderWizard); bindMulti(wz, $('w-kleur'), 'kleuren', renderWizard); bindMulti(wz, $('w-ing'), 'ing', renderWizard); bindSingle($('w-bud'), 'bud', renderWizard); }

  $('w-go').onclick = function () {
    var b = wz.bud ? wz.bud.split('-').map(Number) : [null, null];
    var f = { kleuren: wz.kleuren.slice(), prijsMin: b[0], prijsMax: b[1], vegan: $('w-vegan').checked, bio: $('w-bio').checked };
    if (wz.gel === 'feest' && !f.kleuren.length) f.kleuren = ['bubbels', 'rose', 'wit'];
    var pool = W.filter(WINES, f, ST);
    var target = (STIJL.find(function (s) { return s[0] === wz.stijl; }) || [])[3] || {};
    var dish = wz.ing.length ? { ing: wz.ing.slice(), bereiding: [], smaken: [], intensiteit: 3 } : (wz.gel === 'aperitief' ? { ing: ['aperitief'], smaken: [], bereiding: [], intensiteit: 2 } : null);
    var res = pool.map(function (w) {
      var t = W.tasteScore(w, target), p = dish ? W.pair(w, dish) : null, score = p ? Math.round(t * 0.4 + p.score * 0.6) : t;
      var red = p ? p.redenen.slice() : [];
      if (Object.keys(target).length && t >= 75) red.unshift({ t: 'Past bij je smaakvoorkeur', plus: true });
      if (wz.gel === 'cadeau') { if (w.uitgelicht) score += 8; if (w.prijs && w.prijs >= 20) score += 4; }
      if (wz.gel === 'feest' && w.kleur === 'bubbels') { score += 10; red.unshift({ t: 'Bubbels voor een feestelijk moment', plus: true }); }
      return { w: w, score: Math.min(100, score), redenen: red };
    }).sort(function (a, b) { return b.score - a.score; }).slice(0, 9);
    $('w-res').innerHTML = res.length
      ? '<h2 style="margin-bottom:10px">Onze suggesties voor jou</h2><div class="grid">' + res.map(function (r) { return card(r.w, r); }).join('') + '</div>'
      : '<div class="empty">Geen wijnen gevonden. Verruim je budget of kleurkeuze.</div>';
    $('w-res').scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /* ---------- 2. alle wijnen ---------- */
  var fl = { kleuren: [], pairing: [], landen: [], smaak: {} };
  function renderFilters() {
    $('f-kleur').innerHTML = chipsHTML(W.KLEUREN.filter(function (k) { return WINES.some(function (w) { return w.kleur === k[0]; }); }), fl.kleuren, true);
    $('f-pair').innerHTML = chipsHTML(W.INGREDIENTEN, fl.pairing, true);
    var landen = Array.from(new Set(WINES.map(function (w) { return w.land; }).filter(Boolean))).sort();
    $('f-land').innerHTML = chipsHTML(landen.map(function (l) { return [l, l]; }), fl.landen, true);
    $('f-smaak').innerHTML = W.SMAAKASSEN.filter(function (a) { return a[0] !== 'hout'; }).map(function (a) {
      var v = fl.smaak[a[0]];
      return '<div class="slid"><label><span>' + a[1] + '</span><span id="sv-' + a[0] + '">' + (v ? a[2] + ' ' + '●'.repeat(v) + ' ' + a[3] : 'om het even') + '</span></label>' +
        '<input type="range" min="0" max="5" value="' + (v || 0) + '" data-ax="' + a[0] + '"></div>';
    }).join('');
  }
  ['f-kleur', 'f-pair', 'f-land'].forEach(function (id) {
    var key = { 'f-kleur': 'kleuren', 'f-pair': 'pairing', 'f-land': 'landen' }[id];
    $(id).onclick = function (e) { var b = e.target.closest('[data-k]'); if (!b) return; var a = fl[key], i = a.indexOf(b.dataset.k); if (i >= 0) a.splice(i, 1); else a.push(b.dataset.k); b.classList.toggle('on'); renderList(); };
  });
  $('f-smaak').oninput = function (e) {
    var ax = e.target.dataset.ax; if (!ax) return; var v = +e.target.value;
    if (v) fl.smaak[ax] = v; else delete fl.smaak[ax];
    var a = W.SMAAKASSEN.find(function (x) { return x[0] === ax; });
    $('sv-' + ax).textContent = v ? a[2] + ' ' + '●'.repeat(v) + ' ' + a[3] : 'om het even';
    renderList();
  };
  ['f-q', 'f-min', 'f-max', 'f-vegan', 'f-bio', 'f-sort'].forEach(function (id) { $(id).addEventListener('input', renderList); });
  $('f-reset').onclick = function () { fl = { kleuren: [], pairing: [], landen: [], smaak: {} }; ['f-q', 'f-min', 'f-max'].forEach(function (i) { $(i).value = ''; }); $('f-vegan').checked = $('f-bio').checked = false; renderFilters(); renderList(); };
  $('ft').onclick = function () { $('filters').classList.toggle('open'); };

  function renderList() {
    var f = { kleuren: fl.kleuren, pairing: fl.pairing, landen: fl.landen, q: $('f-q').value.trim(),
      prijsMin: $('f-min').value ? +$('f-min').value : null, prijsMax: $('f-max').value ? +$('f-max').value : null,
      vegan: $('f-vegan').checked, bio: $('f-bio').checked };
    var hasTaste = Object.keys(fl.smaak).length;
    var list = W.filter(WINES, f, ST).map(function (w) { return { w: w, score: hasTaste ? W.tasteScore(w, fl.smaak) : null }; });
    var s = $('f-sort').value;
    list.sort(function (a, b) {
      if (s === 'prijs') return (a.w.prijs == null ? 1e9 : a.w.prijs) - (b.w.prijs == null ? 1e9 : b.w.prijs);
      if (s === 'prijs-') return (b.w.prijs || 0) - (a.w.prijs || 0);
      if (s === 'naam') return a.w.naam.localeCompare(b.w.naam);
      if (hasTaste) return b.score - a.score;
      return (b.w.uitgelicht - a.w.uitgelicht) || (a.w.bron === 'demo') - (b.w.bron === 'demo') || a.w.naam.localeCompare(b.w.naam);
    });
    if (hasTaste) list = list.filter(function (r) { return r.score >= 55; });
    $('f-count').textContent = list.length + (list.length === 1 ? ' wijn' : ' wijnen');
    $('f-list').innerHTML = list.length ? list.map(function (r) { return card(r.w, { score: r.score }); }).join('') : '<div class="empty">Geen wijnen met deze filters.</div>';
  }

  /* ---------- 3. food pairing ---------- */
  var pd = { ing: [], bereiding: [], smaken: [], intensiteit: 3 };
  function renderPair() {
    $('p-ing').innerHTML = chipsHTML(W.INGREDIENTEN, pd.ing, true);
    $('p-ber').innerHTML = chipsHTML(W.BEREIDING, pd.bereiding, true);
    $('p-sm').innerHTML = chipsHTML(W.SMAKEN, pd.smaken, true);
    $('p-int').innerHTML = [[1, 'Heel licht'], [2, 'Licht'], [3, 'Gemiddeld'], [4, 'Krachtig'], [5, 'Heel krachtig']].map(function (i) { return '<button class="' + (pd.intensiteit === i[0] ? 'on' : '') + '" data-k="' + i[0] + '">' + i[1] + '</button>'; }).join('');
    if (!pd.ing.length && !pd.smaken.length && !pd.bereiding.length) { $('p-res').innerHTML = '<div class="empty">Kies minstens één ingrediënt, bereiding of smaak.</div>'; return; }
    var r = W.rankForDish(W.filter(WINES, {}, ST), pd, 9);
    $('p-res').innerHTML = '<h2 style="margin:6px 0 10px">Beste combinaties</h2><div class="grid">' + r.map(function (x) { return card(x.w, x); }).join('') + '</div>';
  }
  bindMulti(pd, $('p-ing'), 'ing', renderPair); bindMulti(pd, $('p-ber'), 'bereiding', renderPair); bindMulti(pd, $('p-sm'), 'smaken', renderPair);
  $('p-int').onclick = function (e) { var b = e.target.closest('[data-k]'); if (!b) return; pd.intensiteit = +b.dataset.k; renderPair(); };

  /* ---------- 4. bewaard ---------- */
  function renderFavs() {
    var l = WINES.filter(function (w) { return isFav(w.id); });
    $('fav-list').innerHTML = l.length ? l.map(function (w) { return card(w); }).join('') : '<div class="empty">Tik op ♡ bij een wijn om hem hier te bewaren.</div>';
  }
  $('fav-share').onclick = function () {
    var url = location.origin + location.pathname + '?lijst=' + favs.map(encodeURIComponent).join(',');
    if (navigator.share) navigator.share({ title: 'Mijn wijnen', url: url }).catch(function () {});
    else if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { toast('Link gekopieerd'); });
    else prompt('Kopieer deze link', url);
  };

  /* ---------- start ---------- */
  W.load({ preferDraft: params.has('voorbeeld') }).then(function (db) {
    DB = db; ST = db.instellingen || {}; WINES = db.wijnen;
    W.applyTheme(ST);
    if (ST.naam) { $('b-naam').textContent = ST.naam; document.title = 'Wijnkiezer · ' + ST.naam; }
    if (ST.baseline) $('b-base').textContent = ST.baseline;
    if (ST.logo) { $('logo').src = ST.logo; $('logo').hidden = false; }
    $('demo-note').hidden = !(ST.toonDemo !== false && WINES.some(function (w) { return w.bron === 'demo' && w.actief; }));
    $('foot').innerHTML = esc(ST.naam || '') + (ST.contact ? ' · ' + esc(ST.contact) : '') + (ST.webshop ? ' · <a href="' + esc(ST.webshop) + '" target="_blank" rel="noopener">webshop</a>' : '') +
      (params.has('voorbeeld') ? '<br><b>Voorbeeldweergave van niet-gepubliceerde wijzigingen</b>' : '');
    renderWizard(); renderFilters(); updFavCnt();
    if (params.get('lijst')) show('bewaard');
    var m = location.hash.match(/w=([^&]+)/); if (m) openFiche(decodeURIComponent(m[1]));
  }).catch(function (e) {
    document.querySelector('main').innerHTML = '<div class="empty">De wijnlijst kon niet geladen worden (' + esc(e.message) + ').</div>';
  });

  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(function () {});
})();
