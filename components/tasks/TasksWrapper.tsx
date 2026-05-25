"use client"

import type { Task } from "@prisma/client"
import TasksClient from "./TasksClient"

export default function TasksWrapper({ initialTasks }: { initialTasks: Task[] }) {
  return (
    <div className="flex flex-col h-full">
      <TasksClient initialTasks={initialTasks} />
    </div>
  )
}
