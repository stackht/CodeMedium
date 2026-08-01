"use client"

import { useMemo, useRef, useState, useLayoutEffect, useEffect } from "react"
import { useCursor, useGLTF } from "@react-three/drei"
import { DRACOLoader, KTX2Loader } from "three-stdlib"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"

const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath("/draco/")

type Props = {
  scrollRef: React.MutableRefObject<number>
  hoveredRef: React.MutableRefObject<boolean>
  centered?: boolean
  rotateRef?: React.MutableRefObject<number>
}

export default function CharacterModel({
  scrollRef,
  hoveredRef,
  centered = false,
  rotateRef,
}: Props) {
  const groupRef = useRef<THREE.Group>(null)
  const { size } = useThree()
  const hasInitialized = useRef(false)
  const isSmall = size.width < 900
  const isMobile = size.width < 640
  const basePosition = useMemo(
    () =>
      centered
        ? new THREE.Vector3(
            isMobile ? 0.9 : isSmall ? 1.6 : 2.8,
            isSmall ? 0.1 : -0.2,
            0,
          )
        : new THREE.Vector3(3.2, -1.1, 0),
    [centered, isMobile, isSmall],
  )
  const modelScale = centered ? (isSmall ? 1.5 : 1.8) : 0.42
  const emissiveMaterials = useRef<THREE.MeshStandardMaterial[]>([])
  const emissiveBase = useRef(new Map<THREE.MeshStandardMaterial, number>())
  const { gl } = useThree()
  const ktx2Loader = useMemo(() => {
    const loader = new KTX2Loader()
    loader.setTranscoderPath("/basis/")
    loader.detectSupport(gl)
    return loader
  }, [gl])

  const { scene } = useGLTF(
    "/models/scene.gltf",
    true,
    undefined,
    (loader) => {
      loader.setDRACOLoader(dracoLoader)
      loader.setKTX2Loader(ktx2Loader)
      loader.manager.setURLModifier((url) => {
        if (url.includes("Assets/Models/")) return url.replace("Assets/Models/", "models/")
        return url
      })
    },
  )

  const [hovered, setHovered] = useState(false)
  useCursor(hovered)

  useLayoutEffect(() => {
    emissiveMaterials.current = []
    emissiveBase.current.clear()
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true
        child.receiveShadow = true
        const material = child.material
        if (material && "emissive" in material) {
          const mat = material as THREE.MeshStandardMaterial
          emissiveMaterials.current.push(mat)
          emissiveBase.current.set(mat, mat.emissiveIntensity ?? 0)
        }
      }
    })

    // Center the model so rotations happen around its own pivot.
    if (!scene.userData.__centered) {
      scene.updateMatrixWorld(true)
      const box = new THREE.Box3().setFromObject(scene)
      const center = box.getCenter(new THREE.Vector3())
      scene.position.set(-center.x, -center.y, -center.z)
      scene.userData.__centered = true
    }
  }, [scene])

  useEffect(() => {
    if (!groupRef.current) return
    hasInitialized.current = false
    groupRef.current.position.set(basePosition.x, basePosition.y - (centered ? 0.2 : 0), 0)
    groupRef.current.scale.setScalar(modelScale)
    groupRef.current.rotation.set(0, rotateRef?.current ?? 0, 0)
  }, [basePosition, centered, modelScale, rotateRef])

  useFrame((_, delta) => {
    if (!groupRef.current) return
    const step = Math.min(delta * 8, 1)
    const targetScale = hovered ? modelScale * 1.02 : modelScale

    groupRef.current.position.set(basePosition.x, basePosition.y - (centered ? 0.2 : 0), basePosition.z)
    groupRef.current.scale.setScalar(THREE.MathUtils.lerp(groupRef.current.scale.x, targetScale, step))
    const targetRotY = rotateRef?.current ?? 0
    groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotY, 0.12)
    groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, 0.2)

    for (let i = 0; i < emissiveMaterials.current.length; i++) {
      const mat = emissiveMaterials.current[i]
      const base = emissiveBase.current.get(mat) ?? 0
      mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity ?? base, base, 0.2)
    }
  })

  return (
    <group
      ref={groupRef}
      onPointerOver={() => {
        hoveredRef.current = true
        setHovered(true)
      }}
      onPointerOut={() => {
        hoveredRef.current = false
        setHovered(false)
      }}
      position={[basePosition.x, basePosition.y - (centered ? 0.2 : 0), 0]}
    >
      <primitive object={scene} />
    </group>
  )
}

useGLTF.preload("/models/scene.gltf")
