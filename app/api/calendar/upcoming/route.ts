import { NextRequest, NextResponse } from "next/server"
import { parseICS, buildEventsForDate, berlinDateStr, sortEvents } from "@/lib/icsParser"

export const dynamic = "force-dynamic"

const DE_DAYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"]

function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  const date = new Date(Date.UTC(y, m - 1, d + n, 12))
  return date.toLocaleDateString("en-CA", { timeZone: "UTC" })
}

function dayLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  const date = new Date(Date.UTC(y, m - 1, d, 12))
  const dow = DE_DAYS[date.getUTCDay()]
  return `${dow} ${String(d).padStart(2, "0")}.${String(m).padStart(2, "0")}`
}

export async function GET(req: NextRequest) {
  const days = Math.min(parseInt(req.nextUrl.searchParams.get("days") ?? "5"), 14)
  const url = process.env.GOOGLE_CALENDAR_ICS_URL
  if (!url) return NextResponse.json([])

  try {
    const res = await fetch(url, { cache: "no-store" })
    if (!res.ok) return NextResponse.json([])
    const text = await res.text()
    const parsed = parseICS(text)
    const todayStr = berlinDateStr(new Date())

    const result = Array.from({ length: days }, (_, i) => {
      const dateStr = addDays(todayStr, i)
      const events = sortEvents(buildEventsForDate(parsed, dateStr))
      return { dateStr, dayLabel: dayLabel(dateStr), events }
    })

    return NextResponse.json(result)
  } catch (e) {
    console.error("Calendar upcoming error:", e)
    return NextResponse.json([])
  }
}
