"use client"

import { useCallback, useEffect, useRef, useState } from "react"

interface Photo {
  id: string
  filename: string
  originalName: string
  createdAt: string
}

function Section({ title, icon, children }: {
  title: string
  icon: string
  children: React.ReactNode
}) {
  return (
    <div className="mb-10">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">{icon}</span>
        <h2 className="text-base font-semibold text-gray-800">{title}</h2>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        {children}
      </div>
    </div>
  )
}

export default function EinstellungenPage() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const loadPhotos = useCallback(async () => {
    const res = await fetch("/api/photos")
    if (res.ok) setPhotos(await res.json())
  }, [])

  useEffect(() => { loadPhotos() }, [loadPhotos])

  async function uploadFiles(files: FileList | File[]) {
    setUploading(true)
    for (const file of Array.from(files)) {
      const fd = new FormData()
      fd.append("file", file)
      await fetch("/api/photos", { method: "POST", body: fd })
    }
    await loadPhotos()
    setUploading(false)
  }

  async function deletePhoto(id: string) {
    await fetch(`/api/photos/${id}`, { method: "DELETE" })
    setPhotos((p) => p.filter((x) => x.id !== id))
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files)
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Einstellungen</h1>
        <p className="text-gray-500 mt-1">App-Einstellungen und Verwaltung</p>
      </div>

      {/* ── Fotos ──────────────────────────────────────────────────────────── */}
      <Section title="Fotos — Home-Screen Diashow" icon="📷">
        <p className="text-sm text-gray-500 mb-5">
          Diese Fotos werden auf dem Home-Screen als Diashow angezeigt.
        </p>

        {/* Upload area */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 mb-5 text-center cursor-pointer transition-all ${
            dragOver
              ? "border-primary-600 bg-primary-50"
              : "border-gray-300 hover:border-primary-600 hover:bg-gray-50"
          }`}
        >
          <input ref={inputRef} type="file" multiple accept="image/*" className="hidden"
            onChange={(e) => e.target.files && uploadFiles(e.target.files)} />
          <div className="text-3xl mb-2">{uploading ? "⏳" : "📷"}</div>
          {uploading ? (
            <p className="text-sm text-gray-500">Wird hochgeladen…</p>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-700">Fotos hier hineinziehen</p>
              <p className="text-xs text-gray-400 mt-0.5">oder klicken zum Auswählen</p>
            </>
          )}
        </div>

        {/* Photo grid */}
        {photos.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <div className="text-4xl mb-2">🖼️</div>
            <p className="text-sm">Noch keine Fotos hochgeladen</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400 mb-3">{photos.length} Foto{photos.length !== 1 && "s"}</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {photos.map((photo) => (
                <div key={photo.id} className="relative group aspect-square rounded-xl overflow-hidden bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/photos/file/${photo.filename}`} alt={photo.originalName}
                    className="w-full h-full object-cover" />
                  <button onClick={() => deletePhoto(photo.id)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 hover:bg-red-600 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center"
                    title="Löschen">✕</button>
                </div>
              ))}
            </div>
          </>
        )}
      </Section>

    </div>
  )
}
