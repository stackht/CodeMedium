import "dotenv/config"
import express from "express"
import cors from "cors"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import nodemailer from "nodemailer"
import multer from "multer"
import { z } from "zod"
import { PrismaClient } from "@prisma/client"

const app = express()
const prisma = new PrismaClient()

const PORT = process.env.PORT || 8080
const OTP_TTL_MINUTES = Number(process.env.OTP_TTL_MINUTES || 10)
const OTP_COOLDOWN_SECONDS = Number(process.env.OTP_COOLDOWN_SECONDS || 60)
const JWT_SECRET = process.env.JWT_SECRET || "change-me"

app.set("trust proxy", 1)
app.use(express.json())

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
})

const normalizeOrigin = (value) => {
  if (!value) return value
  let origin = value.trim()
  if ((origin.startsWith("\"") && origin.endsWith("\"")) || (origin.startsWith("'") && origin.endsWith("'"))) {
    origin = origin.slice(1, -1)
  }
  if (origin.endsWith("/")) {
    origin = origin.slice(0, -1)
  }
  return origin
}

const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((origin) => normalizeOrigin(origin))
  : ["*"]

const corsOptions = {
  origin: corsOrigins,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}

app.use(cors(corsOptions))
app.options("*", cors(corsOptions))

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 15_000,
})

const parseFrom = () => {
  const raw = process.env.SMTP_FROM || process.env.SMTP_USER || ""
  const match = raw.match(/^\s*([^<]+?)\s*<([^>]+)>\s*$/)
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() }
  }
  return { name: "Code Medium", email: raw.trim() }
}

const requestOtpSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  phone: z.string().min(6),
  year: z.enum(["FE", "SE", "TE", "BE"]),
  branch: z.enum(["AI&DS", "AIML", "IOT", "COMP", "MECH", "ELECT"]),
})

const verifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().min(4).max(8),
})

const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(2).max(25),
  password: z.string().min(6).max(128),
})

const loginSchema = z.object({
  identifier: z.string().min(3),
  password: z.string().min(6).max(128),
})
const adminLoginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6).max(128),
})

const challengeSchema = z.object({
  statementId: z.number().int().min(1).max(13),
  statement: z.string().min(10).max(1000),
})

const reviewSchema = z.object({
  sScore: z.number().int().min(0).max(100).nullable().optional(),
  pScore: z.number().int().min(0).max(100).nullable().optional(),
  dScore: z.number().int().min(0).max(100).nullable().optional(),
  reviewStatus: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  interviewDone: z.boolean().optional(),
})

const announcementSchema = z.object({
  content: z.string().min(5).max(4000),
})

const optionalUrlSchema = z.preprocess(
  (value) => {
    if (value === null || value === undefined) return null
    if (typeof value !== "string") return value
    const trimmed = value.trim()
    return trimmed ? trimmed : null
  },
  z.string().url().nullable(),
)

const updateProfileSchema = z.object({
  linkedinChoice: z.enum(["YES", "NO"]).nullable().optional(),
  githubChoice: z.enum(["YES", "NO"]).nullable().optional(),
  linkedinUrl: optionalUrlSchema.optional(),
  githubUrl: optionalUrlSchema.optional(),
  name: z.string().min(2).max(80).optional(),
  phone: z.string().min(6).optional(),
  year: z.enum(["FE", "SE", "TE", "BE"]).optional(),
  branch: z.enum(["AI&DS", "AIML", "IOT", "COMP", "MECH", "ELECT"]).optional(),
  username: z.string().min(2).max(25).optional(),
})

function authRequired(req, res, next) {
  const header = req.headers.authorization || ""
  const token = header.startsWith("Bearer ") ? header.slice(7) : null
  if (!token) return res.status(401).json({ ok: false, message: "Unauthorized" })
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    req.userId = payload.sub
    next()
  } catch {
    return res.status(401).json({ ok: false, message: "Unauthorized" })
  }
}

