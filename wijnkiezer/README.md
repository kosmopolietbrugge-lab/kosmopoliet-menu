# Wijnkiezer

Keuzehulp voor wijnen, gebouwd voor de klanten van Wijnhandel Annicaert, met een horeca-module voor food pairing en menu engineering (Kosmopoliet / Kissing Karrots OS).

Het is een statische PWA: geen server nodig, installeerbaar op gsm/tablet ("Zet op beginscherm"), werkt offline.

## Onderdelen

| Pagina | Voor wie | Wat |
|---|---|---|
| `index.html` | klanten | Advies in 4 stappen, alle wijnen met filters, "Bij mijn gerecht" (food pairing), bewaarde wijnen delen of afdrukken |
| `beheer.html` | zaakvoerder | Backoffice: wijnen toevoegen en bewerken, CSV/Excel-import, huisstijl, publiceren |
| `horeca.html` | keuken & zaal | Pairing per gerecht van de menukaart, compacte wijnkaart die heel het menu dekt, prijscalculator |

Na publicatie op GitHub Pages:

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

`id, naam, producent, jaar, kleur, land, regio, druiven, prijs, inkoop, inhoud, alcohol, vegan, bio, smaak{body, zoet, zuur, tannine, fruit, hout}, aromas, pairing, serveertemp, omschrijving, url, foto, actief, uitgelicht, bron`

- `kleur`: rood, wit, rose, bubbels, zoet, versterkt
- smaakassen: 1 (weinig) tot 5 (veel)
- `vegan`: true / false / null (onbekend)
- `pairing`: aperitief, groenten, paddenstoelen, peulvruchten, plantaardig-eiwit, pasta-risotto, vis, schaaldieren, gevogelte, varken, rund, lam, wild, kaas-zacht, kaas-hard, kaas-blauw, fruitdessert, chocolade
- `bron`: fiche, kosmopoliet-kaart, demo
- `inkoop`: horecaprijs excl. btw (wordt alleen gebruikt in de prijscalculator van horeca.html, niet getoond aan klanten)

In de backoffice kan je onder Import / export een CSV-sjabloon downloaden met precies deze kolommen.

## Food pairing

De logica staat in `engine.js` (`pair()`): klassieke sommelierregels op basis van gewicht en intensiteit, zuur, zoet, pikant, zout, umami, romig, tannine bij vis of eiwit, en bereiding. Elke suggestie toont een score en de redenen ervoor, zodat het personeel het advies aan tafel kan uitleggen. De gewichten zijn bewust eenvoudig en kunnen bijgesteld worden.

`horeca.html` leest de gerechten uit `../kaart.json` (de live kaart van het OS), maakt automatisch een smaakprofiel per gerecht (trefwoorden) en laat je dat per gerecht bijstellen. Exporteren kan als CSV of als JSON (gerecht-id → wijn-id's) om later in het OS (velden `pairAlc`) in te lezen.

## Huidige data

- 6 echte wijnen uit de Kosmopoliet-kaart. Het profiel is afgeleid uit de proefnotities, prijs en vegan-status zijn nog niet ingevuld.
- 16 demowijnen ("Demo ·"), alleen om te testen. Verwijder ze met één klik in de backoffice zodra de echte fiches erin staan.
