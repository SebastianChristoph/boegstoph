"use client"

import { useState } from "react"
import type { SauerteigBatch, SauerteigTodo } from "@prisma/client"

type BatchWithTodos = SauerteigBatch & { todos: SauerteigTodo[] }

const TYPE_EMOJI: Record<string, string> = { Roggen: "🌾", Weizen: "🌿", Dinkel: "✨" }
const TYPE_TEMP: Record<string, string> = {
  Roggen: "26–28°C",
  Weizen: "24–26°C",
  Dinkel: "22–24°C",
}
const TYPE_MEHL: Record<string, string> = {
  Roggen: "Roggenmehl Type 1150",
  Weizen: "Weizenmehl Type 550",
  Dinkel: "Dinkelmehl Type 1050",
}

function formatDueDate(date: Date | string) {
  const d = new Date(date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const day = new Date(d)
  day.setHours(0, 0, 0, 0)

  let dayLabel: string
  if (day.getTime() === today.getTime()) dayLabel = "Heute"
  else if (day.getTime() === tomorrow.getTime()) dayLabel = "Morgen"
  else dayLabel = d.toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "short" })

  const time = d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
  return `${dayLabel}, ${time} Uhr`
}

function isOverdue(todo: SauerteigTodo) {
  return !todo.doneAt && new Date(todo.dueDate) < new Date()
}

function groupByDay(todos: SauerteigTodo[]) {
  const map = new Map<string, SauerteigTodo[]>()
  for (const t of todos) {
    const d = new Date(t.dueDate)
    d.setHours(0, 0, 0, 0)
    const key = d.toISOString()
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(t)
  }
  return Array.from(map.entries()).map(([key, items]) => ({ date: new Date(key), items }))
}

function dayLabel(date: Date) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
  if (date.getTime() === today.getTime()) return "Heute"
  if (date.getTime() === tomorrow.getTime()) return "Morgen"
  return date.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })
}

