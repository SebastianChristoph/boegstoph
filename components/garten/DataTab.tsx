"use client"

import { useCallback, useEffect, useRef, useState } from "react"

interface Reading {
  id: string
  timestamp: string
  temperature: number
  humidity: number
}

type Range = "24h" | "7d" | "30d" | "alle"

const RANGES: { id: Range; label: string }[] = [
  { id: "24h", label: "24 Std." },
  { id: "7d", label: "7 Tage" },
  { id: "30d", label: "30 Tage" },
  { id: "alle", label: "Alle" },
]

// ── SVG Line Chart ─────────────────────────────────────────────────────────────

interface ChartPoint { ts: number; val: number }

function LineChart({
  data,
  color,
  unit,
  range,
}: {
  data: ChartPoint[]
  color: string
  unit: string
  range: Range
}) {
  if (data.length < 2) return null

  const W = 400
  const H = 90
  const PAD = { top: 10, right: 8, bottom: 22, left: 38 }
  const iW = W - PAD.left - PAD.right
  const iH = H - PAD.top - PAD.bottom

  const vals = data.map(d => d.val)
  const lo = Math.min(...vals)
  const hi = Math.max(...vals)
  const valSpan = hi - lo || 1
  const pad = valSpan * 0.1

  const minTs = data[0].ts
  const maxTs = data[data.length - 1].ts
  const tsSpan = maxTs - minTs || 1

  const toX = (ts: number) => PAD.left + ((ts - minTs) / tsSpan) * iW
  const toY = (val: number) => PAD.top + iH - ((val - (lo - pad)) / (valSpan + 2 * pad)) * iH

  const pts = data.map(d => `${toX(d.ts).toFixed(1)},${toY(d.val).toFixed(1)}`).join(" ")

  // 3 x-axis labels
  const xLabels = [data[0], data[Math.floor(data.length / 2)], data[data.length - 1]]
  const showTime = range === "24h"

  function fmtX(ts: number) {
    const d = new Date(ts)
    if (showTime) return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })
    return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", timeZone: "UTC" })
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      {/* axes */}
      <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + iH} stroke="#e5e7eb" strokeWidth={1} />
      <line x1={PAD.left} y1={PAD.top + iH} x2={PAD.left + iW} y2={PAD.top + iH} stroke="#e5e7eb" strokeWidth={1} />
      {/* midgrid */}
      <line x1={PAD.left} y1={PAD.top + iH / 2} x2={PAD.left + iW} y2={PAD.top + iH / 2} stroke="#f3f4f6" strokeWidth={1} strokeDasharray="3,3" />

      {/* y labels */}
      <text x={PAD.left - 4} y={PAD.top + 4} fontSize={9} textAnchor="end" fill="#9ca3af">{hi.toFixed(1)}{unit}</text>
      <text x={PAD.left - 4} y={PAD.top + iH / 2 + 3} fontSize={9} textAnchor="end" fill="#9ca3af">{((hi + lo) / 2).toFixed(1)}{unit}</text>
      <text x={PAD.left - 4} y={PAD.top + iH + 1} fontSize={9} textAnchor="end" fill="#9ca3af">{lo.toFixed(1)}{unit}</text>

      {/* x labels */}
      {xLabels.map((d, i) => (
        <text
          key={i}
          x={toX(d.ts)}
          y={H - 4}
          fontSize={8}
          textAnchor={i === 0 ? "start" : i === 2 ? "end" : "middle"}
          fill="#9ca3af"
        >
          {fmtX(d.ts)}
        </text>
      ))}

      {/* line */}
      <polyline fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" points={pts} />
    </svg>
  )
}

// ── Stats Row ──────────────────────────────────────────────────────────────────

function Stats({ vals, unit }: { vals: number[]; unit: string }) {
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

// ── Main Component ─────────────────────────────────────────────────────────────

export default function DataTab() {
  const [readings, setReadings] = useState<Reading[]>([])
  const [range, setRange] = useState<Range>("7d")
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async (r: Range) => {
    setLoading(true)
    const res = await fetch(`/api/garden/thermometer?range=${r}`)
    if (res.ok) setReadings(await res.json())
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
      {/* Latest reading */}
      {latest ? (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="text-xs text-gray-400 mb-2">
            Letzter Messwert · {new Date(latest.timestamp).toLocaleString("de-DE", {
              day: "2-digit", month: "2-digit", year: "numeric",
              hour: "2-digit", minute: "2-digit", timeZone: "UTC",
            })}
          </div>
          <div className="flex gap-6">
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
          </div>
        </div>
      ) : !loading ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-5xl mb-3">🌡️</div>
          <p className="text-sm">Noch keine Messdaten vorhanden.</p>
          <p className="text-xs mt-1">CSV hochladen oder automatischen Import einrichten.</p>
        </div>
      ) : null}

      {/* Range filter */}
      <div className="flex gap-2">
        {RANGES.map(r => (
          <button
            key={r.id}
            onClick={() => setRange(r.id)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
              range === r.id
                ? "bg-primary-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Charts */}
      {readings.length >= 2 && (
        <>
          {/* Temperature */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
            <div className="text-sm font-medium text-gray-700 mb-1">🌡️ Temperatur</div>
            <Stats vals={readings.map(r => r.temperature)} unit="°C" />
            <LineChart data={tempData} color="#f97316" unit="°C" range={range} />
          </div>

          {/* Humidity */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
            <div className="text-sm font-medium text-gray-700 mb-1">💧 Luftfeuchtigkeit</div>
            <Stats vals={readings.map(r => r.humidity)} unit="%" />
            <LineChart data={humData} color="#3b82f6" unit="%" range={range} />
          </div>
        </>
      )}

      {loading && (
        <div className="text-center py-8 text-gray-400 text-sm">Lade Daten…</div>
      )}

      {/* Manual CSV upload */}
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
