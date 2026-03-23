import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { broadcast } from "@/lib/sse"

export async function POST(req: NextRequest, { params }: { params: { listId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse("Unauthorized", { status: 401 })

  const updates: { id: string; category: string; sortOrder: number }[] = await req.json()

  await prisma.$transaction(
    updates.map((u) =>
      prisma.shoppingItem.update({
        where: { id: u.id },
        data: { category: u.category, sortOrder: u.sortOrder },
      })
    )
  )

  broadcast("shopping")
  return new NextResponse(null, { status: 204 })
}
