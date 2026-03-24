"use client"

import { useCallback, useEffect, useRef, useState } from "react"

const COLS = 7
const ROWS = 6

type Cell = "" | "Sebastian" | "Tina"

interface C4Game {
  id: string
  board: string
  currentPlayer: string
  winner: string | null
  status: string
}

const PLAYER_BG: Record<string, string> = {
  Sebastian: "bg-blue-500",
  Tina: "bg-rose-500",
}
const PLAYER_RING: Record<string, string> = {
  Sebastian: "ring-blue-200",
  Tina: "ring-rose-200",
}
const PLAYER_STATUS_BG: Record<string, string> = {
  Sebastian: "bg-blue-50 text-blue-700",
  Tina: "bg-rose-50 text-rose-700",
}

export default function Connect4Widget() {
  const [game, setGame] = useState<C4Game | null | undefined>(undefined)
  const [open, setOpen] = useState(false)
  const [winBanner, setWinBanner] = useState<string | null>(null)
  const [dropping, setDropping] = useState(false)
  const nextGameRef = useRef<C4Game | null>(null)

  const load = useCallback(async () => {
    const res = await fetch("/api/connect4")
    if (res.ok) setGame(await res.json())
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const es = new EventSource("/api/events")
    es.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      if (msg.type !== "connect4") return
      const p = msg.payload
      if (p.type === "move" || p.type === "new") {
        setGame(p.game)
      } else if (p.type === "win") {
        setGame(p.game)
        nextGameRef.current = p.nextGame
        const label = p.winner === "draw" ? "Unentschieden! 🤝" : `${p.winner} gewinnt! 🎉`
        setWinBanner(label)
        setTimeout(() => {
          setGame(nextGameRef.current)
          setWinBanner(null)
          nextGameRef.current = null
        }, 3500)
      }
    }
    return () => es.close()
  }, [])

  async function startGame() {
    const res = await fetch("/api/connect4", { method: "POST" })
    if (res.ok) setGame(await res.json())
  }

  async function dropInCol(col: number) {
    if (!game || game.status !== "active" || dropping || winBanner) return
    setDropping(true)
    const res = await fetch("/api/connect4/move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ col }),
    })
    setDropping(false)
    if (res.ok) {
      const data = await res.json()
      setGame(data.game)
      if (data.nextGame) {
        nextGameRef.current = data.nextGame
        const w = data.game.winner === "draw" ? "Unentschieden! 🤝" : `${data.game.winner} gewinnt! 🎉`
        setWinBanner(w)
        setTimeout(() => {
          setGame(nextGameRef.current)
          setWinBanner(null)
          nextGameRef.current = null
        }, 3500)
      }
    }
  }

  const board: Cell[] = game ? JSON.parse(game.board) : Array(COLS * ROWS).fill("")

  const statusText = !game
    ? "Kein Spiel aktiv"
    : winBanner
    ? winBanner
    : game.status === "finished"
    ? (game.winner === "draw" ? "Unentschieden" : `${game.winner} hat gewonnen!`)
    : `${game.currentPlayer} ist am Zug`

  function MiniCell({ cell }: { cell: Cell }) {
    return (
      <div className={`w-3 h-3 rounded-full ${cell ? PLAYER_BG[cell] : "bg-gray-200"}`} />
    )
  }

  function BigCell({ cell }: { cell: Cell }) {
    return (
      <div className={`w-9 h-9 rounded-full transition-all ${cell ? `${PLAYER_BG[cell]} shadow-sm` : "bg-gray-100 border border-gray-200"}`} />
    )
  }

  const miniBoard = (
    <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)`, display: "inline-grid" }}>
      {Array.from({ length: ROWS * COLS }, (_, i) => (
        <MiniCell key={i} cell={board[i]} />
      ))}
    </div>
  )

  const fullBoard = (
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)`, display: "inline-grid" }}>
      {Array.from({ length: ROWS * COLS }, (_, i) => (
        <BigCell key={i} cell={board[i]} />
      ))}
    </div>
  )

  if (game === undefined) return null

  return (
    <>
      {/* Dashboard card */}
      <div
        onClick={() => setOpen(true)}
        className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 cursor-pointer active:scale-95 transition-transform select-none"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎮</span>
            <h2 className="text-sm font-semibold text-gray-700">4-Gewinnt</h2>
          </div>
          {game && game.status === "active" && !winBanner && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${PLAYER_STATUS_BG[game.currentPlayer] ?? "bg-gray-100 text-gray-600"}`}>
              {game.currentPlayer} am Zug
            </span>
          )}
        </div>
        <div className="flex justify-center mb-2">{miniBoard}</div>
        <p className={`text-xs text-center font-medium ${winBanner ? "text-green-600" : "text-gray-500"}`}>
          {statusText}
        </p>
      </div>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900 text-lg">🎮 4-Gewinnt</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">✕</button>
            </div>

            {!game ? (
              <div className="text-center py-8">
                <p className="text-gray-500 text-sm mb-5">Noch kein Spiel gestartet.</p>
                <button
                  onClick={startGame}
                  className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-indigo-700"
                >
                  Spiel starten 🎲
                </button>
              </div>
            ) : (
              <>
                {/* Status bar */}
                <div className={`text-center text-sm font-semibold mb-4 py-2.5 rounded-xl transition-all ${
                  winBanner
                    ? "bg-green-50 text-green-700"
                    : game.status === "active"
                    ? (PLAYER_STATUS_BG[game.currentPlayer] ?? "bg-gray-50 text-gray-700")
                    : "bg-gray-50 text-gray-600"
                }`}>
                  {winBanner ?? statusText}
                </div>

                {/* Column buttons */}
                {game.status === "active" && !winBanner && (
                  <div className="flex gap-1 mb-1 justify-center">
                    {Array.from({ length: COLS }, (_, c) => {
                      const colFull = board[c] !== "" // top row of col is filled → full
                      return (
                        <button
                          key={c}
                          onClick={() => dropInCol(c)}
                          disabled={dropping || colFull}
                          className={`w-9 h-7 flex items-center justify-center rounded text-sm font-bold transition-colors
                            ${colFull ? "text-gray-200 cursor-not-allowed" : `${PLAYER_RING[game.currentPlayer] ?? ""} ring-2 ${PLAYER_BG[game.currentPlayer] ?? "bg-gray-400"} text-white hover:opacity-80 disabled:opacity-50`}`}
                        >
                          ▼
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Board */}
                <div className="relative flex justify-center">
                  <div className="bg-indigo-700 rounded-xl p-2">
                    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)`, display: "inline-grid" }}>
                      {Array.from({ length: ROWS * COLS }, (_, i) => (
                        <div key={i} className={`w-9 h-9 rounded-full transition-all ${board[i] ? `${PLAYER_BG[board[i]]} shadow-inner` : "bg-indigo-900/70"}`} />
                      ))}
                    </div>
                  </div>
                  {winBanner && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/85 rounded-xl">
                      <div className="text-center">
                        <p className="text-xl font-bold text-gray-900">{winBanner}</p>
                        <p className="text-xs text-gray-400 mt-1">Neues Spiel startet gleich…</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Legend */}
                <div className="flex justify-center gap-5 mt-3 text-xs text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    Sebastian
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-rose-500" />
                    Tina
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
