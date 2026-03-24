import webpush from "web-push"
import { prisma } from "@/lib/prisma"

webpush.setVapidDetails(
  "mailto:" + (process.env.VAPID_EMAIL ?? "admin@example.com"),
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function sendPushToAll(title: string, body: string) {
  const subs = await prisma.pushSubscription.findMany()
  const payload = JSON.stringify({ title, body })
  const dead: string[] = []

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) dead.push(sub.endpoint)
      }
    })
  )

  if (dead.length) {
    await prisma.pushSubscription.deleteMany({ where: { endpoint: { in: dead } } })
  }
}
