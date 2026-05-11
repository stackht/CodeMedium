
"use client"

import { Fragment, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"

type Participant = {
  id: string
  name: string
  email: string
  linkedinUrl: string | null
  githubUrl: string | null
  phone: string
  year: string
  branch: string
  statementId: number | null
  hasUpload: boolean
  interviewDone: boolean
  sScore: number | null
  pScore: number | null
  dScore: number | null
  reviewStatus: string
}

type Announcement = {
  id: number
  content: string
  updatedAt: string
}

export default function AdminPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [activeTab, setActiveTab] = useState<
    "participants" | "approved" | "rejected" | "announce"
  >("participants")
  const [participants, setParticipants] = useState<Participant[]>([])
  const [scores, setScores] = useState<Record<string, { s: string; p: string; d: string }>>({})
  const [announcement, setAnnouncement] = useState("")
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [savingAnnouncement, setSavingAnnouncement] = useState(false)
  const [yearFilter, setYearFilter] = useState("ALL")
  const [branchFilter, setBranchFilter] = useState("ALL")
  const [search, setSearch] = useState("")
  const prevScoresRef = useRef<Record<string, string>>({})
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || ""
  const demoNames = useMemo(
    () => new Set(["Hemant Thakur", "Nihal Mishra", "Vedh Pokharkar"]),
    [],
  )

  const LinkedInIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5ZM.5 23.5h4V7.98h-4V23.5ZM8.5 7.98h3.84v2.12h.05c.53-1 1.83-2.06 3.77-2.06 4.03 0 4.77 2.65 4.77 6.09v9.37h-4v-8.31c0-1.98-.03-4.52-2.75-4.52-2.75 0-3.17 2.15-3.17 4.38v8.45h-4V7.98Z"
      />
    </svg>
  )

  const GitHubIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 .5C5.65.5.5 5.82.5 12.4c0 5.26 3.44 9.72 8.2 11.29.6.12.82-.27.82-.6v-2.1c-3.33.75-4.03-1.65-4.03-1.65-.55-1.44-1.34-1.83-1.34-1.83-1.1-.77.08-.76.08-.76 1.22.09 1.86 1.3 1.86 1.3 1.08 1.91 2.83 1.36 3.52 1.04.11-.82.42-1.36.76-1.67-2.66-.31-5.46-1.38-5.46-6.14 0-1.36.46-2.48 1.23-3.35-.12-.31-.53-1.55.12-3.23 0 0 1.01-.33 3.3 1.28.96-.27 1.99-.4 3.01-.4 1.02 0 2.05.14 3.01.4 2.29-1.61 3.3-1.28 3.3-1.28.65 1.68.24 2.92.12 3.23.76.87 1.23 1.99 1.23 3.35 0 4.77-2.81 5.83-5.49 6.14.43.38.82 1.14.82 2.29v3.39c0 .33.22.73.83.6 4.75-1.57 8.18-6.03 8.18-11.29C23.5 5.82 18.35.5 12 .5Z"
      />
    </svg>
  )

  useEffect(() => {
    const token = localStorage.getItem("cmd_admin_token")
    if (!token) {
      router.replace("/admin/login")
      return
    }
    setReady(true)
  }, [router])

  useEffect(() => {
    if (!ready) return
    const token = localStorage.getItem("cmd_admin_token")
    if (!token) return
    const load = async () => {
      const response = await fetch(`${apiBase}/admin/participants`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) return
      const incoming: Participant[] = data.participants || []
      setParticipants(incoming)
      setScores((prev) => {
        const next = { ...prev }
        for (const participant of incoming) {
          if (next[participant.id]) continue
          next[participant.id] = {
            s: participant.sScore?.toString() || "",
            p: participant.pScore?.toString() || "",
            d: participant.dScore?.toString() || "",
          }
        }
        return next
      })
    }
    load()
    const interval = setInterval(load, 5000)
    return () => clearInterval(interval)
  }, [apiBase, ready])

  useEffect(() => {
    if (!ready) return
    const load = async () => {
      const response = await fetch(`${apiBase}/announcement`)
      const data = await response.json()
      if (response.ok) {
        setAnnouncements(data.announcements || [])
      }
    }
    load()
  }, [apiBase, ready])

  const updateScore = (id: string, field: "s" | "p" | "d", value: string) => {
    setScores((prev) => ({
      ...prev,
      [id]: {
        s: prev[id]?.s || "",
        p: prev[id]?.p || "",
        d: prev[id]?.d || "",
        [field]: value,
      },
    }))
  }

  const submitReview = async (id: string, status: "APPROVED" | "REJECTED", name?: string) => {
    if (!window.confirm(`Confirm ${status.toLowerCase()} for ${name || "this participant"}?`)) return
    const token = localStorage.getItem("cmd_admin_token")
    if (!token) return
    const current = scores[id] || { s: "", p: "", d: "" }
    const toNumber = (value: string) => (value === "" ? null : Number(value))
    const payload = {
      sScore: toNumber(current.s),
      pScore: toNumber(current.p),
      dScore: toNumber(current.d),
      reviewStatus: status,
    }
    const response = await fetch(`${apiBase}/admin/participants/${id}/review`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })
    if (!response.ok) return
    setParticipants((prev) =>
      prev.map((participant) =>
        participant.id === id ? { ...participant, reviewStatus: status } : participant,
      ),
    )
  }

  const toggleInterviewDone = async (id: string, value: boolean) => {
    const token = localStorage.getItem("cmd_admin_token")
    if (!token) return
    const response = await fetch(`${apiBase}/admin/participants/${id}/review`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ interviewDone: value }),
    })
    if (!response.ok) return
    setParticipants((prev) =>
      prev.map((participant) =>
        participant.id === id ? { ...participant, interviewDone: value } : participant,
      ),
    )
  }

  const deleteParticipant = async (id: string, name: string) => {
    const token = localStorage.getItem("cmd_admin_token")
    if (!token) return
    const ok = window.confirm(`Delete ${name}? This cannot be undone.`)
    if (!ok) return
    const response = await fetch(`${apiBase}/admin/participants/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) return
    setParticipants((prev) => prev.filter((participant) => participant.id !== id))
  }

  useEffect(() => {
    if (!ready) return
    const token = localStorage.getItem("cmd_admin_token")
    if (!token) return
    const timeouts: Record<string, ReturnType<typeof setTimeout>> = {}
    const saveScores = (id: string, payload: { sScore: number | null; pScore: number | null; dScore: number | null }) => {
      const body = { ...payload }
      fetch(`${apiBase}/admin/participants/${id}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      }).catch(() => undefined)
    }

    for (const participant of participants) {
      const current = scores[participant.id]
      if (!current) continue
      const snapshot = `${current.s}|${current.p}|${current.d}`
      if (prevScoresRef.current[participant.id] === snapshot) continue
      prevScoresRef.current[participant.id] = snapshot
      const toNumber = (value: string) => (value === "" ? null : Number(value))
      const payload = {
        sScore: toNumber(current.s),
        pScore: toNumber(current.p),
        dScore: toNumber(current.d),
      }
      const key = participant.id
      if (timeouts[key]) clearTimeout(timeouts[key])
      timeouts[key] = setTimeout(() => saveScores(key, payload), 450)
    }

    return () => {
      Object.values(timeouts).forEach((timeout) => clearTimeout(timeout))
    }
  }, [apiBase, participants, scores, ready])

  const downloadUpload = async (id: string) => {
    const token = localStorage.getItem("cmd_admin_token")
    if (!token) return
    const response = await fetch(`${apiBase}/admin/participants/${id}/upload`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) return
    const blob = await response.blob()
    const disposition = response.headers.get("Content-Disposition") || ""
    const filenameMatch = disposition.match(/filename="([^"]+)"/)
    const filename = filenameMatch?.[1] || "upload"
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    link.click()
    window.URL.revokeObjectURL(url)
  }

  const saveAnnouncement = async () => {
    const token = localStorage.getItem("cmd_admin_token")
    if (!token) return
    setSavingAnnouncement(true)
    try {
      const url = editingId
        ? `${apiBase}/admin/announcement/${editingId}`
        : `${apiBase}/admin/announcement`
      const response = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: announcement }),
      })
      const data = await response.json()
      if (response.ok) {
        if (editingId) {
          setAnnouncements((prev) =>
            prev.map((item) =>
              item.id === editingId
                ? {
                    ...item,
                    content: data.announcement?.content || announcement,
                    updatedAt: data.announcement?.updatedAt || item.updatedAt,
                  }
                : item,
            ),
          )
        } else if (data.announcement) {
          setAnnouncements((prev) => [
            {
              id: data.announcement.id,
              content: data.announcement.content,
              updatedAt: data.announcement.updatedAt,
            },
            ...prev,
          ])
        }
        setAnnouncement("")
        setEditingId(null)
      }
    } finally {
      setSavingAnnouncement(false)
    }
  }

  const editAnnouncement = (item: { id: number; content: string }) => {
    setEditingId(item.id)
    setAnnouncement(item.content)
  }

  const deleteAnnouncement = async (id: number) => {
    const token = localStorage.getItem("cmd_admin_token")
    if (!token) return
    const response = await fetch(`${apiBase}/admin/announcement/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) return
    setAnnouncements((prev) => prev.filter((item) => item.id !== id))
    if (editingId === id) {
      setEditingId(null)
      setAnnouncement("")
    }
  }

  const rows = useMemo(
    () =>
      participants.map((participant) => ({
        ...participant,
        scores: scores[participant.id] || { s: "", p: "", d: "" },
        isApproved: participant.reviewStatus === "APPROVED",
      })),
    [participants, scores],
  )

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (yearFilter !== "ALL" && row.year !== yearFilter) return false
      if (branchFilter !== "ALL" && row.branch !== branchFilter) return false
      if (activeTab === "approved" && row.reviewStatus !== "APPROVED") return false
      if (activeTab === "rejected" && row.reviewStatus !== "REJECTED") return false
      if (search.trim()) {
        const term = search.trim().toLowerCase()
        const haystack = `${row.name} ${row.email} ${row.phone}`.toLowerCase()
        if (!haystack.includes(term)) return false
      }
      return true
    })
  }, [activeTab, branchFilter, rows, yearFilter, search])

  const countableRows = useMemo(
    () => filteredRows.filter((row) => !demoNames.has(row.name)),
    [demoNames, filteredRows],
  )

  const totalCount = useMemo(() => countableRows.length, [countableRows])
  const doneCount = useMemo(
    () => countableRows.filter((row) => row.interviewDone).length,
    [countableRows],
  )

  const approvedCount = useMemo(
    () =>
      rows.filter(
        (row) => !demoNames.has(row.name) && row.reviewStatus === "APPROVED",
      ).length,
    [demoNames, rows],
  )

  const rejectedCount = useMemo(
    () =>
      rows.filter(
        (row) => !demoNames.has(row.name) && row.reviewStatus === "REJECTED",
      ).length,
    [demoNames, rows],
  )

  const groupedRows = useMemo(() => {
    const groups = new Map<string, { year: string; branch: string; items: typeof rows }>()
    for (const row of filteredRows) {
      const year = row.year || "—"
      const branch = row.branch || "—"
      const key = `${year}::${branch}`
      if (!groups.has(key)) {
        groups.set(key, { year, branch, items: [] as typeof rows })
      }
      groups.get(key)!.items.push(row)
    }
    return Array.from(groups.values())
  }, [filteredRows, rows])

  if (!ready) return null

  return (
    <main className="hero-bg relative h-screen overflow-y-auto px-6 py-0 text-white/80">
      <div className="noise-overlay absolute inset-0 opacity-25" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(0,255,0,0.18),transparent_40%),radial-gradient(circle_at_80%_60%,rgba(0,229,255,0.12),transparent_45%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(0,255,0,0.06),transparent_50%)]" />
      <div className="relative mx-auto max-w-6xl space-y-6">
        <div className="sticky top-0 z-30 w-full overflow-x-hidden bg-[#050805]/95 py-3 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-3 px-4 text-center sm:px-6">
            <div className="terminal-title terminal-title-plain w-full min-w-0 truncate whitespace-nowrap font-orbitron text-xl text-neonGreen sm:text-2xl md:text-3xl">
              Cmd Admin
            </div>
            <Button type="button" variant="ghost" onClick={() => router.push("/")} className="w-full sm:w-auto">
              Back
            </Button>
          </div>
        </div>
        <div className="glass-panel mt-6 rounded-xl border border-neonGreen/40 bg-[#050805] p-8 shadow-[0_0_35px_rgba(0,255,0,0.2)]">
          <div className="terminal-tabs mb-6 inline-flex flex-wrap items-center gap-3">
            <button
              type="button"
              className={`terminal-tab ${activeTab === "participants" ? "terminal-tab-active" : ""}`}
              onClick={() => setActiveTab("participants")}
            >
              Participants
            </button>
            <button
              type="button"
              className={`terminal-tab ${activeTab === "approved" ? "terminal-tab-active" : ""}`}
              onClick={() => setActiveTab("approved")}
            >
              Approved
            </button>
            <button
              type="button"
              className={`terminal-tab ${activeTab === "rejected" ? "terminal-tab-active" : ""}`}
              onClick={() => setActiveTab("rejected")}
            >
              Rejected
            </button>
            <button
              type="button"
              className={`terminal-tab ${activeTab === "announce" ? "terminal-tab-active" : ""}`}
              onClick={() => setActiveTab("announce")}
            >
              Announce
            </button>
          </div>

          {activeTab === "announce" && (
            <div className="space-y-4">
              <div className="text-xs uppercase tracking-[0.35em] text-white/70">
                {editingId ? "Edit Announcement" : "Announcement"}
              </div>
              <textarea
                className="h-40 w-full rounded-lg border border-neonGreen/20 bg-black/60 p-4 text-sm text-white/80 outline-none focus:border-neonGreen/60 focus:ring-2 focus:ring-neonGreen/20"
                value={announcement}
                onChange={(event) => setAnnouncement(event.target.value)}
                placeholder="Type announcement for participants..."
              />
              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" onClick={saveAnnouncement} disabled={savingAnnouncement}>
                  {savingAnnouncement ? "Saving..." : editingId ? "Update" : "Save"}
                </Button>
                {editingId && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setEditingId(null)
                      setAnnouncement("")
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </div>
              <div className="mt-6 space-y-3">
                <div className="text-xs uppercase tracking-[0.35em] text-white/60">
                  Announcement History
                </div>
                {announcements.length === 0 && (
                  <div className="rounded border border-white/10 bg-black/40 p-4 text-sm text-white/60">
                    No announcements yet.
                  </div>
                )}
                {announcements.map((item) => (
                  <div key={item.id} className="rounded border border-neonGreen/20 bg-black/50 p-4">
                    <div className="text-xs uppercase tracking-[0.3em] text-neonGreen/60">
                      {new Date(item.updatedAt).toLocaleString()}
                    </div>
                    <div className="mt-2 whitespace-pre-wrap text-sm text-white/80">{item.content}</div>
                    <div className="mt-3 flex items-center gap-3">
                      <Button type="button" variant="ghost" onClick={() => editAnnouncement(item)}>
                        Edit
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => deleteAnnouncement(item.id)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(activeTab === "participants" || activeTab === "approved" || activeTab === "rejected") && (
            <div className="mt-2 overflow-auto">
              <div className="mb-4 flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.28em] text-white/70">
                <div className="mr-auto text-xs uppercase tracking-[0.28em] text-neonGreen/70">
                  Total: {totalCount} · Done: {doneCount} · Approved: {approvedCount} · Rejected: {rejectedCount}
                </div>
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search name/email/phone"
                  className="h-9 w-full rounded border border-neonGreen/30 bg-black/60 px-3 text-xs text-white/80 sm:w-64"
                />
                <label className="flex items-center gap-2">
                  <span>Year</span>
                  <select
                    className="h-9 rounded border border-neonGreen/30 bg-black/60 px-2 text-xs text-white/80"
                    value={yearFilter}
                    onChange={(event) => setYearFilter(event.target.value)}
                  >
                    <option value="ALL">All</option>
                    <option value="FE">FE</option>
                    <option value="SE">SE</option>
                    <option value="TE">TE</option>
                    <option value="BE">BE</option>
                  </select>
                </label>
                <label className="flex items-center gap-2">
                  <span>Branch</span>
                  <select
                    className="h-9 rounded border border-neonGreen/30 bg-black/60 px-2 text-xs text-white/80"
                    value={branchFilter}
                    onChange={(event) => setBranchFilter(event.target.value)}
                  >
                    <option value="ALL">All</option>
                    <option value="AI&DS">AI&DS</option>
                    <option value="AIML">AIML</option>
                    <option value="IOT">IOT</option>
                    <option value="COMP">COMP</option>
                    <option value="MECH">MECH</option>
                    <option value="ELECT">ELECT</option>
                  </select>
                </label>
              </div>
              <div className="space-y-4 lg:hidden">
                {groupedRows.map((group) => (
                  <Fragment key={`${group.year}-${group.branch}-cards`}>
                    <div className="rounded-md border border-neonGreen/30 bg-black/60 px-4 py-2 text-xs uppercase tracking-[0.28em] text-neonGreen/70">
                      {group.year} / {group.branch}
                    </div>
                    {group.items.map((participant) => (
                      <div key={participant.id} className="rounded-lg border border-white/10 bg-black/50 p-4">
                        <div className="text-sm text-white/90">{participant.name}</div>
                        <div className="mt-1 text-xs text-white/60">{participant.email}</div>
                        <div className="mt-2 flex items-center gap-3 text-xs text-white/70">
                          Profile:
                          {participant.linkedinUrl ? (
                            <a
                              href={participant.linkedinUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-neonBlue/80 hover:text-neonGreen"
                              aria-label="Open LinkedIn"
                            >
                              <LinkedInIcon className="h-4 w-4" />
                            </a>
                          ) : (
                            <span className="text-white/20" aria-hidden="true">
                              <LinkedInIcon className="h-4 w-4" />
                            </span>
                          )}
                          {participant.githubUrl ? (
                            <a
                              href={participant.githubUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-neonBlue/80 hover:text-neonGreen"
                              aria-label="Open GitHub"
                            >
                              <GitHubIcon className="h-4 w-4" />
                            </a>
                          ) : (
                            <span className="text-white/20" aria-hidden="true">
                              <GitHubIcon className="h-4 w-4" />
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-white/60">{participant.phone}</div>
                        <div className="mt-2 text-xs text-neonGreen/70">
                          {participant.year} / {participant.branch}
                        </div>
                        <div className="mt-2 text-xs text-white/70">
                          Sealed: {participant.statementId ? `#${participant.statementId}` : "—"}
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-xs text-white/70">
                          Doc:
                          {participant.hasUpload ? (
                            <button
                              type="button"
                              className="text-neonGreen/80 hover:text-neonGreen"
                              onClick={() => downloadUpload(participant.id)}
                              aria-label="Download upload"
                            >
                              ⬇
                            </button>
                          ) : (
                            "—"
                          )}
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={participant.scores.s}
                            onChange={(event) => updateScore(participant.id, "s", event.target.value)}
                            className="h-9 bg-black/60 text-xs"
                            placeholder="S"
                          />
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={participant.scores.p}
                            onChange={(event) => updateScore(participant.id, "p", event.target.value)}
                            className="h-9 bg-black/60 text-xs"
                            placeholder="P"
                          />
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={participant.scores.d}
                            onChange={(event) => updateScore(participant.id, "d", event.target.value)}
                            className="h-9 bg-black/60 text-xs"
                            placeholder="D"
                          />
                        </div>
                        <div className="mt-3 text-xs text-white/70">
                          Status: {participant.reviewStatus}
                        </div>
                        <label className="mt-2 flex items-center gap-2 text-xs text-white/70">
                          <input
                            type="checkbox"
                            checked={participant.interviewDone}
                            onChange={(event) => toggleInterviewDone(participant.id, event.target.checked)}
                          />
                          Interview Done
                        </label>
                        {!participant.isApproved && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              type="button"
                              className="px-4 py-2"
                              onClick={() => submitReview(participant.id, "APPROVED", participant.name)}
                            >
                              Approve
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              className="px-4 py-2"
                              onClick={() => submitReview(participant.id, "REJECTED", participant.name)}
                            >
                              Reject
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              className="px-4 py-2 text-red-300"
                              onClick={() => deleteParticipant(participant.id, participant.name)}
                            >
                              🗑 Delete
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </Fragment>
                ))}
                {groupedRows.length === 0 && (
                  <div className="rounded-md border border-white/10 bg-black/40 px-4 py-6 text-center text-white/50">
                    No participants yet.
                  </div>
                )}
              </div>
              <table className="hidden w-full min-w-[1020px] border-separate border-spacing-y-3 text-sm text-white/80 lg:table">
                <thead className="text-left text-xs uppercase tracking-[0.25em] text-white/50">
                  <tr>
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Email</th>
                    <th className="py-2 pr-4">Profile</th>
                    <th className="py-2 pr-4">Phone</th>
                    <th className="py-2 pr-4">Year</th>
                    <th className="py-2 pr-4">Branch</th>
                    <th className="py-2 pr-4">Sealed</th>
                    <th className="py-2 pr-4">Doc</th>
                    <th className="py-2 pr-4">S</th>
                    <th className="py-2 pr-4">P</th>
                    <th className="py-2 pr-4">D</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Interview</th>
                    <th className="py-2 pr-4">Action</th>
                    <th className="py-2 pr-4">Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedRows.map((group) => (
                    <Fragment key={`${group.year}-${group.branch}`}>
                      <tr className="bg-black/60">
                        <td colSpan={15} className="rounded-md px-3 py-2 text-xs uppercase tracking-[0.28em] text-neonGreen/70">
                          {group.year} / {group.branch}
                        </td>
                      </tr>
                      {group.items.map((participant) => (
                        <tr key={participant.id} className="bg-black/40">
                          <td className="rounded-l-md px-3 py-3">{participant.name}</td>
                          <td className="px-3 py-3">{participant.email}</td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-3">
                              {participant.linkedinUrl ? (
                                <a
                                  href={participant.linkedinUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-neonBlue/80 hover:text-neonGreen"
                                  aria-label="Open LinkedIn"
                                >
                                  <LinkedInIcon className="h-5 w-5" />
                                </a>
                              ) : (
                                <span className="text-white/20" aria-hidden="true">
                                  <LinkedInIcon className="h-5 w-5" />
                                </span>
                              )}
                              {participant.githubUrl ? (
                                <a
                                  href={participant.githubUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-neonBlue/80 hover:text-neonGreen"
                                  aria-label="Open GitHub"
                                >
                                  <GitHubIcon className="h-5 w-5" />
                                </a>
                              ) : (
                                <span className="text-white/20" aria-hidden="true">
                                  <GitHubIcon className="h-5 w-5" />
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-3">{participant.phone}</td>
                          <td className="px-3 py-3">{participant.year}</td>
                          <td className="px-3 py-3">{participant.branch}</td>
                          <td className="px-3 py-3">
                            {participant.statementId ? `#${participant.statementId}` : "—"}
                          </td>
                          <td className="px-3 py-3">
                            {participant.hasUpload ? (
                              <button
                                type="button"
                                className="text-neonGreen/80 hover:text-neonGreen"
                                onClick={() => downloadUpload(participant.id)}
                                aria-label="Download upload"
                              >
                                ⬇
                              </button>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              value={participant.scores.s}
                              onChange={(event) => updateScore(participant.id, "s", event.target.value)}
                              className="h-9 w-16 bg-black/60"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              value={participant.scores.p}
                              onChange={(event) => updateScore(participant.id, "p", event.target.value)}
                              className="h-9 w-16 bg-black/60"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              value={participant.scores.d}
                              onChange={(event) => updateScore(participant.id, "d", event.target.value)}
                              className="h-9 w-16 bg-black/60"
                            />
                          </td>
                          <td className="px-3 py-3 text-xs">{participant.reviewStatus}</td>
                          <td className="px-3 py-3">
                            <input
                              type="checkbox"
                              checked={participant.interviewDone}
                              onChange={(event) => toggleInterviewDone(participant.id, event.target.checked)}
                            />
                          </td>
                          <td className="px-3 py-3">
                            {!participant.isApproved && (
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  className="px-4 py-2"
                                  onClick={() => submitReview(participant.id, "APPROVED", participant.name)}
                                >
                                  Approve
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="px-4 py-2"
                                  onClick={() => submitReview(participant.id, "REJECTED", participant.name)}
                                >
                                  Reject
                                </Button>
                              </div>
                            )}
                            {participant.isApproved && (
                              <span className="text-neonGreen/70">Approved</span>
                            )}
                          </td>
                          <td className="rounded-r-md px-3 py-3">
                            {!participant.isApproved && (
                              <button
                                type="button"
                                className="text-red-400 hover:text-red-300"
                                onClick={() => deleteParticipant(participant.id, participant.name)}
                                aria-label="Delete participant"
                              >
                                🗑
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                  {groupedRows.length === 0 && (
                    <tr>
                      <td colSpan={15} className="px-3 py-6 text-center text-white/50">
                        No participants yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
