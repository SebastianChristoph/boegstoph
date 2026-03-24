import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { broadcast } from "@/lib/sse"
import { sendPushToAll } from "@/lib/webpush"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse("Unauthorized", { status: 401 })
  const tasks = await prisma.task.findMany({
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  })
  return NextResponse.json(tasks)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse("Unauthorized", { status: 401 })
  const body = await req.json()
  const task = await prisma.task.create({
    data: {
      title: body.title,
      description: body.description ?? null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      category: body.category || null,
      sortOrder: body.sortOrder ?? 0,
    },
  })
  broadcast("tasks")
  sendPushToAll("✅ Neue Aufgabe", task.title).catch(() => {})
  return NextResponse.json(task, { status: 201 })
}
