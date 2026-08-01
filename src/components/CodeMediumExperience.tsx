"use client"

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { Float, Html, Line, Sparkles, useProgress } from "@react-three/drei"
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing"
import { motion, type MotionValue, useScroll, useSpring, useTransform } from "framer-motion"
import Lenis from "lenis"
import * as THREE from "three"
import CharacterModel from "./CharacterModel"
import Lighting from "./Lighting"
import FormSection from "./Form"
import CursorGlow from "./CursorGlow"

const disciplines = ["Frontend", "Backend", "AI / ML", "Design", "Research", "Operations"]

const principles = [
  ["01", "Build for reality", "Deployed products, real users, real constraints."],
  ["02", "Learn under pressure", "Short sprints turn knowledge into engineering instinct."],
  ["03", "Think beyond syntax", "Systems, decisions, ownership, and measurable outcomes."],
]

const selection = [
  ["Register", "Tell us who you are and what you want to build."],
  ["Choose", "Pick a problem that deserves your attention."],
  ["Discuss", "Walk us through your thinking, not your credentials."],
  ["Build", "Join a focused crew and ship meaningful work."],
]

const organizers = [
  ["Nihal Mishra", "President", "Sets the club's direction and leads every initiative toward meaningful outcomes.", "/organizers/organizer-1.jpg"],
  ["Hemant Thakur", "Vice President", "Turns strategy into action and keeps teams aligned throughout every build.", "/organizers/organizer-2.jpg"],
  ["Kshitija Khilari", "Organizational Lead", "Coordinates people, timelines, and operations so every session runs smoothly.", "/organizers/organizer-3.jpg"],
  ["Siddhesh Gangurde", "Documentation Lead", "Captures decisions, progress, and knowledge so every project remains clear.", "/organizers/organizer-4.jpg"],
  ["Vedh Pokharkar", "Treasurer", "Manages resources responsibly and keeps the club's plans financially grounded.", "/organizers/organizer-5.jpg"],
  ["Yash Chapekar", "Media Lead", "Shapes the club's visual voice and shares every build with the wider community.", "/organizers/organizer-6.jpg"],
]

function useTypewriter(text: string, speed: number = 50) {
  const [displayed, setDisplayed] = useState("")
  const [done, setDone] = useState(false)

  useEffect(() => {
    setDisplayed("")
    setDone(false)
    let i = 0
    const timer = setInterval(() => {
      i++
      setDisplayed(text.slice(0, i))
      if (i >= text.length) {
        clearInterval(timer)
        setDone(true)
      }
    }, speed)
    return () => clearInterval(timer)
  }, [text, speed])

  return { displayed, done }
}

function GlitchText({ text, className, as: Tag = "span" }: { text: string; className?: string; as?: "span" | "h1" | "h2" | "h3" | "p" | "div" }) {
  const [glitching, setGlitching] = useState(false)

  useEffect(() => {
    const trigger = () => {
      setGlitching(true)
      setTimeout(() => setGlitching(false), 200 + Math.random() * 300)
    }
    const interval = setInterval(trigger, 3000 + Math.random() * 4000)
    return () => clearInterval(interval)
  }, [])

  return (
    <Tag className={`${className} ${glitching ? "glitch-active" : ""}`} data-text={text}>
      {text}
    </Tag>
  )
}

