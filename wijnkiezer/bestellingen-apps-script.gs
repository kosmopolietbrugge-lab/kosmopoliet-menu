/**
 * Wijnkiezer — bestellingen-database in Google Sheets
 *
 * Installatie (± 5 minuten, eenmalig):
 *  1. Maak een nieuwe Google Sheet aan (bv. "Wijnkiezer bestellingen").
 *  2. Menu Extensies > Apps Script. Plak deze volledige code en sla op.
 *  3. Projectinstellingen (tandwiel) > Scripteigenschappen > voeg toe:
 *       SLEUTEL        = een lange geheime code (bv. 24 willekeurige tekens)
 *       MELDING_EMAIL  = e-mailadres van de winkel voor meldingen van nieuwe bestellingen
 *       BEVESTIG_KLANT = ja   (optioneel: stuurt de klant automatisch een ontvangstbevestiging)
 *  4. Implementeren > Nieuwe implementatie > Type: Web-app
 *       Uitvoeren als: Ik   ·   Toegang: Iedereen
 *     Kopieer de web-app-URL (eindigt op /exec).
 *  5. Backoffice > Huisstijl & instellingen > "Bestel-webhook (URL)": plak de URL en publiceer.
 *  6. Backoffice > Bestellingen: plak dezelfde URL en de SLEUTEL om bestellingen te bekijken.
 *
 * Nieuwe bestellingen komen als rij in het tabblad "Bestellingen".
 * De klant-app kan alleen toevoegen; lezen en status wijzigen vraagt de SLEUTEL.
 */
var KOLOMMEN = ['nr', 'tijd', 'status', 'type', 'naam', 'email', 'tel', 'bedrijf', 'btw', 'referentie', 'wijze', 'datum', 'adres',
  'lijnen', 'flessen', 'subtotaal', 'korting', 'leverkost', 'totaal', 'notities', 'opmerking', 'json'];

function blad_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('Bestellingen') || ss.insertSheet('Bestellingen');
  if (sh.getLastRow() === 0) { sh.appendRow(KOLOMMEN); sh.setFrozenRows(1); sh.getRange(1, 1, 1, KOLOMMEN.length).setFontWeight('bold'); }
  return sh;
}
function prop_(k) { return PropertiesService.getScriptProperties().getProperty(k) || ''; }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function eur_(n) { return '€ ' + Number(n || 0).toFixed(2).replace('.', ','); }

function doPost(e) {
  var lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    var body = JSON.parse(e.postData.contents || '{}');
    if (body.actie === 'status') {
      if (!prop_('SLEUTEL') || body.sleutel !== prop_('SLEUTEL')) return json_({ ok: false, fout: 'sleutel' });
      var sh = blad_(), data = sh.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) if (data[i][0] === body.nr) { sh.getRange(i + 1, 3).setValue(body.status); return json_({ ok: true }); }
      return json_({ ok: false, fout: 'niet gevonden' });
    }
    if (body.actie !== 'bestelling' || !body.bestelling) return json_({ ok: false, fout: 'onbekende actie' });
    var o = body.bestelling;
    if (!o.nr || !o.klant || !o.klant.email || !Array.isArray(o.lijnen) || !o.lijnen.length || o.lijnen.length > 200) return json_({ ok: false, fout: 'ongeldig' });
    var lev = o.levering || {};
    blad_().appendRow([
      String(o.nr).slice(0, 40), new Date(), 'nieuw', o.type, o.klant.naam, o.klant.email, o.klant.tel, o.klant.bedrijf, o.klant.btw, o.klant.referentie,
      lev.wijze, lev.datum, [lev.adres, lev.postcode, lev.gemeente].filter(String).join(', '),
      o.lijnen.map(function (l) { return l.n + ' × ' + l.naam; }).join('\n'),
      o.lijnen.reduce(function (a, l) { return a + (+l.n || 0); }, 0),
      o.subtotaal, o.korting, o.leverkost, o.totaal, (o.notities || []).join('\n'), o.opmerking, JSON.stringify(o).slice(0, 45000)
    ]);
    var tekst = 'Bestelling ' + o.nr + '\n' + (o.klant.bedrijf ? o.klant.bedrijf + ' (' + o.klant.btw + ')\n' : '') +
      o.klant.naam + ' · ' + o.klant.tel + ' · ' + o.klant.email + '\n' +
      (lev.wijze === 'levering' ? 'Levering ' + lev.datum + ': ' + [lev.adres, lev.postcode, lev.gemeente].join(' ') : 'Afhalen ' + lev.datum) + '\n\n' +
      o.lijnen.map(function (l) { return l.n + ' × ' + l.naam + (l.prijs != null ? ' à ' + eur_(l.prijs) : ''); }).join('\n') +
      '\n\nTotaal: ' + eur_(o.totaal) + ' incl. btw' + ((o.notities || []).length ? '\n\nNotities:\n' + o.notities.join('\n') : '') + (o.opmerking ? '\n\nOpmerking: ' + o.opmerking : '');
    if (prop_('MELDING_EMAIL')) MailApp.sendEmail({ to: prop_('MELDING_EMAIL'), subject: 'Nieuwe bestelling ' + o.nr, body: tekst, replyTo: o.klant.email });
    if (prop_('BEVESTIG_KLANT') === 'ja') MailApp.sendEmail({ to: o.klant.email, subject: 'We ontvingen je bestelling ' + o.nr,
      body: 'Dag ' + o.klant.naam + ',\n\nBedankt voor je bestelling. We bevestigen ze zo snel mogelijk.\n\n' + tekst + '\n\nBetalen kan bij afhaling of levering.' });
    return json_({ ok: true, nr: o.nr });
  } catch (err) {
    return json_({ ok: false, fout: String(err) });
  } finally { lock.releaseLock(); }
}

function doGet(e) {
  if (!prop_('SLEUTEL') || (e.parameter.sleutel || '') !== prop_('SLEUTEL')) return json_({ ok: false, fout: 'sleutel' });
  var data = blad_().getDataRange().getValues(), uit = [];
  for (var i = 1; i < data.length; i++) {
    var r = data[i], o = {};
    try { o = JSON.parse(r[KOLOMMEN.indexOf('json')] || '{}'); } catch (x) {}
    o.nr = r[0]; o.tijd = r[1] instanceof Date ? r[1].toISOString() : r[1]; o.status = r[2];
    uit.push(o);
  }
  return json_({ ok: true, bestellingen: uit.reverse().slice(0, 500) });
}
