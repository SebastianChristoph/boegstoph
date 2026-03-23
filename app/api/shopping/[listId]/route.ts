import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { broadcast } from "@/lib/sse"
export async function DELETE(_req: NextRequest, { params }: { params: { listId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse("Unauthorized", { status: 401 })
  await prisma.shoppingList.delete({ where: { id: params.listId } })
  broadcast("shopping")
  return new NextResponse(null, { status: 204 })
}