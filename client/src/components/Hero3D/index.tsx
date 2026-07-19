import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, useTexture } from '@react-three/drei'
import * as THREE from 'three'

// ── Brand assets ────────────────────────────────────────────────────────────

import logoSymbol from '@/assets/brand/logos/sage-green/Logo - Aromia-03.png'
import logoWordmark from '@/assets/brand/logos/sage-green/Logo - Aromia-01.png'
import brandPattern from '@/assets/brand/patterns/sage-green/Pattern - Aromia.png'

// ═══════════════════════════════════════════════════════════════════════════
// Utilities
// ═══════════════════════════════════════════════════════════════════════════

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl') || canvas.getContext('webgl2'))
  } catch {
    return false
  }
}

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768,
  )

  useEffect(() => {
    let frameId: number
    let lastWidth = window.innerWidth

    const check = () => {
      if (window.innerWidth !== lastWidth) {
        lastWidth = window.innerWidth
        setIsMobile(lastWidth < 768)
      }
      frameId = requestAnimationFrame(check)
    }
    frameId = requestAnimationFrame(check)
    return () => cancelAnimationFrame(frameId)
  }, [])

  return isMobile
}

function useSettings(): Record<string, string> | undefined {
  const { data } = useQuery<Record<string, string>>({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await fetch('/api/settings')
      if (!res.ok) return {}
      return res.json()
    },
    staleTime: 5 * 60_000,
  })
  return data
}

/**
 * Tracks whether the user has scrolled past a threshold so we can
 * fade out the scroll indicator.
 */
function useHasScrolledPast(threshold = 60): boolean {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    let ticking = false
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrolled(window.scrollY > threshold)
          ticking = false
        })
        ticking = true
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    // check initial position
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])

  return scrolled
}

// ═══════════════════════════════════════════════════════════════════════════
// 3D Scene elements
// ═══════════════════════════════════════════════════════════════════════════

/** Floating swirl logo on a transparent double-sided plane */
function LogoPlane() {
  const texture = useTexture(logoSymbol)
  const meshRef = useRef<THREE.Mesh>(null!)

  useFrame((state) => {
    const t = state.clock.elapsedTime
    meshRef.current.rotation.y = t * 0.3
  })

  return (
    <mesh ref={meshRef} scale={[2.8, 2.8, 1]}>
      <planeGeometry args={[1, 1]} />
      <meshStandardMaterial
        map={texture}
        transparent
        opacity={0.85}
        roughness={0.35}
        metalness={0.05}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

/** Coffee bean particles floating around the scene */
function CoffeeBeans({ count }: { count: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null!)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const particles = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        pos: new THREE.Vector3(
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 7,
          (Math.random() - 0.5) * 5,
        ),
        rotSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 0.03,
          (Math.random() - 0.5) * 0.03,
          (Math.random() - 0.5) * 0.03,
        ),
        floatSpeed: 0.15 + Math.random() * 0.4,
        floatAmp: 0.08 + Math.random() * 0.25,
        phase: Math.random() * Math.PI * 2,
      })),
    [count],
  )

  useFrame((state) => {
    const t = state.clock.elapsedTime

    for (let i = 0; i < count; i++) {
      const p = particles[i]
      dummy.position.copy(p.pos)
      dummy.position.y += Math.sin(t * p.floatSpeed + p.phase) * p.floatAmp
      dummy.position.x +=
        Math.cos(t * p.floatSpeed * 0.7 + p.phase) * p.floatAmp * 0.3
      dummy.rotation.x += p.rotSpeed.x
      dummy.rotation.y += p.rotSpeed.y
      dummy.rotation.z += p.rotSpeed.z
      dummy.scale.setScalar(0.12 + Math.sin(t * 0.6 + p.phase) * 0.04)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <icosahedronGeometry args={[0.07, 1]} />
      <meshStandardMaterial color="#4a3728" roughness={0.8} metalness={0.05} />
    </instancedMesh>
  )
}

/** Rising steam particles with additive blending */
function Steam({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null!)
  const speeds = useMemo(
    () => Array.from({ length: count }, () => 0.08 + Math.random() * 0.25),
    [count],
  )
  const baseX = useMemo(
    () => Array.from({ length: count }, () => (Math.random() - 0.5) * 3),
    [count],
  )
  const baseZ = useMemo(
    () => Array.from({ length: count }, () => Math.random() * 1.5),
    [count],
  )
  const phases = useMemo(
    () => Array.from({ length: count }, () => Math.random() * Math.PI * 2),
    [count],
  )

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      arr[i * 3] = baseX[i]
      arr[i * 3 + 1] = -1.5 + Math.random() * 3
      arr[i * 3 + 2] = baseZ[i]
    }
    return arr
  }, [count, baseX, baseZ])

  useEffect(() => {
    ref.current.geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3),
    )
  }, [positions])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const attr = ref.current.geometry.getAttribute(
      'position',
    ) as THREE.BufferAttribute
    const arr = attr.array as Float32Array

    for (let i = 0; i < count; i++) {
      const y = (-1.5 + ((t * speeds[i] + phases[i]) % 3.5))
      arr[i * 3] = baseX[i] + Math.sin(t * 0.4 + i) * 0.15
      arr[i * 3 + 1] = y
      arr[i * 3 + 2] = baseZ[i]
    }
    attr.needsUpdate = true
  })

  return (
    <points ref={ref}>
      <bufferGeometry />
      <pointsMaterial
        size={0.12}
        color="#ffffff"
        transparent
        opacity={0.12}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}