function BatchCard({
  batch,
  onToggleTodo,
  onArchive,
}: {
  batch: BatchWithTodos
  onToggleTodo: (batchId: string, todoId: string, done: boolean) => void
  onArchive: (batchId: string) => void
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const days = groupByDay(batch.todos)
  const doneCount = batch.todos.filter((t) => t.doneAt).length
  const totalCount = batch.todos.length
  const progress = Math.round((doneCount / totalCount) * 100)

  const startLabel = new Date(batch.startedAt).toLocaleDateString("de-DE", {
    day: "numeric", month: "long", year: "numeric",
  })

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="px-4 py-3 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">{TYPE_EMOJI[batch.type]}</span>
            <span className="font-semibold text-gray-900">{batch.type}sauerteig</span>
            <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">
              {doneCount}/{totalCount} erledigt
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            Gestartet: {startLabel} · Ideal: {TYPE_TEMP[batch.type]}
          </div>
        </div>
        <button
          onClick={() => onArchive(batch.id)}
          className="text-xs text-gray-400 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
          title="Archivieren"
        >
          Archivieren
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-100">
        <div
          className="h-full bg-amber-400 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Info row */}
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex gap-4 text-xs text-gray-500">
        <span>Mehl: <strong className="text-gray-700">{TYPE_MEHL[batch.type]}</strong></span>
        <span>Menge: <strong className="text-gray-700">je 50g Mehl + 50ml Wasser</strong></span>
      </div>

      {/* Todos grouped by day */}
      <div className="divide-y divide-gray-100">
        {days.map(({ date, items }) => {
          const allDone = items.every((t) => t.doneAt)
          const hasOverdue = items.some((t) => isOverdue(t))
          return (
            <div key={date.toISOString()} className={allDone ? "opacity-60" : ""}>
              {/* Day header */}
              <div className={`px-4 py-2 flex items-center gap-2 text-xs font-semibold
                ${hasOverdue ? "text-red-600 bg-red-50" : allDone ? "text-gray-400 bg-gray-50" : "text-gray-500 bg-gray-50"}`}>
                <span>{hasOverdue && !allDone ? "⚠ " : ""}{dayLabel(date)}</span>
                {allDone && <span className="text-green-500">✓</span>}
              </div>

              {/* Todos for this day */}
              {items.map((todo) => {
                const done = !!todo.doneAt
                const overdue = isOverdue(todo)
                const isOpen = expanded[todo.id]
                return (
                  <div key={todo.id}
                    className={`px-4 py-3 ${done ? "bg-white" : overdue ? "bg-red-50/40" : "bg-white"}`}>
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <button
                        onClick={() => onToggleTodo(batch.id, todo.id, !done)}
                        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors
                          ${done
                            ? "bg-green-500 border-green-500 text-white"
                            : overdue
                            ? "border-red-400 hover:border-red-500"
                            : "border-gray-300 hover:border-amber-500"}`}
                      >
                        {done && <span className="text-xs leading-none">✓</span>}
                      </button>

                      <div className="flex-1 min-w-0">
                        {/* Title + time */}
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className={`text-sm font-medium leading-snug
                            ${done ? "line-through text-gray-400" : overdue ? "text-red-700" : "text-gray-900"}`}>
                            {todo.title}
                          </span>
                          <span className={`text-xs shrink-0
                            ${done ? "text-gray-400" : overdue ? "text-red-500" : "text-gray-400"}`}>
                            {overdue && !done ? "⚠ " : ""}{formatDueDate(todo.dueDate)}
                          </span>
                        </div>

                        {/* Detail toggle */}
                        <button
                          onClick={() => setExpanded((p) => ({ ...p, [todo.id]: !p[todo.id] }))}
                          className="text-xs text-amber-600 hover:text-amber-700 mt-1"
                        >
                          {isOpen ? "▲ weniger" : "▼ Details"}
                        </button>
                        {isOpen && (
                          <p className="mt-2 text-xs text-gray-600 leading-relaxed bg-amber-50 rounded-xl px-3 py-2">
                            {todo.detail}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Start modal ───────────────────────────────────────────────────────────────

function StartModal({ onClose, onStart }: { onClose: () => void; onStart: (type: string, date: string) => void }) {
  const [selectedType, setSelectedType] = useState<string>("Roggen")
  const today = new Date().toISOString().split("T")[0]
  const [startDate, setStartDate] = useState(today)
  const [saving, setSaving] = useState(false)

  const types = [
    { key: "Roggen", emoji: "🌾", desc: "Kräftig, robust, schnell aktiv — ideal für Anfänger", temp: "26–28°C" },
    { key: "Weizen", emoji: "🌿", desc: "Mild und vielseitig — für helles Brot", temp: "24–26°C" },
    { key: "Dinkel", emoji: "✨", desc: "Aromatisch, schnell — etwas kühler halten", temp: "22–24°C" },
  ]

  async function handleStart() {
    setSaving(true)
    await onStart(selectedType, startDate)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 text-lg">🍞 Sauerteig starten</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Type picker */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Mehlsorte wählen</p>
            <div className="space-y-2">
              {types.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setSelectedType(t.key)}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-colors
                    ${selectedType === t.key
                      ? "border-amber-500 bg-amber-50"
                      : "border-gray-200 hover:border-amber-300"}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{t.emoji}</span>
                    <div>
                      <div className="font-medium text-gray-900 text-sm">{t.key}</div>
                      <div className="text-xs text-gray-500">{t.desc} · {t.temp}</div>
                    </div>
                    {selectedType === t.key && (
                      <span className="ml-auto text-amber-500">✓</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Start date */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Startdatum</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <p className="text-xs text-gray-400 mt-1">
              Alle Todos werden ab 08:00 Uhr dieses Tages berechnet.
            </p>
          </div>
        </div>

        <div className="px-5 pb-5 flex gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600">
            Abbrechen
          </button>
          <button
            onClick={handleStart}
            disabled={saving}
            className="flex-1 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium disabled:opacity-50"
          >
            {saving ? "Erstelle…" : `${TYPE_EMOJI[selectedType]} Starten`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main BrotTab ──────────────────────────────────────────────────────────────

export default function BrotTab({ initialBatches }: { initialBatches: BatchWithTodos[] }) {
  const [batches, setBatches] = useState<BatchWithTodos[]>(initialBatches)
  const [showModal, setShowModal] = useState(false)

  async function reload() {
    const res = await fetch("/api/brot/sauerteig")
    if (res.ok) setBatches(await res.json())
  }

  async function handleStart(type: string, startDate: string) {
    const res = await fetch("/api/brot/sauerteig", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, startedAt: new Date(startDate + "T08:00:00").toISOString() }),
    })
    if (res.ok) {
      await reload()
      setShowModal(false)
    }
  }

  async function handleToggleTodo(batchId: string, todoId: string, done: boolean) {
    // Optimistic update
    setBatches((prev) =>
      prev.map((b) =>
        b.id !== batchId ? b : {
          ...b,
          todos: b.todos.map((t) =>
            t.id !== todoId ? t : { ...t, doneAt: done ? new Date() : null }
          ),
        }
      )
    )
    await fetch(`/api/brot/sauerteig/${batchId}/todos/${todoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done }),
    })
    reload()
  }

  async function handleArchive(batchId: string) {
    await fetch(`/api/brot/sauerteig/${batchId}`, { method: "DELETE" })
    setBatches((prev) => prev.filter((b) => b.id !== batchId))
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 md:p-6 bg-white border-b border-gray-200 flex items-center justify-between shrink-0">
        <div>
          <h2 className="font-semibold text-gray-900">Sauerteig</h2>
          {batches.length > 0 && (
            <p className="text-xs text-gray-500 mt-0.5">{batches.length} aktiver Ansatz</p>
          )}
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          + Sauerteig starten
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {batches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="text-5xl mb-4">🍞</span>
            <p className="text-gray-500 text-sm">Noch kein Sauerteig aktiv.</p>
            <p className="text-gray-400 text-xs mt-1">Starte deinen ersten Ansatz!</p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium"
            >
              Sauerteig starten 🌾
            </button>
          </div>
        ) : (
          batches.map((batch) => (
            <BatchCard
              key={batch.id}
              batch={batch}
              onToggleTodo={handleToggleTodo}
              onArchive={handleArchive}
            />
          ))
        )}
      </div>

      {showModal && (
        <StartModal onClose={() => setShowModal(false)} onStart={handleStart} />
      )}
    </div>
  )
}
