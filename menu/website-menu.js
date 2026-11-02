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
  function priceHtml(it, cls) { return KosmoMenuUI.price(D, it, cls); }
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
    var cats = KosmoMenuUI.cats(D);
    if (!state.activeCat || !cats.some(function (c) { return c.id === state.activeCat; })) {
      state.activeCat = cats.length ? cats[0].id : null;
    }
    renderCats(cats);
    renderItems();
  }

  function renderCats(cats) {
    KosmoMenuUI.chips($('#cat-bar'), cats, state.activeCat, function (c) {
      state.activeCat = c.id; renderCats(cats); renderItems();
      document.querySelector('.items').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function renderItems() {
    var wrap = $('#items'); wrap.innerHTML = '';
    var cat = D.getCategories().find(function (c) { return c.id === state.activeCat; });
    if (!cat) { wrap.appendChild(el('p', 'basket-empty', 'Nog geen categorieën.')); return; }
    var kind = KosmoMenuUI.kind(cat);
    wrap.appendChild(el('h2', 'cat-title k-' + kind, esc(cat.name)));
    var items = KosmoMenuUI.items(D, cat);
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
    KosmoMenuUI.opened($('#' + name + '-sheet'));
    $('#' + name + '-sheet').classList.add('show');
    $('#backdrop').classList.add('show');
    document.body.style.overflow = 'hidden';
  }
  function closeSheet() {
    document.querySelectorAll('.sheet').forEach(function (s) { s.classList.remove('show'); });
    $('#backdrop').classList.remove('show');
    document.body.style.overflow = '';
    KosmoMenuUI.closed();
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
    KosmoMenuUI.init(closeSheet);
    $('#backdrop').addEventListener('click', closeSheet);
    document.querySelectorAll('[data-close]').forEach(function (b) { b.addEventListener('click', closeSheet); });
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
