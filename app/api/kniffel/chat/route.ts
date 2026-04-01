import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { broadcast } from "@/lib/sse"

export const dynamic = "force-dynamic"

type ChatMsg = { player: string; text: string; ts: string }

export async function POST(req: Request) {
  const { text, player } = await req.json()
  if (!text?.trim()) return NextResponse.json({ error: "empty" }, { status: 400 })
  if (player !== "Sebastian" && player !== "Tina") return NextResponse.json({ error: "invalid player" }, { status: 400 })

  const game = await prisma.kniffelGame.findFirst({ orderBy: { createdAt: "desc" } })
  if (!game) return NextResponse.json({ error: "no game" }, { status: 404 })

  const sender = player as string
  const messages: ChatMsg[] = JSON.parse(game.messages ?? "[]")
  messages.push({ player: sender, text: text.trim(), ts: new Date().toISOString() })
  if (messages.length > 20) messages.splice(0, messages.length - 20)

  const updated = await prisma.kniffelGame.update({
    where: { id: game.id },
    data: { messages: JSON.stringify(messages) },
  })

  broadcast("kniffel", { type: "chat", game: updated })
  return NextResponse.json(updated)
}

export async function DELETE() {
  const game = await prisma.kniffelGame.findFirst({ orderBy: { createdAt: "desc" } })
  if (!game) return NextResponse.json({ error: "no game" }, { status: 404 })
  const updated = await prisma.kniffelGame.update({
    where: { id: game.id },
    data: { messages: "[]" },
  })
  broadcast("kniffel", { type: "chat", game: updated })
  return NextResponse.json(updated)
}
