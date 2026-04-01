import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { emptyBoard, randomPlayer } from "@/lib/connect4"
import { broadcast } from "@/lib/sse"
import { sendPushToAll } from "@/lib/webpush"

export const dynamic = "force-dynamic"

export async function GET() {
  const game = await prisma.connectFourGame.findFirst({
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(game)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse("Unauthorized", { status: 401 })

  const body = await req.json().catch(() => ({}))
  const excludeEndpoint: string | undefined = body.excludeEndpoint

  await prisma.connectFourGame.updateMany({
    where: { status: "active" },
    data: { status: "finished" },
  })

  const first = randomPlayer()
  const game = await prisma.connectFourGame.create({
    data: {
      board: JSON.stringify(emptyBoard()),
      currentPlayer: first,
      status: "active",
    },
  })

  sendPushToAll("🎮 4-Gewinnt", `Neues Spiel gestartet! ${first} beginnt.`, excludeEndpoint, { standAloneOnly: true }).catch(() => {})
  broadcast("connect4", { type: "new", game })
  return NextResponse.json(game, { status: 201 })
}
