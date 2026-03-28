import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { randomPlayer, emptyScoreCard } from "@/lib/kniffel"
import { broadcast } from "@/lib/sse"
import { sendPushToAll } from "@/lib/webpush"

export const dynamic = "force-dynamic"

export async function GET() {
  const game = await prisma.kniffelGame.findFirst({ orderBy: { createdAt: "desc" } })
  return NextResponse.json(game)
}

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse("Unauthorized", { status: 401 })

  await prisma.kniffelGame.updateMany({ where: { status: "active" }, data: { status: "finished" } })

  const first = randomPlayer()
  const game = await prisma.kniffelGame.create({
    data: {
      currentPlayer: first,
      scores: JSON.stringify({ Sebastian: emptyScoreCard(), Tina: emptyScoreCard() }),
      dice: JSON.stringify([0, 0, 0, 0, 0]),
      held: JSON.stringify([false, false, false, false, false]),
      rollsLeft: 3,
    },
  })

  sendPushToAll("🎲 Kniffel", `Neues Spiel! ${first} beginnt.`).catch(() => {})
  broadcast("kniffel", { type: "new", game })
  return NextResponse.json(game, { status: 201 })
}
