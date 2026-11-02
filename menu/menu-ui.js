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
