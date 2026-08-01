"use client"

import { useEffect, useRef, useState } from "react"
import QRCode from "qrcode"

interface IdentityCardProps {
  name: string
  email: string
  username: string
  year: string
  branch: string
  linkedinUrl?: string | null
  githubUrl?: string | null
  queuePosition?: number | null
}

function DateDisplay({ username }: { username: string }) {
  const [date, setDate] = useState("")
  useEffect(() => setDate(new Date().toLocaleDateString()), [])
  return (
    <div className="text-[7px] uppercase tracking-[0.2em] text-[#d8ffd2]/30 text-right">
      <div>ID #{username || "—"}</div>
      <div className="mt-0.5">{date}</div>
    </div>
  )
}

export default function IdentityCard({ name, email, username, year, branch, linkedinUrl, githubUrl, queuePosition }: IdentityCardProps) {
  const [qrDataUrl, setQrDataUrl] = useState("")
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const payload = JSON.stringify({
      name,
      email,
      username,
      year,
      branch,
      linkedin: linkedinUrl || null,
      github: githubUrl || null,
      queue: queuePosition,
      club: "CMD Decryptors",
      issued: new Date().toISOString().split("T")[0],
    }, null, 2)

    QRCode.toDataURL(payload, {
      width: 200,
      margin: 1,
      color: { dark: "#39ff14", light: "#020604" },
    }).then(setQrDataUrl)
  }, [name, email, username, year, branch, linkedinUrl, githubUrl, queuePosition])

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "CM"

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-[9px] uppercase tracking-[0.25em] text-[#39ff14]/60 mb-4 flex items-center gap-2">
        <span className="w-4 h-[1px] bg-[#39ff14]/30" />
        MEMBER IDENTITY CARD
        <span className="w-4 h-[1px] bg-[#39ff14]/30" />
      </div>
      <div
        ref={cardRef}
        className="relative overflow-hidden rounded-sm border border-[#39ff14]/25 bg-gradient-to-br from-[#020604] via-[#031008] to-[#020604] shadow-[0_20px_60px_rgba(0,0,0,0.6),inset_0_0_60px_rgba(57,255,20,0.02)]"
      >
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-24 h-24 bg-[#39ff14]/5 blur-[40px]" />
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-[#00d9ff]/5 blur-[50px]" />

        {/* Card grid overlay */}
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: "linear-gradient(rgba(57,255,20,1) 1px, transparent 1px), linear-gradient(90deg, rgba(57,255,20,1) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        <div className="relative z-10 p-6 space-y-5">
          {/* Top row: badge + club name */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-sm border border-[#39ff14]/40 bg-[#39ff14]/5 flex items-center justify-center shadow-[0_0_15px_rgba(57,255,20,0.1)]">
                <span className="text-[#39ff14] text-xs font-bold font-orbitron">CM</span>
              </div>
              <div>
                <div className="text-[8px] uppercase tracking-[0.3em] text-[#d8ffd2]/50">CMD Decryptors</div>
                <div className="text-[9px] uppercase tracking-[0.2em] text-[#39ff14]/70">Member Credential</div>
              </div>
            </div>
            <DateDisplay username={username} />
          </div>

          {/* Divider */}
          <div className="h-[1px] bg-gradient-to-r from-[#39ff14]/40 via-[#39ff14]/10 to-transparent" />

          {/* Middle: Photo + Details */}
          <div className="flex items-start gap-5">
            {/* Avatar/Photo */}
            <div className="w-20 h-20 shrink-0 rounded-sm border border-[#39ff14]/30 bg-gradient-to-br from-[#39ff14]/10 to-[#00d9ff]/5 flex items-center justify-center shadow-[0_0_20px_rgba(57,255,20,0.08)]">
              <span className="text-2xl font-bold font-orbitron text-[#39ff14]/80 tracking-tight">{initials}</span>
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0 space-y-1.5">
              <div>
                <div className="text-[8px] uppercase tracking-[0.25em] text-[#d8ffd2]/40">Name</div>
                <div className="text-sm font-medium text-[#d8ffd2] truncate">{name || "—"}</div>
              </div>
              <div className="flex gap-4">
                <div>
                  <div className="text-[8px] uppercase tracking-[0.25em] text-[#d8ffd2]/40">Year</div>
                  <div className="text-xs text-[#d8ffd2]/80">{year || "—"}</div>
                </div>
                <div>
                  <div className="text-[8px] uppercase tracking-[0.25em] text-[#d8ffd2]/40">Branch</div>
                  <div className="text-xs text-[#d8ffd2]/80">{branch || "—"}</div>
                </div>
                <div>
                  <div className="text-[8px] uppercase tracking-[0.25em] text-[#d8ffd2]/40">Queue</div>
                  <div className="text-xs text-[#39ff14]/90">{queuePosition ? `#${queuePosition}` : "—"}</div>
                </div>
              </div>
              <div>
                <div className="text-[8px] uppercase tracking-[0.25em] text-[#d8ffd2]/40">Email</div>
                <div className="text-xs text-[#d8ffd2]/70 truncate">{email || "—"}</div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-[1px] bg-gradient-to-r from-transparent via-[#39ff14]/15 to-transparent" />

          {/* Bottom: QR Code + Links */}
          <div className="flex items-center gap-5">
            {/* QR Code */}
            <div className="w-[88px] h-[88px] shrink-0 rounded-sm border border-[#39ff14]/20 bg-black/50 flex items-center justify-center overflow-hidden">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Identity QR" className="w-full h-full object-contain p-1" />
              ) : (
                <div className="w-5 h-5 border-2 border-[#39ff14]/30 border-t-[#39ff14] rounded-full animate-spin" />
              )}
            </div>

            {/* Links & meta */}
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="text-[7px] uppercase tracking-[0.2em] text-[#d8ffd2]/30">
                Scan QR to verify credentials
              </div>
              <div className="flex gap-3">
                {linkedinUrl && (
                  <a href={linkedinUrl} target="_blank" rel="noreferrer" className="text-[#00d9ff]/60 hover:text-[#00d9ff] transition-colors">
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                      <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5ZM.5 23.5h4V7.98h-4V23.5ZM8.5 7.98h3.84v2.12h.05c.53-1 1.83-2.06 3.77-2.06 4.03 0 4.77 2.65 4.77 6.09v9.37h-4v-8.31c0-1.98-.03-4.52-2.75-4.52-2.75 0-3.17 2.15-3.17 4.38v8.45h-4V7.98Z" />
                    </svg>
                  </a>
                )}
                {githubUrl && (
                  <a href={githubUrl} target="_blank" rel="noreferrer" className="text-[#00d9ff]/60 hover:text-[#00d9ff] transition-colors">
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                      <path d="M12 .5C5.65.5.5 5.82.5 12.4c0 5.26 3.44 9.72 8.2 11.29.6.12.82-.27.82-.6v-2.1c-3.33.75-4.03-1.65-4.03-1.65-.55-1.44-1.34-1.83-1.34-1.83-1.1-.77.08-.76.08-.76 1.22.09 1.86 1.3 1.86 1.3 1.08 1.91 2.83 1.36 3.52 1.04.11-.82.42-1.36.76-1.67-2.66-.31-5.46-1.38-5.46-6.14 0-1.36.46-2.48 1.23-3.35-.12-.31-.53-1.55.12-3.23 0 0 1.01-.33 3.3 1.28.96-.27 1.99-.4 3.01-.4 1.02 0 2.05.14 3.01.4 2.29-1.61 3.3-1.28 3.3-1.28.65 1.68.24 2.92.12 3.23.76.87 1.23 1.99 1.23 3.35 0 4.77-2.81 5.83-5.49 6.14.43.38.82 1.14.82 2.29v3.39c0 .33.22.73.83.6 4.75-1.57 8.18-6.03 8.18-11.29C23.5 5.82 18.35.5 12 .5Z" />
                    </svg>
                  </a>
                )}
              </div>
              <div className="text-[7px] uppercase tracking-[0.2em] text-[#d8ffd2]/25">
                CMD Decryptors • Code Medium
              </div>
            </div>
          </div>

          {/* Bottom border decoration */}
          <div className="flex gap-1">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="h-[2px] flex-1 rounded-full bg-[#39ff14]/20"
                style={{ opacity: 0.3 + (i / 20) * 0.7 }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
