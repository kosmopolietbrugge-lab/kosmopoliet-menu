# Wijnkiezer

Keuzehulp voor wijnen, gebouwd voor de klanten van Wijnhandel Annicaert, met een horeca-module voor food pairing en menu engineering (Kosmopoliet / Kissing Karrots OS).

Het is een statische PWA: geen server nodig, installeerbaar op gsm/tablet ("Zet op beginscherm"), werkt offline.

## Onderdelen

| Pagina | Voor wie | Wat |
|---|---|---|
| `index.html` | klanten | Advies in 4 stappen, alle wijnen met filters, "Bij mijn gerecht" (food pairing), cadeaumodus, hoeveelheidscalculator, bewaarde wijnen, voorkeuren (preselectie), mandje en bestellen |
| `over.html` | zaakvoerder | Presentatie van alle mogelijkheden, de link om door te sturen |
| `beheer.html` | zaakvoerder | Backoffice: wijnen, import/export, instellingen (levering, voorraad, prijzen, bestellen), huisstijl, publiceren |
| `horeca.html` | keuken & zaal | Pairing per gerecht van de menukaart, compacte wijnkaart die heel het menu dekt, prijscalculator |

Na publicatie op GitHub Pages:

- Presentatie (om door te sturen): `https://kosmopolietbrugge-lab.github.io/kosmopoliet-menu/wijnkiezer/over.html`
- Klant-app: `https://kosmopolietbrugge-lab.github.io/kosmopoliet-menu/wijnkiezer/`
- Backoffice: `…/wijnkiezer/beheer.html` (code: `1234`, wijzig die in Huisstijl)
- Horeca: `…/wijnkiezer/horeca.html`

## Database

`wijnen.json` is de database: de instellingen (huisstijl) plus alle wijnen. De backoffice werkt op een concept dat in de browser blijft staan tot je publiceert:

1. Wijzigen in `beheer.html` (of importeren uit Excel/CSV).
2. Controleren via **Voorbeeld** (`index.html?voorbeeld`).
3. **Publiceren**: rechtstreeks naar GitHub met een fine-grained token (rechten: enkel *Contents: read & write* op deze repository), of `wijnen.json` downloaden en uploaden.

De beheercode is alleen een drempel: de echte beveiliging is het GitHub-token. Zonder token kan niemand iets live zetten.

### Velden per wijn

`id, naam, producent, jaar, kleur, land, regio, druiven, prijs, inkoop, inhoud, alcohol, vegan, bio, biodynamisch, natuurwijn, sulfietarm, voorraad, stock, webshopId, smaak{body, zoet, zuur, tannine, fruit, hout}, aromas, pairing, serveertemp, omschrijving, url, foto, actief, uitgelicht, bron`

- `kleur`: rood, wit, rose, bubbels, zoet, versterkt
- smaakassen: 1 (weinig) tot 5 (veel)
- `vegan`: true / false / null (onbekend)
- `pairing`: groepen en specifieke ingrediënten (volledige lijst: `GROEPEN` in `engine.js`). Een groepstag (bv. `groenten`) geldt algemeen, een specifieke tag weegt zwaarder:
  - aperitief: olijven-noten, gefrituurde-hapjes
  - groenten: asperge, artisjok, tomaat, paprika, aubergine, courgette, pompoen, wortelgroenten, biet, prei-ui, kool, bladgroen, venkel, erwten-boontjes, avocado, mais, witloof
  - paddenstoelen: champignon, bospaddenstoelen, truffel
  - peulvruchten: linzen, kikkererwten, bonen
  - plantaardig-eiwit: tofu, tempeh, seitan, noten-zaden, vegan-kaas
  - zee: zeewier, vis, schaaldieren
  - granen: pasta-risotto, pizza-brood, granen-bulgur
  - vlees: gevogelte, varken, rund, lam, wild
  - kaas: kaas-zacht, geitenkaas, kaas-hard, kaas-blauw
  - dessert: fruitdessert, chocolade, karamel-noten
- `voorraad`: true / false (niet op voorraad = toch bestelbaar, met vermelding)
- `bron`: fiche, webshop, kosmopoliet-kaart, demo
- `inkoop`: horecaprijs excl. btw (wordt alleen gebruikt in de prijscalculator van horeca.html, niet getoond aan klanten)

In de backoffice kan je onder Import / export een CSV-sjabloon downloaden met precies deze kolommen.

## Cadeaumodus

Tabblad **Cadeau** (rechtstreeks: `index.html?tab=cadeau`). De klant kiest voor wie (kenner, liefhebber, beginner, weet niet), de gelegenheid (ook zakelijk relatiegeschenk), wat de ontvanger graag drinkt, het budget per cadeau, het aantal flessen (1, 2, 3 of een kistje van 6, gemengd of dezelfde wijn) en het aantal cadeaus.

Je krijgt drie pakketten met de totaalprijs, binnen het budget. Na de keuze schrijf je een kaartje (de tekst wordt per gelegenheid voorgesteld), kies je of het ingepakt moet worden en stuur je de bestelling door. Bij een zakelijke bestelling of 10 of meer cadeaus verschijnt een verwijzing naar volumeprijzen in de winkel.

