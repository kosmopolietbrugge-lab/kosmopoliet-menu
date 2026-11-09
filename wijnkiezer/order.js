/* ============================================================
   Wijnkiezer — winkelwagen / selectie
   Drie modi (backoffice > Instellingen > Bestellen):
   - webshop  : de selectie gaat naar de winkelwagen van de eigen webshop
                (link per product: winkelwagenLink met {webshop} {id} {n})
   - aanvraag : bestelaanvraag per e-mail naar de winkel (particulier/bedrijf)
   - uit      : geen winkelwagen
   ============================================================ */
(function () {
  'use strict';
  var W = window.Wijnkiezer, esc = W.esc;
  var $ = function (id) { return document.getElementById(id); };
  var CART_KEY = 'wijnkiezer-mandje', NOTE_KEY = 'wijnkiezer-mandje-notities', KLANT_KEY = 'wijnkiezer-klant', HIST_KEY = 'wijnkiezer-mijn-bestellingen';
  function load(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } }
  function store(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function eur(n) { return '€ ' + Number(n || 0).toFixed(2).replace('.', ','); }
  function st() { return WK.st(); }
  function modus() { return st().bestelModus || 'webshop'; }

  var cart = load(CART_KEY, []), notes = load(NOTE_KEY, []), klant = load(KLANT_KEY, { type: 'particulier' });
  var step = 'mandje', laatste = null, overzet = null;

  function wine(id) { return WK.wines().find(function (w) { return w.id === id; }); }
  function save() { store(CART_KEY, cart); store(NOTE_KEY, notes); updCount(); }
  function count() { return cart.reduce(function (a, l) { return a + l.n; }, 0); }
  function updCount() { var c = $('cart-n'); if (c) c.textContent = count(); }

  function add(id, n, o) {
    var w = wine(id); if (!w || !WK.bestelbaar(w)) return;
    if (step === 'klaar') step = 'mandje';
    var l = cart.find(function (x) { return x.id === id; });
    if (l) l.n += n; else cart.push({ id: id, n: n });
    save(); if (!(o && o.stil)) WK.toast(n + ' × ' + w.naam + ' toegevoegd');
    var b = $('cart-open'); if (b && b.animate) b.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.15)' }, { transform: 'scale(1)' }], { duration: 280 });
  }
  function addMany(lines, note) {
    lines.forEach(function (l) { add(l.id, l.n, { stil: true }); });
    if (note) { notes.push(note); save(); }
    WK.toast(lines.reduce(function (a, l) { return a + l.n; }, 0) + ' flessen toegevoegd');
  }

  /* ---------- webshop-links ---------- */
  function shop() { return String(st().webshop || '').replace(/\/$/, ''); }
  function fill(t, w, n) { return String(t).replace(/\{webshop\}/g, shop()).replace(/\{id\}/g, encodeURIComponent(w ? w.webshopId : '')).replace(/\{n\}/g, n || 1); }
  function zoekUrl(w) { return shop() ? fill(st().zoekLink || '{webshop}/?s={q}&post_type=product').replace(/\{q\}/g, encodeURIComponent(w.naam.replace(/^Demo · /, '').replace(/\s*\(.*\)\s*$/, ''))) : ''; }
  function addUrl(w, n) { return w.webshopId ? fill(st().winkelwagenLink || '{webshop}/?add-to-cart={id}&quantity={n}', w, n) : (w.url || zoekUrl(w)); }
  function cartUrl() { return fill(st().winkelwagenPagina || '{webshop}/winkelwagen/'); }

  /* ---------- leveringsvoorwaarden ---------- */
  function inZone(pc) {
    var z = String(st().leverZone || '').trim(); if (!z) return true;
    pc = parseInt(pc, 10); if (isNaN(pc)) return false;
    return z.split(/[,;]/).some(function (r) { var p = r.trim().split('-').map(function (x) { return parseInt(x, 10); }); return p.length === 2 ? pc >= p[0] && pc <= p[1] : pc === p[0]; });
  }
  function minDatum() {
    var d = new Date(), n = Math.max(1, +st().levertermijn || 1);
    while (n > 0) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0 && d.getDay() !== 6) n--; }
    return d.toISOString().slice(0, 10);
  }
  function voorwaardenHTML(c) {
    var s = st(), r = [];
    if (s.afhalen !== false) r.push('<b>Afhalen</b>' + (s.afhaalInfo ? ': ' + esc(s.afhaalInfo) : ' in de winkel'));
    if (s.levering !== false) {
      var t = '<b>Levering</b>' + (s.leverZone ? ' (postcodes ' + esc(s.leverZone) + ')' : '') + ': ' + (+s.leverkost ? eur(+s.leverkost) : 'gratis');
      if (+s.gratisLeveringVanaf && +s.leverkost) t += ', gratis vanaf ' + eur(+s.gratisLeveringVanaf) + (c && c.sub < +s.gratisLeveringVanaf ? ' <span class="meta">(nog ' + eur(+s.gratisLeveringVanaf - c.sub) + ')</span>' : ' ✓');
      if (s.leverdagen) t += ' · leverdagen: ' + esc(s.leverdagen);
      if (+s.levertermijn) t += ' · binnen ' + s.levertermijn + ' werkdag' + (+s.levertermijn === 1 ? '' : 'en');
      r.push(t);
    }
    if (+s.minBestelling) r.push('<b>Minimumbestelling</b>: ' + eur(+s.minBestelling));
    if (+s.doosKorting) r.push('<b>Dooskorting</b>: ' + s.doosKorting + ' % per 6 flessen');
    if (!r.length && !s.leverVoorwaarden) return '';
    return '<div class="step" style="margin-top:18px"><h3 class="up" style="margin-bottom:8px">Levering & voorwaarden</h3><ul style="margin:0;padding-left:18px">' + r.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>' +
      (s.leverVoorwaarden ? '<p style="margin:8px 0 0"><a href="#" id="lv-open">Volledige leveringsvoorwaarden</a></p>' : '') + '</div>';
  }

  /* ---------- berekening ---------- */
  function calc() {
    var s = st(), lines = [], sub = 0, onbekend = false, fl = 0;
    cart.forEach(function (l) {
      var w = wine(l.id); if (!w) return;
      fl += l.n;
      if (w.prijs == null) onbekend = true; else sub += w.prijs * l.n;
      lines.push({ w: w, n: l.n, tot: w.prijs == null ? null : w.prijs * l.n });
    });
    var kpct = +s.doosKorting || 0, korting = 0;
    if (kpct) {
      var bekend = lines.filter(function (l) { return l.w.prijs != null; }), nB = bekend.reduce(function (a, l) { return a + l.n; }, 0);
      var dozen = Math.floor(nB / 6); if (dozen) korting = Math.round((sub / nB) * 6 * dozen * kpct) / 100;
    }
    var lev = modus() === 'aanvraag' && klant.wijze === 'levering', leverkost = 0;
    if (lev) { leverkost = +s.leverkost || 0; if (+s.gratisLeveringVanaf && sub - korting >= +s.gratisLeveringVanaf) leverkost = 0; }
    var totaal = sub - korting + leverkost, btw = (+s.btw || 21) / 100;
    return { lines: lines, sub: sub, korting: korting, kpct: kpct, leverkost: leverkost, totaal: totaal, excl: totaal / (1 + btw), btw: btw, onbekend: onbekend, flessen: fl };
  }

  /* ---------- weergave ---------- */
  function linesHTML(c, b2b) {
    var s = st();
    return '<div class="cart-l">' + c.lines.map(function (l) {
      var info = esc(W.label(W.KLEUREN, l.w.kleur)) + ' · ' + (l.w.prijs != null ? eur(l.w.prijs) + (b2b ? ' (' + eur(l.w.prijs / (1 + c.btw)) + ' excl.)' : '') : esc(s.prijsOpAanvraag || 'prijs op aanvraag'));
      if (!l.w.voorraad) info += ' · <b>' + esc(s.nietOpVoorraadTekst || 'niet op voorraad') + '</b>';
      else if (l.w.stock != null && l.n > l.w.stock) info += ' · <b>slechts ' + l.w.stock + ' op voorraad</b>';
      if (modus() === 'webshop') { var u = addUrl(l.w, l.n); info += u ? ' · <a href="' + esc(u) + '" target="_blank" rel="noopener">' + (l.w.webshopId ? 'los in winkelwagen' : l.w.url ? 'bekijk in webshop' : 'zoek in webshop') + ' ↗</a>' : ''; }
      return '<div class="cart-r"><div class="nm"><a href="#" data-fiche="' + esc(l.w.id) + '" style="text-decoration:none">' + esc(l.w.naam) + '</a><small>' + info + '</small></div>' +
        '<div class="qty"><button data-cq="' + esc(l.w.id) + '" data-d="-1" aria-label="min">−</button><input data-cn="' + esc(l.w.id) + '" type="number" min="0" value="' + l.n + '"><button data-cq="' + esc(l.w.id) + '" data-d="1" aria-label="plus">+</button></div>' +
        '<div class="price sub-t">' + (l.tot != null ? eur(l.tot) : '—') + '</div>' +
        '<button class="ic" data-crm="' + esc(l.w.id) + '" aria-label="Verwijder">×</button></div>';
    }).join('') + '</div>';
  }
  function notesHTML(hint) {
    if (!notes.length) return '';
    return '<div class="step" style="margin-top:14px"><h3 class="up" style="margin-bottom:6px">Notities</h3>' + notes.map(function (n, i) { return '<p style="margin:4px 0">' + esc(n) + ' <button class="lnk" data-nrm="' + i + '" style="font-size:14px">verwijder</button></p>'; }).join('') +
      (hint ? '<p class="meta" style="margin:8px 0 0">' + hint + ' <button class="lnk" id="o-copynotes">Kopieer notities</button></p>' : '') + '</div>';
  }
  function totHTML(c, b2b) {
    var s = st(), min = +s.minBestelling || 0;
    return '<div class="cart-tot"><div>Subtotaal: <b>' + eur(c.sub) + '</b>' + (c.onbekend ? ' + prijs op aanvraag' : '') + '</div>' +
      (c.korting ? '<div>Dooskorting (' + c.kpct + ' %): <b>− ' + eur(c.korting) + '</b></div>' : (c.kpct && c.flessen < 6 ? '<div class="meta">Vanaf 6 flessen: ' + c.kpct + ' % dooskorting</div>' : '')) +
      (modus() === 'aanvraag' && klant.wijze === 'levering' ? '<div>Levering: <b>' + (c.leverkost ? eur(c.leverkost) : 'gratis') + '</b></div>' : '') +
      '<div class="big">' + (modus() === 'webshop' ? 'Geschat totaal ' : 'Totaal ') + eur(c.totaal) + '</div><div class="meta">incl. btw' + (b2b ? ' · ' + eur(c.excl) + ' excl. btw' : '') + '</div>' +
      (min && c.sub < min ? '<div style="color:#a33">Minimumbestelling: ' + eur(min) + '</div>' : '') + '</div>';
  }

  function render() {
    var v = $('v-mandje'); if (!v) return;
    if (step === 'klaar' && laatste) return renderKlaar(v);
    var c = calc(), s = st(), b2b = klant.type === 'bedrijf', web = modus() === 'webshop';
    if (!c.lines.length) {
      v.innerHTML = '<h2 class="lead">' + (web ? 'Mijn selectie' : 'Je winkelwagen') + '</h2><div class="empty">Nog leeg. Kies <b>' + esc(s.knopTekst || 'Toevoegen aan winkelwagen') + '</b> of <b>+</b> bij een wijn.</div>' + voorwaardenHTML(null) + historiek();
      return;
    }
    var teLaag = +s.minBestelling && c.sub < +s.minBestelling;
    var html = '<h2 class="lead">' + (step === 'gegevens' ? 'Je gegevens' : web ? 'Mijn selectie' : 'Je winkelwagen') + '</h2>';
    if (web) {
      html += '<p class="sub">' + c.flessen + ' fles' + (c.flessen === 1 ? '' : 'sen') + '. Je bestelt en betaalt in onze webshop: zet je selectie in één klik in de winkelwagen.</p>' +
        linesHTML(c, false) + notesHTML('Vermeld deze notities in het opmerkingenveld bij het afrekenen.') + totHTML(c, false);
      var los = c.lines.filter(function (l) { return !l.w.webshopId; });
      html += '<div class="row" style="justify-content:flex-end">' +
        '<button class="cta alt" id="o-share">Deel selectie</button>' + (s.email ? '<button class="cta alt" id="o-offerte">Offerte aanvragen</button>' : '') +
        '<button class="cta gold" id="o-shop"' + (teLaag || los.length === c.lines.length ? ' disabled' : '') + '>Afrekenen in de webshop</button></div>' +
        (los.length ? '<p class="meta" style="text-align:right;margin-top:8px">' + los.length + ' wijn' + (los.length === 1 ? ' is' : 'en zijn') + ' nog niet gekoppeld aan een webshopproduct; die voeg je zelf toe via de link.</p>' : '') +
        '<div id="o-prog"></div>';
    } else {
      html += '<p class="sub">' + (step === 'gegevens' ? 'Nog één stap. Je betaalt bij afhaling of levering.' : c.flessen + ' fles' + (c.flessen === 1 ? '' : 'sen')) + '</p>' +
        '<div class="seg" style="max-width:440px;margin-bottom:18px"><button data-kt="particulier" class="' + (b2b ? '' : 'on') + '">Particulier</button><button data-kt="bedrijf" class="' + (b2b ? 'on' : '') + '">Bedrijf / horeca</button></div>' +
        linesHTML(c, b2b) + notesHTML() + totHTML(c, b2b);
      if (step !== 'gegevens') html += '<div class="row" style="justify-content:flex-end"><button class="cta alt" data-v-go="alle">Verder winkelen</button><button class="cta" id="o-next"' + (teLaag ? ' disabled' : '') + '>Bestellen</button></div>';
      else html += formHTML(c, s, b2b);
    }
    html += voorwaardenHTML(c) + historiek();
    v.innerHTML = html;
  }

  function formHTML(c, s, b2b) {
    var afh = s.afhalen !== false, lev = s.levering !== false;
    if (!klant.wijze || (klant.wijze === 'afhalen' && !afh) || (klant.wijze === 'levering' && !lev)) klant.wijze = afh ? 'afhalen' : 'levering';
    function inp(k, l, t, req, full, extra) { return '<label' + (full ? ' class="full"' : '') + '>' + l + (req ? ' *' : '') + '<input class="search" data-k="' + k + '" type="' + (t || 'text') + '" value="' + esc(klant[k] || '') + '"' + (req ? ' required' : '') + (extra || '') + '></label>'; }
    return '<form id="o-form" class="step" style="margin-top:8px" novalidate>' +
      '<h2 style="margin-bottom:14px">Contact</h2><div class="form2">' +
      (b2b ? inp('bedrijf', 'Bedrijfsnaam', 'text', true) + inp('btw', 'Btw-nummer', 'text', true, false, ' placeholder="BE0123.456.789"') : '') +
      inp('naam', 'Naam', 'text', true) + inp('email', 'E-mail', 'email', true) + inp('tel', 'Telefoon', 'tel', true) + '</div>' +
      '<h2 style="margin:22px 0 12px">Afhalen of leveren</h2>' +
      '<div class="seg" style="max-width:440px;margin-bottom:12px">' + (afh ? '<button type="button" data-wz="afhalen" class="' + (klant.wijze === 'afhalen' ? 'on' : '') + '">Afhalen</button>' : '') +
      (lev ? '<button type="button" data-wz="levering" class="' + (klant.wijze === 'levering' ? 'on' : '') + '">Levering</button>' : '') + '</div>' +
      '<div class="form2">' + inp('datum', klant.wijze === 'levering' ? 'Gewenste leverdatum' : 'Gewenste afhaaldatum', 'date', true, false, ' min="' + minDatum() + '"') +
      (klant.wijze === 'levering' ? inp('adres', 'Straat en nummer', 'text', true, true) + inp('postcode', 'Postcode', 'text', true) + inp('gemeente', 'Gemeente', 'text', true) : '') +
      (b2b ? inp('factuuradres', 'Facturatieadres (indien anders)', 'text', false, true) + inp('referentie', 'Uw referentie / PO-nummer') : '') +
      '<label class="full">Opmerking<textarea class="search" data-k="opmerking" rows="3">' + esc(klant.opmerking || '') + '</textarea></label></div>' +
      '<label class="tog" style="margin-top:14px"><input type="checkbox" id="o-akk"> Ik ga akkoord dat mijn gegevens gebruikt worden om deze bestelling te verwerken' + (s.leverVoorwaarden ? ' en met de <a href="#" id="lv-open">leveringsvoorwaarden</a>' : '') + '.</label>' +
      '<label class="tog"><input type="checkbox" id="o-18"> Ik ben 18 jaar of ouder.</label>' +
      '<p id="o-err" style="color:#a33;margin:8px 0 0" hidden></p>' +
      '<div class="row" style="justify-content:flex-end;margin-top:16px"><button type="button" class="cta alt" id="o-back">Terug</button><button class="cta" id="o-send">Bestelaanvraag versturen</button></div>' +
      '<p class="meta" style="text-align:right;margin-top:8px">Je e-mailprogramma opent met je bestelling. De winkel bevestigt ze; betalen bij afhaling of levering.</p></form>';
  }

  function historiek() {
    var h = load(HIST_KEY, []); if (!h.length) return '';
    return '<div style="margin-top:34px"><h3 class="up" style="margin-bottom:8px">Eerdere selecties</h3><div class="tbl-wrap"><table class="tbl"><tr><th>Datum</th><th>Flessen</th><th>Totaal</th><th></th></tr>' +
      h.slice(-5).reverse().map(function (o) {
        return '<tr><td>' + esc(o.tijd.slice(0, 10)) + '</td><td>' + o.lijnen.reduce(function (a, l) { return a + l.n; }, 0) + '</td><td>' + eur(o.totaal) + '</td><td><button class="lnk" data-reorder="' + esc(o.nr) + '">opnieuw</button></td></tr>';
      }).join('') + '</table></div></div>';
  }
  function renderKlaar(v) {
    var o = laatste;
    v.innerHTML = '<div class="ok-box"><p class="up">Bedankt' + (o.klant.naam ? ', ' + esc(o.klant.naam.split(' ')[0]) : '') + '</p><p class="nr">' + esc(o.nr) + '</p>' +
      '<p>Je e-mailprogramma opent met je bestelling. <b>Verstuur die e-mail</b> om de aanvraag te plaatsen; de winkel bevestigt ze daarna.</p>' +
      '<div class="row" style="justify-content:center;margin-top:16px"><button class="cta alt" id="o-copy">Kopieer bestelling</button><button class="cta" data-v-go="advies">Terug naar de wijnkiezer</button></div></div>' +
      '<pre style="white-space:pre-wrap;font-family:inherit;border:1px solid var(--line);padding:16px;margin-top:16px">' + esc(tekst(o)) + '</pre>';
  }
  function lijst(lines) { return lines.map(function (l) { return l.n + ' × ' + l.naam + (l.prijs != null ? ' à ' + eur(l.prijs) : ''); }).join('\n'); }
  function tekst(o) {
    return 'Bestelaanvraag ' + o.nr + '\n' + (o.type === 'bedrijf' ? 'Bedrijf: ' + o.klant.bedrijf + ' · btw ' + o.klant.btw + (o.klant.referentie ? ' · ref. ' + o.klant.referentie : '') + '\n' : '') +
      'Naam: ' + o.klant.naam + '\nE-mail: ' + o.klant.email + '\nTelefoon: ' + o.klant.tel + '\n' +
      (o.levering.wijze === 'levering' ? 'Levering op ' + o.levering.datum + ' · ' + o.levering.adres + ', ' + o.levering.postcode + ' ' + o.levering.gemeente : 'Afhalen op ' + o.levering.datum) + '\n' +
      (o.klant.factuuradres ? 'Facturatieadres: ' + o.klant.factuuradres + '\n' : '') + '\n' + lijst(o.lijnen) + '\n\n' +
      (o.korting ? 'Dooskorting: − ' + eur(o.korting) + '\n' : '') + (o.leverkost ? 'Leverkost: ' + eur(o.leverkost) + '\n' : '') +
      'Totaal: ' + eur(o.totaal) + ' incl. btw' + (o.onbekend ? ' + prijs op aanvraag' : '') +
      (o.notities.length ? '\n\nNotities:\n- ' + o.notities.join('\n- ') : '') + (o.opmerking ? '\n\nOpmerking: ' + o.opmerking : '');
  }
  function bewaarHist(c) {
    var h = load(HIST_KEY, []);
    h.push({ nr: 'S' + Date.now(), tijd: new Date().toISOString(), totaal: c.totaal, lijnen: c.lines.map(function (l) { return { id: l.w.id, naam: l.w.naam, n: l.n, prijs: l.w.prijs }; }) });
    store(HIST_KEY, h.slice(-20));
  }

  /* ---------- naar de webshop-winkelwagen ---------- */
  function naarWebshop() {
    var c = calc(), todo = c.lines.filter(function (l) { return l.w.webshopId; });
    if (!todo.length) return;
    var win = window.open('', 'webshop-winkelwagen');
    if (!win) { $('o-prog').innerHTML = '<p class="meta">Je browser blokkeerde het nieuwe venster. Gebruik de links “los in winkelwagen” per wijn.</p>'; return; }
    try { win.document.write('<p style="font-family:Georgia,serif;font-size:20px;padding:40px">Je selectie wordt in de winkelwagen gezet…</p>'); } catch (e) {}
    var i = 0, pauze = Math.max(800, +st().overzetPauze || 1800);
    bewaarHist(c);
    function volgende() {
      if (win.closed) { $('o-prog').innerHTML = '<p class="meta">Venster gesloten. ' + i + ' van ' + todo.length + ' wijnen toegevoegd.</p>'; return; }
      if (i < todo.length) {
        $('o-prog').innerHTML = '<p class="meta" style="text-align:right">Bezig: ' + (i + 1) + ' / ' + todo.length + ' · ' + esc(todo[i].w.naam) + '…</p>';
        win.location.href = addUrl(todo[i].w, todo[i].n); i++; setTimeout(volgende, pauze);
      } else {
        win.location.href = cartUrl();
        $('o-prog').innerHTML = '<p style="text-align:right">✓ Je selectie staat in de winkelwagen van de webshop. <a href="' + esc(cartUrl()) + '" target="webshop-winkelwagen">Naar de winkelwagen ↗</a></p>';
        try { win.focus(); } catch (e) {}
      }
    }
    volgende();
  }

  /* ---------- acties ---------- */
  function setQty(id, n) {
    var l = cart.find(function (x) { return x.id === id; }); if (!l) return;
    l.n = Math.max(0, n); if (!l.n) cart = cart.filter(function (x) { return x !== l; });
    save(); render();
  }
  function kopieer(t, msg) { if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { WK.toast(msg || 'Gekopieerd'); }); else prompt('Kopieer', t); }
  function bind() {
    var v = $('v-mandje');
    v.addEventListener('click', function (e) {
      var t = e.target, q;
      if ((q = t.closest('[data-cq]'))) { var l = cart.find(function (x) { return x.id === q.dataset.cq; }); if (l) setQty(l.id, l.n + +q.dataset.d); return; }
      if ((q = t.closest('[data-crm]'))) { setQty(q.dataset.crm, 0); return; }
      if ((q = t.closest('[data-nrm]'))) { notes.splice(+q.dataset.nrm, 1); save(); render(); return; }
      if ((q = t.closest('[data-fiche]'))) { e.preventDefault(); WK.openFiche(q.dataset.fiche); return; }
      if ((q = t.closest('[data-kt]'))) { klant.type = q.dataset.kt; store(KLANT_KEY, klant); render(); return; }
      if ((q = t.closest('[data-wz]'))) { collect(); klant.wijze = q.dataset.wz; store(KLANT_KEY, klant); render(); return; }
      if ((q = t.closest('[data-v-go]'))) { if (step === 'klaar') step = 'mandje'; WK.show(q.dataset.vGo); return; }
      if ((q = t.closest('[data-reorder]'))) { var o = load(HIST_KEY, []).find(function (x) { return x.nr === q.dataset.reorder; }); if (o) { o.lijnen.forEach(function (x) { if (wine(x.id)) add(x.id, x.n, { stil: true }); }); WK.toast('Opnieuw toegevoegd'); render(); } return; }
      if (t.id === 'o-shop') { naarWebshop(); return; }
      if (t.id === 'o-copynotes') { kopieer(notes.join('\n'), 'Notities gekopieerd'); return; }
      if (t.id === 'o-share') {
        var c = calc(), txt = 'Mijn wijnselectie\n\n' + lijst(c.lines.map(function (l) { return { n: l.n, naam: l.w.naam, prijs: l.w.prijs }; })) + '\n\nGeschat totaal: ' + eur(c.totaal) + (notes.length ? '\n\n' + notes.join('\n') : '');
        if (navigator.share) navigator.share({ title: 'Mijn wijnselectie', text: txt }).catch(function () {}); else kopieer(txt, 'Selectie gekopieerd');
        return;
      }
      if (t.id === 'o-offerte') {
        var c2 = calc();
        location.href = 'mailto:' + encodeURIComponent(st().email) + '?subject=' + encodeURIComponent('Offerteaanvraag via de Wijnkiezer') + '&body=' + encodeURIComponent('Graag een offerte voor:\n\n' + lijst(c2.lines.map(function (l) { return { n: l.n, naam: l.w.naam, prijs: l.w.prijs }; })) + (notes.length ? '\n\n' + notes.join('\n') : '') + '\n\nBedrijf:\nBtw-nummer:\nNaam en telefoon:\nGewenste leverdatum:');
        return;
      }
      if (t.id === 'o-next') { step = 'gegevens'; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
      if (t.id === 'o-back') { collect(); step = 'mandje'; render(); return; }
      if (t.id === 'o-copy') kopieer(tekst(laatste), 'Bestelling gekopieerd');
    });
    v.addEventListener('change', function (e) { var c = e.target.closest('[data-cn]'); if (c) setQty(c.dataset.cn, +c.value || 0); });
    v.addEventListener('submit', function (e) { e.preventDefault(); plaats(); });
  }
  function collect() {
    var f = $('o-form'); if (!f) return;
    f.querySelectorAll('[data-k]').forEach(function (i) { klant[i.dataset.k] = i.value.trim(); });
    store(KLANT_KEY, klant);
  }
  function fout(t) { var e = $('o-err'); e.textContent = t; e.hidden = false; }
  function plaats() {
    collect();
    var f = $('o-form'), leeg = Array.from(f.querySelectorAll('[required]')).filter(function (i) { return !i.value.trim(); });
    if (leeg.length) { fout('Vul alle verplichte velden in (*).'); leeg[0].focus(); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(klant.email)) { fout('Controleer je e-mailadres.'); return; }
    if (klant.type === 'bedrijf' && !/^[A-Z]{2}\s*[0-9][0-9.\s]{7,14}$/i.test(klant.btw.trim())) { fout('Controleer het btw-nummer (bv. BE0123.456.789).'); return; }
    if (klant.wijze === 'levering' && !inZone(klant.postcode)) { fout('We leveren niet in postcode ' + klant.postcode + '. Kies afhalen of neem contact op.'); return; }
    if (klant.datum < minDatum()) { fout('Kies een datum vanaf ' + minDatum() + '.'); return; }
    if (!$('o-akk').checked || !$('o-18').checked) { fout('Bevestig de twee vinkjes onderaan.'); return; }
    var c = calc(), now = new Date();
    var o = {
      nr: 'WK-' + now.toISOString().slice(2, 10).replace(/-/g, '') + '-' + Math.random().toString(36).slice(2, 6).toUpperCase(),
      tijd: now.toISOString(), type: klant.type,
      klant: { naam: klant.naam, email: klant.email, tel: klant.tel, bedrijf: klant.type === 'bedrijf' ? klant.bedrijf : '', btw: klant.type === 'bedrijf' ? klant.btw : '', factuuradres: klant.type === 'bedrijf' ? klant.factuuradres || '' : '', referentie: klant.type === 'bedrijf' ? klant.referentie || '' : '' },
      levering: { wijze: klant.wijze, datum: klant.datum, adres: klant.adres || '', postcode: klant.postcode || '', gemeente: klant.gemeente || '' },
      lijnen: c.lines.map(function (l) { return { id: l.w.id, naam: l.w.naam, n: l.n, prijs: l.w.prijs }; }),
      korting: c.korting, leverkost: c.leverkost, totaal: Math.round(c.totaal * 100) / 100, onbekend: c.onbekend, notities: notes.slice(), opmerking: klant.opmerking || ''
    };
    var mail = st().email;
    if (mail) location.href = 'mailto:' + encodeURIComponent(mail) + '?subject=' + encodeURIComponent('Bestelaanvraag ' + o.nr) + '&body=' + encodeURIComponent(tekst(o));
    bewaarHist(c);
    cart = []; notes = []; save(); laatste = o; step = 'klaar'; render(); window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  window.WKOrder = {
    init: function () { bind(); updCount(); },
    add: add, addMany: addMany, count: count, render: render, addUrl: addUrl, zoekUrl: zoekUrl
  };
})();
