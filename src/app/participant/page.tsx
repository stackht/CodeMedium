"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "../../components/ui/button"

const challenges = [
  "Unused Mobile Data — Design a system where users can save, transfer, or monetize unused data efficiently.",
  "Mumbai Local Ticket Verification — Design a frictionless ticket verification system that reduces time while preventing fraud.",
  "Fast Language Learning — Design a solution that drastically reduces learning time while maximizing practical fluency.",
  "Bank SMS Charges Problem — Reduce or replace SMS alerts while maintaining security and regulatory compliance.",
  "Future of Developers vs AI — How can a human developer stay relevant or outperform AI?",
  "AI for College Admin — Reduce workload for attendance, assignments, grading, communication, and administration.",
  "Smart Wearable for Color Vision Deficiency — Detect and communicate colors in real-time with fast, accurate feedback.",
  "OTP Fraud Prevention — Prevent or reduce OTP sharing fraud with a simple, secure user experience.",
  "In many parts of India, people are unaware of areas affected by pollution or poor sanitation (e.g., garbage accumulation). Design a system that allows users to identify, report, and view unsafe or polluted areas in real-time, helping others make informed decisions.",
  "In India, doctors often prescribe medicines by brand name instead of generic name, which can impact cost and transparency. Design a system that ensures fair, transparent, and beneficial outcomes for patients, doctors, and pharmaceutical companies.",
  "Current authentication systems (PIN, password, fingerprint, face unlock) all have vulnerabilities. Design a next-generation authentication system that is significantly more secure, user-friendly, and resistant to hacking attempts.",
  "In India, citizens often lack visibility into real-time progress of infrastructure projects (roads, metro, railways, buildings). Additionally, people are unaware of areas temporarily closed or restricted due to construction, causing inconvenience and delays. Design a system that allows users to track construction progress, view closures, and get real-time route impact updates, ensuring transparency and better daily planning.",
  "Many users struggle to choose the right camera settings (exposure, ISO, lighting, angle) for different environments. Design a solution that helps users capture the best possible photograph in real-time based on their surroundings and conditions.",
]

