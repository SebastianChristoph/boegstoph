"use client"

import { useState, useEffect } from "react"

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = [CURRENT_YEAR]

const METHOD_LABEL: Record<string, string> = { INDOOR: "Vorzucht", DIRECT: "Direktaussaat", BUY: "Jungpflanze" }
const TODO_TYPE_LABEL: Record<string, string> = {
  SOWING_INDOOR: "Aussaat (drinnen)", SOWING_DIRECT: "Direktaussaat",
  TRANSPLANT: "Auspflanzen", PLANTING: "Einpflanzen",
}

function fmtDate(ts: string | null | undefined) {
  if (!ts) return "–"
  return new Date(ts).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function fmtDateShort(ts: string | null | undefined) {
  if (!ts) return "–"
  return new Date(ts).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })
}

interface Todo { id: string; title: string; dueDate: string | null; completedAt: string | null; done: boolean; type: string | null }
interface DiaryEntry { id: string; note: string; success: boolean | null; createdAt: string }
interface Season {
  id: string; plantName: string; variety: string | null; method: string | null; bedName: string | null
  todos: Todo[]; diary: DiaryEntry[]
}
interface HarvestEntry { id: string; plantName: string; quantity: number; unit: string; harvestDate: string; notes: string | null }
interface HarvestSummary { plantName: string; totals: { unit: string; total: number }[] }
interface Note { id: string; title: string; body: string; createdAt: string }
interface BedAssignment { id: string; name: string; plants: string[] }
interface WeatherStats {
  readingCount: number; avgTemp: number; avgHum: number
  maxTemp: number; maxTempDate: string; minTemp: number; minTempDate: string
  frostDays: number; gdd: number
}
interface ReportData {
  year: number
  seasons: Season[]
  harvest: HarvestEntry[]
  harvestSummary: HarvestSummary[]
  notes: Note[]
  bedAssignments: BedAssignment[]
  todoStats: { total: number; completed: number; overdue: number }
  weather: { gh: WeatherStats | null; out: WeatherStats | null }
}

function Section({ emoji, title, children }: { emoji: string; title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="font-semibold text-gray-800">{emoji} {title}</span>
        <span className="text-gray-400 text-sm">{open ? "▲" : "▼"}</span>
      </button>
      {open && <div className="px-5 pb-5 space-y-3">{children}</div>}
    </div>
  )
}

