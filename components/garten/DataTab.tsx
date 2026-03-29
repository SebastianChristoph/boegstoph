"use client"

import { useCallback, useEffect, useRef, useState } from "react"

interface Reading {
  id: string
  timestamp: string
  temperature: number
  humidity: number
}

interface ThermometerStats {
  records: {
    maxTemp: { value: number; timestamp: string }
    minTemp: { value: number; timestamp: string }
    maxHumidity: { value: number; timestamp: string }
    minHumidity: { value: number; timestamp: string }
  }
  frostDays: number
  growingDegreeDays: number
  hourlyProfile: { hour: number; avgTemp: number | null; avgHumidity: number | null }[]
  weekComparison: {
    thisWeek: { avgTemp: number | null; avgHumidity: number | null; days: number }
    lastWeek: { avgTemp: number | null; avgHumidity: number | null; days: number } | null
  }
  dailyExtremes: { date: string; minTemp: number; maxTemp: number; avgTemp: number; avgHumidity: number }[]
  totalReadings: number
  daysTracked: number
}

type Range = "24h" | "7d" | "30d" | "alle"

const RANGES: { id: Range; label: string }[] = [
  { id: "24h", label: "24 Std." },
  { id: "7d", label: "7 Tage" },
  { id: "30d", label: "30 Tage" },
  { id: "alle", label: "Alle" },
]

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(ts: string) {
  return new Date(ts).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" })
}

function fmtDateTime(ts: string) {
  return new Date(ts).toLocaleString("de-DE", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "UTC",
  })
}

function fmtTime(ts: string) {
  return new Date(ts).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })
}

// ── SVG Line Chart ─────────────────────────────────────────────────────────────

interface ChartPoint { ts: number; val: number }

function LineChart({ data, color, unit, range }: { data: ChartPoint[]; color: string; unit: string; range: Range }) {
  if (data.length < 2) return null

  const W = 400, H = 90
  const PAD = { top: 10, right: 8, bottom: 22, left: 38 }
  const iW = W - PAD.left - PAD.right
  const iH = H - PAD.top - PAD.bottom

  const vals = data.map(d => d.val)
  const lo = Math.min(...vals), hi = Math.max(...vals)
  const valSpan = hi - lo || 1, pad = valSpan * 0.1
  const minTs = data[0].ts, maxTs = data[data.length - 1].ts
  const tsSpan = maxTs - minTs || 1

  const toX = (ts: number) => PAD.left + ((ts - minTs) / tsSpan) * iW
  const toY = (val: number) => PAD.top + iH - ((val - (lo - pad)) / (valSpan + 2 * pad)) * iH
  const pts = data.map(d => `${toX(d.ts).toFixed(1)},${toY(d.val).toFixed(1)}`).join(" ")
  const xLabels = [data[0], data[Math.floor(data.length / 2)], data[data.length - 1]]

  function fmtX(ts: number) {
    const d = new Date(ts)
    return range === "24h"
      ? d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })
      : d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", timeZone: "UTC" })
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + iH} stroke="#e5e7eb" strokeWidth={1} />
      <line x1={PAD.left} y1={PAD.top + iH} x2={PAD.left + iW} y2={PAD.top + iH} stroke="#e5e7eb" strokeWidth={1} />
      <line x1={PAD.left} y1={PAD.top + iH / 2} x2={PAD.left + iW} y2={PAD.top + iH / 2} stroke="#f3f4f6" strokeWidth={1} strokeDasharray="3,3" />
      <text x={PAD.left - 4} y={PAD.top + 4} fontSize={9} textAnchor="end" fill="#9ca3af">{hi.toFixed(1)}{unit}</text>
      <text x={PAD.left - 4} y={PAD.top + iH / 2 + 3} fontSize={9} textAnchor="end" fill="#9ca3af">{((hi + lo) / 2).toFixed(1)}{unit}</text>
      <text x={PAD.left - 4} y={PAD.top + iH + 1} fontSize={9} textAnchor="end" fill="#9ca3af">{lo.toFixed(1)}{unit}</text>
      {xLabels.map((d, i) => (
        <text key={i} x={toX(d.ts)} y={H - 4} fontSize={8}
          textAnchor={i === 0 ? "start" : i === 2 ? "end" : "middle"} fill="#9ca3af">
          {fmtX(d.ts)}
        </text>
      ))}
      <polyline fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" points={pts} />
    </svg>
  )
}

