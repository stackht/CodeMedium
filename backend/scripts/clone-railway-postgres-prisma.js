import "dotenv/config"
import { PrismaClient } from "@prisma/client"

const BATCH_SIZE_DEFAULT = Number(process.env.CLONE_BATCH_SIZE || 1000)
const BATCH_SIZE_UPLOADS = Number(process.env.CLONE_UPLOAD_BATCH_SIZE || 100)

function requireEnv(name) {
  const value = process.env[name]
  if (!value || !value.trim()) {
    throw new Error(`Missing environment variable '${name}'.`)
  }
  return value.trim()
}

function createClient(url) {
  return new PrismaClient({
    datasources: {
      db: { url },
    },
  })
}

async function copyTable({
  label,
  batchSize,
  fetchBatch,
  insertBatch,
}) {
  let lastId = null
  let total = 0

  for (;;) {
    const rows = await fetchBatch({ lastId, take: batchSize })
    if (rows.length === 0) break

    await insertBatch(rows)
    total += rows.length
    lastId = rows[rows.length - 1].id

    // eslint-disable-next-line no-console
    console.log(`${label}: ${total}`)
  }
}

async function main() {
  const oldUrl = requireEnv("OLD_DATABASE_URL")
  const newUrl = requireEnv("NEW_DATABASE_URL")

  const oldDb = createClient(oldUrl)
  const newDb = createClient(newUrl)

  try {
    // Clean destination
    await newDb.$executeRawUnsafe(
      'TRUNCATE TABLE "ChallengeUpload","UserChallenge","OtpToken","User","Announcement" RESTART IDENTITY CASCADE;',
    )

    // Copy in dependency order
    await copyTable({
      label: "User",
      batchSize: BATCH_SIZE_DEFAULT,
      fetchBatch: ({ lastId, take }) =>
        oldDb.user.findMany({
          take,
          orderBy: { id: "asc" },
          ...(lastId ? { where: { id: { gt: lastId } } } : {}),
        }),
      insertBatch: async (rows) => {
        await newDb.user.createMany({ data: rows })
      },
    })

    await copyTable({
      label: "OtpToken",
      batchSize: BATCH_SIZE_DEFAULT,
      fetchBatch: ({ lastId, take }) =>
        oldDb.otpToken.findMany({
          take,
          orderBy: { id: "asc" },
          ...(lastId ? { where: { id: { gt: lastId } } } : {}),
        }),
      insertBatch: async (rows) => {
        await newDb.otpToken.createMany({ data: rows })
      },
    })

    await copyTable({
      label: "UserChallenge",
      batchSize: BATCH_SIZE_DEFAULT,
      fetchBatch: ({ lastId, take }) =>
        oldDb.userChallenge.findMany({
          take,
          orderBy: { id: "asc" },
          ...(lastId ? { where: { id: { gt: lastId } } } : {}),
        }),
      insertBatch: async (rows) => {
        await newDb.userChallenge.createMany({ data: rows })
      },
    })

    await copyTable({
      label: "ChallengeUpload",
      batchSize: BATCH_SIZE_UPLOADS,
      fetchBatch: ({ lastId, take }) =>
        oldDb.challengeUpload.findMany({
          take,
          orderBy: { id: "asc" },
          ...(lastId ? { where: { id: { gt: lastId } } } : {}),
        }),
      insertBatch: async (rows) => {
        try {
          await newDb.challengeUpload.createMany({ data: rows })
        } catch (error) {
          // Fallback for environments where createMany + Bytes may be restricted
          for (const row of rows) {
            // eslint-disable-next-line no-await-in-loop
            await newDb.challengeUpload.create({ data: row })
          }
        }
      },
    })

    await copyTable({
      label: "Announcement",
      batchSize: BATCH_SIZE_DEFAULT,
      fetchBatch: ({ lastId, take }) =>
        oldDb.announcement.findMany({
          take,
          orderBy: { id: "asc" },
          ...(lastId ? { where: { id: { gt: lastId } } } : {}),
        }),
      insertBatch: async (rows) => {
        await newDb.announcement.createMany({ data: rows })
      },
    })

    // Ensure Announcement identity/sequence is set after inserting explicit ids
    await newDb.$executeRawUnsafe(`
      SELECT setval(
        pg_get_serial_sequence('"Announcement"','id'),
        COALESCE((SELECT MAX(id) FROM "Announcement"), 1),
        true
      );
    `)

    // eslint-disable-next-line no-console
    console.log("Clone complete.")
  } finally {
    await Promise.allSettled([oldDb.$disconnect(), newDb.$disconnect()])
  }
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error)
  process.exitCode = 1
})

