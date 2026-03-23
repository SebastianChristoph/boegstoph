"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { ShoppingItem, ShoppingList } from "@prisma/client"
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  closestCenter, DragStartEvent, DragOverEvent, DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext, arrayMove, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { useDroppable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { CATEGORIES, DEFAULT_CATEGORY, normalize, type CategoryId } from "@/lib/knowledge"

// ── Types ────────────────────────────────────────────────────────────────────

type Item = ShoppingItem & { category: string | null; sortOrder: number }
type ListWithItems = ShoppingList & { items: Item[] }
type ItemMap = Record<string, Item[]>

interface Knowledge {
  id: string
  keyword: string
  displayName: string
  category: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function fetchLists(): Promise<ListWithItems[]> {
  const res = await fetch("/api/shopping")
  return res.json()
}

function buildItemMap(items: Item[]): ItemMap {
  const map: ItemMap = {}
  for (const cat of CATEGORIES) map[cat.id] = []
  for (const item of items) {
    if (item.checked) continue
    const cat = item.category ?? DEFAULT_CATEGORY
    if (!map[cat]) map[cat] = []
    map[cat].push(item)
  }
  for (const cat of Object.keys(map)) {
    map[cat].sort((a, b) => a.sortOrder - b.sortOrder)
  }
  return map
}

function findContainer(id: string, map: ItemMap): string | null {
  if (id in map) return id
  for (const [catId, items] of Object.entries(map)) {
    if (items.some((i) => i.id === id)) return catId
  }
  return null
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ItemCard({ item, ghost = false, onToggle, onDelete }: {
  item: Item
  ghost?: boolean
  onToggle?: () => void
  onDelete?: () => void
}) {
  return (
    <div className={`flex items-center gap-2 bg-white rounded-xl px-3 py-2.5 border border-gray-200 shadow-sm ${ghost ? "opacity-40" : ""}`}>
      <span className="text-gray-300 text-sm select-none px-0.5">⠿</span>
      <button onClick={onToggle}
        className="w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center shrink-0" />
      <span className="flex-1 text-sm text-gray-900">{item.name}</span>
      <button onClick={onDelete} className="text-gray-300 hover:text-red-400 text-lg leading-none px-1">×</button>
    </div>
  )
}

function SortableItemCard({ item, onToggle, onDelete }: {
  item: Item
  onToggle: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id })

  return (
    <div ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 bg-white rounded-xl px-3 py-2.5 border border-gray-200 shadow-sm ${isDragging ? "opacity-30 z-10" : ""}`}>
      <button className="text-gray-300 text-sm cursor-grab touch-none select-none px-0.5"
        {...attributes} {...listeners}>⠿</button>
      <button onClick={onToggle}
        className="w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center shrink-0" />
      <span className="flex-1 text-sm text-gray-900">{item.name}</span>
      <button onClick={onDelete} className="text-gray-300 hover:text-red-400 text-lg leading-none px-1">×</button>
    </div>
  )
}

function DroppableCategory({ catId, items, onToggle, onDelete }: {
  catId: string
  items: Item[]
  onToggle: (item: Item) => void
  onDelete: (item: Item) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: catId })
  const cat = CATEGORIES.find((c) => c.id === catId)!

  return (
    <div className="mb-4">
      <div className="flex items-center gap-1.5 mb-1.5 px-1">
        <span className="text-sm">{cat.icon}</span>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{cat.label}</span>
        {items.length > 0 && <span className="text-xs text-gray-400 ml-1">({items.length})</span>}
      </div>
      <div ref={setNodeRef}
        className={`space-y-1.5 min-h-[36px] rounded-xl transition-colors ${isOver ? "bg-primary-50 ring-1 ring-primary-600/30" : ""}`}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {items.map((item) => (
            <SortableItemCard key={item.id} item={item}
              onToggle={() => onToggle(item)}
              onDelete={() => onDelete(item)} />
          ))}
        </SortableContext>
        {items.length === 0 && (
          <div className={`h-9 rounded-xl border border-dashed text-xs text-gray-400 flex items-center justify-center ${isOver ? "border-primary-400 text-primary-500" : "border-gray-200"}`}>
            hierher ziehen
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ShoppingClient({ initialLists }: { initialLists: ListWithItems[] }) {
  const [lists, setLists] = useState(initialLists)
  const [activeListId, setActiveListId] = useState<string | null>(initialLists[0]?.id ?? null)
  const [itemMap, setItemMap] = useState<ItemMap>(() =>
    buildItemMap(initialLists[0]?.items ?? [])
  )
  const [knowledge, setKnowledge] = useState<Knowledge[]>([])

  // Add-item form state
  const [newName, setNewName] = useState("")
  const [newCat, setNewCat] = useState<CategoryId>(DEFAULT_CATEGORY)
  const [catManual, setCatManual] = useState(false)
  const [suggestions, setSuggestions] = useState<Knowledge[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  // DnD state
  const [dragItemId, setDragItemId] = useState<string | null>(null)

  // Misc
  const [showNewList, setShowNewList] = useState(false)
  const [newListName, setNewListName] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const isDragging = dragItemId !== null

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  // ── Data loading ───────────────────────────────────────────────────────────

  const reload = useCallback(async () => {
    if (isDragging) return
    const updated = await fetchLists()
    setLists(updated)
    const active = updated.find((l) => l.id === activeListId)
    if (active) setItemMap(buildItemMap(active.items))
  }, [isDragging, activeListId])

  useEffect(() => {
    fetch("/api/knowledge").then((r) => r.json()).then(setKnowledge)
  }, [])

  useEffect(() => {
    const es = new EventSource("/api/events")
    es.onmessage = (e) => {
      const { type } = JSON.parse(e.data)
      if (type === "shopping") reload()
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

  // sync itemMap when active list changes
  useEffect(() => {
    const list = lists.find((l) => l.id === activeListId)
    if (list) setItemMap(buildItemMap(list.items))
  }, [activeListId, lists])

  // ── Autocomplete ───────────────────────────────────────────────────────────

  useEffect(() => {
    const norm = normalize(newName)
    if (!norm) { setSuggestions([]); return }
    const matches = knowledge.filter((k) => k.keyword.startsWith(norm) || norm.startsWith(k.keyword))
    setSuggestions(matches.slice(0, 6))

    // Auto-suggest category from best match (unless user manually picked one)
    if (!catManual && matches.length > 0) {
      setNewCat(matches[0].category as CategoryId)
    }
  }, [newName, knowledge, catManual])

  function selectSuggestion(s: Knowledge) {
    setNewName(s.displayName)
    setNewCat(s.category as CategoryId)
    setCatManual(true)
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  // ── CRUD ───────────────────────────────────────────────────────────────────

  async function addItem(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim() || !activeListId) return
    setShowSuggestions(false)

    const catItems = itemMap[newCat] ?? []
    await fetch(`/api/shopping/${activeListId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), category: newCat, sortOrder: catItems.length }),
    })
    // refresh knowledge
    fetch("/api/knowledge").then((r) => r.json()).then(setKnowledge)
    setNewName("")
    setCatManual(false)
    setNewCat(DEFAULT_CATEGORY)
    reload()
  }

  async function toggleItem(item: Item) {
    await fetch(`/api/shopping/${item.listId}/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checked: !item.checked }),
    })
    reload()
  }

  async function deleteItem(item: Item) {
    await fetch(`/api/shopping/${item.listId}/items/${item.id}`, { method: "DELETE" })
    reload()
  }

  async function createList(e: React.FormEvent) {
    e.preventDefault()
    if (!newListName.trim()) return
    const res = await fetch("/api/shopping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newListName.trim() }),
    })
    const list = await res.json()
    setLists((p) => [list, ...p])
    setActiveListId(list.id)
    setNewListName("")
    setShowNewList(false)
  }

  async function deleteList(listId: string) {
    await fetch(`/api/shopping/${listId}`, { method: "DELETE" })
    const remaining = lists.filter((l) => l.id !== listId)
    setLists(remaining)
    setActiveListId(remaining[0]?.id ?? null)
  }

  async function persistSort(map: ItemMap) {
    if (!activeListId) return
    const updates = Object.entries(map).flatMap(([catId, items]) =>
      items.map((item, i) => ({ id: item.id, category: catId, sortOrder: i }))
    )
    await fetch(`/api/shopping/${activeListId}/items/sort`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    })
  }

  // ── Drag & Drop ───────────────────────────────────────────────────────────

  function handleDragStart({ active }: DragStartEvent) {
    setDragItemId(active.id as string)
    setShowSuggestions(false)
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over) return
    const activeContainer = findContainer(active.id as string, itemMap)
    const overContainer = findContainer(over.id as string, itemMap) ?? (over.id as string)
    if (!activeContainer || !overContainer || activeContainer === overContainer) return

    setItemMap((prev) => {
      const activeItems = [...(prev[activeContainer] ?? [])]
      const overItems = [...(prev[overContainer] ?? [])]
      const activeIdx = activeItems.findIndex((i) => i.id === active.id)
      const overIdx = overItems.findIndex((i) => i.id === over.id)
      if (activeIdx === -1) return prev

      const movingItem = { ...activeItems[activeIdx], category: overContainer }
      const insertAt = overIdx >= 0 ? overIdx : overItems.length

      return {
        ...prev,
        [activeContainer]: activeItems.filter((i) => i.id !== active.id),
        [overContainer]: [
          ...overItems.slice(0, insertAt),
          movingItem,
          ...overItems.slice(insertAt),
        ],
      }
    })
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setDragItemId(null)
    if (!over) { reload(); return }

    setItemMap((prev) => {
      const activeContainer = findContainer(active.id as string, prev)
      const overContainer = findContainer(over.id as string, prev) ?? (over.id as string)
      if (!activeContainer) return prev

      let newMap = { ...prev }

      // Reorder within same category
      if (activeContainer === overContainer && active.id !== over.id) {
        const items = [...(prev[activeContainer] ?? [])]
        const ai = items.findIndex((i) => i.id === active.id)
        const oi = items.findIndex((i) => i.id === over.id)
        if (ai !== -1 && oi !== -1) {
          newMap = { ...prev, [activeContainer]: arrayMove(items, ai, oi) }
        }
      }

      persistSort(newMap)
      return newMap
    })
  }

  // ── Derived state ─────────────────────────────────────────────────────────

  const activeList = lists.find((l) => l.id === activeListId)
  const allItems = activeList?.items ?? []
  const checkedItems = allItems.filter((i) => i.checked)
  const dragItem = dragItemId ? Object.values(itemMap).flat().find((i) => i.id === dragItemId) : null

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full md:flex-row">

      {/* List selector */}
      <div className="md:w-64 md:border-r md:border-gray-200 bg-white md:bg-gray-50 p-4 flex md:flex-col gap-2 overflow-x-auto md:overflow-y-auto shrink-0">
        <div className="hidden md:flex items-center justify-between mb-2">
          <h2 className="font-semibold text-gray-700">Listen</h2>
          <button onClick={() => setShowNewList(true)} className="text-primary-600 text-sm font-medium">+ Neu</button>
        </div>
        {lists.map((l) => (
          <button key={l.id} onClick={() => setActiveListId(l.id)}
            className={`shrink-0 md:w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
              l.id === activeListId ? "bg-primary-600 text-white" : "bg-white text-gray-700 border border-gray-200"
            }`}>
            {l.name}
            <span className={`ml-1 text-xs ${l.id === activeListId ? "text-primary-100" : "text-gray-400"}`}>
              ({l.items.filter((i) => !i.checked).length})
            </span>
          </button>
        ))}
        <button onClick={() => setShowNewList(true)}
          className="shrink-0 md:w-full text-left px-3 py-2 rounded-xl text-sm text-gray-500 border border-dashed border-gray-300 whitespace-nowrap">
          + Neue Liste
        </button>
      </div>

      {/* Items */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeList ? (
          <>
            {/* Header */}
            <div className="p-4 md:p-5 border-b border-gray-200 bg-white flex items-center justify-between shrink-0">
              <h1 className="text-xl font-bold">{activeList.name}</h1>
              <button onClick={() => deleteList(activeList.id)} className="text-red-500 text-sm">Löschen</button>
            </div>

            {/* Scrollable item area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-5">
              <DndContext sensors={sensors} collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}>

                {CATEGORIES.map((cat) => (
                  <DroppableCategory key={cat.id} catId={cat.id}
                    items={itemMap[cat.id] ?? []}
                    onToggle={toggleItem}
                    onDelete={deleteItem} />
                ))}

                <DragOverlay>
                  {dragItem && <ItemCard item={dragItem} />}
                </DragOverlay>
              </DndContext>

              {/* Checked items */}
              {checkedItems.length > 0 && (
                <div className="mt-6">
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2 px-1">
                    Erledigt ({checkedItems.length})
                  </p>
                  <div className="space-y-1.5 opacity-60">
                    {checkedItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 bg-white rounded-xl px-3 py-2.5 border border-gray-200">
                        <button onClick={() => toggleItem(item)}
                          className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                          <span className="text-white text-xs">✓</span>
                        </button>
                        <span className="flex-1 text-sm line-through text-gray-500">{item.name}</span>
                        <button onClick={() => deleteItem(item)} className="text-gray-300 hover:text-red-400 text-lg leading-none px-1">×</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Add item form */}
            <div className="shrink-0 bg-white border-t border-gray-200 p-3">
              {/* Category chips */}
              <div className="flex gap-1.5 mb-2 flex-wrap">
                {CATEGORIES.map((cat) => (
                  <button key={cat.id}
                    onClick={() => { setNewCat(cat.id as CategoryId); setCatManual(true) }}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      newCat === cat.id
                        ? "bg-primary-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}>
                    {cat.icon} {cat.label}
                  </button>
                ))}
              </div>

              {/* Input row */}
              <form onSubmit={addItem} className="relative flex gap-2">
                <div className="relative flex-1">
                  <input ref={inputRef} value={newName}
                    onChange={(e) => { setNewName(e.target.value); setShowSuggestions(true) }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                    placeholder="Artikel hinzufügen…"
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
                  />
                  {/* Autocomplete dropdown */}
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute bottom-full mb-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-20">
                      {suggestions.map((s) => {
                        const cat = CATEGORIES.find((c) => c.id === s.category)
                        return (
                          <button key={s.id} type="button"
                            onMouseDown={() => selectSuggestion(s)}
                            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 text-left">
                            <span className="text-sm text-gray-900">{s.displayName}</span>
                            <span className="text-xs text-gray-400 ml-2">{cat?.icon} {cat?.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
                <button type="submit" disabled={!newName.trim()}
                  className="bg-primary-600 text-white px-5 py-2.5 rounded-xl font-medium disabled:opacity-40 text-sm">
                  +
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 flex-col gap-3 p-8">
            <span className="text-5xl">🛒</span>
            <p className="text-center">Erstelle deine erste Einkaufsliste</p>
          </div>
        )}
      </div>

      {/* New list modal */}
      {showNewList && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start md:items-center justify-center p-4 pt-8 md:pt-4">
          <form onSubmit={createList} className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h2 className="font-bold text-lg">Neue Liste</h2>
            <input value={newListName} onChange={(e) => setNewListName(e.target.value)}
              placeholder="z.B. Wocheneinkauf" autoFocus
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary-600" />
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowNewList(false)}
                className="flex-1 border border-gray-300 py-3 rounded-xl text-gray-700">Abbrechen</button>
              <button type="submit" disabled={!newListName.trim()}
                className="flex-1 bg-primary-600 text-white py-3 rounded-xl font-medium disabled:opacity-40">Erstellen</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
