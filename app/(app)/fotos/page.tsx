"use client"

import { useCallback, useEffect, useRef, useState } from "react"

interface Photo {
  id: string
  filename: string
  originalName: string
  createdAt: string
}

export default function FotosPage() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    const res = await fetch("/api/photos")
    if (res.ok) setPhotos(await res.json())
  }, [])

  useEffect(() => { load() }, [load])

  async function uploadFiles(files: FileList | File[]) {
    setUploading(true)
    for (const file of Array.from(files)) {
      const fd = new FormData()
      fd.append("file", file)
      await fetch("/api/photos", { method: "POST", body: fd })
    }
    await load()
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
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Fotos</h1>
        <p className="text-gray-500 mt-1">
          Diese Fotos werden auf dem Home-Screen als Diashow angezeigt.
        </p>
      </div>

      {/* Upload area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-2xl p-8 mb-8 text-center cursor-pointer transition-all
          ${dragOver
            ? "border-primary-600 bg-primary-50"
            : "border-gray-300 hover:border-primary-600 hover:bg-gray-50"
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files && uploadFiles(e.target.files)}
        />
        <div className="text-4xl mb-3">{uploading ? "⏳" : "📷"}</div>
        {uploading ? (
          <p className="text-gray-500">Wird hochgeladen…</p>
        ) : (
          <>
            <p className="font-medium text-gray-700">Fotos hier hineinziehen</p>
            <p className="text-sm text-gray-500 mt-1">oder klicken zum Auswählen</p>
          </>
        )}
      </div>

      {/* Photo grid */}
      {photos.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">🖼️</div>
          <p>Noch keine Fotos hochgeladen</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-4">{photos.length} Foto{photos.length !== 1 && "s"}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {photos.map((photo) => (
              <div key={photo.id} className="relative group aspect-square rounded-xl overflow-hidden bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/photos/file/${photo.filename}`}
                  alt={photo.originalName}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => deletePhoto(photo.id)}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/60 hover:bg-red-600 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center"
                  title="Löschen"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
