import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { broadcast } from "@/lib/sse"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse("Unauthorized", { status: 401 })

  const updates: { id: string; category: string | null; sortOrder: number }[] = await req.json()

  await prisma.$transaction(
    updates.map((u) =>
      prisma.task.update({
        where: { id: u.id },
        data: { category: u.category, sortOrder: u.sortOrder },
      })
    )
  )

  broadcast("tasks")
  return new NextResponse(null, { status: 204 })
}
