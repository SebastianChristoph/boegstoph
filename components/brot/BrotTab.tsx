"use client"

import { useState } from "react"
import type { SauerteigBatch, SauerteigTodo } from "@prisma/client"

// ── Types ─────────────────────────────────────────────────────────────────────

type BatchWithTodos = SauerteigBatch & { todos: SauerteigTodo[] }
type SubTab = "sauerteig" | "rezepte"

// ── Recipe data ───────────────────────────────────────────────────────────────

interface Recipe {
  id: string
  name: string
  emoji: string
  beschreibung: string
  schwierigkeit: "Anfänger" | "Mittel" | "Fortgeschritten"
  backzeit: string
  gesamtzeit: string
  ergebnis: string
  mehltyp: string
  imageUrl: string
  zutaten: string[]
  schritte: string[]
}

const REZEPTE: Recipe[] = [
  {
    id: "roggenbrot",
    name: "Reines Roggenbrot",
    emoji: "🌾",
    beschreibung: "Traditionelles deutsches Roggenbrot mit kräftigem Aroma und langer Haltbarkeit. Der pure Sauerteig-Geschmack macht dieses dichte, saftige Brot zum Klassiker der deutschen Brotkultur.",
    schwierigkeit: "Anfänger",
    backzeit: "60 Min.",
    gesamtzeit: "18 Std.",
    ergebnis: "1 Laib (ca. 1000g)",
    mehltyp: "Roggen",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/1/1f/Roggenbrot-Laib_Loaf-rye-bread.JPG",
    zutaten: [
      "12 g Roggensauerteig-Anstellgut",
      "240 g Roggenvollkornmehl",
      "240 g Wasser (37°C) — für den Sauerteig",
      "360 g Roggenmehl Typ 1150",
      "270 g Wasser (40°C) — für den Hauptteig",
      "12 g Salz",
    ],
    schritte: [
      "Anstellgut im Wasser auflösen und mit Roggenvollkornmehl verrühren. 14–16 Stunden bei Raumtemperatur reifen lassen.",
      "Sauerteig mit warmem Wasser vermischen, dann Roggenmehl und Salz hinzufügen. 3 Minuten kneten, 30 Minuten abgedeckt ruhen lassen.",
      "Teig zu einem Laib formen und in ein bemehltes Gärkörbchen geben. Ca. 45 Minuten bei 28°C gären (bis sichtbare Risse an der Oberfläche).",
      "Backofen mit Gusstopf auf 250°C vorheizen. Laib in den heißen Gusstopf setzen.",
      "10 Minuten bei 250°C mit Deckel backen, dann Deckel ab und 50 Minuten bei 200°C.",
      "Kerntemperatur muss mindestens 95°C erreichen. Mindestens 4 Stunden auskühlen lassen.",
    ],
  },
  {
    id: "weizenbrot",
    name: "Klassisches Weizen-Sauerteigbrot",
    emoji: "🌿",
    beschreibung: "Luftiges, aromatisches Weizenbrot ohne Zusatzhefe. Knusprige Kruste, saftige Krume — perfekt für den Einstieg. Das Aroma entwickelt sich über eine lange, schonende Teigführung.",
    schwierigkeit: "Anfänger",
    backzeit: "50 Min.",
    gesamtzeit: "10 Std.",
    ergebnis: "1 Laib (ca. 720g)",
    mehltyp: "Weizen",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/6/67/Brote.JPG",
    zutaten: [
      "100 g Weizensauerteig-Anstellgut (aktiv)",
      "400 g Weizenmehl Typ 550",
      "100 g Weizenmehl Typ 1050",
      "308 g Wasser (Raumtemperatur)",
      "12 g Salz",
    ],
    schritte: [
      "Sauerteig-Anstellgut mit Wasser verrühren, dann beide Mehle unterkneten. 30 Minuten Autolyse-Pause.",
      "Salz hinzufügen, 8 Minuten kneten (erst langsam, dann schneller).",
      "5 Stunden Stockgare bei 21–22°C. In den ersten 90 Minuten alle 30 Min. dehnen und falten.",
      "Teig sanft zu einer straffen Kugel formen und mit der Naht nach oben in ein bemehltes Gärkörbchen legen.",
      "1–1,5 Stunden Stückgare bei Raumtemperatur. Mit dem Fingertest prüfen: Teig soll langsam zurückfedern.",
      "Mit einem scharfen Messer einschneiden. 20 Min. bei 250°C im zugedeckten Gusstopf, dann 25 Min. bei 200°C offen.",
    ],
  },
  {
    id: "dinkelbrot",
    name: "Reines Dinkel-Sauerteigbrot",
    emoji: "✨",
    beschreibung: "Wertvolles Vollkornbrot aus Dinkelmehl mit feinem, nussigem Geschmack. Dinkel ist bekömmlicher als Weizen — mit Sauerteig eine hervorragende Alternative für empfindliche Mägen.",
    schwierigkeit: "Mittel",
    backzeit: "45 Min.",
    gesamtzeit: "20 Std.",
    ergebnis: "1 Laib (ca. 800g)",
    mehltyp: "Dinkel",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/8/85/Vollkornbrot_z01.JPG",
    zutaten: [
      "1 EL Dinkelsauerteig-Anstellgut",
      "60 g Dinkelvollkornmehl + 60 g Wasser (lauwarm) — Vorteig",
      "350 g Dinkelmehl Typ 630",
      "75 g Dinkelvollkornmehl",
      "250 ml Wasser (lauwarm)",
      "10 g Salz",
    ],
    schritte: [
      "Anstellgut mit Dinkelvollkornmehl und Wasser mischen. 2–4 Stunden gehen lassen, bis verdoppelt.",
      "Restliches Mehl, Wasser und Salz hinzufügen. 30 Minuten ruhen, dann 10 Minuten kneten.",
      "3–4 Stunden Stockgare bei Raumtemperatur. Stündlich dehnen und falten.",
      "Teig formen, mit der Naht nach oben in ein bemehltes Gärkörbchen legen. Über Nacht (ca. 12 Stunden) im Kühlschrank.",
      "Backofen mit Gusstopf auf 240°C vorheizen. Laib direkt aus dem Kühlschrank einschießen.",
      "25 Minuten zugedeckt bei 220°C backen, dann 20 Minuten ohne Deckel. Vollständig auskühlen lassen.",
    ],
  },
  {
    id: "mischbrot",
    name: "Roggenmischbrot",
    emoji: "🍞",
    beschreibung: "Das perfekte Alltagsbrot mit 70% Roggen und 30% Weizen — aromatisch, sättigend und lange haltbar. Ein echter Klassiker für jeden Tag, der sich mit etwas Übung problemlos meistern lässt.",
    schwierigkeit: "Anfänger",
    backzeit: "45 Min.",
    gesamtzeit: "12 Std.",
    ergebnis: "1 großer Laib (ca. 1100g)",
    mehltyp: "Roggen-Weizen",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/1/1f/Roggenbrot-Laib_Loaf-rye-bread.JPG",
    zutaten: [
      "150 g Roggensauerteig (aktiv)",
      "300 g Roggenmehl Typ 1150",
      "200 g Weizenmehl Typ 550",
      "330 g lauwarmes Wasser",
      "10 g Salz",
      "1 TL Brotgewürz (Kümmel, Koriander, Fenchel)",
    ],
    schritte: [
      "Alle Zutaten in eine Schüssel geben und zu einem klebrigen Teig verrühren (kein intensives Kneten nötig bei Roggen).",
      "Teig abdecken und 2 Stunden bei Raumtemperatur gehen lassen.",
      "Nochmals kurz durchrühren, in eine gefettete Kastenform oder zu einem Laib formen.",
      "Ca. 45 Minuten Stückgare bis der Teig sichtbar aufgegangen ist.",
      "Backofen auf 250°C vorheizen, eventuell mit Schwaden (Dampf) starten.",
      "10 Minuten bei 250°C, dann 35 Minuten bei 200°C fertig backen.",
    ],
  },
  {
    id: "bauernbrot",
    name: "Rustikales Bauernbrot",
    emoji: "🏡",
    beschreibung: "Das traditionelle deutsche Bauernbrot — rustikal, saftig und mit kräftigem Aroma. Gelockert allein durch Sauerteig, beeindruckend lange haltbar und perfekt für herzhafte Beläge.",
    schwierigkeit: "Mittel",
    backzeit: "45 Min.",
    gesamtzeit: "14 Std.",
    ergebnis: "1 großer Laib (ca. 1050g)",
    mehltyp: "Roggen-Weizen",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/3/33/Fresh_made_bread_05.jpg",
    zutaten: [
      "40 g Sauerteig-Anstellgut",
      "55 g Roggenmehl + 55 g Wasser — Vorteig",
      "300 g Roggenmehl Typ 960",
      "200 g Weizenmehl Typ 1050",
      "330 g lauwarmes Wasser",
      "10 g Salz",
      "1 TL Brotgewürz",
      "5 g frische Hefe (optional)",
    ],
    schritte: [
      "Anstellgut mit Roggenmehl und Wasser vermischen. 6–8 Stunden abgedeckt gehen lassen.",
      "Alle Zutaten vermischen und kurz verkneten. 2 Stunden Stockgare.",
      "Teig kurz durchkneten und zu einem Laib formen. In ein bemehltes Gärkörbchen legen.",
      "30 Minuten Stückgare bei Raumtemperatur.",
      "Backofen auf 250°C vorheizen. Brot mit Dampf einschießen.",
      "15 Minuten bei 250°C, dann 30 Minuten bei 220°C. Gut auskühlen lassen.",
    ],
  },
  {
    id: "vollkornbrot",
    name: "100% Vollkorn-Sauerteigbrot",
    emoji: "💪",
    beschreibung: "Ein vollwertiges Kraftpaket aus Dinkel-, Roggen- und Weizenvollkornmehl. Trotz 100% Vollkornanteil überraschend luftig. Eine echte Herausforderung für ambitionierte Hobbybäcker.",
    schwierigkeit: "Fortgeschritten",
    backzeit: "55 Min.",
    gesamtzeit: "22 Std.",
    ergebnis: "1 Laib (ca. 1000g)",
    mehltyp: "Weizen-Dinkel-Roggen",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/8/85/Vollkornbrot_z01.JPG",
    zutaten: [
      "120 g Weizensauerteig-Anstellgut",
      "240 g Weizenvollkornmehl",
      "80 g Dinkelvollkornmehl",
      "20 g Roggenvollkornmehl",
      "10 g Altbrot (gemahlen, optional)",
      "10 g Rübensirup",
      "180 g Wasser (Autolyse) + 12 g Reservewasser",
      "8 g Salz",
    ],
    schritte: [
      "Sauerteig auffrischen: Anstellgut mit 60 g Weizenvollkornmehl und 48 g Wasser mischen. 12 Stunden gehen lassen.",
      "Autolyse: Restliche Mehle, Altbrot, Rübensirup und 180 g Wasser vermischen. 1 Stunde ruhen.",
      "Sauerteig, Salz und Reservewasser zum Autolyseteig geben und gut verkneten.",
      "3–4 Stunden Stockgare mit Dehnen und Falten alle 45 Minuten.",
      "Abends formen, in Gärkörbchen legen, über Nacht im Kühlschrank gären (mind. 12 Stunden).",
      "25 Minuten zugedeckt bei 250°C, dann 25 Minuten offen bei 200°C. Letzte 5 Minuten Tür leicht öffnen.",
    ],
  },
  {
    id: "ciabatta",
    name: "Sauerteig-Ciabatta",
    emoji: "🇮🇹",
    beschreibung: "Das italienische Kultbrot mit natürlichem Sauerteig. Charakteristisch großporig mit luftiger Krume und knuspriger Kruste dank sehr hoher Hydratation. Ein Gourmet-Brot für anspruchsvolle Bäcker.",
    schwierigkeit: "Fortgeschritten",
    backzeit: "35 Min.",
    gesamtzeit: "18 Std.",
    ergebnis: "2 Ciabatta (je ca. 350g)",
    mehltyp: "Weizen",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/b/b2/Ciabatta_cut.JPG",
    zutaten: [
      "10 g Weizensauerteig-Anstellgut",
      "60 g Weizenmehl Typ 550 — Vorteig",
      "50 g Wasser (35°C) — Vorteig",
      "400 g Weizenmehl Typ 550",
      "310 g Wasser (kalt)",
      "20 g Olivenöl",
      "6 g Salz",
      "20 g Bassinage-Wasser (zum Einarbeiten)",
    ],
    schritte: [
      "Vorteig: Sauerteig, Mehl und Wasser mischen. 12–16 Stunden bei Raumtemperatur gären.",
      "Autolyse: Hauptmehl, Wasser und Vorteig mischen. 40 Minuten ruhen lassen.",
      "Salz und Olivenöl einarbeiten, Bassinage-Wasser portionsweise einkneten.",
      "3 Stunden Stockgare bei Raumtemperatur. Alle 45 Minuten dehnen und falten (Coil Folds).",
      "Teig vorsichtig auf bemehlte Fläche geben und in 2 Teile teilen. Nicht entgasen! Locker in Form bringen.",
      "50–60 Minuten Stückgare. Bei 250°C mit viel Dampf 20 Minuten, dann 15 Minuten bei 220°C offen.",
    ],
  },
  {
    id: "baguette",
    name: "Sauerteig-Baguette",
    emoji: "🥖",
    beschreibung: "Das französische Kultbrot mit deutschem Sauerteig-Twist. Knusprige Kruste, offene Krume, typische Baguette-Aromen. Bringt Pariser Flair auf den Familientisch.",
    schwierigkeit: "Fortgeschritten",
    backzeit: "25 Min.",
    gesamtzeit: "16 Std.",
    ergebnis: "2 Baguettes (je ca. 300g)",
    mehltyp: "Weizen",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/9/9c/Baguette_de_tradition.jpg",
    zutaten: [
      "10 g Weizensauerteig-Anstellgut",
      "50 g Weizenmehl T80 + 40 g Wasser — Vorteig (Vorabend)",
      "500 g Weizenmehl Typ 550 (Typ 65 ist ideal)",
      "360 g Wasser (kalt)",
      "10 g Salz",
      "Optional: 2 g frische Hefe (für mehr Triebsicherheit)",
    ],
    schritte: [
      "Vorabend: Sauerteig mit Mehl und Wasser mischen. Über Nacht bei Raumtemperatur gären lassen.",
      "Autolyse: Hauptmehl und 340 g Wasser 45 Minuten quellen lassen.",
      "Vorteig, Salz, restliches Wasser (und ggf. Hefe) einarbeiten. 8 Minuten kneten.",
      "3–4 Stunden Stockgare mit 3x dehnen und falten im 30-Minuten-Abstand.",
      "In zwei Teile teilen, länglich vorformen, 20 Minuten entspannen lassen, dann straff zu Baguettes formen.",
      "1 Stunde Stückgare. 3x diagonal einschneiden. 10 Minuten mit Dampf bei 250°C, dann 15 Minuten bei 230°C.",
    ],
  },
  {
    id: "broetchen",
    name: "Sauerteig-Brötchen",
    emoji: "🧆",
    beschreibung: "Knusprige, aromatische Brötchen ohne Hefe — nur mit aktivem Sauerteig. Ideal für das Wochenend-Frühstück. Mit langer Teigführung entwickeln sie ein wunderbares Aroma und bleiben lange frisch.",
    schwierigkeit: "Anfänger",
    backzeit: "22 Min.",
    gesamtzeit: "8 Std.",
    ergebnis: "10–12 Brötchen",
    mehltyp: "Weizen",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/c/c6/Broetchen.jpg",
    zutaten: [
      "120 g Weizensauerteig-Anstellgut (aktiv, nach Füttern)",
      "600 g Weizenmehl Typ 550",
      "220 ml lauwarmes Wasser",
      "100 ml Milch (oder Pflanzenmilch)",
      "15 g Salz",
      "Optional: Sesam, Mohn oder Sonnenblumenkerne zum Bestreuen",
    ],
    schritte: [
      "Alle Zutaten in eine Schüssel geben und 8–10 Minuten zu einem glatten Teig kneten.",
      "Abgedeckt 5–6 Stunden bei Raumtemperatur gehen lassen. Nach 2 Stunden einmal dehnen und falten.",
      "Teig auf bemehlter Fläche in 10–12 gleichmäßige Stücke teilen. Zu straffen Kugeln formen.",
      "Brötchen auf ein Backpapier setzen, optional mit Wasser einstreichen und bestreuen.",
      "30 Minuten Stückgare bei Raumtemperatur.",
      "Backofen auf 210°C vorheizen. Mit Dampf einschießen (Schüssel Wasser auf Ofenboden). 20–22 Minuten goldbraun backen.",
    ],
  },
  {
    id: "kuerbiskernbrot",
    name: "Kürbiskernbrot",
    emoji: "🎃",
    beschreibung: "Ein dekoratives Sauerteigbrot voller Kürbiskerne und Sesam. Die Kerne geben knackige Textur und nussigen Geschmack. Optisch beeindruckend — ein Blickfang auf jedem Tisch.",
    schwierigkeit: "Mittel",
    backzeit: "55 Min.",
    gesamtzeit: "20 Std.",
    ergebnis: "1 Laib (ca. 1000g)",
    mehltyp: "Weizen-Roggen",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/8/85/Vollkornbrot_z01.JPG",
    zutaten: [
      "120 g Roggensauerteig-Anstellgut",
      "375 g Weizenmehl Typ 1050",
      "60 g Weizenmehl Typ 550",
      "60 g Roggenmehl Typ 1150",
      "290 g Wasser (36°C)",
      "10 g Salz",
      "120 g geröstete Kürbiskerne",
      "60 g Sesam",
      "Kürbiskerne, Haferflocken und Sesam zum Bestreuen",
    ],
    schritte: [
      "Sauerteig: Anstellgut mit 60 g Roggenmehl, 60 g Roggenvollkornmehl und 120 g Wasser mischen. 12–16 Stunden gären.",
      "Kürbiskerne und Sesam in einer Pfanne ohne Fett anrösten. Abkühlen lassen.",
      "Alle Mehle, Sauerteig und Wasser mischen. 30 Minuten Autolyse, dann Salz einkneten.",
      "Geröstete Kerne in den Teig einfalten. 3 Stunden Stockgare mit 2x dehnen und falten.",
      "Zu einem Laib formen, Oberfläche anfeuchten, großzügig mit Kürbiskernen, Haferflocken und Sesam bestreuen.",
      "75–90 Minuten Stückgare. 55 Minuten bei 210°C im Gusstopf (erste 25 Min. zugedeckt) backen.",
    ],
  },
  {
    id: "koernerbrot",
    name: "Kerniges Körnerbrot",
    emoji: "🌻",
    beschreibung: "Ein nahrhaftes Alltagsbrot voller verschiedener Samen und Körner. Sonnenblumenkerne, Leinsamen, Sesam und Kürbiskerne machen es zum Kraftpaket — und durch den Sauerteig bleibt es erstaunlich lange frisch.",
    schwierigkeit: "Mittel",
    backzeit: "50 Min.",
    gesamtzeit: "12 Std.",
    ergebnis: "1 Laib (ca. 1100g)",
    mehltyp: "Weizen",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/0/01/Rye_bread_-_ithmus.jpg",
    zutaten: [
      "100 g Weizensauerteig-Anstellgut",
      "400 g Weizenmehl Typ 550",
      "100 g Weizenmehl Typ 1050",
      "300 g Wasser",
      "15 g Salz",
      "50 g Sonnenblumenkerne",
      "30 g Leinsamen",
      "30 g Sesam",
      "30 g Kürbiskerne",
      "Optional: 1 EL Rübensirup",
    ],
    schritte: [
      "Alle Körner und Samen mind. 1 Stunde in etwas Wasser einweichen (spart Feuchtigkeit im Brot).",
      "Sauerteig mit 300 g Wasser auflösen. Mehle einkneten. 30 Minuten Autolyse.",
      "Salz und Körner-Mischung einarbeiten. Gut durchkneten.",
      "4–6 Stunden Stockgare mit 3x dehnen und falten im Stundenabstand.",
      "Zu einem Laib formen, in bemehltes Gärkörbchen legen. 2 Stunden Stückgare (oder über Nacht im Kühlschrank).",
      "Bei 250°C 20 Minuten zugedeckt, dann 30 Minuten offen bei 200°C backen.",
    ],
  },
  {
    id: "laugenbrezel",
    name: "Sauerteig-Laugenbrezel",
    emoji: "🥨",
    beschreibung: "Die bayerische Brezel mit Sauerteig — außen glänzend dunkelbraun durch das Natronbad, innen weich und aromatisch. Ein Highlight für das Wochenendfrühstück oder die Brotzeit.",
    schwierigkeit: "Fortgeschritten",
    backzeit: "20 Min.",
    gesamtzeit: "14 Std.",
    ergebnis: "8–10 Brezeln",
    mehltyp: "Weizen",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/8/88/Pretzel_-_stocker1970.jpg",
    zutaten: [
      "80 g Weizensauerteig-Anstellgut (aktiv)",
      "500 g Weizenmehl Typ 550",
      "250 ml lauwarmes Wasser",
      "12 g Salz",
      "30 g weiche Butter",
      "Für das Natronbad: 1 Liter Wasser + 40 g Natron",
      "Grobes Salz zum Bestreuen",
    ],
    schritte: [
      "Sauerteig mit Wasser, Mehl, Salz und Butter zu einem glatten, geschmeidigen Teig kneten (mind. 10 Minuten).",
      "Abgedeckt 3 Stunden bei Raumtemperatur gehen lassen, dann über Nacht in den Kühlschrank (8–12 Stunden).",
      "Teig in 8–10 gleichmäßige Stücke teilen. Jeden zu einer langen Rolle (ca. 60 cm) ausrollen und zur Brezel schlingen.",
      "30 Minuten bei Raumtemperatur entspannen lassen.",
      "Natronbad: Wasser aufkochen, Natron vorsichtig einrühren. Brezeln je 30 Sekunden einlegen, auf Backpapier setzen.",
      "Mit grobem Salz bestreuen. Bei 200°C Umluft 18–20 Minuten backen bis tief goldbraun.",
    ],
  },
]

