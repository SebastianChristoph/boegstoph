"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  CATEGORIES, UPPER_CATEGORIES, LOWER_CATEGORIES,
  CATEGORY_LABELS,
  calcScore, calcUpperTotal, calcTotal,
  type Category, type ScoreCard,
} from "@/lib/kniffel"

interface KniffelGameData {
  id: string
  status: string
  currentPlayer: string
  scores: string   // JSON: { Sebastian: ScoreCard, Tina: ScoreCard }
  dice: string     // JSON: number[5]
  held: string     // JSON: boolean[5]
  rollsLeft: number
  lastMove: string | null  // JSON: { player, category, score }
}

type Scores = { Sebastian: ScoreCard; Tina: ScoreCard }

const DICE_FACES = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"]

// ── Die ────────────────────────────────────────────────────────────────────────

function Die({ value, held, canToggle, rolling, onClick }: {
  value: number; held: boolean; canToggle: boolean; rolling?: boolean; onClick?: () => void
}) {
  if (value === 0 && !rolling) {
    return (
      <div className="w-11 h-11 rounded-xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-300 text-xl select-none">
        ?
      </div>
    )
  }
  const isAnimating = rolling && !held
  return (
    <button
      onClick={onClick}
      disabled={!canToggle || !!rolling}
      title={held ? "Festgehalten – klicken zum Lösen" : canToggle ? "Klicken zum Festhalten" : ""}
      className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl select-none
        ${isAnimating ? "bg-indigo-100 border-2 border-indigo-300 shadow-md animate-bounce" : "transition-all"}
        ${!isAnimating && held ? "bg-amber-400 text-white border-2 border-amber-500 shadow-inner scale-95 cursor-pointer" : ""}
        ${!isAnimating && !held && canToggle ? "bg-white border-2 border-gray-200 text-gray-800 shadow hover:border-primary-400 hover:shadow-md active:scale-95 cursor-pointer" : ""}
        ${!isAnimating && !held && !canToggle ? "bg-white border-2 border-gray-200 text-gray-800 shadow cursor-default" : ""}
      `}
    >
      {value > 0 ? DICE_FACES[value] : "🎲"}
    </button>
  )
}

// ── Score cell ─────────────────────────────────────────────────────────────────

function ScoreCell({ value, preview, isAvailable, onClick }: {
  value: number | null
  preview?: number  // calculated score from current dice
  isAvailable: boolean
  onClick?: () => void
}) {
  if (value !== null) {
    return (
      <td className="text-right py-0.5 px-2 text-xs font-medium text-gray-700 w-12">
        {value}
      </td>
    )
  }
  if (isAvailable && preview !== undefined) {
    return (
      <td className="text-right py-0.5 px-1 w-12">
        <button
          onClick={onClick}
          className={`text-xs font-semibold px-1.5 py-0.5 rounded-lg w-full text-right transition-colors
            ${preview > 0
              ? "text-primary-700 bg-primary-50 hover:bg-primary-100 active:bg-primary-200"
              : "text-orange-600 bg-orange-50 hover:bg-orange-100 active:bg-orange-200"
            }`}
        >
          {preview}
        </button>
      </td>
    )
  }
  return <td className="text-right py-0.5 px-2 text-xs text-gray-300 w-12">—</td>
}

// ── Main component ─────────────────────────────────────────────────────────────

interface WinScores { Sebastian: number; Tina: number }

export default function KniffelWidget() {
  const [game, setGame] = useState<KniffelGameData | null | undefined>(undefined)
  const [winScores, setWinScores] = useState<WinScores | null>(null)
  const [open, setOpen] = useState(false)
  const [localHeld, setLocalHeld] = useState<boolean[]>([false, false, false, false, false])
  const [rolling, setRolling] = useState(false)
  const [animDice, setAnimDice] = useState<number[]>([1, 1, 1, 1, 1])
  const animIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [scoring, setScoring] = useState(false)

  const loadScores = useCallback(async () => {
    const res = await fetch("/api/kniffel/scores")
    if (res.ok) setWinScores(await res.json())
  }, [])

  const load = useCallback(async () => {
    const res = await fetch("/api/kniffel")
    if (res.ok) setGame(await res.json())
  }, [])

  useEffect(() => { load(); loadScores() }, [load, loadScores])

  useEffect(() => {
    const es = new EventSource("/api/events")
    es.onopen = () => load()
    es.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      if (msg.type !== "kniffel") return
      setGame(msg.payload.game)
      if (msg.payload.type === "finished") loadScores()
    }
    return () => es.close()
  }, [load])

  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === "visible") { load(); loadScores() } }
    document.addEventListener("visibilitychange", onVisible)
    return () => document.removeEventListener("visibilitychange", onVisible)
  }, [load, loadScores])

  // Reset held when a new turn starts
  useEffect(() => {
    if (game?.rollsLeft === 3) setLocalHeld([false, false, false, false, false])
  }, [game?.id, game?.rollsLeft])

  async function startGame() {
    const res = await fetch("/api/kniffel", { method: "POST" })
    if (res.ok) setGame(await res.json())
  }

  function toggleHeld(i: number) {
    if (!game || game.rollsLeft === 3 || game.rollsLeft === 0) return
    setLocalHeld(h => h.map((v, idx) => idx === i ? !v : v))
  }

  async function roll() {
    if (!game || rolling) return
    setRolling(true)

    const currentDice: number[] = JSON.parse(game.dice)
    animIntervalRef.current = setInterval(() => {
      setAnimDice(localHeld.map((h, i) =>
        h ? (currentDice[i] || 1) : (Math.ceil(Math.random() * 6))
      ))
    }, 80)

    const startTime = Date.now()
    const res = await fetch("/api/kniffel/roll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ held: localHeld }),
    })

    const elapsed = Date.now() - startTime
    if (elapsed < 2000) await new Promise(r => setTimeout(r, 2000 - elapsed))

    if (animIntervalRef.current) { clearInterval(animIntervalRef.current); animIntervalRef.current = null }

    if (res.ok) {
      const data = await res.json()
      setGame(data.game)
      setLocalHeld(JSON.parse(data.game.held))
    }
    setRolling(false)
  }

  async function scoreCategory(category: Category) {
    if (!game || scoring) return
    setScoring(true)
    let excludeEndpoint: string | undefined
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      excludeEndpoint = sub?.endpoint
    } catch { /* push not available */ }
    const res = await fetch("/api/kniffel/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, excludeEndpoint }),
    })
    if (res.ok) {
      const data = await res.json()
      setGame(data.game)
      setLocalHeld([false, false, false, false, false])
    }
    setScoring(false)
  }

  if (game === undefined) return null

  const dice: number[] = game ? JSON.parse(game.dice) : [0, 0, 0, 0, 0]
  const scores: Scores | null = game ? JSON.parse(game.scores) : null
  const player = game?.currentPlayer as "Sebastian" | "Tina" | undefined
  const hasRolled = game ? game.rollsLeft < 3 : false
  const mustScore = game ? game.rollsLeft === 0 : false
  const canRoll = !!game && game.status === "active" && game.rollsLeft > 0
  const canToggleDice = !!game && game.status === "active" && hasRolled && !mustScore
  const canScore = !!game && game.status === "active" && hasRolled
  const isFinished = game?.status === "finished"

  const sebTotal = scores ? calcTotal(scores.Sebastian) : 0
  const tinaTotal = scores ? calcTotal(scores.Tina) : 0

  const statusText = !game
    ? "Kein Spiel aktiv"
    : isFinished
    ? (sebTotal === tinaTotal ? "Unentschieden! 🤝" : `${sebTotal > tinaTotal ? "Sebastian" : "Tina"} gewinnt! 🎉`)
    : mustScore
    ? `${player} muss jetzt werten`
    : `${player} ist am Zug`

  const lastMoveData = game?.lastMove ? JSON.parse(game.lastMove) as { player: string; category: Category; score: number; dice: number[] } : null
  const lastMoveText = lastMoveData && !isFinished && lastMoveData.player !== player
    ? `${lastMoveData.player}: ${CATEGORY_LABELS[lastMoveData.category]} (${lastMoveData.score})`
    : null
  const lastMoveDice = lastMoveData && !isFinished && lastMoveData.player !== player ? lastMoveData.dice : null

  // ── Dashboard card ────────────────────────────────────────────────────────

  const card = (
    <div
      onClick={() => setOpen(true)}
      className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 cursor-pointer active:scale-95 transition-transform select-none"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎲</span>
          <h2 className="text-sm font-semibold text-gray-700">Kniffel</h2>
        </div>
        {game && !isFinished && player && (
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
            player === "Sebastian" ? "bg-blue-50 text-blue-700" : "bg-rose-50 text-rose-700"
          }`}>
            {player} am Zug
          </span>
        )}
      </div>

      {game && scores ? (
        <div className="flex items-center justify-center gap-6 my-2">
          <div className="text-center">
            <div className="flex items-center gap-1.5 mb-1 justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span className="text-[11px] text-gray-500">Sebastian</span>
            </div>
            <span className={`text-2xl font-bold ${isFinished && sebTotal > tinaTotal ? "text-blue-600" : "text-gray-700"}`}>
              {sebTotal}
            </span>
          </div>
          <div className="text-lg font-light text-gray-300">:</div>
          <div className="text-center">
            <div className="flex items-center gap-1.5 mb-1 justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span className="text-[11px] text-gray-500">Tina</span>
            </div>
            <span className={`text-2xl font-bold ${isFinished && tinaTotal > sebTotal ? "text-rose-500" : "text-gray-700"}`}>
              {tinaTotal}
            </span>
          </div>
        </div>
      ) : (
        <p className="text-xs text-gray-400 text-center my-3">Noch kein Spiel gestartet</p>
      )}

      <p className={`text-xs text-center font-medium mt-1 ${isFinished ? "text-green-600" : "text-gray-500"}`}>
        {statusText}
      </p>
      {lastMoveText && (
        <p className="text-[10px] text-center text-gray-400 mt-0.5">
          Letzter Zug: {lastMoveText}{lastMoveDice && <span className="ml-1">{lastMoveDice.map(d => DICE_FACES[d]).join(" ")}</span>}
        </p>
      )}
    </div>
  )

  // ── Modal ─────────────────────────────────────────────────────────────────

  const modal = open && (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
          <h2 className="font-bold text-gray-900 text-lg">🎲 Kniffel</h2>
          <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {!game ? (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm mb-5">Noch kein Spiel gestartet.</p>
              <button onClick={startGame} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-indigo-700">
                Spiel starten 🎲
              </button>
            </div>
          ) : (
            <>
              {/* Status */}
              <div className={`text-center text-sm font-semibold py-2.5 rounded-xl ${
                isFinished
                  ? "bg-green-50 text-green-700"
                  : player === "Sebastian"
                  ? "bg-blue-50 text-blue-700"
                  : "bg-rose-50 text-rose-700"
              }`}>
                {statusText}
                {!isFinished && !mustScore && canRoll && (
                  <span className="text-xs font-normal ml-2 opacity-70">
                    ({game.rollsLeft}× würfeln möglich)
                  </span>
                )}
                {lastMoveText && (
                  <div className="text-xs font-normal opacity-60 mt-0.5">
                    Letzter Zug: {lastMoveText}
                    {lastMoveDice && (
                      <span className="ml-1">{lastMoveDice.map(d => DICE_FACES[d]).join(" ")}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Dice + roll button */}
              {!isFinished && (
                <div className="bg-indigo-50 rounded-2xl p-4">
                  <div className="flex gap-2 justify-center mb-3">
                    {(rolling ? animDice : dice).map((d, i) => (
                      <Die
                        key={i}
                        value={d}
                        held={localHeld[i]}
                        canToggle={canToggleDice}
                        rolling={rolling}
                        onClick={() => toggleHeld(i)}
                      />
                    ))}
                  </div>
                  {canToggleDice && (
                    <p className="text-center text-[11px] text-indigo-400 mb-2">Würfel antippen zum Festhalten</p>
                  )}
                  <button
                    onClick={roll}
                    disabled={!canRoll || rolling}
                    className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all ${
                      canRoll && !rolling
                        ? "bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {rolling ? "Würfle…" : mustScore ? "Erst werten!" : `🎲 Würfeln${game.rollsLeft < 3 ? ` (noch ${game.rollsLeft}×)` : ""}`}
                  </button>
                </div>
              )}

              {/* Scorecard */}
              {scores && (
                <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left py-1.5 px-3 text-[11px] font-semibold text-gray-500">Kategorie</th>
                        <th className="text-right py-1.5 px-2 text-[11px] font-semibold text-blue-600 w-12">Seb</th>
                        <th className="text-right py-1.5 px-2 text-[11px] font-semibold text-rose-500 w-12">Tina</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Upper section */}
                      {UPPER_CATEGORIES.map((cat) => (
                        <tr key={cat} className="border-b border-gray-50 hover:bg-gray-50/50">
                          <td className="py-0.5 px-3 text-xs text-gray-600">{CATEGORY_LABELS[cat]}</td>
                          <ScoreCell
                            value={scores.Sebastian[cat]}
                            preview={player === "Sebastian" && canScore ? calcScore(dice, cat) : undefined}
                            isAvailable={player === "Sebastian" && canScore && scores.Sebastian[cat] === null}
                            onClick={() => scoreCategory(cat)}
                          />
                          <ScoreCell
                            value={scores.Tina[cat]}
                            preview={player === "Tina" && canScore ? calcScore(dice, cat) : undefined}
                            isAvailable={player === "Tina" && canScore && scores.Tina[cat] === null}
                            onClick={() => scoreCategory(cat)}
                          />
                        </tr>
                      ))}
                      {/* Upper total + bonus */}
                      <tr className="bg-blue-50/60 border-b border-blue-100">
                        <td className="py-1 px-3 text-[11px] font-semibold text-gray-600">
                          Summe oben
                        </td>
                        {(["Sebastian", "Tina"] as const).map(p => {
                          const upper = calcUpperTotal(scores[p])
                          const hasBonus = upper >= 63
                          return (
                            <td key={p} className="text-right py-1 px-2 w-12">
                              <div className={`text-[11px] font-bold ${hasBonus ? "text-green-600" : "text-gray-600"}`}>
                                {upper}/63
                              </div>
                              {hasBonus && <div className="text-[10px] text-green-500">+35 ✓</div>}
                            </td>
                          )
                        })}
                      </tr>
                      {/* Lower section */}
                      {LOWER_CATEGORIES.map((cat) => (
                        <tr key={cat} className="border-b border-gray-50 hover:bg-gray-50/50">
                          <td className="py-0.5 px-3 text-xs text-gray-600">{CATEGORY_LABELS[cat]}</td>
                          <ScoreCell
                            value={scores.Sebastian[cat]}
                            preview={player === "Sebastian" && canScore ? calcScore(dice, cat) : undefined}
                            isAvailable={player === "Sebastian" && canScore && scores.Sebastian[cat] === null}
                            onClick={() => scoreCategory(cat)}
                          />
                          <ScoreCell
                            value={scores.Tina[cat]}
                            preview={player === "Tina" && canScore ? calcScore(dice, cat) : undefined}
                            isAvailable={player === "Tina" && canScore && scores.Tina[cat] === null}
                            onClick={() => scoreCategory(cat)}
                          />
                        </tr>
                      ))}
                      {/* Total */}
                      <tr className="bg-gray-50">
                        <td className="py-2 px-3 text-xs font-bold text-gray-700">Gesamt</td>
                        {(["Sebastian", "Tina"] as const).map(p => (
                          <td key={p} className={`text-right py-2 px-2 text-sm font-bold w-12 ${
                            isFinished
                              ? calcTotal(scores[p]) > calcTotal(scores[p === "Sebastian" ? "Tina" : "Sebastian"])
                                ? "text-green-600"
                                : "text-gray-600"
                              : "text-gray-700"
                          }`}>
                            {calcTotal(scores[p])}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* New game / finish */}
              {isFinished && (
                <button onClick={startGame} className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-semibold hover:bg-indigo-700">
                  Neues Spiel 🎲
                </button>
              )}

              {/* Legend */}
              <div className="flex justify-center gap-5 text-xs text-gray-400">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />Sebastian
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-rose-500" />Tina
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-xl bg-amber-400" />Festgehalten
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )

  const scoreCard = winScores && (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">🏆</span>
        <h2 className="text-sm font-semibold text-gray-700">Kniffel Spielstand</h2>
      </div>
      <div className="flex items-center justify-center gap-6">
        <div className="flex flex-col items-center gap-1">
          <div className="w-4 h-4 rounded-full bg-blue-500" />
          <span className="text-xs text-gray-500">Sebastian</span>
          <span className="text-3xl font-bold text-blue-600">{winScores.Sebastian}</span>
        </div>
        <div className="text-2xl font-light text-gray-300">:</div>
        <div className="flex flex-col items-center gap-1">
          <div className="w-4 h-4 rounded-full bg-rose-500" />
          <span className="text-xs text-gray-500">Tina</span>
          <span className="text-3xl font-bold text-rose-500">{winScores.Tina}</span>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {card}
      {scoreCard}
      {modal}
    </>
  )
}
