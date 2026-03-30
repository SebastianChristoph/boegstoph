import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { broadcast } from "@/lib/sse"

export const dynamic = "force-dynamic"

type ChatMsg = { player: string; text: string; ts: string }

export async function POST(req: Request) {
  const { text } = await req.json()
  if (!text?.trim()) return NextResponse.json({ error: "empty" }, { status: 400 })

  const game = await prisma.connectFourGame.findFirst({ orderBy: { createdAt: "desc" } })
  if (!game) return NextResponse.json({ error: "no game" }, { status: 404 })

  const sender = game.currentPlayer === "Sebastian" ? "Tina" : "Sebastian"
  const messages: ChatMsg[] = JSON.parse(game.messages ?? "[]")
  messages.push({ player: sender, text: text.trim(), ts: new Date().toISOString() })
  if (messages.length > 20) messages.splice(0, messages.length - 20)

  const updated = await prisma.connectFourGame.update({
    where: { id: game.id },
    data: { messages: JSON.stringify(messages) },
  })

  broadcast("connect4", { type: "chat", game: updated })
  return NextResponse.json(updated)
}
