// Standalone script: läuft via `docker exec family-hub node scripts/import-thermometer.js`
// Kein HTTP-Layer, kein Proxy-Timeout – direkt IMAP + Prisma

const { PrismaClient } = require("@prisma/client")

// Rekursiv CSV-Part in der MIME-Struktur suchen
function findCsvPart(node) {
  if (!node) return null
  const t = (node.type || "").toLowerCase()
  const fname = (node.parameters && node.parameters.name) || ""
  const disp = node.disposition && node.disposition.type
  if (t === "text/csv" || fname.toLowerCase().endsWith(".csv") || (disp === "attachment" && fname)) {
    return node.part || "1"
  }
  if (node.childNodes) {
    for (const child of node.childNodes) {
      const found = findCsvPart(child)
      if (found) return found
    }
  }
  return null
}

async function readStream(readable) {
  const chunks = []
  for await (const chunk of readable) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks).toString("utf-8")
}

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

  const client = new ImapFlow({
    host, port,
    secure: port === 993,
    auth: { user, pass },
    logger: false,
    socketTimeout: 300000, // 5 min – kein vorzeitiger Timeout
  })

  await client.connect()

  let csv = null
  let foundUid = null
  try {
    await client.mailboxOpen("INBOX")
    const since = new Date(Date.now() - 2 * 86400000)
    const uids = await client.search({ since }, { uid: true })

    if (!uids || !uids.length) {
      console.log("Keine neuen Mails gefunden")
      return
    }

    // Neueste Mail zuerst: Struktur holen, CSV-Part identifizieren
    for (let i = uids.length - 1; i >= 0; i--) {
      const uid = uids[i]
      let csvPart = null

      for await (const msg of client.fetch([uid], { bodyStructure: true }, { uid: true })) {
        if (!msg.bodyStructure) continue
        csvPart = findCsvPart(msg.bodyStructure)
      }

      if (!csvPart) continue

      // Nur den CSV-Anhang streamen, nicht die ganze Mail
      const dl = await client.download(String(uid), csvPart, { uid: true })
      if (!dl) continue

      csv = await readStream(dl.content)
      foundUid = uid
      break
    }

    if (foundUid) {
      await client.messageFlagsAdd([foundUid], ["\\Seen"], { uid: true })
    }
  } finally {
    await client.logout()
  }

  if (!csv) {
    console.log("Keine CSV im Anhang gefunden")
    return
  }

  // CSV parsen (BOM streifen)
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