function AnimatedTelemetry() {
  const [vals, setVals] = useState({ temp: "36.8", signal: "87", packets: "1,442" })

  useEffect(() => {
    const tick = () => {
      setVals({
        temp: (36 + Math.random() * 3).toFixed(1),
        signal: (70 + Math.random() * 28).toFixed(0),
        packets: (1200 + Math.random() * 800).toFixed(0),
      })
    }
    const interval = setInterval(tick, 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <>
      <span>CORE_TEMP {vals.temp}°C</span>
      <span>SIGNAL {vals.signal}%</span>
      <span>PKTS {vals.packets}</span>
    </>
  )
}

function FloatingParticles() {
  const parts = useRef<React.ReactElement[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const rng = () => 0.5 + (crypto.getRandomValues(new Uint32Array(1))[0] % 10000) / 20000
    parts.current = Array.from({ length: 20 }).map((_, i) => (
      <div
        key={i}
        className="cm-particle"
        style={{
          left: `${rng() * 100}%`,
          top: `${rng() * 100}%`,
          width: `${2 + rng() * 4}px`,
          height: `${2 + rng() * 4}px`,
          animationDelay: `${rng() * 8}s`,
          animationDuration: `${6 + rng() * 8}s`,
        }}
      />
    ))
    setMounted(true)
  }, [])

  return <div className="cm-floating-particles" aria-hidden="true">{mounted && parts.current}</div>
}

function BootSequence({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState(0)
  const lines = [
    "SYS://CODE_MEDIUM v0.1.0",
    "INITIALIZING SECURE CONNECTION...",
    "ENGINEERING COLLECTIVE // DECRYPT",
  ]

  useEffect(() => {
    const seen = sessionStorage.getItem("cm_booted")
    if (seen) { onComplete(); return }
    sessionStorage.setItem("cm_booted", "1")
  }, [onComplete])

  useEffect(() => {
    if (phase >= lines.length) {
      const timer = setTimeout(onComplete, 150)
      return () => clearTimeout(timer)
    }
    const timer = setTimeout(() => setPhase((p) => p + 1), 120 + phase * 100)
    return () => clearTimeout(timer)
  }, [phase, lines.length, onComplete])

  if (phase >= lines.length) return null

  return (
    <div className="cm-boot" role="status" aria-label="Loading">
      <div className="cm-boot-text cm-boot-glitch">
        {lines.slice(0, phase + 1).map((line, i) => (
          <div key={i} style={{ animationDelay: `${i * 0.15}s` }}>
            <span>{line}</span>
          </div>
        ))}
      </div>
      <div className="cm-boot-bar"><i /></div>
    </div>
  )
}

function MatrixRain() {
  const colsRef = useRef<{ left: string; duration: number; delay: number }[]>([])
  const charsRef = useRef<string>("")

  useEffect(() => {
    if (colsRef.current.length > 0) return
    const count = Math.min(Math.floor(window.innerWidth / 32), 20)
    const newCols: typeof colsRef.current = []
    const rng = (n: number) => Math.floor((((Math.sin(++seed) * 10000) % 1) + 1) * n)
    let seed = Date.now()
    for (let i = 0; i < count; i++) {
      newCols.push({
        left: `${(i / count) * 100}%`,
        duration: 6 + rng(8),
        delay: -rng(10),
      })
    }
    colsRef.current = newCols
    let str = ""
    for (let i = 0; i < 20; i++) {
      str += String.fromCharCode(0x30A0 + rng(96))
    }
    charsRef.current = str
  }, [])

  const cols = colsRef.current
  const chars = charsRef.current

  return (
    <div className="cm-matrix" aria-hidden="true">
      {cols.map((col, i) => (
        <div
          key={i}
          className="cm-matrix-col"
          style={{
            left: col.left,
            "--fall-duration": `${col.duration}s`,
            "--fall-delay": `${col.delay}s`,
          } as React.CSSProperties}
        >
          {chars}
        </div>
      ))}
    </div>
  )
}

function OrganizerCard({
  organizer,
  index,
  progress,
}: {
  organizer: string[]
  index: number
  progress: MotionValue<number>
}) {
  const [name, role, details, photo] = organizer
  const start = 0.06 + index * 0.075
  const end = start + 0.13
  const rotateY = useTransform(progress, [start, end], [180, 0])
  const x = useTransform(progress, [start, end], [(2.5 - index) * 155, 0])
  const y = useTransform(progress, [start, end], [Math.abs(2.5 - index) * 18, 0])
  const rotateZ = useTransform(progress, [start, end], [(index - 2.5) * 5, 0])
  const scale = useTransform(progress, [start, end], [0.86, 1])

  return (
    <motion.article
      className="cm-organizer-card"
      style={{ rotateY, rotateZ, x, y, scale, zIndex: index + 1 }}
    >
      <div className="cm-card-front">
        <div className="cm-card-photo">
          <img src={photo} alt="" loading="lazy" />
          <span>{String(index + 1).padStart(2, "0")} / 06</span>
        </div>
        <div className="cm-card-copy">
          <span>{role}</span>
          <h3>{name}</h3>
          <p>{details}</p>
        </div>
      </div>
      <div className="cm-card-back" aria-hidden="true">
        <span>CM</span>
        <i />
        <b>IDENT<br />PENDING</b>
        <small>ACCESS CARD // {String(index + 1).padStart(2, "0")}</small>
      </div>
    </motion.article>
  )
}

function OrganizersSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  })

  return (
    <section id="organizers" ref={sectionRef} className="cm-organizers">
      <div className="cm-organizers-sticky">
        <div className="cm-section-label"><span>04</span> $ ./organizers --reveal</div>
        <div className="cm-organizers-head">
          <h2>The humans behind<br /><em>the system.</em></h2>
          <p>Six operators. Different disciplines. One shared responsibility: make the room better than we found it.</p>
        </div>
        <div className="cm-card-stage">
          <div className="cm-card-grid">
            {organizers.map((organizer, index) => (
              <OrganizerCard
                key={organizer[0]}
                organizer={organizer}
                index={index}
                progress={scrollYProgress}
              />
            ))}
          </div>
        </div>
        <div className="cm-organizers-progress" aria-hidden="true">
          <motion.i style={{ scaleX: scrollYProgress }} />
          <span>SCROLL TO DECRYPT</span>
        </div>
      </div>
    </section>
  )
}