function adminRequired(req, res, next) {
  const header = req.headers.authorization || ""
  const token = header.startsWith("Bearer ") ? header.slice(7) : null
  if (!token) return res.status(401).json({ ok: false, message: "Unauthorized" })
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    if (payload?.role !== "admin") {
      return res.status(403).json({ ok: false, message: "Forbidden" })
    }
    next()
  } catch {
    return res.status(401).json({ ok: false, message: "Unauthorized" })
  }
}

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

function nowPlusMinutes(minutes) {
  return new Date(Date.now() + minutes * 60 * 1000)
}

async function sendMail({ to, subject, text, html }) {
  if (process.env.BREVO_API_KEY) {
    const from = parseFrom()
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": process.env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { name: from.name, email: from.email },
        to: [{ email: to }],
        subject,
        textContent: text,
        htmlContent: html,
      }),
    })
    if (!response.ok) {
      const body = await response.text()
      throw new Error(`Brevo API error: ${response.status} ${body}`)
    }
    return
  }

  if (!process.env.SMTP_HOST) {
    throw new Error("SMTP not configured")
  }
  const send = transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html,
  })
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("SMTP timeout")), 15_000),
  )
  await Promise.race([send, timeout])
}

function buildOtpEmail(otp, ttlMinutes) {
  const subject = "CMD Access Code — One-Time Password"
  const text = [
    "CMD // ACCESS VERIFICATION",
    "",
    `One-Time Password: ${otp}`,
    `Valid for: ${ttlMinutes} minutes`,
    "",
    "If you did not request this code, ignore this message.",
    "— CMD Decryptors",
  ].join("\n")

  const header = `
    <div style="border:1px solid #1e2a1e;border-radius:12px;overflow:hidden;background:#0b120b;">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#0d160d;border-bottom:1px solid #1e2a1e;">
        <div style="font-family:'Courier New',monospace;font-size:12px;letter-spacing:0.35em;color:#a5f3a5;text-transform:uppercase;">CMD</div>
        <div style="display:flex;gap:6px;">
          <span style="width:8px;height:8px;border-radius:999px;background:#1f2a1f;"></span>
          <span style="width:8px;height:8px;border-radius:999px;background:#1f2a1f;"></span>
          <span style="width:8px;height:8px;border-radius:999px;background:#1f2a1f;"></span>
        </div>
      </div>
  `

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="color-scheme" content="dark" />
        <meta name="supported-color-schemes" content="dark" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body style="margin:0;padding:0;background:#050805;color:#e6f3e6;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#050805" style="background:#050805;">
          <tr>
            <td align="center" style="padding:24px;">
              <table role="presentation" width="620" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:620px;background:#050805;color:#e6f3e6;">
                <tr>
                  <td style="font-family:'Courier New',monospace;">
                    ${header}
                    <div style="padding:22px 22px 18px;color:#dff0df;background:#0a110a;">
          <div style="letter-spacing:0.35em;color:#7fe67f;font-size:12px;text-transform:uppercase;">CMD // Access Verification</div>
          <div style="margin:14px 0 6px;font-size:18px;">
            One-Time <span style="color:#9dff9d;">Password</span>
          </div>
          <div style="display:inline-block;margin:10px 0 16px;padding:10px 14px;border:1px dashed #284028;border-radius:6px;background:#0c140c;color:#b7ffb7;font-size:26px;letter-spacing:0.24em;">
            ${otp}
          </div>
          <div style="opacity:0.85;">
            Valid for <strong style="color:#b7ffb7;">${ttlMinutes} minutes</strong>.
          </div>
          <div style="margin:18px 0 0;border-top:1px solid #1e2a1e;"></div>
          <div style="margin-top:14px;font-size:12px;opacity:0.7;">If you did not request this code, ignore this message.</div>
        <div style="margin-top:10px;font-size:12px;opacity:0.7;">— CMD Decryptors</div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `
  return { subject, text, html }
}

function buildConfirmEmail() {
  const subject = "CMD Registration Confirmed"
  const text = [
    "CMD // REGISTRATION CONFIRMED",
    "",
    "Your registration is complete.",
    "Welcome to CMD. You can now log in with your username and password.",
    "",
    "— CMD Decryptors",
  ].join("\n")

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="color-scheme" content="dark" />
        <meta name="supported-color-schemes" content="dark" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body style="margin:0;padding:0;background:#050805;color:#e6f3e6;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#050805" style="background:#050805;">
          <tr>
            <td align="center" style="padding:24px;">
              <table role="presentation" width="620" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:620px;background:#050805;color:#e6f3e6;">
                <tr>
                  <td style="font-family:'Courier New',monospace;">
                    <div style="border:1px solid #1e2a1e;border-radius:12px;overflow:hidden;background:#0b120b;">
                      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#0d160d;border-bottom:1px solid #1e2a1e;">
                        <div style="font-size:12px; letter-spacing:0.35em; color:#a5f3a5; text-transform:uppercase;">CMD</div>
                        <div style="display:flex;gap:6px;">
                          <span style="width:8px;height:8px;border-radius:999px;background:#1f2a1f;"></span>
                          <span style="width:8px;height:8px;border-radius:999px;background:#1f2a1f;"></span>
                          <span style="width:8px;height:8px;border-radius:999px;background:#1f2a1f;"></span>
                        </div>
                      </div>
                      <div style="padding:22px 22px 18px;color:#dff0df;background:#0a110a;">
            <div style="letter-spacing:0.35em;color:#7fe67f;font-size:12px;text-transform:uppercase;">CMD // Registration Confirmed</div>
            <div style="margin:14px 0 6px;font-size:18px;">
              Welcome to <span style="color:#9dff9d;">CMD</span>
            </div>
            <div style="opacity:0.85;line-height:1.7;">
              Your registration is <span style="color:#b7ffb7;">complete</span>. You can now
              <span style="color:#b7ffb7;"> log in</span> using your username and password.
            </div>
            <div style="margin:18px 0 0;border-top:1px solid #1e2a1e;"></div>
                        <div style="margin-top:10px;font-size:12px;opacity:0.7;">— CMD Decryptors</div>
                      </div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `
  return { subject, text, html }
}

