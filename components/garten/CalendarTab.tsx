"use client"

import { useCallback, useEffect, useState } from "react"
import { generateTimeline, eisheiligeDate, formatDE, type SeasonForTimeline, type TimelineEvent } from "@/lib/gartenTimeline"

interface GardenDiary {
  id: string
  note: string
  success: boolean | null
  createdAt: string
}

interface Season extends SeasonForTimeline {
  bed: { id: string; name: string } | null
  diary: GardenDiary[]
}

const MONTH_NAMES = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"]
const CURRENT_YEAR = new Date().getFullYear()

const EVENT_COLORS: Record<string, string> = {
  SOWING_INDOOR: "bg-yellow-100 text-yellow-800 border-yellow-200",
  PIKE: "bg-orange-100 text-orange-800 border-orange-200",
  TRANSPLANT: "bg-green-100 text-green-800 border-green-200",
  SOWING_DIRECT: "bg-lime-100 text-lime-800 border-lime-200",
  HARVEST_START: "bg-emerald-100 text-emerald-800 border-emerald-200",
}

export default function CalendarTab() {
  const [seasons, setSeasons] = useState<Season[]>([])
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)
  const [diarySeasonId, setDiarySeasonId] = useState<string | null>(null)
  const [diaryNote, setDiaryNote] = useState("")
  const [diarySuccess, setDiarySuccess] = useState<boolean | null>(null)
  const [expandedSeason, setExpandedSeason] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch(`/api/garden/seasons?year=${CURRENT_YEAR}`)
    if (res.ok) setSeasons(await res.json())
  }, [])

  useEffect(() => { load() }, [load])

  async function removeSeason(id: string) {
    if (!confirm("Saison entfernen? Todos und Tagebucheinträge werden gelöscht.")) return
    await fetch(`/api/garden/seasons/${id}`, { method: "DELETE" })
    setSeasons(s => s.filter(x => x.id !== id))
  }

  async function addDiary(seasonId: string) {
    if (!diaryNote.trim()) return
    const res = await fetch("/api/garden/diary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seasonId, note: diaryNote, success: diarySuccess }),
    })
    if (res.ok) {
      const entry = await res.json()
      setSeasons(s => s.map(x => x.id === seasonId ? { ...x, diary: [entry, ...x.diary] } : x))
      setDiaryNote(""); setDiarySuccess(null); setDiarySeasonId(null)
    }
  }

  async function removeDiary(diaryId: string, seasonId: string) {
    await fetch(`/api/garden/diary/${diaryId}`, { method: "DELETE" })
    setSeasons(s => s.map(x => x.id === seasonId ? { ...x, diary: x.diary.filter(d => d.id !== diaryId) } : x))
  }

  // Build all timeline events
  const allEvents: (TimelineEvent & { isEisheilige?: boolean })[] = []

  // Add Eisheilige marker
  const eish = eisheiligeDate(CURRENT_YEAR)
  allEvents.push({
    type: "TRANSPLANT",
    label: "Eisheilige — Auspflanztermin",
    emoji: "❄️",
    date: eish,
    plantName: "Eisheilige",
    seasonId: "__eisheiliige__",
    isEisheilige: true,
  })

  for (const season of seasons) {
    allEvents.push(...generateTimeline(season))
  }

  allEvents.sort((a, b) => a.date.getTime() - b.date.getTime())

  // Group by month
  const byMonth: Record<number, typeof allEvents> = {}
  for (const ev of allEvents) {
    const m = ev.date.getMonth()
    if (!byMonth[m]) byMonth[m] = []
    byMonth[m].push(ev)
  }

  const activeMonths = Object.keys(byMonth).map(Number).sort((a, b) => a - b)
  const displayMonths = selectedMonth !== null ? [selectedMonth] : activeMonths

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">Saison {CURRENT_YEAR} · {seasons.length} Pflanze{seasons.length !== 1 && "n"}</p>
        <button onClick={() => setSelectedMonth(null)}
          className={`text-xs px-3 py-1 rounded-full transition-colors ${selectedMonth === null ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
          Alle
        </button>
      </div>

      {/* Month chips */}
      <div className="flex gap-1.5 flex-wrap mb-5">
        {activeMonths.map(m => (
          <button key={m} onClick={() => setSelectedMonth(selectedMonth === m ? null : m)}
            className={`text-xs px-2.5 py-1 rounded-full transition-colors ${selectedMonth === m ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {MONTH_NAMES[m]}
          </button>
        ))}
      </div>

      {seasons.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-5xl mb-3">📅</div>
          <p className="text-sm">Keine Pflanzen in der aktuellen Saison</p>
          <p className="text-xs mt-1">Pflanzen → Pflanze auswählen → "Zur Saison hinzufügen"</p>
        </div>
      ) : (
        <div className="space-y-6">
          {displayMonths.map(month => (
            <div key={month}>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                {MONTH_NAMES[month]}
                {month === 4 && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Eisheilige 15.05.</span>}
              </h3>
              <ul className="space-y-2">
                {(byMonth[month] ?? []).map((ev, i) => (
                  <li key={`${ev.seasonId}-${ev.type}-${i}`}
                    className={`flex items-center gap-3 border rounded-xl px-3 py-2.5 text-sm ${ev.isEisheilige ? "border-blue-300 bg-blue-50" : EVENT_COLORS[ev.type] ?? "bg-gray-50 border-gray-200"}`}>
                    <span className="text-base shrink-0">{ev.emoji}</span>
                    <div className="flex-1 min-w-0">
                      {!ev.isEisheilige && <div className="font-medium truncate">{ev.plantName}{ev.variety && <span className="font-normal text-gray-500"> · {ev.variety}</span>}</div>}
                      <div className={ev.isEisheilige ? "font-medium" : "text-xs opacity-80"}>{ev.label}</div>
                    </div>
                    <div className="text-xs opacity-70 shrink-0">{formatDE(ev.date)}</div>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Seasons list with diary */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Meine Pflanzen {CURRENT_YEAR}</h3>
            <ul className="space-y-2">
              {seasons.map(s => (
                <li key={s.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 text-sm">
                        {s.plant.name}{s.plant.variety && <span className="text-gray-400 font-normal ml-1">· {s.plant.variety}</span>}
                      </div>
                      {s.bed && <div className="text-xs text-gray-500 mt-0.5">📍 {s.bed.name}</div>}
                    </div>
                    <button onClick={() => setExpandedSeason(expandedSeason === s.id ? null : s.id)}
                      className="text-xs text-gray-400 hover:text-gray-700 px-2">
                      {s.diary.length > 0 ? `📓 ${s.diary.length}` : "📓"}
                    </button>
                    <button onClick={() => removeSeason(s.id)} className="text-gray-400 hover:text-red-500 text-xs">🗑️</button>
                  </div>

                  {expandedSeason === s.id && (
                    <div className="border-t border-gray-100 p-4 bg-gray-50">
                      <h4 className="text-xs font-semibold text-gray-500 mb-2">Tagebuch</h4>
                      {s.diary.length > 0 && (
                        <ul className="space-y-2 mb-3">
                          {s.diary.map(d => (
                            <li key={d.id} className="flex items-start gap-2 text-sm">
                              <span>{d.success === true ? "✅" : d.success === false ? "❌" : "📝"}</span>
                              <span className="flex-1 text-gray-700">{d.note}</span>
                              <button onClick={() => removeDiary(d.id, s.id)} className="text-gray-400 hover:text-red-500 text-xs shrink-0">🗑️</button>
                            </li>
                          ))}
                        </ul>
                      )}
                      {diarySeasonId === s.id ? (
                        <div className="space-y-2">
                          <textarea value={diaryNote} onChange={e => setDiaryNote(e.target.value)}
                            placeholder="Was hast du beobachtet?" rows={2}
                            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none" />
                          <div className="flex gap-2 items-center">
                            <span className="text-xs text-gray-500">Bewertung:</span>
                            {([null, true, false] as (boolean | null)[]).map(v => (
                              <button key={String(v)} onClick={() => setDiarySuccess(v)}
                                className={`text-xs px-2.5 py-1 rounded-full transition-colors ${diarySuccess === v ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-600"}`}>
                                {v === null ? "Neutral" : v ? "✅ Gut" : "❌ Nicht gut"}
                              </button>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => addDiary(s.id)} disabled={!diaryNote.trim()}
                              className="flex-1 bg-primary-600 text-white py-1.5 rounded-xl text-xs font-medium disabled:opacity-40">
                              Speichern
                            </button>
                            <button onClick={() => { setDiarySeasonId(null); setDiaryNote(""); setDiarySuccess(null) }}
                              className="px-3 py-1.5 rounded-xl text-xs text-gray-500 hover:bg-gray-200">
                              Abbrechen
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => setDiarySeasonId(s.id)}
                          className="w-full border border-dashed border-gray-300 hover:border-primary-400 rounded-xl py-2 text-xs text-gray-500 hover:text-primary-600 transition-colors">
                          + Tagebucheintrag
                        </button>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
