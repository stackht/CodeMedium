"use client"

import { Environment } from "@react-three/drei"
import { useFrame } from "@react-three/fiber"
import { useRef } from "react"
import * as THREE from "three"

type Props = {
  hoveredRef: React.MutableRefObject<boolean>
}

export default function Lighting({ hoveredRef }: Props) {
  const rimRef = useRef<THREE.DirectionalLight>(null)
  const fillRef = useRef<THREE.PointLight>(null)

  useFrame(() => {
    if (rimRef.current) {
      rimRef.current.intensity = THREE.MathUtils.lerp(
        rimRef.current.intensity,
        hoveredRef.current ? 2.2 : 1.6,
        0.08,
      )
    }
    if (fillRef.current) {
      fillRef.current.intensity = THREE.MathUtils.lerp(
        fillRef.current.intensity,
        hoveredRef.current ? 0.9 : 0.6,
        0.08,
      )
    }
  })

  return (
    <>
      <ambientLight intensity={0.25} />
      <directionalLight
        ref={rimRef}
        position={[6, 8, 6]}
        intensity={1.6}
        color="#39ff14"
      />
      <pointLight
        ref={fillRef}
        position={[-4, 3, 4]}
        intensity={0.6}
        color="#ffd84d"
      />
      <spotLight
        position={[0, 8, 4]}
        intensity={1.6}
        angle={0.4}
        penumbra={0.6}
        color="#0b6e35"
        castShadow
      />
      <Environment preset="night" />
    </>
  )
}