// ── 24h Hourly Bar Chart ───────────────────────────────────────────────────────

function HourlyChart({ profile, color, unit }: {
  profile: { hour: number; avgTemp: number | null; avgHumidity: number | null }[]
  color: string
  unit: string
}) {
  const vals = profile.map(p => unit === "°C" ? p.avgTemp : p.avgHumidity).filter((v): v is number => v !== null)
  if (vals.length < 2) return <p className="text-xs text-gray-400 text-center py-4">Noch zu wenig Daten für Tagesverlauf</p>

  const W = 400, H = 80
  const PAD = { top: 8, right: 4, bottom: 20, left: 34 }
  const iW = W - PAD.left - PAD.right
  const iH = H - PAD.top - PAD.bottom

  const lo = Math.min(...vals), hi = Math.max(...vals)
  const span = hi - lo || 1
  const barW = iW / 24

  const toY = (v: number) => PAD.top + iH - ((v - lo) / span) * iH
  const barH = (v: number) => ((v - lo) / span) * iH

  const showHours = [0, 6, 12, 18]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + iH} stroke="#e5e7eb" strokeWidth={1} />
      <line x1={PAD.left} y1={PAD.top + iH} x2={PAD.left + iW} y2={PAD.top + iH} stroke="#e5e7eb" strokeWidth={1} />
      <text x={PAD.left - 4} y={PAD.top + 4} fontSize={9} textAnchor="end" fill="#9ca3af">{hi.toFixed(1)}{unit}</text>
      <text x={PAD.left - 4} y={PAD.top + iH + 1} fontSize={9} textAnchor="end" fill="#9ca3af">{lo.toFixed(1)}{unit}</text>
      {profile.map(p => {
        const v = unit === "°C" ? p.avgTemp : p.avgHumidity
        if (v === null) return null
        const x = PAD.left + p.hour * barW
        const bh = barH(v)
        return (
          <rect key={p.hour} x={x + 1} y={toY(v)} width={barW - 2} height={bh}
            fill={color} opacity={0.7} rx={1} />
        )
      })}
      {showHours.map(h => (
        <text key={h} x={PAD.left + h * barW + barW / 2} y={H - 4}
          fontSize={8} textAnchor="middle" fill="#9ca3af">{String(h).padStart(2, "0")}:00</text>
      ))}
    </svg>
  )
}

// ── Stats Row ──────────────────────────────────────────────────────────────────

function StatsRow({ vals, unit }: { vals: number[]; unit: string }) {
  if (!vals.length) return null
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length
  return (
    <div className="flex gap-3 text-xs text-gray-500 mt-1 mb-2">
      <span>Min <strong className="text-gray-700">{min.toFixed(1)}{unit}</strong></span>
      <span>Ø <strong className="text-gray-700">{avg.toFixed(1)}{unit}</strong></span>
      <span>Max <strong className="text-gray-700">{max.toFixed(1)}{unit}</strong></span>
    </div>
  )
}

// ── Delta indicator ────────────────────────────────────────────────────────────

