/* ============================================================
   Kosmopoliet — gedeeld stuk van de klantkaart (menu.html) en de inkijk-kaart (website-menu.html)
   1. Welke categorieën er zijn, in welke volgorde en van welke soort (special / drank / eten) — de soort bepaalt de kleur.
   2. Het onderste scherm (detail, mandje, bestelling): naar beneden schuiven sluit het, net als de terugknop van de telefoon.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- categorieën ---------- */
  function text(c) { return ((c.id || '') + ' ' + (c.name || '')).toLowerCase(); }
  // 'special' = Specials, Suggesties en Promoties (altijd vooraan, eigen kleur); 'drink' = bar/zaal; 'food' = keuken.
  function kind(c) {
    var s = text(c);
    if (c.id === 'specials' || /\bspecials?\b/.test(s) || s.indexOf('suggest') >= 0 || s.indexOf('aanrad') >= 0 || s.indexOf('promo') >= 0 || s.indexOf('acti') >= 0) return 'special';
    return c.source === 'barzaal' ? 'drink' : 'food';
  }
  function rank(c) {
    var s = text(c);
    if (c.id === 'specials' || /\bspecials?\b/.test(s)) return 0;
    if (s.indexOf('suggest') >= 0 || s.indexOf('aanrad') >= 0) return 1;
    if (kind(c) === 'special') return 2;
    return c.source === 'barzaal' ? 3 : 4;
  }
  // De categorieën die gasten zien: Specials, Suggesties en Promoties blijven staan (ook leeg, behalve Specials), de rest enkel met beschikbare gerechten.
  // Volgorde: Specials, Suggesties, Promoties, drank (bar/zaal), eten (keuken, voor → hoofd → dessert).
  function cats(D) {
    return D.getCategories().filter(function (c) {
      if (kind(c) === 'special' && rank(c) !== 0) return true;
      return D.getItems(c.id, true).length > 0;
    }).map(function (c, i) { return { c: c, i: i, r: rank(c), course: c.course || 99 }; })
      .sort(function (a, b) {
        if (a.r !== b.r) return a.r - b.r;
        if (a.r === 4 && a.course !== b.course) return a.course - b.course;
        return a.i - b.i;
      }).map(function (o) { return o.c; });
  }
  // Vult de balk met categorie-knoppen. De schuifstand blijft behouden en de gekozen knop komt in beeld.
  function chips(bar, list, activeId, onPick) {
    var keep = bar.scrollLeft, prev = null, active = null;
    bar.innerHTML = '';
    list.forEach(function (c) {
      var k = kind(c), b = document.createElement('button');
      b.className = 'cat-chip k-' + k + (c.id === activeId ? ' active' : '') + (prev && prev !== k ? ' grp-start' : '');
      b.textContent = c.name; prev = k;
      if (c.id === activeId) active = b;
      b.addEventListener('click', function () { onPick(c); });
      bar.appendChild(b);
    });
    bar.scrollLeft = keep;
    if (active) {
      var l = active.offsetLeft, r = l + active.offsetWidth;
      if (l < bar.scrollLeft + 8 || r > bar.scrollLeft + bar.clientWidth - 8) bar.scrollLeft = Math.max(0, l - (bar.clientWidth - active.offsetWidth) / 2);
    }
  }

  // De gerechten van een categorie, in de volgorde van de kaart. Specials houdt de volgorde van de kaart (zelf te schuiven in
  // Menukaart-beheer); Suggesties/Promoties staan op gang (voor → hoofd → dessert → drank).
  function items(D, cat) {
    var list = D.getItems(cat.id, true);
    if (kind(cat) === 'special' && cat.id !== 'specials' && D.itemCourse) {
      list = list.map(function (it, i) { return { it: it, i: i, c: D.itemCourse(it) }; })
        .sort(function (a, b) { return a.c - b.c || a.i - b.i; })
        .map(function (o) { return o.it; });
    }
    return list;
  }
  // De prijs van een gerecht, met promotie (doorgestreepte prijs, percentage, einddatum) als die loopt.
  // opts.plain = zonder €-teken en zonder ,00 (voor de etalagekaart).
  function euro(n, plain) { n = Number(n || 0); return plain ? (n % 1 === 0 ? String(n) : n.toFixed(2).replace('.', ',')) : '€ ' + n.toFixed(2).replace('.', ','); }
  function price(D, it, cls, plain) {
    cls = cls || 'price';
    var eff = D.effectivePrice ? D.effectivePrice(it) : Number(it.price || 0);
    var pct = D.promoActivePct ? D.promoActivePct(it) : Number(it.promoPct || 0);
    if (pct > 0 && pct <= 100) {
      var pi = D.promoInfo ? D.promoInfo(it) : null, until = pi && pi.until ? ' <small class="promo-until">t/m ' + D.promoUntilLabel(pi.until) + '</small>' : '';
      return '<span class="' + cls + ' promo"><s>' + euro(it.price, plain) + '</s> ' + euro(eff, plain) + ' <b class="promo-badge">-' + Math.round(pct) + '%</b>' + until + '</span>';
    }
    return '<span class="' + cls + '">' + euro(it.price, plain) + '</span>';
  }

  /* ---------- onderste schermen ---------- */
  var pushed = false, closer = null;
  // Telefoonknop "terug" sluit het open scherm in plaats van de kaart te verlaten.
  function opened(sheet) {
    if (sheet) clean(sheet);
    if (!pushed) { try { history.pushState({ kosmoSheet: 1 }, ''); pushed = true; } catch (e) {} }
  }
  function closed() {
    if (pushed) { pushed = false; try { history.back(); } catch (e) {} }
  }
  window.addEventListener('popstate', function () {
    if (pushed) { pushed = false; if (closer) closer(); }
  });
  function clean(sheet) {
    sheet.style.transform = ''; sheet.style.transition = '';
    var b = document.getElementById('backdrop'); if (b) { b.style.opacity = ''; b.style.transition = ''; }
  }

  // Naar beneden schuiven: vanaf het streepje bovenaan altijd, en vanuit de inhoud zodra die bovenaan staat.
  function drag(sheet, close) {
    var inner = sheet.querySelector('.sheet-inner'), back = document.getElementById('backdrop');
    var y0 = 0, dy = 0, t0 = 0, tracking = false, dragging = false, fromGrip = false;
    function reset() { tracking = false; dragging = false; dy = 0; }
    sheet.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1 || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) { reset(); return; }
      tracking = true; dragging = false; dy = 0; y0 = e.touches[0].clientY; t0 = Date.now();
      fromGrip = !!(e.target.closest && e.target.closest('.grip'));
    }, { passive: true });
    sheet.addEventListener('touchmove', function (e) {
      if (!tracking) return;
      var y = e.touches[0].clientY;
      if (!dragging) {
        if ((!fromGrip && inner && inner.scrollTop > 0) || y <= y0) { y0 = y; t0 = Date.now(); return; }   // nog aan het lezen/scrollen: opnieuw beginnen te meten
        if (y - y0 < 6) return;
        dragging = true; sheet.style.transition = 'none'; if (back) back.style.transition = 'none';
      }
      dy = Math.max(0, y - y0);
      if (e.cancelable) e.preventDefault();
      sheet.style.transform = 'translateY(' + dy + 'px)';
      if (back) back.style.opacity = String(Math.max(0, 1 - dy / Math.max(240, sheet.offsetHeight)));
    }, { passive: false });
    function end() {
      if (!dragging) { reset(); return; }
      var far = dy, fast = dy / Math.max(1, Date.now() - t0) > 0.55;
      reset();
      if (far > 110 || (far > 40 && fast) || (sheet.getBoundingClientRect().top > window.innerHeight * 0.6)) {
        sheet.style.transition = ''; if (back) back.style.transition = '';
        sheet.style.transform = 'translateY(100%)';       // doorschuiven tot onderaan, dan echt sluiten
        close();
        setTimeout(function () { if (!sheet.classList.contains('show')) clean(sheet); }, 360);
      } else {                                              // te kort: terugveren
        sheet.style.transition = 'transform .25s cubic-bezier(.2,.7,.2,1)'; sheet.style.transform = 'translateY(0)';
        if (back) { back.style.transition = ''; back.style.opacity = ''; }
        setTimeout(function () { clean(sheet); }, 280);
      }
    }
    sheet.addEventListener('touchend', end);
    sheet.addEventListener('touchcancel', end);
  }

  function init(closeAll) {
    closer = closeAll;
    document.querySelectorAll('.sheet').forEach(function (s) { drag(s, closeAll); });
  }

  window.KosmoMenuUI = { kind: kind, cats: cats, items: items, price: price, euro: euro, chips: chips, init: init, opened: opened, closed: closed };
})();

