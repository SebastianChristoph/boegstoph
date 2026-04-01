"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import type { SauerteigBatch, SauerteigTodo } from "@prisma/client"

type BatchWithTodos = SauerteigBatch & { todos: SauerteigTodo[] }

function formatDue(date: Date): { label: string; color: string } {
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  const diffH = Math.round(diff / 3_600_000)
  const diffD = Math.round(diff / 86_400_000)

  if (diff < -3_600_000) return { label: "überfällig", color: "text-red-500" }
  if (diff < 0) return { label: "gerade fällig", color: "text-orange-500" }
  if (diffH < 1) return { label: "in < 1 Std.", color: "text-orange-500" }
  if (diffH < 24) return { label: `in ${diffH} Std.`, color: "text-amber-600" }
  return { label: `in ${diffD} Tag${diffD !== 1 ? "en" : ""}`, color: "text-gray-400" }
}

export default function SauerteigWidget() {
  const [batches, setBatches] = useState<BatchWithTodos[] | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch("/api/brot/sauerteig")
    if (res.ok) setBatches(await res.json())
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const es = new EventSource("/api/events")
    es.onopen = () => load()
    es.onmessage = (e) => {
      const { type } = JSON.parse(e.data)
      if (type === "sauerteig") load()
    }
    return () => es.close()
  }, [load])

  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === "visible") load() }
    document.addEventListener("visibilitychange", onVisible)
    return () => document.removeEventListener("visibilitychange", onVisible)
  }, [load])

  async function toggle(batchId: string, todoId: string, currentlyDone: boolean) {
    setToggling(todoId)
    await fetch(`/api/brot/sauerteig/${batchId}/todos/${todoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !currentlyDone }),
    })
    await load()
    setToggling(null)
  }

  if (!batches) return null

  // Only active batches with at least one todo
  const activeBatches = batches.filter(b => b.todos.length > 0)
  if (activeBatches.length === 0) return null

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🍞</span>
          <h2 className="text-sm font-semibold text-gray-700">Sauerteig</h2>
        </div>
        <Link
          href="/tasks"
          className="text-xs text-primary-600 hover:underline"
        >
          Alle →
        </Link>
      </div>

      <div className="space-y-4">
        {activeBatches.map(batch => {
          const pending = batch.todos
            .filter(t => !t.doneAt)
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
          const done = batch.todos.filter(t => !!t.doneAt)
          const total = batch.todos.length
          const pct = Math.round((done.length / total) * 100)
          const upcoming = pending.slice(0, 3)

          return (
            <div key={batch.id}>
              {/* Batch header */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-600">
                  {batch.type === "Roggen" ? "🌾" : batch.type === "Weizen" ? "🌿" : "✨"} {batch.type}
                </span>
                <span className="text-[10px] text-gray-400">
                  {done.length}/{total} erledigt
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 bg-gray-100 rounded-full mb-3 overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* Upcoming todos */}
              {upcoming.length === 0 ? (
                <p className="text-xs text-green-600 text-center py-1">Alle Schritte erledigt ✓</p>
              ) : (
                <ul className="space-y-2">
                  {upcoming.map(todo => {
                    const due = formatDue(new Date(todo.dueDate))
                    const isDone = !!todo.doneAt
                    return (
                      <li key={todo.id} className="flex items-start gap-2.5">
                        <button
                          onClick={() => toggle(batch.id, todo.id, isDone)}
                          disabled={toggling === todo.id}
                          className={`mt-0.5 shrink-0 w-4 h-4 rounded border transition-colors
                            ${isDone
                              ? "bg-amber-400 border-amber-400 text-white"
                              : "border-gray-300 hover:border-amber-400"
                            } flex items-center justify-center`}
                        >
                          {isDone && <span className="text-[10px] leading-none">✓</span>}
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs font-medium leading-tight ${isDone ? "line-through text-gray-400" : "text-gray-700"}`}>
                            {todo.title}
                          </p>
                          <p className={`text-[10px] mt-0.5 ${due.color}`}>{due.label}</p>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
