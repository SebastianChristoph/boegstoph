import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import emitter from "@/lib/sse"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return new Response("Unauthorized", { status: 401 })

  const encoder = new TextEncoder()
  let cleanup: (() => void) | undefined

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(": ping\n\n"))

      const listener = (data: string) => {
        try {
          controller.enqueue(encoder.encode("data: " + data + "\n\n"))
        } catch {
          cleanup?.()
        }
      }

      emitter.on("update", listener)
      cleanup = () => emitter.off("update", listener)
    },
    cancel() {
      cleanup?.()
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
