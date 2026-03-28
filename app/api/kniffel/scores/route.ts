import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { calcTotal, type ScoreCard } from "@/lib/kniffel"

export const dynamic = "force-dynamic"

export async function GET() {
  const games = await prisma.kniffelGame.findMany({
    where: { status: "finished" },
    select: { scores: true },
  })

  const totals: Record<string, number> = { Sebastian: 0, Tina: 0 }
  for (const game of games) {
    const scores = JSON.parse(game.scores) as { Sebastian: ScoreCard; Tina: ScoreCard }
    totals.Sebastian += calcTotal(scores.Sebastian)
    totals.Tina += calcTotal(scores.Tina)
  }

  return NextResponse.json(totals)
}
