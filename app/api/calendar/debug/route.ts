import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

// Minimal ICS parser just for debugging — shows all events and their key fields
function debugParseICS(text: string) {
  const unfolded = text.replace(/\r\n[ \t]/g, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  const lines = unfolded.split("\n")

  const events: Record<string, string>[] = []
  let inside = false
  let cur: Record<string, string> = {}

  for (const raw of lines) {
    const line = raw.trimEnd()
    if (line === "BEGIN:VEVENT") { inside = true; cur = {}; continue }
    if (line === "END:VEVENT") {
      inside = false
      events.push({ ...cur })
      continue
    }
    if (!inside) continue
    const colon = line.indexOf(":")
    if (colon < 1) continue
    const key = line.slice(0, colon)
    const val = line.slice(colon + 1)
    const baseKey = key.split(";")[0]
    // Accumulate EXDATEs
    if (baseKey === "EXDATE") {
      cur["EXDATE"] = (cur["EXDATE"] ? cur["EXDATE"] + "," : "") + val
      continue
    }
    if (!cur[baseKey]) {
      cur[baseKey] = val
      cur[`__key_${baseKey}`] = key
    }
  }

  return events
}

export async function GET() {
  const url = process.env.GOOGLE_CALENDAR_ICS_URL
  if (!url) return NextResponse.json({ error: "GOOGLE_CALENDAR_ICS_URL not set" })

  try {
    const res = await fetch(url, { cache: "no-store" })
    if (!res.ok) return NextResponse.json({ error: `ICS fetch failed: ${res.status}` })
    const text = await res.text()
    const events = debugParseICS(text)

    const summary = events.map(ev => ({
      summary: ev["SUMMARY"],
      status: ev["STATUS"] ?? null,
      dtStart: ev["DTSTART"],
      dtStartKey: ev["__key_DTSTART"],
      dtEnd: ev["DTEND"],
      rrule: ev["RRULE"] ?? null,
      exdate: ev["EXDATE"] ?? null,
      uid: ev["UID"]?.slice(0, 20),
    }))

    return NextResponse.json({ totalEvents: events.length, events: summary })
  } catch (e) {
    return NextResponse.json({ error: String(e) })
  }
}