// ── Sauerteig constants ───────────────────────────────────────────────────────

const TYPE_EMOJI: Record<string, string> = { Roggen: "🌾", Weizen: "🌿", Dinkel: "✨" }
const TYPE_TEMP: Record<string, string> = {
  Roggen: "26–28°C",
  Weizen: "24–26°C",
  Dinkel: "22–24°C",
}
const TYPE_MEHL: Record<string, string> = {
  Roggen: "Roggenmehl Type 1150",
  Weizen: "Weizenmehl Type 550",
  Dinkel: "Dinkelmehl Type 1050",
}

// ── Difficulty badge ──────────────────────────────────────────────────────────

function DiffBadge({ diff }: { diff: Recipe["schwierigkeit"] }) {
  const colors = {
    Anfänger: "bg-green-100 text-green-700",
    Mittel: "bg-amber-100 text-amber-700",
    Fortgeschritten: "bg-red-100 text-red-700",
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[diff]}`}>{diff}</span>
  )
}

// ── Recipe card ───────────────────────────────────────────────────────────────

function RecipeCard({ recipe, onClick }: { recipe: Recipe; onClick: () => void }) {
  const [imgError, setImgError] = useState(false)

  return (
    <button
      onClick={onClick}
      className="text-left bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md hover:border-amber-300 transition-all"
    >
      {/* Image */}
      <div className="h-40 bg-amber-50 overflow-hidden flex items-center justify-center">
        {!imgError ? (
          <img
            src={recipe.imageUrl}
            alt={recipe.name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="text-5xl">{recipe.emoji}</span>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-1 mb-1">
          <span className="font-semibold text-gray-900 text-sm leading-snug">{recipe.emoji} {recipe.name}</span>
        </div>
        <DiffBadge diff={recipe.schwierigkeit} />
        <p className="text-xs text-gray-500 mt-2 line-clamp-2 leading-relaxed">{recipe.beschreibung}</p>
        <div className="flex gap-3 mt-3 text-xs text-gray-400">
          <span>🕐 {recipe.backzeit}</span>
          <span>⏱ {recipe.gesamtzeit}</span>
          <span>🍞 {recipe.ergebnis}</span>
        </div>
      </div>
    </button>
  )
}

// ── Recipe modal ──────────────────────────────────────────────────────────────

function RecipeModal({ recipe, onClose }: { recipe: Recipe; onClose: () => void }) {
  const [imgError, setImgError] = useState(false)

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-white rounded-t-3xl md:rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header image */}
        <div className="h-48 bg-amber-50 relative overflow-hidden shrink-0 rounded-t-3xl md:rounded-t-2xl">
          {!imgError ? (
            <img
              src={recipe.imageUrl}
              alt={recipe.name}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-7xl">{recipe.emoji}</span>
            </div>
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 bg-black/40 hover:bg-black/60 text-white w-8 h-8 rounded-full flex items-center justify-center text-lg leading-none"
          >
            ×
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          <div className="flex items-start gap-2 mb-2 flex-wrap">
            <h2 className="font-bold text-gray-900 text-xl">{recipe.emoji} {recipe.name}</h2>
          </div>
          <div className="flex gap-2 flex-wrap mb-3">
            <DiffBadge diff={recipe.schwierigkeit} />
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{recipe.mehltyp}</span>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed mb-4">{recipe.beschreibung}</p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            {[
              { label: "Backzeit", value: recipe.backzeit, icon: "🕐" },
              { label: "Gesamtzeit", value: recipe.gesamtzeit, icon: "⏱" },
              { label: "Ergebnis", value: recipe.ergebnis, icon: "🍞" },
            ].map((s) => (
              <div key={s.label} className="bg-amber-50 rounded-xl px-3 py-2 text-center">
                <div className="text-xl mb-0.5">{s.icon}</div>
                <div className="text-xs font-semibold text-gray-800">{s.value}</div>
                <div className="text-xs text-gray-400">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Zutaten */}
          <h3 className="font-semibold text-gray-900 mb-2">Zutaten</h3>
          <ul className="space-y-1.5 mb-5">
            {recipe.zutaten.map((z, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-amber-500 mt-0.5 shrink-0">•</span>
                <span>{z}</span>
              </li>
            ))}
          </ul>

          {/* Anleitung */}
          <h3 className="font-semibold text-gray-900 mb-2">Anleitung</h3>
          <ol className="space-y-3 pb-2">
            {recipe.schritte.map((s, i) => (
              <li key={i} className="flex gap-3 text-sm text-gray-700">
                <span className="bg-amber-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{s}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}

// ── Rezepte tab ───────────────────────────────────────────────────────────────

function RezepteTab() {
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 md:p-6 bg-white border-b border-gray-200 shrink-0">
        <h2 className="font-semibold text-gray-900">Brot-Rezepte</h2>
        <p className="text-xs text-gray-500 mt-0.5">{REZEPTE.length} Rezepte mit Sauerteig</p>
      </div>
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {REZEPTE.map((r) => (
            <RecipeCard key={r.id} recipe={r} onClick={() => setSelectedRecipe(r)} />
          ))}
        </div>
      </div>
      {selectedRecipe && (
        <RecipeModal recipe={selectedRecipe} onClose={() => setSelectedRecipe(null)} />
      )}
    </div>
  )
}

// ── Sauerteig batch helpers ───────────────────────────────────────────────────

function formatDueDate(date: Date | string) {
  const d = new Date(date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const day = new Date(d)
  day.setHours(0, 0, 0, 0)

  let dayLabel: string
  if (day.getTime() === today.getTime()) dayLabel = "Heute"
  else if (day.getTime() === tomorrow.getTime()) dayLabel = "Morgen"
  else dayLabel = d.toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "short" })

  const time = d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
  return `${dayLabel}, ${time} Uhr`
}

function isOverdue(todo: SauerteigTodo) {
  return !todo.doneAt && new Date(todo.dueDate) < new Date()
}

function groupByDay(todos: SauerteigTodo[]) {
  const map = new Map<string, SauerteigTodo[]>()
  for (const t of todos) {
    const d = new Date(t.dueDate)
    d.setHours(0, 0, 0, 0)
    const key = d.toISOString()
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(t)
  }
  return Array.from(map.entries()).map(([key, items]) => ({ date: new Date(key), items }))
}

function dayLabel(date: Date) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
  if (date.getTime() === today.getTime()) return "Heute"
  if (date.getTime() === tomorrow.getTime()) return "Morgen"
  return date.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })
}

// ── Sauerteig batch card ──────────────────────────────────────────────────────

function BatchCard({
  batch,
  onToggleTodo,
  onArchive,
}: {
  batch: BatchWithTodos
  onToggleTodo: (batchId: string, todoId: string, done: boolean) => void
  onArchive: (batchId: string) => void
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const days = groupByDay(batch.todos)
  const doneCount = batch.todos.filter((t) => t.doneAt).length
  const totalCount = batch.todos.length
  const progress = Math.round((doneCount / totalCount) * 100)
  const startLabel = new Date(batch.startedAt).toLocaleDateString("de-DE", {
    day: "numeric", month: "long", year: "numeric",
  })

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">{TYPE_EMOJI[batch.type]}</span>
            <span className="font-semibold text-gray-900">{batch.type}sauerteig</span>
            <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">
              {doneCount}/{totalCount} erledigt
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            Gestartet: {startLabel} · Ideal: {TYPE_TEMP[batch.type]}
          </div>
        </div>
        <button
          onClick={() => onArchive(batch.id)}
          className="text-xs text-gray-400 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
        >
          Archivieren
        </button>
      </div>

      <div className="h-1.5 bg-gray-100">
        <div className="h-full bg-amber-400 transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex gap-4 text-xs text-gray-500">
        <span>Mehl: <strong className="text-gray-700">{TYPE_MEHL[batch.type]}</strong></span>
        <span>Menge: <strong className="text-gray-700">je 50g Mehl + 50ml Wasser</strong></span>
      </div>

      <div className="divide-y divide-gray-100">
        {days.map(({ date, items }) => {
          const allDone = items.every((t) => t.doneAt)
          const hasOverdue = items.some((t) => isOverdue(t))
          return (
            <div key={date.toISOString()} className={allDone ? "opacity-60" : ""}>
              <div className={`px-4 py-2 flex items-center gap-2 text-xs font-semibold
                ${hasOverdue ? "text-red-600 bg-red-50" : allDone ? "text-gray-400 bg-gray-50" : "text-gray-500 bg-gray-50"}`}>
                <span>{hasOverdue && !allDone ? "⚠ " : ""}{dayLabel(date)}</span>
                {allDone && <span className="text-green-500">✓</span>}
              </div>
              {items.map((todo) => {
                const done = !!todo.doneAt
                const overdue = isOverdue(todo)
                const isOpen = expanded[todo.id]
                return (
                  <div key={todo.id} className={`px-4 py-3 ${done ? "bg-white" : overdue ? "bg-red-50/40" : "bg-white"}`}>
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => onToggleTodo(batch.id, todo.id, !done)}
                        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors
                          ${done ? "bg-green-500 border-green-500 text-white" : overdue ? "border-red-400 hover:border-red-500" : "border-gray-300 hover:border-amber-500"}`}
                      >
                        {done && <span className="text-xs leading-none">✓</span>}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className={`text-sm font-medium leading-snug
                            ${done ? "line-through text-gray-400" : overdue ? "text-red-700" : "text-gray-900"}`}>
                            {todo.title}
                          </span>
                          <span className={`text-xs shrink-0 ${done ? "text-gray-400" : overdue ? "text-red-500" : "text-gray-400"}`}>
                            {overdue && !done ? "⚠ " : ""}{formatDueDate(todo.dueDate)}
                          </span>
                        </div>
                        <button
                          onClick={() => setExpanded((p) => ({ ...p, [todo.id]: !p[todo.id] }))}
                          className="text-xs text-amber-600 hover:text-amber-700 mt-1"
                        >
                          {isOpen ? "▲ weniger" : "▼ Details"}
                        </button>
                        {isOpen && (
                          <p className="mt-2 text-xs text-gray-600 leading-relaxed bg-amber-50 rounded-xl px-3 py-2">
                            {todo.detail}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Start modal ───────────────────────────────────────────────────────────────

function StartModal({ onClose, onStart }: { onClose: () => void; onStart: (type: string, date: string) => void }) {
  const [selectedType, setSelectedType] = useState<string>("Roggen")
  const today = new Date().toISOString().split("T")[0]
  const [startDate, setStartDate] = useState(today)
  const [saving, setSaving] = useState(false)

  const types = [
    { key: "Roggen", emoji: "🌾", desc: "Kräftig, robust, schnell aktiv — ideal für Anfänger", temp: "26–28°C" },
    { key: "Weizen", emoji: "🌿", desc: "Mild und vielseitig — für helles Brot", temp: "24–26°C" },
    { key: "Dinkel", emoji: "✨", desc: "Aromatisch, schnell — etwas kühler halten", temp: "22–24°C" },
  ]

  async function handleStart() {
    setSaving(true)
    await onStart(selectedType, startDate)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 text-lg">🍞 Sauerteig starten</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Mehlsorte wählen</p>
            <div className="space-y-2">
              {types.map((t) => (
                <button key={t.key} onClick={() => setSelectedType(t.key)}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-colors
                    ${selectedType === t.key ? "border-amber-500 bg-amber-50" : "border-gray-200 hover:border-amber-300"}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{t.emoji}</span>
                    <div>
                      <div className="font-medium text-gray-900 text-sm">{t.key}</div>
                      <div className="text-xs text-gray-500">{t.desc} · {t.temp}</div>
                    </div>
                    {selectedType === t.key && <span className="ml-auto text-amber-500">✓</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Startdatum</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            <p className="text-xs text-gray-400 mt-1">Alle Todos werden ab 08:00 Uhr dieses Tages berechnet.</p>
          </div>
        </div>
        <div className="px-5 pb-5 flex gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600">Abbrechen</button>
          <button onClick={handleStart} disabled={saving}
            className="flex-1 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium disabled:opacity-50">
            {saving ? "Erstelle…" : `${TYPE_EMOJI[selectedType]} Starten`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Sauerteig tab ─────────────────────────────────────────────────────────────

function SauerteigTab({ initialBatches }: { initialBatches: BatchWithTodos[] }) {
  const [batches, setBatches] = useState<BatchWithTodos[]>(initialBatches)
  const [showModal, setShowModal] = useState(false)

  async function reload() {
    const res = await fetch("/api/brot/sauerteig")
    if (res.ok) setBatches(await res.json())
  }

  async function handleStart(type: string, startDate: string) {
    const res = await fetch("/api/brot/sauerteig", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, startedAt: new Date(startDate + "T08:00:00").toISOString() }),
    })
    if (res.ok) { await reload(); setShowModal(false) }
  }

  async function handleToggleTodo(batchId: string, todoId: string, done: boolean) {
    setBatches((prev) =>
      prev.map((b) => b.id !== batchId ? b : {
        ...b,
        todos: b.todos.map((t) => t.id !== todoId ? t : { ...t, doneAt: done ? new Date() : null }),
      })
    )
    await fetch(`/api/brot/sauerteig/${batchId}/todos/${todoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done }),
    })
    reload()
  }

  async function handleArchive(batchId: string) {
    await fetch(`/api/brot/sauerteig/${batchId}`, { method: "DELETE" })
    setBatches((prev) => prev.filter((b) => b.id !== batchId))
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 md:p-6 bg-white border-b border-gray-200 flex items-center justify-between shrink-0">
        <div>
          <h2 className="font-semibold text-gray-900">Sauerteig</h2>
          {batches.length > 0 && <p className="text-xs text-gray-500 mt-0.5">{batches.length} aktiver Ansatz</p>}
        </div>
        <button onClick={() => setShowModal(true)}
          className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
          + Sauerteig starten
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {batches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="text-5xl mb-4">🍞</span>
            <p className="text-gray-500 text-sm">Noch kein Sauerteig aktiv.</p>
            <p className="text-gray-400 text-xs mt-1">Starte deinen ersten Ansatz!</p>
            <button onClick={() => setShowModal(true)}
              className="mt-4 bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium">
              Sauerteig starten 🌾
            </button>
          </div>
        ) : (
          batches.map((batch) => (
            <BatchCard key={batch.id} batch={batch} onToggleTodo={handleToggleTodo} onArchive={handleArchive} />
          ))
        )}
      </div>
      {showModal && <StartModal onClose={() => setShowModal(false)} onStart={handleStart} />}
    </div>
  )
}

// ── Main BrotTab with sub-tabs ────────────────────────────────────────────────

export default function BrotTab({ initialBatches }: { initialBatches: BatchWithTodos[] }) {
  const [subTab, setSubTab] = useState<SubTab>("sauerteig")

  return (
    <div className="flex flex-col h-full">
      {/* Sub-tab bar */}
      <div className="flex gap-1 px-4 pt-3 bg-white border-b border-gray-200 shrink-0">
        <button
          onClick={() => setSubTab("sauerteig")}
          className={`px-4 py-2 text-sm font-medium rounded-t-xl border-b-2 transition-colors
            ${subTab === "sauerteig" ? "border-amber-500 text-amber-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
        >
          🌾 Sauerteig
        </button>
        <button
          onClick={() => setSubTab("rezepte")}
          className={`px-4 py-2 text-sm font-medium rounded-t-xl border-b-2 transition-colors
            ${subTab === "rezepte" ? "border-amber-500 text-amber-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
        >
          📖 Rezepte
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {subTab === "sauerteig" ? (
          <SauerteigTab initialBatches={initialBatches} />
        ) : (
          <RezepteTab />
        )}
      </div>
    </div>
  )
}
