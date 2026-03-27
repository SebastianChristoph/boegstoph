import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { parseThermometerCSV } from "@/lib/thermometerParser"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const range = searchParams.get("range") ?? "7d"

  const now = new Date()
  let from: Date | undefined

  if (range === "24h") from = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  else if (range === "7d") from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  else if (range === "30d") from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const readings = await prisma.gardenThermometerReading.findMany({
    where: from ? { timestamp: { gte: from } } : undefined,
    orderBy: { timestamp: "asc" },
  })

  return NextResponse.json(readings)
}

export async function POST(req: NextRequest) {
  const { csv } = await req.json()
  if (!csv || typeof csv !== "string") {
    return NextResponse.json({ error: "csv string required" }, { status: 400 })
  }

  const readings = parseThermometerCSV(csv)
  if (!readings.length) {
    return NextResponse.json({ error: "Keine gültigen Messwerte in der CSV gefunden" }, { status: 400 })
  }

  let imported = 0
  for (const r of readings) {
    await prisma.gardenThermometerReading.upsert({
      where: { timestamp: r.timestamp },
      update: { temperature: r.temperature, humidity: r.humidity },
      create: { timestamp: r.timestamp, temperature: r.temperature, humidity: r.humidity },
    })
    imported++
  }

  return NextResponse.json({ imported })
}
