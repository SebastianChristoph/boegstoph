import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export interface CalendarEvent {
  id: string
  summary: string
  start: string
  end: string
  allDay: boolean
  location?: string
}

// Convert naive ICS datetime string + TZID to a UTC Date
function icsToUTC(value: string, tzid: string): Date {
  const y = parseInt(value.slice(0, 4))
  const mo = parseInt(value.slice(4, 6)) - 1
  const d = parseInt(value.slice(6, 8))
  const h = parseInt(value.slice(9, 11) || "0")
  const mi = parseInt(value.slice(11, 13) || "0")
  const s = parseInt(value.slice(13, 15) || "0")

  if (value.endsWith("Z")) {
    return new Date(Date.UTC(y, mo, d, h, mi, s))
  }

  const guess = Date.UTC(y, mo, d, h, mi, s)
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tzid,
    year: "numeric", month: "numeric", day: "numeric",
    hour: "numeric", minute: "numeric", second: "numeric",
    hour12: false,
  })
  const parts = Object.fromEntries(fmt.formatToParts(new Date(guess)).map(p => [p.type, p.value]))
  const gotH = parseInt(parts.hour) % 24
  const gotMi = parseInt(parts.minute)
  const gotS = parseInt(parts.second)
  const diffMs = (gotH * 3600 + gotMi * 60 + gotS - h * 3600 - mi * 60 - s) * 1000
  return new Date(guess - diffMs)
}

// Get date string in Berlin timezone: "2026-03-23"
function berlinDateStr(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: "Europe/Berlin" })
}

// Day-of-week abbreviation (SU,MO,TU,WE,TH,FR,SA) from a Berlin date string "YYYY-MM-DD"
function dowFromDateStr(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  // Use noon UTC to avoid date-boundary issues
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
  return ["SU", "MO", "TU", "WE", "TH", "FR", "SA"][date.getUTCDay()]
}

interface ParsedVEvent {
  uid: string
  summary: string
  dtStartVal: string
  dtStartKey: string   // includes params like TZID=...
  dtEndVal: string | null
  dtEndKey: string
  rrule: string | null
  exdates: string[]    // raw ICS datetime values (possibly 8-char DATE or 15-char DATETIME)
  exdateTzid: string
  location?: string
}

