"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useDispatch, useSelector } from "react-redux"
import { motion } from "framer-motion"
import gsap from "gsap"
import type { RootState, AppDispatch } from "../lib/store"
import { resetForm, setStatus, updateField } from "../lib/features/formSlice"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"

export default function FormSection() {
  const dispatch = useDispatch<AppDispatch>()
  const {
    name,
    email,
    identifier,
    phone,
    year,
    branch,
    otp,
    username,
    password,
    status,
  } = useSelector(
    (state: RootState) => state.form,
  )
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const [mode, setMode] = useState<"register" | "login">("register")
  const [step, setStep] = useState<"details" | "otp" | "credentials" | "done">("details")
  const [message, setMessage] = useState("")
  const [showRegisterPassword, setShowRegisterPassword] = useState(false)
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const router = useRouter()
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || ""

  const EyeIcon = ({ className }: { className?: string }) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )

  const EyeOffIcon = ({ className }: { className?: string }) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
      <path d="M9.9 4.2A10.1 10.1 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-4.3 5.2" />
      <path d="M6.6 6.6A17.2 17.2 0 0 0 2 12s3.5 7 10 7c1.6 0 3-.3 4.2-.8" />
      <path d="M2 2l20 20" />
    </svg>
  )

  useEffect(() => {
    if (status === "success" && buttonRef.current) {
      gsap.fromTo(
        buttonRef.current,
        { boxShadow: "0 0 0 rgba(57, 255, 20, 0)" },
        {
          boxShadow: "0 0 30px rgba(57, 255, 20, 0.9)",
          duration: 0.6,
          yoyo: true,
          repeat: 1,
        },
      )
    }
  }, [status])

  const submitDetails = async () => {
    dispatch(setStatus("loading"))
    setMessage("")
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15000)
      const response = await fetch(`${apiBase}/auth/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, year, branch }),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || "Failed to send OTP.")
      dispatch(setStatus("success"))
      setStep("otp")
      setMessage("OTP sent to your email.")
    } catch (error: any) {
      dispatch(setStatus("error"))
      setMessage(error.name === "AbortError" ? "Request timed out." : error.message || "Something went wrong.")
    }
  }

  const submitOtp = async () => {
    dispatch(setStatus("loading"))
    setMessage("")
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15000)
      const response = await fetch(`${apiBase}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || "Invalid OTP.")
      dispatch(setStatus("success"))
      setStep("credentials")
      setMessage("OTP verified. Create your account.")
    } catch (error: any) {
      dispatch(setStatus("error"))
      setMessage(error.name === "AbortError" ? "Request timed out." : error.message || "OTP verification failed.")
    }
  }

  const submitCredentials = async () => {
    dispatch(setStatus("loading"))
    setMessage("")
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15000)
      const response = await fetch(`${apiBase}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, password }),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || "Registration failed.")

      const loginController = new AbortController()
      const loginTimeout = setTimeout(() => loginController.abort(), 15000)
      const loginResponse = await fetch(`${apiBase}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: username, password }),
        signal: loginController.signal,
      })
      clearTimeout(loginTimeout)
      const loginData = await loginResponse.json()
      if (loginResponse.ok && loginData.token) {
        localStorage.setItem("cmd_token", loginData.token)
      }

      dispatch(setStatus("success"))
      setStep("done")
      setMessage("Registration complete. You are now logged in.")
      router.push("/participant")
      dispatch(resetForm())
    } catch (error: any) {
      dispatch(setStatus("error"))
      setMessage(error.name === "AbortError" ? "Request timed out." : error.message || "Registration failed.")
    }
  }

  const submitLogin = async () => {
    dispatch(setStatus("loading"))
    setMessage("")
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15000)
      const response = await fetch(`${apiBase}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || "Login failed.")
      if (data.token) {
        localStorage.setItem("cmd_token", data.token)
      }
      dispatch(setStatus("success"))
      setMessage("Access granted.")
      router.push("/participant")
    } catch (error: any) {
      dispatch(setStatus("error"))
      setMessage(error.name === "AbortError" ? "Request timed out." : error.message || "Login failed.")
    }
  }

  return (
    <section
      id="participate"
      className="terminal-section relative px-4 py-20 section-3d sm:px-6 sm:py-24"
    >
      <div className="mx-auto max-w-6xl">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="terminal-title font-orbitron text-3xl text-neonGreen"
        >
          Participation Form
        </motion.h2>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          onSubmit={(event) => {
            event.preventDefault()
            if (status === "loading") return
            if (mode === "login") {
              submitLogin()
              return
            }
            if (step === "details") {
              submitDetails()
            } else if (step === "otp") {
              submitOtp()
            } else if (step === "credentials") {
              submitCredentials()
            }
          }}
          className="glass-panel relative z-[9999] mt-10 max-w-3xl space-y-6 rounded-3xl p-5 sm:p-8"
        >
          <div className="terminal-tabs inline-flex flex-wrap items-center gap-3">
            <button
              type="button"
              className={`terminal-tab ${mode === "register" ? "terminal-tab-active" : ""}`}
              onClick={() => {
                setMode("register")
                setStep("details")
                setMessage("")
              }}
            >
              Register
            </button>
            <button
              type="button"
              className={`terminal-tab ${mode === "login" ? "terminal-tab-active" : ""}`}
              onClick={() => {
                setMode("login")
                setMessage("")
              }}
            >
              Login
            </button>
          </div>

          {mode === "register" && step === "details" && (
            <>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(event) =>
                      dispatch(updateField({ field: "name", value: event.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="neo@branchbliss.dev"
                    value={email}
                    onChange={(event) =>
                      dispatch(updateField({ field: "email", value: event.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    placeholder="+91 90000 00000"
                    value={phone}
                    onChange={(event) =>
                      dispatch(updateField({ field: "phone", value: event.target.value }))
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="year">Year</Label>
                  <div className="relative">
                    <select
                      id="year"
                      className="h-12 w-full appearance-none rounded-lg border border-neonGreen/15 bg-black/50 px-4 pr-10 text-sm text-[#d8e6d8] shadow-inner shadow-black/70 outline-none transition focus:border-neonGreen/60 focus:ring-2 focus:ring-neonGreen/30"
                      value={year}
                      onChange={(event) =>
                        dispatch(updateField({ field: "year", value: event.target.value }))
                      }
                      required
                    >
                      <option value="" disabled className="bg-[#0b140f] text-[#d8e6d8]">
                        Select year
                      </option>
                      <option value="FE" className="bg-[#0b140f] text-[#d8e6d8]">
                        FE
                      </option>
                      <option value="SE" className="bg-[#0b140f] text-[#d8e6d8]">
                        SE
                      </option>
                      <option value="TE" className="bg-[#0b140f] text-[#d8e6d8]">
                        TE
                      </option>
                      <option value="BE" className="bg-[#0b140f] text-[#d8e6d8]">
                        BE
                      </option>
                    </select>
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-neonGreen/70">
                      ▾
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="branch">Branch</Label>
                  <div className="relative">
                    <select
                      id="branch"
                      className="h-12 w-full appearance-none rounded-lg border border-neonGreen/15 bg-black/50 px-4 pr-10 text-sm text-[#d8e6d8] shadow-inner shadow-black/70 outline-none transition focus:border-neonGreen/60 focus:ring-2 focus:ring-neonGreen/30"
                      value={branch}
                      onChange={(event) =>
                        dispatch(updateField({ field: "branch", value: event.target.value }))
                      }
                      required
                    >
                      <option value="" disabled className="bg-[#0b140f] text-[#d8e6d8]">
                        Select branch
                      </option>
                      <option value="AI&DS" className="bg-[#0b140f] text-[#d8e6d8]">
                        AI&DS
                      </option>
                      <option value="AIML" className="bg-[#0b140f] text-[#d8e6d8]">
                        AIML
                      </option>
                      <option value="IOT" className="bg-[#0b140f] text-[#d8e6d8]">
                        IOT
                      </option>
                      <option value="COMP" className="bg-[#0b140f] text-[#d8e6d8]">
                        COMP
                      </option>
                      <option value="MECH" className="bg-[#0b140f] text-[#d8e6d8]">
                        MECH
                      </option>
                      <option value="ELECT" className="bg-[#0b140f] text-[#d8e6d8]">
                        ELECT
                      </option>
                    </select>
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-neonGreen/70">
                      ▾
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {mode === "login" && (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="identifier">Username or Email</Label>
                <Input
                  id="identifier"
                  placeholder="$cmd_user or email"
                  value={identifier}
                  onChange={(event) =>
                    dispatch(updateField({ field: "identifier", value: event.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="login-password">Password</Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showLoginPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    className="pr-12"
                    onChange={(event) =>
                      dispatch(updateField({ field: "password", value: event.target.value }))
                    }
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-sm p-2 text-neonGreen/70 hover:text-neonGreen focus:outline-none focus:ring-2 focus:ring-neonGreen/40"
                    aria-label={showLoginPassword ? "Hide password" : "Show password"}
                  >
                    {showLoginPassword ? (
                      <EyeOffIcon className="h-4 w-4" />
                    ) : (
                      <EyeIcon className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {mode === "register" && step === "otp" && (
            <div className="space-y-2">
              <Label htmlFor="otp">Enter OTP</Label>
              <Input
                id="otp"
                placeholder="6-digit OTP"
                value={otp}
                onChange={(event) =>
                  dispatch(updateField({ field: "otp", value: event.target.value }))
                }
                required
              />
            </div>
          )}

          {mode === "register" && step === "credentials" && (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="username">Create Username</Label>
                <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white/80 shadow-inner shadow-black/60 focus-within:border-neonGreen/60 focus-within:ring-2 focus-within:ring-neonGreen/30">
                  <span className="text-neonGreen/80">$</span>
                  <input
                    id="username"
                    className="h-12 w-full bg-transparent outline-none"
                    placeholder="cmd_user"
                    value={username.replace(/^\$/, "")}
                    onChange={(event) => {
                      const raw = event.target.value.replace(/^\$/, "")
                      dispatch(updateField({ field: "username", value: `$${raw}` }))
                    }}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Create Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showRegisterPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    className="pr-12"
                    onChange={(event) =>
                      dispatch(updateField({ field: "password", value: event.target.value }))
                    }
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegisterPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-sm p-2 text-neonGreen/70 hover:text-neonGreen focus:outline-none focus:ring-2 focus:ring-neonGreen/40"
                    aria-label={showRegisterPassword ? "Hide password" : "Show password"}
                  >
                    {showRegisterPassword ? (
                      <EyeOffIcon className="h-4 w-4" />
                    ) : (
                      <EyeIcon className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {mode === "register" && step === "done" && (
            <div className="text-sm text-white/70">
              Registration complete and session saved locally.
            </div>
          )}

          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <Button ref={buttonRef} type="submit" className="w-full min-w-[220px] sm:w-auto">
              {status === "loading" && (
                <span className="absolute right-4 h-3 w-3 animate-ping rounded-sm bg-neonGreen/80" />
              )}
              {status === "loading"
                ? "Transmitting..."
                : mode === "login"
                  ? "Login"
                  : step === "details"
                    ? "Send OTP"
                    : step === "otp"
                      ? "Verify OTP"
                      : step === "credentials"
                        ? "Create Account"
                        : "Done"}
            </Button>
            <div className="text-xs uppercase tracking-[0.3em] text-white/40">
              {status === "loading" && "Encrypting submission..."}
              {status === "error" && message}
              {status === "success" && message}
              {status === "idle" && (message || "Secure, encrypted channel.")}
            </div>
          </div>
        </motion.form>
      </div>

    </section>
  )
}









