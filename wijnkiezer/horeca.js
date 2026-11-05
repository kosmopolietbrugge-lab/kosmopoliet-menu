/* ============================================================
   Wijnkiezer — horeca-advies (menu engineering & food pairing)
   Leest de gerechten uit ../kaart.json (Kosmopoliet / Kissing Karrots OS)
   of uit een geplakte lijst, en koppelt ze aan de wijnen uit wijnen.json.
   ============================================================ */
(function () {
  'use strict';
  var W = window.Wijnkiezer, esc = W.esc, $ = function (id) { return document.getElementById(id); };
  var PROF_KEY = 'wijnkiezer-horeca-profielen', SRC_KEY = 'wijnkiezer-horeca-bron';
  var COURSES = { tapas: 'Tapas / starters', hoofd: 'Hoofdgerechten', specials: 'Specials', dessert: 'Desserts' };
  var WINES = [], DISHES = [], prof = {};
  try { prof = JSON.parse(localStorage.getItem(PROF_KEY) || '{}'); } catch (e) {}
  function saveProf() { try { localStorage.setItem(PROF_KEY, JSON.stringify(prof)); } catch (e) {} }
  function toast(t) { var el = $('toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toast._t); toast._t = setTimeout(function () { el.classList.remove('on'); }, 1800); }
  function nl(n) { return String(n || '').split(' / ')[0]; }

  document.querySelectorAll('.tabs button').forEach(function (b) {
    b.onclick = function () {
      document.querySelectorAll('.tabs button').forEach(function (x) { x.classList.toggle('on', x === b); });
      document.querySelectorAll('.view').forEach(function (x) { x.classList.toggle('on', x.id === 'v-' + b.dataset.v); });
      if (b.dataset.v === 'kaart') renderCover(); if (b.dataset.v === 'prijs') renderCalc();
    };
  });

  /* ---------- gerechten laden ---------- */
  function loadDishes() {
    var pasted = null; try { pasted = localStorage.getItem(SRC_KEY); } catch (e) {}
    if (pasted) { DISHES = parsePaste(pasted); $('src-msg').textContent = 'Bron: geplakte lijst (' + DISHES.length + ' gerechten).'; $('paste').value = pasted; return Promise.resolve(); }
    return fetch('../kaart.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (k) {
      var seen = {};
      DISHES = (k.items || []).filter(function (i) { return !i.archived && i.available !== false && COURSES[i.cats && i.cats[0]] && !/beurzelada/i.test(i.name); })
        .filter(function (i) { var key = nl(i.name).toLowerCase(); if (seen[key]) return false; seen[key] = 1; return true; })
        .map(function (i) { return { id: i.id, naam: nl(i.name), omschrijving: nl(i.short), gang: i.cats[0] === 'specials' ? 'hoofd' : i.cats[0], prijs: i.price }; });
      $('src-msg').textContent = 'Bron: live menukaart (' + DISHES.length + ' gerechten).';
    }).catch(function () { DISHES = []; $('src-msg').textContent = 'Live menukaart niet gevonden: plak je gerechten hieronder.'; });
  }
  function parsePaste(t) {
    return t.split(/\r?\n/).map(function (l, i) {
      var p = l.split('|').map(function (x) { return x.trim(); }); if (!p[0]) return null;
      var g = (p[2] || 'hoofd').toLowerCase(); if (!COURSES[g]) g = /dessert|zoet/.test(g) ? 'dessert' : /tapa|start|voor/.test(g) ? 'tapas' : 'hoofd';
      return { id: 'p' + i + '-' + W.slug(p[0]), naam: p[0], omschrijving: p[1] || '', gang: g };
    }).filter(Boolean);
  }
  function profile(d) { return prof[d.id] || W.profileDish(d.naam, d.omschrijving, d.gang); }
  function pool() { return WINES.filter(function (w) { return w.actief && (!$('only-house').checked || w.bron !== 'demo'); }); }

  /* ---------- per gerecht ---------- */
  function chip(list, cur, grp) { return list.map(function (c) { return '<button class="chip' + (cur.indexOf(c[0]) >= 0 ? ' on' : '') + '" data-g="' + grp + '" data-k="' + c[0] + '">' + c[1] + '</button>'; }).join(''); }
  function renderDishes() {
    var c = $('course').value, P = pool();
    if (!P.length) { $('dishes').innerHTML = '<div class="empty">Geen wijnen beschikbaar. Zet “Enkel echte wijnen” uit of voeg wijnen toe in de backoffice.</div>'; return; }
    var list = DISHES.filter(function (d) { return !c || d.gang === c; });
    $('dishes').innerHTML = list.length ? list.map(function (d) {
      var p = profile(d), top = W.rankForDish(P, p, 3);
      var summary = p.ing.map(function (x) { return W.label(W.INGREDIENTEN, x); }).concat(p.bereiding.map(function (x) { return W.label(W.BEREIDING, x); }), p.smaken.map(function (x) { return W.label(W.SMAKEN, x); }), (p.keuken || []).map(function (x) { return W.label(W.KEUKENS, x); }));
      return '<div class="dish" data-id="' + esc(d.id) + '"><h3>' + esc(d.naam) + '</h3>' +
        (d.omschrijving ? '<div class="meta">' + esc(d.omschrijving) + '</div>' : '') +
        '<div class="prof">' + summary.map(function (s) { return '<span class="tag">' + esc(s) + '</span>'; }).join('') + '<span class="tag">intensiteit ' + p.intensiteit + '/5</span>' + (prof[d.id] ? '<span class="tag d">aangepast</span>' : '') +
        ' <button class="chip" data-toggle>Profiel bijstellen</button></div>' +
        '<div class="edit-prof"><p class="sub">Ingrediënten</p>' + W.GROEPEN.map(function (g) { return '<div class="pg"><b>' + esc(g[1]) + '</b><div class="chips">' + chip([[g[0], 'Algemeen']].concat(g[2]), p.ing, 'ing') + '</div></div>'; }).join('') +
        '<p class="sub">Keuken</p><div class="chips">' + chip(W.KEUKENS.map(function (k) { return [k[0], k[1]]; }), p.keuken || [], 'keuken') + '</div>' +
        '<p class="sub">Bereiding</p><div class="chips">' + chip(W.BEREIDING, p.bereiding, 'bereiding') + '</div>' +
        '<p class="sub">Smaken</p><div class="chips">' + chip(W.SMAKEN, p.smaken, 'smaken') + '</div>' +
        '<p class="sub">Intensiteit</p><div class="chips">' + chip([[1, '1'], [2, '2'], [3, '3'], [4, '4'], [5, '5']].map(function (x) { return [String(x[0]), x[1]]; }), [String(p.intensiteit)], 'intensiteit') + '</div></div>' +
        '<div class="sugg">' + top.map(function (t, i) {
          return '<div class="sg"><span class="s">' + t.score + '%</span><b>' + (i === 0 ? '★ ' : '') + esc(t.w.naam) + '</b><span class="meta">' + esc(W.label(W.KLEUREN, t.w.kleur)) + '</span>' +
            '<ul>' + t.redenen.slice(0, 3).map(function (r) { return '<li' + (r.plus ? '' : ' style="color:#9b3b3b"') + '>' + esc(r.t) + '</li>'; }).join('') + '</ul></div>';
        }).join('') + '</div></div>';
    }).join('') : '<div class="empty">Geen gerechten gevonden.</div>';
  }
  $('dishes').onclick = function (e) {
    var box = e.target.closest('.dish'); if (!box) return;
    if (e.target.closest('[data-toggle]')) { box.classList.toggle('open'); return; }
    var b = e.target.closest('[data-g]'); if (!b) return;
    var d = DISHES.find(function (x) { return x.id === box.dataset.id; });
    var p = JSON.parse(JSON.stringify(profile(d))), g = b.dataset.g, k = b.dataset.k;
    if (g === 'intensiteit') p.intensiteit = +k; else { p[g] = p[g] || []; var i = p[g].indexOf(k); if (i >= 0) p[g].splice(i, 1); else p[g].push(k); }
    prof[d.id] = p; saveProf(); renderDishes();
    var nb = document.querySelector('.dish[data-id="' + CSS.escape(d.id) + '"]'); if (nb) nb.classList.add('open');
  };
  $('only-house').onchange = function () { renderDishes(); };
  $('course').innerHTML += Object.keys(COURSES).filter(function (k) { return k !== 'specials'; }).map(function (k) { return '<option value="' + k + '">' + COURSES[k] + '</option>'; }).join('');
  $('course').onchange = renderDishes;

  /* ---------- wijnkaart-dekking (greedy set cover) ---------- */
  function matrix() {
    var P = pool();
    return { P: P, M: DISHES.map(function (d) { var p = profile(d); return P.map(function (w) { return W.pair(w, p).score; }); }) };
  }
  function renderCover() {
    var thr = +$('thr').value; $('thr-v').textContent = thr;
    var mx = matrix(), P = mx.P, M = mx.M;
    var uncovered = DISHES.map(function (_, i) { return i; }), chosen = [];
    while (uncovered.length) {
      var best = -1, bestN = 0;
      P.forEach(function (w, j) { if (chosen.indexOf(j) >= 0) return; var n = uncovered.filter(function (i) { return M[i][j] >= thr; }).length; if (n > bestN) { bestN = n; best = j; } });
      if (best < 0) break;
      chosen.push(best); uncovered = uncovered.filter(function (i) { return M[i][best] < thr; });
    }
    $('cover').innerHTML = '<div class="sugg">' + chosen.map(function (j) {
      var ds = DISHES.filter(function (_, i) { return M[i][j] >= thr; });
      return '<div class="sg"><b>' + esc(P[j].naam) + '</b><span class="meta">' + esc(W.label(W.KLEUREN, P[j].kleur)) + ' · ' + ds.length + ' gerechten</span><ul>' + ds.slice(0, 6).map(function (d) { return '<li>' + esc(d.naam) + '</li>'; }).join('') + (ds.length > 6 ? '<li>…</li>' : '') + '</ul></div>';
    }).join('') + '</div>' +
      (uncovered.length ? '<p class="sub" style="color:#9b3b3b;margin-top:10px">Zonder goede match (≥ ' + thr + '%): ' + uncovered.map(function (i) { return esc(DISHES[i].naam); }).join(', ') + '. Overweeg een extra wijnstijl of verlaag de drempel.</p>' : '<p class="sub" style="margin-top:10px">✓ Elk gerecht heeft minstens één goede wijn.</p>');
    var stats = P.map(function (w, j) {
      var sc = M.map(function (r) { return r[j]; });
      return { w: w, gem: sc.length ? Math.round(sc.reduce(function (a, b) { return a + b; }, 0) / sc.length) : 0, n: sc.filter(function (s) { return s >= thr; }).length };
    }).sort(function (a, b) { return b.n - a.n || b.gem - a.gem; });
    $('rank').innerHTML = '<tr><th>Wijn</th><th>Kleur</th><th>Goede matches</th><th>Gem. score</th><th>Prijs</th></tr>' + stats.map(function (s) {
      return '<tr><td>' + esc(s.w.naam) + '</td><td>' + esc(W.label(W.KLEUREN, s.w.kleur)) + '</td><td>' + s.n + ' / ' + DISHES.length + '</td><td>' + s.gem + '%</td><td>' + W.euro(s.w.prijs) + '</td></tr>';
    }).join('');
    var covered = DISHES.length - uncovered.length;
    $('kpi').innerHTML = '<div><b>' + DISHES.length + '</b><small>gerechten</small></div><div><b>' + P.length + '</b><small>wijnen in de selectie</small></div>' +
      '<div><b>' + chosen.length + '</b><small>wijnen volstaan</small></div><div><b>' + (DISHES.length ? Math.round(covered / DISHES.length * 100) : 0) + '%</b><small>van het menu gedekt</small></div>';
  }
  $('thr').oninput = renderCover;

  function adviceRows() {
    var P = pool();
    return DISHES.map(function (d) { var top = W.rankForDish(P, profile(d), 3); return { d: d, top: top }; });
  }
  function dl(name, text, type) { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: type })); a.download = name; a.click(); }
  $('exp').onclick = function () {
    var c = function (v) { v = String(v == null ? '' : v); return /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var rows = ['gerecht;gang;wijn 1;score 1;waarom;wijn 2;score 2;wijn 3;score 3'].concat(adviceRows().map(function (r) {
      var t = r.top;
      return [r.d.naam, r.d.gang, t[0] && t[0].w.naam, t[0] && t[0].score, t[0] && t[0].redenen.filter(function (x) { return x.plus; }).map(function (x) { return x.t; }).join(' · '), t[1] && t[1].w.naam, t[1] && t[1].score, t[2] && t[2].w.naam, t[2] && t[2].score].map(c).join(';');
    }));
    dl('pairing-advies.csv', '﻿' + rows.join('\n'), 'text/csv');
  };
  $('expj').onclick = function () {
    dl('pairing-advies.json', JSON.stringify({ gemaakt: new Date().toISOString(), advies: adviceRows().map(function (r) {
      return { gerechtId: r.d.id, gerecht: r.d.naam, profiel: profile(r.d), wijnen: r.top.map(function (t) { return { id: t.w.id, naam: t.w.naam, score: t.score, waarom: t.redenen.filter(function (x) { return x.plus; }).map(function (x) { return x.t; }) }; }) };
    }) }, null, 1), 'application/json');
  };

  /* ---------- prijscalculator ---------- */
  function renderCalc() {
    var cf = +$('c-fles').value || 3, ng = +$('c-glas').value || 5, go = (+$('c-glasop').value || 0) / 100, btw = (+$('c-btw').value || 0) / 100, rd = +$('c-rond').value || 0.5;
    var r = function (v) { return Math.ceil(v / rd) * rd; };
    var P = WINES.filter(function (w) { return w.actief; });
    $('calc').innerHTML = '<tr><th>Wijn</th><th>Horecaprijs excl.</th><th>Fles incl. btw</th><th>Glas incl. btw</th><th>Brutomarge fles</th></tr>' + P.map(function (w) {
      if (w.inkoop == null) return '<tr><td>' + esc(w.naam) + '</td><td colspan="4" class="meta">horecaprijs ontbreekt (in te vullen in de backoffice)</td></tr>';
      var fles = r(w.inkoop * cf * (1 + btw)), glas = r(w.inkoop * cf * (1 + go) / ng * (1 + btw));
      var marge = fles / (1 + btw) - w.inkoop;
      return '<tr><td>' + esc(w.naam) + '</td><td>' + W.euro(w.inkoop) + '</td><td><b>' + W.euro(fles) + '</b></td><td>' + W.euro(glas) + '</td><td>' + W.euro(marge) + ' (' + Math.round(marge / (fles / (1 + btw)) * 100) + '%)</td></tr>';
    }).join('');
  }
  ['c-fles', 'c-glas', 'c-glasop', 'c-btw', 'c-rond'].forEach(function (id) { $(id).oninput = renderCalc; });

  /* ---------- bron ---------- */
  $('use-paste').onclick = function () { var t = $('paste').value.trim(); if (!t) return; try { localStorage.setItem(SRC_KEY, t); } catch (e) {} init(); toast('Gerechten geladen'); };
  $('use-kaart').onclick = function () { try { localStorage.removeItem(SRC_KEY); } catch (e) {} $('paste').value = ''; init(); toast('Live menukaart geladen'); };
  $('reset-prof').onclick = function () { if (!confirm('Alle profielaanpassingen wissen?')) return; prof = {}; saveProf(); renderDishes(); };

  function init() { return loadDishes().then(function () { renderDishes(); renderCover(); }); }
  W.load({ preferDraft: true }).then(function (db) { WINES = db.wijnen; W.applyTheme(db.instellingen || {}); return init(); });
})();
