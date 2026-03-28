import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { rollDice } from "@/lib/kniffel"
import { broadcast } from "@/lib/sse"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse("Unauthorized", { status: 401 })

  const { held: clientHeld } = await req.json()

  const game = await prisma.kniffelGame.findFirst({ where: { status: "active" }, orderBy: { createdAt: "desc" } })
  if (!game) return new NextResponse("No active game", { status: 404 })
  if (game.rollsLeft <= 0) return new NextResponse("No rolls left", { status: 400 })

  const currentDice: number[] = JSON.parse(game.dice)
  // On first roll of a turn, ignore held — roll all
  const effectiveHeld: boolean[] = game.rollsLeft === 3
    ? [false, false, false, false, false]
    : (clientHeld ?? JSON.parse(game.held))

  const newDice = rollDice(currentDice, effectiveHeld)

  const updated = await prisma.kniffelGame.update({
    where: { id: game.id },
    data: {
      dice: JSON.stringify(newDice),
      held: JSON.stringify(effectiveHeld),
      rollsLeft: game.rollsLeft - 1,
    },
  })

  broadcast("kniffel", { type: "roll", game: updated })
  return NextResponse.json({ game: updated })
}
