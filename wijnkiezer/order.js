/* ============================================================
   Wijnkiezer — bestelomgeving
   Mandje → gegevens (particulier of bedrijf) → bevestiging.
   Verzenden: naar de bestel-webhook (Google Sheet via Apps Script,
   zie bestellingen-apps-script.gs) en/of per e-mail naar de winkel.
   Betalen gebeurt bij afhaling of levering (geen online betaling).
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

  var cart = load(CART_KEY, []), notes = load(NOTE_KEY, []), klant = load(KLANT_KEY, { type: 'particulier' });
  var step = 'mandje', laatste = null, bezig = false;

  function wine(id) { return WK.wines().find(function (w) { return w.id === id; }); }
  function save() { store(CART_KEY, cart); store(NOTE_KEY, notes); updCount(); }
  function count() { return cart.reduce(function (a, l) { return a + l.n; }, 0); }
  function updCount() { var c = $('cart-n'); if (c) c.textContent = count(); }

  function add(id, n, o) {
    var w = wine(id); if (!w) return;
    if (step === 'klaar') step = 'mandje';
    var l = cart.find(function (x) { return x.id === id; });
    if (l) l.n += n; else cart.push({ id: id, n: n });
    save(); if (!(o && o.stil)) WK.toast(n + ' × ' + w.naam + ' in je mandje');
    bump();
  }
  function addMany(lines, note) {
    lines.forEach(function (l) { add(l.id, l.n, { stil: true }); });
    if (note) { notes.push(note); save(); }
    WK.toast(lines.reduce(function (a, l) { return a + l.n; }, 0) + ' flessen in je mandje');
  }
  function bump() { var b = $('cart-open'); if (!b) return; b.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.08)' }, { transform: 'scale(1)' }], { duration: 260 }); }

  /* ---------- berekening ---------- */
  function calc() {
    var s = st(), lines = [], sub = 0, onbekend = false, fl = 0;
    cart.forEach(function (l) {
      var w = wine(l.id); if (!w) return;
      fl += l.n;
      if (w.prijs == null) onbekend = true; else sub += w.prijs * l.n;
      lines.push({ w: w, n: l.n, tot: w.prijs == null ? null : w.prijs * l.n });
    });
    var kpct = +s.doosKorting || 0, dozen = Math.floor(fl / 6), korting = 0;
    if (kpct && dozen) {
      // korting op de volle dozen (gemiddelde flesprijs × 6 × dozen)
      var bekend = lines.filter(function (l) { return l.w.prijs != null; }), nB = bekend.reduce(function (a, l) { return a + l.n; }, 0);
      var gem = nB ? sub / nB : 0; korting = Math.round(gem * 6 * Math.min(dozen, Math.floor(nB / 6)) * kpct) / 100;
    }
    var lev = klant.wijze === 'levering', leverkost = 0;
    if (lev) { leverkost = +s.leverkost || 0; if (s.gratisLeveringVanaf && sub - korting >= +s.gratisLeveringVanaf) leverkost = 0; }
    var totaal = sub - korting + leverkost, btw = (+s.btw || 21) / 100;
    return { lines: lines, sub: sub, korting: korting, kpct: kpct, leverkost: leverkost, totaal: totaal, excl: totaal / (1 + btw), btw: btw, onbekend: onbekend, flessen: fl };
  }

  /* ---------- weergave ---------- */
  function render() {
    var v = $('v-mandje'); if (!v) return;
    if (step === 'klaar' && laatste) return renderKlaar(v);
    var c = calc(), s = st(), b2b = klant.type === 'bedrijf';
    if (!c.lines.length) {
      v.innerHTML = '<h2 class="lead">Je mandje</h2><div class="empty">Je mandje is nog leeg. Tik op <b>+</b> bij een wijn om hem toe te voegen.</div>' + historiek();
      return;
    }
    var min = +s.minBestelling || 0, teLaag = min && c.sub < min;
    var html = '<h2 class="lead">' + (step === 'gegevens' ? 'Je gegevens' : 'Je mandje') + '</h2>' +
      '<p class="sub">' + (step === 'gegevens' ? 'Nog één stap. Je betaalt bij afhaling of levering.' : c.flessen + ' fles' + (c.flessen === 1 ? '' : 'sen') + ' · bestellen, afhalen of laten leveren') + '</p>' +
      '<div class="seg" style="max-width:420px;margin-bottom:18px"><button data-kt="particulier" class="' + (b2b ? '' : 'on') + '">Particulier</button><button data-kt="bedrijf" class="' + (b2b ? 'on' : '') + '">Bedrijf / horeca</button></div>';
    html += '<div class="cart-l">' + c.lines.map(function (l) {
      return '<div class="cart-r"><div class="nm"><a href="#" data-fiche="' + esc(l.w.id) + '" style="text-decoration:none">' + esc(l.w.naam) + '</a><small>' + esc(W.label(W.KLEUREN, l.w.kleur)) + ' · ' + (l.w.prijs != null ? eur(l.w.prijs) + (b2b ? ' (' + eur(l.w.prijs / (1 + c.btw)) + ' excl.)' : '') : 'prijs op aanvraag') + (l.w.voorraad ? '' : ' · <b>niet op voorraad, wordt besteld</b>') + '</small></div>' +
        '<div class="qty"><button data-cq="' + esc(l.w.id) + '" data-d="-1" aria-label="min">−</button><input data-cn="' + esc(l.w.id) + '" type="number" min="0" value="' + l.n + '"><button data-cq="' + esc(l.w.id) + '" data-d="1" aria-label="plus">+</button></div>' +
        '<div class="price sub-t">' + (l.tot != null ? eur(l.tot) : '—') + '</div>' +
        '<button class="ic" data-crm="' + esc(l.w.id) + '" aria-label="Verwijder">×</button></div>';
    }).join('') + '</div>';
    if (notes.length) html += '<div class="step" style="margin-top:14px"><h3 class="up" style="margin-bottom:6px">Notities bij je bestelling</h3>' + notes.map(function (n, i) { return '<p style="margin:4px 0;font-size:14px">' + esc(n) + ' <button class="lnk" data-nrm="' + i + '" style="font-size:12px">verwijder</button></p>'; }).join('') + '</div>';
    html += '<div class="cart-tot"><div>Subtotaal: <b>' + eur(c.sub) + '</b>' + (c.onbekend ? ' + prijs op aanvraag' : '') + '</div>' +
      (c.korting ? '<div>Dooskorting (' + c.kpct + ' % per 6 flessen): <b>− ' + eur(c.korting) + '</b></div>' : (c.kpct && c.flessen < 6 ? '<div class="meta">Vanaf 6 flessen: ' + c.kpct + ' % dooskorting</div>' : '')) +
      (klant.wijze === 'levering' ? '<div>Levering: <b>' + (c.leverkost ? eur(c.leverkost) : 'gratis') + '</b></div>' : '') +
      '<div class="big">Totaal ' + eur(c.totaal) + '</div><div class="meta">incl. btw' + (b2b ? ' · ' + eur(c.excl) + ' excl. btw' : '') + '</div>' +
      (teLaag ? '<div style="color:#a33">Minimumbestelling: ' + eur(min) + '</div>' : '') + '</div>';

    if (step !== 'gegevens') {
      html += '<div class="row" style="justify-content:flex-end"><button class="cta alt" data-v-go="alle">Verder winkelen</button><button class="cta" id="o-next"' + (teLaag ? ' disabled' : '') + '>Bestellen</button></div>';
    } else html += formHTML(c, s, b2b);
    html += historiek();
    v.innerHTML = html;
  }

  function formHTML(c, s, b2b) {
    var afh = s.afhalen !== false, lev = s.levering !== false;
    if (!klant.wijze) klant.wijze = afh ? 'afhalen' : 'levering';
    var vandaag = new Date(); vandaag.setDate(vandaag.getDate() + 1);
    var minD = vandaag.toISOString().slice(0, 10);
    function inp(k, l, t, req, full, extra) { return '<label' + (full ? ' class="full"' : '') + '>' + l + (req ? ' *' : '') + '<input class="search" data-k="' + k + '" type="' + (t || 'text') + '" value="' + esc(klant[k] || '') + '"' + (req ? ' required' : '') + (extra || '') + '></label>'; }
    return '<form id="o-form" class="step" style="margin-top:8px" novalidate>' +
      '<h2 style="margin-bottom:14px">Contact</h2><div class="form2">' +
      (b2b ? inp('bedrijf', 'Bedrijfsnaam', 'text', true) + inp('btw', 'Btw-nummer', 'text', true, false, ' placeholder="BE0123.456.789"') : '') +
      inp('naam', 'Naam', 'text', true) + inp('email', 'E-mail', 'email', true) + inp('tel', 'Telefoon', 'tel', true) + '</div>' +
      '<h2 style="margin:22px 0 12px">Afhalen of leveren</h2>' +
      '<div class="seg" style="max-width:420px;margin-bottom:12px">' + (afh ? '<button type="button" data-wz="afhalen" class="' + (klant.wijze === 'afhalen' ? 'on' : '') + '">Afhalen in de winkel</button>' : '') +
      (lev ? '<button type="button" data-wz="levering" class="' + (klant.wijze === 'levering' ? 'on' : '') + '">Levering</button>' : '') + '</div>' +
      (klant.wijze === 'afhalen' && s.afhaalInfo ? '<p class="sub">' + esc(s.afhaalInfo) + '</p>' : '') +
      (klant.wijze === 'levering' ? '<p class="sub">' + (s.leverInfo ? esc(s.leverInfo) + ' ' : '') + (+s.leverkost ? 'Leverkost ' + eur(+s.leverkost) + (s.gratisLeveringVanaf ? ', gratis vanaf ' + eur(+s.gratisLeveringVanaf) : '') + '.' : '') + '</p>' : '') +
      '<div class="form2">' + inp('datum', klant.wijze === 'levering' ? 'Gewenste leverdatum' : 'Gewenste afhaaldatum', 'date', true, false, ' min="' + minD + '"') +
      (klant.wijze === 'levering' ? inp('adres', 'Straat en nummer', 'text', true, true) + inp('postcode', 'Postcode', 'text', true) + inp('gemeente', 'Gemeente', 'text', true) : '') +
      (b2b ? inp('factuuradres', 'Facturatieadres (indien anders)', 'text', false, true) + inp('referentie', 'Uw referentie / PO-nummer') : '') +
      '<label class="full">Opmerking<textarea class="search" data-k="opmerking" rows="3" placeholder="bv. graag gekoeld, belletje bij aankomst…">' + esc(klant.opmerking || '') + '</textarea></label></div>' +
      '<label class="tog" style="margin-top:14px"><input type="checkbox" id="o-akk"> Ik ga akkoord dat mijn gegevens gebruikt worden om deze bestelling te verwerken.</label>' +
      '<label class="tog"><input type="checkbox" id="o-18"> Ik ben 18 jaar of ouder.</label>' +
      '<p id="o-err" style="color:#a33;margin:8px 0 0" hidden></p>' +
      '<div class="row" style="justify-content:flex-end;margin-top:16px"><button type="button" class="cta alt" id="o-back">Terug naar mandje</button><button class="cta" id="o-send">Bestelling plaatsen · ' + eur(c.totaal) + '</button></div>' +
      '<p class="meta" style="text-align:right;margin-top:8px">Betalen bij afhaling of levering. Je ontvangt een bevestiging van de winkel.</p></form>';
  }

  function historiek() {
    var h = load(HIST_KEY, []); if (!h.length) return '';
    return '<div style="margin-top:34px"><h3 class="up" style="margin-bottom:8px">Mijn vorige bestellingen</h3><div class="tbl-wrap"><table class="tbl"><tr><th>Nr</th><th>Datum</th><th>Flessen</th><th>Totaal</th><th></th></tr>' +
      h.slice(-5).reverse().map(function (o, i) {
        return '<tr><td>' + esc(o.nr) + '</td><td>' + esc(o.tijd.slice(0, 10)) + '</td><td>' + o.lijnen.reduce(function (a, l) { return a + l.n; }, 0) + '</td><td>' + eur(o.totaal) + '</td><td><button class="lnk" data-reorder="' + esc(o.nr) + '">opnieuw bestellen</button></td></tr>';
      }).join('') + '</table></div></div>';
  }

  function renderKlaar(v) {
    var o = laatste;
    v.innerHTML = '<div class="ok-box"><p class="up">Bedankt' + (o.klant.naam ? ', ' + esc(o.klant.naam.split(' ')[0]) : '') + '</p><p class="nr">' + esc(o.nr) + '</p>' +
      '<p>' + (o.verzonden === 'webhook' ? 'Je bestelling is goed ontvangen. De winkel bevestigt ze zo snel mogelijk per e-mail of telefoon.' :
        o.verzonden === 'mail' ? 'Je e-mailprogramma opent met je bestelling. <b>Verstuur die e-mail</b> om de bestelling te plaatsen.' :
        'Kopieer je bestelling en bezorg ze aan de winkel.') + '</p>' +
      '<p class="meta">' + (o.levering.wijze === 'levering' ? 'Levering' : 'Afhalen') + (o.levering.datum ? ' op ' + esc(o.levering.datum) : '') + ' · ' + eur(o.totaal) + ' incl. btw · betalen bij ' + (o.levering.wijze === 'levering' ? 'levering' : 'afhaling') + '</p>' +
      '<div class="row" style="justify-content:center;margin-top:16px"><button class="cta alt" id="o-copy">Kopieer bestelling</button><button class="cta alt" onclick="print()">Afdrukken</button><button class="cta" data-v-go="advies">Terug naar de wijnkiezer</button></div></div>' +
      '<pre style="white-space:pre-wrap;font-family:inherit;font-size:13.5px;border:1px solid var(--line);padding:16px;margin-top:16px">' + esc(tekst(o)) + '</pre>';
  }

  function tekst(o) {
    return 'Bestelling ' + o.nr + ' (' + o.tijd.slice(0, 16).replace('T', ' ') + ')\n' +
      (o.type === 'bedrijf' ? 'Bedrijf: ' + o.klant.bedrijf + ' · btw ' + o.klant.btw + (o.klant.referentie ? ' · ref. ' + o.klant.referentie : '') + '\n' : '') +
      'Naam: ' + o.klant.naam + '\nE-mail: ' + o.klant.email + '\nTelefoon: ' + o.klant.tel + '\n' +
      (o.levering.wijze === 'levering' ? 'Levering op ' + o.levering.datum + ' · ' + o.levering.adres + ', ' + o.levering.postcode + ' ' + o.levering.gemeente : 'Afhalen op ' + o.levering.datum) + '\n' +
      (o.klant.factuuradres ? 'Facturatieadres: ' + o.klant.factuuradres + '\n' : '') + '\n' +
      o.lijnen.map(function (l) { return l.n + ' × ' + l.naam + (l.prijs != null ? ' à ' + eur(l.prijs) + ' = ' + eur(l.prijs * l.n) : ' (prijs op aanvraag)'); }).join('\n') +
      '\n\n' + (o.korting ? 'Dooskorting: − ' + eur(o.korting) + '\n' : '') + (o.leverkost ? 'Leverkost: ' + eur(o.leverkost) + '\n' : '') +
      'Totaal: ' + eur(o.totaal) + ' incl. btw' + (o.onbekend ? ' + prijs op aanvraag' : '') +
      (o.notities.length ? '\n\nNotities:\n- ' + o.notities.join('\n- ') : '') + (o.opmerking ? '\n\nOpmerking: ' + o.opmerking : '');
  }

  /* ---------- acties ---------- */
  function setQty(id, n) {
    var l = cart.find(function (x) { return x.id === id; }); if (!l) return;
    l.n = Math.max(0, n); if (!l.n) cart = cart.filter(function (x) { return x !== l; });
    save(); render();
  }
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
      if ((q = t.closest('[data-reorder]'))) { var o = load(HIST_KEY, []).find(function (x) { return x.nr === q.dataset.reorder; }); if (o) { o.lijnen.forEach(function (l) { if (wine(l.id)) add(l.id, l.n, { stil: true }); }); WK.toast('Vorige bestelling in je mandje'); render(); } return; }
      if (t.id === 'o-next') { step = 'gegevens'; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
      if (t.id === 'o-back') { collect(); step = 'mandje'; render(); return; }
      if (t.id === 'o-copy') { var txt = tekst(laatste); if (navigator.clipboard) navigator.clipboard.writeText(txt).then(function () { WK.toast('Bestelling gekopieerd'); }); else prompt('Kopieer', txt); }
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
    if (bezig) return;
    collect();
    var f = $('o-form'), leeg = Array.from(f.querySelectorAll('[required]')).filter(function (i) { return !i.value.trim(); });
    if (leeg.length) { fout('Vul alle verplichte velden in (*).'); leeg[0].focus(); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(klant.email)) { fout('Controleer je e-mailadres.'); return; }
    if (klant.type === 'bedrijf' && !/^(BE)?\s*0?[0-9]{3}[.\s]?[0-9]{3}[.\s]?[0-9]{3}$/i.test(klant.btw.replace(/\s/g, '')) && !/^[A-Z]{2}[0-9A-Z.\s]{6,14}$/i.test(klant.btw)) { fout('Controleer het btw-nummer.'); return; }
    if (!$('o-akk').checked || !$('o-18').checked) { fout('Bevestig de twee vinkjes onderaan.'); return; }
    var c = calc(), now = new Date();
    var o = {
      nr: 'WK-' + now.toISOString().slice(2, 10).replace(/-/g, '') + '-' + Math.random().toString(36).slice(2, 6).toUpperCase(),
      tijd: now.toISOString(), type: klant.type, status: 'nieuw',
      klant: { naam: klant.naam, email: klant.email, tel: klant.tel, bedrijf: klant.type === 'bedrijf' ? klant.bedrijf : '', btw: klant.type === 'bedrijf' ? klant.btw : '', factuuradres: klant.type === 'bedrijf' ? klant.factuuradres || '' : '', referentie: klant.type === 'bedrijf' ? klant.referentie || '' : '' },
      levering: { wijze: klant.wijze, datum: klant.datum, adres: klant.adres || '', postcode: klant.postcode || '', gemeente: klant.gemeente || '' },
      lijnen: c.lines.map(function (l) { return { id: l.w.id, naam: l.w.naam, n: l.n, prijs: l.w.prijs }; }),
      subtotaal: c.sub, korting: c.korting, leverkost: c.leverkost, totaal: Math.round(c.totaal * 100) / 100, onbekend: c.onbekend,
      notities: notes.slice(), opmerking: klant.opmerking || ''
    };
    var s = st();
    bezig = true; $('o-send').disabled = true; $('o-send').textContent = 'Bezig…';
    var p = s.bestelWebhook
      ? fetch(s.bestelWebhook, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ actie: 'bestelling', bestelling: o }) })
          .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json().catch(function () { return { ok: true }; }); })
          .then(function (j) { if (j && j.ok === false) throw new Error(j.fout || 'geweigerd'); o.verzonden = 'webhook'; })
      : Promise.reject(new Error('geen webhook'));
    p.catch(function (err) {
      if (s.bestelWebhook) console.warn('Webhook mislukt', err);
      if (s.email) { o.verzonden = 'mail'; location.href = 'mailto:' + encodeURIComponent(s.email) + '?subject=' + encodeURIComponent('Bestelling ' + o.nr) + '&body=' + encodeURIComponent(tekst(o)); }
      else o.verzonden = 'kopie';
    }).then(function () {
      bezig = false;
      var h = load(HIST_KEY, []); h.push(o); store(HIST_KEY, h.slice(-20));
      cart = []; notes = []; save(); laatste = o; step = 'klaar'; render(); window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  window.WKOrder = {
    init: function () { bind(); updCount(); },
    add: add, addMany: addMany, count: count,
    render: function () { if (step === 'klaar' && $('v-mandje').classList.contains('on') && !laatste) step = 'mandje'; render(); }
  };
})();
