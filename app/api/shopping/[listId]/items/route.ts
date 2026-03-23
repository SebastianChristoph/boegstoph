import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { broadcast } from "@/lib/sse"
export async function POST(req: NextRequest, { params }: { params: { listId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse("Unauthorized", { status: 401 })
  const { name } = await req.json()
  const item = await prisma.shoppingItem.create({ data: { name, listId: params.listId } })
  broadcast("shopping")
  return NextResponse.json(item, { status: 201 })
}