import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET() {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  const todos = await prisma.gardenTodo.findMany({
    where: { done: false, dueDate: { gte: monthStart, lte: monthEnd } },
    select: { title: true },
  })
  const count = new Set(todos.map(t => t.title)).size
  return NextResponse.json({ count })
}