function SceneLoader() {
  const { progress } = useProgress()
  return (
    <Html center>
      <div className="cm-loader">
        <span>{Math.round(progress).toString().padStart(2, "0")}</span>
        <div><i style={{ width: `${progress}%` }} /></div>
      </div>
    </Html>
  )
}

function SignalField({ scrollRef }: { scrollRef: React.MutableRefObject<number> }) {
  const group = useRef<THREE.Group>(null)
  const points = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const angle = (index / 7) * Math.PI * 2
        return [Math.cos(angle) * 3.7, Math.sin(angle) * 2.4, -1.4] as [number, number, number]
      }),
    [],
  )

  useFrame((state) => {
    if (!group.current) return
    group.current.rotation.z = state.clock.elapsedTime * 0.035
    group.current.rotation.y = scrollRef.current * 0.35
  })

  return (
    <group ref={group} position={[1.8, 0, -1]}>
      <Line points={[...points, points[0]]} color="#39ff14" opacity={0.55} transparent lineWidth={1} />
      {points.map((position, index) => (
        <Float key={index} speed={1 + index * 0.08} rotationIntensity={0.7} floatIntensity={0.4}>
          <mesh position={position}>
            <icosahedronGeometry args={[index % 2 ? 0.12 : 0.2, 1]} />
            <meshStandardMaterial
              color={index % 2 ? "#d8ffd2" : "#39ff14"}
              emissive={index % 2 ? "#00a8ff" : "#39ff14"}
              emissiveIntensity={1.5}
              roughness={0.28}
            />
          </mesh>
        </Float>
      ))}
    </group>
  )
}

function World({ scrollRef }: { scrollRef: React.MutableRefObject<number> }) {
  const hoveredRef = useRef(false)

  return (
    <>
      <fog attach="fog" args={["#020604", 7, 18]} />
      <Lighting hoveredRef={hoveredRef} />
      <CharacterModel scrollRef={scrollRef} hoveredRef={hoveredRef} centered />
      <SignalField scrollRef={scrollRef} />
      <Sparkles count={60} scale={[11, 7, 5]} size={1.2} speed={0.2} color="#70ff65" opacity={0.4} />
      <EffectComposer>
        <Bloom intensity={0.85} luminanceThreshold={0.25} mipmapBlur />
        <Vignette eskil={false} offset={0.15} darkness={0.85} />
      </EffectComposer>
    </>
  )
}

