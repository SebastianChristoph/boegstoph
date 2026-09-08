"use client"

import { useCallback, useEffect, useRef, useState } from "react"

interface Reading {
  id: string
  timestamp: string
  source: string
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
type Source = "gh" | "out"

const RANGES: { id: Range; label: string }[] = [
  { id: "24h", label: "24 Std." },
  { id: "7d", label: "7 Tage" },
  { id: "30d", label: "30 Tage" },
  { id: "alle", label: "Alle" },
]

const SOURCE_LABELS: Record<Source, string> = {
  gh: "Gewächshaus",
  out: "Outdoor",
}

const SOURCE_COLORS: Record<Source, { temp: string; hum: string }> = {
  gh:  { temp: "#f97316", hum: "#f97316" },
  out: { temp: "#22c55e", hum: "#22c55e" },
}

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

// ── SVG Dual-Line Chart ────────────────────────────────────────────────────────

interface ChartPoint { ts: number; val: number }

interface Series { data: ChartPoint[]; color: string; label: string }

interface HoverState {
  svgX: number
  items: { label: string; color: string; val: number; ts: number }[]
}

function DualLineChart({ series, unit, range, height = 180 }: { series: Series[]; unit: string; range: Range; height?: number }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hover, setHover] = useState<HoverState | null>(null)

  const active = series.filter(s => s.data.length >= 2)
  if (!active.length) return null

  const W = 800, H = height
  const PAD = { top: 14, right: 14, bottom: 26, left: 46 }
  const iW = W - PAD.left - PAD.right
  const iH = H - PAD.top - PAD.bottom

  const allVals = active.flatMap(s => s.data.map(d => d.val))
  const lo = Math.min(...allVals), hi = Math.max(...allVals)

  const step = unit === "°C" ? 5 : unit === "%" ? 10 : 5
  const yMin = Math.floor(lo / step) * step
  const yMax = Math.ceil(hi / step) * step
  const yTicks = Array.from({ length: Math.round((yMax - yMin) / step) + 1 }, (_, i) => yMin + i * step)

  // for non-fixed-tick charts keep padV for toY range
  const padV = unit === "°C" || unit === "%" ? 0 : (hi - lo || 1) * 0.12
  const yLo = unit === "°C" || unit === "%" ? yMin : lo - padV
  const yHi = unit === "°C" || unit === "%" ? yMax : hi + padV

  const allTs = active.flatMap(s => s.data.map(d => d.ts))
  const minTs = Math.min(...allTs), maxTs = Math.max(...allTs)
  const tsSpan = maxTs - minTs || 1

  const toX = (ts: number) => PAD.left + ((ts - minTs) / tsSpan) * iW
  const toY = (val: number) => PAD.top + iH - ((val - yLo) / ((yHi - yLo) || 1)) * iH

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const svgX = ((e.clientX - rect.left) / rect.width) * W
    const dataX = svgX - PAD.left
    if (dataX < 0 || dataX > iW) { setHover(null); return }
    const ts = minTs + (dataX / iW) * tsSpan

