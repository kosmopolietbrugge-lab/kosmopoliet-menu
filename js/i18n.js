/* ============================================================
   Kosmopoliet OS - offline i18n (NL / EN / PT)
   Vertaalt de UI zonder internet. Werkt als een laagje bovenop de
   bestaande code: het bewaart de originele NL-tekst per DOM-node en
   vervangt die door de vertaling uit het woordenboek. Onvertaalde
   zinnen blijven gewoon Nederlands (geen breuk). Het servicesysteem
   (#svc-root) heeft zijn eigen vertaling en wordt hier overgeslagen.
   ============================================================ */
(function () {
  'use strict';
  var STORE = 'kosmo-uilang';
  var lang = 'nl';
  try { lang = localStorage.getItem(STORE) || 'nl'; } catch (e) {}

  var DICT = {
    ne: {
      // vertaling [assumptie] - graag nagekeken door een moedertaalspreker
      'Mijn profiel': 'मेरो प्रोफाइल', 'Je eigen aanmeldnaam en wachtwoord aanpassen.': 'आफ्नो लगइन नाम र पासवर्ड परिवर्तन गर्नुहोस्।',
      'Clearance & rollen': 'पहुँच र भूमिका', 'Beheren': 'व्यवस्थापन', 'Rollen van teamleden': 'टोली सदस्यका भूमिका',
      'Rollen toewijzen en toegangsniveaus per module/onderdeel instellen.': 'भूमिका तोक्नुहोस् र प्रति मोड्युल/खण्ड पहुँच स्तर सेट गर्नुहोस्।',
      'Pas je eigen aanmeldnaam en wachtwoord aan.': 'आफ्नो लगइन नाम र पासवर्ड परिवर्तन गर्नुहोस्।', 'Profiel opgeslagen': 'प्रोफाइल सुरक्षित गरियो',
      'Aanmelden': 'साइन इन', 'Gebruiker': 'प्रयोगकर्ता', 'Wachtwoord': 'पासवर्ड', 'Onjuist wachtwoord.': 'गलत पासवर्ड।',
      'Afmelden': 'साइन आउट', 'Aangemeld als': 'यसरूपमा साइन इन', 'niet aangemeld': 'साइन इन नगरिएको', 'Enkel voor management': 'व्यवस्थापनका लागि मात्र',
      'Teamleden & toegang': 'टोली सदस्य र पहुँच', 'Teamlid toevoegen': 'टोली सदस्य थप्नुहोस्', 'Nieuw teamlid': 'नयाँ टोली सदस्य', 'wachtwoord': 'पासवर्ड',
      'Beheer teamleden en hun toegangsniveau (help, staff, management). Wijzigingen synchroniseren naar alle toestellen.': 'टोली सदस्य र तिनको पहुँच स्तर (help, staff, management) व्यवस्थापन गर्नुहोस्। परिवर्तनहरू सबै उपकरणमा सिंक हुन्छन्।',
      'Profielen, functies, toegang en wachtwoorden van je crew (enkel management).': 'तपाईंको टोलीका प्रोफाइल, भूमिका, पहुँच र पासवर्ड (व्यवस्थापन मात्र)।',
      'Kaartrecepten': 'मेनु रेसिपी', 'Basisrecepten': 'आधार रेसिपी', 'Ingrediënten': 'सामग्रीहरू', 'Marge-analyse': 'मार्जिन विश्लेषण',
      'Bewerk': 'सम्पादन', 'Kopie': 'प्रतिलिपि', 'Print / PDF': 'प्रिन्ट / PDF', 'Productieblad printen': 'उत्पादन पाना प्रिन्ट गर्नुहोस्',
      'Nieuw basisrecept': 'नयाँ आधार रेसिपी', 'Nieuw kaartrecept': 'नयाँ मेनु रेसिपी', 'Basisrecept bewerken': 'आधार रेसिपी सम्पादन', 'Kaartrecept bewerken': 'मेनु रेसिपी सम्पादन',
      'Naam': 'नाम', 'Naamloos': 'नामरहित', 'Foto': 'फोटो', 'Menu-foto': 'मेनु फोटो', 'Leverancier': 'आपूर्तिकर्ता',
      'Productgroep': 'उत्पादन समूह', 'Productgroep (intern)': 'उत्पादन समूह (आन्तरिक)', 'Extra info': 'थप जानकारी',
      'Korte omschrijving': 'छोटो विवरण', 'Uitgebreide omschrijving': 'विस्तृत विवरण', 'Werkwijze NL': 'विधि NL', 'Procedure EN': 'विधि EN', 'Werktijd (min)': 'काम समय (मिनेट)',
      'Btw': 'भ्याट', 'Btw %': 'भ्याट %', 'Aantal porties': 'पोर्सन संख्या', 'Begingewicht (kg/lt)': 'सुरु तौल (kg/l)', 'Eindgewicht (na waste)': 'अन्तिम तौल (खेर गएपछि)', 'Eindgewicht': 'अन्तिम तौल',
      'Gekocht gewicht (kg/lt)': 'किनेको तौल (kg/l)', 'Gewicht per portie (kg/lt)': 'प्रति पोर्सन तौल (kg/l)', 'Gewicht per portie': 'प्रति पोर्सन तौल',
      'Kook/bakfactor': 'पकाउने/बेक फ्याक्टर', 'Kook/bak begingewicht': 'पकाउने सुरु तौल', 'Gepland gewicht na KBF': 'KBF पछि योजना तौल', 'Opbrengst na KBF': 'KBF पछि उत्पादन',
      'Totaal gepland gewicht': 'कुल योजना तौल', 'Totaal gewicht (voor koken)': 'कुल तौल (पकाउनु अघि)',
      'Kostprijs per kg (foodcost)': 'प्रति kg लागत (फूडकस्ट)', 'Kostprijs per kg': 'प्रति kg लागत', 'Foodcost + arbeid per kg': 'फूडकस्ट + श्रम प्रति kg',
      'Arbeid totaal': 'कुल श्रम', 'Arbeidskost totaal': 'कुल श्रम लागत', 'Doel-foodcost % (voor prijssuggestie)': 'लक्ष्य फूडकस्ट % (मूल्य सुझावका लागि)', 'Gesuggereerde prijs incl.': 'सुझाव गरिएको मूल्य (सहित)',
      'Verkoop excl. btw': 'बिक्री (भ्याट बाहेक)', 'Verkoop incl. btw': 'बिक्री (भ्याट सहित)', 'Verkoopprijs excl. btw': 'बिक्री मूल्य (भ्याट बाहेक)', 'Verkoopprijs incl. btw': 'बिक्री मूल्य (भ्याट सहित)',
      'Extra kosten': 'अतिरिक्त लागत', 'Extra kosten excl. btw': 'अतिरिक्त लागत (भ्याट बाहेक)',
      'F&B cost %': 'F&B लागत %', 'F&B cost per portie': 'प्रति पोर्सन F&B लागत', 'F&B cost/portie': 'F&B लागत/पोर्सन',
      'Totale F&B cost %': 'कुल F&B लागत %', 'Totale F&B cost per portie': 'प्रति पोर्सन कुल F&B लागत', 'Totale F&B cost/portie': 'कुल F&B लागत/पोर्सन', 'Totale foodcost %': 'कुल फूडकस्ट %',
      'Marge per portie (excl.)': 'प्रति पोर्सन मार्जिन (बाहेक)', 'Marge/portie': 'मार्जिन/पोर्सन', 'Operationeel resultaat %': 'सञ्चालन नतिजा %', 'Personeelskost %': 'कर्मचारी लागत %', 'Personeelskost per portie': 'प्रति पोर्सन कर्मचारी लागत',
      'Gepubliceerd in het klantmenu.': 'ग्राहक मेनुमा प्रकाशित।', 'Menukaart niet beschikbaar.': 'मेनु उपलब्ध छैन।', 'Sta pop-ups toe om te printen.': 'प्रिन्ट गर्न पप-अप अनुमति दिनुहोस्।', 'Sta pop-ups toe.': 'पप-अप अनुमति दिनुहोस्।', 'Slaatje niet meegerekend.': 'सलाद समावेश छैन।',
      'Online - gesynct': 'अनलाइन - सिंक भयो', 'Offline - lokaal actief': 'अफलाइन - स्थानीय रूपमा सक्रिय',
      'Openen': 'खोल्नुहोस्', 'Binnenkort': 'चाँडै', 'Terug': 'फर्कनुहोस्', 'Bewerken': 'सम्पादन', 'Opslaan': 'सुरक्षित गर्नुहोस्',
      'KosmoKrew': 'KosmoKrew', 'Keukenmanagement': 'भान्सा व्यवस्थापन', 'Bar/zaalmanagement': 'बार/हल व्यवस्थापन',
      'F&B / Menu Engineering': 'F&B / मेनु इन्जिनियरिङ', 'Business Management': 'व्यापार व्यवस्थापन',
      'Marketing Management': 'मार्केटिङ व्यवस्थापन', 'Housekeeping / Leveranciers': 'हाउसकिपिङ / आपूर्तिकर्ता', 'Settings': 'सेटिङ',
      'Personeel & team': 'कर्मचारी र टोली', 'Keuken & productie': 'भान्सा र उत्पादन', 'Bar & bediening': 'बार र सेवा',
      'Menu & marges': 'मेनु र मार्जिन', 'Cijfers & sturing': 'तथ्याङ्क र सञ्चालन', 'Bereik & gasten': 'पहुँच र पाहुना',
      'Onderhoud & inkoop': 'मर्मत र खरिद', 'Instellingen': 'सेटिङ',
      'Je crew op een plek: roosters, uren, onboarding en interne communicatie voor de hele KosmoKrew.': 'तपाईंको टोली एकै ठाउँमा: तालिका, घण्टा, अनबोर्डिङ र सम्पूर्ण KosmoKrew का लागि आन्तरिक सञ्चार।',
      'Alles wat achter de pass gebeurt: mise en place, tickets, voorraad, recepten en voedselveiligheid.': 'भान्सामा हुने सबै: mise en place, टिकट, भण्डार, रेसिपी र खाद्य सुरक्षा।',
      'De frontlinie van de service: reserveringen, tafelplan, bestellingen, barvoorraad en afrekenen.': 'सेवाको अग्रपंक्ति: आरक्षण, टेबल योजना, अर्डर, बार भण्डार र भुक्तानी।',
      'De kern: bouw je plantaardige kaart, bereken foodcost en marges, analyseer wat verkoopt.': 'मूल: तपाईंको वनस्पतिजन्य मेनु बनाउनुहोस्, फूडकस्ट र मार्जिन गणना गर्नुहोस्, के बिक्छ विश्लेषण गर्नुहोस्।',
      'Het overzicht voor de eigenaar: KPI-dashboard, omzet, boekhouding, cashflow en doelen.': 'मालिकको अवलोकन: KPI ड्यासबोर्ड, कारोबार, लेखा, नगद प्रवाह र लक्ष्य।',
      'Vul je zaal: campagnes, social media, reviews, nieuwsbrief en loyaliteit voor terugkerende gasten.': 'तपाईंको हल भर्नुहोस्: अभियान, सामाजिक सञ्जाल, समीक्षा, न्युजलेटर र फर्किने पाहुनाका लागि वफादारी।',
      'De achtergrond die alles laat draaien: schoonmaak, onderhoud, leveranciers, inkoop en duurzaamheid.': 'सबै चलाउने पृष्ठभूमि: सरसफाइ, मर्मत, आपूर्तिकर्ता, खरिद र दिगोपन।',
      'Beheer je account, gebruikers, thema, menu-visuals en offline-instellingen van Kosmopoliet OS.': 'Kosmopoliet OS को खाता, प्रयोगकर्ता, थिम, मेनु दृश्य र अफलाइन सेटिङ व्यवस्थापन गर्नुहोस्।',
      'Teamleden': 'टोली सदस्यहरू', 'Profielen, functies en contactgegevens van je crew.': 'तपाईंको टोलीका प्रोफाइल, भूमिका र सम्पर्क विवरण।',
      'Roosters': 'तालिका', 'Diensten plannen, ruilen en publiceren per week.': 'साप्ताहिक शिफ्ट योजना, साटासाट र प्रकाशन।',
      'Uren & loon': 'घण्टा र तलब', 'Klok-in/klok-uit, gewerkte uren en loonoverzicht.': 'क्लक-इन/आउट, काम गरेको घण्टा र तलब अवलोकन।',
      'Onboarding': 'अनबोर्डिङ', 'Nieuwe medewerkers, checklists en trainingen.': 'नयाँ कर्मचारी, चेकलिस्ट र तालिम।',
      'Communicatie': 'सञ्चार', 'Interne mededelingen, shift-notities en briefings.': 'आन्तरिक सूचना, शिफ्ट नोट र ब्रिफिङ।',
      'Beschikbaarheid': 'उपलब्धता', 'Verlof, ziekmeldingen en beschikbaarheid beheren.': 'बिदा, बिरामी सूचना र उपलब्धता व्यवस्थापन।',
      'Menu': 'मेनु', 'Open het klant-bestelplatform (QR / URL) voor de gasten.': 'पाहुनाका लागि ग्राहक अर्डर प्लेटफर्म (QR / URL) खोल्नुहोस्।',
      'Mise en place': 'Mise en place', 'Voorbereidingslijsten en prep per shift.': 'प्रति शिफ्ट तयारी सूची र prep।',
      'Service': 'सेवा', 'Live keukentickets per gang - open het servicesysteem (keukenkant).': 'प्रति गाङ लाइभ भान्सा टिकट - सेवा प्रणाली (भान्सा तर्फ) खोल्नुहोस्।',
      'Items en categorieen keuken': 'भान्सा वस्तु र कोटिहरू', 'Beheer keuken-categorieen en gerechten voor de klantkaart.': 'ग्राहक मेनुका लागि भान्सा कोटि र परिकार व्यवस्थापन।',
      'Bestellingen en voorraad keuken': 'भान्सा अर्डर र भण्डार', 'Ingredienten bestellen, tellingen en minimumniveaus.': 'सामग्री अर्डर, गणना र न्यूनतम स्तर।',
      'Verspilling': 'खेर', 'Weggooiregistratie en foodwaste-analyse.': 'फाल्ने रेकर्ड र खाद्य खेर विश्लेषण।',
      'Menu klant': 'ग्राहक मेनु', 'Open de digitale klantkaart (QR / URL) die gasten zien.': 'पाहुनाले देख्ने डिजिटल ग्राहक मेनु (QR / URL) खोल्नुहोस्।',
      'Tafelplan': 'टेबल योजना', 'Zaalindeling en tafelstatus (gedeeld met de zaal).': 'हल लेआउट र टेबल स्थिति (हलसँग साझा)।',
      'Zaalindeling, tafelstatus en capaciteit.': 'हल लेआउट, टेबल स्थिति र क्षमता।',
      'HACCP & allergenen': 'HACCP र एलर्जेन', 'HACCP en allergenen': 'HACCP र एलर्जेन',
      'Temperatuurlogs, hygiene en allergiekaart.': 'तापक्रम लग, सरसफाइ र एलर्जी चार्ट।',
      'Hygiene, temperatuurlogs en allergenenkaart voor de zaal.': 'हलका लागि सरसफाइ, तापक्रम लग र एलर्जेन चार्ट।',
      'Voorbereiding': 'तयारी', 'Mise en place voor de zaal: opdek, glazen en klaarzetten voor service.': 'हलका लागि mise en place: टेबल मिलाउने, गिलास र सेवाको तयारी।',
      'Bestellingen bevestigen en doorsturen - open het servicesysteem (bar/zaalkant).': 'अर्डर पुष्टि र पठाउनुहोस् - सेवा प्रणाली (बार/हल तर्फ) खोल्नुहोस्।',
      'Items en categorieen bar': 'बार वस्तु र कोटिहरू', 'Beheer dranken-categorieen en items voor de klantkaart.': 'ग्राहक मेनुका लागि पेय कोटि र वस्तु व्यवस्थापन।',
      'Bestellingen en voorraad bar': 'बार अर्डर र भण्डार', 'Dranken bestellen, kegs en voorraadtellingen.': 'पेय अर्डर, केग र भण्डार गणना।',
      'Dagafsluiting': 'दिन बन्द', 'Daghistoriek & Z-rapport - snelle toegang tot alles van vandaag.': 'दैनिक इतिहास र Z-रिपोर्ट - आजका सबैमा द्रुत पहुँच।',
      'Reserveringen': 'आरक्षण', 'Boekingen, wachtlijst en no-shows.': 'बुकिङ, प्रतीक्षा सूची र नो-शो।',
      'Menukaart (alle categorieen)': 'मेनु (सबै कोटि)',
      'Recepten': 'रेसिपीहरू', 'F&B rekenmodule': 'F&B क्याल्कुलेटर', 'Ingredienten, basis- en kaartrecepten met kostprijs en marges.': 'लागत र मार्जिनसहित सामग्री, आधार र मेनु रेसिपी।',
      'F&B cost analyse': 'F&B लागत विश्लेषण', 'Per kaartitem: prijs, btw, netto omzet, F&B-cost, geschatte arbeid, herkomst en opmerkingen om weg te werken.': 'प्रति मेनु वस्तु: मूल्य, भ्याट, खुद बिक्री, F&B लागत, अनुमानित श्रम, स्रोत र समाधान गर्नुपर्ने टिप्पणी।', 'Foodcost': 'फूडकस्ट', 'Ingredientkosten en cost-percentage berekenen.': 'सामग्री लागत र लागत प्रतिशत गणना।',
      'Menu-analyse': 'मेनु विश्लेषण', 'Sterren, puzzels, workhorses & dogs.': 'तारा, पजल, वर्कहर्स र डग।',
      'Klantmenu (QR)': 'ग्राहक मेनु (QR)', 'Open de digitale kaart die gasten via QR/URL zien.': 'पाहुनाले QR/URL मार्फत देख्ने डिजिटल मेनु खोल्नुहोस्।',
      'Seizoen & specials': 'सिजन र विशेष', 'Wisselende gerechten en dagsuggesties.': 'परिवर्तनशील परिकार र दैनिक सुझाव।',
      'Dashboard & KPI': 'ड्यासबोर्ड र KPI', 'Live kerncijfers van je zaak in een oogopslag.': 'तपाईंको व्यापारका लाइभ मुख्य तथ्याङ्क एकै नजरमा।',
      'Omzet & rapporten': 'कारोबार र रिपोर्ट', 'Dag-, week- en maandrapporten.': 'दैनिक, साप्ताहिक र मासिक रिपोर्ट।',
      'Boekhouding': 'लेखा', 'Facturen, kosten en btw-overzicht.': 'बिल, लागत र भ्याट अवलोकन।',
      'Cashflow': 'नगद प्रवाह', 'Inkomsten, uitgaven en liquiditeit.': 'आम्दानी, खर्च र तरलता।',
      'Doelen': 'लक्ष्य', 'Targets stellen en voortgang volgen.': 'लक्ष्य तोक्नुहोस् र प्रगति ट्र्याक गर्नुहोस्।',
      'Rentabiliteit': 'नाफा', 'Marges, break-even en winstgevendheid.': 'मार्जिन, ब्रेक-इभन र नाफादायी।',
      'Campagnes': 'अभियान', 'Acties en promoties plannen en meten.': 'कार्य र प्रवर्द्धन योजना र मापन।',
      'Social media': 'सामाजिक सञ्जाल', 'Posts plannen voor Instagram & Facebook.': 'Instagram र Facebook का लागि पोस्ट योजना।',
      'Reviews': 'समीक्षा', 'Google & TripAdvisor beoordelingen beheren.': 'Google र TripAdvisor समीक्षा व्यवस्थापन।',
      'Nieuwsbrief': 'न्युजलेटर', 'E-mailcampagnes naar je gastenbestand.': 'तपाईंको पाहुना सूचीमा इमेल अभियान।',
      'Loyaliteit': 'वफादारी', 'Spaarkaart en vaste-gastenprogramma.': 'बचत कार्ड र नियमित पाहुना कार्यक्रम।',
      'Gastenbestand': 'पाहुना सूची', 'CRM: contacten en gastvoorkeuren.': 'CRM: सम्पर्क र पाहुना प्राथमिकता।',
      'Schoonmaak': 'सरसफाइ', 'Schoonmaakschemas en afvinklijsten.': 'सफाइ तालिका र चेकलिस्ट।',
      'Onderhoud': 'मर्मत', 'Reparaties en technisch onderhoud opvolgen.': 'मर्मत र प्राविधिक रखरखाव अनुगमन।',
      'Leveranciers': 'आपूर्तिकर्ता', 'Contacten, contracten en levervoorwaarden.': 'सम्पर्क, सम्झौता र आपूर्ति सर्त।',
      'Inkoop & bestellingen': 'खरिद र अर्डर', 'Bestellijsten en leveringen plannen.': 'अर्डर सूची र आपूर्ति योजना।',
      'Afval & duurzaamheid': 'फोहोर र दिगोपन', 'Afvalstromen en groene doelen.': 'फोहोर प्रवाह र हरित लक्ष्य।',
      'Voorraad centraal': 'केन्द्रीय भण्डार', 'Overkoepelend voorraadoverzicht.': 'समग्र भण्डार अवलोकन।',
      'Thema': 'थिम', 'Kies licht of donker, of laat de app je systeem volgen.': 'उज्यालो वा अँध्यारो छान्नुहोस्, वा एपलाई प्रणाली अनुसरण गर्न दिनुहोस्।',
      'Licht': 'उज्यालो', 'Donker': 'अँध्यारो',
      'Grote knoppen': 'ठूला बटन', 'Extra grote tikdoelen voor gebruik op tablet tijdens service.': 'सेवाको समयमा ट्याब्लेटमा प्रयोगका लागि अतिरिक्त ठूला ट्याप लक्ष्य।',
      'Personeelscode': 'कर्मचारी कोड', 'Code voor tafel 0 (personeel, gratis) in het klantmenu. Tafel 0 = personeelsbestelling, rekening € 0.': 'ग्राहक मेनुमा टेबल 0 (कर्मचारी, नि:शुल्क) का लागि कोड। टेबल 0 = कर्मचारी अर्डर, बिल € 0।',
      'Menu visual settings': 'मेनु दृश्य सेटिङ', 'Hero-foto, logo, naam en disclaimer van het klantmenu aanpassen.': 'ग्राहक मेनुको हिरो फोटो, लोगो, नाम र अस्वीकरण परिवर्तन गर्नुहोस्।',
      'Zaakprofiel': 'व्यापार प्रोफाइल', 'Naam, adres en gegevens van Kosmopoliet Eetcafe.': 'Kosmopoliet Eetcafe को नाम, ठेगाना र विवरण।',
      'Gebruikers & rollen': 'प्रयोगकर्ता र भूमिका', 'Wie mag welke module gebruiken (eigenaar, keuken, zaal).': 'कसले कुन मोड्युल प्रयोग गर्न सक्छ (मालिक, भान्सा, हल)।',
      'Beveiliging': 'सुरक्षा', 'Pincodes, toegang en sessiebeheer.': 'पिन कोड, पहुँच र सत्र व्यवस्थापन।',
      'Offline & synchronisatie': 'अफलाइन र सिंक', 'App werkt offline tijdens service en synct nadien.': 'एप सेवाको समयमा अफलाइन काम गर्छ र पछि सिंक हुन्छ।',
      'Over Kosmopoliet OS': 'Kosmopoliet OS बारे', 'Versie 0.2 - backbone + klantmenu. Plantaardig, altijd bereikbaar.': 'संस्करण 0.2 - मेरुदण्ड + ग्राहक मेनु। वनस्पतिजन्य, सधैँ उपलब्ध।',
      'plant based eetcafé - Brugge': 'वनस्पतिजन्य इटकाफे - ब्रुज',
      'Tafelnummer': 'टेबल नम्बर', '— verplicht': '— अनिवार्य', 'verplicht': 'अनिवार्य', 'Ga verder': 'अगाडि बढ्नुहोस्', 'Bevestig': 'पुष्टि गर्नुहोस्',
      'Vul je tafelnummer in om verder te gaan.': 'अगाडि बढ्न आफ्नो टेबल नम्बर लेख्नुहोस्।',
      'Gelieve een geldig tafelnummer in te voeren aub.': 'कृपया मान्य टेबल नम्बर लेख्नुहोस्।',
      'Onjuiste personeelscode.': 'गलत कर्मचारी कोड।',
      'Mijn keuze': 'मेरो छनोट', 'Bestellen': 'अर्डर गर्नुहोस्', 'Vraag de rekening': 'बिल माग्नुहोस्', 'Totaal': 'कुल', 'Bestelling': 'अर्डर', 'Nog geen bevestigde bestelling.': 'अझै पुष्टि भएको अर्डर छैन।', 'De bediening is verwittigd': 'कर्मचारीलाई सूचित गरियो', 'Leegmaken': 'खाली गर्नुहोस्',
      'Gedeeld met iedereen aan jouw tafel': 'तपाईंको टेबलका सबैसँग साझा',
      'Allergenen': 'एलर्जेन', 'Dranksuggestie': 'पेय सुझाव', 'Kies': 'छान्नुहोस्',
      'Geen van de 14 wettelijke allergenen gemeld': '१४ कानुनी एलर्जेनमध्ये कुनै पनि उल्लेख गरिएको छैन',
      'Tafel': 'टेबल', 'Personeel': 'कर्मचारी', 'Bestelling doorgegeven aan tafel': 'टेबलमा अर्डर पठाइयो',
      'Je mandje is nog leeg.': 'तपाईंको टोकरी अझै खाली छ।', 'Kies gerechten uit de kaart.': 'मेनुबाट परिकार छान्नुहोस्।',
      'Nog geen categorieën. Voeg ze toe in de backend.': 'अझै कोटि छैन। ब्याकइन्डमा थप्नुहोस्।',
      'Nog geen gerechten in deze categorie.': 'यो कोटिमा अझै परिकार छैन।',
      'Opmerking (max 20)': 'टिप्पणी (बढीमा 20)', 'Google Translate': 'Google Translate', 'Meer talen': 'थप भाषा', 'Taal / Language': 'भाषा / Language', 'Sluiten': 'बन्द गर्नुहोस्',
      'Gluten': 'ग्लुटेन', 'Schaaldieren': 'क्रस्टेसियन', 'Eieren': 'अन्डा', 'Vis': 'माछा', 'Pinda': 'बदाम',
      'Soja': 'सोया', 'Melk': 'दूध', 'Noten': 'नट', 'Selderij': 'सेलेरी', 'Mosterd': 'तोरी',
      'Sesam': 'तिल', 'Sulfiet': 'सल्फाइट', 'Lupine': 'ल्युपिन', 'Weekdieren': 'मोलस्क'
    },
    en: {
      // ---- profiel / clearance ----
      'Mijn profiel': 'My profile', 'Je eigen aanmeldnaam en wachtwoord aanpassen.': 'Change your own login name and password.',
      'Clearance & rollen': 'Clearance & roles', 'Beheren': 'Manage', 'Rollen van teamleden': 'Team member roles',
      'Rollen toewijzen en toegangsniveaus per module/onderdeel instellen.': 'Assign roles and set access levels per module/section.',
      'Pas je eigen aanmeldnaam en wachtwoord aan.': 'Change your own login name and password.', 'Profiel opgeslagen': 'Profile saved',
      // ---- login / gebruikers ----
      'Aanmelden': 'Sign in', 'Gebruiker': 'User', 'Wachtwoord': 'Password', 'Onjuist wachtwoord.': 'Incorrect password.',
      'Afmelden': 'Sign out', 'Aangemeld als': 'Signed in as', 'niet aangemeld': 'not signed in', 'Enkel voor management': 'Management only',
      'Teamleden & toegang': 'Team members & access', 'Teamlid toevoegen': 'Add team member', 'Nieuw teamlid': 'New team member', 'wachtwoord': 'password',
      'Beheer teamleden en hun toegangsniveau (help, staff, management). Wijzigingen synchroniseren naar alle toestellen.': 'Manage team members and their access level (help, staff, management). Changes sync to all devices.',
      'Profielen, functies, toegang en wachtwoorden van je crew (enkel management).': 'Profiles, roles, access and passwords of your crew (management only).',
      // ---- F&B rekenmodule ----
      'Kaartrecepten': 'Menu recipes', 'Basisrecepten': 'Base recipes', 'Ingrediënten': 'Ingredients', 'Marge-analyse': 'Margin analysis',
      'Bewerk': 'Edit', 'Kopie': 'Copy', 'Print / PDF': 'Print / PDF', 'Productieblad printen': 'Print production sheet',
      'Nieuw basisrecept': 'New base recipe', 'Nieuw kaartrecept': 'New menu recipe', 'Basisrecept bewerken': 'Edit base recipe', 'Kaartrecept bewerken': 'Edit menu recipe',
      'Naam': 'Name', 'Naamloos': 'Untitled', 'Foto': 'Photo', 'Menu-foto': 'Menu photo', 'Leverancier': 'Supplier',
      'Productgroep': 'Product group', 'Productgroep (intern)': 'Product group (internal)', 'Extra info': 'Extra info',
      'Korte omschrijving': 'Short description', 'Uitgebreide omschrijving': 'Full description', 'Werkwijze NL': 'Method NL', 'Procedure EN': 'Method EN', 'Werktijd (min)': 'Work time (min)',
      'Btw': 'VAT', 'Btw %': 'VAT %', 'Aantal porties': 'Number of portions', 'Begingewicht (kg/lt)': 'Start weight (kg/l)', 'Eindgewicht (na waste)': 'End weight (after waste)', 'Eindgewicht': 'End weight',
      'Gekocht gewicht (kg/lt)': 'Purchased weight (kg/l)', 'Gewicht per portie (kg/lt)': 'Weight per portion (kg/l)', 'Gewicht per portie': 'Weight per portion',
      'Kook/bakfactor': 'Cook/bake factor', 'Kook/bak begingewicht': 'Cook/bake start weight', 'Gepland gewicht na KBF': 'Planned weight after CBF', 'Opbrengst na KBF': 'Yield after CBF',
      'Totaal gepland gewicht': 'Total planned weight', 'Totaal gewicht (voor koken)': 'Total weight (before cooking)',
      'Kostprijs per kg (foodcost)': 'Cost price per kg (food cost)', 'Kostprijs per kg': 'Cost price per kg', 'Foodcost + arbeid per kg': 'Food cost + labour per kg',
      'Arbeid totaal': 'Labour total', 'Arbeidskost totaal': 'Labour cost total', 'Doel-foodcost % (voor prijssuggestie)': 'Target food cost % (for price suggestion)', 'Gesuggereerde prijs incl.': 'Suggested price incl.',
      'Verkoop excl. btw': 'Sales excl. VAT', 'Verkoop incl. btw': 'Sales incl. VAT', 'Verkoopprijs excl. btw': 'Sales price excl. VAT', 'Verkoopprijs incl. btw': 'Sales price incl. VAT',
      'Extra kosten': 'Extra costs', 'Extra kosten excl. btw': 'Extra costs excl. VAT',
      'F&B cost %': 'F&B cost %', 'F&B cost per portie': 'F&B cost per portion', 'F&B cost/portie': 'F&B cost/portion',
      'Totale F&B cost %': 'Total F&B cost %', 'Totale F&B cost per portie': 'Total F&B cost per portion', 'Totale F&B cost/portie': 'Total F&B cost/portion', 'Totale foodcost %': 'Total food cost %',
      'Marge per portie (excl.)': 'Margin per portion (excl.)', 'Marge/portie': 'Margin/portion', 'Operationeel resultaat %': 'Operating result %', 'Personeelskost %': 'Labour cost %', 'Personeelskost per portie': 'Labour cost per portion',
      'Gepubliceerd in het klantmenu.': 'Published in the guest menu.', 'Menukaart niet beschikbaar.': 'Menu not available.', 'Sta pop-ups toe om te printen.': 'Allow pop-ups to print.', 'Sta pop-ups toe.': 'Allow pop-ups.', 'Slaatje niet meegerekend.': 'Side salad not included.',
      // ---- hub / shell ----
      'Online - gesynct': 'Online - synced', 'Offline - lokaal actief': 'Offline - working locally',
      'Openen': 'Open', 'Binnenkort': 'Soon', 'Terug': 'Back', 'Bewerken': 'Edit', 'Opslaan': 'Save',
      // ---- module names ----
      'KosmoKrew': 'KosmoKrew', 'Keukenmanagement': 'Kitchen management', 'Bar/zaalmanagement': 'Bar/floor management',
      'F&B / Menu Engineering': 'F&B / Menu Engineering', 'Business Management': 'Business Management',
      'Marketing Management': 'Marketing Management', 'Housekeeping / Leveranciers': 'Housekeeping / Suppliers', 'Settings': 'Settings',
      // ---- taglines ----
      'Personeel & team': 'Staff & team', 'Keuken & productie': 'Kitchen & production', 'Bar & bediening': 'Bar & service',
      'Menu & marges': 'Menu & margins', 'Cijfers & sturing': 'Numbers & steering', 'Bereik & gasten': 'Reach & guests',
      'Onderhoud & inkoop': 'Maintenance & purchasing', 'Instellingen': 'Settings',
      // ---- module descriptions ----
      'Je crew op een plek: roosters, uren, onboarding en interne communicatie voor de hele KosmoKrew.': 'Your crew in one place: rosters, hours, onboarding and internal communication for the whole KosmoKrew.',
      'Alles wat achter de pass gebeurt: mise en place, tickets, voorraad, recepten en voedselveiligheid.': 'Everything behind the pass: mise en place, tickets, stock, recipes and food safety.',
      'De frontlinie van de service: reserveringen, tafelplan, bestellingen, barvoorraad en afrekenen.': 'The service front line: reservations, floor plan, orders, bar stock and checkout.',
      'De kern: bouw je plantaardige kaart, bereken foodcost en marges, analyseer wat verkoopt.': 'The core: build your plant-based menu, calculate food cost and margins, analyse what sells.',
      'Het overzicht voor de eigenaar: KPI-dashboard, omzet, boekhouding, cashflow en doelen.': 'The owner overview: KPI dashboard, revenue, bookkeeping, cash flow and goals.',
      'Vul je zaal: campagnes, social media, reviews, nieuwsbrief en loyaliteit voor terugkerende gasten.': 'Fill your venue: campaigns, social media, reviews, newsletter and loyalty for returning guests.',
      'De achtergrond die alles laat draaien: schoonmaak, onderhoud, leveranciers, inkoop en duurzaamheid.': 'The background that keeps it all running: cleaning, maintenance, suppliers, purchasing and sustainability.',
      'Beheer je account, gebruikers, thema, menu-visuals en offline-instellingen van Kosmopoliet OS.': 'Manage your account, users, theme, menu visuals and offline settings of Kosmopoliet OS.',
      // ---- kosmokrew ----
      'Teamleden': 'Team members', 'Profielen, functies en contactgegevens van je crew.': 'Profiles, roles and contact details of your crew.',
      'Roosters': 'Rosters', 'Diensten plannen, ruilen en publiceren per week.': 'Plan, swap and publish shifts per week.',
      'Uren & loon': 'Hours & pay', 'Klok-in/klok-uit, gewerkte uren en loonoverzicht.': 'Clock-in/out, worked hours and pay overview.',
      'Onboarding': 'Onboarding', 'Nieuwe medewerkers, checklists en trainingen.': 'New staff, checklists and training.',
      'Communicatie': 'Communication', 'Interne mededelingen, shift-notities en briefings.': 'Internal notices, shift notes and briefings.',
      'Beschikbaarheid': 'Availability', 'Verlof, ziekmeldingen en beschikbaarheid beheren.': 'Manage leave, sick reports and availability.',
      'Menu': 'Menu', 'Open het klant-bestelplatform (QR / URL) voor de gasten.': 'Open the guest ordering platform (QR / URL).',
      // ---- keuken ----
      'Mise en place': 'Mise en place', 'Voorbereidingslijsten en prep per shift.': 'Prep lists per shift.',
      'Service': 'Service', 'Live keukentickets per gang - open het servicesysteem (keukenkant).': 'Live kitchen tickets per course - open the service system (kitchen side).',
      'Items en categorieen keuken': 'Kitchen items & categories', 'Beheer keuken-categorieen en gerechten voor de klantkaart.': 'Manage kitchen categories and dishes for the guest menu.',
      'Bestellingen en voorraad keuken': 'Kitchen orders & stock', 'Ingredienten bestellen, tellingen en minimumniveaus.': 'Order ingredients, counts and minimum levels.',
      'Verspilling': 'Waste', 'Weggooiregistratie en foodwaste-analyse.': 'Waste logging and food-waste analysis.',
      'Menu klant': 'Guest menu', 'Open de digitale klantkaart (QR / URL) die gasten zien.': 'Open the digital guest menu (QR / URL) that guests see.',
      'Tafelplan': 'Floor plan', 'Zaalindeling en tafelstatus (gedeeld met de zaal).': 'Floor layout and table status (shared with the floor).',
      'Zaalindeling, tafelstatus en capaciteit.': 'Floor layout, table status and capacity.',
      'HACCP & allergenen': 'HACCP & allergens', 'HACCP en allergenen': 'HACCP & allergens',
      'Temperatuurlogs, hygiene en allergiekaart.': 'Temperature logs, hygiene and allergen chart.',
      'Hygiene, temperatuurlogs en allergenenkaart voor de zaal.': 'Hygiene, temperature logs and allergen chart for the floor.',
      // ---- barzaal ----
      'Voorbereiding': 'Preparation', 'Mise en place voor de zaal: opdek, glazen en klaarzetten voor service.': 'Mise en place for the floor: setting tables, glasses and prep for service.',
      'Bestellingen bevestigen en doorsturen - open het servicesysteem (bar/zaalkant).': 'Confirm and forward orders - open the service system (bar/floor side).',
      'Items en categorieen bar': 'Bar items & categories', 'Beheer dranken-categorieen en items voor de klantkaart.': 'Manage drink categories and items for the guest menu.',
      'Bestellingen en voorraad bar': 'Bar orders & stock', 'Dranken bestellen, kegs en voorraadtellingen.': 'Order drinks, kegs and stock counts.',
      'Dagafsluiting': 'Day closing', 'Daghistoriek & Z-rapport - snelle toegang tot alles van vandaag.': 'Day history & Z-report - quick access to everything today.',
      'Reserveringen': 'Reservations', 'Boekingen, wachtlijst en no-shows.': 'Bookings, waitlist and no-shows.',
      // ---- F&B module ----
      'Menukaart (alle categorieen)': 'Menu (all categories)',
      'Recepten': 'Recipes', 'F&B rekenmodule': 'F&B calculator', 'Ingredienten, basis- en kaartrecepten met kostprijs en marges.': 'Ingredients, base and menu recipes with cost price and margins.',
      'F&B cost analyse': 'F&B cost analysis', 'Per kaartitem: prijs, btw, netto omzet, F&B-cost, geschatte arbeid, herkomst en opmerkingen om weg te werken.': 'Per menu item: price, VAT, net revenue, F&B cost, estimated labour, source and remarks to resolve.', 'Foodcost': 'Food cost', 'Ingredientkosten en cost-percentage berekenen.': 'Calculate ingredient costs and cost percentage.',
      'Menu-analyse': 'Menu analysis', 'Sterren, puzzels, workhorses & dogs.': 'Stars, puzzles, workhorses & dogs.',
      'Klantmenu (QR)': 'Guest menu (QR)', 'Open de digitale kaart die gasten via QR/URL zien.': 'Open the digital menu guests see via QR/URL.',
      'Seizoen & specials': 'Season & specials', 'Wisselende gerechten en dagsuggesties.': 'Rotating dishes and daily specials.',
      // ---- business ----
      'Dashboard & KPI': 'Dashboard & KPI', 'Live kerncijfers van je zaak in een oogopslag.': 'Live key figures of your business at a glance.',
      'Omzet & rapporten': 'Revenue & reports', 'Dag-, week- en maandrapporten.': 'Daily, weekly and monthly reports.',
      'Boekhouding': 'Bookkeeping', 'Facturen, kosten en btw-overzicht.': 'Invoices, costs and VAT overview.',
      'Cashflow': 'Cash flow', 'Inkomsten, uitgaven en liquiditeit.': 'Income, expenses and liquidity.',
      'Doelen': 'Goals', 'Targets stellen en voortgang volgen.': 'Set targets and track progress.',
      'Rentabiliteit': 'Profitability', 'Marges, break-even en winstgevendheid.': 'Margins, break-even and profitability.',
      // ---- marketing ----
      'Campagnes': 'Campaigns', 'Acties en promoties plannen en meten.': 'Plan and measure actions and promotions.',
      'Social media': 'Social media', 'Posts plannen voor Instagram & Facebook.': 'Schedule posts for Instagram & Facebook.',
      'Reviews': 'Reviews', 'Google & TripAdvisor beoordelingen beheren.': 'Manage Google & TripAdvisor reviews.',
      'Nieuwsbrief': 'Newsletter', 'E-mailcampagnes naar je gastenbestand.': 'Email campaigns to your guest base.',
      'Loyaliteit': 'Loyalty', 'Spaarkaart en vaste-gastenprogramma.': 'Loyalty card and regulars programme.',
      'Gastenbestand': 'Guest base', 'CRM: contacten en gastvoorkeuren.': 'CRM: contacts and guest preferences.',
      // ---- housekeeping ----
      'Schoonmaak': 'Cleaning', 'Schoonmaakschemas en afvinklijsten.': 'Cleaning schedules and checklists.',
      'Onderhoud': 'Maintenance', 'Reparaties en technisch onderhoud opvolgen.': 'Track repairs and technical maintenance.',
      'Leveranciers': 'Suppliers', 'Contacten, contracten en levervoorwaarden.': 'Contacts, contracts and delivery terms.',
      'Inkoop & bestellingen': 'Purchasing & orders', 'Bestellijsten en leveringen plannen.': 'Plan order lists and deliveries.',
      'Afval & duurzaamheid': 'Waste & sustainability', 'Afvalstromen en groene doelen.': 'Waste streams and green goals.',
      'Voorraad centraal': 'Central stock', 'Overkoepelend voorraadoverzicht.': 'Overarching stock overview.',
      // ---- settings ----
      'Thema': 'Theme', 'Kies licht of donker, of laat de app je systeem volgen.': 'Choose light or dark, or let the app follow your system.',
      'Licht': 'Light', 'Donker': 'Dark',
      'Grote knoppen': 'Large buttons', 'Extra grote tikdoelen voor gebruik op tablet tijdens service.': 'Extra large tap targets for tablet use during service.',
      'Personeelscode': 'Staff code', 'Code voor tafel 0 (personeel, gratis) in het klantmenu. Tafel 0 = personeelsbestelling, rekening € 0.': 'Code for table 0 (staff, free) in the guest menu. Table 0 = staff order, bill € 0.',
      'Menu visual settings': 'Menu visual settings', 'Hero-foto, logo, naam en disclaimer van het klantmenu aanpassen.': 'Adjust hero photo, logo, name and disclaimer of the guest menu.',
      'Zaakprofiel': 'Business profile', 'Naam, adres en gegevens van Kosmopoliet Eetcafe.': 'Name, address and details of Kosmopoliet Eetcafe.',
      'Gebruikers & rollen': 'Users & roles', 'Wie mag welke module gebruiken (eigenaar, keuken, zaal).': 'Who may use which module (owner, kitchen, floor).',
      'Beveiliging': 'Security', 'Pincodes, toegang en sessiebeheer.': 'PIN codes, access and session management.',
      'Offline & synchronisatie': 'Offline & sync', 'App werkt offline tijdens service en synct nadien.': 'App works offline during service and syncs afterwards.',
      'Over Kosmopoliet OS': 'About Kosmopoliet OS', 'Versie 0.2 - backbone + klantmenu. Plantaardig, altijd bereikbaar.': 'Version 0.2 - backbone + guest menu. Plant-based, always available.',
      // ---- customer menu ----
      'plant based eetcafé - Brugge': 'plant based eatery - Bruges',
      'verplicht': 'required', 'Ga verder': 'Continue', 'Bevestig': 'Confirm',
      'Vul je tafelnummer in om verder te gaan.': 'Enter your table number to continue.',
      'Gelieve een geldig tafelnummer in te voeren aub.': 'Please enter a valid table number.',
      'Onjuiste personeelscode.': 'Incorrect staff code.',
      'Mijn keuze': 'My choice', 'Bestellen': 'Order', 'Vraag de rekening': 'Request the bill', 'Totaal': 'Total', 'Bestelling': 'Order', 'Nog geen bevestigde bestelling.': 'No confirmed order yet.', 'De bediening is verwittigd': 'Staff has been notified', 'Leegmaken': 'Clear',
      'Gedeeld met iedereen aan jouw tafel': 'Shared with everyone at your table',
      'Allergenen': 'Allergens', 'Dranksuggestie': 'Drink suggestion', 'Kies': 'Choose',
      'Geen van de 14 wettelijke allergenen gemeld': 'None of the 14 legal allergens reported',
      'Tafel': 'Table', 'Personeel': 'Staff', 'Bestelling doorgegeven aan tafel': 'Order sent to table',
      'Je mandje is nog leeg.': 'Your basket is still empty.', 'Kies gerechten uit de kaart.': 'Pick dishes from the menu.',
      'Nog geen categorieën. Voeg ze toe in de backend.': 'No categories yet. Add them in the backend.',
      'Nog geen gerechten in deze categorie.': 'No dishes in this category yet.',
      // allergens
      'Gluten': 'Gluten', 'Schaaldieren': 'Crustaceans', 'Eieren': 'Eggs', 'Vis': 'Fish', 'Pinda': 'Peanut',
      'Soja': 'Soy', 'Melk': 'Milk', 'Noten': 'Nuts', 'Selderij': 'Celery', 'Mosterd': 'Mustard',
      'Sesam': 'Sesame', 'Sulfiet': 'Sulphite', 'Lupine': 'Lupin', 'Weekdieren': 'Molluscs'
    },
    pt: {
      // ---- profiel / clearance ----
      'Mijn profiel': 'Meu perfil', 'Je eigen aanmeldnaam en wachtwoord aanpassen.': 'Altere o seu nome de acesso e a senha.',
      'Clearance & rollen': 'Acessos & funções', 'Beheren': 'Gerir', 'Rollen van teamleden': 'Funções da equipe',
      'Rollen toewijzen en toegangsniveaus per module/onderdeel instellen.': 'Atribua funções e defina níveis de acesso por módulo/seção.',
      'Pas je eigen aanmeldnaam en wachtwoord aan.': 'Altere o seu nome de acesso e a senha.', 'Profiel opgeslagen': 'Perfil guardado',
      // ---- login / gebruikers ----
      'Aanmelden': 'Entrar', 'Gebruiker': 'Usuário', 'Wachtwoord': 'Senha', 'Onjuist wachtwoord.': 'Senha incorreta.',
      'Afmelden': 'Sair', 'Aangemeld als': 'Conectado como', 'niet aangemeld': 'não conectado', 'Enkel voor management': 'Apenas gerência',
      'Teamleden & toegang': 'Equipe & acesso', 'Teamlid toevoegen': 'Adicionar membro', 'Nieuw teamlid': 'Novo membro', 'wachtwoord': 'senha',
      'Beheer teamleden en hun toegangsniveau (help, staff, management). Wijzigingen synchroniseren naar alle toestellen.': 'Gerencie a equipe e o nível de acesso (help, staff, management). As alterações sincronizam em todos os dispositivos.',
      'Profielen, functies, toegang en wachtwoorden van je crew (enkel management).': 'Perfis, funções, acesso e senhas da equipe (apenas gerência).',
      // ---- F&B rekenmodule ----
      'Kaartrecepten': 'Receitas do menu', 'Basisrecepten': 'Receitas base', 'Ingrediënten': 'Ingredientes', 'Marge-analyse': 'Análise de margem',
      'Bewerk': 'Editar', 'Kopie': 'Copiar', 'Print / PDF': 'Imprimir / PDF', 'Productieblad printen': 'Imprimir ficha de produção',
      'Nieuw basisrecept': 'Nova receita base', 'Nieuw kaartrecept': 'Nova receita de menu', 'Basisrecept bewerken': 'Editar receita base', 'Kaartrecept bewerken': 'Editar receita de menu',
      'Naam': 'Nome', 'Naamloos': 'Sem nome', 'Foto': 'Foto', 'Menu-foto': 'Foto do menu', 'Leverancier': 'Fornecedor',
      'Productgroep': 'Grupo de produtos', 'Productgroep (intern)': 'Grupo de produtos (interno)', 'Extra info': 'Info extra',
      'Korte omschrijving': 'Descrição curta', 'Uitgebreide omschrijving': 'Descrição completa', 'Werkwijze NL': 'Método NL', 'Procedure EN': 'Método EN', 'Werktijd (min)': 'Tempo de trabalho (min)',
      'Btw': 'IVA', 'Btw %': 'IVA %', 'Aantal porties': 'Número de porções', 'Begingewicht (kg/lt)': 'Peso inicial (kg/l)', 'Eindgewicht (na waste)': 'Peso final (após perda)', 'Eindgewicht': 'Peso final',
      'Gekocht gewicht (kg/lt)': 'Peso comprado (kg/l)', 'Gewicht per portie (kg/lt)': 'Peso por porção (kg/l)', 'Gewicht per portie': 'Peso por porção',
      'Kook/bakfactor': 'Fator de cozimento', 'Kook/bak begingewicht': 'Peso inicial de cozimento', 'Gepland gewicht na KBF': 'Peso planejado após FC', 'Opbrengst na KBF': 'Rendimento após FC',
      'Totaal gepland gewicht': 'Peso planejado total', 'Totaal gewicht (voor koken)': 'Peso total (antes de cozinhar)',
      'Kostprijs per kg (foodcost)': 'Custo por kg (food cost)', 'Kostprijs per kg': 'Custo por kg', 'Foodcost + arbeid per kg': 'Food cost + mão de obra por kg',
      'Arbeid totaal': 'Mão de obra total', 'Arbeidskost totaal': 'Custo de mão de obra total', 'Doel-foodcost % (voor prijssuggestie)': 'Food cost alvo % (para sugestão de preço)', 'Gesuggereerde prijs incl.': 'Preço sugerido incl.',
      'Verkoop excl. btw': 'Venda sem IVA', 'Verkoop incl. btw': 'Venda com IVA', 'Verkoopprijs excl. btw': 'Preço de venda sem IVA', 'Verkoopprijs incl. btw': 'Preço de venda com IVA',
      'Extra kosten': 'Custos extras', 'Extra kosten excl. btw': 'Custos extras sem IVA',
      'F&B cost %': 'Custo F&B %', 'F&B cost per portie': 'Custo F&B por porção', 'F&B cost/portie': 'Custo F&B/porção',
      'Totale F&B cost %': 'Custo F&B total %', 'Totale F&B cost per portie': 'Custo F&B total por porção', 'Totale F&B cost/portie': 'Custo F&B total/porção', 'Totale foodcost %': 'Food cost total %',
      'Marge per portie (excl.)': 'Margem por porção (sem IVA)', 'Marge/portie': 'Margem/porção', 'Operationeel resultaat %': 'Resultado operacional %', 'Personeelskost %': 'Custo de pessoal %', 'Personeelskost per portie': 'Custo de pessoal por porção',
      'Gepubliceerd in het klantmenu.': 'Publicado no menu do cliente.', 'Menukaart niet beschikbaar.': 'Menu não disponível.', 'Sta pop-ups toe om te printen.': 'Permita pop-ups para imprimir.', 'Sta pop-ups toe.': 'Permita pop-ups.', 'Slaatje niet meegerekend.': 'Salada não incluída.',
      'Online - gesynct': 'Online - sincronizado', 'Offline - lokaal actief': 'Offline - ativo localmente',
      'Openen': 'Abrir', 'Binnenkort': 'Em breve', 'Terug': 'Voltar', 'Bewerken': 'Editar', 'Opslaan': 'Guardar',
      'KosmoKrew': 'KosmoKrew', 'Keukenmanagement': 'Gestão de cozinha', 'Bar/zaalmanagement': 'Gestão de bar/salão',
      'F&B / Menu Engineering': 'F&B / Menu Engineering', 'Business Management': 'Gestão do negócio',
      'Marketing Management': 'Gestão de marketing', 'Housekeeping / Leveranciers': 'Limpeza / Fornecedores', 'Settings': 'Configurações',
      'Personeel & team': 'Pessoal & equipe', 'Keuken & productie': 'Cozinha & produção', 'Bar & bediening': 'Bar & atendimento',
      'Menu & marges': 'Cardápio & margens', 'Cijfers & sturing': 'Números & gestão', 'Bereik & gasten': 'Alcance & clientes',
      'Onderhoud & inkoop': 'Manutenção & compras', 'Instellingen': 'Configurações',
      'Je crew op een plek: roosters, uren, onboarding en interne communicatie voor de hele KosmoKrew.': 'A sua equipe num só lugar: escalas, horas, integração e comunicação interna para toda a KosmoKrew.',
      'Alles wat achter de pass gebeurt: mise en place, tickets, voorraad, recepten en voedselveiligheid.': 'Tudo o que acontece na cozinha: mise en place, comandas, estoque, receitas e segurança alimentar.',
      'De frontlinie van de service: reserveringen, tafelplan, bestellingen, barvoorraad en afrekenen.': 'A linha de frente do serviço: reservas, plano de mesas, pedidos, estoque do bar e fecho de conta.',
      'De kern: bouw je plantaardige kaart, bereken foodcost en marges, analyseer wat verkoopt.': 'O núcleo: monte o seu cardápio vegetal, calcule custo e margens, analise o que vende.',
      'Het overzicht voor de eigenaar: KPI-dashboard, omzet, boekhouding, cashflow en doelen.': 'A visão do dono: painel de KPI, receita, contabilidade, fluxo de caixa e metas.',
      'Vul je zaal: campagnes, social media, reviews, nieuwsbrief en loyaliteit voor terugkerende gasten.': 'Encha o seu salão: campanhas, redes sociais, avaliações, newsletter e fidelidade.',
      'De achtergrond die alles laat draaien: schoonmaak, onderhoud, leveranciers, inkoop en duurzaamheid.': 'O que faz tudo funcionar: limpeza, manutenção, fornecedores, compras e sustentabilidade.',
      'Beheer je account, gebruikers, thema, menu-visuals en offline-instellingen van Kosmopoliet OS.': 'Gerencie conta, usuários, tema, visuais do menu e configurações offline do Kosmopoliet OS.',
      'Teamleden': 'Membros da equipe', 'Profielen, functies en contactgegevens van je crew.': 'Perfis, funções e contatos da equipe.',
      'Roosters': 'Escalas', 'Diensten plannen, ruilen en publiceren per week.': 'Planejar, trocar e publicar turnos por semana.',
      'Uren & loon': 'Horas & salário', 'Klok-in/klok-uit, gewerkte uren en loonoverzicht.': 'Entrada/saída, horas trabalhadas e resumo salarial.',
      'Onboarding': 'Integração', 'Nieuwe medewerkers, checklists en trainingen.': 'Novos funcionários, checklists e treinamentos.',
      'Communicatie': 'Comunicação', 'Interne mededelingen, shift-notities en briefings.': 'Avisos internos, notas de turno e briefings.',
      'Beschikbaarheid': 'Disponibilidade', 'Verlof, ziekmeldingen en beschikbaarheid beheren.': 'Gerir férias, faltas e disponibilidade.',
      'Menu': 'Menu', 'Open het klant-bestelplatform (QR / URL) voor de gasten.': 'Abrir a plataforma de pedidos (QR / URL) para os clientes.',
      'Mise en place': 'Mise en place', 'Voorbereidingslijsten en prep per shift.': 'Listas de preparo por turno.',
      'Service': 'Serviço', 'Live keukentickets per gang - open het servicesysteem (keukenkant).': 'Comandas ao vivo por etapa - abrir o sistema de serviço (cozinha).',
      'Items en categorieen keuken': 'Itens e categorias cozinha', 'Beheer keuken-categorieen en gerechten voor de klantkaart.': 'Gerir categorias e pratos da cozinha para o menu.',
      'Bestellingen en voorraad keuken': 'Pedidos e estoque cozinha', 'Ingredienten bestellen, tellingen en minimumniveaus.': 'Pedir ingredientes, contagens e níveis mínimos.',
      'Verspilling': 'Desperdício', 'Weggooiregistratie en foodwaste-analyse.': 'Registro de descarte e análise de desperdício.',
      'Menu klant': 'Menu do cliente', 'Open de digitale klantkaart (QR / URL) die gasten zien.': 'Abrir o menu digital (QR / URL) que os clientes veem.',
      'Tafelplan': 'Plano de mesas', 'Zaalindeling en tafelstatus (gedeeld met de zaal).': 'Layout do salão e status das mesas (partilhado com o salão).',
      'Zaalindeling, tafelstatus en capaciteit.': 'Layout do salão, status das mesas e capacidade.',
      'HACCP & allergenen': 'HACCP & alérgenos', 'HACCP en allergenen': 'HACCP & alérgenos',
      'Temperatuurlogs, hygiene en allergiekaart.': 'Registros de temperatura, higiene e tabela de alérgenos.',
      'Hygiene, temperatuurlogs en allergenenkaart voor de zaal.': 'Higiene, registros de temperatura e tabela de alérgenos do salão.',
      'Voorbereiding': 'Preparação', 'Mise en place voor de zaal: opdek, glazen en klaarzetten voor service.': 'Mise en place do salão: montar mesas, copos e preparar o serviço.',
      'Bestellingen bevestigen en doorsturen - open het servicesysteem (bar/zaalkant).': 'Confirmar e encaminhar pedidos - abrir o sistema de serviço (bar/salão).',
      'Items en categorieen bar': 'Itens e categorias bar', 'Beheer dranken-categorieen en items voor de klantkaart.': 'Gerir categorias de bebidas e itens para o menu.',
      'Bestellingen en voorraad bar': 'Pedidos e estoque bar', 'Dranken bestellen, kegs en voorraadtellingen.': 'Pedir bebidas, barris e contagens de estoque.',
      'Dagafsluiting': 'Fecho do dia', 'Daghistoriek & Z-rapport - snelle toegang tot alles van vandaag.': 'Histórico do dia & relatório Z - acesso rápido a tudo de hoje.',
      'Reserveringen': 'Reservas', 'Boekingen, wachtlijst en no-shows.': 'Reservas, lista de espera e faltas.',
      'Menukaart (alle categorieen)': 'Cardápio (todas as categorias)',
      'Recepten': 'Receitas', 'F&B rekenmodule': 'Calculadora F&B', 'Ingredienten, basis- en kaartrecepten met kostprijs en marges.': 'Ingredientes, receitas base e de menu com custo e margens.',
      'F&B cost analyse': 'Análise de custo F&B', 'Per kaartitem: prijs, btw, netto omzet, F&B-cost, geschatte arbeid, herkomst en opmerkingen om weg te werken.': 'Por item do menu: preço, IVA, receita líquida, custo F&B, mão de obra estimada, origem e observações a resolver.', 'Foodcost': 'Custo dos alimentos', 'Ingredientkosten en cost-percentage berekenen.': 'Calcular custos de ingredientes e percentual de custo.',
      'Menu-analyse': 'Análise de menu', 'Sterren, puzzels, workhorses & dogs.': 'Estrelas, enigmas, cavalos de batalha & cães.',
      'Klantmenu (QR)': 'Menu do cliente (QR)', 'Open de digitale kaart die gasten via QR/URL zien.': 'Abrir o menu digital que os clientes veem por QR/URL.',
      'Seizoen & specials': 'Estação & especiais', 'Wisselende gerechten en dagsuggesties.': 'Pratos rotativos e sugestões do dia.',
      'Dashboard & KPI': 'Painel & KPI', 'Live kerncijfers van je zaak in een oogopslag.': 'Números-chave ao vivo do seu negócio num relance.',
      'Omzet & rapporten': 'Receita & relatórios', 'Dag-, week- en maandrapporten.': 'Relatórios diários, semanais e mensais.',
      'Boekhouding': 'Contabilidade', 'Facturen, kosten en btw-overzicht.': 'Faturas, custos e resumo de IVA.',
      'Cashflow': 'Fluxo de caixa', 'Inkomsten, uitgaven en liquiditeit.': 'Receitas, despesas e liquidez.',
      'Doelen': 'Metas', 'Targets stellen en voortgang volgen.': 'Definir metas e acompanhar o progresso.',
      'Rentabiliteit': 'Rentabilidade', 'Marges, break-even en winstgevendheid.': 'Margens, ponto de equilíbrio e lucratividade.',
      'Campagnes': 'Campanhas', 'Acties en promoties plannen en meten.': 'Planejar e medir ações e promoções.',
      'Social media': 'Redes sociais', 'Posts plannen voor Instagram & Facebook.': 'Agendar posts para Instagram & Facebook.',
      'Reviews': 'Avaliações', 'Google & TripAdvisor beoordelingen beheren.': 'Gerir avaliações do Google & TripAdvisor.',
      'Nieuwsbrief': 'Newsletter', 'E-mailcampagnes naar je gastenbestand.': 'Campanhas de e-mail para a sua base de clientes.',
      'Loyaliteit': 'Fidelidade', 'Spaarkaart en vaste-gastenprogramma.': 'Cartão de fidelidade e programa de clientes habituais.',
      'Gastenbestand': 'Base de clientes', 'CRM: contacten en gastvoorkeuren.': 'CRM: contatos e preferências dos clientes.',
      'Schoonmaak': 'Limpeza', 'Schoonmaakschemas en afvinklijsten.': 'Horários de limpeza e checklists.',
      'Onderhoud': 'Manutenção', 'Reparaties en technisch onderhoud opvolgen.': 'Acompanhar reparos e manutenção técnica.',
      'Leveranciers': 'Fornecedores', 'Contacten, contracten en levervoorwaarden.': 'Contatos, contratos e condições de entrega.',
      'Inkoop & bestellingen': 'Compras & pedidos', 'Bestellijsten en leveringen plannen.': 'Planejar listas de compras e entregas.',
      'Afval & duurzaamheid': 'Resíduos & sustentabilidade', 'Afvalstromen en groene doelen.': 'Fluxos de resíduos e metas verdes.',
      'Voorraad centraal': 'Estoque central', 'Overkoepelend voorraadoverzicht.': 'Visão geral do estoque.',
      'Thema': 'Tema', 'Kies licht of donker, of laat de app je systeem volgen.': 'Escolha claro ou escuro, ou deixe o app seguir o sistema.',
      'Licht': 'Claro', 'Donker': 'Escuro',
      'Grote knoppen': 'Botões grandes', 'Extra grote tikdoelen voor gebruik op tablet tijdens service.': 'Alvos de toque extra grandes para tablet durante o serviço.',
      'Personeelscode': 'Código de funcionário', 'Code voor tafel 0 (personeel, gratis) in het klantmenu. Tafel 0 = personeelsbestelling, rekening € 0.': 'Código para a mesa 0 (funcionários, grátis) no menu. Mesa 0 = pedido de funcionário, conta € 0.',
      'Menu visual settings': 'Visual do menu', 'Hero-foto, logo, naam en disclaimer van het klantmenu aanpassen.': 'Ajustar foto principal, logo, nome e aviso do menu do cliente.',
      'Zaakprofiel': 'Perfil do negócio', 'Naam, adres en gegevens van Kosmopoliet Eetcafe.': 'Nome, endereço e dados do Kosmopoliet Eetcafe.',
      'Gebruikers & rollen': 'Usuários & funções', 'Wie mag welke module gebruiken (eigenaar, keuken, zaal).': 'Quem pode usar cada módulo (dono, cozinha, salão).',
      'Beveiliging': 'Segurança', 'Pincodes, toegang en sessiebeheer.': 'Códigos PIN, acesso e gestão de sessões.',
      'Offline & synchronisatie': 'Offline & sincronização', 'App werkt offline tijdens service en synct nadien.': 'O app funciona offline durante o serviço e sincroniza depois.',
      'Over Kosmopoliet OS': 'Sobre o Kosmopoliet OS', 'Versie 0.2 - backbone + klantmenu. Plantaardig, altijd bereikbaar.': 'Versão 0.2 - estrutura + menu. Vegetal, sempre disponível.',
      'plant based eetcafé - Brugge': 'café vegetal - Bruges',
      'verplicht': 'obrigatório', 'Ga verder': 'Continuar', 'Bevestig': 'Confirmar',
      'Vul je tafelnummer in om verder te gaan.': 'Digite o número da mesa para continuar.',
      'Gelieve een geldig tafelnummer in te voeren aub.': 'Por favor, insira um número de mesa válido.',
      'Onjuiste personeelscode.': 'Código de funcionário incorreto.',
      'Mijn keuze': 'Minha escolha', 'Bestellen': 'Pedir', 'Leegmaken': 'Limpar', 'Vraag de rekening': 'Pedir a conta', 'Totaal': 'Total', 'Bestelling': 'Pedido', 'Nog geen bevestigde bestelling.': 'Ainda sem pedido confirmado.', 'De bediening is verwittigd': 'A equipe foi avisada',
      'Gedeeld met iedereen aan jouw tafel': 'Compartilhado com todos na sua mesa',
      'Allergenen': 'Alérgenos', 'Dranksuggestie': 'Sugestão de bebida', 'Kies': 'Escolher',
      'Geen van de 14 wettelijke allergenen gemeld': 'Nenhum dos 14 alérgenos legais declarado',
      'Tafel': 'Mesa', 'Personeel': 'Funcionários', 'Bestelling doorgegeven aan tafel': 'Pedido enviado para a mesa',
      'Je mandje is nog leeg.': 'A sua cesta está vazia.', 'Kies gerechten uit de kaart.': 'Escolha pratos do menu.',
      'Nog geen categorieën. Voeg ze toe in de backend.': 'Ainda sem categorias. Adicione no backend.',
      'Nog geen gerechten in deze categorie.': 'Ainda sem pratos nesta categoria.',
      'Gluten': 'Glúten', 'Schaaldieren': 'Crustáceos', 'Eieren': 'Ovos', 'Vis': 'Peixe', 'Pinda': 'Amendoim',
      'Soja': 'Soja', 'Melk': 'Leite', 'Noten': 'Nozes', 'Selderij': 'Aipo', 'Mosterd': 'Mostarda',
      'Sesam': 'Gergelim', 'Sulfiet': 'Sulfitos', 'Lupine': 'Tremoço', 'Weekdieren': 'Moluscos'
    },
    fr: {
      'plant based eetcafé - Brugge': 'café végétal - Bruges',
      'Tafelnummer': 'Numéro de table',
      '— verplicht': '— requis',
      'verplicht': 'requis',
      'Ga verder': 'Continuer',
      'Bevestig': 'Confirmer',
      'Personeelscode': 'Code du personnel',
      'Vul je tafelnummer in om verder te gaan.': 'Entrez votre numéro de table pour continuer.',
      'Gelieve een geldig tafelnummer in te voeren aub.': 'Veuillez saisir un numéro de table valide.',
      'Onjuiste personeelscode.': 'Code du personnel incorrect.',
      'Mijn keuze': 'Ma sélection',
      'Bestellen': 'Commander', 'Vraag de rekening': 'Demander l’addition', 'Totaal': 'Total', 'Bestelling': 'Commande', 'Nog geen bevestigde bestelling.': 'Aucune commande confirmée.', 'De bediening is verwittigd': 'Le personnel a été prévenu',
      'Leegmaken': 'Vider',
      'Gedeeld met iedereen aan jouw tafel': 'Partagé avec toute votre table',
      'Allergenen': 'Allergènes',
      'Dranksuggestie': 'Suggestion de boisson',
      'Kies': 'Choisir',
      'Geen van de 14 wettelijke allergenen gemeld': 'Aucun des 14 allergènes légaux signalé',
      'Tafel': 'Table',
      'Personeel': 'Personnel',
      'Je mandje is nog leeg.': 'Votre panier est vide.',
      'Kies gerechten uit de kaart.': 'Choisissez des plats dans le menu.',
      'Nog geen gerechten in deze categorie.': 'Aucun plat dans cette catégorie.',
      'Opmerking (max 20)': 'Remarque (max 20)',
      'Gluten': 'Gluten',
      'Schaaldieren': 'Crustacés',
      'Eieren': 'Œufs',
      'Vis': 'Poisson',
      'Pinda': 'Arachide',
      'Soja': 'Soja',
      'Melk': 'Lait',
      'Noten': 'Fruits à coque',
      'Selderij': 'Céleri',
      'Mosterd': 'Moutarde',
      'Sesam': 'Sésame',
      'Sulfiet': 'Sulfites',
      'Lupine': 'Lupin',
      'Weekdieren': 'Mollusques',
      'Google Translate': 'Google Translate',
      'Meer talen': 'Plus de langues',
      'Taal / Language': 'Langue / Language',
      'Sluiten': 'Fermer'
    },
    de: {
      'plant based eetcafé - Brugge': 'pflanzliches Café - Brügge',
      'Tafelnummer': 'Tischnummer',
      '— verplicht': '— erforderlich',
      'verplicht': 'erforderlich',
      'Ga verder': 'Weiter',
      'Bevestig': 'Bestätigen',
      'Personeelscode': 'Personalcode',
      'Vul je tafelnummer in om verder te gaan.': 'Geben Sie Ihre Tischnummer ein, um fortzufahren.',
      'Gelieve een geldig tafelnummer in te voeren aub.': 'Bitte geben Sie eine gültige Tischnummer ein.',
      'Onjuiste personeelscode.': 'Falscher Personalcode.',
      'Mijn keuze': 'Meine Auswahl',
      'Bestellen': 'Bestellen', 'Vraag de rekening': 'Rechnung anfragen', 'Totaal': 'Summe', 'Bestelling': 'Bestellung', 'Nog geen bevestigde bestelling.': 'Noch keine bestätigte Bestellung.', 'De bediening is verwittigd': 'Das Personal wurde informiert',
      'Leegmaken': 'Leeren',
      'Gedeeld met iedereen aan jouw tafel': 'Mit allen an Ihrem Tisch geteilt',
      'Allergenen': 'Allergene',
      'Dranksuggestie': 'Getränkeempfehlung',
      'Kies': 'Wählen',
      'Geen van de 14 wettelijke allergenen gemeld': 'Keines der 14 gesetzlichen Allergene gemeldet',
      'Tafel': 'Tisch',
      'Personeel': 'Personal',
      'Je mandje is nog leeg.': 'Ihr Korb ist noch leer.',
      'Kies gerechten uit de kaart.': 'Wählen Sie Gerichte aus der Karte.',
      'Nog geen gerechten in deze categorie.': 'Noch keine Gerichte in dieser Kategorie.',
      'Opmerking (max 20)': 'Anmerkung (max. 20)',
      'Gluten': 'Gluten',
      'Schaaldieren': 'Krebstiere',
      'Eieren': 'Eier',
      'Vis': 'Fisch',
      'Pinda': 'Erdnuss',
      'Soja': 'Soja',
      'Melk': 'Milch',
      'Noten': 'Nüsse',
      'Selderij': 'Sellerie',
      'Mosterd': 'Senf',
      'Sesam': 'Sesam',
      'Sulfiet': 'Sulfite',
      'Lupine': 'Lupine',
      'Weekdieren': 'Weichtiere',
      'Google Translate': 'Google Translate',
      'Meer talen': 'Mehr Sprachen',
      'Taal / Language': 'Sprache / Language',
      'Sluiten': 'Schließen'
    },
    es: {
      'plant based eetcafé - Brugge': 'café vegetal - Brujas',
      'Tafelnummer': 'Número de mesa',
      '— verplicht': '— obligatorio',
      'verplicht': 'obligatorio',
      'Ga verder': 'Continuar',
      'Bevestig': 'Confirmar',
      'Personeelscode': 'Código de personal',
      'Vul je tafelnummer in om verder te gaan.': 'Introduzca su número de mesa para continuar.',
      'Gelieve een geldig tafelnummer in te voeren aub.': 'Introduzca un número de mesa válido, por favor.',
      'Onjuiste personeelscode.': 'Código de personal incorrecto.',
      'Mijn keuze': 'Mi selección',
      'Bestellen': 'Pedir', 'Vraag de rekening': 'Pedir la cuenta', 'Totaal': 'Total', 'Bestelling': 'Pedido', 'Nog geen bevestigde bestelling.': 'Aún no hay pedido confirmado.', 'De bediening is verwittigd': 'Se ha avisado al personal',
      'Leegmaken': 'Vaciar',
      'Gedeeld met iedereen aan jouw tafel': 'Compartido con todos en su mesa',
      'Allergenen': 'Alérgenos',
      'Dranksuggestie': 'Sugerencia de bebida',
      'Kies': 'Elegir',
      'Geen van de 14 wettelijke allergenen gemeld': 'Ninguno de los 14 alérgenos legales declarado',
      'Tafel': 'Mesa',
      'Personeel': 'Personal',
      'Je mandje is nog leeg.': 'Su cesta está vacía.',
      'Kies gerechten uit de kaart.': 'Elija platos del menú.',
      'Nog geen gerechten in deze categorie.': 'Aún no hay platos en esta categoría.',
      'Opmerking (max 20)': 'Nota (máx 20)',
      'Gluten': 'Gluten',
      'Schaaldieren': 'Crustáceos',
      'Eieren': 'Huevos',
      'Vis': 'Pescado',
      'Pinda': 'Cacahuete',
      'Soja': 'Soja',
      'Melk': 'Leche',
      'Noten': 'Frutos secos',
      'Selderij': 'Apio',
      'Mosterd': 'Mostaza',
      'Sesam': 'Sésamo',
      'Sulfiet': 'Sulfitos',
      'Lupine': 'Altramuces',
      'Weekdieren': 'Moluscos',
      'Google Translate': 'Google Translate',
      'Meer talen': 'Más idiomas',
      'Taal / Language': 'Idioma / Language',
      'Sluiten': 'Cerrar'
    }
  };

  var orig = (typeof WeakMap !== 'undefined') ? new WeakMap() : null;
  var mo = null, pending = false;

  function inSvc(node) { var e = node && node.nodeType === 3 ? node.parentNode : node; while (e) { if (e.id === 'svc-root') return true; e = e.parentNode; } return false; }

  function translateText(root) {
    var m = DICT[lang];
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        var p = n.parentNode; if (!p) return NodeFilter.FILTER_REJECT;
        var tag = p.nodeName; if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA') return NodeFilter.FILTER_REJECT;
        if (inSvc(n)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var nodes = []; while (w.nextNode()) nodes.push(w.currentNode);
    nodes.forEach(function (n) {
      var source; if (orig && orig.has(n)) source = orig.get(n); else { source = n.nodeValue; if (orig) orig.set(n, source); }
      if (lang === 'nl') { if (n.nodeValue !== source) n.nodeValue = source; return; }
      var key = source.trim();
      var val = (m && m[key] != null) ? source.replace(key, m[key]) : source;
      if (n.nodeValue !== val) n.nodeValue = val;
    });
  }
  function translateAttrs(root) {
    var m = DICT[lang];
    ['placeholder', 'title', 'aria-label'].forEach(function (attr) {
      root.querySelectorAll('[' + attr + ']').forEach(function (e) {
        if (inSvc(e)) return;
        var store = '__i18n_' + attr;
        var src = e[store]; if (src == null) { src = e.getAttribute(attr) || ''; e[store] = src; }
        if (lang === 'nl') { e.setAttribute(attr, src); return; }
        var key = src.trim();
        e.setAttribute(attr, (m && m[key] != null) ? m[key] : src);
      });
    });
  }
  function applyTo(root) { try { translateText(root); translateAttrs(root); } catch (e) {} }
  var paused = false;
  function pause() { paused = true; if (mo) mo.disconnect(); }
  function resume() { paused = false; connect(); applyTo(document.body); }
  function connect() {
    if (paused) return;
    if (!('MutationObserver' in window)) return;
    if (!mo) mo = new MutationObserver(function () { if (pending) return; pending = true; requestAnimationFrame(function () { pending = false; if (mo) mo.disconnect(); applyTo(document.body); connect(); }); });
    mo.observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  function updateFlags() { document.querySelectorAll('.lang-switch button[data-lang]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-lang') === lang); }); }
  function applyAll() { if (mo) mo.disconnect(); applyTo(document.body); connect(); updateFlags(); }
  function setLang(l) { paused = false; lang = ['en', 'pt', 'fr', 'de', 'es', 'ne'].indexOf(l) >= 0 ? l : 'nl'; try { localStorage.setItem(STORE, lang); } catch (e) {} applyAll(); }

  function closeLangMenus() {
    document.querySelectorAll('.lang-menu').forEach(function (m) { m.hidden = true; });
    document.querySelectorAll('.lang-globe').forEach(function (g) { g.setAttribute('aria-expanded', 'false'); });
  }
  function init() {
    document.querySelectorAll('.lang-switch button[data-lang]').forEach(function (b) { b.addEventListener('click', function () { setLang(b.getAttribute('data-lang')); closeLangMenus(); }); });
    document.querySelectorAll('.lang-globe').forEach(function (g) {
      g.addEventListener('click', function (e) {
        e.stopPropagation();
        var menu = g.parentNode.querySelector('.lang-menu'); if (!menu) return;
        var willOpen = menu.hidden; closeLangMenus();
        if (willOpen) { menu.hidden = false; g.setAttribute('aria-expanded', 'true'); }
      });
    });
    document.addEventListener('click', function (e) { if (!e.target.closest('.lang-switch')) closeLangMenus(); });
    applyAll();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  window.I18N = { setLang: setLang, getLang: function () { return lang; }, apply: applyAll, pause: pause, resume: resume };
})();
