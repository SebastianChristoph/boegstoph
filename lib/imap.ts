export interface ThermometerMailResult {
  csv: string
  source: "gh" | "out"
}

function detectSource(filename: string): "gh" | "out" {
  const lower = filename.toLowerCase()
  if (lower.includes("out")) return "out"
  if (lower.includes("gh")) return "gh"
  return "gh" // fallback: bisherige Daten sind Gewächshaus
}

export async function fetchAllThermometerCSVs(): Promise<ThermometerMailResult[]> {
  const host = process.env.IMAP_HOST
  const user = process.env.IMAP_USER
  const pass = process.env.IMAP_PASS
  const port = parseInt(process.env.IMAP_PORT ?? "993")

  if (!host || !user || !pass) {
    throw new Error("IMAP credentials not configured (IMAP_HOST, IMAP_USER, IMAP_PASS)")
  }

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

  const results: ThermometerMailResult[] = []

  try {
    await client.mailboxOpen("INBOX")

    const since = new Date()
    since.setDate(since.getDate() - 2)

    const uids = await client.search({ since }, { uid: true })
    if (!uids || !uids.length) return results

    for (let i = uids.length - 1; i >= 0; i--) {
      for await (const msg of client.fetch([uids[i]], { source: true }, { uid: true })) {
        if (!msg.source) continue
        const parsed = await simpleParser(msg.source)

        for (const att of parsed.attachments) {
          if (att.filename?.toLowerCase().endsWith(".csv")) {
            const source = detectSource(att.filename)
            // Nur hinzufügen wenn wir für diese Source noch keinen Treffer haben
            if (!results.find(r => r.source === source)) {
              await client.messageFlagsAdd([uids[i]], ["\\Seen"], { uid: true })
              results.push({ csv: att.content.toString("utf-8"), source })
            }
          }
        }
      }
      if (results.length === 2) break // beide Thermometer gefunden
    }

    return results
  } finally {
    await client.logout()
  }
}

/** Backwards-compat: holt nur GH-CSV */
export async function fetchLatestThermometerCSV(): Promise<string | null> {
  const all = await fetchAllThermometerCSVs()
  return all.find(r => r.source === "gh")?.csv ?? null
}