function buildDecisionEmail({ name, status }) {
  const approved = status === "APPROVED"
  const subject = approved
    ? "CMD Interview Status — Access Granted"
    : "CMD Interview Status — Access Restricted"
  const text = [
    "CMD // INTERVIEW STATUS",
    "",
    `Candidate: ${name || "Participant"}`,
    `Status: ${approved ? "APPROVED" : "REJECTED"}`,
    "",
    approved
      ? "Your signal is verified. You have cleared the CMD interview round."
      : "Your signal did not meet the required thresholds this cycle.",
    "",
    "— CMD Decryptors",
  ].join("\n")

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="color-scheme" content="dark" />
        <meta name="supported-color-schemes" content="dark" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body style="margin:0;padding:0;background:#050805;color:#e6f3e6;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#050805" style="background:#050805;">
          <tr>
            <td align="center" style="padding:24px;">
              <table role="presentation" width="620" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:620px;background:#050805;color:#e6f3e6;">
                <tr>
                  <td style="font-family:'Courier New',monospace;">
                    <div style="border:1px solid #1e2a1e;border-radius:12px;overflow:hidden;background:#0b120b;">
                      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#0d160d;border-bottom:1px solid #1e2a1e;">
                        <div style="font-size:12px; letter-spacing:0.35em; color:#a5f3a5; text-transform:uppercase;">CMD</div>
                        <div style="display:flex;gap:6px;">
                          <span style="width:8px;height:8px;border-radius:999px;background:#1f2a1f;"></span>
                          <span style="width:8px;height:8px;border-radius:999px;background:#1f2a1f;"></span>
                          <span style="width:8px;height:8px;border-radius:999px;background:#1f2a1f;"></span>
                        </div>
                      </div>
                      <div style="padding:22px 22px 18px;color:#dff0df;background:#0a110a;">
                        <div style="letter-spacing:0.35em;color:#7fe67f;font-size:12px;text-transform:uppercase;">CMD // Interview Status</div>
                        <div style="margin:14px 0 6px;font-size:18px;">
                          Status: <span style="color:${approved ? "#9dff9d" : "#ff9d9d"};">${approved ? "APPROVED" : "REJECTED"}</span>
                        </div>
                        <div style="opacity:0.85;line-height:1.7;">
                          Candidate <strong>${name || "Participant"}</strong> —
                          ${
                            approved
                              ? "your signal is verified. Access granted to the next CMD sequence."
                              : "your signal did not meet the required thresholds this cycle."
                          }
                        </div>
                        <div style="margin:18px 0 0;border-top:1px solid #1e2a1e;"></div>
                        <div style="margin-top:10px;font-size:12px;opacity:0.7;">— CMD Decryptors</div>
                      </div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `
  return { subject, text, html }
}

app.get("/health", (req, res) => {
  res.json({ ok: true })
})

app.post("/auth/request-otp", async (req, res) => {
  try {
    const data = requestOtpSchema.parse(req.body)
    const recent = await prisma.otpToken.findFirst({
      where: {
        email: data.email,
        createdAt: {
          gt: new Date(Date.now() - OTP_COOLDOWN_SECONDS * 1000),
        },
      },
      orderBy: { createdAt: "desc" },
    })
    if (recent) {
      return res.status(429).json({ ok: false, message: "Please wait before requesting again." })
    }

    const otp = generateOtp()
    const otpHash = await bcrypt.hash(otp, 10)
    await prisma.otpToken.create({
      data: {
        name: data.name,
        email: data.email,
        otpHash,
        phone: data.phone,
        year: data.year,
        branch: data.branch,
        expiresAt: nowPlusMinutes(OTP_TTL_MINUTES),
      },
    })

    const otpEmail = buildOtpEmail(otp, OTP_TTL_MINUTES)
    await sendMail({
      to: data.email,
      subject: otpEmail.subject,
      text: otpEmail.text,
      html: otpEmail.html,
    })

    return res.json({ ok: true })
  } catch (error) {
    return res.status(400).json({ ok: false, message: error.message })
  }
})

app.post("/auth/verify-otp", async (req, res) => {
  try {
    const data = verifyOtpSchema.parse(req.body)
    const record = await prisma.otpToken.findFirst({
      where: {
        email: data.email,
        consumedAt: null,
      },
      orderBy: { createdAt: "desc" },
    })

    if (!record) {
      return res.status(400).json({ ok: false, message: "OTP not found." })
    }
    if (record.expiresAt < new Date()) {
      return res.status(400).json({ ok: false, message: "OTP expired." })
    }

    const valid = await bcrypt.compare(data.otp, record.otpHash)
    if (!valid) {
      return res.status(400).json({ ok: false, message: "Invalid OTP." })
    }

    await prisma.otpToken.update({
      where: { id: record.id },
      data: { verifiedAt: new Date() },
    })

    return res.json({ ok: true })
  } catch (error) {
    return res.status(400).json({ ok: false, message: error.message })
  }
})

app.post("/auth/register", async (req, res) => {
  try {
    const data = registerSchema.parse(req.body)
    const normalizedUsername = data.username.startsWith("$")
      ? data.username
      : `$${data.username}`
    const otpRecord = await prisma.otpToken.findFirst({
      where: {
        email: data.email,
        verifiedAt: { not: null },
        consumedAt: null,
      },
      orderBy: { createdAt: "desc" },
    })

    if (!otpRecord) {
      return res.status(400).json({ ok: false, message: "Verify OTP first." })
    }
    if (otpRecord.expiresAt < new Date()) {
      return res.status(400).json({ ok: false, message: "OTP expired." })
    }

    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email: data.email }, { username: normalizedUsername }],
      },
    })
    if (existing) {
      return res.status(400).json({ ok: false, message: "User already exists." })
    }

    const passwordHash = await bcrypt.hash(data.password, 12)
    await prisma.user.create({
      data: {
        name: otpRecord.name,
        email: data.email,
        username: normalizedUsername,
        passwordHash,
        phone: otpRecord.phone,
        year: otpRecord.year,
        branch: otpRecord.branch,
      },
    })

    await prisma.otpToken.update({
      where: { id: otpRecord.id },
      data: { consumedAt: new Date() },
    })

    const confirmEmail = buildConfirmEmail()
    await sendMail({
      to: data.email,
      subject: confirmEmail.subject,
      text: confirmEmail.text,
      html: confirmEmail.html,
    })

    return res.json({ ok: true })
  } catch (error) {
    return res.status(400).json({ ok: false, message: error.message })
  }
})

app.post("/auth/login", async (req, res) => {
  try {
    const data = loginSchema.parse(req.body)
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: data.identifier }, { username: data.identifier }],
      },
    })
    if (!user) {
      return res.status(400).json({ ok: false, message: "Invalid credentials." })
    }

    const valid = await bcrypt.compare(data.password, user.passwordHash)
    if (!valid) {
      return res.status(400).json({ ok: false, message: "Invalid credentials." })
    }

    const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: "7d",
    })

    return res.json({
      ok: true,
      token,
      user: { id: user.id, email: user.email, username: user.username },
    })
  } catch (error) {
    return res.status(400).json({ ok: false, message: error.message })
  }
})

app.get("/auth/me", authRequired, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        phone: true,
        year: true,
        branch: true,
        linkedinUrl: true,
        githubUrl: true,
        linkedinChoice: true,
        githubChoice: true,
        profileQueueNumber: true,
        queuedAt: true,
        createdAt: true,
      },
    })
    if (!user) {
      return res.status(404).json({ ok: false, message: "User not found." })
    }

    let queuePosition = null
    if (user.queuedAt) {
      const positionRows = await prisma.$queryRawUnsafe(
        `SELECT "queuePosition" FROM (
           SELECT id, row_number() OVER (ORDER BY "queuedAt" ASC, "profileQueueNumber" ASC, "createdAt" ASC) AS "queuePosition"
           FROM "User"
           WHERE "queuedAt" IS NOT NULL
         ) q
         WHERE q.id = $1;`,
        req.userId,
      )
      queuePosition = positionRows?.[0]?.queuePosition ? Number(positionRows[0].queuePosition) : null
    }

    return res.json({ ok: true, user: { ...user, queuePosition } })
  } catch (error) {
    return res.status(400).json({ ok: false, message: error.message })
  }
})

app.put("/auth/me", authRequired, async (req, res) => {
  try {
    const data = updateProfileSchema.parse(req.body)

    const userId = req.userId

    const nextData = {}

    if (data.linkedinChoice !== undefined) nextData.linkedinChoice = data.linkedinChoice
    if (data.githubChoice !== undefined) nextData.githubChoice = data.githubChoice

    if (data.linkedinChoice === "NO") nextData.linkedinUrl = null
    else if (data.linkedinUrl !== undefined) nextData.linkedinUrl = data.linkedinUrl

    if (data.githubChoice === "NO") nextData.githubUrl = null
    else if (data.githubUrl !== undefined) nextData.githubUrl = data.githubUrl

    if (data.linkedinChoice === "YES" && !nextData.linkedinUrl) {
      throw new Error("LinkedIn URL is required when selecting Yes.")
    }
    if (data.githubChoice === "YES" && !nextData.githubUrl) {
      throw new Error("GitHub URL is required when selecting Yes.")
    }

    if (data.username !== undefined) {
      const raw = data.username.trim()
      if (!raw) throw new Error("Username is required.")
      nextData.username = raw.startsWith("$") ? raw : `$${raw}`
    }
    if (data.name !== undefined) nextData.name = data.name.trim()
    if (data.phone !== undefined) nextData.phone = data.phone.trim()
    if (data.year !== undefined) nextData.year = data.year
    if (data.branch !== undefined) nextData.branch = data.branch

    const updated = await prisma.$transaction(async (tx) => {
      const before = await tx.user.findUnique({
        where: { id: userId },
        select: {
          linkedinUrl: true,
          githubUrl: true,
          linkedinChoice: true,
          githubChoice: true,
          profileQueueNumber: true,
        },
      })
      if (!before) {
        throw new Error("User not found.")
      }

      const user = await tx.user.update({
        where: { id: userId },
        data: nextData,
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          phone: true,
          year: true,
          branch: true,
          linkedinUrl: true,
          githubUrl: true,
          linkedinChoice: true,
          githubChoice: true,
          profileQueueNumber: true,
          queuedAt: true,
          year: true,
          branch: true,
          createdAt: true,
        },
      })

      const isComplete =
        user.linkedinChoice &&
        user.githubChoice &&
        ((user.linkedinChoice === "NO") || (user.linkedinChoice === "YES" && user.linkedinUrl)) &&
        ((user.githubChoice === "NO") || (user.githubChoice === "YES" && user.githubUrl))

      const changed =
        before.linkedinUrl !== user.linkedinUrl ||
        before.githubUrl !== user.githubUrl ||
        before.linkedinChoice !== user.linkedinChoice ||
        before.githubChoice !== user.githubChoice

      // Queue behavior:
      // - First time completing both choices => assign queue number
      // - Any later edit to either URL/choice => assign a NEW queue number (moves user later in order)
      if (isComplete && (before.profileQueueNumber === null || changed)) {
        const event = await tx.profileQueueEvent.create({ data: { userId } })
        await tx.user.update({
          where: { id: userId },
          data: { profileQueueNumber: event.id, queuedAt: event.createdAt },
        })
      }

      return tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          phone: true,
          year: true,
          branch: true,
          linkedinUrl: true,
          githubUrl: true,
          linkedinChoice: true,
          githubChoice: true,
          profileQueueNumber: true,
          queuedAt: true,
          createdAt: true,
        },
      })
    })

    let queuePosition = null
    if (updated?.queuedAt) {
      const positionRows = await prisma.$queryRawUnsafe(
        `SELECT "queuePosition" FROM (
           SELECT id, row_number() OVER (ORDER BY "queuedAt" ASC, "profileQueueNumber" ASC, "createdAt" ASC) AS "queuePosition"
           FROM "User"
           WHERE "queuedAt" IS NOT NULL
         ) q
         WHERE q.id = $1;`,
        userId,
      )
      queuePosition = positionRows?.[0]?.queuePosition ? Number(positionRows[0].queuePosition) : null
    }

    return res.json({ ok: true, user: updated ? { ...updated, queuePosition } : updated })
  } catch (error) {
    return res.status(400).json({ ok: false, message: error.message })
  }
})

app.get("/announcement", async (req, res) => {
  try {
    const announcements = await prisma.announcement.findMany({
      orderBy: { updatedAt: "desc" },
    })
    return res.json({
      ok: true,
      announcements: announcements.map((item) => ({
        id: item.id,
        content: item.content,
        updatedAt: item.updatedAt,
      })),
    })
  } catch (error) {
    return res.status(400).json({ ok: false, message: error.message })
  }
})

app.post("/admin/login", async (req, res) => {
  try {
    const data = adminLoginSchema.parse(req.body)
    const adminUser = process.env.ADMIN_USERNAME
    const adminPass = process.env.ADMIN_PASSWORD
    if (!adminUser || !adminPass) {
      return res.status(400).json({ ok: false, message: "Admin not configured." })
    }
    if (data.username !== adminUser || data.password !== adminPass) {
      return res.status(401).json({ ok: false, message: "Invalid credentials." })
    }
    const token = jwt.sign({ sub: "admin", role: "admin" }, JWT_SECRET, {
      expiresIn: "1d",
    })
    return res.json({ ok: true, token })
  } catch (error) {
    return res.status(400).json({ ok: false, message: error.message })
  }
})

app.get("/admin/participants", adminRequired, async (req, res) => {
  try {
    const queueRows = await prisma.$queryRawUnsafe(`
      SELECT id, row_number() OVER (ORDER BY "queuedAt" ASC, "profileQueueNumber" ASC, "createdAt" ASC) AS "queuePosition"
      FROM "User"
      WHERE "queuedAt" IS NOT NULL;
    `)
    const queuePositionById = new Map(queueRows.map((row) => [row.id, Number(row.queuePosition)]))

    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        challenges: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        uploads: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    })
    const payload = users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      linkedinUrl: user.linkedinUrl ?? null,
      githubUrl: user.githubUrl ?? null,
      linkedinChoice: user.linkedinChoice ?? null,
      githubChoice: user.githubChoice ?? null,
      profileQueueNumber: queuePositionById.get(user.id) ?? null,
      queuedAt: user.queuedAt ?? null,
      phone: user.phone,
      year: user.year,
      branch: user.branch,
      statementId: user.challenges?.[0]?.statementId ?? null,
      sScore: user.sScore,
      pScore: user.pScore,
      dScore: user.dScore,
      reviewStatus: user.reviewStatus,
      interviewDone: user.interviewDone,
      hasUpload: !!user.uploads?.[0],
    }))
    return res.json({ ok: true, participants: payload })
  } catch (error) {
    return res.status(400).json({ ok: false, message: error.message })
  }
})

app.post("/admin/participants/:id/review", adminRequired, async (req, res) => {
  try {
    const data = reviewSchema.parse(req.body)
    const userId = req.params.id
    const update = {}
    if (data.sScore !== undefined) update.sScore = data.sScore
    if (data.pScore !== undefined) update.pScore = data.pScore
    if (data.dScore !== undefined) update.dScore = data.dScore
    if (data.reviewStatus) update.reviewStatus = data.reviewStatus
    if (data.interviewDone !== undefined) update.interviewDone = data.interviewDone
    const user = await prisma.user.update({
      where: { id: userId },
      data: update,
    })
    if (data.reviewStatus) {
      const email = buildDecisionEmail({ name: user.name, status: data.reviewStatus })
      await sendMail({
        to: user.email,
        subject: email.subject,
        text: email.text,
        html: email.html,
      })
    }
    return res.json({ ok: true, user: { id: user.id, reviewStatus: user.reviewStatus } })
  } catch (error) {
    return res.status(400).json({ ok: false, message: error.message })
  }
})

app.delete("/admin/participants/:id", adminRequired, async (req, res) => {
  try {
    const userId = req.params.id
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return res.status(404).json({ ok: false, message: "User not found." })
    }
    await prisma.$transaction([
      prisma.challengeUpload.deleteMany({ where: { userId } }),
      prisma.userChallenge.deleteMany({ where: { userId } }),
      prisma.otpToken.deleteMany({ where: { email: user.email } }),
    ])
    await prisma.user.delete({ where: { id: userId } })
    return res.json({ ok: true })
  } catch (error) {
    return res.status(400).json({ ok: false, message: error.message })
  }
})
app.get("/admin/participants/:id/upload", adminRequired, async (req, res) => {
  try {
    const userId = req.params.id
    const upload = await prisma.challengeUpload.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    })
    if (!upload) {
      return res.status(404).json({ ok: false, message: "No upload found." })
    }
    res.setHeader("Content-Type", upload.mimeType || "application/octet-stream")
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${upload.filename.replace(/"/g, "")}"`,
    )
    return res.send(Buffer.from(upload.data))
  } catch (error) {
    return res.status(400).json({ ok: false, message: error.message })
  }
})

