import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse("Unauthorized", { status: 401 })

  const year = parseInt(req.nextUrl.searchParams.get("year") ?? String(new Date().getFullYear()))

  const [seasons, harvest, notes, beds, ghReadings, outReadings] = await Promise.all([
    prisma.gardenSeason.findMany({
      where: { year },
      include: {
        plant: true,
        bed: true,
        todos: { orderBy: { dueDate: "asc" } },
        diary: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.gardenHarvest.findMany({
      where: { year },
      orderBy: { harvestDate: "asc" },
    }),
    prisma.gardenNote.findMany({
      where: { OR: [{ year }, { year: null, createdAt: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) } }] },
      orderBy: { createdAt: "desc" },
    }),
    prisma.gardenBed.findMany({ orderBy: { name: "asc" } }),
    // growing season Apr–Oct
    prisma.gardenThermometerReading.findMany({
      where: { source: "gh", timestamp: { gte: new Date(`${year}-04-01`), lt: new Date(`${year}-11-01`) } },
      orderBy: { timestamp: "asc" },
    }),
    prisma.gardenThermometerReading.findMany({
      where: { source: "out", timestamp: { gte: new Date(`${year}-04-01`), lt: new Date(`${year}-11-01`) } },
      orderBy: { timestamp: "asc" },
    }),
  ])

  // harvest summary per plant+unit
  const harvestSummaryMap: Record<string, Record<string, number>> = {}
  for (const h of harvest) {
    if (!harvestSummaryMap[h.plantName]) harvestSummaryMap[h.plantName] = {}
    harvestSummaryMap[h.plantName][h.unit] = (harvestSummaryMap[h.plantName][h.unit] ?? 0) + h.quantity
  }
  const harvestSummary = Object.entries(harvestSummaryMap).map(([plantName, units]) => ({
    plantName,
    totals: Object.entries(units).map(([unit, total]) => ({ unit, total })),
  }))

  // bed assignments for the year
  const bedAssignments = beds.map(b => {
    const assignments: Record<string, string> = b.cellAssignments
      ? (JSON.parse(b.cellAssignments)[String(year)] ?? {})
      : {}
    const plantIds = Array.from(new Set(Object.values(assignments)))
    const seasonPlants = seasons
      .filter(s => s.bedId === b.id)
      .map(s => s.plant.name)
    return { id: b.id, name: b.name, plants: Array.from(new Set(seasonPlants)) }
  }).filter(b => b.plants.length > 0)

  // todo stats
  const allTodos = seasons.flatMap(s => s.todos)
  const todoStats = {
    total: allTodos.length,
    completed: allTodos.filter(t => t.done).length,
    overdue: allTodos.filter(t => !t.done && t.dueDate && new Date(t.dueDate) < new Date()).length,
  }

  // weather stats helper
  function calcWeather(readings: { temperature: number; humidity: number; timestamp: Date }[]) {
    if (readings.length < 2) return null
    const temps = readings.map(r => r.temperature)
    const hums = readings.map(r => r.humidity)
    const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length
    const avgHum = hums.reduce((a, b) => a + b, 0) / hums.length
    const maxR = readings.reduce((a, b) => a.temperature > b.temperature ? a : b)
    const minR = readings.reduce((a, b) => a.temperature < b.temperature ? a : b)
    // frost days = days with any reading < 0
    const dayTemps: Record<string, number[]> = {}
    for (const r of readings) {
      const d = new Date(r.timestamp).toISOString().slice(0, 10)
      if (!dayTemps[d]) dayTemps[d] = []
      dayTemps[d].push(r.temperature)
    }
    const frostDays = Object.values(dayTemps).filter(ts => Math.min(...ts) < 0).length
    const gdd = Object.values(dayTemps).reduce((sum, ts) => {
      const avg = ts.reduce((a, b) => a + b, 0) / ts.length
      return sum + Math.max(0, avg - 5)
    }, 0)
    return {
      readingCount: readings.length,
      avgTemp: Math.round(avgTemp * 10) / 10,
      avgHum: Math.round(avgHum * 10) / 10,
      maxTemp: maxR.temperature,
      maxTempDate: maxR.timestamp,
      minTemp: minR.temperature,
      minTempDate: minR.timestamp,
      frostDays,
      gdd: Math.round(gdd * 10) / 10,
    }
  }

  return NextResponse.json({
    year,
    seasons: seasons.map(s => ({
      id: s.id,
      plantName: s.plant.name,
      variety: s.plant.variety,
      method: s.method,
      bedName: s.bed?.name ?? null,
      todos: s.todos,
      diary: s.diary,
    })),
    harvest,
    harvestSummary,
    notes,
    bedAssignments,
    todoStats,
    weather: {
      gh: calcWeather(ghReadings),
      out: calcWeather(outReadings),
    },
  })
}
