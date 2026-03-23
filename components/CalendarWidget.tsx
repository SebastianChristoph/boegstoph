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

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" })
}

interface Props {
  /** "default" = light card for dashboard, "dark" = for home screen dark panel */
  variant?: "default" | "dark"
}

export default function CalendarWidget({ variant = "default" }: Props) {
  const [events, setEvents] = useState<CalendarEvent[] | null>(null)

  useEffect(() => {
    fetch("/api/calendar/today")
      .then((r) => r.json())
      .then(setEvents)
      .catch(() => setEvents([]))
  }, [])

  const dark = variant === "dark"

  if (events === null) {
    return (
      <div className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"} text-center py-2`}>
        Lade Termine…
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"} text-center py-2`}>
        Keine Termine heute
      </div>
    )
  }

  return (
    <ul className="space-y-2">
      {events.map((ev) => (
        <li key={ev.id} className={`rounded-xl px-3 py-2 ${dark ? "bg-gray-800" : "bg-gray-50 border border-gray-100"}`}>
          <div className={`text-xs font-medium leading-snug ${dark ? "text-white" : "text-gray-800"}`}>
            {ev.summary}
          </div>
          <div className={`text-[11px] mt-0.5 ${dark ? "text-gray-400" : "text-gray-500"}`}>
            {ev.allDay ? "Ganztägig" : `${formatTime(ev.start)} – ${formatTime(ev.end)}`}
          </div>
          {ev.location && (
            <div className={`text-[11px] truncate ${dark ? "text-gray-500" : "text-gray-400"}`}>
              📍 {ev.location}
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}
