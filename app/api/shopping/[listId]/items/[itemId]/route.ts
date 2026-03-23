import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { broadcast } from "@/lib/sse"
export async function PATCH(req: NextRequest, { params }: { params: { listId: string; itemId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse("Unauthorized", { status: 401 })
  const body = await req.json()
  const item = await prisma.shoppingItem.update({ where: { id: params.itemId }, data: body })
  broadcast("shopping")
  return NextResponse.json(item)
}
export async function DELETE(_req: NextRequest, { params }: { params: { listId: string; itemId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse("Unauthorized", { status: 401 })
  await prisma.shoppingItem.delete({ where: { id: params.itemId } })
  broadcast("shopping")
  return new NextResponse(null, { status: 204 })
}