function parseICS(text: string): ParsedVEvent[] {
  const unfolded = text.replace(/\r\n[ \t]/g, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  const lines = unfolded.split("\n")

  const events: ParsedVEvent[] = []
  let inside = false
  let cur: Record<string, string> = {}
  let exdates: string[] = []
  let exdateTzid = "Europe/Berlin"

  for (const raw of lines) {
    const line = raw.trimEnd()

    if (line === "BEGIN:VEVENT") {
      inside = true
      cur = {}
      exdates = []
      exdateTzid = "Europe/Berlin"
      continue
    }

    if (line === "END:VEVENT") {
      inside = false
      const dtStartVal = cur["DTSTART"]
      if (dtStartVal) {
        events.push({
          uid: cur["UID"] ?? String(Math.random()),
          summary: cur["SUMMARY"] ?? "(kein Titel)",
          dtStartVal,
          dtStartKey: cur["__param_DTSTART"] ?? "DTSTART",
          dtEndVal: cur["DTEND"] ?? null,
          dtEndKey: cur["__param_DTEND"] ?? "DTEND",
          rrule: cur["RRULE"] ?? null,
          exdates,
          exdateTzid,
          location: cur["LOCATION"] || undefined,
        })
      }
      continue
    }

    if (!inside) continue

    const colon = line.indexOf(":")
    if (colon < 1) continue
    const key = line.slice(0, colon)
    const val = line.slice(colon + 1)
    const baseKey = key.split(";")[0]

    // EXDATE can appear multiple times and can be comma-separated
    if (baseKey === "EXDATE") {
      exdates.push(...val.split(","))
      if (key.includes("TZID=")) {
        exdateTzid = key.split("TZID=")[1].split(";")[0]
      }
      continue
    }

    // Store only first occurrence per key (handles DTSTART vs DTSTART;TZID=...)
    if (!cur[baseKey]) {
      cur[baseKey] = val
      cur[`__param_${baseKey}`] = key
    }
  }

  return events
}

interface RRuleData {
  freq: string
  interval: number
  byday: string[] | null
  until: string | null   // raw ICS UNTIL value
  count: number | null
}

function parseRRule(rrule: string): RRuleData {
  const parts = Object.fromEntries(rrule.split(";").map(p => {
    const eq = p.indexOf("=")
    return [p.slice(0, eq), p.slice(eq + 1)]
  }))
  return {
    freq: parts["FREQ"] ?? "WEEKLY",
    interval: parseInt(parts["INTERVAL"] ?? "1"),
    byday: parts["BYDAY"] ? parts["BYDAY"].split(",").map(d => d.replace(/^[+-]?\d+/, "")) : null,
    until: parts["UNTIL"] ?? null,
    count: parts["COUNT"] ? parseInt(parts["COUNT"]) : null,
  }
}

// Returns the occurrence start Date if a recurring event falls on targetDateStr, else null
function recurringOccurrenceStart(ev: ParsedVEvent, rrule: RRuleData, targetDateStr: string): Date | null {
  const tzid = ev.dtStartKey.includes("TZID=")
    ? ev.dtStartKey.split("TZID=")[1].split(";")[0]
    : "Europe/Berlin"

  const startUTC = icsToUTC(ev.dtStartVal, tzid)
  const startDateStr = berlinDateStr(startUTC)

  if (targetDateStr < startDateStr) return null

  // Check UNTIL
  if (rrule.until) {
    const untilVal = rrule.until.length === 8 ? rrule.until + "T235959Z" : rrule.until
    const untilTzid = rrule.until.endsWith("Z") ? "UTC" : tzid
    const untilDate = icsToUTC(untilVal, untilTzid)
    if (new Date(targetDateStr + "T12:00:00Z") > untilDate) return null
  }

  const interval = rrule.interval
  const startMs = new Date(startDateStr + "T12:00:00Z").getTime()
  const targetMs = new Date(targetDateStr + "T12:00:00Z").getTime()
  const daysDiff = Math.round((targetMs - startMs) / 86400000)

  let occurs = false

  if (rrule.freq === "DAILY") {
    occurs = daysDiff % interval === 0
  } else if (rrule.freq === "WEEKLY") {
    const targetDow = dowFromDateStr(targetDateStr)
    const weeksDiff = Math.round(daysDiff / 7)

    if (rrule.byday) {
      if (!rrule.byday.includes(targetDow)) return null
      occurs = weeksDiff % interval === 0
    } else {
      const startDow = dowFromDateStr(startDateStr)
      if (targetDow !== startDow) return null
      occurs = weeksDiff % interval === 0
    }
  } else if (rrule.freq === "MONTHLY") {
    const [sy, sm, sd] = startDateStr.split("-").map(Number)
    const [ty, tm, td] = targetDateStr.split("-").map(Number)
    if (sd !== td) return null
    const monthsDiff = (ty - sy) * 12 + (tm - sm)
    occurs = monthsDiff % interval === 0
  } else if (rrule.freq === "YEARLY") {
    const [sy, sm, sd] = startDateStr.split("-").map(Number)
    const [ty, tm, td] = targetDateStr.split("-").map(Number)
    if (sm !== tm || sd !== td) return null
    occurs = (ty - sy) % interval === 0
  }

  if (!occurs) return null

  // Build occurrence datetime: same time as DTSTART but on targetDateStr
  const datePart = targetDateStr.replace(/-/g, "")
  const timePart = ev.dtStartVal.length > 8 ? ev.dtStartVal.slice(8) : ""
  return icsToUTC(datePart + timePart, tzid)
}

function isExcluded(ev: ParsedVEvent, todayStr: string): boolean {
  return ev.exdates.some(exdate => {
    try {
      if (exdate.length === 8) {
        // DATE form: YYYYMMDD
        return exdate.slice(0, 4) + "-" + exdate.slice(4, 6) + "-" + exdate.slice(6, 8) === todayStr
      }
      return berlinDateStr(icsToUTC(exdate, ev.exdateTzid)) === todayStr
    } catch {
      return false
    }
  })
}

function buildTodayEvents(parsed: ParsedVEvent[], todayStr: string): CalendarEvent[] {
  const results: CalendarEvent[] = []

  for (const ev of parsed) {
    const tzid = ev.dtStartKey.includes("TZID=")
      ? ev.dtStartKey.split("TZID=")[1].split(";")[0]
      : "Europe/Berlin"

    const allDay = ev.dtStartKey.includes("VALUE=DATE") || ev.dtStartVal.length === 8

    if (allDay) {
      const startDateStr = ev.dtStartVal.slice(0, 4) + "-" + ev.dtStartVal.slice(4, 6) + "-" + ev.dtStartVal.slice(6, 8)
      if (startDateStr !== todayStr) continue

      const y = parseInt(ev.dtStartVal.slice(0, 4))
      const mo = parseInt(ev.dtStartVal.slice(4, 6)) - 1
      const d = parseInt(ev.dtStartVal.slice(6, 8))
      const start = new Date(Date.UTC(y, mo, d))
      let end: Date
      if (ev.dtEndVal) {
        const ey = parseInt(ev.dtEndVal.slice(0, 4))
        const emo = parseInt(ev.dtEndVal.slice(4, 6)) - 1
        const ed = parseInt(ev.dtEndVal.slice(6, 8))
        end = new Date(Date.UTC(ey, emo, ed))
      } else {
        end = new Date(start.getTime() + 86400000)
      }

      results.push({ id: ev.uid, summary: ev.summary, start: start.toISOString(), end: end.toISOString(), allDay: true, location: ev.location })
      continue
    }

    // Timed event
    const startUTC = icsToUTC(ev.dtStartVal, tzid)
    const startDateStr = berlinDateStr(startUTC)

    let occurrenceStart: Date | null = null

    if (startDateStr === todayStr) {
      occurrenceStart = startUTC
    } else if (ev.rrule) {
      occurrenceStart = recurringOccurrenceStart(ev, parseRRule(ev.rrule), todayStr)
    }

    if (!occurrenceStart) continue
    if (isExcluded(ev, todayStr)) continue

    // Compute occurrence end by preserving duration
    const endTzid = ev.dtEndKey.includes("TZID=") ? ev.dtEndKey.split("TZID=")[1].split(";")[0] : tzid
    const origEnd = ev.dtEndVal ? icsToUTC(ev.dtEndVal, endTzid) : new Date(startUTC.getTime() + 3600000)
    const duration = origEnd.getTime() - startUTC.getTime()
    const occurrenceEnd = new Date(occurrenceStart.getTime() + duration)

    results.push({
      id: ev.uid + (ev.rrule ? "_" + todayStr : ""),
      summary: ev.summary,
      start: occurrenceStart.toISOString(),
      end: occurrenceEnd.toISOString(),
      allDay: false,
      location: ev.location,
    })
  }

  return results
}

export async function GET() {
  const url = process.env.GOOGLE_CALENDAR_ICS_URL
  if (!url) return NextResponse.json([])

  try {
    const res = await fetch(url, { cache: "no-store" })
    if (!res.ok) return NextResponse.json([])
    const text = await res.text()
    const parsed = parseICS(text)

    const todayStr = berlinDateStr(new Date())
    const todays = buildTodayEvents(parsed, todayStr)

    todays.sort((a, b) => {
      if (a.allDay && !b.allDay) return -1
      if (!a.allDay && b.allDay) return 1
      return new Date(a.start).getTime() - new Date(b.start).getTime()
    })

    return NextResponse.json(todays)
  } catch (e) {
    console.error("Calendar fetch error:", e)
    return NextResponse.json([])
  }
}
