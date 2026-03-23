import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { broadcast } from "@/lib/sse"
import { normalize, DEFAULT_CATEGORY } from "@/lib/knowledge"

export async function POST(req: NextRequest, { params }: { params: { listId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse("Unauthorized", { status: 401 })

  const { name, category, sortOrder } = await req.json()
  const cat = category ?? DEFAULT_CATEGORY

  const item = await prisma.shoppingItem.create({
    data: { name, listId: params.listId, category: cat, sortOrder: sortOrder ?? 0 },
  })

  const keyword = normalize(name)
  if (keyword) {
    await prisma.itemKnowledge.upsert({
      where: { keyword },
      create: { keyword, displayName: name, category: cat },
      update: { displayName: name, category: cat, useCount: { increment: 1 } },
    })
  }

  broadcast("shopping")
  return NextResponse.json(item, { status: 201 })
}
