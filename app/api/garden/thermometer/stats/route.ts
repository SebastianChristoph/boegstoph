import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

function avg(arr: number[]) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null
}

export async function GET(req: NextRequest) {
  const source = new URL(req.url).searchParams.get("source") === "out" ? "out" : "gh"
  const all = await prisma.gardenThermometerReading.findMany({
    where: { source },
    orderBy: { timestamp: "asc" },
  })

  if (!all.length) return NextResponse.json(null)

  // ── Records ─────────────────────────────────────────────────────────────────
  const maxTemp = all.reduce((a, b) => a.temperature > b.temperature ? a : b)
  const minTemp = all.reduce((a, b) => a.temperature < b.temperature ? a : b)
  const maxHum  = all.reduce((a, b) => a.humidity > b.humidity ? a : b)
  const minHum  = all.reduce((a, b) => a.humidity < b.humidity ? a : b)

  // ── Group by calendar day (UTC date = stored local date) ─────────────────────
  const byDay = new Map<string, { temps: number[]; hums: number[] }>()
  for (const r of all) {
    const day = r.timestamp.toISOString().slice(0, 10)
    if (!byDay.has(day)) byDay.set(day, { temps: [], hums: [] })
    const d = byDay.get(day)!
    d.temps.push(r.temperature)
    d.hums.push(r.humidity)
  }

  // ── Frost days & Growing Degree Days (Basis 5°C) ────────────────────────────
  let frostDays = 0
  let growingDegreeDays = 0
  for (const { temps } of Array.from(byDay.values())) {
    const dayMin = Math.min(...temps)
    const dayMax = Math.max(...temps)
    const dayAvg = (dayMin + dayMax) / 2
    if (dayMin < 0) frostDays++
    growingDegreeDays += Math.max(0, dayAvg - 5)
  }

  // ── Hourly profile (avg temp & humidity per hour-of-day) ────────────────────
  const byHour = new Map<number, { temps: number[]; hums: number[] }>()
  for (const r of all) {
    const h = r.timestamp.getUTCHours()
    if (!byHour.has(h)) byHour.set(h, { temps: [], hums: [] })
    byHour.get(h)!.temps.push(r.temperature)
    byHour.get(h)!.hums.push(r.humidity)
  }
  const hourlyProfile = Array.from({ length: 24 }, (_, h) => {
    const d = byHour.get(h)
    return {
      hour: h,
      avgTemp: d ? avg(d.temps) : null,
      avgHumidity: d ? avg(d.hums) : null,
    }
  })

  // ── Week comparison ──────────────────────────────────────────────────────────
  const now = new Date()
  // Monday-based weeks
  const dayOfWeek = (now.getUTCDay() + 6) % 7 // 0=Mon
  const startThisWeek = new Date(now)
  startThisWeek.setUTCDate(now.getUTCDate() - dayOfWeek)
  startThisWeek.setUTCHours(0, 0, 0, 0)

  const startLastWeek = new Date(startThisWeek)
  startLastWeek.setUTCDate(startLastWeek.getUTCDate() - 7)

  const thisWeek = all.filter(r => r.timestamp >= startThisWeek)
  const lastWeek = all.filter(r => r.timestamp >= startLastWeek && r.timestamp < startThisWeek)

  // ── Daily extremes for heatmap data ─────────────────────────────────────────
  const dailyExtremes = Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { temps, hums }]) => ({
      date,
      minTemp: Math.min(...temps),
      maxTemp: Math.max(...temps),
      avgTemp: avg(temps)!,
      avgHumidity: avg(hums)!,
    }))

  return NextResponse.json({
    records: {
      maxTemp: { value: maxTemp.temperature, timestamp: maxTemp.timestamp },
      minTemp: { value: minTemp.temperature, timestamp: minTemp.timestamp },
      maxHumidity: { value: maxHum.humidity, timestamp: maxHum.timestamp },
      minHumidity: { value: minHum.humidity, timestamp: minHum.timestamp },
    },
    frostDays,
    growingDegreeDays: Math.round(growingDegreeDays * 10) / 10,
    hourlyProfile,
    weekComparison: {
      thisWeek: {
        avgTemp: avg(thisWeek.map(r => r.temperature)),
        avgHumidity: avg(thisWeek.map(r => r.humidity)),
        days: new Set(thisWeek.map(r => r.timestamp.toISOString().slice(0, 10))).size,
      },
      lastWeek: lastWeek.length ? {
        avgTemp: avg(lastWeek.map(r => r.temperature)),
        avgHumidity: avg(lastWeek.map(r => r.humidity)),
        days: new Set(lastWeek.map(r => r.timestamp.toISOString().slice(0, 10))).size,
      } : null,
    },
    dailyExtremes,
    totalReadings: all.length,
    daysTracked: byDay.size,
  })
}
