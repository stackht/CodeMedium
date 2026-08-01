"use client"

import { Suspense, useRef } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { EffectComposer, Bloom, DepthOfField, Noise, Vignette } from "@react-three/postprocessing"
import { Html, useProgress } from "@react-three/drei"
import { Physics } from "@react-three/rapier"
import CameraController from "./CameraController"
import LightingSetup from "./LightingSetup"
import Model from "./Model"
import FloatingObjects from "./FloatingObjects"
import UIOverlay from "./UIOverlay"
import * as THREE from "three"

function HaloRing() {
  const ringRef = useRef<THREE.Mesh>(null)

  useFrame(() => {
    if (ringRef.current) {
      ringRef.current.rotation.z += 0.002
    }
  })

  return (
    <mesh
      ref={ringRef}
      position={[2.2, 0.5, -1.6]}
      rotation={[0.2, 0, 0]}
    >
      <torusGeometry args={[2.2, 0.08, 16, 100]} />
      <meshStandardMaterial
        color="#b6ff00"
        emissive="#b6ff00"
        emissiveIntensity={1.2}
        roughness={0.2}
        metalness={0.7}
      />
    </mesh>
  )
}

function Loader() {
  const { progress } = useProgress()
  return (
    <Html center>
      <div className="glass-panel w-64 rounded-2xl p-4 text-center text-white/70">
        <div className="text-xs uppercase tracking-[0.3em] text-neonGreen/80">
          Syncing Reality
        </div>
        <div className="mt-4 h-2 rounded-sm bg-white/10">
          <div
            className="h-2 rounded-sm bg-neonGreen"
            style={{ width: `${progress.toFixed(0)}%` }}
          />
        </div>
      </div>
    </Html>
  )
}

export default function Hero3DScene() {
  const scrollRef = useRef(0)
  const hoveredRef = useRef(false)

  return (
    <section id="hero-3d" className="relative min-h-screen overflow-hidden bg-black">
      <div className="noise-overlay absolute inset-0 opacity-20" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(0,255,0,0.16),transparent_40%),radial-gradient(circle_at_70%_0%,rgba(0,229,255,0.16),transparent_45%)]" />
      <div className="hero-frame">
        <div className="hero-grid" />
        <div className="scanlines" />
      </div>
      <div className="absolute inset-[5vh_4vw] rounded-[4px] overflow-hidden">
        <Canvas
          camera={{ position: [0, 0, 8], fov: 45 }}
          dpr={[0.6, 1.0]}
          gl={{ antialias: false, powerPreference: "low-power" }}
          className="h-full w-full"
        >
          <Suspense fallback={<Loader />}>
            <CameraController scrollRef={scrollRef} hoveredRef={hoveredRef} />
            <LightingSetup />
            <Physics gravity={[0, -0.2, 0]}>
              <Model />
              <HaloRing />
              <FloatingObjects />
            </Physics>
            <EffectComposer>
              <Bloom intensity={0.5} luminanceThreshold={0.3} mipmapBlur />
              <Noise opacity={0.04} />
              <Vignette eskil={false} offset={0.2} darkness={0.6} />
            </EffectComposer>
          </Suspense>
        </Canvas>
        <UIOverlay />
      </div>
    </section>
  )
}
