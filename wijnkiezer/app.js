/* ============================================================
   Wijnkiezer — klant-app
   Advies, alle wijnen, food pairing, bewaard, preselectie (voorkeuren).
   Cadeau/hoeveel: tools.js · mandje en bestellen: order.js
   ============================================================ */
(function () {
  'use strict';
  var W = window.Wijnkiezer, esc = W.esc;
  var ST = {}, WINES = [], PMAX = 50;
  var FAV_KEY = 'wijnkiezer-bewaard', PRE_KEY = 'wijnkiezer-voorkeuren';
  var $ = function (id) { return document.getElementById(id); };
  var params = new URLSearchParams(location.search);
  var current = 'advies';

  function toast(t) { var el = $('toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toast._t); toast._t = setTimeout(function () { el.classList.remove('on'); }, 1900); }
  function load(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } }
  function store(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  /* ---------- bewaard ---------- */
  var favs = load(FAV_KEY, []);
  if (params.get('lijst')) favs = Array.from(new Set(favs.concat(params.get('lijst').split(','))));
  function saveFavs() { store(FAV_KEY, favs); updFavCnt(); }
  function isFav(id) { return favs.indexOf(id) >= 0; }
  function toggleFav(id) { var i = favs.indexOf(id); if (i >= 0) favs.splice(i, 1); else favs.push(id); saveFavs(); toast(i >= 0 ? 'Verwijderd uit je lijstje' : 'Bewaard in je lijstje'); }
  function updFavCnt() { var c = $('fav-cnt'); c.textContent = favs.length; c.hidden = !favs.length; }

  /* ---------- preselectie (voorkeuren) ---------- */
  var PRE0 = { vegan: false, bio: false, biodynamisch: false, natuurwijn: false, sulfietarm: false, alcohol: '', landen: [], regios: [], druiven: [], formaten: [], voorraad: false, prijs: null };
  var pre = Object.assign({}, PRE0, load(PRE_KEY, {}));
  function savePre() { store(PRE_KEY, pre); renderPrebar(); }
  function prijs() { var p = pre.prijs || [0, PMAX]; return [Math.max(0, p[0]), Math.min(PMAX, p[1])]; }
  function preF() {
    var p = prijs();
    return { vegan: pre.vegan, bio: pre.bio, biodynamisch: pre.biodynamisch, natuurwijn: pre.natuurwijn, sulfietarm: pre.sulfietarm,
      alcohol: pre.alcohol, landen: pre.landen, regios: pre.regios, druiven: pre.druiven, formaten: pre.formaten, voorraad: pre.voorraad,
      prijsMin: p[0] > 0 ? p[0] : null, prijsMax: p[1] < PMAX ? p[1] : null };
  }
  function f(extra) { return W.filter(WINES, Object.assign(preF(), extra || {}), ST); }
  function fmtP(v, kant) { return kant === 'max' && v >= PMAX ? '€ ' + PMAX + '+' : '€ ' + v; }
  function activePre() {
    var a = [];
    W.LEVENSSTIJL.forEach(function (l) { if (pre[l[0]]) a.push([l[0], l[1]]); });
    if (pre.alcohol) a.push(['alcohol', pre.alcohol === 'vrij' ? 'Alcoholvrij' : 'Laag alcohol']);
    var p = prijs(); if (p[0] > 0 || p[1] < PMAX) a.push(['prijs', fmtP(p[0]) + ' – ' + fmtP(p[1], 'max')]);
    ['landen', 'regios', 'druiven'].forEach(function (k) { pre[k].forEach(function (v) { a.push([k + ':' + v, v]); }); });
    pre.formaten.forEach(function (v) { a.push(['formaten:' + v, W.label(W.FORMATEN, v)]); });
    if (pre.voorraad) a.push(['voorraad', 'Op voorraad']);
    return a;
  }
  function removePre(key) {
    if (key.indexOf(':') > 0) { var p = key.split(':'), k = p[0], v = p.slice(1).join(':'); pre[k] = pre[k].filter(function (x) { return x !== v; }); }
    else if (key === 'prijs') pre.prijs = null; else if (key === 'alcohol') pre.alcohol = ''; else pre[key] = false;
    savePre(); syncBudgets(); rerender();
  }
  function renderPrebar() {
    var a = activePre();
    $('pre-n').textContent = a.length; $('pre-n').hidden = !a.length;
    var bar = $('prebar'); bar.hidden = !a.length;
    bar.innerHTML = '<span class="lbl up">Jouw voorkeuren</span>' + a.map(function (x) { return '<span class="pchip"><b>' + esc(x[1]) + '</b><button data-rm="' + esc(x[0]) + '" aria-label="Verwijder">×</button></span>'; }).join('') +
      ' <button class="lnk" data-open-pre style="font-size:13px">wijzig</button> <button class="lnk" id="pre-clear" style="font-size:13px">wis alles</button>';
  }
  $('prebar').addEventListener('click', function (e) {
    var r = e.target.closest('[data-rm]'); if (r) { removePre(r.dataset.rm); return; }
    if (e.target.id === 'pre-clear') { pre = Object.assign({}, PRE0, { landen: [], regios: [], druiven: [], formaten: [] }); savePre(); syncBudgets(); rerender(); }
  });

  var budgets = [];
  function budgetSlider(el) {
    var s = W.dualRange(el, { min: 0, max: PMAX, step: 1, value: prijs(), fmt: fmtP, onChange: function (v) {
      pre.prijs = (v[0] <= 0 && v[1] >= PMAX) ? null : v; savePre();
      budgets.forEach(function (b) { if (b !== s) b.set(prijs()); });
      clearTimeout(budgetSlider._t); budgetSlider._t = setTimeout(rerender, 150);
      if ($('pre-count')) updPreCount();
    } });
    budgets.push(s); return s;
  }
  function syncBudgets() { budgets.forEach(function (b) { b.set(prijs()); }); }

  function openPre() {
    var all = WINES.filter(function (w) { return w.actief; });
    var uniq = function (fn) { var m = {}; all.forEach(function (w) { [].concat(fn(w)).forEach(function (v) { if (v) m[v] = (m[v] || 0) + 1; }); }); return Object.keys(m).sort(function (a, b) { return a.localeCompare(b); }); };
    var landen = uniq(function (w) { return w.land; });
    var regios = uniq(function (w) { return pre.landen.length && pre.landen.indexOf(w.land) < 0 ? [] : w.regio; });
    var druiven = uniq(function (w) { return w.druiven; });
    function ch(list, cur, grp) { return list.map(function (v) { var k = Array.isArray(v) ? v[0] : v, l = Array.isArray(v) ? v[1] : v; return '<button class="chip' + (cur.indexOf(k) >= 0 ? ' on' : '') + '" data-pg="' + grp + '" data-k="' + esc(k) + '">' + esc(l) + '</button>'; }).join(''); }
    $('sheet-body').innerHTML = '<div class="pre"><h2 style="font-size:24px;margin-bottom:4px">Jouw voorkeuren</h2><p class="sub">Deze preselectie geldt voor alle onderdelen: advies, alle wijnen, food pairing, cadeau en hoeveelheden.</p>' +
      '<h3 class="up" style="margin:18px 0 8px">Levensstijl & productie</h3><div class="chips">' + W.LEVENSSTIJL.map(function (l) { return '<button class="chip' + (pre[l[0]] ? ' on' : '') + '" data-pb="' + l[0] + '">' + l[1] + '</button>'; }).join('') + '</div>' +
      '<h3 class="up" style="margin:18px 0 8px">Alcohol</h3><div class="chips">' + [['', 'Alle'], ['laag', 'Laag (max. 11 %)'], ['vrij', 'Alcoholvrij']].map(function (a) { return '<button class="chip' + (pre.alcohol === a[0] ? ' on' : '') + '" data-pa="' + a[0] + '">' + a[1] + '</button>'; }).join('') + '</div>' +
      '<h3 class="up" style="margin:18px 0 8px">Budget per fles</h3><div id="pre-bud"></div>' +
      '<h3 class="up" style="margin:18px 0 8px">Land van herkomst</h3><div class="chips">' + ch(landen, pre.landen, 'landen') + '</div>' +
      (regios.length ? '<h3 class="up" style="margin:18px 0 8px">Regio</h3><div class="chips">' + ch(regios, pre.regios, 'regios') + '</div>' : '') +
      '<h3 class="up" style="margin:18px 0 8px">Druif</h3><div class="chips">' + ch(druiven, pre.druiven, 'druiven') + '</div>' +
      '<h3 class="up" style="margin:18px 0 8px">Flesformaat</h3><div class="chips">' + ch(W.FORMATEN.filter(function (x) { return all.some(function (w) { return W.formaat(w) === x[0]; }); }), pre.formaten, 'formaten') + '</div>' +
      '<label class="tog" style="margin-top:16px"><input type="checkbox" id="pre-vr"' + (pre.voorraad ? ' checked' : '') + '> Enkel wijnen die op voorraad zijn</label>' +
      '<div class="sheet-foot row"><button class="cta" id="pre-ok"><span id="pre-count"></span></button><button class="cta alt" id="pre-wis">Wis alles</button></div></div>';
    budgetSlider($('pre-bud'));
    updPreCount();
    openSheet();
  }
  function updPreCount() { var n = f().length; $('pre-count').textContent = 'Toon ' + n + (n === 1 ? ' wijn' : ' wijnen'); }
  $('sheet-body').addEventListener('click', function (e) {
    var t = e.target.closest('button'); if (!t || !$('sheet-body').querySelector('.pre')) return;
    if (t.dataset.pb) { pre[t.dataset.pb] = !pre[t.dataset.pb]; t.classList.toggle('on'); }
    else if (t.dataset.pa !== undefined) { pre.alcohol = t.dataset.pa; t.parentNode.querySelectorAll('.chip').forEach(function (c) { c.classList.toggle('on', c === t); }); }
    else if (t.dataset.pg) {
      var a = pre[t.dataset.pg], i = a.indexOf(t.dataset.k); if (i >= 0) a.splice(i, 1); else a.push(t.dataset.k);
      if (t.dataset.pg === 'landen') { savePre(); openPre(); rerender(); return; }
      t.classList.toggle('on');
    }
    else if (t.id === 'pre-ok') { closeSheet(); return; }
    else if (t.id === 'pre-wis') { pre = Object.assign({}, PRE0, { landen: [], regios: [], druiven: [], formaten: [] }); savePre(); syncBudgets(); openPre(); rerender(); return; }
    else return;
    savePre(); updPreCount(); rerender();
  });
  $('sheet-body').addEventListener('change', function (e) { if (e.target.id === 'pre-vr') { pre.voorraad = e.target.checked; savePre(); updPreCount(); rerender(); } });
  document.addEventListener('click', function (e) { if (e.target.closest('[data-open-pre]')) openPre(); });
  $('pre-open').onclick = openPre;

  /* ---------- tabs ---------- */
  document.querySelectorAll('.tabs button').forEach(function (b) { b.onclick = function () { show(b.dataset.v); }; });
  function show(v) {
    current = v;
    document.querySelectorAll('.tabs button').forEach(function (x) { x.classList.toggle('on', x.dataset.v === v); });
    document.querySelectorAll('.view').forEach(function (x) { x.classList.toggle('on', x.id === 'v-' + v); });
    rerender(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function rerender(force) {
    if (current === 'alle') renderList();
    if (current === 'bewaard') renderFavs();
    if (current === 'pairing') renderPairRes();
    if (current === 'advies' && $('w-res').innerHTML) runWizard(true);
    if (window.WKTools && WKTools[current]) WKTools[current]();
    if (current === 'mandje' && window.WKOrder) WKOrder.render();
  }

  /* ---------- kaart ---------- */
  function card(w, extra) {
    extra = extra || {};
    var tags = '';
    if (w.vegan === true) tags += '<span class="tag v">Vegan</span>';
    if (w.bio) tags += '<span class="tag v">Bio</span>';
    if (w.biodynamisch) tags += '<span class="tag v">Biodynamisch</span>';
    if (w.natuurwijn) tags += '<span class="tag v">Natuurwijn</span>';
    if (!w.voorraad) tags += '<span class="tag out">Niet op voorraad</span>';
    if (w.bron === 'demo') tags += '<span class="tag d">Demo</span>';
    w.aromas.slice(0, 3).forEach(function (a) { tags += '<span class="tag">' + esc(a) + '</span>'; });
    var why = '';
    if (extra.redenen && extra.redenen.length) why = '<ul class="why">' + extra.redenen.slice(0, 3).map(function (r) { return '<li class="' + (r.plus ? '' : 'min') + '">' + esc(r.t) + '</li>'; }).join('') + '</ul>';
    return '<article class="card" data-id="' + esc(w.id) + '">' +
      (extra.score != null ? '<div class="match" title="Match">' + extra.score + '%</div>' : '') +
      '<div class="kl"><span class="dot k-' + w.kleur + '"></span>' + esc(W.label(W.KLEUREN, w.kleur)) + (w.jaar ? ' · ' + esc(w.jaar) : '') + '</div>' +
      '<h3>' + esc(w.naam) + '</h3>' +
      '<div class="meta">' + esc([w.land, w.regio].filter(Boolean).join(' · ')) + (w.druiven.length ? ' — ' + esc(w.druiven.join(', ')) : '') + '</div>' +
      (w.omschrijving ? '<p class="desc">' + esc(w.omschrijving) + '</p>' : '') +
      '<div class="tags">' + tags + '</div>' + why +
      '<div class="card-foot"><span class="price">' + (w.prijs == null ? '<span class="meta">Prijs op aanvraag</span>' : W.euro(w.prijs)) + (w.inhoud && w.inhoud !== 75 ? ' <small class="meta">(' + w.inhoud + ' cl)</small>' : '') + '</span>' +
      '<button class="ic" data-fav="' + esc(w.id) + '" aria-label="Bewaar">' + (isFav(w.id) ? '♥' : '♡') + '</button>' +
      (ST.bestellen !== false ? '<button class="ic add" data-add="' + esc(w.id) + '" aria-label="In mandje">+</button>' : '') + '</div>' +
      '</article>';
  }
  document.addEventListener('click', function (e) {
    var fv = e.target.closest('[data-fav]');
    if (fv) { e.stopPropagation(); toggleFav(fv.dataset.fav); document.querySelectorAll('[data-fav="' + CSS.escape(fv.dataset.fav) + '"]').forEach(function (b) { b.textContent = b.classList.contains('cta') ? (isFav(fv.dataset.fav) ? '♥ Bewaard' : '♡ Bewaar') : (isFav(fv.dataset.fav) ? '♥' : '♡'); }); if (current === 'bewaard') renderFavs(); return; }
    var ad = e.target.closest('[data-add]');
    if (ad) { e.stopPropagation(); if (window.WKOrder) WKOrder.add(ad.dataset.add, 1); return; }
    var c = e.target.closest('.card[data-id]');
    if (c) openFiche(c.dataset.id);
  });

  /* ---------- sheet ---------- */
  function openSheet() { $('sheet').classList.add('on'); $('bd').classList.add('on'); $('sheet').scrollTop = 0; }
  function closeSheet() { $('sheet').classList.remove('on'); $('bd').classList.remove('on'); if (/#w=/.test(location.hash)) history.replaceState(null, '', location.pathname + location.search); }
  $('sx').onclick = closeSheet; $('bd').onclick = closeSheet;
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSheet(); });

  function openFiche(id) {
    var w = WINES.find(function (x) { return x.id === id; }); if (!w) return;
    var spec = [
      ['Kleur', W.label(W.KLEUREN, w.kleur)], ['Land', w.land], ['Regio', w.regio], ['Producent', w.producent],
      ['Jaargang', w.jaar], ['Druiven', w.druiven.join(', ')], ['Alcohol', w.alcohol != null ? String(w.alcohol).replace('.', ',') + ' %' : ''],
      ['Inhoud', w.inhoud ? w.inhoud + ' cl' : ''], ['Serveren', w.serveertemp], ['Vegan', W.veganLabel(w.vegan).replace('Vegan: ', '')],
      ['Bio', w.bio ? 'ja' : ''], ['Biodynamisch', w.biodynamisch ? 'ja' : ''], ['Natuurwijn', w.natuurwijn ? 'ja' : ''], ['Sulfieten', w.sulfietarm ? 'geen toegevoegd' : ''],
      ['Voorraad', w.voorraad ? 'op voorraad' : 'niet op voorraad']
    ].filter(function (s) { return s[1]; });
    var url = w.url || ST.webshop || '';
    var pairByGroup = {};
    w.pairing.forEach(function (p) { var g = W.GROEP_VAN[p] || p; (pairByGroup[g] = pairByGroup[g] || []).push(p); });
    $('sheet-body').innerHTML = '<div class="fiche">' +
      (w.foto ? '<img class="img" src="' + esc(w.foto) + '" alt="">' : '') +
      '<div class="kl up" style="color:var(--dim);display:flex;gap:6px;align-items:center"><span class="dot k-' + w.kleur + '"></span>' + esc(W.label(W.KLEUREN, w.kleur)) + '</div>' +
      '<h2>' + esc(w.naam) + '</h2>' +
      '<p class="price" style="font-size:22px;margin:8px 0">' + W.euro(w.prijs) + '</p>' +
      (w.omschrijving ? '<p>' + esc(w.omschrijving) + '</p>' : '') +
      '<div class="spec">' + spec.map(function (s) { return '<div><small>' + esc(s[0]) + '</small>' + esc(s[1]) + '</div>'; }).join('') + '</div>' +
      '<h3>Smaakprofiel</h3>' + W.bars(w.smaak) +
      (w.aromas.length ? '<h3>Aroma’s</h3><div class="tags">' + w.aromas.map(function (a) { return '<span class="tag">' + esc(a) + '</span>'; }).join('') + '</div>' : '') +
      (w.pairing.length ? '<h3>Lekker bij</h3><div class="tags">' + Object.keys(pairByGroup).map(function (g) {
        return pairByGroup[g].map(function (p) { return '<span class="tag">' + esc(W.label(W.INGREDIENTEN, p)) + '</span>'; }).join('');
      }).join('') + '</div>' : '') +
      (w.bron === 'kosmopoliet-kaart' ? '<p class="meta" style="margin-top:14px">Profiel afgeleid uit de proefnotitie; technische fiche nog te koppelen.</p>' : '') +
      '<div class="sheet-foot row">' +
      (ST.bestellen !== false ? '<div class="qty"><button data-q="-1" aria-label="min">−</button><input id="fq" type="number" min="1" value="1"><button data-q="1" aria-label="plus">+</button></div>' +
        '<button class="cta" id="f-add">In mandje</button>' : '') +
      '<button class="cta alt" data-fav="' + esc(w.id) + '">' + (isFav(w.id) ? '♥ Bewaard' : '♡ Bewaar') + '</button>' +
      (url ? '<a class="lnk" href="' + esc(url) + '" target="_blank" rel="noopener">' + (w.url ? 'Bekijk in de webshop' : 'Naar de webshop') + ' ↗</a>' : '') + '</div></div>';
    var fq = $('fq');
    if (fq) {
      $('sheet-body').querySelectorAll('[data-q]').forEach(function (b) { b.onclick = function () { fq.value = Math.max(1, (+fq.value || 1) + +b.dataset.q); }; });
      $('f-add').onclick = function () { WKOrder.add(w.id, Math.max(1, +fq.value || 1)); closeSheet(); };
    }
    openSheet();
    history.replaceState(null, '', '#w=' + encodeURIComponent(id));
  }

  /* ---------- ingrediëntkiezer (in groepen) ---------- */
  function ingPicker(el, sel, onChange, opts) {
    opts = opts || {};
    var open = {};
    function draw() {
      el.querySelectorAll('details').forEach(function (d) { open[d.dataset.g] = d.open; });
      el.innerHTML = W.GROEPEN.filter(function (g) { return !opts.skip || opts.skip.indexOf(g[0]) < 0; }).map(function (g, gi) {
        var items = [[g[0], 'Algemeen']].concat(g[2]);
        var n = items.filter(function (i) { return sel.indexOf(i[0]) >= 0; }).length;
        var isOpen = open[g[0]] != null ? open[g[0]] : (n > 0 || (opts.openFirst && gi < opts.openFirst));
        return '<details class="ing-grp" data-g="' + g[0] + '"' + (isOpen ? ' open' : '') + '><summary>' + esc(g[1]) + (n ? '<span class="sel">' + n + ' gekozen</span>' : '') + '</summary><div class="chips">' +
          items.map(function (i) { return '<button class="chip' + (i[0] === g[0] ? ' gen' : '') + (sel.indexOf(i[0]) >= 0 ? ' on' : '') + '" data-ing="' + i[0] + '">' + esc(i[1]) + '</button>'; }).join('') + '</div></details>';
      }).join('');
    }
    el.onclick = function (e) { var b = e.target.closest('[data-ing]'); if (!b) return; var i = sel.indexOf(b.dataset.ing); if (i >= 0) sel.splice(i, 1); else sel.push(b.dataset.ing); draw(); onChange && onChange(); };
    draw();
    return { redraw: draw };
  }

  function chipsHTML(list, cur, multi) { return list.map(function (c) { var on = multi ? cur.indexOf(c[0]) >= 0 : cur === c[0]; return '<button class="chip' + (on ? ' on' : '') + '" data-k="' + c[0] + '">' + c[1] + '</button>'; }).join(''); }
  function choiceHTML(list, cur) { return list.map(function (c) { return '<button class="choice' + (c[0] === cur ? ' on' : '') + '" data-k="' + c[0] + '"><b>' + c[1] + '</b><small>' + c[2] + '</small></button>'; }).join(''); }

  /* ---------- 1. advies ---------- */
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
  var wz = { gel: 'zomaar', stijl: 'verras', kleuren: [], ing: [] };
  function renderWizard() {
    $('w-gel').innerHTML = choiceHTML(GEL, wz.gel);
    $('w-stijl').innerHTML = choiceHTML(STIJL, wz.stijl);
    $('w-kleur').innerHTML = chipsHTML(W.KLEUREN, wz.kleuren, true);
  }
  $('w-gel').onclick = function (e) { var b = e.target.closest('[data-k]'); if (!b) return; wz.gel = b.dataset.k; renderWizard(); if (wz.gel === 'cadeau') toast('Tip: probeer ook het tabblad “Cadeau”'); };
  $('w-stijl').onclick = function (e) { var b = e.target.closest('[data-k]'); if (!b) return; wz.stijl = b.dataset.k; renderWizard(); };
  $('w-kleur').onclick = function (e) { var b = e.target.closest('[data-k]'); if (!b) return; var i = wz.kleuren.indexOf(b.dataset.k); if (i >= 0) wz.kleuren.splice(i, 1); else wz.kleuren.push(b.dataset.k); renderWizard(); };
  var wIng;
  $('w-reset').onclick = function () { wz.gel = 'zomaar'; wz.stijl = 'verras'; wz.kleuren.length = 0; wz.ing.length = 0; $('w-res').innerHTML = ''; renderWizard(); wIng.redraw(); };
  $('w-go').onclick = function () { runWizard(false); };
  function runWizard(silent) {
    var fx = { kleuren: wz.kleuren.slice() };
    if (wz.gel === 'feest' && !fx.kleuren.length) fx.kleuren = ['bubbels', 'rose', 'wit'];
    var pool = f(fx);
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
      ? '<h2 class="lead" style="font-size:28px;margin-bottom:14px">Onze suggesties voor jou</h2><div class="grid">' + res.map(function (r) { return card(r.w, r); }).join('') + '</div>'
      : '<div class="empty">Geen wijnen gevonden. Verruim je budget, je kleurkeuze of je voorkeuren.</div>';
    if (!silent) $('w-res').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------- 2. alle wijnen ---------- */
  var fl = { kleuren: [], pairing: [], smaak: {} }, fIng;
  function renderFilters() {
    $('f-kleur').innerHTML = chipsHTML(W.KLEUREN.filter(function (k) { return WINES.some(function (w) { return w.kleur === k[0]; }); }), fl.kleuren, true);
    $('f-smaak').innerHTML = W.SMAAKASSEN.filter(function (a) { return a[0] !== 'hout'; }).map(function (a) {
      var v = fl.smaak[a[0]];
      return '<div class="slid"><label><span>' + a[1] + '</span><span id="sv-' + a[0] + '" class="meta">' + (v ? a[2] + ' ' + '●'.repeat(v) + ' ' + a[3] : 'om het even') + '</span></label>' +
        '<input type="range" min="0" max="5" value="' + (v || 0) + '" data-ax="' + a[0] + '"></div>';
    }).join('');
  }
  $('f-kleur').onclick = function (e) { var b = e.target.closest('[data-k]'); if (!b) return; var i = fl.kleuren.indexOf(b.dataset.k); if (i >= 0) fl.kleuren.splice(i, 1); else fl.kleuren.push(b.dataset.k); b.classList.toggle('on'); renderList(); };
  $('f-smaak').oninput = function (e) {
    var ax = e.target.dataset.ax; if (!ax) return; var v = +e.target.value;
    if (v) fl.smaak[ax] = v; else delete fl.smaak[ax];
    var a = W.SMAAKASSEN.find(function (x) { return x[0] === ax; });
    $('sv-' + ax).textContent = v ? a[2] + ' ' + '●'.repeat(v) + ' ' + a[3] : 'om het even';
    renderList();
  };
  ['f-q', 'f-sort'].forEach(function (id) { $(id).addEventListener('input', renderList); });
  $('f-reset').onclick = function () { fl.kleuren.length = 0; fl.pairing.length = 0; fl.smaak = {}; $('f-q').value = ''; renderFilters(); fIng.redraw(); renderList(); };
  $('ft').onclick = function () { $('filters').classList.toggle('open'); };

  function renderList() {
    var hasTaste = Object.keys(fl.smaak).length;
    var list = f({ kleuren: fl.kleuren, pairing: fl.pairing, q: $('f-q').value.trim() }).map(function (w) { return { w: w, score: hasTaste ? W.tasteScore(w, fl.smaak) : null }; });
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
    $('f-list').innerHTML = list.length ? list.map(function (r) { return card(r.w, { score: r.score }); }).join('') : '<div class="empty">Geen wijnen met deze filters en voorkeuren.</div>';
  }

  /* ---------- 3. food pairing ---------- */
  var pd = { ing: [], bereiding: [], smaken: [], keuken: [], intensiteit: 3 };
  function renderPairChips() {
    $('p-ber').innerHTML = chipsHTML(W.BEREIDING, pd.bereiding, true);
    $('p-sm').innerHTML = chipsHTML(W.SMAKEN, pd.smaken, true);
    $('p-keuken').innerHTML = chipsHTML(W.KEUKENS.map(function (k) { return [k[0], k[1]]; }), pd.keuken, true);
    $('p-int').innerHTML = [[1, 'Heel licht'], [2, 'Licht'], [3, 'Gemiddeld'], [4, 'Krachtig'], [5, 'Heel krachtig']].map(function (i) { return '<button class="' + (pd.intensiteit === i[0] ? 'on' : '') + '" data-k="' + i[0] + '">' + i[1] + '</button>'; }).join('');
  }
  function renderPairRes() {
    if (!pd.ing.length && !pd.smaken.length && !pd.bereiding.length && !pd.keuken.length) { $('p-res').innerHTML = '<div class="empty">Kies minstens één ingrediënt, bereiding of smaak.</div>'; return; }
    var r = W.rankForDish(f(), pd, 9);
    $('p-res').innerHTML = r.length ? '<h2 class="lead" style="font-size:28px;margin:10px 0 14px">Beste combinaties</h2><div class="grid">' + r.map(function (x) { return card(x.w, x); }).join('') + '</div>' : '<div class="empty">Geen wijnen binnen je voorkeuren.</div>';
  }
  [['p-ber', 'bereiding'], ['p-sm', 'smaken'], ['p-keuken', 'keuken']].forEach(function (x) {
    $(x[0]).onclick = function (e) { var b = e.target.closest('[data-k]'); if (!b) return; var a = pd[x[1]], i = a.indexOf(b.dataset.k); if (i >= 0) a.splice(i, 1); else a.push(b.dataset.k); renderPairChips(); renderPairRes(); };
  });
  $('p-int').onclick = function (e) { var b = e.target.closest('[data-k]'); if (!b) return; pd.intensiteit = +b.dataset.k; renderPairChips(); renderPairRes(); };

  /* ---------- bewaard ---------- */
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
  $('fav-cart').onclick = function () { if (!favs.length) return; favs.forEach(function (id) { if (WINES.some(function (w) { return w.id === id; })) WKOrder.add(id, 1, { stil: true }); }); toast('Bewaarde wijnen in je mandje'); };
  $('cart-open').onclick = function () { show('mandje'); };

  /* ---------- start ---------- */
  W.load({ preferDraft: params.has('voorbeeld') }).then(function (db) {
    ST = db.instellingen || {}; WINES = db.wijnen;
    var maxP = Math.max.apply(null, WINES.map(function (w) { return w.prijs || 0; }).concat([30]));
    PMAX = Math.ceil(maxP / 10) * 10;
    W.applyTheme(ST);
    if (ST.naam) { $('b-naam').textContent = ST.naam; document.title = 'Wijnkiezer · ' + ST.naam; $('logo').alt = ST.naam; }
    if (ST.baseline) $('b-base').textContent = ST.baseline;
    if (ST.logo) $('logo').src = ST.logo;
    if (ST.bestellen === false) $('cart-open').hidden = true;
    $('demo-note').hidden = !(ST.toonDemo !== false && WINES.some(function (w) { return w.bron === 'demo' && w.actief; }));
    $('foot').innerHTML = (ST.logo || true ? '<img src="' + esc(ST.logo || 'logo.png') + '" alt="">' : '') + esc(ST.naam || '') + (ST.contact ? ' · ' + esc(ST.contact) : '') +
      (ST.webshop ? ' · <a href="' + esc(ST.webshop) + '" target="_blank" rel="noopener">webshop</a>' : '') +
      (params.has('voorbeeld') ? '<br><b>Voorbeeldweergave van niet-gepubliceerde wijzigingen</b>' : '');

    window.WK = { card: card, wines: function () { return WINES; }, st: function () { return ST; }, f: f, pre: function () { return pre; }, prijs: prijs, pmax: function () { return PMAX; },
      budgetSlider: budgetSlider, ingPicker: ingPicker, toast: toast, show: show, isFav: isFav, toggleFav: toggleFav, openFiche: openFiche, openSheet: openSheet, closeSheet: closeSheet };
    if (window.WKOrder) WKOrder.init();
    if (window.WKTools && WKTools.init) WKTools.init();

    renderWizard(); renderFilters(); renderPairChips(); updFavCnt(); renderPrebar();
    budgetSlider($('w-bud')); budgetSlider($('f-bud'));
    wIng = ingPicker($('w-ing'), wz.ing, null, { skip: ['aperitief'] });
    fIng = ingPicker($('f-pair'), fl.pairing, renderList);
    ingPicker($('p-ing'), pd.ing, renderPairRes, { openFirst: 1 });
    if (params.get('lijst')) show('bewaard');
    if (params.get('tab')) show(params.get('tab'));
    var m = location.hash.match(/w=([^&]+)/); if (m) openFiche(decodeURIComponent(m[1]));
  }).catch(function (e) {
    console.error(e);
    document.querySelector('main').innerHTML = '<div class="empty">De wijnlijst kon niet geladen worden (' + esc(e.message) + ').</div>';
  });

  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(function () {});
})();
