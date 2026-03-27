// Standalone script: läuft via `docker exec family-hub node scripts/import-thermometer.js`
// Kein HTTP-Layer, kein Proxy-Timeout – direkt IMAP + Prisma

const { PrismaClient } = require("@prisma/client")

async function main() {
  const host = process.env.IMAP_HOST
  const user = process.env.IMAP_USER
  const pass = process.env.IMAP_PASS
  const port = parseInt(process.env.IMAP_PORT ?? "993")

  if (!host || !user || !pass) {
    console.error("IMAP credentials missing (IMAP_HOST, IMAP_USER, IMAP_PASS)")
    process.exit(1)
  }

  const { ImapFlow } = require("imapflow")
  const { simpleParser } = require("mailparser")

  const client = new ImapFlow({
    host, port,
    secure: port === 993,
    auth: { user, pass },
    logger: false,
  })

  await client.connect()

  let csv = null
  try {
    await client.mailboxOpen("INBOX")
    const since = new Date(Date.now() - 2 * 86400000)
    const uids = await client.search({ since }, { uid: true })

    if (!uids || !uids.length) {
      console.log("Keine neuen Mails gefunden")
      return
    }

    for (let i = uids.length - 1; i >= 0; i--) {
      for await (const msg of client.fetch([uids[i]], { source: true }, { uid: true })) {
        if (!msg.source) continue
        const parsed = await simpleParser(msg.source)
        for (const att of parsed.attachments) {
          if (att.filename?.toLowerCase().endsWith(".csv")) {
            csv = att.content.toString("utf-8")
            await client.messageFlagsAdd([uids[i]], ["\\Seen"], { uid: true })
            break
          }
        }
        if (csv) break
      }
      if (csv) break
    }
  } finally {
    await client.logout()
  }

  if (!csv) {
    console.log("Keine CSV im Anhang gefunden")
    return
  }

  // Parse CSV
  const lines = csv.replace(/^\uFEFF/, "").trim().split(/\r?\n/)
  const readings = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const parts = line.split(",")
    if (parts.length < 3) continue
    const timestamp = new Date(parts[0].trim())
    const temperature = parseFloat(parts[1].trim())
    const humidity = parseFloat(parts[2].trim())
    if (isNaN(timestamp.getTime()) || isNaN(temperature) || isNaN(humidity)) continue
    readings.push({ timestamp, temperature, humidity })
  }

  if (!readings.length) {
    console.log("Keine gültigen Messwerte in der CSV")
    return
  }

  const prisma = new PrismaClient()
  let imported = 0
  for (const r of readings) {
    await prisma.gardenThermometerReading.upsert({
      where: { timestamp: r.timestamp },
      update: { temperature: r.temperature, humidity: r.humidity },
      create: { timestamp: r.timestamp, temperature: r.temperature, humidity: r.humidity },
    })
    imported++
  }
  await prisma.$disconnect()

  console.log(`Importiert: ${imported} Messwerte`)
}

main().catch(e => { console.error("Fehler:", e.message); process.exit(1) })
