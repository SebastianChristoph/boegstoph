export async function fetchLatestThermometerCSV(): Promise<string | null> {
  const host = process.env.IMAP_HOST
  const user = process.env.IMAP_USER
  const pass = process.env.IMAP_PASS
  const port = parseInt(process.env.IMAP_PORT ?? "993")

  if (!host || !user || !pass) {
    throw new Error("IMAP credentials not configured (IMAP_HOST, IMAP_USER, IMAP_PASS)")
  }

  // Dynamic imports to avoid bundling issues
  const { ImapFlow } = await import("imapflow")
  const { simpleParser } = await import("mailparser")

  const client = new ImapFlow({
    host,
    port,
    secure: port === 993,
    auth: { user, pass },
    logger: false,
  })

  await client.connect()

  try {
    await client.mailboxOpen("INBOX")

    // Search last 2 days to catch any delay in email delivery
    const since = new Date()
    since.setDate(since.getDate() - 2)

    const uids = await client.search({ since }, { uid: true })
    if (!uids || !uids.length) return null

    // Check newest messages first
    for (let i = uids.length - 1; i >= 0; i--) {
      for await (const msg of client.fetch([uids[i]], { source: true }, { uid: true })) {
        if (!msg.source) continue
        const parsed = await simpleParser(msg.source)

        for (const att of parsed.attachments) {
          if (att.filename?.toLowerCase().endsWith(".csv")) {
            // Mark as seen so we don't re-import on next cron run
            await client.messageFlagsAdd([uids[i]], ["\\Seen"], { uid: true })
            return att.content.toString("utf-8")
          }
        }
      }
    }

    return null
  } finally {
    await client.logout()
  }
}
