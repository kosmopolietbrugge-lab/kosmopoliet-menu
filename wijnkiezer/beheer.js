/* ============================================================
   Wijnkiezer — backoffice
   Werkt op een concept in deze browser (localStorage). Publiceren schrijft
   wijnen.json weg naar GitHub (of je downloadt het bestand).
   ============================================================ */
(function () {
  'use strict';
  var W = window.Wijnkiezer, esc = W.esc;
  var $ = function (id) { return document.getElementById(id); };
  var DB = null, LIVE = '';
  var GH_KEY = 'wijnkiezer-gh';

  var COLS = ['id', 'naam', 'producent', 'jaar', 'kleur', 'land', 'regio', 'druiven', 'prijs', 'inkoop', 'inhoud', 'alcohol', 'vegan', 'bio',
    'body', 'zoet', 'zuur', 'tannine', 'fruit', 'hout', 'aromas', 'pairing', 'serveertemp', 'omschrijving', 'url', 'foto', 'actief', 'uitgelicht', 'bron'];

  function toast(t) { var el = $('toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toast._t); toast._t = setTimeout(function () { el.classList.remove('on'); }, 2200); }
  function snapshot() { return JSON.stringify({ instellingen: DB.instellingen, wijnen: DB.wijnen }); }
  function commit(msg) {
    DB.bijgewerkt = new Date().toISOString().slice(0, 10);
    W.saveDraft(DB); markDirty(); if (msg) toast(msg);
  }
  function markDirty() { var d = snapshot() !== LIVE; $('dirty').hidden = !d; $('draft-note').hidden = !d; }

  /* ---------- toegang ---------- */
  function start() {
    W.load({ preferDraft: false }).then(function (live) {
      LIVE = JSON.stringify({ instellingen: live.instellingen, wijnen: live.wijnen });
      var d = W.getDraft();
      DB = d ? W.normalize(d) : live;
      var pin = String((live.instellingen || {}).beheerPin || '');
      var ok = false; try { ok = sessionStorage.getItem('wijnkiezer-in') === pin; } catch (e) {}
      if (!pin || ok) return enter();
      $('gate-f').onsubmit = function (e) {
        e.preventDefault();
        if ($('gate-pin').value === pin) { try { sessionStorage.setItem('wijnkiezer-in', pin); } catch (x) {} enter(); }
        else $('gate-err').hidden = false;
      };
    }).catch(function (e) { document.body.innerHTML = '<div class="empty" style="margin:40px">wijnen.json kon niet geladen worden: ' + esc(e.message) + '</div>'; });
  }
  function enter() {
    $('gate').hidden = true; $('app').hidden = false;
    W.applyTheme(DB.instellingen); $('b-naam').textContent = DB.instellingen.naam || 'Wijnkiezer';
    $('qk').innerHTML += W.KLEUREN.map(function (k) { return '<option value="' + k[0] + '">' + k[1] + '</option>'; }).join('');
    renderTable(); renderStyle(); initPublish(); markDirty();
    $('cols').innerHTML = COLS.map(function (c) { return '<code>' + c + '</code>'; }).join(' ') +
      '<br><br><b>kleur</b>: ' + W.KLEUREN.map(function (k) { return k[0]; }).join(', ') +
      '<br><b>body, zoet, zuur, tannine, fruit, hout</b>: 1 (weinig) tot 5 (veel)' +
      '<br><b>vegan</b>: ja / nee / leeg = onbekend · <b>bio, actief, uitgelicht</b>: ja / nee' +
      '<br><b>druiven, aromas, pairing</b>: meerdere waarden scheiden met een komma of puntkomma' +
      '<br><b>pairing</b>: ' + W.INGREDIENTEN.map(function (k) { return k[0]; }).join(', ');
  }

  /* ---------- tabs ---------- */
  document.querySelectorAll('.tabs button').forEach(function (b) {
    b.onclick = function () {
      document.querySelectorAll('.tabs button').forEach(function (x) { x.classList.toggle('on', x === b); });
      document.querySelectorAll('.view').forEach(function (x) { x.classList.toggle('on', x.id === 'v-' + b.dataset.v); });
    };
  });
  $('draft-drop').onclick = function () { if (!confirm('Alle niet-gepubliceerde wijzigingen verwerpen?')) return; W.clearDraft(); location.reload(); };

  /* ---------- tabel ---------- */
  $('q').oninput = renderTable; $('qk').onchange = renderTable;
  function renderTable() {
    var q = $('q').value.toLowerCase(), k = $('qk').value;
    var l = DB.wijnen.filter(function (w) { return (!k || w.kleur === k) && (!q || (w.naam + ' ' + w.producent + ' ' + w.land + ' ' + w.regio).toLowerCase().indexOf(q) >= 0); });
    $('cnt').textContent = l.length + ' van ' + DB.wijnen.length + ' wijnen · ' + DB.wijnen.filter(function (w) { return w.bron === 'demo'; }).length + ' demo';
    $('tbl').innerHTML = '<tr><th>Naam</th><th>Kleur</th><th>Land</th><th>Prijs</th><th>Vegan</th><th>Bron</th><th>Actief</th></tr>' +
      l.map(function (w) {
        return '<tr data-id="' + esc(w.id) + '" class="' + (w.actief ? '' : 'off') + '"><td class="n">' + (w.uitgelicht ? '★ ' : '') + esc(w.naam) + '</td><td>' + esc(W.label(W.KLEUREN, w.kleur)) + '</td><td>' + esc(w.land) +
          '</td><td>' + (w.prijs == null ? '<i style="color:#9b3b3b">ontbreekt</i>' : W.euro(w.prijs)) + '</td><td>' + (w.vegan === true ? 'ja' : w.vegan === false ? 'nee' : '?') +
          '</td><td>' + esc(w.bron) + '</td><td>' + (w.actief ? 'ja' : 'nee') + '</td></tr>';
      }).join('');
  }
  $('tbl').onclick = function (e) { var r = e.target.closest('tr[data-id]'); if (r) edit(r.dataset.id); };
  $('new').onclick = function () { edit(null); };

  /* ---------- editor ---------- */
  var cur = null;
  function edit(id) {
    var w = id ? DB.wijnen.find(function (x) { return x.id === id; }) : W.normWine({ naam: '', bron: 'fiche' });
    cur = JSON.parse(JSON.stringify(w)); cur._new = !id;
    function inp(key, lbl, type, extra) { return '<label' + (extra || '') + '>' + lbl + '<input class="search" data-f="' + key + '" type="' + (type || 'text') + '" value="' + esc(cur[key] == null ? '' : Array.isArray(cur[key]) ? cur[key].join(', ') : cur[key]) + '"' + (type === 'number' ? ' step="any"' : '') + '></label>'; }
    function sel(key, lbl, opts) { return '<label>' + lbl + '<select class="search" data-f="' + key + '">' + opts.map(function (o) { return '<option value="' + o[0] + '"' + (String(cur[key]) === String(o[0]) ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></label>'; }
    $('ed').innerHTML =
      '<div class="ed-h"><h2>' + (id ? esc(cur.naam) : 'Nieuwe wijn') + '</h2></div>' +
      '<div class="form">' + inp('naam', 'Naam *', 'text', ' class="full"') + inp('producent', 'Producent') + inp('jaar', 'Jaargang', 'number') +
      sel('kleur', 'Kleur', W.KLEUREN) + inp('land', 'Land') + inp('regio', 'Regio / appellatie') + inp('druiven', 'Druiven (komma-gescheiden)') +
      inp('prijs', 'Verkoopprijs € (webshop)', 'number') + inp('inkoop', 'Horecaprijs € excl. btw (optioneel)', 'number') + inp('inhoud', 'Inhoud (cl)', 'number') + inp('alcohol', 'Alcohol %', 'number') +
      sel('vegan', 'Vegan', [['null', 'Onbekend'], ['true', 'Ja'], ['false', 'Nee']]) + sel('bio', 'Bio', [['false', 'Nee'], ['true', 'Ja']]) +
      inp('serveertemp', 'Serveertemperatuur') + sel('actief', 'Zichtbaar', [['true', 'Ja'], ['false', 'Nee (verborgen)']]) + sel('uitgelicht', 'Uitgelicht', [['false', 'Nee'], ['true', 'Ja ★']]) +
      sel('bron', 'Bron', [['fiche', 'Technische fiche'], ['kosmopoliet-kaart', 'Kosmopoliet-kaart'], ['demo', 'Demo']]) +
      '<label class="full">Omschrijving / proefnotitie<textarea class="search" rows="3" data-f="omschrijving">' + esc(cur.omschrijving) + '</textarea></label>' +
      inp('aromas', 'Aroma’s (komma-gescheiden)', 'text', ' class="full"') + inp('url', 'Link naar productpagina webshop', 'url', ' class="full"') + inp('foto', 'Foto-URL (fles)', 'url', ' class="full"') + '</div>' +
      '<h3 class="ed-sec">Smaakprofiel (1 – 5)</h3><div class="sl">' + W.SMAAKASSEN.map(function (a) {
        return '<div><label><span>' + a[1] + ' <small>(' + a[2] + ' → ' + a[3] + ')</small></span><b id="sv-' + a[0] + '">' + cur.smaak[a[0]] + '</b></label><input type="range" min="1" max="5" data-s="' + a[0] + '" value="' + cur.smaak[a[0]] + '"></div>';
      }).join('') + '</div>' +
      '<h3 class="ed-sec">Food pairing — past bij</h3><div class="chips" id="ed-pair">' + W.INGREDIENTEN.map(function (i) { return '<button class="chip' + (cur.pairing.indexOf(i[0]) >= 0 ? ' on' : '') + '" data-k="' + i[0] + '">' + i[1] + '</button>'; }).join('') + '</div>' +
      '<div class="row" style="margin-top:22px"><button class="cta" id="ed-save">Opslaan</button><button class="cta alt" id="ed-cancel">Annuleren</button>' +
      (id ? '<button class="cta alt" id="ed-dup">Dupliceren</button><button class="cta danger" id="ed-del" style="margin-left:auto">Verwijderen</button>' : '') + '</div>';
    $('ed').querySelectorAll('[data-s]').forEach(function (r) { r.oninput = function () { $('sv-' + r.dataset.s).textContent = r.value; }; });
    $('ed-pair').onclick = function (e) { var b = e.target.closest('[data-k]'); if (b) b.classList.toggle('on'); };
    $('ed-save').onclick = save; $('ed-cancel').onclick = close;
    if (id) {
      $('ed-del').onclick = function () { if (!confirm('“' + cur.naam + '” verwijderen?')) return; DB.wijnen = DB.wijnen.filter(function (x) { return x.id !== id; }); commit('Verwijderd'); close(); renderTable(); };
      $('ed-dup').onclick = function () { var c = W.normWine(Object.assign({}, w, { id: null, naam: w.naam + ' (kopie)' })); DB.wijnen.push(c); commit('Gedupliceerd'); renderTable(); edit(c.id); };
    }
    $('sheet').classList.add('on'); $('bd').classList.add('on');
  }
  function save() {
    var o = {};
    $('ed').querySelectorAll('[data-f]').forEach(function (el) {
      var v = el.value; if (v === 'true') v = true; else if (v === 'false') v = false; else if (v === 'null') v = null;
      o[el.dataset.f] = v;
    });
    if (!String(o.naam || '').trim()) { toast('Naam is verplicht'); return; }
    o.smaak = {}; $('ed').querySelectorAll('[data-s]').forEach(function (r) { o.smaak[r.dataset.s] = +r.value; });
    o.pairing = Array.from($('ed-pair').querySelectorAll('.on')).map(function (b) { return b.dataset.k; });
    o.id = cur._new ? W.slug(o.naam) || null : cur.id;
    if (cur._new && DB.wijnen.some(function (x) { return x.id === o.id; })) o.id = o.id + '-' + Math.random().toString(36).slice(2, 5);
    var w = W.normWine(o);
    var i = DB.wijnen.findIndex(function (x) { return x.id === cur.id; });
    if (i >= 0 && !cur._new) DB.wijnen[i] = w; else DB.wijnen.push(w);
    commit('Opgeslagen (nog niet gepubliceerd)'); close(); renderTable();
  }
  function close() { $('sheet').classList.remove('on'); $('bd').classList.remove('on'); }
  $('sx').onclick = close; $('bd').onclick = close;

  /* ---------- import / export ---------- */
  function parseCSV(text) {
    text = text.replace(/^﻿/, '');
    var first = text.split(/\r?\n/)[0] || '';
    var d = (first.match(/\t/g) || []).length ? '\t' : (first.match(/;/g) || []).length >= (first.match(/,/g) || []).length ? ';' : ',';
    var rows = [], row = [], f = '', q = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
      else if (c === '"') q = true;
      else if (c === d) { row.push(f); f = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
      else f += c;
    }
    if (f || row.length) { row.push(f); rows.push(row); }
    rows = rows.filter(function (r) { return r.some(function (x) { return x.trim(); }); });
    if (!rows.length) return [];
    var head = rows.shift().map(function (h) { return W.slug(h).replace(/-/g, ''); });
    return rows.map(function (r) { var o = {}; head.forEach(function (h, j) { o[h] = (r[j] || '').trim(); }); return o; });
  }
  function yes(v) { v = String(v).toLowerCase(); return v === 'ja' || v === 'yes' || v === 'true' || v === '1' || v === 'x' || v === 'y' || v === 'j'; }
  function no(v) { v = String(v).toLowerCase(); return v === 'nee' || v === 'no' || v === 'false' || v === '0' || v === 'n'; }
  function rowToWine(r) {
    var o = Object.assign({}, r);
    ['prijs', 'inkoop', 'alcohol', 'inhoud'].forEach(function (k) { if (o[k] !== undefined) o[k] = o[k] === '' ? null : String(o[k]).replace(/[€\s%]/g, '').replace(',', '.'); });
    o.vegan = o.vegan === undefined || o.vegan === '' ? null : yes(o.vegan) ? true : no(o.vegan) ? false : null;
    if (o.bio !== undefined) o.bio = yes(o.bio);
    if (o.actief !== undefined && o.actief !== '') o.actief = !no(o.actief);
    if (o.uitgelicht !== undefined) o.uitgelicht = yes(o.uitgelicht);
    o.smaak = {}; W.SMAAKASSEN.forEach(function (a) { if (r[a[0]] !== undefined && r[a[0]] !== '') o.smaak[a[0]] = r[a[0]]; });
    if (o.kleur) { var k = W.slug(o.kleur).replace('-', ''); o.kleur = { rode: 'rood', red: 'rood', witte: 'wit', white: 'wit', ros: 'rose', mousserend: 'bubbels', schuimwijn: 'bubbels', sparkling: 'bubbels', champagne: 'bubbels', cava: 'bubbels', prosecco: 'bubbels', dessert: 'zoet', port: 'versterkt', sherry: 'versterkt' }[k] || k; }
    if (o.pairing) o.pairing = W.arr(o.pairing).map(function (p) { var s = W.slug(p); var hit = W.INGREDIENTEN.find(function (i) { return i[0] === s || W.slug(i[1]) === s; }); return hit ? hit[0] : s; });
    if (!o.bron) o.bron = 'fiche';
    if (!o.id) o.id = W.slug(o.naam || '');
    return o;
  }
  function importRows(list, mode) {
    var n = 0, u = 0;
    if (mode === 'replace') DB.wijnen = [];
    list.forEach(function (r) {
      if (!r.naam) return;
      var i = DB.wijnen.findIndex(function (x) { return (r.id && x.id === r.id) || x.naam.toLowerCase() === String(r.naam).toLowerCase(); });
      if (i >= 0) {
        var old = DB.wijnen[i], m = Object.assign({}, old);
        Object.keys(r).forEach(function (k) { if (k === 'smaak') m.smaak = Object.assign({}, old.smaak, r.smaak); else if (r[k] !== '' && r[k] !== undefined) m[k] = r[k]; });
        DB.wijnen[i] = W.normWine(m); u++;
      } else { DB.wijnen.push(W.normWine(r)); n++; }
    });
    commit(); renderTable();
    $('imp-msg').textContent = n + ' nieuw, ' + u + ' bijgewerkt. Vergeet niet te publiceren.';
  }
  function mode() { return document.querySelector('[name=imp-mode]:checked').value; }
  $('imp-file').onchange = function (e) {
    var f = e.target.files[0]; if (!f) return;
    if (mode() === 'replace' && !confirm('Alle bestaande wijnen vervangen door dit bestand?')) return;
    f.text().then(function (t) {
      if (/\.json$/i.test(f.name)) {
        var j = JSON.parse(t);
        var list = Array.isArray(j) ? j : j.wijnen || [];
        if (!Array.isArray(j) && j.instellingen && confirm('Ook de huisstijl/instellingen uit dit bestand overnemen?')) DB.instellingen = j.instellingen;
        importRows(list, mode());
      } else importRows(parseCSV(t).map(rowToWine), mode());
    }).catch(function (x) { $('imp-msg').textContent = 'Fout bij inlezen: ' + x.message; });
    e.target.value = '';
  };
  $('imp-go').onclick = function () { var t = $('imp-paste').value; if (!t.trim()) return; importRows(parseCSV(t).map(rowToWine), mode()); $('imp-paste').value = ''; };

  function download(name, text, type) { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: type })); a.download = name; a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000); }
  function csvCell(v) { v = v == null ? '' : Array.isArray(v) ? v.join(', ') : v === true ? 'ja' : v === false ? 'nee' : String(v); return /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function toCSV(list) {
    return '﻿' + COLS.join(';') + '\n' + list.map(function (w) {
      return COLS.map(function (c) { return csvCell(w.smaak && w.smaak[c] !== undefined && ['body', 'zoet', 'zuur', 'tannine', 'fruit', 'hout'].indexOf(c) >= 0 ? w.smaak[c] : w[c]); }).join(';');
    }).join('\n');
  }
  $('exp-tpl').onclick = function () {
    download('wijnkiezer-sjabloon.csv', toCSV([W.normWine({ id: 'voorbeeld-1', naam: 'Voorbeeld Chardonnay 2023', producent: 'Domein X', jaar: 2023, kleur: 'wit', land: 'Frankrijk', regio: 'Bourgogne', druiven: ['Chardonnay'], prijs: 18.5, alcohol: 13, vegan: true, bio: false, smaak: { body: 3, zoet: 1, zuur: 4, tannine: 1, fruit: 3, hout: 2 }, aromas: ['citrus', 'hazelnoot'], pairing: ['vis', 'gevogelte'], serveertemp: '10–12 °C', omschrijving: 'Frisse, elegante chardonnay.', url: 'https://…' })]), 'text/csv');
  };
  $('exp-csv').onclick = function () { download('wijnen-' + new Date().toISOString().slice(0, 10) + '.csv', toCSV(DB.wijnen), 'text/csv'); };
  $('exp-json').onclick = function () { download('wijnen.json', dbJSON(), 'application/json'); };
  $('del-demo').onclick = function () {
    var n = DB.wijnen.filter(function (w) { return w.bron === 'demo'; }).length;
    if (!n || !confirm(n + ' demowijnen verwijderen?')) return;
    DB.wijnen = DB.wijnen.filter(function (w) { return w.bron !== 'demo'; }); commit(n + ' demowijnen verwijderd'); renderTable();
  };
  function dbJSON() { return JSON.stringify({ versie: DB.versie || 1, bijgewerkt: DB.bijgewerkt || new Date().toISOString().slice(0, 10), instellingen: DB.instellingen, wijnen: DB.wijnen }, null, 1); }

  /* ---------- huisstijl ---------- */
  var STF = [
    ['naam', 'Naam zaak', 'text'], ['baseline', 'Baseline', 'text'], ['webshop', 'Webshop-URL', 'url'], ['contact', 'Contactregel (footer)', 'text'], ['email', 'E-mail voor cadeau- en eventbestellingen', 'email'],
    ['logo', 'Logo-URL (png/svg, liefst wit of transparant)', 'url'],
    ['k.primair', 'Hoofdkleur', 'color'], ['k.accent', 'Accentkleur', 'color'], ['k.achtergrond', 'Achtergrond', 'color'], ['k.oppervlak', 'Kaarten', 'color'], ['k.tekst', 'Tekst', 'color'],
    ['fontTitel', 'Lettertype titels (CSS)', 'text'], ['fontTekst', 'Lettertype tekst (CSS)', 'text'],
    ['toonDemo', 'Demowijnen tonen aan klanten', 'bool'], ['beheerPin', 'Beheercode', 'text']
  ];
  function gv(p) { var s = DB.instellingen; if (p.indexOf('k.') === 0) return (s.kleuren || {})[p.slice(2)]; return s[p]; }
  function sv(p, v) { var s = DB.instellingen; if (p.indexOf('k.') === 0) { s.kleuren = s.kleuren || {}; s.kleuren[p.slice(2)] = v; } else s[p] = v; }
  function renderStyle() {
    $('st-form').innerHTML = STF.map(function (f) {
      var v = gv(f[0]);
      if (f[2] === 'bool') return '<label>' + f[1] + '<select class="search" data-st="' + f[0] + '"><option value="true"' + (v !== false ? ' selected' : '') + '>Ja</option><option value="false"' + (v === false ? ' selected' : '') + '>Nee</option></select></label>';
      return '<label>' + f[1] + '<input class="search" type="' + f[2] + '" data-st="' + f[0] + '" value="' + esc(v || '') + '"></label>';
    }).join('');
    preview();
  }
  $('st-form').addEventListener('change', function (e) {
    var p = e.target.dataset.st; if (!p) return;
    var v = e.target.value; if (v === 'true') v = true; else if (v === 'false') v = false;
    sv(p, v); W.applyTheme(DB.instellingen); preview(); commit('Huisstijl bijgewerkt');
  });
  $('st-form').addEventListener('input', function (e) { if (e.target.type === 'color') { sv(e.target.dataset.st, e.target.value); W.applyTheme(DB.instellingen); } });
  function preview() { $('pv-naam').textContent = DB.instellingen.naam || ''; $('pv-base').textContent = DB.instellingen.baseline || ''; }

  /* ---------- publiceren ---------- */
  function initPublish() {
    var g = {}; try { g = JSON.parse(localStorage.getItem(GH_KEY) || '{}'); } catch (e) {}
    var guess = location.hostname.match(/^([^.]+)\.github\.io$/);
    var repoGuess = location.pathname.split('/').filter(Boolean)[0] || '';
    $('gh-owner').value = g.owner || (guess ? guess[1] : '');
    $('gh-repo').value = g.repo || (guess ? repoGuess : '');
    $('gh-branch').value = g.branch || 'main';
    $('gh-path').value = g.path || 'wijnkiezer/wijnen.json';
    $('gh-token').value = g.token || ''; $('gh-remember').checked = !!g.token;
  }
  function b64(s) { return btoa(unescape(encodeURIComponent(s))); }
  $('dl-json').onclick = function () { download('wijnen.json', dbJSON(), 'application/json'); };
  $('gh-go').onclick = function () {
    var o = $('gh-owner').value.trim(), r = $('gh-repo').value.trim(), b = $('gh-branch').value.trim() || 'main', p = $('gh-path').value.trim(), t = $('gh-token').value.trim();
    if (!o || !r || !p || !t) { $('pub-msg').textContent = 'Vul eigenaar, repository, pad en token in.'; return; }
    try { localStorage.setItem(GH_KEY, JSON.stringify({ owner: o, repo: r, branch: b, path: p, token: $('gh-remember').checked ? t : '' })); } catch (e) {}
    var api = 'https://api.github.com/repos/' + o + '/' + r + '/contents/' + p.split('/').map(encodeURIComponent).join('/');
    var h = { Authorization: 'Bearer ' + t, Accept: 'application/vnd.github+json' };
    $('pub-msg').textContent = 'Bezig met publiceren…'; $('gh-go').disabled = true;
    fetch(api + '?ref=' + encodeURIComponent(b), { headers: h }).then(function (res) { return res.status === 404 ? {} : res.json(); })
      .then(function (cur) {
        var body = { message: 'Wijnkiezer bijgewerkt ' + new Date().toISOString().slice(0, 16), content: b64(dbJSON()), branch: b };
        if (cur.sha) body.sha = cur.sha;
        return fetch(api, { method: 'PUT', headers: Object.assign({ 'Content-Type': 'application/json' }, h), body: JSON.stringify(body) });
      })
      .then(function (res) { return res.json().then(function (j) { if (!res.ok) throw new Error(j.message || res.status); return j; }); })
      .then(function () {
        LIVE = snapshot(); W.clearDraft(); markDirty();
        $('pub-msg').textContent = '✓ Gepubliceerd. De klant-app toont de nieuwe versie binnen ongeveer een minuut.';
      })
      .catch(function (e) { $('pub-msg').textContent = 'Publiceren mislukt: ' + e.message + '. Controleer token en rechten, of gebruik “Download wijnen.json”.'; })
      .then(function () { $('gh-go').disabled = false; });
  };

  start();
})();
