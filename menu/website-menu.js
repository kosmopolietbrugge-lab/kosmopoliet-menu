/* ============================================================
   Kosmopoliet — "website menu": de kaart, enkel om in te kijken.
   Voor online bezoekers (bv. ingebed op de website). Geen tafelnummer, geen
   mandje, geen bestelknop — bestellen kan enkel ter plaatse via menu.html
   met een geactiveerde tafel.

   Haalt dezelfde gegevens op als het echte klantmenu, via hetzelfde
   doorgeefluik (menu/gast-sync.js -> /gast/kaart). Geen eigen databron:
   zo toont deze kaart altijd exact dezelfde items als de kaart die later
   met de kassa (GKS) verbonden wordt — er is maar één plek die bepaalt
   wat erop staat (js/data.js).
   ============================================================ */
(function () {
  'use strict';
  var D = window.KosmoData;

  function $(s, r) { return (r || document).querySelector(s); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
  function euro(n) { return '€ ' + Number(n || 0).toFixed(2).replace('.', ','); }
  function effPrice(it) { return (D.effectivePrice ? D.effectivePrice(it) : Number(it.price || 0)); }
  function priceHtml(it, cls) {
    cls = cls || 'price';
    var pct = D.promoActivePct ? D.promoActivePct(it) : Number(it.promoPct || 0);
    if (pct > 0 && pct <= 100) {
      var pi = D.promoInfo ? D.promoInfo(it) : null, until = pi && pi.until ? ' <small class="promo-until">t/m ' + D.promoUntilLabel(pi.until) + '</small>' : '';
      return '<span class="' + cls + ' promo"><s>' + euro(it.price) + '</s> ' + euro(effPrice(it)) + ' <b class="promo-badge">-' + Math.round(pct) + '%</b>' + until + '</span>';
    }
    return '<span class="' + cls + '">' + euro(it.price) + '</span>';
  }
  // Een promotie eindigt zonder dat de kaart ververst: elke halve minuut kijken of er iets wijzigde en dan opnieuw tekenen.
  var _promoSig = '';
  function promoSig() { try { return D.getItems(null, true).map(function (i) { return D.promoActivePct ? D.promoActivePct(i) : 0; }).join(','); } catch (e) { return ''; } }
  function watchPromos(redraw) { _promoSig = promoSig(); setInterval(function () { var s = promoSig(); if (s !== _promoSig) { _promoSig = s; redraw(); } }, 30000); }

  var state = { activeCat: null };

  function renderHead() {
    var v = D.getVisual();
    $('#m-bg').style.backgroundImage = 'url("' + (D.resolveImg(v.heroImg) || 'assets/img/hero.jpg') + '")';
    $('#m-logo').src = D.resolveImg(v.logo) || 'assets/img/mark-gold.png';
    $('#m-name').textContent = v.name;
    $('#m-baseline').textContent = v.baseline;
  }

  function renderMenu() {
    renderHead();
    function specialRank(s) { return (s.indexOf('suggest') >= 0 || s.indexOf('aanrad') >= 0) ? 0 : ((s.indexOf('promo') >= 0 || s.indexOf('acti') >= 0) ? 1 : -1); }
    function isSpecialName(s) { return specialRank(s) >= 0; }
    var cats = D.getCategories().filter(function (c) {
      var s = ((c.id || '') + ' ' + (c.name || '')).toLowerCase();
      if (isSpecialName(s)) return true;
      return D.getItems(c.id, true).length > 0;
    });
    function catRank(c) {
      var s = ((c.id || '') + ' ' + (c.name || '')).toLowerCase();
      var sp = specialRank(s);
      if (sp >= 0) return sp;
      if (c.source === 'barzaal') return 2;
      return 3;
    }
    cats = cats.map(function (c, i) { return { c: c, i: i, r: catRank(c), course: (c.course || 99) }; })
      .sort(function (a, b) {
        if (a.r !== b.r) return a.r - b.r;
        if (a.r === 3 && a.course !== b.course) return a.course - b.course;
        return a.i - b.i;
      })
      .map(function (o) { return o.c; });
    if (!state.activeCat || !cats.some(function (c) { return c.id === state.activeCat; })) {
      state.activeCat = cats.length ? cats[0].id : null;
    }
    renderCats(cats);
    renderItems();
  }

  function renderCats(cats) {
    var bar = $('#cat-bar'); bar.innerHTML = '';
    cats.forEach(function (c) {
      var b = el('button', 'cat-chip' + (c.id === state.activeCat ? ' active' : ''), esc(c.name));
      b.addEventListener('click', function () {
        state.activeCat = c.id; renderCats(cats); renderItems();
        document.querySelector('.items').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      bar.appendChild(b);
    });
  }

  function renderItems() {
    var wrap = $('#items'); wrap.innerHTML = '';
    var cat = D.getCategories().find(function (c) { return c.id === state.activeCat; });
    if (!cat) { wrap.appendChild(el('p', 'basket-empty', 'Nog geen categorieën.')); return; }
    wrap.appendChild(el('h2', 'cat-title', esc(cat.name)));
    var items = D.getItems(cat.id, true);
    var catName = ((cat.id || '') + ' ' + (cat.name || '')).toLowerCase();
    var special = (catName.indexOf('suggest') >= 0 || catName.indexOf('aanrad') >= 0 || catName.indexOf('promo') >= 0 || catName.indexOf('acti') >= 0);
    if (special && D.itemCourse) {
      items = items.map(function (it, i) { return { it: it, i: i, c: D.itemCourse(it) }; })
        .sort(function (a, b) { return a.c - b.c || a.i - b.i; })
        .map(function (o) { return o.it; });
    }
    if (!items.length) { wrap.appendChild(el('p', 'basket-empty', 'Nog geen gerechten in deze categorie.')); return; }
    items.forEach(function (it) { wrap.appendChild(itemCard(it)); });
  }

  function itemCard(it) {
    var card = el('div', 'item wm-item');
    var img = el('img', 'thumb'); img.src = D.imgFor(it); img.alt = esc(it.name); img.loading = 'lazy';
    var info = el('div', 'info',
      '<h3>' + esc(it.name) + '</h3><p>' + esc(it.short) + '</p>' +
      '<div class="foot">' + priceHtml(it, 'price') + '</div>');
    img.addEventListener('click', function () { openDetail(it.id); });
    info.addEventListener('click', function () { openDetail(it.id); });
    card.appendChild(img); card.appendChild(info);
    return card;
  }

  function openDetail(id) {
    var it = D.getItem(id); if (!it) return;
    var body = $('#detail-body');
    var alg = (it.allergens && it.allergens.length)
      ? it.allergens.map(function (a) { return '<span class="allergen">' + esc(a) + '</span>'; }).join('')
      : '<span class="allergen none">Geen van de 14 wettelijke allergenen gemeld</span>';
    body.innerHTML =
      '<img class="detail-img" src="' + D.imgFor(it) + '" alt="' + esc(it.name) + '">' +
      '<h2 class="detail-name">' + esc(it.name) + '</h2>' +
      '<p class="detail-long">' + esc(it.long || it.short) + '</p>' +
      (it.extra ? '<div class="detail-extra">' + esc(it.extra) + '</div>' : '') +
      '<p class="block-title">Allergenen</p><div class="allergens">' + alg + '</div>';
    $('#detail-foot').innerHTML = priceHtml(it, 'detail-price');
    openSheet('detail');
  }

  function openSheet(name) {
    $('#' + name + '-sheet').classList.add('show');
    $('#backdrop').classList.add('show');
    document.body.style.overflow = 'hidden';
  }
  function closeSheet() {
    document.querySelectorAll('.sheet').forEach(function (s) { s.classList.remove('show'); });
    $('#backdrop').classList.remove('show');
    document.body.style.overflow = '';
  }

  /* ---------- taal (Google Translate) ---------- */
  var _gtReady = false;
  window.googleTranslateElementInit = function () {
    try { new google.translate.TranslateElement({ pageLanguage: 'nl', autoDisplay: false }, 'google_translate_element'); } catch (e) {}
  };
  function ensureGT(cb) {
    if (document.querySelector('.goog-te-combo')) { if (cb) cb(); return; }
    if (!_gtReady) {
      _gtReady = true;
      var sc = document.createElement('script');
      sc.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      document.head.appendChild(sc);
    }
    var n = 0, iv = setInterval(function () { if (document.querySelector('.goog-te-combo')) { clearInterval(iv); if (cb) cb(); } else if (++n > 40) clearInterval(iv); }, 150);
  }
  function openLangFloat() {
    var f = $('#lang-float'); if (f) f.classList.add('show');
    ensureGT(function () {
      var c = document.querySelector('.goog-te-combo');
      if (c && !c._wired) { c._wired = true; c.addEventListener('change', function () { try { if (window.I18N) { if (c.value) I18N.pause(); else I18N.resume(); } } catch (e) {} }); }
    });
  }
  function closeLangFloat() { var f = $('#lang-float'); if (f) f.classList.remove('show'); }

  function init() {
    if (!D) { document.body.innerHTML = '<p style="padding:40px;color:#fff">Data-laag niet geladen.</p>'; return; }
    $('#backdrop').addEventListener('click', closeSheet);
    document.querySelectorAll('[data-langfloat]').forEach(function (b) { b.addEventListener('click', openLangFloat); });
    var lfc = $('#lf-close'); if (lfc) lfc.addEventListener('click', closeLangFloat);
    var lf = $('#lang-float'); if (lf) lf.addEventListener('click', function (e) { if (e.target === lf) closeLangFloat(); });

    var gastReady = (window.KosmoGastReady && window.KosmoGastReady.catch(function () {})) || Promise.resolve();
    gastReady.then(function () {
      D.ready(function () {
        renderMenu(); watchPromos(renderMenu);
        D.subscribe(function (kind) { if (kind === 'data') renderMenu(); });
      });
    });
  }
  document.addEventListener('DOMContentLoaded', init);
})();