/* ============================================================
   Allergie of intolerantie? — gedeeld door menu.html (met bestellen) en website-menu.html (enkel kijken).
   De keuze blijft op het toestel van de gast (sessionStorage); ze gaat enkel mee als de gast ze op de bon wil.
   De kaart zegt nooit "veilig": altijd "volgens onze recepten".
   ============================================================ */
(function () {
  'use strict';
  var UI = window.KosmoMenuUI; if (!UI) return;
  var KEY = 'kosmo-gast-allergeen';
  var LIJST = ['Gluten', 'Schaaldieren', 'Eieren', 'Vis', 'Pinda', 'Soja', 'Melk', 'Noten', 'Selderij', 'Mosterd', 'Sesam', 'Sulfiet', 'Lupine', 'Weekdieren'];
  var SUBS = { Gluten: ['Tarwe', 'Spelt', 'Kamut', 'Rogge', 'Gerst', 'Haver'], Noten: ['Amandel', 'Hazelnoot', 'Walnoot', 'Cashew', 'Pecan', 'Paranoot', 'Pistache', 'Macadamia'] };
  var opt = { bestellen: false, open: function () {}, close: function () {}, opnieuw: function () {} };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
  function leeg() { return { lijst: [], subs: {}, soort: 'allergie', toon: false, bon: false }; }
  function lees() { try { var o = JSON.parse(sessionStorage.getItem(KEY) || 'null'); if (o && Array.isArray(o.lijst)) { o.subs = o.subs || {}; return o; } } catch (e) {} return leeg(); }
  var st = lees();
  function bewaar() { try { sessionStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  // "NL / EN": in het Nederlands het eerste deel, anders het tweede (als dat er is).
  function deel(n) { var d = String(n || '').split(' / '), nl = !window.I18N || !window.I18N.getLang || window.I18N.getLang() === 'nl'; return (nl ? d[0] : (d[1] || d[0])).trim(); }
  // nee = bevat wat de gast koos; vraag = niet na te gaan; ok = volgens de recepten niet aanwezig.
  // De subgroepen van dit gerecht; leeg of met '?' = niet (volledig) gekend.
  function subsVan(it, a) {
    var uitRecept = (it.allergenInfo && it.allergenInfo.sub && it.allergenInfo.sub[a]) || [], hand = (it.allergenSub && it.allergenSub[a]) || [];
    return uitRecept.concat(hand.filter(function (x) { return uitRecept.indexOf(x) < 0; }));
  }
  // Koos de gast een subgroep, dan telt een gerecht enkel niet mee als we zeker weten dat het die subgroep niet bevat.
  function telt(it, a, keuze) {
    var wil = (keuze || {})[a], heeft = subsVan(it, a);
    if (!wil || !wil.length || !heeft.length || heeft.indexOf('?') >= 0) return true;
    return heeft.some(function (x) { return wil.indexOf(x) >= 0; });
  }
  function klasse(it, lijst, keuze) {
    if (keuze === undefined) keuze = st.subs;
    var hit = (it.allergens || []).filter(function (a) { return lijst.indexOf(a) >= 0 && telt(it, a, keuze); });
    if (hit.length) return { k: 'nee', hit: hit };
    if (!it.allergenInfo || it.allergenInfo.onbekend) return { k: 'vraag', hit: [] };
    return { k: 'ok', hit: [] };
  }
  // "Gluten (Tarwe, …)". Elk woord apart, zodat de vertaling het vindt.
  function naamHtml(it, a) {
    var s = subsVan(it, a), echt = s.filter(function (x) { return x !== '?'; });
    return '<span>' + esc(a) + '</span>' + (echt.length ? ' (' + echt.map(function (x) { return '<span>' + esc(x) + '</span>'; }).join(', ') + (s.indexOf('?') >= 0 ? ', …' : '') + ')' : '');
  }
  function spoorHtml(it, hit) {
    var sporen = (it.allergenInfo && it.allergenInfo.sporen) || [];
    return hit.map(function (a) {
      var wil = st.subs[a] || [];
      var regels = st.toon ? sporen.filter(function (s) { return s.a === a && (s.i || s.b) && (!wil.length || !s.s || s.s.some(function (x) { return wil.indexOf(x) >= 0; })); }) : [];
      if (!regels.length) return '<div class="alg-gast-spoor"><span class="allergen">' + naamHtml(it, a) + '</span></div>';
      return regels.map(function (s) {
        return '<div class="alg-gast-spoor"><span class="allergen">' + naamHtml(it, a) + '</span> ' + [s.i, s.b].filter(Boolean).map(function (x) { return '<span>' + esc(deel(x)) + '</span>'; }).join(' · ') + '</div>';
      }).join('');
    }).join('');
  }
  function aan() { return st.lijst.length > 0; }
  // Lijst van één categorie, gesplitst in drie groepen. kaartje(it) tekent het gerecht zoals de pagina dat gewoon doet.
  function groepen(wrap, items, kaartje) {
    var g = { ok: [], nee: [], vraag: [] };
    items.forEach(function (it) { var c = klasse(it, st.lijst); g[c.k].push({ it: it, hit: c.hit }); });
    var uitleg = document.createElement('p'); uitleg.className = 'alg-gast-uitleg';
    uitleg.textContent = st.soort === 'intolerantie' ? 'Volgens onze recepten. Kleine sporen zijn mogelijk.' : 'Kruisbesmetting is niet uit te sluiten. Meld je allergie aan de bediening.';
    wrap.appendChild(uitleg);
    [['ok', 'Geschikt volgens onze recepten'], ['nee', 'Bevat wat je koos'], ['vraag', st.soort === 'intolerantie' ? 'Vraag het aan de bediening' : 'Niet aangeraden: vraag het aan de bediening']].forEach(function (x) {
      if (!g[x[0]].length) return;
      var kop = document.createElement('p'); kop.className = 'block-title alg-gast-kop alg-gast-' + x[0]; kop.textContent = x[1];
      wrap.appendChild(kop);
      g[x[0]].forEach(function (r) {
        var c = kaartje(r.it);
        if (r.hit.length) { var info = c.querySelector('.info'); var s = document.createElement('div'); s.innerHTML = spoorHtml(r.it, r.hit); if (info) info.insertBefore(s, info.querySelector('.foot')); }
        wrap.appendChild(c);
      });
    });
  }
  // Het blok "Allergenen" in het detailscherm.
  function blok(it) {
    var alg = it.allergens || [], onbekend = !it.allergenInfo || it.allergenInfo.onbekend, h = alg.map(function (a) { return '<span class="allergen">' + naamHtml(it, a) + '</span>'; }).join('');
    if (!alg.length) h = '<span class="allergen none">' + (onbekend ? 'Vraag het aan de bediening' : 'Geen van de 14 wettelijke allergenen gemeld') + '</span>';
    else if (onbekend) h += '<span class="allergen none">Mogelijk meer: vraag het aan de bediening</span>';
    var hit = aan() ? klasse(it, st.lijst).hit : [];
    return '<div class="allergens">' + h + '</div>' + (st.toon && hit.length ? '<div class="alg-gast-detail">' + spoorHtml(it, hit) + '</div>' : '');
  }
  function bar() {
    var host = document.getElementById('alg-bar'); if (!host) return;
    host.innerHTML = aan()
      ? '<button type="button" class="alg-gast-knop on"><span>' + (st.soort === 'intolerantie' ? 'Intolerantie' : 'Allergie') + '</span>: ' + st.lijst.map(function (a) { return '<span>' + esc(a) + '</span>' + ((st.subs[a] || []).length ? ' (' + st.subs[a].map(function (x) { return '<span>' + esc(x) + '</span>'; }).join(', ') + ')' : ''); }).join(', ') + ' <u>Wijzig</u></button>'
      : '<button type="button" class="alg-gast-knop"><span>Allergie of intolerantie?</span></button>';
    host.firstChild.addEventListener('click', paneel);
  }
  function paneel() {
    var nu = JSON.parse(JSON.stringify(st)), body = document.getElementById('allergeen-body');
    function teken() {
      body.innerHTML =
        '<h2 class="detail-name">Allergie of intolerantie?</h2>' +
        '<p class="block-title">Welke allergenen?</p><div class="alg-gast-chips">' + LIJST.map(function (a) { return '<button type="button" class="alg-gast-chip' + (nu.lijst.indexOf(a) >= 0 ? ' on' : '') + '" data-a="' + a + '" aria-pressed="' + (nu.lijst.indexOf(a) >= 0) + '">' + a + '</button>'; }).join('') + '</div>' +
        nu.lijst.filter(function (a) { return SUBS[a]; }).map(function (a) {
          return '<div class="alg-gast-sub"><b>' + a + '</b> <small>Welke soort? Niets aangeduid = alle soorten</small><div class="alg-gast-chips">' + SUBS[a].map(function (s) {
            var op = (nu.subs[a] || []).indexOf(s) >= 0;
            return '<button type="button" class="alg-gast-chip klein' + (op ? ' on' : '') + '" data-sa="' + a + '" data-ss="' + s + '" aria-pressed="' + op + '">' + s + '</button>';
          }).join('') + '</div></div>';
        }).join('') +
        '<p class="block-title">Wat is het?</p><div class="alg-gast-soort">' +
          '<button type="button" class="' + (nu.soort !== 'intolerantie' ? 'on' : '') + '" data-s="allergie" aria-pressed="' + (nu.soort !== 'intolerantie') + '"><b>Allergie</b><small>Ook sporen kunnen gevaarlijk zijn</small></button>' +
          '<button type="button" class="' + (nu.soort === 'intolerantie' ? 'on' : '') + '" data-s="intolerantie" aria-pressed="' + (nu.soort === 'intolerantie') + '"><b>Intolerantie</b><small>Kleine hoeveelheden gaan meestal</small></button></div>' +
        '<label class="alg-gast-vink"><input type="checkbox" id="alg-toon"' + (nu.toon ? ' checked' : '') + '> <span>Toon waar het in zit</span></label>' +
        (opt.bestellen ? '<label class="alg-gast-vink"><input type="checkbox" id="alg-bon"' + (nu.bon ? ' checked' : '') + '> <span>Zet dit op mijn bestelling, zodat de keuken het ziet</span></label>' : '') +
        '<div class="basket-actions"><button type="button" class="btn-ghost" id="alg-wis">Wissen</button><button type="button" class="btn-primary" id="alg-ok">Toon de kaart</button></div>';
      body.querySelectorAll('[data-a]').forEach(function (b) { b.addEventListener('click', function () { var a = b.getAttribute('data-a'), i = nu.lijst.indexOf(a); if (i >= 0) { nu.lijst.splice(i, 1); delete nu.subs[a]; } else nu.lijst.push(a); lees2(); teken(); }); });
      body.querySelectorAll('[data-ss]').forEach(function (b) { b.addEventListener('click', function () { var a = b.getAttribute('data-sa'), s = b.getAttribute('data-ss'), l = nu.subs[a] = nu.subs[a] || [], i = l.indexOf(s); if (i >= 0) l.splice(i, 1); else l.push(s); if (!l.length) delete nu.subs[a]; lees2(); teken(); }); });
      body.querySelectorAll('[data-s]').forEach(function (b) { b.addEventListener('click', function () { nu.soort = b.getAttribute('data-s'); lees2(); teken(); }); });
      document.getElementById('alg-wis').addEventListener('click', function () { pas(leeg()); });
      document.getElementById('alg-ok').addEventListener('click', function () { lees2(); pas(nu); });
    }
    function lees2() { var t = document.getElementById('alg-toon'), o = document.getElementById('alg-bon'); if (t) nu.toon = t.checked; if (o) nu.bon = o.checked; }
    function pas(n) { st = n; bewaar(); bar(); opt.close(); opt.opnieuw(); }
    teken();
    opt.open();
  }
  UI.algInit = function (o) { opt = o; bar(); };
  UI.algAan = aan;
  UI.algGroepen = groepen;
  UI.algBlok = blok;
  UI.algKlasse = klasse;
  // Enkel als de gast het zelf aanvinkte: wat op de bon komt.
  UI.algBestelling = function () { return (aan() && st.bon) ? { soort: st.soort, lijst: st.lijst.slice(), subs: JSON.parse(JSON.stringify(st.subs)) } : null; };
  UI.ALLERGEEN_SUB = SUBS;
})();
