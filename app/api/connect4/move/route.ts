import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { dropPiece, checkWinner, otherPlayer, type Board, type Player } from "@/lib/connect4"
import { broadcast } from "@/lib/sse"
import { sendPushToAll } from "@/lib/webpush"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse("Unauthorized", { status: 401 })

  const { col, excludeEndpoint } = await req.json()
  if (typeof col !== "number" || col < 0 || col > 6) {
    return new NextResponse("Invalid column", { status: 400 })
  }

  const game = await prisma.connectFourGame.findFirst({
    where: { status: "active" },
    orderBy: { createdAt: "desc" },
  })
  if (!game) return new NextResponse("No active game", { status: 404 })

  const board = JSON.parse(game.board) as Board
  const nextBoard = dropPiece(board, col, game.currentPlayer as Player)
  if (!nextBoard) return new NextResponse("Column full", { status: 400 })

  const winner = checkWinner(nextBoard)
  const finished = winner !== null

  const updated = await prisma.connectFourGame.update({
    where: { id: game.id },
    data: {
      board: JSON.stringify(nextBoard),
      currentPlayer: finished ? game.currentPlayer : otherPlayer(game.currentPlayer as Player),
      winner: winner ?? undefined,
      status: finished ? "finished" : "active",
    },
  })

  if (finished) {
    const msg = winner === "draw"
      ? `Unentschieden! 🤝`
      : `${winner} gewinnt! 🎉`
    sendPushToAll("🎮 4-Gewinnt", msg, excludeEndpoint).catch(() => {})
    broadcast("connect4", { type: "win", winner, game: updated })
    return NextResponse.json({ game: updated })
  }

  const next = updated.currentPlayer
  sendPushToAll("🎮 4-Gewinnt", `${game.currentPlayer} hat gezogen. ${next} ist am Zug!`, excludeEndpoint).catch(() => {})
  broadcast("connect4", { type: "move", game: updated })
  return NextResponse.json({ game: updated })
}
