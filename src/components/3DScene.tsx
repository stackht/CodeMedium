"use client"

import { Canvas, useFrame } from "@react-three/fiber"
import { Float, Grid, Points, PointMaterial } from "@react-three/drei"
import { useMemo, useRef } from "react"
import * as THREE from "three"

function MatrixParticles() {
  const pointsRef = useRef<THREE.Points>(null)
  const count = 1200
  const positions = useMemo(() => {
    const data = new Float32Array(count * 3)
    for (let i = 0; i < count; i += 1) {
      data[i * 3] = (Math.random() - 0.5) * 40
      data[i * 3 + 1] = Math.random() * 15
      data[i * 3 + 2] = (Math.random() - 0.5) * 40
    }
    return data
  }, [])

  useFrame((state, delta) => {
    if (!pointsRef.current) return
    pointsRef.current.rotation.y += delta * 0.05
  })

  return (
    <Points ref={pointsRef} positions={positions} stride={3} frustumCulled>
      <PointMaterial
        transparent
        color="#00f0ff"
        size={0.08}
        sizeAttenuation
        depthWrite={false}
      />
    </Points>
  )
}

function ParallaxGroup({ children }: { children: React.ReactNode }) {
  const groupRef = useRef<THREE.Group>(null)
  useFrame(({ mouse }) => {
    if (!groupRef.current) return
    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x,
      mouse.y * 0.25,
      0.05,
    )
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      mouse.x * 0.35,
      0.05,
    )
  })

  return <group ref={groupRef}>{children}</group>
}

export default function ThreeDScene() {
  return (
    <div className="absolute inset-0 -z-10">
      <Canvas camera={{ position: [0, 6, 16], fov: 55 }} dpr={[0.6, 1.0]} gl={{ antialias: false, powerPreference: "low-power" }}>
        <color attach="background" args={["#000000"]} />
        <fog attach="fog" args={["#000000", 10, 35]} />
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 12, 10]} intensity={1.0} color="#00f0ff" />
        <pointLight position={[-10, 8, -10]} intensity={0.6} color="#39ff14" />

        <ParallaxGroup>
          <Float speed={2} rotationIntensity={0.6} floatIntensity={0.5}>
            <MatrixParticles />
          </Float>
          <Grid
            position={[0, -2, 0]}
            args={[40, 40]}
            cellSize={1}
            cellThickness={0.6}
            cellColor="#0b2233"
            sectionSize={4}
            sectionThickness={1.2}
            sectionColor="#00f0ff"
            fadeDistance={25}
            fadeStrength={3}
            infiniteGrid
          />
        </ParallaxGroup>
      </Canvas>
    </div>
  )
}
