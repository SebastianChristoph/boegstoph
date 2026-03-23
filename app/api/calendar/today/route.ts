import { NextResponse } from "next/server"
import { parseICS, buildEventsForDate, berlinDateStr, sortEvents } from "@/lib/icsParser"

export const dynamic = "force-dynamic"

export type { CalendarEvent } from "@/lib/icsParser"

export async function GET() {
  const url = process.env.GOOGLE_CALENDAR_ICS_URL
  if (!url) return NextResponse.json([])
  try {
    const res = await fetch(url, { cache: "no-store" })
    if (!res.ok) return NextResponse.json([])
    const text = await res.text()
    const parsed = parseICS(text)
    const todayStr = berlinDateStr(new Date())
    return NextResponse.json(sortEvents(buildEventsForDate(parsed, todayStr)))
  } catch (e) {
    console.error("Calendar fetch error:", e)
    return NextResponse.json([])
  }
}
