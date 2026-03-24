"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import CalendarWidget from "@/components/CalendarWidget"
import UpcomingCalendar from "@/components/UpcomingCalendar"

const C4_COLS = 7
const C4_ROWS = 6
const C4_PLAYER_BG: Record<string, string> = { Sebastian: "bg-blue-500", Tina: "bg-rose-500" }
const C4_PLAYER_EMOJI: Record<string, string> = { Sebastian: "🔵", Tina: "🔴" }

interface C4Game {
  currentPlayer: string
  board: string
  status: string
  winner: string | null
}

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
  const [c4Game, setC4Game] = useState<C4Game | null>(null)

  const loadPhotos = useCallback(async () => {
    const res = await fetch("/api/photos")
    if (res.ok) setPhotos(await res.json())
  }, [])

  const loadC4 = useCallback(async () => {
    const res = await fetch("/api/connect4")
    if (res.ok) setC4Game(await res.json())
  }, [])

  useEffect(() => { loadPhotos(); loadC4() }, [loadPhotos, loadC4])

  // live updates
  useEffect(() => {
    const es = new EventSource("/api/events")
    es.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      if (msg.type === "photos") loadPhotos()
      if (msg.type === "connect4") {
        const p = msg.payload
        if (p.type === "win") setC4Game(p.nextGame)
        else setC4Game(p.game)
      }
    }
    return () => es.close()
  }, [loadPhotos, loadC4])

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
  const c4Board: string[] = c4Game ? JSON.parse(c4Game.board) : Array(C4_COLS * C4_ROWS).fill("")
  const c4Status = !c4Game
    ? null
    : c4Game.status === "finished"
    ? (c4Game.winner === "draw" ? "Unentschieden" : `${c4Game.winner} gewinnt!`)
    : `${c4Game.currentPlayer} ${C4_PLAYER_EMOJI[c4Game.currentPlayer] ?? ""}`

  function C4MiniBoard({ cellPx }: { cellPx: number }) {
    return (
      <div style={{ display: "inline-grid", gridTemplateColumns: `repeat(${C4_COLS}, ${cellPx}px)`, gap: 1 }}>
        {c4Board.map((cell, i) => (
          <div key={i} style={{ width: cellPx, height: cellPx }} className={`rounded-full ${cell ? (C4_PLAYER_BG[cell] ?? "bg-gray-400") : "bg-gray-700"}`} />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-black overflow-hidden select-none">

      {/* ── Photo area ─────────────────────────────────────────── */}
      <div className="relative flex-1 min-h-0">
        {photo ? (
          <div
            key={photo.filename}
            className="absolute inset-0"
            style={{ opacity: visible ? 1 : 0, transition: `opacity ${FADE_MS}ms ease-in-out` }}
          >
            {/* Blurred background fill — covers letterbox bars */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/photos/file/${photo.filename}`}
              alt=""
              className="absolute inset-0 w-full h-full object-cover scale-110"
              style={{ filter: "blur(24px)", opacity: 0.7 }}
            />
            {/* Full photo, never cropped */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/photos/file/${photo.filename}`}
              alt=""
              className="absolute inset-0 w-full h-full object-contain"
            />
          </div>
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

        {/* 4-Gewinnt mini preview */}
        {c4Status && (
          <Link href="/dashboard" className="flex flex-col items-center gap-2 group shrink-0">
            <div className="flex items-center gap-1.5 self-start">
              <span className="text-sm">🎮</span>
              <span className="text-[11px] text-gray-500 group-hover:text-gray-200 transition-colors tracking-wide uppercase">4-Gewinnt</span>
            </div>
            <C4MiniBoard cellPx={5} />
            <span className="text-[11px] text-gray-400 group-hover:text-gray-200 transition-colors text-center">{c4Status}</span>
          </Link>
        )}

        {/* Divider before calendar */}
        {c4Status && !showFiveDay && <div className="border-t border-gray-800 shrink-0" />}

        {/* Calendar widget — nur in portrait, in landscape ist die 5-Tage-Vorschau schon im Bild */}
        {!showFiveDay && (
          <div className="flex-1 min-h-0">
            <div className="flex items-center gap-1.5 mb-3">
              <span className="text-sm">📅</span>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Heute</span>
            </div>
            <CalendarWidget variant="dark" />
          </div>
        )}
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
        {c4Status && (
          <Link href="/dashboard" className="ml-auto flex items-center gap-2 active:opacity-70">
            <C4MiniBoard cellPx={4} />
            <span className="text-xs text-gray-400">{c4Status}</span>
          </Link>
        )}
      </div>

    </div>
  )
}