    const items = active.map(s => {
      let nearest = s.data[0]
      let minDist = Math.abs(s.data[0].ts - ts)
      for (const p of s.data) {
        const d = Math.abs(p.ts - ts)
        if (d < minDist) { minDist = d; nearest = p }
      }
      return { label: s.label, color: s.color, val: nearest.val, ts: nearest.ts }
    })
    setHover({ svgX, items })
  }

  const refSeries = active[0]
  const xLabels = [
    refSeries.data[0],
    refSeries.data[Math.floor(refSeries.data.length / 3)],
    refSeries.data[Math.floor(refSeries.data.length * 2 / 3)],
    refSeries.data[refSeries.data.length - 1],
  ]

  function fmtX(ts: number) {
    const d = new Date(ts)
    return range === "24h"
      ? d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })
      : d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", timeZone: "UTC" })
  }

  const hoverTs = hover ? hover.items[0].ts : null

  return (
    <div className="relative select-none">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full cursor-crosshair"
        style={{ height: "auto" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHover(null)}
      >
        {/* grid */}
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + iH} stroke="#e5e7eb" strokeWidth={1} />
        <line x1={PAD.left} y1={PAD.top + iH} x2={PAD.left + iW} y2={PAD.top + iH} stroke="#e5e7eb" strokeWidth={1} />
        {yTicks.filter(v => v !== yMin && v !== yMax).map(v => (
          <line key={v} x1={PAD.left} y1={toY(v)} x2={PAD.left + iW} y2={toY(v)}
            stroke="#f3f4f6" strokeWidth={1} strokeDasharray="4,4" />
        ))}
        {/* y-axis labels */}
        {yTicks.map(v => (
          <text key={v} x={PAD.left - 5} y={toY(v) + 4}
            fontSize={10} textAnchor="end" fill="#9ca3af">
            {v}{unit}
          </text>
        ))}
        {/* x-axis labels */}
        {xLabels.map((d, i) => (
          <text key={i} x={toX(d.ts)} y={H - 5} fontSize={9}
            textAnchor={i === 0 ? "start" : i === xLabels.length - 1 ? "end" : "middle"} fill="#9ca3af">
            {fmtX(d.ts)}
          </text>
        ))}
        {/* 0°C reference line — highlight the 0 gridline in blue when it's in range */}
        {unit === "°C" && yMin < 0 && yMax > 0 && (
          <line
            x1={PAD.left} y1={toY(0)} x2={PAD.left + iW} y2={toY(0)}
            stroke="#93c5fd" strokeWidth={1.5} strokeDasharray="6,4"
          />
        )}
        {/* data lines — solid above 0, dashed below 0 (temp only) */}
        {active.map(s => {
          if (unit !== "°C") {
            const pts = s.data.map(d => `${toX(d.ts).toFixed(1)},${toY(d.val).toFixed(1)}`).join(" ")
            return <polyline key={s.label} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" points={pts} />
          }
          // build segments split at val=0
          type Seg = { pts: string[]; dashed: boolean }
          const segments: Seg[] = []
          let cur: Seg | null = null
          const addPt = (x: number, y: number, dashed: boolean) => {
            if (!cur || cur.dashed !== dashed) {
              const prev = cur
              cur = { pts: [], dashed }
              if (prev && prev.pts.length) { cur.pts.push(prev.pts[prev.pts.length - 1]); segments.push(prev) }
              segments.push(cur)
            }
            cur.pts.push(`${x.toFixed(1)},${y.toFixed(1)}`)
          }
          for (let i = 0; i < s.data.length; i++) {
            const p = s.data[i]
            if (i === 0) { addPt(toX(p.ts), toY(p.val), p.val < 0); continue }
            const prev = s.data[i - 1]
            if ((prev.val < 0) !== (p.val < 0)) {
              const t = (0 - prev.val) / (p.val - prev.val)
              const crossTs = prev.ts + (p.ts - prev.ts) * t
              addPt(toX(crossTs), toY(0), prev.val < 0)
            }
            addPt(toX(p.ts), toY(p.val), p.val < 0)
          }
          const belowColor = s.label === "GH" ? "#ef4444" : "#3b82f6"
          return segments.map((seg, i) => (
            <polyline key={`${s.label}-${i}`} fill="none"
              stroke={seg.dashed ? belowColor : s.color} strokeWidth={2}
              strokeLinejoin="round" strokeLinecap="round"
              strokeDasharray={seg.dashed ? "6,4" : undefined}
              points={seg.pts.join(" ")} />
          ))
        })}
        {/* hover crosshair */}
        {hover && (
          <>
            <line
              x1={hover.svgX} y1={PAD.top}
              x2={hover.svgX} y2={PAD.top + iH}
              stroke="#6b7280" strokeWidth={1} strokeDasharray="4,3"
            />
            {hover.items.map(item => (
              <circle key={item.label}
                cx={toX(item.ts)} cy={toY(item.val)} r={5}
                fill="white" stroke={item.color} strokeWidth={2.5}
              />
            ))}
          </>
        )}
      </svg>

      {/* Tooltip */}
      {hover && hoverTs !== null && (
        <div className="absolute top-2 right-2 bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2 text-xs pointer-events-none z-10 min-w-[130px]">
          <div className="text-gray-400 mb-1.5 text-[10px] font-medium">
            {new Date(hoverTs).toLocaleString("de-DE", {
              day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "UTC",
            })}
          </div>
          {hover.items.map(item => (
            <div key={item.label} className="flex items-center gap-2 py-0.5">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-gray-500 w-7">{item.label}</span>
              <span className="font-semibold text-gray-800 tabular-nums">{item.val.toFixed(1)}{unit}</span>
            </div>
          ))}
        </div>
      )}
    </div>
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

  const W = 800, H = 140
  const PAD = { top: 12, right: 8, bottom: 24, left: 42 }
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

function StatsRow({ ghVals, outVals, unit, ghColor = "text-orange-500", outColor = "text-green-500" }: { ghVals: number[]; outVals: number[]; unit: string; ghColor?: string; outColor?: string }) {
  const rows: { label: string; vals: number[]; color: string }[] = []
  if (ghVals.length) rows.push({ label: "GH", vals: ghVals, color: ghColor })
  if (outVals.length) rows.push({ label: "Out", vals: outVals, color: outColor })
  if (!rows.length) return null
  return (
    <div className="space-y-0.5 mb-2">
      {rows.map(r => {
        const min = Math.min(...r.vals), max = Math.max(...r.vals), avg = r.vals.reduce((a, b) => a + b, 0) / r.vals.length
        return (
          <div key={r.label} className="flex gap-3 text-xs text-gray-500">
            <span className={`font-semibold w-7 ${r.color}`}>{r.label}</span>
            <span>Min <strong className="text-gray-700">{min.toFixed(1)}{unit}</strong></span>
            <span>Ø <strong className="text-gray-700">{avg.toFixed(1)}{unit}</strong></span>
            <span>Max <strong className="text-gray-700">{max.toFixed(1)}{unit}</strong></span>
          </div>
        )
      })}
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
  const [statsSource, setStatsSource] = useState<Source>("gh")
  const [range, setRange] = useState<Range>("7d")
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const [uploadSource, setUploadSource] = useState<Source>("gh")
  const [expandedChart, setExpandedChart] = useState<{ title: string; series: Series[]; unit: string; ghVals: number[]; outVals: number[] } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const loadStats = useCallback(async (src: Source) => {
    setStatsLoading(true)
    const res = await fetch(`/api/garden/thermometer/stats?source=${src}`)
    if (res.ok) setStats(await res.json())
    setStatsLoading(false)
  }, [])

  const load = useCallback(async (r: Range) => {
    setLoading(true)
    const [readRes, statsRes] = await Promise.all([
      fetch(`/api/garden/thermometer?range=${r}`),
      fetch(`/api/garden/thermometer/stats?source=${statsSource}`),
    ])
    if (readRes.ok) setReadings(await readRes.json())
    if (statsRes.ok) setStats(await statsRes.json())
    setLoading(false)
  }, [statsSource])

  useEffect(() => { load(range) }, [load, range])

  async function handleStatsSource(src: Source) {
    setStatsSource(src)
    loadStats(src)
  }

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
        body: JSON.stringify({ csv, source: uploadSource }),
      })
      const data = await res.json()
      if (res.ok) {
        setImportStatus(`✓ ${data.imported} Messwerte importiert (${SOURCE_LABELS[uploadSource]})`)
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

  const ghReadings = readings.filter(r => r.source === "gh")
  const outReadings = readings.filter(r => r.source === "out")

  const latestGh = ghReadings.length > 0 ? ghReadings[ghReadings.length - 1] : null
  const latestOut = outReadings.length > 0 ? outReadings[outReadings.length - 1] : null

  const tempSeries: Series[] = [
    { data: ghReadings.map(r => ({ ts: new Date(r.timestamp).getTime(), val: r.temperature })), color: SOURCE_COLORS.gh.temp, label: "GH" },
    { data: outReadings.map(r => ({ ts: new Date(r.timestamp).getTime(), val: r.temperature })), color: SOURCE_COLORS.out.temp, label: "Out" },
  ]
  const humSeries: Series[] = [
    { data: ghReadings.map(r => ({ ts: new Date(r.timestamp).getTime(), val: r.humidity })), color: SOURCE_COLORS.gh.hum, label: "GH" },
    { data: outReadings.map(r => ({ ts: new Date(r.timestamp).getTime(), val: r.humidity })), color: SOURCE_COLORS.out.hum, label: "Out" },
  ]

  const hasAnyReadings = readings.length > 0

  return (
    <div className="space-y-4">
      {/* ── Last reading info ───────────────────────────────────────────────── */}
      {(latestGh || latestOut) ? (
        <div className="text-[11px] text-gray-400 flex gap-4">
          {latestGh && <span>🏠 GH: {fmtDateTime(latestGh.timestamp)}</span>}
          {latestOut && <span>🌤️ Out: {fmtDateTime(latestOut.timestamp)}</span>}
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

      {/* ── Legende ────────────────────────────────────────────────────────── */}
      {hasAnyReadings && (
        <div className="flex gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-1 rounded-full bg-orange-500" />
            Gewächshaus
          </span>
          {outReadings.length > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-1 rounded-full bg-green-500" />
              Outdoor
            </span>
          )}
        </div>
      )}

      {/* ── Dual Line charts ───────────────────────────────────────────────── */}
      {hasAnyReadings && (
        <>
          <div
            className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 hidden md:block cursor-pointer hover:border-primary-300 transition-colors group"
            onClick={() => setExpandedChart({ title: "🌡️ Temperatur", series: tempSeries, unit: "°C", ghVals: ghReadings.map(r => r.temperature), outVals: outReadings.map(r => r.temperature) })}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="text-sm font-medium text-gray-700">🌡️ Temperatur</div>
              <span className="text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">Vergrößern ↗</span>
            </div>
            <StatsRow
              ghVals={ghReadings.map(r => r.temperature)}
              outVals={outReadings.map(r => r.temperature)}
              unit="°C"
            />
            <DualLineChart series={tempSeries} unit="°C" range={range} />
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 md:hidden">
            <div className="text-sm font-medium text-gray-700 mb-1">🌡️ Temperatur</div>
            <StatsRow
              ghVals={ghReadings.map(r => r.temperature)}
              outVals={outReadings.map(r => r.temperature)}
              unit="°C"
            />
            <DualLineChart series={tempSeries} unit="°C" range={range} />
          </div>
          <div
            className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 hidden md:block cursor-pointer hover:border-primary-300 transition-colors group"
            onClick={() => setExpandedChart({ title: "💧 Luftfeuchtigkeit", series: humSeries, unit: "%", ghVals: ghReadings.map(r => r.humidity), outVals: outReadings.map(r => r.humidity) })}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="text-sm font-medium text-gray-700">💧 Luftfeuchtigkeit</div>
              <span className="text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">Vergrößern ↗</span>
            </div>
            <StatsRow
              ghVals={ghReadings.map(r => r.humidity)}
              outVals={outReadings.map(r => r.humidity)}
              unit="%"
          />
            <DualLineChart series={humSeries} unit="%" range={range} />
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 md:hidden">
            <div className="text-sm font-medium text-gray-700 mb-1">💧 Luftfeuchtigkeit</div>
            <StatsRow
              ghVals={ghReadings.map(r => r.humidity)}
              outVals={outReadings.map(r => r.humidity)}
              unit="%"
            />
            <DualLineChart series={humSeries} unit="%" range={range} />
          </div>
        </>
      )}

      {loading && <div className="text-center py-8 text-gray-400 text-sm">Lade Daten…</div>}

      {/* ── Stats section ───────────────────────────────────────────────────── */}
      {/* Stats source toggle */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">Statistiken für:</span>
        {(["gh", "out"] as Source[]).map(s => (
          <button key={s} onClick={() => handleStatsSource(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              statsSource === s ? "bg-primary-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}>
            {s === "gh" ? "🏠 Gewächshaus" : "🌤️ Outdoor"}
          </button>
        ))}
        {statsLoading && <span className="text-xs text-gray-400 ml-1">Lade…</span>}
      </div>

      {stats && (
        <>
          {/* Rekorde */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
            <div className="text-sm font-medium text-gray-700 mb-1">🏆 Rekorde</div>
            <p className="text-[10px] text-gray-400 mb-3">{statsSource === "gh" ? "🏠 Gewächshaus" : "🌤️ Outdoor"}</p>
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
            <div className="text-sm font-medium text-gray-700 mb-1">🌱 Saison-Kennzahlen</div>
            <p className="text-[10px] text-gray-400 mb-3">{statsSource === "gh" ? "🏠 Gewächshaus" : "🌤️ Outdoor"}</p>
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
            <p className="text-[11px] text-gray-400 mb-3">Ø Temperatur pro Stunde · {statsSource === "gh" ? "Gewächshaus" : "Outdoor"}</p>
            <HourlyChart profile={stats.hourlyProfile} color="#f97316" unit="°C" />
          </div>

          {/* Wochenvergleich */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
            <div className="text-sm font-medium text-gray-700 mb-1">📅 Wochenvergleich</div>
            <p className="text-[10px] text-gray-400 mb-3">{statsSource === "gh" ? "🏠 Gewächshaus" : "🌤️ Outdoor"}</p>
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
              <div className="text-sm font-medium text-gray-700 mb-1">📊 Tägliche Extremwerte</div>
              <p className="text-[10px] text-gray-400 mb-3">{statsSource === "gh" ? "🏠 Gewächshaus" : "🌤️ Outdoor"}</p>
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
        <div className="flex gap-2 mb-3">
          {(["gh", "out"] as Source[]).map(s => (
            <button key={s} onClick={() => setUploadSource(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                uploadSource === s ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>
              {s === "gh" ? "🏠 Gewächshaus" : "🌤️ Outdoor"}
            </button>
          ))}
        </div>
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

      {/* ── Chart Modal (desktop only) ─────────────────────────────────────── */}
      {expandedChart && (
        <div
          className="fixed inset-0 z-50 hidden md:flex items-center justify-center bg-black/50"
          onClick={() => setExpandedChart(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 w-[90vw] max-w-5xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-4">
                <span className="text-base font-semibold text-gray-800">{expandedChart.title}</span>
                <div className="flex gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-3 h-1 rounded-full bg-orange-500" />
                    Gewächshaus
                  </span>
                  {expandedChart.outVals.length > 0 && (
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block w-3 h-1 rounded-full bg-green-500" />
                      Outdoor
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => setExpandedChart(null)} className="text-gray-400 hover:text-gray-700 text-xl font-light leading-none">✕</button>
            </div>
            <StatsRow ghVals={expandedChart.ghVals} outVals={expandedChart.outVals} unit={expandedChart.unit} />
            <DualLineChart series={expandedChart.series} unit={expandedChart.unit} range={range} height={420} />
          </div>
        </div>
      )}
    </div>
  )
}
