"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"

export default function ParticipantProfilePage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState("")
  const [profile, setProfile] = useState<{
    name: string
    email: string
    username: string
    phone: string
    year: string
    branch: string
    linkedinUrl?: string | null
    githubUrl?: string | null
    linkedinChoice?: "YES" | "NO" | null
    githubChoice?: "YES" | "NO" | null
    profileQueueNumber?: number | null
    queuePosition?: number | null
  } | null>(null)
  const [hasLinkedIn, setHasLinkedIn] = useState<"yes" | "no" | "unset">("unset")
  const [linkedInUrl, setLinkedInUrl] = useState("")
  const [hasGithub, setHasGithub] = useState<"yes" | "no" | "unset">("unset")
  const [githubUrl, setGithubUrl] = useState("")
  const [name, setName] = useState("")
  const [username, setUsername] = useState("")
  const [phone, setPhone] = useState("")
  const [year, setYear] = useState("")
  const [branch, setBranch] = useState("")
  const saveTimerRef = useRef<number | null>(null)
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || ""

  const linkedInLocked = !!profile?.linkedinUrl
  const githubLocked = !!profile?.githubUrl
  const linkedInNoSelected = profile?.linkedinChoice === "NO" && !profile?.linkedinUrl
  const githubNoSelected = profile?.githubChoice === "NO" && !profile?.githubUrl

  const savePatch = async (patch: Record<string, unknown>, options?: { debounceMs?: number }) => {
    const token = localStorage.getItem("cmd_token")
    if (!token) return

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }

    const run = async () => {
      setSaving(true)
      setSaveMessage("")
      try {
        const response = await fetch(`${apiBase}/auth/me`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(patch),
        })
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.message || "Failed to save profile.")
        }
        setProfile(data.user)
        setSaveMessage("Saved.")
      } catch (error: any) {
        setSaveMessage(error.message || "Failed to save.")
      } finally {
        setSaving(false)
      }
    }

    const debounceMs = options?.debounceMs ?? 0
    if (debounceMs > 0) {
      saveTimerRef.current = window.setTimeout(run, debounceMs)
      return
    }

    await run()
  }

  useEffect(() => {
    const token = localStorage.getItem("cmd_token")
    if (!token) {
      router.replace("/")
      return
    }
    setReady(true)
  }, [router])

  useEffect(() => {
    if (!ready) return
    const token = localStorage.getItem("cmd_token")
    if (!token) return
    const load = async () => {
      const response = await fetch(`${apiBase}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (response.ok) {
        setProfile(data.user)
        const li = data.user?.linkedinUrl || ""
        const gh = data.user?.githubUrl || ""
        setHasLinkedIn(li ? "yes" : (data.user?.linkedinChoice === "NO" ? "no" : "unset"))
        setLinkedInUrl(li || "")
        setHasGithub(gh ? "yes" : (data.user?.githubChoice === "NO" ? "no" : "unset"))
        setGithubUrl(gh || "")
        setName(data.user?.name || "")
        setUsername(data.user?.username || "")
        setPhone(data.user?.phone || "")
        setYear(data.user?.year || "")
        setBranch(data.user?.branch || "")
      }
    }
    load()
  }, [apiBase, ready])

  const saveLinks = async () => {
    const token = localStorage.getItem("cmd_token")
    if (!token) return
    setSaving(true)
    setSaveMessage("")
    try {
      if ((linkedInLocked || hasLinkedIn === "yes") && !linkedInUrl.trim()) {
        throw new Error("LinkedIn URL is required when selecting Yes.")
      }
      if ((githubLocked || hasGithub === "yes") && !githubUrl.trim()) {
        throw new Error("GitHub URL is required when selecting Yes.")
      }
      const payload = {
        linkedinChoice: linkedInLocked
          ? "YES"
          : hasLinkedIn === "yes"
            ? "YES"
            : hasLinkedIn === "no"
              ? "NO"
              : null,
        githubChoice: githubLocked
          ? "YES"
          : hasGithub === "yes"
            ? "YES"
            : hasGithub === "no"
              ? "NO"
              : null,
        linkedinUrl: (linkedInLocked || hasLinkedIn === "yes") ? linkedInUrl.trim() : null,
        githubUrl: (githubLocked || hasGithub === "yes") ? githubUrl.trim() : null,
      }
      const response = await fetch(`${apiBase}/auth/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || "Failed to save profile links.")
      }
      setProfile(data.user)
      setHasLinkedIn(data.user?.linkedinUrl ? "yes" : "no")
      setHasGithub(data.user?.githubUrl ? "yes" : "no")
      setSaveMessage("Saved.")
    } catch (error: any) {
      setSaveMessage(error.message || "Failed to save.")
    } finally {
      setSaving(false)
    }
  }

  if (!ready) return null

  return (
    <main className="hero-bg relative h-screen overflow-y-auto px-4 py-0 text-white/80 sm:px-6">
      <div className="noise-overlay absolute inset-0 opacity-25" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(0,255,0,0.18),transparent_40%),radial-gradient(circle_at_80%_60%,rgba(0,229,255,0.12),transparent_45%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(0,255,0,0.06),transparent_50%)]" />
      <div className="relative mx-auto max-w-4xl space-y-6">
        <div className="sticky top-0 z-30 w-full overflow-x-hidden bg-[#050805]/95 py-3 backdrop-blur">
          <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-center gap-3 px-4 text-center sm:px-6">
            <div className="terminal-title terminal-title-plain w-full min-w-0 truncate whitespace-nowrap font-orbitron text-xl text-neonGreen sm:text-2xl md:text-3xl">
              Cmd Profile Shell
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              <Button type="button" variant="ghost" onClick={() => router.push("/participant")} className="w-full sm:w-auto">
                Back
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full sm:w-auto"
                onClick={() => {
                  localStorage.removeItem("cmd_token")
                  router.replace("/")
                }}
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
        <div className="glass-panel mt-6 rounded-xl border border-neonGreen/40 bg-[#050805] p-5 shadow-[0_0_35px_rgba(0,255,0,0.2)] sm:p-8">
          <div className="text-xs uppercase tracking-[0.35em] text-white/70">
            Participant Profile
          </div>
          <div className="mt-3 text-xs uppercase tracking-[0.28em] text-neonGreen/80">
            Queue Number: {profile?.queuePosition ? `#${profile.queuePosition}` : "—"}
          </div>
          <div className="mt-6 grid gap-4 text-sm text-white/80 sm:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-black/50 p-4">
              <div className="text-xs uppercase tracking-[0.25em] text-neonGreen/70">Name</div>
              <div className="mt-3">
                <Input
                  value={name}
                  onChange={(e) => {
                    const value = e.target.value
                    setName(value)
                    void savePatch({ name: value }, { debounceMs: 600 })
                  }}
                  placeholder="Your name"
                />
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/50 p-4">
              <div className="text-xs uppercase tracking-[0.25em] text-neonGreen/70">Email</div>
              <div className="mt-3 text-sm text-white/80">{profile?.email || "—"}</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/50 p-4">
              <div className="text-xs uppercase tracking-[0.25em] text-neonGreen/70">Username</div>
              <div className="mt-3">
                <Input
                  value={username}
                  onChange={(e) => {
                    const value = e.target.value
                    setUsername(value)
                    void savePatch({ username: value }, { debounceMs: 600 })
                  }}
                  placeholder="$cmd_user"
                />
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/50 p-4">
              <div className="text-xs uppercase tracking-[0.25em] text-neonGreen/70">Phone</div>
              <div className="mt-3">
                <Input
                  value={phone}
                  onChange={(e) => {
                    const value = e.target.value
                    setPhone(value)
                    void savePatch({ phone: value }, { debounceMs: 600 })
                  }}
                  placeholder="Phone number"
                  inputMode="tel"
                  autoComplete="tel"
                />
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/50 p-4">
              <div className="text-xs uppercase tracking-[0.25em] text-neonGreen/70">Year</div>
              <div className="mt-3">
                <select
                  value={year}
                  onChange={(e) => {
                    const value = e.target.value
                    setYear(value)
                    void savePatch({ year: value })
                  }}
                  className="h-12 w-full rounded-sm border border-neonGreen/50 bg-black/80 px-4 text-sm text-neonGreen outline-none focus:border-neonBlue/80 focus:ring-2 focus:ring-neonGreen/40"
                >
                  <option value="" disabled>Select</option>
                  <option value="FE">FE</option>
                  <option value="SE">SE</option>
                  <option value="TE">TE</option>
                  <option value="BE">BE</option>
                </select>
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/50 p-4">
              <div className="text-xs uppercase tracking-[0.25em] text-neonGreen/70">Branch</div>
              <div className="mt-3">
                <select
                  value={branch}
                  onChange={(e) => {
                    const value = e.target.value
                    setBranch(value)
                    void savePatch({ branch: value })
                  }}
                  className="h-12 w-full rounded-sm border border-neonGreen/50 bg-black/80 px-4 text-sm text-neonGreen outline-none focus:border-neonBlue/80 focus:ring-2 focus:ring-neonGreen/40"
                >
                  <option value="" disabled>Select</option>
                  <option value="AI&DS">AI&DS</option>
                  <option value="AIML">AIML</option>
                  <option value="IOT">IOT</option>
                  <option value="COMP">COMP</option>
                  <option value="MECH">MECH</option>
                  <option value="ELECT">ELECT</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mt-8 text-xs uppercase tracking-[0.28em] text-white/60">
            Update LinkedIn & Github profile to get your queue number for interview. If you edit any url further then you will be pushed behind in queue.
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-black/50 p-4">
              <div className="text-xs uppercase tracking-[0.25em] text-neonGreen/70">
                LinkedIn Profile?
              </div>

              {!linkedInLocked && !linkedInNoSelected && (
                <div className="mt-3 flex flex-wrap gap-3">
                  <Button
                    type="button"
                    onClick={() => setHasLinkedIn("yes")}
                    className={hasLinkedIn === "yes" ? "" : "opacity-60 hover:opacity-100"}
                  >
                    Yes
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setHasLinkedIn("no")
                      setLinkedInUrl("")
                    }}
                    className={hasLinkedIn === "no" ? "" : "opacity-60 hover:opacity-100"}
                  >
                    No
                  </Button>
                </div>
              )}

              {!linkedInLocked && linkedInNoSelected && (
                <div className="mt-3">
                  <Button
                    type="button"
                    onClick={() => setHasLinkedIn("yes")}
                  >
                    Edit
                  </Button>
                </div>
              )}

              {(linkedInLocked || hasLinkedIn === "yes") && (
                <div className="mt-4 space-y-2">
                  <div className="text-[10px] uppercase tracking-[0.28em] text-white/60">
                    Enter your LinkedIn URL
                  </div>
                  <Input
                    value={linkedInUrl}
                    onChange={(e) => setLinkedInUrl(e.target.value)}
                    placeholder="https://www.linkedin.com/in/your-handle"
                    inputMode="url"
                    autoComplete="url"
                  />
                  {!!linkedInUrl.trim() && (
                    <a
                      className="inline-block text-xs uppercase tracking-[0.25em] text-neonBlue/80 hover:text-neonGreen"
                      href={linkedInUrl.trim()}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open LinkedIn
                    </a>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-white/10 bg-black/50 p-4">
              <div className="text-xs uppercase tracking-[0.25em] text-neonGreen/70">
                GitHub Profile?
              </div>

              {!githubLocked && !githubNoSelected && (
                <div className="mt-3 flex flex-wrap gap-3">
                  <Button
                    type="button"
                    onClick={() => setHasGithub("yes")}
                    className={hasGithub === "yes" ? "" : "opacity-60 hover:opacity-100"}
                  >
                    Yes
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setHasGithub("no")
                      setGithubUrl("")
                    }}
                    className={hasGithub === "no" ? "" : "opacity-60 hover:opacity-100"}
                  >
                    No
                  </Button>
                </div>
              )}

              {!githubLocked && githubNoSelected && (
                <div className="mt-3">
                  <Button
                    type="button"
                    onClick={() => setHasGithub("yes")}
                  >
                    Edit
                  </Button>
                </div>
              )}

              {(githubLocked || hasGithub === "yes") && (
                <div className="mt-4 space-y-2">
                  <div className="text-[10px] uppercase tracking-[0.28em] text-white/60">
                    Enter your GitHub URL
                  </div>
                  <Input
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/your-handle"
                    inputMode="url"
                    autoComplete="url"
                  />
                  {!!githubUrl.trim() && (
                    <a
                      className="inline-block text-xs uppercase tracking-[0.25em] text-neonBlue/80 hover:text-neonGreen"
                      href={githubUrl.trim()}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open GitHub
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <Button type="button" onClick={saveLinks} disabled={saving}>
              {saving ? "Saving..." : "Save Links"}
            </Button>
            {saveMessage && (
              <div className="text-xs uppercase tracking-[0.28em] text-neonGreen/80">
                {saveMessage}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
