import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  req: NextRequest,
  { params }: { params: { batchId: string; todoId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse("Unauthorized", { status: 401 })

  const body = await req.json()
  const done: boolean = body.done

  const todo = await prisma.sauerteigTodo.update({
    where: { id: params.todoId },
    data: { doneAt: done ? new Date() : null },
  })
  return NextResponse.json(todo)
}
