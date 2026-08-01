"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { Select } from "../../../components/ui/select"
import IdentityCard from "../../../components/IdentityCard"

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
    <main className="cm-workspace cm-profile h-screen overflow-y-auto">
      <div className="cm-crt" aria-hidden="true" />
      <div className="cm-workspace-orbit" aria-hidden="true" />
      <div className="relative mx-auto max-w-[1100px] space-y-6 px-4 pb-12 sm:px-6">
        <div className="cm-workspace-header sticky top-0 z-30">
          <div className="flex w-full flex-wrap items-center justify-between gap-4">
            <div>
              <div className="cm-workspace-eyebrow">Code Medium / Identity</div>
              <div className="cm-workspace-title">Builder profile</div>
            </div>
            <div className="cm-queue-pill">
              <span>Queue position</span>
              <strong>{profile?.queuePosition ? `#${profile.queuePosition}` : "—"}</strong>
            </div>
            <div className="flex flex-wrap items-center gap-2">
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
        <div className="cm-workspace-panel glass-panel mt-6 p-5 sm:p-8">
          <div className="cm-profile-summary">
            <div className="cm-profile-monogram">
              {(profile?.name || name || "CM")
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div>
              <span>Participant identity</span>
              <strong>{profile?.name || name || "Complete your profile"}</strong>
              <p>{profile?.email || "Your account details are saved automatically."}</p>
            </div>
            <div className="cm-profile-completion">
              <span>Profile signal</span>
              <strong>
                {[name, username, phone, year, branch, linkedInUrl || githubUrl].filter(Boolean).length}/6
              </strong>
            </div>
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
                    <Select
                      value={year}
                      onChange={(value) => {
                        setYear(value)
                        void savePatch({ year: value })
                      }}
                      options={[
                        { value: "FE", label: "FE" },
                        { value: "SE", label: "SE" },
                        { value: "TE", label: "TE" },
                        { value: "BE", label: "BE" },
                      ]}
                      placeholder="Select"
                    />
                  </div>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/50 p-4">
                  <div className="text-xs uppercase tracking-[0.25em] text-neonGreen/70">Branch</div>
                  <div className="mt-3">
                    <Select
                      value={branch}
                      onChange={(value) => {
                        setBranch(value)
                        void savePatch({ branch: value })
                      }}
                      options={[
                        { value: "AI&DS", label: "AI&DS" },
                        { value: "AIML", label: "AIML" },
                        { value: "IOT", label: "IOT" },
                        { value: "COMP", label: "COMP" },
                        { value: "MECH", label: "MECH" },
                        { value: "ELECT", label: "ELECT" },
                      ]}
                      placeholder="Select"
                    />
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
              <div className="text-xs uppercase tracking-[0.28em] text-[#39ff14]/80">
                {saveMessage}
              </div>
            )}
          </div>
        </div>

        {/* Identity Card */}
        <div className="mt-10">
          <IdentityCard
            name={profile?.name || name}
            email={profile?.email || ""}
            username={profile?.username || username}
            year={profile?.year || year}
            branch={profile?.branch || branch}
            linkedinUrl={profile?.linkedinUrl || linkedInUrl}
            githubUrl={profile?.githubUrl || githubUrl}
            queuePosition={profile?.queuePosition ?? null}
          />
        </div>
      </div>
    </main>
  )
}
