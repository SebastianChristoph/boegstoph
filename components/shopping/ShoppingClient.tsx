"use client"

import { useCallback, useEffect, useState } from "react"
import type { ShoppingItem, ShoppingList } from "@prisma/client"

type ListWithItems = ShoppingList & { items: ShoppingItem[] }

async function fetchLists(): Promise<ListWithItems[]> {
  const res = await fetch("/api/shopping")
  return res.json()
}

export default function ShoppingClient({ initialLists }: { initialLists: ListWithItems[] }) {
  const [lists, setLists] = useState(initialLists)
  const [activeListId, setActiveListId] = useState<string | null>(initialLists[0]?.id ?? null)
  const [newListName, setNewListName] = useState("")
  const [newItem, setNewItem] = useState("")
  const [showNewList, setShowNewList] = useState(false)

  const reload = useCallback(() => fetchLists().then(setLists), [])

  // SSE for real-time updates
  useEffect(() => {
    const es = new EventSource("/api/events")
    es.onmessage = (e) => {
      const { type } = JSON.parse(e.data)
      if (type === "shopping") reload()
    }
    return () => es.close()
  }, [reload])

  const activeList = lists.find((l) => l.id === activeListId)

  async function createList(e: React.FormEvent) {
    e.preventDefault()
    if (!newListName.trim()) return
    const res = await fetch("/api/shopping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newListName.trim() }),
    })
    const list = await res.json()
    setLists((prev) => [list, ...prev])
    setActiveListId(list.id)
    setNewListName("")
    setShowNewList(false)
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault()
    if (!newItem.trim() || !activeListId) return
    await fetch(`/api/shopping/${activeListId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newItem.trim() }),
    })
    setNewItem("")
    reload()
  }

  async function toggleItem(item: ShoppingItem) {
    await fetch(`/api/shopping/${item.listId}/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checked: !item.checked }),
    })
    reload()
  }

  async function deleteItem(item: ShoppingItem) {
    await fetch(`/api/shopping/${item.listId}/items/${item.id}`, { method: "DELETE" })
    reload()
  }

  async function deleteList(listId: string) {
    await fetch(`/api/shopping/${listId}`, { method: "DELETE" })
    const remaining = lists.filter((l) => l.id !== listId)
    setLists(remaining)
    setActiveListId(remaining[0]?.id ?? null)
  }

  const unchecked = activeList?.items.filter((i) => !i.checked) ?? []
  const checked = activeList?.items.filter((i) => i.checked) ?? []

  return (
    <div className="flex flex-col h-full md:flex-row">
      {/* List selector */}
      <div className="md:w-64 md:border-r md:border-gray-200 bg-white md:bg-gray-50 p-4 flex md:flex-col gap-2 overflow-x-auto md:overflow-y-auto shrink-0">
        <div className="flex items-center justify-between mb-2 hidden md:flex">
          <h2 className="font-semibold text-gray-700">Listen</h2>
          <button
            onClick={() => setShowNewList(true)}
            className="text-primary-600 text-sm font-medium"
          >
            + Neu
          </button>
        </div>
        {lists.map((l) => (
          <button
            key={l.id}
            onClick={() => setActiveListId(l.id)}
            className={`shrink-0 md:w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
              l.id === activeListId
                ? "bg-primary-600 text-white"
                : "bg-white md:bg-white text-gray-700 border border-gray-200"
            }`}
          >
            {l.name}
            <span className={`ml-1 text-xs ${l.id === activeListId ? "text-primary-100" : "text-gray-400"}`}>
              ({l.items.filter((i) => !i.checked).length})
            </span>
          </button>
        ))}
        <button
          onClick={() => setShowNewList(true)}
          className="shrink-0 md:w-full text-left px-3 py-2 rounded-xl text-sm text-gray-500 border border-dashed border-gray-300 whitespace-nowrap"
        >
          + Neue Liste
        </button>
      </div>

      {/* Items */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeList ? (
          <>
            <div className="p-4 md:p-6 border-b border-gray-200 bg-white flex items-center justify-between">
              <h1 className="text-xl font-bold">{activeList.name}</h1>
              <button
                onClick={() => deleteList(activeList.id)}
                className="text-red-500 text-sm"
              >
                Löschen
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-2">
              {unchecked.map((item) => (
                <div key={item.id} className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-gray-200 shadow-sm">
                  <button
                    onClick={() => toggleItem(item)}
                    className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center shrink-0"
                  />
                  <span className="flex-1 text-gray-900">{item.name}</span>
                  <button onClick={() => deleteItem(item)} className="text-gray-300 hover:text-red-400 text-lg">×</button>
                </div>
              ))}

              {checked.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-gray-400 font-medium mb-2 px-1">ERLEDIGT</p>
                  {checked.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-gray-200 opacity-60 mb-2">
                      <button
                        onClick={() => toggleItem(item)}
                        className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shrink-0"
                      >
                        <span className="text-white text-xs">✓</span>
                      </button>
                      <span className="flex-1 line-through text-gray-500">{item.name}</span>
                      <button onClick={() => deleteItem(item)} className="text-gray-300 hover:text-red-400 text-lg">×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={addItem} className="p-4 bg-white border-t border-gray-200 flex gap-2">
              <input
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                placeholder="Artikel hinzufügen..."
                className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary-600"
              />
              <button
                type="submit"
                disabled={!newItem.trim()}
                className="bg-primary-600 text-white px-4 py-3 rounded-xl font-medium disabled:opacity-40"
              >
                +
              </button>
            </form>
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
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4">
          <form
            onSubmit={createList}
            className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4"
          >
            <h2 className="font-bold text-lg">Neue Liste</h2>
            <input
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="z.B. Wocheneinkauf"
              autoFocus
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary-600"
            />
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowNewList(false)} className="flex-1 border border-gray-300 py-3 rounded-xl text-gray-700">
                Abbrechen
              </button>
              <button type="submit" disabled={!newListName.trim()} className="flex-1 bg-primary-600 text-white py-3 rounded-xl font-medium disabled:opacity-40">
                Erstellen
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
