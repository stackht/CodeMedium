"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "../../../components/ui/button"

function useTypewriter(text: string, speed: number = 25) {
  const [displayed, setDisplayed] = useState("")
  const [done, setDone] = useState(false)
  useEffect(() => {
    setDisplayed("")
    setDone(false)
    let i = 0
    const t = setInterval(() => {
      i++
      setDisplayed(text.slice(0, i))
      if (i >= text.length) { clearInterval(t); setDone(true) }
    }, speed)
    return () => clearInterval(t)
  }, [text, speed])
  return { displayed, done }
}

function StatusBar() {
  const [time, setTime] = useState("")
  useEffect(() => {
    const t = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between px-5 py-2 text-[9px] uppercase tracking-[0.2em] text-[#d8ffd2]/30 bg-[#020604]/80 border-t border-[#39ff14]/10">
      <span>SYS://ADMIN_TERMINAL</span>
      <span className="flex items-center gap-3">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#39ff14] shadow-[0_0_6px_rgba(57,255,20,0.6)]" />
          SECURE
        </span>
        <span>{time}</span>
      </span>
    </div>
  )
}

function Particles() {
  const [parts, setParts] = useState<React.ReactNode[]>([])
  useEffect(() => {
    const rng = () => Math.random()
    setParts(
      Array.from({ length: 15 }).map((_, i) => (
        <div key={i} className="absolute w-1 h-1 rounded-full bg-[#39ff14]/30"
          style={{
            left: `${rng() * 100}%`,
            top: `${rng() * 100}%`,
            animation: `cmParticleFloat ${8 + rng() * 10}s linear infinite`,
            animationDelay: `${rng() * 8}s`,
          }}
        />
      ))
    )
  }, [])
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {parts}
    </div>
  )
}

export default function AdminLoginPage() {
  const router = useRouter()
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || ""
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "granted">("idle")
  const [message, setMessage] = useState("")
  const [booted, setBooted] = useState(false)
  const [bootPhase, setBootPhase] = useState(0)
  const { displayed: subtitle, done: subtitleDone } = useTypewriter("Authenticate to access the command center.", 20)
  const [showForm, setShowForm] = useState(false)
  const [grantedPhase, setGrantedPhase] = useState(0)

  const bootLines = [
    "INITIALIZING ADMIN SHELL...",
    "VERIFYING ENCRYPTION KEYS...",
    "ESTABLISHING SECURE CHANNEL...",
  ]

  useEffect(() => {
    const seen = sessionStorage.getItem("cm_admin_booted")
    if (seen) { setBooted(true); setBootPhase(3); setShowForm(true); return }
    sessionStorage.setItem("cm_admin_booted", "1")
  }, [])

  useEffect(() => {
    if (bootPhase >= bootLines.length) {
      const t = setTimeout(() => { setBooted(true); setShowForm(true) }, 200)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setBootPhase((p) => p + 1), 250 + bootPhase * 150)
    return () => clearTimeout(t)
  }, [bootPhase, bootLines.length])

  useEffect(() => {
    if (status !== "granted") return
    if (grantedPhase >= 3) { router.push("/admin"); return }
    const t = setTimeout(() => setGrantedPhase((p) => p + 1), 350)
    return () => clearTimeout(t)
  }, [status, grantedPhase, router])

  const grantedMsgs = [
    "VERIFYING CREDENTIALS...",
    "ACCESS GRANTED.",
    "REDIRECTING TO WORKSPACE...",
  ]

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (status === "loading") return
    setStatus("loading")
    setMessage("")
    try {
      const response = await fetch(`${apiBase}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || "Login failed.")
      localStorage.setItem("cmd_admin_token", data.token)
      setStatus("granted")
    } catch (error: any) {
      setStatus("error")
      setMessage(error.message || "Login failed.")
    }
  }

  return (
    <main className="min-h-screen bg-[#020604] text-[#d8ffd2] font-mono overflow-hidden relative">
      <div className="cm-crt" aria-hidden="true" />
      <div className="cm-noise" aria-hidden="true" />

      {/* Animated background grid */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: "linear-gradient(rgba(57,255,20,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(57,255,20,0.08) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Ambient orbs */}
      <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] aspect-square rounded-full bg-[#39ff14]/5 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] aspect-square rounded-full bg-[#00d9ff]/5 blur-[120px]" />
      </div>

      {/* Floating particles */}
      <Particles />

      {/* Boot overlay */}
      {!booted && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#020604]">
          <div className="text-[10px] uppercase tracking-[0.3em] text-[#39ff14]/70 space-y-3">
            {bootLines.slice(0, bootPhase + 1).map((line, i) => (
              <div key={i} className="animate-pulse" style={{ animationDelay: `${i * 0.2}s` }}>
                <span className="text-[#00d9ff]">&gt;</span> {line}
              </div>
            ))}
          </div>
          <div className="mt-8 w-48 h-[2px] bg-[#39ff14]/10 overflow-hidden">
            <div className="h-full bg-[#39ff14] shadow-[0_0_10px_rgba(57,255,20,0.6)]"
              style={{ width: `${(bootPhase + 1) / bootLines.length * 100}%`, transition: "width 0.3s" }}
            />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className={`relative z-10 flex min-h-screen flex-col items-center justify-center px-5 py-20 transition-opacity duration-500 ${booted ? "opacity-100" : "opacity-0"}`}>
        {/* Terminal header */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-3 text-[9px] uppercase tracking-[0.3em] text-[#39ff14]/50 mb-6">
            <span className="w-8 h-[1px] bg-[#39ff14]/30" />
            <span>RESTRICTED ACCESS</span>
            <span className="w-8 h-[1px] bg-[#39ff14]/30" />
          </div>
          <h1 className="font-orbitron text-5xl sm:text-7xl font-bold tracking-tight leading-none mb-4">
            <span className="text-[#d8ffd2]">Admin</span>{" "}
            <span className="text-[#39ff14] italic glitch-text" data-text="TERMINAL">TERMINAL</span>
          </h1>
          <p className="text-sm text-[#d8ffd2]/50 font-mono h-5">
            {subtitle}<span className={subtitleDone ? "hidden" : "animate-pulse"}>_</span>
          </p>
        </div>

        {/* Login panel */}
        <div className={`w-full max-w-md transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${showForm ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <div className="relative rounded-sm border border-[#39ff14]/15 bg-[rgba(2,6,4,0.7)] backdrop-blur-xl shadow-[0_30px_80px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(57,255,20,0.06)] p-8">
            {/* Top bar decoration */}
            <div className="flex items-center gap-2 pb-5 mb-6 border-b border-[#39ff14]/10">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#39ff14]/60 shadow-[0_0_6px_rgba(57,255,20,0.3)]" />
              <span className="text-[9px] uppercase tracking-[0.25em] text-[#d8ffd2]/40">operator authentication</span>
            </div>

            {status === "granted" ? (
              <div className="space-y-3 text-[10px] uppercase tracking-[0.2em] text-[#39ff14]/80">
                {grantedMsgs.slice(0, grantedPhase + 1).map((msg, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[#00d9ff]">&gt;&gt;</span> {msg}
                  </div>
                ))}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="admin-username" className="text-[9px] uppercase tracking-[0.25em] text-[#d8ffd2]/50">
                    Username<span className="text-[#39ff14]">_</span>
                  </label>
                  <div className="group relative">
                    <div className="absolute inset-0 rounded-sm bg-[#39ff14]/5 opacity-0 group-focus-within:opacity-100 transition-opacity" />
                    <input
                      id="admin-username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      autoComplete="username"
                      className="relative w-full h-12 bg-transparent border-b border-[#39ff14]/25 px-3 text-sm text-[#d8ffd2] outline-none transition-all placeholder:text-[#d8ffd2]/20 focus:border-[#39ff14]/80 focus:shadow-[0_1px_0_rgba(57,255,20,0.3)]"
                      placeholder="root"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="admin-password" className="text-[9px] uppercase tracking-[0.25em] text-[#d8ffd2]/50">
                    Password<span className="text-[#39ff14]">_</span>
                  </label>
                  <div className="group relative">
                    <div className="absolute inset-0 rounded-sm bg-[#39ff14]/5 opacity-0 group-focus-within:opacity-100 transition-opacity" />
                    <input
                      id="admin-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      className="relative w-full h-12 bg-transparent border-b border-[#39ff14]/25 px-3 text-sm text-[#d8ffd2] outline-none transition-all placeholder:text-[#d8ffd2]/20 focus:border-[#39ff14]/80 focus:shadow-[0_1px_0_rgba(57,255,20,0.3)]"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="pt-3 flex flex-col gap-3">
                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className="relative h-12 w-full rounded-sm border border-[#39ff14]/60 bg-[#39ff14]/5 text-[10px] uppercase tracking-[0.3em] text-[#39ff14] transition-all hover:bg-[#39ff14]/10 hover:shadow-[0_0_25px_rgba(57,255,20,0.15)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {status === "loading" ? (
                      <span className="flex items-center justify-center gap-3">
                        <span className="w-1.5 h-1.5 rounded-sm bg-[#39ff14] animate-ping" />
                        AUTHENTICATING...
                      </span>
                    ) : "ENTER WORKSPACE"}
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push("/")}
                    className="text-[9px] uppercase tracking-[0.25em] text-[#d8ffd2]/30 hover:text-[#d8ffd2]/60 transition-colors"
                  >
                    ← Return to site
                  </button>
                </div>

                {status === "error" && (
                  <div className="text-[10px] uppercase tracking-[0.2em] text-red-400/80 text-center pt-2">
                    <span className="text-red-400">!</span> {message}
                  </div>
                )}
              </form>
            )}
          </div>
        </div>

        {/* System info footer */}
        <div className="mt-10 text-[8px] uppercase tracking-[0.25em] text-[#d8ffd2]/20">
          Protected administrative environment • v0.1.0 • 2026
        </div>
      </div>

      <StatusBar />
    </main>
  )
}