export default function ChallengesPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState("")
  const [uploading, setUploading] = useState(false)
  const [activeTab, setActiveTab] = useState<"shell" | "accepted" | "announcement">("shell")
  const [queueNumber, setQueueNumber] = useState<number | null>(null)
  const [activeChallenge, setActiveChallenge] = useState<{
    id: string
    statementId: number
    statement: string
  } | null>(null)
  const [announcements, setAnnouncements] = useState<
    { id: number; content: string; updatedAt: string }[]
  >([])
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || ""

  useEffect(() => {
    const token = localStorage.getItem("cmd_token")
    if (!token) {
      router.replace("/")
    }
  }, [router])

  useEffect(() => {
    const token = localStorage.getItem("cmd_token")
    if (!token) return
    const load = async () => {
      const response = await fetch(`${apiBase}/challenges/current`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (response.ok && data.challenge) {
        setActiveChallenge(data.challenge)
        setActiveTab("accepted")
      }
    }
    load()
  }, [apiBase])

  useEffect(() => {
    const token = localStorage.getItem("cmd_token")
    if (!token) return
    const load = async () => {
      const response = await fetch(`${apiBase}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (response.ok) {
        setQueueNumber(data.user?.queuePosition ?? null)
      }
    }
    load()
    const interval = setInterval(load, 5000)
    return () => clearInterval(interval)
  }, [apiBase])

  useEffect(() => {
    const load = async () => {
      const response = await fetch(`${apiBase}/announcement`)
      const data = await response.json()
      if (response.ok) {
        setAnnouncements(data.announcements || [])
      }
    }
    load()
    const interval = setInterval(load, 5000)
    return () => clearInterval(interval)
  }, [apiBase])

  const submitChallenge = async (statementId: number, statement: string) => {
    const token = localStorage.getItem("cmd_token")
    if (!token) return
    setSubmitting(true)
    setMessage("")
    try {
      const response = await fetch(`${apiBase}/challenges/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ statementId, statement }),
      })
      const data = await response.json()
      if (data?.activeChallenge) {
        setActiveChallenge(data.activeChallenge)
        setActiveTab("accepted")
      }
      if (!response.ok) throw new Error(data.message || "Submit failed.")
      setActiveChallenge({ id: "active", statementId, statement })
      setActiveTab("accepted")
      setMessage("Sealed. Your challenge has been recorded.")
    } catch (error: any) {
      setMessage(error.message || "Submit failed.")
    } finally {
      setSubmitting(false)
    }
  }

  const releaseChallenge = async () => {
    const token = localStorage.getItem("cmd_token")
    if (!token) return
    setSubmitting(true)
    setMessage("")
    try {
      const response = await fetch(`${apiBase}/challenges/release`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || "Release failed.")
      setActiveChallenge(null)
      setActiveTab("shell")
      setMessage("Challenge released.")
    } catch (error: any) {
      setMessage(error.message || "Release failed.")
    } finally {
      setSubmitting(false)
    }
  }

  const uploadFile = async (file: File) => {
    const token = localStorage.getItem("cmd_token")
    if (!token) return
    setUploading(true)
    setMessage("")
    try {
      const formData = new FormData()
      formData.append("file", file)
      const response = await fetch(`${apiBase}/challenges/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || "Upload failed.")
      setMessage("Document uploaded.")
    } catch (error: any) {
      setMessage(error.message || "Upload failed.")
    } finally {
      setUploading(false)
    }
  }

  return (
    <main className="hero-bg relative h-screen overflow-y-auto px-4 py-0 text-white/80 sm:px-6">
      <div className="noise-overlay absolute inset-0 opacity-25" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(0,255,0,0.18),transparent_40%),radial-gradient(circle_at_80%_60%,rgba(0,229,255,0.12),transparent_45%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(0,255,0,0.06),transparent_50%)]" />
      <div className="relative mx-auto max-w-6xl space-y-6">
        <div className="sticky top-0 z-30 w-full overflow-x-hidden bg-[#050805]/95 py-3 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-3 px-4 text-center sm:px-6">
            <div className="terminal-title terminal-title-plain w-full min-w-0 truncate whitespace-nowrap font-orbitron text-xl text-neonGreen sm:text-2xl md:text-3xl">
              Cmd User Shell
            </div>
            <div className="w-full text-xs uppercase tracking-[0.28em] text-neonGreen/80">
              Queue Number: {queueNumber ? `#${queueNumber}` : "—"}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              <Button type="button" variant="ghost" onClick={() => router.push("/")} className="w-full sm:w-auto">
                Back
              </Button>
              <Button type="button" variant="ghost" onClick={() => router.push("/participant/profile")} className="w-full sm:w-auto">
                Profile
              </Button>
            </div>
          </div>
        </div>
        <div className="glass-panel mt-6 rounded-xl border border-neonGreen/40 bg-[#050805] p-5 shadow-[0_0_35px_rgba(0,255,0,0.2)] sm:p-6">
          <div className="terminal-tabs mb-6 inline-flex flex-wrap items-center gap-3">
            <button
              type="button"
              className={`terminal-tab ${activeTab === "shell" ? "terminal-tab-active" : ""}`}
              onClick={() => setActiveTab("shell")}
            >
              Challenge Shell
            </button>
            {activeChallenge && (
              <button
                type="button"
                className={`terminal-tab ${activeTab === "accepted" ? "terminal-tab-active" : ""}`}
                onClick={() => setActiveTab("accepted")}
              >
                Accepted Challenge
              </button>
            )}
            <button
              type="button"
              className={`terminal-tab ${activeTab === "announcement" ? "terminal-tab-active" : ""}`}
              onClick={() => setActiveTab("announcement")}
            >
              Announcement
            </button>
          </div>

          {activeTab === "announcement" && (
            <div className="space-y-4">
              <div className="rounded-lg border border-neonGreen/40 bg-black/70 p-6 shadow-inner shadow-black/70">
                <div className="text-xs uppercase tracking-[0.3em] text-neonGreen/70">
                  Interview Round Details
                </div>
                <div className="mt-4 text-sm text-white/80">
                  Marking Scheme:
                </div>
                <ul className="mt-3 text-sm text-white/80">
                  <li>
                    S (3 marks): Skills
                  </li>
                  <li>
                    P (3 marks): Project
                  </li>
                  <li>
                    D (4 marks): Dynamic Thinking
                  </li>
                </ul>
                <div className="mt-4 text-sm text-white/80">
                  Problem statement is a part of Dynamic Thinking.
                </div>
                <div className="mt-3 text-sm text-white/80">
                  Minimum to pass interview:
                </div>
                <ul className="mt-2 text-sm text-white/80">
                  <li>1 mark in Skills</li>
                  <li>1 mark in Project</li>
                  <li>2 marks in Dynamic Thinking</li>
                </ul>
              </div>
              {announcements.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-neonGreen/30 bg-black/60 p-4 text-sm text-neonGreen/80"
                >
                  <div className="text-[10px] uppercase tracking-[0.28em] text-neonGreen/60">
                    {new Date(item.updatedAt).toLocaleString()}
                  </div>
                  <div className="mt-2 whitespace-pre-wrap text-sm text-white/80">{item.content}</div>
                </div>
              ))}
              {!announcements.length && (
                <div className="rounded-lg border border-neonGreen/30 bg-black/60 p-4 text-sm text-neonGreen/80">
                  No additional announcements yet.
                </div>
              )}
            </div>
          )}

          {activeTab === "shell" && (
            <>
              <div className="mb-4 text-xs uppercase tracking-[0.35em] text-white/70">
                Select and Seal One Problem
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {challenges.map((item, index) => (
                  <div
                    key={item}
                    className="rounded-lg border border-white/10 bg-black/60 p-4 shadow-inner shadow-black/60"
                  >
                    <div className="text-xs uppercase tracking-[0.2em] text-neonGreen/70">
                      Problem {index + 1}
                    </div>
                    <div className="mt-2 text-sm text-white/80">{item}</div>
                    <div className="mt-4 flex justify-end">
                      <Button
                        className="min-w-[140px]"
                        onClick={() => submitChallenge(index + 1, item)}
                        disabled={submitting || !!activeChallenge}
                      >
                        {submitting ? "Sealing..." : activeChallenge ? "Sealed" : "Seal"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === "accepted" && activeChallenge && (
            <div className="max-h-[70vh] overflow-y-auto rounded-lg border border-neonGreen/40 bg-black/70 p-6 pr-4 shadow-inner shadow-black/70 sm:max-h-[65vh]">
              <div className="text-xs uppercase tracking-[0.3em] text-neonGreen/70">
                Accepted Challenge
              </div>
              <div className="mt-2 text-xs uppercase tracking-[0.28em] text-white/70">
                Upload solution document after your interview round (Idea and Prototype optional).
              </div>
              <div className="mt-3 text-sm text-white/80">
                <span className="text-neonGreen/80">Problem #{activeChallenge.statementId}</span>
              </div>
              <div className="mt-3 text-sm text-white/80">{activeChallenge.statement}</div>
              <div className="mt-6 flex justify-end">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (!file) return
                        if (file.size > 5 * 1024 * 1024) {
                          setMessage("File too large (max 5 MB).")
                          return
                        }
                        uploadFile(file)
                        event.target.value = ""
                      }}
                    />
                    <span className="btn inline-flex min-w-[140px] items-center justify-center px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-neonGreen">
                      {uploading ? "Uploading..." : "Upload"}
                    </span>
                  </label>
                  <Button
                    className="min-w-[140px]"
                    onClick={releaseChallenge}
                    disabled={submitting}
                  >
                    {submitting ? "Releasing..." : "Release"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {message && (
            <div className="mt-4 text-xs uppercase tracking-[0.28em] text-neonGreen/80">
              {message}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}



