export default function ReportTab() {
  const [year, setYear] = useState(CURRENT_YEAR)
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setData(null)
    fetch(`/api/garden/report?year=${year}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false) })
  }, [year])

  return (
    <div className="space-y-4">
      {/* Year picker */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500 font-medium">Saison</span>
        <div className="flex gap-2">
          {YEARS.map(y => (
            <button key={y} onClick={() => setYear(y)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                year === y ? "bg-primary-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}>
              {y}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">📊</div>
          <p className="text-sm">Lade Report…</p>
        </div>
      )}

      {!loading && data && data.seasons.length === 0 && data.harvest.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">🌱</div>
          <p className="text-sm">Keine Saison-Daten für {year} gefunden.</p>
        </div>
      )}

      {!loading && data && (data.seasons.length > 0 || data.harvest.length > 0) && (
        <>
          {/* Summary bar */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white border border-gray-200 rounded-2xl p-3 text-center shadow-sm">
              <div className="text-2xl font-bold text-primary-600">{data.seasons.length}</div>
              <div className="text-xs text-gray-400 mt-0.5">Pflanzen</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-3 text-center shadow-sm">
              <div className="text-2xl font-bold text-green-600">{data.todoStats.completed}<span className="text-base text-gray-400">/{data.todoStats.total}</span></div>
              <div className="text-xs text-gray-400 mt-0.5">Todos erledigt</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-3 text-center shadow-sm">
              <div className="text-2xl font-bold text-orange-500">{data.harvest.length}</div>
              <div className="text-xs text-gray-400 mt-0.5">Ernte-Einträge</div>
            </div>
          </div>

          {/* Plants + Todos */}
          <Section emoji="🌱" title={`Pflanzen & Todos (${data.seasons.length})`}>
            {data.seasons.map(s => (
              <div key={s.id} className="border border-gray-100 rounded-xl p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="font-medium text-gray-800 text-sm">{s.plantName}</span>
                    {s.variety && <span className="text-xs text-gray-400 ml-1">· {s.variety}</span>}
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    {s.method && <span className="text-[10px] bg-primary-50 text-primary-700 rounded-lg px-2 py-0.5">{METHOD_LABEL[s.method] ?? s.method}</span>}
                    {s.bedName && <span className="text-[10px] bg-gray-100 text-gray-600 rounded-lg px-2 py-0.5">{s.bedName}</span>}
                  </div>
                </div>
                {s.todos.length > 0 && (
                  <div className="space-y-1 mt-2">
                    {s.todos.map(t => (
                      <div key={t.id} className="flex items-center gap-2 text-xs">
                        <span className={t.done ? "text-green-500" : "text-gray-300"}>{t.done ? "✓" : "○"}</span>
                        <span className={`flex-1 ${t.done ? "text-gray-600" : "text-gray-400"}`}>
                          {t.type ? (TODO_TYPE_LABEL[t.type] ?? t.title) : t.title}
                        </span>
                        {t.dueDate && <span className="text-gray-400">geplant {fmtDateShort(t.dueDate)}</span>}
                        {t.completedAt && <span className="text-green-500">✓ {fmtDateShort(t.completedAt)}</span>}
                      </div>
                    ))}
                  </div>
                )}
                {s.diary.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {s.diary.map(d => (
                      <div key={d.id} className="text-xs text-gray-500 italic">
                        {d.success === true ? "✅" : d.success === false ? "❌" : "📔"} {d.note}
                        <span className="text-gray-400 ml-1">· {fmtDateShort(d.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </Section>

          {/* Harvest */}
          {data.harvest.length > 0 && (
            <Section emoji="🧺" title="Ernte">
              {/* Summary */}
              <div className="flex flex-wrap gap-2 mb-2">
                {data.harvestSummary.map(s => (
                  <div key={s.plantName} className="bg-orange-50 rounded-xl px-3 py-1.5 text-xs">
                    <span className="font-medium text-orange-700">{s.plantName}</span>
                    <span className="text-orange-500 ml-1">
                      {s.totals.map(t => `${t.total % 1 === 0 ? t.total : t.total.toFixed(1)} ${t.unit}`).join(", ")}
                    </span>
                  </div>
                ))}
              </div>
              {/* Entries */}
              <div className="space-y-1">
                {data.harvest.map(h => (
                  <div key={h.id} className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="text-gray-400 w-14 shrink-0">{fmtDateShort(h.harvestDate)}</span>
                    <span className="font-medium">{h.plantName}</span>
                    <span className="text-gray-500">{h.quantity % 1 === 0 ? h.quantity : h.quantity.toFixed(1)} {h.unit}</span>
                    {h.notes && <span className="text-gray-400">· {h.notes}</span>}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Beete */}
          {data.bedAssignments.length > 0 && (
            <Section emoji="🪴" title="Beete">
              <div className="space-y-2">
                {data.bedAssignments.map(b => (
                  <div key={b.id} className="flex items-start gap-3 text-sm">
                    <span className="font-medium text-gray-700 w-24 shrink-0">{b.name}</span>
                    <span className="text-gray-500">{b.plants.join(", ")}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Notes */}
          {data.notes.length > 0 && (
            <Section emoji="📝" title="Notizen">
              <div className="space-y-3">
                {data.notes.map(n => (
                  <div key={n.id}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-gray-800">{n.title}</span>
                      <span className="text-xs text-gray-400">{fmtDate(n.createdAt)}</span>
                    </div>
                    {n.body && <p className="text-sm text-gray-600 mt-0.5 whitespace-pre-wrap">{n.body}</p>}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Weather */}
          {(data.weather.gh || data.weather.out) && (
            <Section emoji="🌡️" title="Wetter (Apr–Okt)">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[
                  { label: "🏠 Gewächshaus", w: data.weather.gh },
                  { label: "🌤️ Outdoor", w: data.weather.out },
                ].filter(x => x.w).map(({ label, w }) => w && (
                  <div key={label} className="space-y-1.5">
                    <div className="text-xs font-medium text-gray-500">{label} · {w.readingCount} Messungen</div>
                    <div className="grid grid-cols-2 gap-1.5 text-xs">
                      <div className="bg-orange-50 rounded-xl p-2">
                        <div className="text-orange-400 text-[10px]">Ø Temperatur</div>
                        <div className="font-bold text-orange-600">{w.avgTemp}°C</div>
                      </div>
                      <div className="bg-blue-50 rounded-xl p-2">
                        <div className="text-blue-400 text-[10px]">Ø Luftfeuchte</div>
                        <div className="font-bold text-blue-600">{w.avgHum}%</div>
                      </div>
                      <div className="bg-red-50 rounded-xl p-2">
                        <div className="text-red-400 text-[10px]">Wärmstes</div>
                        <div className="font-bold text-red-500">{w.maxTemp}°C</div>
                        <div className="text-[10px] text-gray-400">{fmtDateShort(w.maxTempDate)}</div>
                      </div>
                      <div className="bg-sky-50 rounded-xl p-2">
                        <div className="text-sky-400 text-[10px]">Kältestes</div>
                        <div className="font-bold text-sky-600">{w.minTemp}°C</div>
                        <div className="text-[10px] text-gray-400">{fmtDateShort(w.minTempDate)}</div>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-2">
                        <div className="text-gray-400 text-[10px]">Frosttage</div>
                        <div className="font-bold text-gray-700">{w.frostDays}</div>
                      </div>
                      <div className="bg-green-50 rounded-xl p-2">
                        <div className="text-green-400 text-[10px]">Wachstum GDD</div>
                        <div className="font-bold text-green-600">{w.gdd}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </>
      )}
    </div>
  )
}
