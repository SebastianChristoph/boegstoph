import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateSauerteigTodos, SauerteigType } from "@/lib/sauerteigTimeline"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse("Unauthorized", { status: 401 })

  const batches = await prisma.sauerteigBatch.findMany({
    where: { status: "active" },
    include: { todos: { orderBy: { sortOrder: "asc" } } },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(batches)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse("Unauthorized", { status: 401 })

  const body = await req.json()
  const type: SauerteigType = body.type
  const startedAt = body.startedAt ? new Date(body.startedAt) : new Date()

  if (!["Roggen", "Weizen", "Dinkel"].includes(type)) {
    return new NextResponse("Ungültiger Typ", { status: 400 })
  }

  const todos = generateSauerteigTodos(type, startedAt)

  const batch = await prisma.sauerteigBatch.create({
    data: {
      type,
      startedAt,
      todos: {
        create: todos.map((t) => ({
          title: t.title,
          detail: t.detail,
          dueDate: t.dueDate,
          sortOrder: t.sortOrder,
        })),
      },
    },
    include: { todos: { orderBy: { sortOrder: "asc" } } },
  })

  return NextResponse.json(batch, { status: 201 })
}
