import { prisma } from "@/lib/prisma"
import TasksWrapper from "@/components/tasks/TasksWrapper"
export const dynamic = "force-dynamic"

export default async function TasksPage() {
  const tasks = await prisma.task.findMany({
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  })
  return <TasksWrapper initialTasks={tasks} />
}
