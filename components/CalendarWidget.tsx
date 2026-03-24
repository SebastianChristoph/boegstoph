"use client"

import { useEffect, useState } from "react"

interface CalendarEvent {
  id: string
  summary: string
  start: string
  end: string
  allDay: boolean
  location?: string
}

interface DayData {
  dateStr: string
  dayLabel: string
  events: CalendarEvent[]
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" })
}

interface Props {
  variant?: "default" | "dark"
  days?: number
}

export default function CalendarWidget({ variant = "default", days = 1 }: Props) {
  const [dayData, setDayData] = useState<DayData[] | null>(null)

  useEffect(() => {
    const url = days > 1 ? `/api/calendar/upcoming?days=${days}` : "/api/calendar/today"
    fetch(url)
      .then(r => r.json())
      .then(data => {
        if (days > 1) {
          setDayData(data as DayData[])
        } else {
          setDayData([{ dateStr: "", dayLabel: "Heute", events: data as CalendarEvent[] }])
        }
      })
      .catch(() => setDayData([]))
  }, [days])

  const dark = variant === "dark"

  if (dayData === null) {
    return <div className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"} text-center py-2`}>Lade Termine…</div>
  }

  function EventList({ events }: { events: CalendarEvent[] }) {
    if (events.length === 0) {
      return <div className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"} py-1`}>Keine Termine</div>
    }
    return (
      <ul className="space-y-1.5">
        {events.map(ev => (
          <li key={ev.id} className={`rounded-xl px-3 py-2 ${dark ? "bg-gray-800" : "bg-gray-50 border border-gray-100"}`}>
            <div className={`text-xs font-medium leading-snug ${dark ? "text-white" : "text-gray-800"}`}>{ev.summary}</div>
            <div className={`text-[11px] mt-0.5 ${dark ? "text-gray-400" : "text-gray-500"}`}>
              {ev.allDay ? "Ganztägig" : `${formatTime(ev.start)} – ${formatTime(ev.end)}`}
            </div>
            {ev.location && (
              <div className={`text-[11px] truncate ${dark ? "text-gray-500" : "text-gray-400"}`}>📍 {ev.location}</div>
            )}
          </li>
        ))}
      </ul>
    )
  }

  if (days === 1) {
    const events = dayData[0]?.events ?? []
    if (events.length === 0) {
      return <div className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"} text-center py-2`}>Keine Termine heute</div>
    }
    return <EventList events={events} />
  }

  return (
    <div className="space-y-4">
      {dayData.map(day => (
        <div key={day.dateStr}>
          <div className={`text-[11px] font-semibold uppercase tracking-wide mb-2 ${dark ? "text-gray-400" : "text-gray-400"}`}>
            {day.dayLabel}
          </div>
          <EventList events={day.events} />
        </div>
      ))}
    </div>
  )
}
