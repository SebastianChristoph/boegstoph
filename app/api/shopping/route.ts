import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { broadcast } from "@/lib/sse"
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse("Unauthorized", { status: 401 })
  const lists = await prisma.shoppingList.findMany({
    include: { items: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(lists)
}
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse("Unauthorized", { status: 401 })
  const { name } = await req.json()
  const list = await prisma.shoppingList.create({ data: { name }, include: { items: true } })
  broadcast("shopping")
  return NextResponse.json(list, { status: 201 })
}