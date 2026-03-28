import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET() {
  const rows = await prisma.connectFourGame.groupBy({
    by: ["winner"],
    where: { status: "finished", winner: { not: null } },
    _count: { winner: true },
  })

  const scores: Record<string, number> = { Sebastian: 0, Tina: 0 }
  for (const row of rows) {
    if (row.winner && row.winner !== "draw") {
      scores[row.winner] = row._count.winner
    }
  }

  return NextResponse.json(scores)
}
