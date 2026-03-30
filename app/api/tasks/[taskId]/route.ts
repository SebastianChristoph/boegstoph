import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { broadcast } from "@/lib/sse"
import { sendPushToAll } from "@/lib/webpush"

export async function PATCH(req: NextRequest, { params }: { params: { taskId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse("Unauthorized", { status: 401 })
  const body = await req.json()
  const task = await prisma.task.update({ where: { id: params.taskId }, data: body })
  broadcast("tasks")
  if (body.completed === true) {
    sendPushToAll("✅ Aufgabe erledigt", task.title, undefined, { standAloneOnly: true }).catch(() => {})
  }
  return NextResponse.json(task)
}
export async function DELETE(_req: NextRequest, { params }: { params: { taskId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse("Unauthorized", { status: 401 })
  await prisma.task.delete({ where: { id: params.taskId } })
  broadcast("tasks")
  return new NextResponse(null, { status: 204 })
}