import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { fetchLatestThermometerCSV } from "@/lib/imap"
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
    const csv = await fetchLatestThermometerCSV()
    if (!csv) {
      return NextResponse.json({ message: "Keine CSV in der Mailbox gefunden" })
    }

    const readings = parseThermometerCSV(csv)
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