function Delta({ current, previous, unit }: { current: number | null; previous: number | null; unit: string }) {
  if (current === null || previous === null) return null
  const diff = current - previous
  const sign = diff > 0 ? "+" : ""
  const color = diff > 0 ? "text-orange-500" : diff < 0 ? "text-blue-500" : "text-gray-400"
  return <span className={`text-xs font-medium ${color}`}>{sign}{diff.toFixed(1)}{unit}</span>
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function DataTab() {
  const [readings, setReadings] = useState<Reading[]>([])
  const [stats, setStats] = useState<ThermometerStats | null>(null)
  const [range, setRange] = useState<Range>("7d")
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async (r: Range) => {
    setLoading(true)
    const [readRes, statsRes] = await Promise.all([
      fetch(`/api/garden/thermometer?range=${r}`),
      fetch("/api/garden/thermometer/stats"),
    ])
    if (readRes.ok) setReadings(await readRes.json())
    if (statsRes.ok) {
      const data = await statsRes.json()
      setStats(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load(range) }, [load, range])

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportStatus(null)
    try {
      const csv = await file.text()
      const res = await fetch("/api/garden/thermometer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      })
      const data = await res.json()
      if (res.ok) {
        setImportStatus(`✓ ${data.imported} Messwerte importiert`)
        load(range)
      } else {
        setImportStatus(`✗ ${data.error}`)
      }
    } catch {
      setImportStatus("✗ Fehler beim Lesen der Datei")
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  const latest = readings.length > 0 ? readings[readings.length - 1] : null
  const tempData: ChartPoint[] = readings.map(r => ({ ts: new Date(r.timestamp).getTime(), val: r.temperature }))
  const humData: ChartPoint[] = readings.map(r => ({ ts: new Date(r.timestamp).getTime(), val: r.humidity }))

  return (
    <div className="space-y-4">
      {/* ── Latest reading ─────────────────────────────────────────────────── */}
      {latest ? (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="text-xs text-gray-400 mb-2">
            Letzter Messwert · {fmtDateTime(latest.timestamp)}
          </div>
          <div className="flex gap-6 items-end">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold text-orange-500">{latest.temperature.toFixed(1)}</span>
              <span className="text-lg text-orange-400">°C</span>
              <span className="text-sm text-gray-400 ml-1">🌡️</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold text-blue-500">{latest.humidity.toFixed(1)}</span>
              <span className="text-lg text-blue-400">%</span>
              <span className="text-sm text-gray-400 ml-1">💧</span>
            </div>
            {stats && (
              <div className="ml-auto text-right">
                <div className="text-[11px] text-gray-400">{stats.daysTracked} {stats.daysTracked === 1 ? "Tag" : "Tage"} erfasst</div>
                <div className="text-[11px] text-gray-400">{stats.totalReadings} Messungen</div>
              </div>
            )}
          </div>
        </div>
      ) : !loading ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-5xl mb-3">🌡️</div>
          <p className="text-sm">Noch keine Messdaten vorhanden.</p>
          <p className="text-xs mt-1">CSV hochladen oder automatischen Import einrichten.</p>
        </div>
      ) : null}

      {/* ── Range filter ───────────────────────────────────────────────────── */}
      <div className="flex gap-2">
        {RANGES.map(r => (
          <button key={r.id} onClick={() => setRange(r.id)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
              range === r.id ? "bg-primary-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}>
            {r.label}
          </button>
        ))}
      </div>

      {/* ── Line charts ────────────────────────────────────────────────────── */}
      {readings.length >= 2 && (
        <>
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
            <div className="text-sm font-medium text-gray-700 mb-1">🌡️ Temperatur</div>
            <StatsRow vals={readings.map(r => r.temperature)} unit="°C" />
            <LineChart data={tempData} color="#f97316" unit="°C" range={range} />
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
            <div className="text-sm font-medium text-gray-700 mb-1">💧 Luftfeuchtigkeit</div>
            <StatsRow vals={readings.map(r => r.humidity)} unit="%" />
            <LineChart data={humData} color="#3b82f6" unit="%" range={range} />
          </div>
        </>
      )}

      {loading && <div className="text-center py-8 text-gray-400 text-sm">Lade Daten…</div>}

      {/* ── Stats section (all from complete dataset) ──────────────────────── */}
      {stats && (
        <>
          {/* Rekorde */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
            <div className="text-sm font-medium text-gray-700 mb-3">🏆 Rekorde</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-orange-50 rounded-xl p-3">
                <div className="text-[11px] text-orange-400 mb-1">Wärmste Messung</div>
                <div className="text-xl font-bold text-orange-500">{stats.records.maxTemp.value.toFixed(1)}°C</div>
                <div className="text-[10px] text-gray-400 mt-1">{fmtDate(stats.records.maxTemp.timestamp)} · {fmtTime(stats.records.maxTemp.timestamp)}</div>
              </div>
              <div className="bg-blue-50 rounded-xl p-3">
                <div className="text-[11px] text-blue-400 mb-1">Kälteste Messung</div>
                <div className="text-xl font-bold text-blue-500">{stats.records.minTemp.value.toFixed(1)}°C</div>
                <div className="text-[10px] text-gray-400 mt-1">{fmtDate(stats.records.minTemp.timestamp)} · {fmtTime(stats.records.minTemp.timestamp)}</div>
              </div>
              <div className="bg-cyan-50 rounded-xl p-3">
                <div className="text-[11px] text-cyan-500 mb-1">Feuchteste Messung</div>
                <div className="text-xl font-bold text-cyan-600">{stats.records.maxHumidity.value.toFixed(1)}%</div>
                <div className="text-[10px] text-gray-400 mt-1">{fmtDate(stats.records.maxHumidity.timestamp)} · {fmtTime(stats.records.maxHumidity.timestamp)}</div>
              </div>
              <div className="bg-yellow-50 rounded-xl p-3">
                <div className="text-[11px] text-yellow-500 mb-1">Trockenste Messung</div>
                <div className="text-xl font-bold text-yellow-600">{stats.records.minHumidity.value.toFixed(1)}%</div>
                <div className="text-[10px] text-gray-400 mt-1">{fmtDate(stats.records.minHumidity.timestamp)} · {fmtTime(stats.records.minHumidity.timestamp)}</div>
              </div>
            </div>
          </div>

          {/* Saison-Kennzahlen */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
            <div className="text-sm font-medium text-gray-700 mb-3">🌱 Saison-Kennzahlen</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="text-[11px] text-gray-400 mb-1">❄️ Frosttage</div>
                <div className="text-2xl font-bold text-gray-700">{stats.frostDays}</div>
                <div className="text-[10px] text-gray-400 mt-1">Tage mit Tiefst. unter 0°C</div>
              </div>
              <div className="bg-green-50 rounded-xl p-3">
                <div className="text-[11px] text-green-500 mb-1">🌿 Wärmesumme</div>
                <div className="text-2xl font-bold text-green-600">{stats.growingDegreeDays.toFixed(1)}</div>
                <div className="text-[10px] text-gray-400 mt-1">Grad-Tage (Basis 5°C)</div>
              </div>
            </div>
            {stats.daysTracked > 0 && (
              <p className="text-[10px] text-gray-400 mt-3">
                Wärmesumme = akkumulierte Wärme seit Messbeginn. Ab ~150 GDD keimen die meisten Gemüsepflanzen zuverlässig.
              </p>
            )}
          </div>

          {/* Tagesverlauf */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
            <div className="text-sm font-medium text-gray-700 mb-1">🕐 Typischer Tagesverlauf</div>
            <p className="text-[11px] text-gray-400 mb-3">Ø Temperatur pro Stunde über alle erfassten Tage</p>
            <HourlyChart profile={stats.hourlyProfile} color="#f97316" unit="°C" />
          </div>

          {/* Wochenvergleich */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
            <div className="text-sm font-medium text-gray-700 mb-3">📅 Wochenvergleich</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="text-[11px] text-gray-400 mb-2">Diese Woche</div>
                {stats.weekComparison.thisWeek.avgTemp !== null ? (
                  <>
                    <div className="text-lg font-bold text-orange-500">
                      {stats.weekComparison.thisWeek.avgTemp!.toFixed(1)}°C
                    </div>
                    <div className="text-sm text-blue-500">
                      {stats.weekComparison.thisWeek.avgHumidity!.toFixed(0)}%
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1">
                      {stats.weekComparison.thisWeek.days} {stats.weekComparison.thisWeek.days === 1 ? "Tag" : "Tage"}
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-gray-400">Keine Daten</div>
                )}
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="text-[11px] text-gray-400 mb-2">
                  Letzte Woche
                  {stats.weekComparison.thisWeek.avgTemp !== null && stats.weekComparison.lastWeek && (
                    <span className="ml-2">
                      <Delta
                        current={stats.weekComparison.thisWeek.avgTemp}
                        previous={stats.weekComparison.lastWeek.avgTemp}
                        unit="°C"
                      />
                    </span>
                  )}
                </div>
                {stats.weekComparison.lastWeek ? (
                  <>
                    <div className="text-lg font-bold text-orange-400">
                      {stats.weekComparison.lastWeek.avgTemp!.toFixed(1)}°C
                    </div>
                    <div className="text-sm text-blue-400">
                      {stats.weekComparison.lastWeek.avgHumidity!.toFixed(0)}%
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1">
                      {stats.weekComparison.lastWeek.days} {stats.weekComparison.lastWeek.days === 1 ? "Tag" : "Tage"}
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-gray-400">Noch keine Daten</div>
                )}
              </div>
            </div>
          </div>

          {/* Tageshöchst-/Tiefstwerte Timeline */}
          {stats.dailyExtremes.length > 1 && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
              <div className="text-sm font-medium text-gray-700 mb-3">📊 Tägliche Extremwerte</div>
              <div className="space-y-2">
                {stats.dailyExtremes.slice(-7).map(d => {
                  const date = new Date(d.date + "T12:00:00Z").toLocaleDateString("de-DE", {
                    weekday: "short", day: "2-digit", month: "2-digit", timeZone: "UTC",
                  })
                  const tempRange = d.maxTemp - d.minTemp
                  return (
                    <div key={d.date} className="flex items-center gap-2 text-xs">
                      <span className="text-gray-400 w-20 shrink-0">{date}</span>
                      <span className="text-blue-500 w-14 shrink-0">{d.minTemp.toFixed(1)}°</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5 relative">
                        <div
                          className="absolute h-1.5 rounded-full bg-gradient-to-r from-blue-400 to-orange-400"
                          style={{
                            left: `${Math.max(0, ((d.minTemp - (stats.records.minTemp.value - 2)) / ((stats.records.maxTemp.value + 2) - (stats.records.minTemp.value - 2))) * 100)}%`,
                            width: `${Math.max(4, (tempRange / ((stats.records.maxTemp.value + 2) - (stats.records.minTemp.value - 2))) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="text-orange-500 w-14 shrink-0 text-right">{d.maxTemp.toFixed(1)}°</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Manual CSV upload ──────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
        <div className="text-sm font-medium text-gray-700 mb-1">📥 CSV manuell importieren</div>
        <p className="text-xs text-gray-400 mb-3">
          CSV-Export vom Thermometer hier hochladen. Duplikate werden automatisch übersprungen.
        </p>
        <label className={`flex items-center justify-center gap-2 w-full border-2 border-dashed border-gray-300 hover:border-primary-400 rounded-xl py-2.5 text-sm text-gray-500 hover:text-primary-600 transition-colors cursor-pointer ${importing ? "opacity-50 pointer-events-none" : ""}`}>
          {importing ? "Importiere…" : "CSV-Datei auswählen"}
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
        </label>
        {importStatus && (
          <p className={`text-xs mt-2 ${importStatus.startsWith("✓") ? "text-green-600" : "text-red-500"}`}>
            {importStatus}
          </p>
        )}
      </div>
    </div>
  )
}
