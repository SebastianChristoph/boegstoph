import { prisma } from "@/lib/prisma"
import TasksClient from "@/components/tasks/TasksClient"
export default async function TasksPage() {
  const tasks = await prisma.task.findMany({ orderBy: { createdAt: "desc" } })
  return <TasksClient initialTasks={tasks} />
}