app.post("/admin/announcement", adminRequired, async (req, res) => {
  try {
    const data = announcementSchema.parse(req.body)
    const created = await prisma.announcement.create({
      data: { content: data.content },
    })
    return res.json({
      ok: true,
      announcement: {
        id: created.id,
        content: created.content,
        updatedAt: created.updatedAt,
      },
    })
  } catch (error) {
    return res.status(400).json({ ok: false, message: error.message })
  }
})

app.put("/admin/announcement/:id", adminRequired, async (req, res) => {
  try {
    const data = announcementSchema.parse(req.body)
    const id = Number(req.params.id)
    const updated = await prisma.announcement.update({
      where: { id },
      data: { content: data.content },
    })
    return res.json({
      ok: true,
      announcement: {
        id: updated.id,
        content: updated.content,
        updatedAt: updated.updatedAt,
      },
    })
  } catch (error) {
    return res.status(400).json({ ok: false, message: error.message })
  }
})

app.delete("/admin/announcement/:id", adminRequired, async (req, res) => {
  try {
    const id = Number(req.params.id)
    await prisma.announcement.delete({ where: { id } })
    return res.json({ ok: true })
  } catch (error) {
    return res.status(400).json({ ok: false, message: error.message })
  }
})

app.post("/challenges/submit", authRequired, async (req, res) => {
  try {
    const data = challengeSchema.parse(req.body)
    const userId = req.userId
    const active = await prisma.userChallenge.findFirst({
      where: {
        userId,
        releasedAt: null,
      },
      orderBy: { createdAt: "desc" },
    })
    if (active) {
      return res.status(409).json({
        ok: false,
        message: "You can seal only one problem at a time.",
        activeChallenge: {
          id: active.id,
          statementId: active.statementId,
          statement: active.statement,
        },
      })
    }
    await prisma.userChallenge.create({
      data: {
        userId,
        statementId: data.statementId,
        statement: data.statement,
      },
    })
    return res.json({ ok: true })
  } catch (error) {
    return res.status(400).json({ ok: false, message: error.message })
  }
})

