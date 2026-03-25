"use client"

import { useCallback, useEffect, useState } from "react"
import type { Task } from "@prisma/client"
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  closestCenter, DragStartEvent, DragOverEvent, DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext, arrayMove, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { useDroppable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"

type TaskWithOrder = Task & { sortOrder: number }
type TaskMap = Record<string, TaskWithOrder[]>

const UNCATEGORIZED = "Sonstiges"

async function fetchTasks(): Promise<TaskWithOrder[]> {
  const res = await fetch("/api/tasks")
  return res.json()
}

function buildTaskMap(tasks: TaskWithOrder[]): TaskMap {
  const map: TaskMap = {}
  for (const task of tasks) {
    if (task.completed) continue
    const cat = task.category || UNCATEGORIZED
    if (!map[cat]) map[cat] = []
    map[cat].push(task)
  }
  for (const cat of Object.keys(map)) {
    map[cat].sort((a, b) => a.sortOrder - b.sortOrder)
  }
  return map
}

function sortedCategories(map: TaskMap): string[] {
  return Object.keys(map).sort((a, b) => {
    if (a === UNCATEGORIZED) return 1
    if (b === UNCATEGORIZED) return -1
    return a.localeCompare(b, "de")
  })
}

function findContainer(id: string, map: TaskMap): string | null {
  if (id in map) return id
  for (const [cat, tasks] of Object.entries(map)) {
    if (tasks.some((t) => t.id === id)) return cat
  }
  return null
}

function formatDate(date: Date | string | null) {
  if (!date) return null
  const d = new Date(date)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
  d.setHours(0, 0, 0, 0)
  if (d.getTime() === today.getTime()) return "Heute"
  if (d.getTime() === tomorrow.getTime()) return "Morgen"
  return d.toLocaleDateString("de-DE", { day: "numeric", month: "short" })
}

function isOverdue(task: Task) {
  return !task.completed && !!task.dueDate && new Date(task.dueDate) < new Date()
}

// ── Task card (DragOverlay ghost) ─────────────────────────────────────────────

function TaskCard({ task, onToggle, onDelete }: {
  task: TaskWithOrder
  onToggle?: () => void
  onDelete?: () => void
}) {
  const overdue = isOverdue(task)
  return (
    <div className={`flex items-start gap-2 bg-white rounded-xl px-3 py-2.5 border shadow-sm
      ${overdue ? "border-red-200" : "border-gray-200"}`}>
      <span className="text-gray-300 text-sm select-none mt-0.5 px-0.5 shrink-0">⠿</span>
      <button onClick={onToggle}
        className="mt-0.5 w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 leading-snug">{task.title}</div>
        {task.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{task.description}</p>}
        {task.dueDate && (
          <span className={`inline-block mt-1 text-xs px-1.5 py-0.5 rounded-full ${
            overdue ? "bg-red-100 text-red-600" : "bg-amber-50 text-amber-700"}`}>
            {overdue && "⚠ "}{formatDate(task.dueDate)}
          </span>
        )}
      </div>
      <button onClick={onDelete} className="text-gray-300 hover:text-red-400 text-lg leading-none shrink-0 px-1">×</button>
    </div>
  )
}

// ── Sortable task card ────────────────────────────────────────────────────────

function SortableTaskCard({ task, onToggle, onDelete }: {
  task: TaskWithOrder
  onToggle: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id })
  const overdue = isOverdue(task)
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-start gap-2 bg-white rounded-xl px-3 py-2.5 border shadow-sm
        ${overdue ? "border-red-200" : "border-gray-200"} ${isDragging ? "opacity-30" : ""}`}>
      <button className="text-gray-300 text-sm cursor-grab touch-none select-none mt-0.5 px-0.5 shrink-0"
        {...attributes} {...listeners}>⠿</button>
      <button onClick={onToggle}
        className="mt-0.5 w-5 h-5 rounded-full border-2 border-gray-300 hover:border-primary-600 flex items-center justify-center shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 leading-snug">{task.title}</div>
        {task.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{task.description}</p>}
        {task.dueDate && (
          <span className={`inline-block mt-1 text-xs px-1.5 py-0.5 rounded-full ${
            overdue ? "bg-red-100 text-red-600" : "bg-amber-50 text-amber-700"}`}>
            {overdue && "⚠ "}{formatDate(task.dueDate)}
          </span>
        )}
      </div>
      <button onClick={onDelete} className="text-gray-300 hover:text-red-400 text-lg leading-none shrink-0 px-1">×</button>
    </div>
  )
}

// ── Droppable category section ────────────────────────────────────────────────

function DroppableCategory({ cat, tasks, onToggle, onDelete }: {
  cat: string
  tasks: TaskWithOrder[]
  onToggle: (t: TaskWithOrder) => void
  onDelete: (t: TaskWithOrder) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: cat })
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-1.5 px-1">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{cat}</span>
        <span className="text-xs text-gray-400">({tasks.length})</span>
      </div>
      <div ref={setNodeRef}
        className={`space-y-1.5 min-h-[36px] rounded-xl transition-colors ${
          isOver ? "bg-primary-50 ring-1 ring-primary-600/30" : ""}`}>
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableTaskCard key={task.id} task={task}
              onToggle={() => onToggle(task)}
              onDelete={() => onDelete(task)} />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <div className={`h-9 rounded-xl border border-dashed text-xs text-gray-400 flex items-center justify-center ${
            isOver ? "border-primary-400 text-primary-500" : "border-gray-200"}`}>
            hierher ziehen
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

const EMPTY_FORM = { title: "", description: "", dueDate: "", category: "" }

export default function TasksClient({ initialTasks }: { initialTasks: TaskWithOrder[] }) {
  const [tasks, setTasks] = useState(initialTasks)
  const [taskMap, setTaskMap] = useState<TaskMap>(() => buildTaskMap(initialTasks))
  const [filter, setFilter] = useState<"open" | "done">("open")
  const [dragItemId, setDragItemId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [newCatMode, setNewCatMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const isDragging = dragItemId !== null

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const reload = useCallback(async () => {
    if (isDragging) return
    const updated = await fetchTasks()
    setTasks(updated)
    setTaskMap(buildTaskMap(updated))
  }, [isDragging])

  useEffect(() => {
    const es = new EventSource("/api/events")
    es.onmessage = (e) => {
      const { type } = JSON.parse(e.data)
      if (type === "tasks") reload()
    }
    return () => es.close()
  }, [reload])

  // Reload on tab focus + periodic polling
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === "visible") reload() }
    document.addEventListener("visibilitychange", onVisible)
    const interval = setInterval(reload, 30000)
    return () => {
      document.removeEventListener("visibilitychange", onVisible)
      clearInterval(interval)
    }
  }, [reload])

  const existingCats = sortedCategories(taskMap).filter((c) => c !== UNCATEGORIZED)

  async function createTask(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    const cat = form.category.trim() || null
    const catTasks = cat ? (taskMap[cat] ?? []) : []
    let excludeEndpoint: string | undefined
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      excludeEndpoint = sub?.endpoint
    } catch { /* push not available */ }
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, category: cat, sortOrder: catTasks.length, excludeEndpoint }),
    })
    setForm(EMPTY_FORM)
    setNewCatMode(false)
    setShowForm(false)
    setSaving(false)
    reload()
  }

  async function toggleTask(task: TaskWithOrder) {
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !task.completed }),
    })
    reload()
  }

  async function deleteTask(task: TaskWithOrder) {
    await fetch(`/api/tasks/${task.id}`, { method: "DELETE" })
    reload()
  }

  async function persistSort(map: TaskMap) {
    const updates = Object.entries(map).flatMap(([cat, catTasks]) =>
      catTasks.map((t, i) => ({
        id: t.id,
        category: cat === UNCATEGORIZED ? null : cat,
        sortOrder: i,
      }))
    )
    await fetch("/api/tasks/sort", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    })
  }

  function handleDragStart({ active }: DragStartEvent) {
    setDragItemId(active.id as string)
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over) return
    const ac = findContainer(active.id as string, taskMap)
    const oc = findContainer(over.id as string, taskMap) ?? (over.id as string)
    if (!ac || !oc || ac === oc) return
    setTaskMap((prev) => {
      const ai = [...(prev[ac] ?? [])]
      const oi = [...(prev[oc] ?? [])]
      const aIdx = ai.findIndex((t) => t.id === active.id)
      const oIdx = oi.findIndex((t) => t.id === over.id)
      if (aIdx === -1) return prev
      const moving = { ...ai[aIdx], category: oc === UNCATEGORIZED ? null : oc }
      const at = oIdx >= 0 ? oIdx : oi.length
      return {
        ...prev,
        [ac]: ai.filter((t) => t.id !== active.id),
        [oc]: [...oi.slice(0, at), moving, ...oi.slice(at)],
      }
    })
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setDragItemId(null)
    if (!over) { reload(); return }
    setTaskMap((prev) => {
      const ac = findContainer(active.id as string, prev)
      const oc = findContainer(over.id as string, prev) ?? (over.id as string)
      if (!ac) return prev
      let newMap = { ...prev }
      if (ac === oc && active.id !== over.id) {
        const items = [...(prev[ac] ?? [])]
        const ai = items.findIndex((t) => t.id === active.id)
        const oi = items.findIndex((t) => t.id === over.id)
        if (ai !== -1 && oi !== -1) newMap = { ...prev, [ac]: arrayMove(items, ai, oi) }
      }
      persistSort(newMap)
      return newMap
    })
  }

  const dragTask = dragItemId
    ? Object.values(taskMap).flat().find((t) => t.id === dragItemId)
    : null
  const openCount = tasks.filter((t) => !t.completed).length
  const doneCount = tasks.filter((t) => t.completed).length
  const doneTasks = tasks.filter((t) => t.completed)
  const cats = sortedCategories(taskMap)

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="p-4 md:p-6 bg-white border-b border-gray-200 flex items-center justify-between shrink-0">
        <div className="flex gap-2">
          {(["open", "done"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === f ? "bg-primary-600 text-white" : "bg-white border border-gray-200 text-gray-600"
              }`}>
              {f === "open" ? "Offen" : "Erledigt"}
              <span className="ml-1 opacity-70">({f === "open" ? openCount : doneCount})</span>
            </button>
          ))}
        </div>
        <button onClick={() => setShowForm(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-xl text-sm font-medium">
          + Neu
        </button>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {filter === "open" ? (
          openCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
              <span className="text-5xl">✅</span>
              <p>Keine offenen Aufgaben!</p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}>
              {cats.map((cat) => (
                <DroppableCategory key={cat} cat={cat}
                  tasks={taskMap[cat] ?? []}
                  onToggle={toggleTask}
                  onDelete={deleteTask} />
              ))}
              <DragOverlay>
                {dragTask && <TaskCard task={dragTask} />}
              </DragOverlay>
            </DndContext>
          )
        ) : (
          doneCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
              <span className="text-5xl">📋</span>
              <p>Noch nichts erledigt.</p>
            </div>
          ) : (
            <div className="space-y-1.5 opacity-70">
              {doneTasks.map((task) => (
                <div key={task.id}
                  className="flex items-start gap-2 bg-white rounded-xl px-3 py-2.5 border border-gray-200">
                  <button onClick={() => toggleTask(task)}
                    className="mt-0.5 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                    <span className="text-white text-xs">✓</span>
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium line-through text-gray-400">{task.title}</div>
                    {task.category && (
                      <span className="text-xs text-gray-400">{task.category}</span>
                    )}
                  </div>
                  <button onClick={() => deleteTask(task)}
                    className="text-gray-300 hover:text-red-400 text-lg leading-none px-1">×</button>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* New task modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start md:items-center justify-center p-4 pt-8 md:pt-4">
          <form onSubmit={createTask} className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h2 className="font-bold text-lg">Neue Aufgabe</h2>

            <input value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Was muss gemacht werden?" autoFocus
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary-600" />

            {/* Category picker */}
            <div>
              <label className="text-xs text-gray-500 mb-2 block">Kategorie</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {existingCats.map((cat) => (
                  <button key={cat} type="button"
                    onClick={() => { setForm({ ...form, category: cat }); setNewCatMode(false) }}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      form.category === cat && !newCatMode
                        ? "bg-primary-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}>
                    {cat}
                  </button>
                ))}
                <button type="button"
                  onClick={() => { setNewCatMode(true); setForm({ ...form, category: "" }) }}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    newCatMode ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}>
                  + Neue
                </button>
                {(form.category || newCatMode) && (
                  <button type="button"
                    onClick={() => { setForm({ ...form, category: "" }); setNewCatMode(false) }}
                    className="px-2.5 py-1 rounded-full text-xs bg-gray-100 text-gray-400 hover:bg-gray-200">
                    ✕ keine
                  </button>
                )}
              </div>
              {newCatMode && (
                <input value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="Kategoriename…"
                  autoFocus
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600" />
              )}
            </div>

            <textarea value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Details (optional)" rows={2}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 resize-none" />

            <div>
              <label className="text-xs text-gray-500 mb-1 block">Fälligkeit (optional)</label>
              <input type="date" value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600" />
            </div>

            <div className="flex gap-2">
              <button type="button"
                onClick={() => { setShowForm(false); setNewCatMode(false); setForm(EMPTY_FORM) }}
                className="flex-1 border border-gray-300 py-3 rounded-xl text-gray-700">
                Abbrechen
              </button>
              <button type="submit" disabled={!form.title.trim() || saving}
                className="flex-1 bg-primary-600 text-white py-3 rounded-xl font-medium disabled:opacity-40">
                Speichern
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
