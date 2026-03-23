import { prisma } from "@/lib/prisma"
import TasksClient from "@/components/tasks/TasksClient"
export default async function TasksPage() {
  const tasks = await prisma.task.findMany({
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  })
  return <TasksClient initialTasks={tasks} />
}