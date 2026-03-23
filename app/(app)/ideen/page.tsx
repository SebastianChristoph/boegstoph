"use client"

import { useCallback, useEffect, useRef, useState } from "react"

type Tab = "essen" | "wuensche"

interface FoodIdea {
  id: string
  text: string
  createdAt: string
}

interface BirthdayWish {
  id: string
  person: string
  wish: string
  createdAt: string
}

const PERSONS = ["Tina", "Sebastian", "Fritz", "Ede"] as const

// ── Essen ────────────────────────────────────────────────────────────────────

function EssenTab() {
  const [ideas, setIdeas] = useState<FoodIdea[]>([])
  const [input, setInput] = useState("")
  const [editId, setEditId] = useState<string | null>(null)
  const [editText, setEditText] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    const res = await fetch("/api/ideen/essen")
    if (res.ok) setIdeas(await res.json())
  }, [])

  useEffect(() => { load() }, [load])

  async function add() {
    const text = input.trim()
    if (!text) return
    const res = await fetch("/api/ideen/essen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    })
    if (res.ok) {
      const idea = await res.json()
      setIdeas((p) => [idea, ...p])
      setInput("")
      inputRef.current?.focus()
    }
  }

  async function save(id: string) {
    const text = editText.trim()
    if (!text) return
    const res = await fetch(`/api/ideen/essen/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    })
    if (res.ok) {
      const updated = await res.json()
      setIdeas((p) => p.map((i) => (i.id === id ? updated : i)))
      setEditId(null)
    }
  }

  async function remove(id: string) {
    await fetch(`/api/ideen/essen/${id}`, { method: "DELETE" })
    setIdeas((p) => p.filter((i) => i.id !== id))
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">Was könnte man mal wieder essen? Einfach festhalten.</p>
      <div className="flex gap-2 mb-5">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Idee eingeben…"
          className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
        />
        <button
          onClick={add}
          disabled={!input.trim()}
          className="bg-primary-600 text-white px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-40"
        >
          + Hinzufügen
        </button>
      </div>

      {ideas.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <div className="text-4xl mb-2">🍽️</div>
          <p className="text-sm">Noch keine Ideen</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {ideas.map((idea) => (
            <li key={idea.id} className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
              {editId === idea.id ? (
                <>
                  <input
                    autoFocus
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") save(idea.id)
                      if (e.key === "Escape") setEditId(null)
                    }}
                    className="flex-1 border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                  />
                  <button onClick={() => save(idea.id)} className="text-xs text-primary-600 font-medium px-2">✓</button>
                  <button onClick={() => setEditId(null)} className="text-xs text-gray-400 px-1">✕</button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-gray-800">{idea.text}</span>
                  <button
                    onClick={() => { setEditId(idea.id); setEditText(idea.text) }}
                    className="text-gray-400 hover:text-gray-700 text-xs px-1"
                    title="Bearbeiten"
                  >✏️</button>
                  <button
                    onClick={() => remove(idea.id)}
                    className="text-gray-400 hover:text-red-500 text-xs px-1"
                    title="Löschen"
                  >🗑️</button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Geburtstagsgeschenke ─────────────────────────────────────────────────────

function WuenscheTab() {
  const [wishes, setWishes] = useState<BirthdayWish[]>([])
  const [inputs, setInputs] = useState<Record<string, string>>({})
  const [editId, setEditId] = useState<string | null>(null)
  const [editText, setEditText] = useState("")

  const load = useCallback(async () => {
    const res = await fetch("/api/ideen/wuensche")
    if (res.ok) setWishes(await res.json())
  }, [])

  useEffect(() => { load() }, [load])

  async function add(person: string) {
    const wish = (inputs[person] || "").trim()
    if (!wish) return
    const res = await fetch("/api/ideen/wuensche", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ person, wish }),
    })
    if (res.ok) {
      const entry = await res.json()
      setWishes((p) => [...p, entry])
      setInputs((p) => ({ ...p, [person]: "" }))
    }
  }

  async function save(id: string) {
    const wish = editText.trim()
    if (!wish) return
    const res = await fetch(`/api/ideen/wuensche/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wish }),
    })
    if (res.ok) {
      const updated = await res.json()
      setWishes((p) => p.map((w) => (w.id === id ? updated : w)))
      setEditId(null)
    }
  }

  async function remove(id: string) {
    await fetch(`/api/ideen/wuensche/${id}`, { method: "DELETE" })
    setWishes((p) => p.filter((w) => w.id !== id))
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">Was wünscht sich wer zum Geburtstag? Damit man's nicht vergisst.</p>
      {PERSONS.map((person) => {
        const personWishes = wishes.filter((w) => w.person === person)
        return (
          <div key={person} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
              <h3 className="font-semibold text-gray-800 text-sm">{person}</h3>
            </div>
            <div className="p-4">
              {personWishes.length === 0 ? (
                <p className="text-xs text-gray-400 mb-3">Noch keine Wünsche</p>
              ) : (
                <ul className="space-y-2 mb-3">
                  {personWishes.map((w) => (
                    <li key={w.id} className="flex items-center gap-2">
                      {editId === w.id ? (
                        <>
                          <input
                            autoFocus
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") save(w.id)
                              if (e.key === "Escape") setEditId(null)
                            }}
                            className="flex-1 border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                          />
                          <button onClick={() => save(w.id)} className="text-xs text-primary-600 font-medium px-1">✓</button>
                          <button onClick={() => setEditId(null)} className="text-xs text-gray-400 px-1">✕</button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 text-sm text-gray-700">🎁 {w.wish}</span>
                          <button
                            onClick={() => { setEditId(w.id); setEditText(w.wish) }}
                            className="text-gray-400 hover:text-gray-700 text-xs"
                            title="Bearbeiten"
                          >✏️</button>
                          <button
                            onClick={() => remove(w.id)}
                            className="text-gray-400 hover:text-red-500 text-xs"
                            title="Löschen"
                          >🗑️</button>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2">
                <input
                  value={inputs[person] || ""}
                  onChange={(e) => setInputs((p) => ({ ...p, [person]: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && add(person)}
                  placeholder="Wunsch hinzufügen…"
                  className="flex-1 border border-gray-300 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
                <button
                  onClick={() => add(person)}
                  disabled={!(inputs[person] || "").trim()}
                  className="bg-primary-600 text-white px-3 py-1.5 rounded-xl text-sm font-medium disabled:opacity-40"
                >+</button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function IdeenPage() {
  const [tab, setTab] = useState<Tab>("essen")

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Ideen</h1>
        <p className="text-gray-500 mt-1">Essen & Geburtstagsgeschenke</p>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab("essen")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            tab === "essen" ? "bg-primary-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          🍽️ Essen
        </button>
        <button
          onClick={() => setTab("wuensche")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            tab === "wuensche" ? "bg-primary-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          🎁 Geburtstagsgeschenke
        </button>
      </div>

      {tab === "essen" ? <EssenTab /> : <WuenscheTab />}
    </div>
  )
}