function SectionLabel({ num, cmd }: { num: string; cmd: string }) {
  const [revealed, setRevealed] = useState(false)
  const { displayed, done } = useTypewriter(cmd, 30)

  return (
    <motion.div
      className="cm-section-label"
      onViewportEnter={() => setRevealed(true)}
    >
      <span>{num}</span>
      <span className="cm-terminal-cmd">
        <span className="cm-prompt">$</span>
        <span className="cm-typed">{revealed ? displayed : ""}</span>
        {!done && revealed && <span className="cm-blink-cursor">_</span>}
      </span>
    </motion.div>
  )
}

export default function CodeMediumExperience() {
  const rootRef = useRef<HTMLDivElement>(null)
  const scrollValue = useRef(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [bootComplete, setBootComplete] = useState(false)
  const [navScrolled, setNavScrolled] = useState(false)
  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 24, restDelta: 0.001 })
  const heroY = useTransform(progress, [0, 0.18], ["0%", "22%"])
  const heroOpacity = useTransform(progress, [0, 0.14], [1, 0])

  const { displayed: kickerText, done: kickerDone } = useTypewriter("Engineering collective for people who build", 25)

  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.075, smoothWheel: true })
    let frame = 0
    const raf = (time: number) => {
      lenis.raf(time)
      scrollValue.current = lenis.scroll * 0.0018
      setNavScrolled(lenis.scroll > 80)
      frame = requestAnimationFrame(raf)
    }
    frame = requestAnimationFrame(raf)
    return () => {
      cancelAnimationFrame(frame)
      lenis.destroy()
    }
  }, [])

  const jumpTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })
    setMenuOpen(false)
  }, [])

  return (
    <div ref={rootRef} className="cm-site">
      {!bootComplete && <BootSequence onComplete={() => setBootComplete(true)} />}
      <div className="cm-crt" aria-hidden="true" />
      <div className="cm-scan-beam" aria-hidden="true" />
      <div className="cm-noise" aria-hidden="true" />
      <MatrixRain />
      <CursorGlow />
      <FloatingParticles />
      <motion.div className="cm-progress" style={{ scaleX: progress }} />
      <div className="cm-hacker-grid" aria-hidden="true" />
      <div className="cm-scanlines" aria-hidden="true" />

      <header className={`cm-nav ${navScrolled ? "cm-nav-scrolled" : ""}`}>
        <button className="cm-mark" onClick={() => jumpTo("top")} aria-label="Code Medium home">
          <span>CM</span>
          <small>Code Medium<br />Technical Club</small>
        </button>
        <div className={`cm-nav-links ${menuOpen ? "is-open" : ""}`}>
          <button onClick={() => jumpTo("vision")}>Vision</button>
          <button onClick={() => jumpTo("method")}>Method</button>
          <button onClick={() => jumpTo("organizers")}>Organizers</button>
          <button onClick={() => jumpTo("participate")}>Participate</button>
        </div>
        <button
          className="cm-menu"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
        >
          <span />
          <span />
        </button>
      </header>

      <section id="top" className="cm-hero">
        <div className="cm-telemetry cm-telemetry-left" aria-hidden="true">
          <AnimatedTelemetry />
        </div>
        <div className="cm-telemetry cm-telemetry-right" aria-hidden="true">
          <span>BUILD 2026.07</span>
          <span>MEMBERS 020</span>
          <span className="is-live">LIVE</span>
        </div>
        <div className="cm-scene" aria-hidden="true">
          <Canvas camera={{ position: [0, 0.1, 7.4], fov: 42 }} dpr={[0.8, 1.2]} gl={{ antialias: false, powerPreference: "low-power" }}>
            <Suspense fallback={<SceneLoader />}>
              <World scrollRef={scrollValue} />
            </Suspense>
          </Canvas>
        </div>
        <motion.div className="cm-hero-copy" style={{ y: heroY, opacity: heroOpacity }}>
          <p className="cm-kicker">
            <b>&gt;_</b>{" "}
            <GlitchText text={kickerText} />
            {!kickerDone && <span className="cm-blink-cursor">_</span>}
          </p>
          <h1>
            <span className="cm-hero-line-1">Code</span>
            <span className="cm-hero-line-2">
              <GlitchText text="Medium" as="span" />
              <span className="cm-cursor cm-pulse-cursor">_</span>
            </span>
          </h1>
          <div className="cm-hero-bottom">
            <p>From curious learners to<br />builders of real systems.</p>
            <button className="cm-round-link" onClick={() => jumpTo("vision")} aria-label="Explore">
              <span>↓</span>
            </button>
          </div>
        </motion.div>
        <div className="cm-index">SESSION 0x2026 <span>01 / 05</span></div>
      </section>

      <main className="cm-content">
        <div className="cm-ambient-glow" aria-hidden="true" />

        <section id="vision" className="cm-statement cm-light">
          <SectionLabel num="01" cmd="./ambition --execute" />
          <motion.h2
            initial={{ opacity: 0, y: 70 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-15%" }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          >
            We turn students<br />into <em>system builders.</em>
          </motion.h2>
          <div className="cm-statement-grid">
            <p>Code Medium is a focused engineering ecosystem where ambitious students learn by shipping real products, not by sitting through another presentation.</p>
            <p>We bring together design, development, AI, and research to create work that can survive beyond the classroom.</p>
          </div>
        </section>

        <section id="method" className="cm-principles">
          <SectionLabel num="02" cmd="./method --verbose" />
          <h2>Ideas become<br /><i>working systems.</i></h2>
          <div className="cm-principle-list">
            {principles.map(([number, title, copy], i) => (
              <motion.article
                key={number}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.15, ease: [0.16, 1, 0.3, 1] }}
              >
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </motion.article>
            ))}
          </div>
        </section>

        <section className="cm-marquee" aria-label="Disciplines">
          <div>
            <div className="cm-marquee-track">
              {disciplines.map((item) => (
                <span key={item}>{item}<b>//</b></span>
              ))}
            </div>
            <div className="cm-marquee-track" aria-hidden="true">
              {disciplines.map((item) => (
                <span key={item}>{item}<b>//</b></span>
              ))}
            </div>
          </div>
        </section>

        <section className="cm-selection cm-light">
          <SectionLabel num="03" cmd="./access --request" />
          <div className="cm-selection-head">
            <h2>Mindset over<br />credentials.</h2>
            <p>We are looking for curiosity, resilience, and the urge to make things work.</p>
          </div>
          <div className="cm-selection-list">
            {selection.map(([title, copy], index) => (
              <motion.article
                key={title}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </motion.article>
            ))}
          </div>
        </section>

        <section className="cm-proof">
          <p className="cm-kicker"><b>&gt;_</b> Built by students. Measured by outcomes.</p>
          <h2>20 focused minds.<br />One shared standard.</h2>
          <div className="cm-stats">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0 }}
            >
              <strong>20</strong><span>Core builders</span>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <strong>06</strong><span>Disciplines</span>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <strong>01</strong><span>Goal: ship</span>
            </motion.div>
          </div>
        </section>

        <OrganizersSection />

        <div className="cm-form-shell">
          <FormSection />
        </div>
      </main>

      <footer className="cm-footer">
        <p>Have an idea worth building?</p>
        <button onClick={() => jumpTo("participate")}>Let&apos;s make it real <span>↗</span></button>
        <div><span>Code Medium © 2026</span><span>Build. Break. Innovate.</span></div>
      </footer>
    </div>
  )
}
