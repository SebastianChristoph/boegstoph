"use client"

import { useState } from "react"
import type { Task, SauerteigBatch, SauerteigTodo } from "@prisma/client"
import TasksClient from "./TasksClient"
import BrotTab from "@/components/brot/BrotTab"

type BatchWithTodos = SauerteigBatch & { todos: SauerteigTodo[] }

export default function TasksWrapper({
  initialTasks,
  initialBatches,
}: {
  initialTasks: Task[]
  initialBatches: BatchWithTodos[]
}) {
  const [activeTab, setActiveTab] = useState<"aufgaben" | "brot">("aufgaben")

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex gap-1 px-4 pt-3 bg-white border-b border-gray-200 shrink-0">
        <button
          onClick={() => setActiveTab("aufgaben")}
          className={`px-4 py-2 text-sm font-medium rounded-t-xl border-b-2 transition-colors
            ${activeTab === "aufgaben"
              ? "border-primary-600 text-primary-600"
              : "border-transparent text-gray-500 hover:text-gray-700"}`}
        >
          ✅ Aufgaben
        </button>
        <button
          onClick={() => setActiveTab("brot")}
          className={`px-4 py-2 text-sm font-medium rounded-t-xl border-b-2 transition-colors
            ${activeTab === "brot"
              ? "border-amber-500 text-amber-600"
              : "border-transparent text-gray-500 hover:text-gray-700"}`}
        >
          🍞 Brot
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === "aufgaben" ? (
          <TasksClient initialTasks={initialTasks} />
        ) : (
          <BrotTab initialBatches={initialBatches} />
        )}
      </div>
    </div>
  )
}
