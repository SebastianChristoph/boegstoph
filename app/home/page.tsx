"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import CalendarWidget from "@/components/CalendarWidget"
import UpcomingCalendar from "@/components/UpcomingCalendar"

type LayoutMode = "mobile" | "tablet-portrait" | "tablet-landscape" | "desktop"

function useLayoutMode(): LayoutMode {
  const [mode, setMode] = useState<LayoutMode>("mobile")
  useEffect(() => {
    function detect() {
      const w = window.innerWidth
      const h = window.innerHeight
      if (w < 768) { setMode("mobile"); return }
      if (w < 1200) { setMode(w > h ? "tablet-landscape" : "tablet-portrait"); return }
      setMode("desktop")
    }
    detect()
    window.addEventListener("resize", detect)
    window.addEventListener("orientationchange", detect)
    return () => {
      window.removeEventListener("resize", detect)
      window.removeEventListener("orientationchange", detect)
    }
  }, [])
  return mode
}

interface Photo {
  id: string
  filename: string
  originalName: string
}

const INTERVAL_MS = 7000
const FADE_MS = 800

export default function HomeScreen() {
  const layoutMode = useLayoutMode()
  const showFiveDay = layoutMode === "tablet-landscape" || layoutMode === "desktop"
  const [photos, setPhotos] = useState<Photo[]>([])
  const [idx, setIdx] = useState(0)
  const [visible, setVisible] = useState(true)

  const loadPhotos = useCallback(async () => {
    const res = await fetch("/api/photos")
    if (res.ok) setPhotos(await res.json())
  }, [])

  useEffect(() => { loadPhotos() }, [loadPhotos])

  // live updates when photos are added/removed
  useEffect(() => {
    const es = new EventSource("/api/events")
    es.onmessage = (e) => {
      const { type } = JSON.parse(e.data)
      if (type === "photos") loadPhotos()
    }
    return () => es.close()
  }, [loadPhotos])

  // slideshow timer
  useEffect(() => {
    if (photos.length <= 1) return
    const timer = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setIdx((i) => (i + 1) % photos.length)
        setVisible(true)
      }, FADE_MS)
    }, INTERVAL_MS)
    return () => clearInterval(timer)
  }, [photos.length])

  // reset index when photos reload
  useEffect(() => {
    setIdx((i) => (photos.length > 0 ? i % photos.length : 0))
  }, [photos])

  const photo = photos[idx]

  return (
    <div className="flex flex-col md:flex-row h-screen bg-black overflow-hidden select-none">

      {/* ── Photo area ─────────────────────────────────────────── */}
      <div className="relative flex-1 min-h-0">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={photo.filename}
            src={`/api/photos/file/${photo.filename}`}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              opacity: visible ? 1 : 0,
              transition: `opacity ${FADE_MS}ms ease-in-out`,
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-gray-600">
              <div className="text-7xl mb-4">📷</div>
              <p className="text-xl font-light">Noch keine Fotos</p>
              <p className="text-sm mt-2 text-gray-700">
                Im Dashboard unter „Einstellungen" hochladen
              </p>
            </div>
          </div>
        )}

        {/* dot indicators */}
        {photos.length > 1 && (
          <div className="absolute bottom-[88px] left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {photos.map((_, i) => (
              <button
                key={i}
                onClick={() => { setIdx(i); setVisible(true) }}
                className="h-1.5 rounded-full bg-white transition-all duration-300"
                style={{ width: i === idx ? 24 : 6, opacity: i === idx ? 1 : 0.35 }}
              />
            ))}
          </div>
        )}

        {/* Calendar overlay — 5-day for desktop/tablet-landscape, today for mobile/tablet-portrait */}
        <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 via-black/50 to-transparent pt-10 pb-3 px-4">
          {showFiveDay ? <UpcomingCalendar days={5} /> : <CalendarWidget variant="dark" />}
        </div>
      </div>

      {/* ── Side panel (tablet / desktop) ──────────────────────── */}
      <aside className="hidden md:flex flex-col py-8 px-4 gap-6 bg-gray-950 shrink-0 overflow-y-auto"
        style={{ width: 220 }}>

        {/* Dashboard button */}
        <Link href="/dashboard" className="flex flex-col items-center gap-2 group shrink-0">
          <div className="w-14 h-14 rounded-2xl overflow-hidden ring-2 ring-transparent group-hover:ring-[#4a88c2] transition-all duration-200 shadow-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/apple-touch-icon.png" alt="Dashboard" className="w-full h-full" />
          </div>
          <span className="text-[11px] text-gray-500 group-hover:text-gray-200 transition-colors tracking-wide uppercase">
            Dashboard
          </span>
        </Link>

        {/* Divider */}
        <div className="border-t border-gray-800 shrink-0" />

        {/* Calendar widget */}
        <div className="flex-1 min-h-0">
          <div className="flex items-center gap-1.5 mb-3">
            <span className="text-sm">📅</span>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Heute</span>
          </div>
          <CalendarWidget variant="dark" />
        </div>
      </aside>

      {/* ── Bottom bar (mobile) ─────────────────────────────────── */}
      <div className="md:hidden flex items-center gap-4 px-6 py-3 bg-black/80 backdrop-blur-sm shrink-0">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-11 h-11 rounded-xl overflow-hidden ring-2 ring-transparent group-active:ring-[#4a88c2] transition-all">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/apple-touch-icon.png" alt="Dashboard" className="w-full h-full" />
          </div>
          <span className="text-sm text-gray-400">Dashboard</span>
        </Link>
      </div>

    </div>
  )
}
