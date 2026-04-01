"use client"

import { useCallback, useEffect, useState } from "react"

const COLS = 7
const ROWS = 6

type Cell = "" | "Sebastian" | "Tina"

interface C4Game {
  id: string
  board: string
  currentPlayer: string
  winner: string | null
  status: string
  lastMove: number | null
  messages: string // JSON: { player, text, ts }[]
}

type ChatMsg = { player: string; text: string; ts: string }

interface Scores {
  Sebastian: number
  Tina: number
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
  const [scores, setScores] = useState<Scores | null>(null)
  const [open, setOpen] = useState(false)
  const [dropping, setDropping] = useState(false)
  const [chatText, setChatText] = useState("")

  const loadScores = useCallback(async () => {
    const res = await fetch("/api/connect4/scores")
    if (res.ok) setScores(await res.json())
  }, [])

  const load = useCallback(async () => {
    const res = await fetch("/api/connect4")
    if (res.ok) setGame(await res.json())
  }, [])

  useEffect(() => { load(); loadScores() }, [load, loadScores])

  useEffect(() => {
    const es = new EventSource("/api/events")
    es.onopen = () => load()
    es.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      if (msg.type !== "connect4") return
      const p = msg.payload
      if (p.type === "move" || p.type === "new" || p.type === "win" || p.type === "chat") {
        setGame(p.game)
        if (p.type === "win") loadScores()
      }
    }
    return () => es.close()
  }, [load, loadScores])

  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === "visible") { load(); loadScores() } }
    document.addEventListener("visibilitychange", onVisible)
    return () => document.removeEventListener("visibilitychange", onVisible)
  }, [load, loadScores])

  async function startGame() {
    let excludeEndpoint: string | undefined
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      excludeEndpoint = sub?.endpoint
    } catch { /* push not available */ }
    const res = await fetch("/api/connect4", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ excludeEndpoint }),
    })
    if (res.ok) setGame(await res.json())
  }

  async function dropInCol(col: number) {
    if (!game || game.status !== "active" || dropping) return
    setDropping(true)
    let excludeEndpoint: string | undefined
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      excludeEndpoint = sub?.endpoint
    } catch { /* push not available */ }
    const res = await fetch("/api/connect4/move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ col, excludeEndpoint }),
    })
    setDropping(false)
    if (res.ok) {
      const data = await res.json()
      setGame(data.game)
      if (data.game.status === "finished") loadScores()
    }
  }

  async function sendC4Chat() {
    if (!chatText.trim()) return
    const res = await fetch("/api/connect4/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: chatText.trim() }),
    })
    if (res.ok) { setGame(await res.json()); setChatText("") }
  }

  const board: Cell[] = game ? JSON.parse(game.board) : Array(COLS * ROWS).fill("")
  const lastMove = game?.lastMove ?? null

  const statusText = !game
    ? "Kein Spiel aktiv"
    : game.status === "finished"
    ? (game.winner === "draw" ? "Unentschieden! 🤝" : `${game.winner} gewinnt! 🎉`)
    : `${game.currentPlayer} ist am Zug`

  function MiniCell({ cell, idx }: { cell: Cell; idx: number }) {
    const isLast = lastMove === idx && cell !== ""
    return (
      <div className={`w-3 h-3 rounded-full ${cell ? PLAYER_BG[cell] : "bg-gray-200"} ${isLast ? "ring-1 ring-white ring-offset-1 ring-offset-transparent" : ""}`} />
    )
  }

  function BigCell({ cell, idx }: { cell: Cell; idx: number }) {
    const isLast = lastMove === idx && cell !== ""
    return (
      <div className={`w-9 h-9 rounded-full transition-all ${
        cell
          ? `${PLAYER_BG[cell]} shadow-inner${isLast ? " ring-2 ring-white ring-offset-2 ring-offset-indigo-700" : ""}`
          : "bg-indigo-900/70"
      }`} />
    )
  }

  const miniBoard = (
    <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)`, display: "inline-grid" }}>
      {Array.from({ length: ROWS * COLS }, (_, i) => (
        <MiniCell key={i} cell={board[i]} idx={i} />
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
          {game && game.status === "active" && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${PLAYER_STATUS_BG[game.currentPlayer] ?? "bg-gray-100 text-gray-600"}`}>
              {game.currentPlayer} am Zug
            </span>
          )}
        </div>
        <div className="flex justify-center mb-2">{miniBoard}</div>
        <p className={`text-xs text-center font-medium ${game?.status === "finished" ? "text-green-600" : "text-gray-500"}`}>
          {statusText}
        </p>
        {scores && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-center gap-4">
            <span className="text-xs">🏆</span>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span className="text-sm font-bold text-blue-600">{scores.Sebastian}</span>
            </div>
            <span className="text-xs text-gray-300">:</span>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-rose-500">{scores.Tina}</span>
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            </div>
          </div>
        )}
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
                  game.status === "finished"
                    ? "bg-green-50 text-green-700"
                    : (PLAYER_STATUS_BG[game.currentPlayer] ?? "bg-gray-50 text-gray-700")
                }`}>
                  {statusText}
                </div>

                {/* Column buttons */}
                {game.status === "active" && (
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
                <div className="flex justify-center">
                  <div className="bg-indigo-700 rounded-xl p-2">
                    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)`, display: "inline-grid" }}>
                      {Array.from({ length: ROWS * COLS }, (_, i) => (
                        <BigCell key={i} cell={board[i]} idx={i} />
                      ))}
                    </div>
                  </div>
                </div>

                {/* New game button after finished */}
                {game.status === "finished" && (
                  <div className="mt-4 flex justify-center">
                    <button
                      onClick={startGame}
                      className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-indigo-700"
                    >
                      Neues Spiel starten 🎲
                    </button>
                  </div>
                )}

                {/* Chat */}
                {(() => {
                  const chatMessages: ChatMsg[] = JSON.parse(game.messages ?? "[]")
                  const chatSender = game.currentPlayer === "Sebastian" ? "Tina" : "Sebastian"
                  return (
                    <div className="border-t border-gray-100 pt-3 mt-3">
                      <div className="max-h-28 overflow-y-auto space-y-1.5 mb-2">
                        {chatMessages.length === 0
                          ? <p className="text-[11px] text-gray-300 text-center italic">Noch keine Nachrichten</p>
                          : chatMessages.map((m, i) => (
                            <div key={i} className="flex items-start gap-1.5">
                              <span className={`text-[11px] font-semibold shrink-0 ${m.player === "Sebastian" ? "text-blue-600" : "text-rose-500"}`}>
                                {m.player}:
                              </span>
                              <span className="text-[11px] text-gray-600 break-words min-w-0">{m.text}</span>
                            </div>
                          ))
                        }
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={chatText}
                          onChange={e => setChatText(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") sendC4Chat() }}
                          placeholder={`Nachricht als ${chatSender}…`}
                          className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                        />
                        <button
                          onClick={sendC4Chat}
                          disabled={!chatText.trim()}
                          className="text-xs px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-gray-600 disabled:opacity-40 shrink-0"
                        >
                          Senden
                        </button>
                      </div>
                    </div>
                  )
                })()}

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
