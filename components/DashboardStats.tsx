"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

interface Stats {
  uncheckedItems: number
  openTasks: number
  overdueTasks: number
}

export default function DashboardStats() {
  const [stats, setStats] = useState<Stats | null>(null)

  async function load() {
    const [listsRes, tasksRes] = await Promise.all([
      fetch("/api/shopping"),
      fetch("/api/tasks"),
    ])
    const [lists, tasks] = await Promise.all([
      listsRes.ok ? listsRes.json() : [],
      tasksRes.ok ? tasksRes.json() : [],
    ])
    const uncheckedItems = (lists as { items: { checked: boolean }[] }[])
      .reduce((s: number, l) => s + l.items.filter(i => !i.checked).length, 0)
    const openTasks = (tasks as { completed: boolean; dueDate: string | null }[]).filter(t => !t.completed)
    setStats({
      uncheckedItems,
      openTasks: openTasks.length,
      overdueTasks: openTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date()).length,
    })
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    const es = new EventSource("/api/events")
    es.onopen = () => load()
    es.onmessage = (e) => {
      const { type } = JSON.parse(e.data)
      if (type === "shopping" || type === "tasks") load()
    }
    return () => es.close()
  }, [])

  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === "visible") load() }
    document.addEventListener("visibilitychange", onVisible)
    return () => document.removeEventListener("visibilitychange", onVisible)
  }, [])

  const s = stats

  return (
    <>
      <Link href="/shopping" className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm active:scale-95 transition-transform">
        <div className="text-3xl mb-2">🛒</div>
        <div className="text-2xl font-bold text-gray-900">{s?.uncheckedItems ?? "…"}</div>
        <div className="text-sm text-gray-500 mt-0.5">Artikel offen</div>
      </Link>
      <Link href="/tasks" className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm active:scale-95 transition-transform">
        <div className="text-3xl mb-2">✅</div>
        <div className="text-2xl font-bold text-gray-900">{s?.openTasks ?? "…"}</div>
        <div className="text-sm text-gray-500 mt-0.5">
          Offene Aufgaben
          {(s?.overdueTasks ?? 0) > 0 && <span className="ml-1 text-red-500">({s!.overdueTasks} überfällig)</span>}
        </div>
      </Link>
    </>
  )
}
