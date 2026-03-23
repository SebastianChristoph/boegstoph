"use client"

import { useState } from "react"
import PlantsTab from "@/components/garten/PlantsTab"
import CalendarTab from "@/components/garten/CalendarTab"
import TodosTab from "@/components/garten/TodosTab"
import BedsTab from "@/components/garten/BedsTab"

type Tab = "pflanzen" | "kalender" | "todos" | "beete"

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: "pflanzen", label: "Pflanzen", emoji: "🌱" },
  { id: "kalender", label: "Kalender", emoji: "📅" },
  { id: "todos", label: "Todos", emoji: "✅" },
  { id: "beete", label: "Beete", emoji: "🪴" },
]

export default function GartenPage() {
  const [tab, setTab] = useState<Tab>("pflanzen")

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Garten</h1>
        <p className="text-gray-500 mt-1">Planung, Zeitplan & Tagebuch</p>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors shrink-0 ${
              tab === t.id ? "bg-primary-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}>
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {tab === "pflanzen" && <PlantsTab />}
      {tab === "kalender" && <CalendarTab />}
      {tab === "todos" && <TodosTab />}
      {tab === "beete" && <BedsTab />}
    </div>
  )
}