/** Slow-rising sage-coloured atmospheric dust */
function SageDust({ count }: { count: number }) {
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count * 3; i += 3) {
      arr[i] = (Math.random() - 0.5) * 14
      arr[i + 1] = (Math.random() - 0.5) * 10
      arr[i + 2] = -(1 + Math.random() * 5)
    }
    return arr
  }, [count])

  const ref = useRef<THREE.Points>(null!)

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const attr = ref.current.geometry.getAttribute(
      'position',
    ) as THREE.BufferAttribute
    const arr = attr.array as Float32Array

    for (let i = 0; i < count; i++) {
      const idx = i * 3
      arr[idx + 1] += 0.001
      arr[idx] += Math.sin(t * 0.3 + i) * 0.0005
      if (arr[idx + 1] > 5) arr[idx + 1] = -5
    }
    attr.needsUpdate = true
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.025}
        color="#7A8C5C"
        transparent
        opacity={0.35}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Scene composition
// ═══════════════════════════════════════════════════════════════════════════

interface SceneProps {
  isMobile: boolean
}

function Scene({ isMobile }: SceneProps) {
  const { camera } = useThree()

  useEffect(() => {
    camera.position.set(0, 0, 5.5)
    camera.lookAt(0, 0, 0)
  }, [camera])

  const beanCount = isMobile ? 12 : 60
  const steamCount = isMobile ? 10 : 35
  const dustCount = isMobile ? 8 : 30

  return (
    <>
      <fog attach="fog" args={['#e6eadb', 4, 14]} />
      <ambientLight intensity={0.45} color="#f5f0e8" />
      <directionalLight
        position={[6, 8, 6]}
        intensity={0.9}
        color="#ffffff"
        castShadow={!isMobile}
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
      />
      <directionalLight position={[-4, 2, -2]} intensity={0.3} color="#d4c9a8" />
      <directionalLight position={[0, -1, 3]} intensity={0.2} color="#7A8C5C" />
      <pointLight
        position={[0, 0, 1.5]}
        intensity={0.4}
        color="#f5f0e8"
        distance={6}
      />

      <LogoPlane />
      <CoffeeBeans count={beanCount} />
      <Steam count={steamCount} />
      <SageDust count={dustCount} />

      <Environment preset="sunset" environmentIntensity={0.15} />
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Fallback layers
// ═══════════════════════════════════════════════════════════════════════════

function LoadingFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-sage-50 to-sage-100">
      <div className="flex flex-col items-center gap-5 animate-pulse">
        <img src={logoSymbol} alt="" className="w-20 h-20 opacity-30" />
        <div className="h-2.5 w-28 rounded-full bg-sage-200" />
      </div>
    </div>
  )
}

function StaticFallback() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-gradient-to-b from-sage-50 via-sage-50 to-sage-100">
      <img
        src={logoWordmark}
        alt="Aromia"
        className="w-56 md:w-80 h-auto drop-shadow-lg"
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// HTML overlay (rendered above the 3D canvas)
// ═══════════════════════════════════════════════════════════════════════════

interface OverlayProps {
  tagline: string | undefined
  isArabic: boolean
  scrollHidden: boolean
}