app.get("/challenges/current", authRequired, async (req, res) => {
  try {
    const userId = req.userId
    const active = await prisma.userChallenge.findFirst({
      where: { userId, releasedAt: null },
      orderBy: { createdAt: "desc" },
    })
    if (!active) {
      return res.json({ ok: true, challenge: null })
    }
    return res.json({
      ok: true,
      challenge: {
        id: active.id,
        statementId: active.statementId,
        statement: active.statement,
      },
    })
  } catch (error) {
    return res.status(400).json({ ok: false, message: error.message })
  }
})

app.post("/challenges/release", authRequired, async (req, res) => {
  try {
    const userId = req.userId
    const active = await prisma.userChallenge.findFirst({
      where: { userId, releasedAt: null },
      orderBy: { createdAt: "desc" },
    })
    if (!active) {
      return res.status(400).json({ ok: false, message: "No active challenge." })
    }
    await prisma.userChallenge.update({
      where: { id: active.id },
      data: { releasedAt: new Date() },
    })
    return res.json({ ok: true })
  } catch (error) {
    return res.status(400).json({ ok: false, message: error.message })
  }
})

app.post(
  "/challenges/upload",
  authRequired,
  upload.single("file"),
  async (req, res) => {
    try {
      const file = req.file
      if (!file) {
        return res.status(400).json({ ok: false, message: "File required." })
      }
      const userId = req.userId
      const active = await prisma.userChallenge.findFirst({
        where: { userId, releasedAt: null },
        orderBy: { createdAt: "desc" },
      })
      if (!active) {
        return res.status(400).json({ ok: false, message: "No active challenge." })
      }
      await prisma.challengeUpload.create({
        data: {
          userId,
          challengeId: active.id,
          filename: file.originalname,
          mimeType: file.mimetype || "application/octet-stream",
          size: file.size,
          data: file.buffer,
        },
      })
      return res.json({ ok: true })
    } catch (error) {
      return res.status(400).json({ ok: false, message: error.message })
    }
  },
)

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`API running on :${PORT}`)
})
















