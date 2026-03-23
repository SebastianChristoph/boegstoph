"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

export default function GardenTodosCard() {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    fetch("/api/garden/todos/count-month")
      .then(r => r.json())
      .then(d => setCount(d.count))
      .catch(() => setCount(0))
  }, [])

  return (
    <Link href="/garten?tab=todos" className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm active:scale-95 transition-transform">
      <div className="text-3xl mb-2">🌱</div>
      <div className="text-2xl font-bold text-gray-900">{count ?? "…"}</div>
      <div className="text-sm text-gray-500 mt-0.5">Todos diesen Monat</div>
    </Link>
  )
}
