export type SauerteigType = "Roggen" | "Weizen" | "Dinkel"

interface TodoTemplate {
  dayOffset: number
  hour: number
  title: string
  detail: string
}

export interface GeneratedTodo {
  title: string
  detail: string
  dueDate: Date
  sortOrder: number
}

const ROGGEN: TodoTemplate[] = [
  {
    dayOffset: 0, hour: 8,
    title: "Ansatz erstellen",
    detail: "50g Roggenvollkornmehl + 50ml lauwarmes Wasser (ca. 35°C) in sauberem Glas verrühren. Locker abdecken (Tuch oder Deckel aufgelegt). Füllstand markieren. Temperatur: 26–28°C — z.B. hinter dem Kühlschrank oder Backofen mit Licht an.",
  },
  {
    dayOffset: 1, hour: 8,
    title: "Fütterung 1",
    detail: "50g Roggenmehl Type 1150 + 50ml Wasser (Raumtemperatur) zum Ansatz geben und glattrühren. Wieder locker abdecken. Erste Bläschen möglich. Essigsäure- oder käsiger Geruch ist völlig normal.",
  },
  {
    dayOffset: 2, hour: 8,
    title: "Fütterung 2 — Abschütten beginnen",
    detail: "50g vom Ansatz abwiegen, den Rest entsorgen. Die 50g mit 50g Roggenmehl 1150 + 50ml Wasser verrühren. Locker abdecken, Füllstand markieren. Strenger Geruch ist normal — Milchsäurebakterien sind aktiv.",
  },
  {
    dayOffset: 3, hour: 8,
    title: "Fütterung 3",
    detail: "50g behalten, Rest entsorgen. + 50g Roggenmehl 1150 + 50ml Wasser verrühren. Bläschenbildung sollte zunehmen. Der Geruch wird langsam angenehmer.",
  },
  {
    dayOffset: 4, hour: 8,
    title: "Fütterung 4",
    detail: "50g behalten, Rest entsorgen. + 50g Roggenmehl 1150 + 50ml Wasser verrühren. Füllstand markieren. In 6–8 Stunden prüfen, ob sich das Volumen verdoppelt hat.",
  },
  {
    dayOffset: 4, hour: 16,
    title: "Zwischenkontrolle (6–8h nach Fütterung)",
    detail: "Hat sich das Volumen verdoppelt? Sind Blasen sichtbar? Riecht es angenehm säuerlich? Falls ja: die Hefen werden aktiv! Falls nein: kein Problem — morgen weiter.",
  },
  {
    dayOffset: 5, hour: 8,
    title: "Fütterung 5",
    detail: "50g behalten, Rest entsorgen. + 50g Roggenmehl 1150 + 50ml Wasser verrühren. Füllstand markieren.",
  },
  {
    dayOffset: 5, hour: 16,
    title: "Bereitschaftstest",
    detail: "Schwimmtest: Teelöffel Starter in ein Glas Wasser — schwimmt er? Verdoppelt er sich zuverlässig in 6–8h? Riecht er angenehm säuerlich-hefig? Falls 2 Tage in Folge aktiv → backbereit! 🎉",
  },
  {
    dayOffset: 6, hour: 8,
    title: "Tag 7 — Fütterung / Finale",
    detail: "Falls noch nicht backbereit: nochmals füttern und weiter beobachten. Falls bereit: Herzlichen Glückwunsch! 🎉 Roggensauerteig im Kühlschrank lagern, alle 5–7 Tage füttern.",
  },
]

const WEIZEN: TodoTemplate[] = [
  {
    dayOffset: 0, hour: 8,
    title: "Ansatz erstellen",
    detail: "50g Weizenvollkornmehl + 50ml lauwarmes Wasser (ca. 30°C) in sauberem Glas verrühren. Locker abdecken, Füllstand markieren. Temperatur: 24–26°C (stabiler Ort, nicht zu warm).",
  },
  {
    dayOffset: 1, hour: 8,
    title: "Fütterung 1",
    detail: "50g Weizenmehl Type 550 + 50ml Wasser zum Ansatz geben und verrühren. Erste Bläschen können erscheinen. Milchiger oder leicht süßlicher Geruch ist normal.",
  },
  {
    dayOffset: 2, hour: 8,
    title: "Fütterung 2 — Abschütten beginnen",
    detail: "50g behalten, Rest entsorgen. + 50g Weizenmehl 550 + 50ml Wasser verrühren. Locker abdecken, Füllstand markieren. Käsiger oder säuerlicher Geruch ist normal.",
  },
  {
    dayOffset: 3, hour: 8,
    title: "Fütterung 3",
    detail: "50g behalten, Rest entsorgen. + 50g Weizenmehl 550 + 50ml Wasser. Blasen und leichte Volumenzunahme sollten sichtbar sein.",
  },
  {
    dayOffset: 4, hour: 8,
    title: "Fütterung 4",
    detail: "50g behalten, Rest entsorgen. + 50g Weizenmehl 550 + 50ml Wasser. Füllstand markieren. In 4–6 Stunden prüfen ob Verdopplung.",
  },
  {
    dayOffset: 4, hour: 13,
    title: "Zwischenkontrolle (4–6h nach Fütterung)",
    detail: "Volumen verdoppelt? Blasen sichtbar (auch innen im Glas)? Geruch angenehm-säuerlich bis leicht fruchtig? Falls ja: sehr gut!",
  },
  {
    dayOffset: 5, hour: 8,
    title: "Fütterung 5",
    detail: "50g behalten, Rest entsorgen. + 50g Weizenmehl 550 + 50ml Wasser verrühren. Füllstand markieren.",
  },
  {
    dayOffset: 5, hour: 13,
    title: "Bereitschaftstest",
    detail: "Schwimmtest: Teelöffel Starter ins Wasser — schwimmt er? Verdoppelt er sich in 4–6h? Riecht er angenehm säuerlich? Falls 2 Tage in Folge aktiv → backbereit! 🎉",
  },
  {
    dayOffset: 6, hour: 8,
    title: "Fütterung 6",
    detail: "50g behalten, Rest entsorgen. + 50g Weizenmehl 550 + 50ml Wasser. Weizenstarter brauchen manchmal 7–8 Tage — Geduld!",
  },
  {
    dayOffset: 7, hour: 8,
    title: "Tag 8 — Fütterung / Finale",
    detail: "Falls noch nicht backbereit: weiter füttern. Falls bereit: Herzlichen Glückwunsch! 🎉 Weizensauerteig im Kühlschrank lagern, alle 5–7 Tage füttern.",
  },
]

