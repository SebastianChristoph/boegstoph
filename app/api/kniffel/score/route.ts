import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { calcScore, calcTotal, isCardFull, otherPlayer, type Category, type ScoreCard } from "@/lib/kniffel"
import { broadcast } from "@/lib/sse"
import { sendPushToAll } from "@/lib/webpush"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse("Unauthorized", { status: 401 })

  const { category, excludeEndpoint } = await req.json()

  const game = await prisma.kniffelGame.findFirst({ where: { status: "active" }, orderBy: { createdAt: "desc" } })
  if (!game) return new NextResponse("No active game", { status: 404 })
  if (game.rollsLeft === 3) return new NextResponse("Must roll first", { status: 400 })

  const scores = JSON.parse(game.scores) as Record<string, ScoreCard>
  const dice: number[] = JSON.parse(game.dice)
  const player = game.currentPlayer as "Sebastian" | "Tina"

  if (scores[player][category as Category] !== null) {
    return new NextResponse("Category already scored", { status: 400 })
  }

  const scored = calcScore(dice, category as Category)
  scores[player][category as Category] = scored

  const next = otherPlayer(player)
  const bothFull = isCardFull(scores.Sebastian) && isCardFull(scores.Tina)

  const updated = await prisma.kniffelGame.update({
    where: { id: game.id },
    data: {
      scores: JSON.stringify(scores),
      currentPlayer: bothFull ? player : next,
      status: bothFull ? "finished" : "active",
      dice: JSON.stringify([0, 0, 0, 0, 0]),
      held: JSON.stringify([false, false, false, false, false]),
      rollsLeft: bothFull ? 0 : 3,
      lastMove: JSON.stringify({ player, category, score: scored, dice }),
    },
  })

  if (bothFull) {
    const sebTotal = calcTotal(scores.Sebastian)
    const tinaTotal = calcTotal(scores.Tina)
    const winner = sebTotal > tinaTotal ? "Sebastian" : tinaTotal > sebTotal ? "Tina" : "draw"
    // Update winner field
    await prisma.kniffelGame.update({ where: { id: updated.id }, data: { winner } })
    const msg = winner === "draw" ? "Unentschieden! 🤝" : `${winner} gewinnt Kniffel! 🎉`
    sendPushToAll("🎲 Kniffel", msg, excludeEndpoint, { standAloneOnly: true }).catch(() => {})
    broadcast("kniffel", { type: "finished", winner, game: { ...updated, winner } })
  } else {
    sendPushToAll("🎲 Kniffel", `${player} hat gewertet. ${next} ist dran!`, excludeEndpoint, { standAloneOnly: true }).catch(() => {})
    broadcast("kniffel", { type: "score", game: updated })
  }

  return NextResponse.json({ game: updated })
}
