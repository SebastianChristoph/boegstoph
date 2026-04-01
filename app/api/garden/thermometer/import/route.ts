import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { fetchAllThermometerCSVs } from "@/lib/imap"
import { parseThermometerCSV } from "@/lib/thermometerParser"

export const dynamic = "force-dynamic"

// Called daily by server cron:
// curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://dashboard.sebastianchristoph.de/api/garden/thermometer/import
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get("authorization")

  if (!secret || auth !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  try {
    const csvResults = await fetchAllThermometerCSVs()
    if (!csvResults.length) {
      return NextResponse.json({ message: "Keine CSV in der Mailbox gefunden" })
    }

    const summary: Record<string, number> = {}

    for (const { csv, source } of csvResults) {
      const readings = parseThermometerCSV(csv)
      let imported = 0

      for (const r of readings) {
        await prisma.gardenThermometerReading.upsert({
          where: { timestamp_source: { timestamp: r.timestamp, source } },
          update: { temperature: r.temperature, humidity: r.humidity },
          create: { timestamp: r.timestamp, source, temperature: r.temperature, humidity: r.humidity },
        })
        imported++
      }

      summary[source] = imported
    }

    return NextResponse.json({ imported: summary })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