const DINKEL: TodoTemplate[] = [
  {
    dayOffset: 0, hour: 8,
    title: "Ansatz erstellen",
    detail: "50g Dinkelvollkornmehl + 50ml lauwarmes Wasser (ca. 30°C) in sauberem Glas verrühren. Locker abdecken, Füllstand markieren. Temperatur: 22–24°C — Dinkel gärt schnell, also kühler als Roggen halten!",
  },
  {
    dayOffset: 1, hour: 8,
    title: "Fütterung 1",
    detail: "50g Dinkelmehl Type 1050 + 50ml Wasser zum Ansatz geben und verrühren. Dinkel kann schon früh sehr aktiv werden — gut beobachten.",
  },
  {
    dayOffset: 2, hour: 8,
    title: "Fütterung 2 — Abschütten beginnen",
    detail: "50g behalten, Rest entsorgen. + 50g Dinkelmehl 1050 + 50ml Wasser verrühren. Abdecken, Füllstand markieren. Temperatur unbedingt bei 22–24°C halten — über 24°C wird Dinkel zu schnell sauer.",
  },
  {
    dayOffset: 3, hour: 8,
    title: "Fütterung 3",
    detail: "50g behalten, Rest entsorgen. + 50g Dinkelmehl 1050 + 50ml Wasser. Bläschen und Volumenzunahme sollten deutlich sichtbar sein.",
  },
  {
    dayOffset: 4, hour: 8,
    title: "Fütterung 4",
    detail: "50g behalten, Rest entsorgen. + 50g Dinkelmehl 1050 + 50ml Wasser. Füllstand markieren. In 4–6h prüfen. Tipp: Falls der Ansatz vor der Fütterung schon eingefallen ist, lieber 2× täglich füttern.",
  },
  {
    dayOffset: 4, hour: 13,
    title: "Zwischenkontrolle",
    detail: "Volumen verdoppelt? Blasen? Angenehm-säuerlicher Geruch? Falls der Starter zu schnell steigt und fällt (unter 4h), kühler stellen oder öfter füttern.",
  },
  {
    dayOffset: 5, hour: 8,
    title: "Fütterung 5",
    detail: "50g behalten, Rest entsorgen. + 50g Dinkelmehl 1050 + 50ml Wasser verrühren. Füllstand markieren.",
  },
  {
    dayOffset: 5, hour: 13,
    title: "Bereitschaftstest",
    detail: "Schwimmtest: Teelöffel Starter ins Wasser — schwimmt er? Verdoppelt er sich in 4–6h? Riecht er angenehm? Falls 2 Tage in Folge aktiv → backbereit! 🎉",
  },
  {
    dayOffset: 6, hour: 8,
    title: "Tag 7 — Fütterung / Finale",
    detail: "Falls noch nicht backbereit: nochmals füttern und beobachten. Falls bereit: Herzlichen Glückwunsch! 🎉 Dinkelsauerteig im Kühlschrank lagern, alle 4–5 Tage füttern (Dinkel gärt im Kühlschrank etwas schneller als Roggen).",
  },
]

export function generateSauerteigTodos(type: SauerteigType, startDate: Date): GeneratedTodo[] {
  const templates = type === "Roggen" ? ROGGEN : type === "Weizen" ? WEIZEN : DINKEL
  return templates.map((t, i) => {
    const dueDate = new Date(startDate)
    dueDate.setDate(dueDate.getDate() + t.dayOffset)
    dueDate.setHours(t.hour, 0, 0, 0)
    return { title: t.title, detail: t.detail, dueDate, sortOrder: i }
  })
}
