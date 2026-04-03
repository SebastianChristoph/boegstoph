import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { broadcast } from "@/lib/sse"

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse("Unauthorized", { status: 401 })
  const body = await req.json()
  const todo = await prisma.gardenTodo.update({
    where: { id: params.id },
    data: {
      done: body.done !== undefined ? body.done : undefined,
      completedAt: body.done === true ? new Date() : body.done === false ? null : undefined,
      title: body.title?.trim(),
      dueDate: body.dueDate !== undefined ? (body.dueDate ? new Date(body.dueDate) : null) : undefined,
    },
    include: { season: { include: { plant: true } } },
  })
  broadcast("garden-todos")
  return NextResponse.json(todo)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse("Unauthorized", { status: 401 })
  await prisma.gardenTodo.delete({ where: { id: params.id } })
  broadcast("garden-todos")
  return new NextResponse(null, { status: 204 })
}
