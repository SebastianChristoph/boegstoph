"use client"

import { useCallback, useEffect, useState } from "react"

interface GardenNote {
  id: string
  title: string
  body: string
  createdAt: string
  updatedAt: string
}

export default function NotesTab() {
  const [notes, setNotes] = useState<GardenNote[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newBody, setNewBody] = useState("")
  const [editId, setEditId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editBody, setEditBody] = useState("")

  const load = useCallback(async () => {
    const res = await fetch("/api/garden/notes")
    if (res.ok) setNotes(await res.json())
  }, [])

  useEffect(() => { load() }, [load])

  async function addNote() {
    if (!newTitle.trim()) return
    const res = await fetch("/api/garden/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle, body: newBody }),
    })
    if (res.ok) {
      const note = await res.json()
      setNotes(n => [note, ...n])
      setNewTitle(""); setNewBody(""); setShowAdd(false)
    }
  }

  async function saveEdit(id: string) {
    const res = await fetch(`/api/garden/notes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editTitle, body: editBody }),
    })
    if (res.ok) {
      const updated = await res.json()
      setNotes(n => n.map(x => x.id === id ? updated : x))
      setEditId(null)
    }
  }

  async function deleteNote(id: string) {
    if (!confirm("Notiz löschen?")) return
    const res = await fetch(`/api/garden/notes/${id}`, { method: "DELETE" })
    if (res.ok) setNotes(n => n.filter(x => x.id !== id))
  }

  function startEdit(note: GardenNote) {
    setEditId(note.id)
    setEditTitle(note.title)
    setEditBody(note.body)
    setShowAdd(false)
  }

  return (
    <div>
      <button onClick={() => { setShowAdd(!showAdd); setEditId(null) }}
        className="w-full border-2 border-dashed border-gray-300 hover:border-primary-400 rounded-xl py-2.5 text-sm text-gray-500 hover:text-primary-600 transition-colors mb-4">
        + Notiz hinzufügen
      </button>

      {showAdd && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-4 shadow-sm">
          <div className="space-y-3">
            <input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Titel"
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
            <textarea
              value={newBody}
              onChange={e => setNewBody(e.target.value)}
              placeholder="Notiz…"
              rows={4}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
            />
            <div className="flex gap-2">
              <button onClick={addNote} disabled={!newTitle.trim()}
                className="flex-1 bg-primary-600 text-white py-2 rounded-xl text-sm font-medium disabled:opacity-40">
                Speichern
              </button>
              <button onClick={() => setShowAdd(false)} className="px-4 rounded-xl text-sm text-gray-500 hover:bg-gray-100">Abbrechen</button>
            </div>
          </div>
        </div>
      )}

      {notes.length === 0 && !showAdd ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-5xl mb-3">📝</div>
          <p className="text-sm">Noch keine Notizen</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map(note => (
            <div key={note.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              {editId === note.id ? (
                <div className="p-4 space-y-3">
                  <input
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                  />
                  <textarea
                    value={editBody}
                    onChange={e => setEditBody(e.target.value)}
                    rows={4}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => saveEdit(note.id)} disabled={!editTitle.trim()}
                      className="flex-1 bg-primary-600 text-white py-2 rounded-xl text-sm font-medium disabled:opacity-40">
                      Speichern
                    </button>
                    <button onClick={() => setEditId(null)} className="px-4 rounded-xl text-sm text-gray-500 hover:bg-gray-100">Abbrechen</button>
                  </div>
                </div>
              ) : (
                <div className="px-4 py-3">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 text-sm">{note.title}</div>
                      {note.body && (
                        <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{note.body}</p>
                      )}
                      <div className="text-[11px] text-gray-400 mt-2">
                        {new Date(note.updatedAt).toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" })}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => startEdit(note)} className="text-gray-400 hover:text-gray-700 text-xs p-1">✏️</button>
                      <button onClick={() => deleteNote(note.id)} className="text-gray-400 hover:text-red-500 text-xs p-1">🗑️</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
