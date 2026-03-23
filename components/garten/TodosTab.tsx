"use client"

import { useCallback, useEffect, useState } from "react"

interface GardenTodo {
  id: string
  title: string
  dueDate: string | null
  done: boolean
  type: string | null
  season: { plant: { name: string; variety: string | null } } | null
}

type TabType = "open" | "week" | "done"

function isThisWeek(dateStr: string | null): boolean {
  if (!dateStr) return false
  const due = new Date(dateStr)
  const now = new Date()
  const weekEnd = new Date(now)
  weekEnd.setDate(now.getDate() + 7)
  return due <= weekEnd && due >= new Date(now.setHours(0, 0, 0, 0))
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString("de-DE", { day: "numeric", month: "short" })
}

export default function TodosTab() {
  const [todos, setTodos] = useState<GardenTodo[]>([])
  const [tab, setTab] = useState<TabType>("week")
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newDate, setNewDate] = useState("")

  const load = useCallback(async () => {
    const res = await fetch("/api/garden/todos")
    if (res.ok) setTodos(await res.json())
  }, [])

  useEffect(() => { load() }, [load])

  async function toggle(todo: GardenTodo) {
    const res = await fetch(`/api/garden/todos/${todo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !todo.done }),
    })
    if (res.ok) {
      const updated = await res.json()
      setTodos(t => t.map(x => x.id === todo.id ? updated : x))
    }
  }

  async function remove(id: string) {
    await fetch(`/api/garden/todos/${id}`, { method: "DELETE" })
    setTodos(t => t.filter(x => x.id !== id))
  }

  async function addTodo() {
    if (!newTitle.trim()) return
    const res = await fetch("/api/garden/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle, dueDate: newDate || null }),
    })
    if (res.ok) {
      const todo = await res.json()
      setTodos(t => [...t, todo])
      setNewTitle(""); setNewDate(""); setShowAdd(false)
    }
  }

  const open = todos.filter(t => !t.done)
  const done = todos.filter(t => t.done)
  const thisWeek = open.filter(t => isThisWeek(t.dueDate))

  const displayed = tab === "week" ? thisWeek : tab === "open" ? open : done

  const openCount = open.length
  const weekCount = thisWeek.length

  function isOverdue(t: GardenTodo) {
    if (!t.dueDate || t.done) return false
    return new Date(t.dueDate) < new Date()
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {([
          { id: "week", label: `Diese Woche ${weekCount > 0 ? `(${weekCount})` : ""}` },
          { id: "open", label: `Alle offen ${openCount > 0 ? `(${openCount})` : ""}` },
          { id: "done", label: `Erledigt ${done.length > 0 ? `(${done.length})` : ""}` },
        ] as { id: TabType; label: string }[]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-1.5 rounded-xl text-xs font-medium transition-colors ${tab === t.id ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <button onClick={() => setShowAdd(!showAdd)}
        className="w-full border-2 border-dashed border-gray-300 hover:border-primary-400 rounded-xl py-2.5 text-sm text-gray-500 hover:text-primary-600 transition-colors mb-4">
        + Eigene Aufgabe hinzufügen
      </button>

      {showAdd && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-4 shadow-sm">
          <div className="space-y-3">
            <input value={newTitle} onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addTodo()}
              placeholder="Aufgabe…"
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
            <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
            <div className="flex gap-2">
              <button onClick={addTodo} disabled={!newTitle.trim()}
                className="flex-1 bg-primary-600 text-white py-2 rounded-xl text-sm font-medium disabled:opacity-40">
                Hinzufügen
              </button>
              <button onClick={() => setShowAdd(false)} className="px-4 rounded-xl text-sm text-gray-500 hover:bg-gray-100">
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {displayed.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <div className="text-4xl mb-2">{tab === "done" ? "🎉" : "✅"}</div>
          <p className="text-sm">{tab === "done" ? "Noch nichts erledigt" : tab === "week" ? "Keine Aufgaben diese Woche" : "Keine offenen Aufgaben"}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {displayed.map(todo => (
            <li key={todo.id}
              className={`flex items-center gap-3 bg-white border rounded-xl px-4 py-3 shadow-sm ${isOverdue(todo) ? "border-red-200" : "border-gray-200"}`}>
              <button onClick={() => toggle(todo)}
                className={`w-5 h-5 rounded-full border-2 shrink-0 transition-colors ${todo.done ? "bg-green-500 border-green-500" : isOverdue(todo) ? "border-red-400" : "border-gray-300 hover:border-primary-400"}`}>
                {todo.done && <span className="flex items-center justify-center text-white text-xs">✓</span>}
              </button>
              <div className="flex-1 min-w-0">
                <div className={`text-sm ${todo.done ? "line-through text-gray-400" : "text-gray-800"}`}>{todo.title}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  {todo.dueDate && (
                    <span className={`text-xs ${isOverdue(todo) ? "text-red-500 font-medium" : "text-gray-400"}`}>
                      {isOverdue(todo) ? "⚠️ " : "📅 "}{formatDate(todo.dueDate)}
                    </span>
                  )}
                  {todo.season && (
                    <span className="text-xs text-gray-400">
                      🌱 {todo.season.plant.name}{todo.season.plant.variety ? ` (${todo.season.plant.variety})` : ""}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => remove(todo.id)} className="text-gray-400 hover:text-red-500 text-xs shrink-0">🗑️</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
