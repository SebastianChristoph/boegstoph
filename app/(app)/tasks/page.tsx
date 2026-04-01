import { prisma } from "@/lib/prisma"
import TasksWrapper from "@/components/tasks/TasksWrapper"
export const dynamic = "force-dynamic"

export default async function TasksPage() {
  const [tasks, batches] = await Promise.all([
    prisma.task.findMany({
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.sauerteigBatch.findMany({
      where: { status: "active" },
      include: { todos: { orderBy: { sortOrder: "asc" } } },
      orderBy: { createdAt: "desc" },
    }),
  ])
  return <TasksWrapper initialTasks={tasks} initialBatches={batches} />
}