function Overlay({ tagline, isArabic, scrollHidden }: OverlayProps) {
  const { t } = useTranslation()

  return (
    <div className="absolute inset-0 z-30 pointer-events-none flex flex-col items-center justify-center px-6">
      <img
        src={logoWordmark}
        alt="Aromia"
        className="w-60 sm:w-72 md:w-96 h-auto mb-3 drop-shadow-[0_2px_12px_rgba(0,0,0,0.08)]"
        style={{ imageRendering: 'auto' }}
      />

      {tagline ? (
        <p
          className={[
            'text-sm sm:text-base md:text-lg font-light tracking-[0.15em] uppercase',
            isArabic ? 'font-arabic text-base md:text-lg' : 'font-english',
            'text-sage-600/70 text-center max-w-md',
            'transition-opacity duration-700',
          ].join(' ')}
        >
          {tagline}
        </p>
      ) : null}

      {/* Scroll-down indicator */}
      <div
        className={[
          'absolute bottom-10 start-1/2 -translate-x-1/2 rtl:translate-x-1/2',
          'pointer-events-none flex flex-col items-center gap-2',
          'transition-opacity duration-500',
          scrollHidden ? 'opacity-0' : 'opacity-100',
        ].join(' ')}
      >
        <span
          className={[
            'text-[11px] sm:text-xs font-light tracking-[0.08em] uppercase',
            'text-sage-500/50',
            isArabic ? 'font-arabic' : 'font-english',
          ].join(' ')}
        >
          {t('hero.scrollDown')}
        </span>
        <svg
          width="16"
          height="24"
          viewBox="0 0 16 24"
          fill="none"
          className="animate-bounce"
        >
          <rect
            x="1"
            y="1"
            width="14"
            height="22"
            rx="7"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-sage-400/50"
          />
          <circle
            cx="8"
            cy="9"
            r="2"
            className="text-sage-400/50 animate-pulse fill-current"
          />
        </svg>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Background
// ═══════════════════════════════════════════════════════════════════════════

function Background() {
  return (
    <>
      <div
        className="absolute inset-0 z-0"
        style={{
          background:
            'linear-gradient(175deg, var(--color-sage-50) 0%, var(--color-sage-100) 35%, var(--color-sage-200) 100%)',
        }}
      />
      <div
        className="absolute inset-0 z-0 opacity-[0.04]"
        style={{
          backgroundImage: `url(${brandPattern})`,
          backgroundSize: '300px',
          backgroundRepeat: 'repeat',
        }}
      />
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Exports
// ═══════════════════════════════════════════════════════════════════════════

export interface Hero3DProps {
  /** Override the cafe name (defaults to Aromia logo wordmark) */
  title?: string
  /** Override CTA text */
  ctaText?: string
  /** Override CTA href (default #menu-section) */
  ctaHref?: string
}

/**
 * Full-viewport 3D hero section for Aromia Cafe.
 *
 * Renders a React Three Fiber canvas with:
 * - Floating swirl logo
 * - Coffee bean particles
 * - Steam / mist effect
 * - Sage-coloured atmospheric dust
 *
 * The camera auto-rotates slowly — no user touch/mouse interaction
 * is captured, so scrolling always works on mobile and desktop.
 *
 * HTML overlay displays the brand wordmark, tagline, and a
 * bilingual scroll-down indicator that fades on first scroll.
 *
 * On mobile the particle counts are reduced and pixel-ratio capped.
 * When WebGL is unavailable a static fallback is shown.
 */
export default function Hero3D(_props: Hero3DProps = {}) {
  const { i18n } = useTranslation()
  const isArabic = i18n.language === 'ar'
  const isMobile = useIsMobile()
  const webglOk = useMemo(() => hasWebGL(), [])
  const settings = useSettings()
  const scrollHidden = useHasScrolledPast(40)

  const tagline = isArabic
    ? settings?.tagline_ar || undefined
    : settings?.tagline_en || undefined

  if (!webglOk) {
    return (
      <section className="relative w-full h-screen min-h-[500px] overflow-hidden touch-pan-y">
        <Background />
        <StaticFallback />
        <Overlay tagline={tagline} isArabic={isArabic} scrollHidden={scrollHidden} />
      </section>
    )
  }

  return (
    <section className="relative w-full h-screen min-h-[500px] overflow-hidden touch-pan-y">
      <Background />

      {/* Canvas wrapper with pointer-events-none so touches pass through */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <Suspense fallback={<LoadingFallback />}>
          <Canvas
            dpr={isMobile ? [1, 1.5] : [1, 2]}
            gl={{
              antialias: !isMobile,
              powerPreference: 'high-performance',
              alpha: true,
              stencil: false,
              depth: true,
            }}
            camera={{ position: [0, 0, 5.5], fov: 50, near: 0.5, far: 20 }}
            style={{ background: 'transparent' }}
          >
            <Scene isMobile={isMobile} />
          </Canvas>
        </Suspense>
      </div>

      <Overlay tagline={tagline} isArabic={isArabic} scrollHidden={scrollHidden} />
    </section>
  )
}
