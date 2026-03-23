"use client"

import { useCallback, useEffect, useState } from "react"
import type { Task } from "@prisma/client"

const CATEGORIES = [
  { value: "general", label: "Allgemein", icon: "📋" },
  { value: "garden", label: "Garten", icon: "🌱" },
  { value: "house", label: "Haushalt", icon: "🏠" },
  { value: "shopping", label: "Einkauf", icon: "🛒" },
  { value: "repair", label: "Reparatur", icon: "🔧" },
]

function getCategoryMeta(value: string) {
  return CATEGORIES.find((c) => c.value === value) ?? CATEGORIES[0]
}

function formatDate(date: Date | string | null) {
  if (!date) return null
  const d = new Date(date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  d.setHours(0, 0, 0, 0)
  if (d.getTime() === today.getTime()) return "Heute"
  if (d.getTime() === tomorrow.getTime()) return "Morgen"
  return d.toLocaleDateString("de-DE", { day: "numeric", month: "short" })
}

function isOverdue(task: Task) {
  if (!task.dueDate || task.completed) return false
  return new Date(task.dueDate) < new Date()
}

async function fetchTasks(): Promise<Task[]> {
  const res = await fetch("/api/tasks")
  return res.json()
}

export default function TasksClient({ initialTasks }: { initialTasks: Task[] }) {
  const [tasks, setTasks] = useState(initialTasks)
  const [filter, setFilter] = useState<"open" | "done">("open")
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: "", description: "", dueDate: "", category: "general" })
  const [saving, setSaving] = useState(false)

  const reload = useCallback(() => fetchTasks().then(setTasks), [])

  useEffect(() => {
    const es = new EventSource("/api/events")
    es.onmessage = (e) => {
      const { type } = JSON.parse(e.data)
      if (type === "tasks") reload()
    }
    return () => es.close()
  }, [reload])

  async function createTask(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    setForm({ title: "", description: "", dueDate: "", category: "general" })
    setShowForm(false)
    setSaving(false)
    reload()
  }

  async function toggleTask(task: Task) {
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !task.completed }),
    })
    reload()
  }

  async function deleteTask(id: string) {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" })
    reload()
  }

  const visible = tasks.filter((t) => (filter === "open" ? !t.completed : t.completed))

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 md:p-6 bg-white border-b border-gray-200 flex items-center justify-between">
        <h1 className="text-xl font-bold">Aufgaben</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-xl text-sm font-medium"
        >
          + Neu
        </button>
      </div>

      <div className="px-4 md:px-6 pt-4 flex gap-2">
        {(["open", "done"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f ? "bg-primary-600 text-white" : "bg-white border border-gray-200 text-gray-600"
            }`}
          >
            {f === "open" ? "Offen" : "Erledigt"}
            <span className="ml-1 opacity-70">
              ({tasks.filter((t) => (f === "open" ? !t.completed : t.completed)).length})
            </span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3">
        {visible.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
            <span className="text-5xl">✅</span>
            <p>{filter === "open" ? "Keine offenen Aufgaben!" : "Noch nichts erledigt."}</p>
          </div>
        )}
        {visible.map((task) => {
          const cat = getCategoryMeta(task.category)
          const overdue = isOverdue(task)
          return (
            <div
              key={task.id}
              className={`bg-white rounded-2xl p-4 border shadow-sm flex gap-3 ${
                overdue ? "border-red-200" : "border-gray-200"
              }`}
            >
              <button
                onClick={() => toggleTask(task)}
                className={`mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                  task.completed
                    ? "bg-green-500 border-green-500"
                    : "border-gray-300 hover:border-primary-600"
                }`}
              >
                {task.completed && <span className="text-white text-xs">✓</span>}
              </button>
              <div className="flex-1 min-w-0">
                <div className={`font-medium ${task.completed ? "line-through text-gray-400" : "text-gray-900"}`}>
                  {task.title}
                </div>
                {task.description && (
                  <p className="text-sm text-gray-500 mt-0.5 truncate">{task.description}</p>
                )}
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {cat.icon} {cat.label}
                  </span>
                  {task.dueDate && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${overdue ? "bg-red-100 text-red-600" : "bg-amber-50 text-amber-700"}`}>
                      {overdue && "⚠ "}
                      {formatDate(task.dueDate)}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => deleteTask(task.id)} className="text-gray-300 hover:text-red-400 text-lg self-start">
                ×
              </button>
            </div>
          )
        })}
      </div>

      {/* New task modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4">
          <form
            onSubmit={createTask}
            className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4"
          >
            <h2 className="font-bold text-lg">Neue Aufgabe</h2>

            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Was muss gemacht werden?"
              autoFocus
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary-600"
            />

            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Details (optional)"
              rows={2}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary-600 resize-none"
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Kategorie</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.icon} {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Fälligkeit</label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-300 py-3 rounded-xl text-gray-700">
                Abbrechen
              </button>
              <button type="submit" disabled={!form.title.trim() || saving} className="flex-1 bg-primary-600 text-white py-3 rounded-xl font-medium disabled:opacity-40">
                Speichern
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
