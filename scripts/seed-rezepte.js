// Run: docker exec family-hub node scripts/seed-rezepte.js
// Seeds the 12 hardcoded bread recipes into the DB (skips if any already exist)

const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

const REZEPTE = [
  {
    name: "Reines Roggenbrot",
    emoji: "🌾",
    beschreibung: "Traditionelles deutsches Roggenbrot mit kräftigem Aroma und langer Haltbarkeit. Der pure Sauerteig-Geschmack macht dieses dichte, saftige Brot zum Klassiker der deutschen Brotkultur.",
    schwierigkeit: "Anfänger",
    backzeit: "60 Min.",
    gesamtzeit: "18 Std.",
    ergebnis: "1 Laib (ca. 1000g)",
    mehltyp: "Roggen",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/1/1f/Roggenbrot-Laib_Loaf-rye-bread.JPG",
    zutaten: ["12 g Roggensauerteig-Anstellgut","240 g Roggenvollkornmehl","240 g Wasser (37°C) — für den Sauerteig","360 g Roggenmehl Typ 1150","270 g Wasser (40°C) — für den Hauptteig","12 g Salz"],
    schritte: ["Anstellgut im Wasser auflösen und mit Roggenvollkornmehl verrühren. 14–16 Stunden bei Raumtemperatur reifen lassen.","Sauerteig mit warmem Wasser vermischen, dann Roggenmehl und Salz hinzufügen. 3 Minuten kneten, 30 Minuten abgedeckt ruhen lassen.","Teig zu einem Laib formen und in ein bemehltes Gärkörbchen geben. Ca. 45 Minuten bei 28°C gären (bis sichtbare Risse an der Oberfläche).","Backofen mit Gusstopf auf 250°C vorheizen. Laib in den heißen Gusstopf setzen.","10 Minuten bei 250°C mit Deckel backen, dann Deckel ab und 50 Minuten bei 200°C.","Kerntemperatur muss mindestens 95°C erreichen. Mindestens 4 Stunden auskühlen lassen."],
  },
  {
    name: "Klassisches Weizen-Sauerteigbrot",
    emoji: "🌿",
    beschreibung: "Luftiges, aromatisches Weizenbrot ohne Zusatzhefe. Knusprige Kruste, saftige Krume — perfekt für den Einstieg. Das Aroma entwickelt sich über eine lange, schonende Teigführung.",
    schwierigkeit: "Anfänger",
    backzeit: "50 Min.",
    gesamtzeit: "10 Std.",
    ergebnis: "1 Laib (ca. 720g)",
    mehltyp: "Weizen",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/6/67/Brote.JPG",
    zutaten: ["100 g Weizensauerteig-Anstellgut (aktiv)","400 g Weizenmehl Typ 550","100 g Weizenmehl Typ 1050","308 g Wasser (Raumtemperatur)","12 g Salz"],
    schritte: ["Sauerteig-Anstellgut mit Wasser verrühren, dann beide Mehle unterkneten. 30 Minuten Autolyse-Pause.","Salz hinzufügen, 8 Minuten kneten (erst langsam, dann schneller).","5 Stunden Stockgare bei 21–22°C. In den ersten 90 Minuten alle 30 Min. dehnen und falten.","Teig sanft zu einer straffen Kugel formen und mit der Naht nach oben in ein bemehltes Gärkörbchen legen.","1–1,5 Stunden Stückgare bei Raumtemperatur. Mit dem Fingertest prüfen: Teig soll langsam zurückfedern.","Mit einem scharfen Messer einschneiden. 20 Min. bei 250°C im zugedeckten Gusstopf, dann 25 Min. bei 200°C offen."],
  },
  {
    name: "Reines Dinkel-Sauerteigbrot",
    emoji: "✨",
    beschreibung: "Wertvolles Vollkornbrot aus Dinkelmehl mit feinem, nussigem Geschmack. Dinkel ist bekömmlicher als Weizen — mit Sauerteig eine hervorragende Alternative für empfindliche Mägen.",
    schwierigkeit: "Mittel",
    backzeit: "45 Min.",
    gesamtzeit: "20 Std.",
    ergebnis: "1 Laib (ca. 800g)",
    mehltyp: "Dinkel",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/8/85/Vollkornbrot_z01.JPG",
    zutaten: ["1 EL Dinkelsauerteig-Anstellgut","60 g Dinkelvollkornmehl + 60 g Wasser (lauwarm) — Vorteig","350 g Dinkelmehl Typ 630","75 g Dinkelvollkornmehl","250 ml Wasser (lauwarm)","10 g Salz"],
    schritte: ["Anstellgut mit Dinkelvollkornmehl und Wasser mischen. 2–4 Stunden gehen lassen, bis verdoppelt.","Restliches Mehl, Wasser und Salz hinzufügen. 30 Minuten ruhen, dann 10 Minuten kneten.","3–4 Stunden Stockgare bei Raumtemperatur. Stündlich dehnen und falten.","Teig formen, mit der Naht nach oben in ein bemehltes Gärkörbchen legen. Über Nacht (ca. 12 Stunden) im Kühlschrank.","Backofen mit Gusstopf auf 240°C vorheizen. Laib direkt aus dem Kühlschrank einschießen.","25 Minuten zugedeckt bei 220°C backen, dann 20 Minuten ohne Deckel. Vollständig auskühlen lassen."],
  },
  {
    name: "Roggenmischbrot",
    emoji: "🍞",
    beschreibung: "Das perfekte Alltagsbrot mit 70% Roggen und 30% Weizen — aromatisch, sättigend und lange haltbar. Ein echter Klassiker für jeden Tag, der sich mit etwas Übung problemlos meistern lässt.",
    schwierigkeit: "Anfänger",
    backzeit: "45 Min.",
    gesamtzeit: "12 Std.",
    ergebnis: "1 großer Laib (ca. 1100g)",
    mehltyp: "Roggen-Weizen",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/1/1f/Roggenbrot-Laib_Loaf-rye-bread.JPG",
    zutaten: ["150 g Roggensauerteig (aktiv)","300 g Roggenmehl Typ 1150","200 g Weizenmehl Typ 550","330 g lauwarmes Wasser","10 g Salz","1 TL Brotgewürz (Kümmel, Koriander, Fenchel)"],
    schritte: ["Alle Zutaten in eine Schüssel geben und zu einem klebrigen Teig verrühren (kein intensives Kneten nötig bei Roggen).","Teig abdecken und 2 Stunden bei Raumtemperatur gehen lassen.","Nochmals kurz durchrühren, in eine gefettete Kastenform oder zu einem Laib formen.","Ca. 45 Minuten Stückgare bis der Teig sichtbar aufgegangen ist.","Backofen auf 250°C vorheizen, eventuell mit Schwaden (Dampf) starten.","10 Minuten bei 250°C, dann 35 Minuten bei 200°C fertig backen."],
  },
  {
    name: "Rustikales Bauernbrot",
    emoji: "🏡",
    beschreibung: "Das traditionelle deutsche Bauernbrot — rustikal, saftig und mit kräftigem Aroma. Gelockert allein durch Sauerteig, beeindruckend lange haltbar und perfekt für herzhafte Beläge.",
    schwierigkeit: "Mittel",
    backzeit: "45 Min.",
    gesamtzeit: "14 Std.",
    ergebnis: "1 großer Laib (ca. 1050g)",
    mehltyp: "Roggen-Weizen",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/3/33/Fresh_made_bread_05.jpg",
    zutaten: ["40 g Sauerteig-Anstellgut","55 g Roggenmehl + 55 g Wasser — Vorteig","300 g Roggenmehl Typ 960","200 g Weizenmehl Typ 1050","330 g lauwarmes Wasser","10 g Salz","1 TL Brotgewürz","5 g frische Hefe (optional)"],
    schritte: ["Anstellgut mit Roggenmehl und Wasser vermischen. 6–8 Stunden abgedeckt gehen lassen.","Alle Zutaten vermischen und kurz verkneten. 2 Stunden Stockgare.","Teig kurz durchkneten und zu einem Laib formen. In ein bemehltes Gärkörbchen legen.","30 Minuten Stückgare bei Raumtemperatur.","Backofen auf 250°C vorheizen. Brot mit Dampf einschießen.","15 Minuten bei 250°C, dann 30 Minuten bei 220°C. Gut auskühlen lassen."],
  },
  {
    name: "100% Vollkorn-Sauerteigbrot",
    emoji: "💪",
    beschreibung: "Ein vollwertiges Kraftpaket aus Dinkel-, Roggen- und Weizenvollkornmehl. Trotz 100% Vollkornanteil überraschend luftig. Eine echte Herausforderung für ambitionierte Hobbybäcker.",
    schwierigkeit: "Fortgeschritten",
    backzeit: "55 Min.",
    gesamtzeit: "22 Std.",
    ergebnis: "1 Laib (ca. 1000g)",
    mehltyp: "Weizen-Dinkel-Roggen",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/8/85/Vollkornbrot_z01.JPG",
    zutaten: ["120 g Weizensauerteig-Anstellgut","240 g Weizenvollkornmehl","80 g Dinkelvollkornmehl","20 g Roggenvollkornmehl","10 g Altbrot (gemahlen, optional)","10 g Rübensirup","180 g Wasser (Autolyse) + 12 g Reservewasser","8 g Salz"],
    schritte: ["Sauerteig auffrischen: Anstellgut mit 60 g Weizenvollkornmehl und 48 g Wasser mischen. 12 Stunden gehen lassen.","Autolyse: Restliche Mehle, Altbrot, Rübensirup und 180 g Wasser vermischen. 1 Stunde ruhen.","Sauerteig, Salz und Reservewasser zum Autolyseteig geben und gut verkneten.","3–4 Stunden Stockgare mit Dehnen und Falten alle 45 Minuten.","Abends formen, in Gärkörbchen legen, über Nacht im Kühlschrank gären (mind. 12 Stunden).","25 Minuten zugedeckt bei 250°C, dann 25 Minuten offen bei 200°C. Letzte 5 Minuten Tür leicht öffnen."],
  },
  {
    name: "Sauerteig-Ciabatta",
    emoji: "🇮🇹",
    beschreibung: "Das italienische Kultbrot mit natürlichem Sauerteig. Charakteristisch großporig mit luftiger Krume und knuspriger Kruste dank sehr hoher Hydratation. Ein Gourmet-Brot für anspruchsvolle Bäcker.",
    schwierigkeit: "Fortgeschritten",
    backzeit: "35 Min.",
    gesamtzeit: "18 Std.",
    ergebnis: "2 Ciabatta (je ca. 350g)",
    mehltyp: "Weizen",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/b/b2/Ciabatta_cut.JPG",
    zutaten: ["10 g Weizensauerteig-Anstellgut","60 g Weizenmehl Typ 550 — Vorteig","50 g Wasser (35°C) — Vorteig","400 g Weizenmehl Typ 550","310 g Wasser (kalt)","20 g Olivenöl","6 g Salz","20 g Bassinage-Wasser (zum Einarbeiten)"],
    schritte: ["Vorteig: Sauerteig, Mehl und Wasser mischen. 12–16 Stunden bei Raumtemperatur gären.","Autolyse: Hauptmehl, Wasser und Vorteig mischen. 40 Minuten ruhen lassen.","Salz und Olivenöl einarbeiten, Bassinage-Wasser portionsweise einkneten.","3 Stunden Stockgare bei Raumtemperatur. Alle 45 Minuten dehnen und falten (Coil Folds).","Teig vorsichtig auf bemehlte Fläche geben und in 2 Teile teilen. Nicht entgasen! Locker in Form bringen.","50–60 Minuten Stückgare. Bei 250°C mit viel Dampf 20 Minuten, dann 15 Minuten bei 220°C offen."],
  },
  {
    name: "Sauerteig-Baguette",
    emoji: "🥖",
    beschreibung: "Das französische Kultbrot mit deutschem Sauerteig-Twist. Knusprige Kruste, offene Krume, typische Baguette-Aromen. Bringt Pariser Flair auf den Familientisch.",
    schwierigkeit: "Fortgeschritten",
    backzeit: "25 Min.",
    gesamtzeit: "16 Std.",
    ergebnis: "2 Baguettes (je ca. 300g)",
    mehltyp: "Weizen",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/9/9c/Baguette_de_tradition.jpg",
    zutaten: ["10 g Weizensauerteig-Anstellgut","50 g Weizenmehl T80 + 40 g Wasser — Vorteig (Vorabend)","500 g Weizenmehl Typ 550 (Typ 65 ist ideal)","360 g Wasser (kalt)","10 g Salz","Optional: 2 g frische Hefe (für mehr Triebsicherheit)"],
    schritte: ["Vorabend: Sauerteig mit Mehl und Wasser mischen. Über Nacht bei Raumtemperatur gären lassen.","Autolyse: Hauptmehl und 340 g Wasser 45 Minuten quellen lassen.","Vorteig, Salz, restliches Wasser (und ggf. Hefe) einarbeiten. 8 Minuten kneten.","3–4 Stunden Stockgare mit 3x dehnen und falten im 30-Minuten-Abstand.","In zwei Teile teilen, länglich vorformen, 20 Minuten entspannen lassen, dann straff zu Baguettes formen.","1 Stunde Stückgare. 3x diagonal einschneiden. 10 Minuten mit Dampf bei 250°C, dann 15 Minuten bei 230°C."],
  },
  {
    name: "Sauerteig-Brötchen",
    emoji: "🧆",
    beschreibung: "Knusprige, aromatische Brötchen ohne Hefe — nur mit aktivem Sauerteig. Ideal für das Wochenend-Frühstück. Mit langer Teigführung entwickeln sie ein wunderbares Aroma und bleiben lange frisch.",
    schwierigkeit: "Anfänger",
    backzeit: "22 Min.",
    gesamtzeit: "8 Std.",
    ergebnis: "10–12 Brötchen",
    mehltyp: "Weizen",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/c/c6/Broetchen.jpg",
    zutaten: ["120 g Weizensauerteig-Anstellgut (aktiv, nach Füttern)","600 g Weizenmehl Typ 550","220 ml lauwarmes Wasser","100 ml Milch (oder Pflanzenmilch)","15 g Salz","Optional: Sesam, Mohn oder Sonnenblumenkerne zum Bestreuen"],
    schritte: ["Alle Zutaten in eine Schüssel geben und 8–10 Minuten zu einem glatten Teig kneten.","Abgedeckt 5–6 Stunden bei Raumtemperatur gehen lassen. Nach 2 Stunden einmal dehnen und falten.","Teig auf bemehlter Fläche in 10–12 gleichmäßige Stücke teilen. Zu straffen Kugeln formen.","Brötchen auf ein Backpapier setzen, optional mit Wasser einstreichen und bestreuen.","30 Minuten Stückgare bei Raumtemperatur.","Backofen auf 210°C vorheizen. Mit Dampf einschießen (Schüssel Wasser auf Ofenboden). 20–22 Minuten goldbraun backen."],
  },
  {
    name: "Kürbiskernbrot",
    emoji: "🎃",
    beschreibung: "Ein dekoratives Sauerteigbrot voller Kürbiskerne und Sesam. Die Kerne geben knackige Textur und nussigen Geschmack. Optisch beeindruckend — ein Blickfang auf jedem Tisch.",
    schwierigkeit: "Mittel",
    backzeit: "55 Min.",
    gesamtzeit: "20 Std.",
    ergebnis: "1 Laib (ca. 1000g)",
    mehltyp: "Weizen-Roggen",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/8/85/Vollkornbrot_z01.JPG",
    zutaten: ["120 g Roggensauerteig-Anstellgut","375 g Weizenmehl Typ 1050","60 g Weizenmehl Typ 550","60 g Roggenmehl Typ 1150","290 g Wasser (36°C)","10 g Salz","120 g geröstete Kürbiskerne","60 g Sesam","Kürbiskerne, Haferflocken und Sesam zum Bestreuen"],
    schritte: ["Sauerteig: Anstellgut mit 60 g Roggenmehl, 60 g Roggenvollkornmehl und 120 g Wasser mischen. 12–16 Stunden gären.","Kürbiskerne und Sesam in einer Pfanne ohne Fett anrösten. Abkühlen lassen.","Alle Mehle, Sauerteig und Wasser mischen. 30 Minuten Autolyse, dann Salz einkneten.","Geröstete Kerne in den Teig einfalten. 3 Stunden Stockgare mit 2x dehnen und falten.","Zu einem Laib formen, Oberfläche anfeuchten, großzügig mit Kürbiskernen, Haferflocken und Sesam bestreuen.","75–90 Minuten Stückgare. 55 Minuten bei 210°C im Gusstopf (erste 25 Min. zugedeckt) backen."],
  },
  {
    name: "Kerniges Körnerbrot",
    emoji: "🌻",
    beschreibung: "Ein nahrhaftes Alltagsbrot voller verschiedener Samen und Körner. Sonnenblumenkerne, Leinsamen, Sesam und Kürbiskerne machen es zum Kraftpaket — und durch den Sauerteig bleibt es erstaunlich lange frisch.",
    schwierigkeit: "Mittel",
    backzeit: "50 Min.",
    gesamtzeit: "12 Std.",
    ergebnis: "1 Laib (ca. 1100g)",
    mehltyp: "Weizen",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/0/01/Rye_bread_-_ithmus.jpg",
    zutaten: ["100 g Weizensauerteig-Anstellgut","400 g Weizenmehl Typ 550","100 g Weizenmehl Typ 1050","300 g Wasser","15 g Salz","50 g Sonnenblumenkerne","30 g Leinsamen","30 g Sesam","30 g Kürbiskerne","Optional: 1 EL Rübensirup"],
    schritte: ["Alle Körner und Samen mind. 1 Stunde in etwas Wasser einweichen (spart Feuchtigkeit im Brot).","Sauerteig mit 300 g Wasser auflösen. Mehle einkneten. 30 Minuten Autolyse.","Salz und Körner-Mischung einarbeiten. Gut durchkneten.","4–6 Stunden Stockgare mit 3x dehnen und falten im Stundenabstand.","Zu einem Laib formen, in bemehltes Gärkörbchen legen. 2 Stunden Stückgare (oder über Nacht im Kühlschrank).","Bei 250°C 20 Minuten zugedeckt, dann 30 Minuten offen bei 200°C backen."],
  },
  {
    name: "Sauerteig-Laugenbrezel",
    emoji: "🥨",
    beschreibung: "Die bayerische Brezel mit Sauerteig — außen glänzend dunkelbraun durch das Natronbad, innen weich und aromatisch. Ein Highlight für das Wochenendfrühstück oder die Brotzeit.",
    schwierigkeit: "Fortgeschritten",
    backzeit: "20 Min.",
    gesamtzeit: "14 Std.",
    ergebnis: "8–10 Brezeln",
    mehltyp: "Weizen",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/8/88/Pretzel_-_stocker1970.jpg",
    zutaten: ["80 g Weizensauerteig-Anstellgut (aktiv)","500 g Weizenmehl Typ 550","250 ml lauwarmes Wasser","12 g Salz","30 g weiche Butter","Für das Natronbad: 1 Liter Wasser + 40 g Natron","Grobes Salz zum Bestreuen"],
    schritte: ["Sauerteig mit Wasser, Mehl, Salz und Butter zu einem glatten, geschmeidigen Teig kneten (mind. 10 Minuten).","Abgedeckt 3 Stunden bei Raumtemperatur gehen lassen, dann über Nacht in den Kühlschrank (8–12 Stunden).","Teig in 8–10 gleichmäßige Stücke teilen. Jeden zu einer langen Rolle (ca. 60 cm) ausrollen und zur Brezel schlingen.","30 Minuten bei Raumtemperatur entspannen lassen.","Natronbad: Wasser aufkochen, Natron vorsichtig einrühren. Brezeln je 30 Sekunden einlegen, auf Backpapier setzen.","Mit grobem Salz bestreuen. Bei 200°C Umluft 18–20 Minuten backen bis tief goldbraun."],
  },
]

async function main() {
  const existing = await prisma.brotRezept.count()
  if (existing > 0) {
    console.log(`${existing} Rezepte bereits in DB — überspringe Seed.`)
    return
  }
  for (const r of REZEPTE) {
    await prisma.brotRezept.create({
      data: {
        ...r,
        zutaten: JSON.stringify(r.zutaten),
        schritte: JSON.stringify(r.schritte),
      },
    })
  }
  console.log(`${REZEPTE.length} Rezepte erfolgreich geseedet.`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