## Hoeveelheidscalculator

Tabblad **Hoeveel flessen?** (`index.html?tab=hoeveel`). Invoer: aantal gasten, duur, percentage niet-drinkers, soort event (receptie, diner, walking dinner, feest/BBQ), seizoen, tempo, reserve van 10 %, afronden per doos van 6, dessertwijn en een maximumprijs per fles.

- Vuistregel: 2 glazen het eerste uur, daarna 1 per uur, maal het tempo (0,8 / 1 / 1,25).
- 6 glazen per fles stille wijn, 7 flûtes per fles bubbels, 8 glaasjes per fles dessertwijn.
- Bij een diner telt 1 glas bubbels als aperitief per gast.
- De verdeling over bubbels, wit, rosé en rood hangt af van het soort event en het seizoen (`SPLIT` in `tools.js`, vrij aan te passen).

Per kleur stelt de calculator een wijn voor die de klant kan wijzigen, met subtotaal en totaal. Het aantal flessen is per kleur bij te stellen met − en +.

## Voorkeuren (preselectie)

Knop **Voorkeuren** rechtsboven. Wat je hier kiest, geldt voor alle onderdelen: vegan, bio, biodynamisch, natuurwijn, zonder toegevoegde sulfieten, alcohol (laag of alcoholvrij), budget per fles (slider met minimum en maximum), land van herkomst, regio, druif, flesformaat (halve fles, fles, magnum) en enkel op voorraad. De actieve keuzes staan als balk onder de menubalk en zijn één voor één weg te klikken.

## Bestellen

Instelbaar in de backoffice > Instellingen > Bestellen:

- **Via de eigen webshop** (standaard). De klant stelt een selectie samen (knop "Toevoegen aan winkelwagen" of +) en kiest "Afrekenen in de webshop". De app zet elk product één voor één in de winkelwagen van de webshop, via de link `{webshop}/?add-to-cart={id}&quantity={n}`, en opent daarna de winkelwagen. Daarvoor heeft elke wijn een **webshop-product-ID** nodig (veld `webshopId`). Zonder ID linkt de wijn naar de zoekfunctie van de webshop. [assumptie] De link werkt zo voor een WooCommerce-webshop; bij een ander systeem pas je de link aan bij Instellingen.
- **Bestelaanvraag per e-mail**: mandje, gegevens (particulier of bedrijf met btw-nummer), afhalen of levering, met controle op leverzone, levertermijn en minimum. Het resultaat is een e-mail naar het winkeladres.
- **Uit**: enkel advies.

In alle modi is er een **offerteaanvraag** per e-mail (handig voor B2B) en kan de klant zijn selectie delen. Notities uit Cadeau (kaartje, inpakwens) gaan mee.

## Instellingen (backoffice)

- **Contact**: zwarte balk bovenaan (namen en telefoonnummers), e-mail, webshop-URL, adres.
- **Bestellen**: modus, knoptekst, winkelwagenlink, winkelwagenpagina, zoeklink, pauze per product.
- **Leveringsvoorwaarden**: afhalen (met info), levering, leverzone (postcodes, bv. `8000-8490, 8730`), leverdagen, levertermijn in werkdagen, leverkost, gratis levering vanaf, minimumbestelling, volledige voorwaarden als tekst (link in de footer en bij het bestellen).
- **Voorraad**: voorraad tonen (alleen status, exact aantal of niets), wat met wijnen die niet op voorraad zijn (tonen en bestelbaar, niet bestelbaar of verbergen), tekst bij niet op voorraad, "bijna op"-drempel. Per wijn vul je "voorraad" (ja/nee) in of een exact aantal (`stock`).
- **Prijzen**: tonen ja/nee, tekst bij geen prijs, btw, dooskorting per 6 flessen.
- **Onderdelen**: elk tabblad van de klant-app apart aan of uit, demowijnen tonen.
- **Toegang**: beheercode.

## Presentatiepagina

`over.html` is de link om door te sturen: een overzicht van alle mogelijkheden, met knoppen om elk onderdeel meteen te proberen en de testcode voor de backoffice.

## Food pairing

De logica staat in `engine.js` (`pair()`): klassieke sommelierregels op basis van gewicht en intensiteit, zuur, zoet, pikant, zout, umami, romig, tannine bij vis of eiwit, en bereiding. Elke suggestie toont een score en de redenen ervoor, zodat het personeel het advies aan tafel kan uitleggen. De gewichten zijn bewust eenvoudig en kunnen bijgesteld worden.

`horeca.html` leest de gerechten uit `../kaart.json` (de live kaart van het OS), maakt automatisch een smaakprofiel per gerecht (trefwoorden) en laat je dat per gerecht bijstellen. Exporteren kan als CSV of als JSON (gerecht-id → wijn-id's) om later in het OS (velden `pairAlc`) in te lezen.

## Huidige data

- 6 echte wijnen uit de Kosmopoliet-kaart. Het profiel is afgeleid uit de proefnotities, prijs en vegan-status zijn nog niet ingevuld.
- 16 demowijnen ("Demo ·"), alleen om te testen. Verwijder ze met één klik in de backoffice zodra de echte fiches erin staan.
