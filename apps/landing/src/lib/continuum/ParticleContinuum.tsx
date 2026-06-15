import { Component, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStage } from '../stage'
import { acquireContext, releaseContext } from '../webgl/contextRegistry'
import { createContinuumSimulation, type ContinuumSimulation } from './simulation'
import { buildContinuumPoints, type ContinuumPoints } from './renderPoints'
import { getContinuumQuality, shouldMountContinuum } from './continuumRuntime'
import { loadContinuumTargetTexture } from './forms/proceduralTargets'
import { getContinuumForm } from './forms/registry'
import { useContinuumScroll } from './useContinuumScroll'
import type { ContinuumScrollState } from './continuumScrollState'
import { getContinuumFrameloop, shouldRunContinuumFrame } from './continuumRuntimeMode'

interface ContinuumBundle {
  simulation: ContinuumSimulation
  points: ContinuumPoints
}

class ContinuumErrorBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error) {
    console.warn('[ParticleContinuum] canvas error:', error.message)
    this.props.onError()
  }

  render() {
    if (this.state.failed) return null
    return this.props.children
  }
}

function ContinuumContextRegistration() {
  useEffect(() => {
    acquireContext()
    return () => releaseContext()
  }, [])

  return null
}

function ContinuumScene({
  quality,
  scrollState,
  shouldRun,
}: {
  quality: ReturnType<typeof getContinuumQuality>
  scrollState: ContinuumScrollState
  shouldRun: boolean
}) {
  const { gl, viewport } = useThree()
  const portrait = getContinuumForm('portrait')
  const tint = useMemo(() => new THREE.Color(scrollState.tint), [scrollState.tint])
  const renderedTint = useRef(new THREE.Color(scrollState.tint))
  const renderedOpacity = useRef(0)
  const renderedPointScale = useRef(scrollState.pointScale)
  const basePointSize = quality.pointSize * quality.dprMax

  const bundle = useMemo<ContinuumBundle | null>(() => {
    try {
      const simulation = createContinuumSimulation({
        renderer: gl,
        texSize: quality.particleTexSize,
        radius: 1.18,
      })
      const points = buildContinuumPoints({
        texSize: quality.particleTexSize,
        pointSize: basePointSize,
        tint: portrait.tint,
        blending: THREE.AdditiveBlending,
      })

      points.setPositionTexture(simulation.positionTexture)
      points.setTargetTextures(simulation.fromTargetTexture, simulation.toTargetTexture, 0)
      points.setOpacity(0)
      return { simulation, points }
    } catch (error) {
      console.warn('[ParticleContinuum] simulation init failed:', error)
      return null
    }
  }, [basePointSize, gl, quality.particleTexSize, portrait.tint])

  useEffect(() => {
    return () => {
      bundle?.simulation.dispose()
      bundle?.points.dispose()
    }
  }, [bundle])

  useFrame((_, delta) => {
    if (!bundle || !shouldRun) return
    const transitionAlpha = 1 - Math.exp(-delta * 1.65)
    renderedTint.current.lerp(tint, transitionAlpha)
    renderedOpacity.current += (scrollState.opacity - renderedOpacity.current) * transitionAlpha
    renderedPointScale.current += (scrollState.pointScale - renderedPointScale.current) * transitionAlpha
    bundle.points.setTint(renderedTint.current)
    bundle.points.setOpacity(renderedOpacity.current)
    bundle.points.setPointSize(basePointSize * renderedPointScale.current)
    bundle.points.setBlending(scrollState.blendMode === 'normal' ? THREE.NormalBlending : THREE.AdditiveBlending)

    bundle.points.setTargetTextures(bundle.simulation.fromTargetTexture, bundle.simulation.toTargetTexture, scrollState.morph)
    const positionTexture = bundle.simulation.compute(delta, scrollState.behavior, scrollState.morph)
    bundle.points.setPositionTexture(positionTexture)
    bundle.points.points.position.set(
      viewport.width * scrollState.xOffsetRatio,
      scrollState.yOffset,
      0,
    )
  })

  useEffect(() => {
    if (!bundle) return
    let cancelled = false

    const loadTargets = async () => {
      if (scrollState.fromFormId === scrollState.toFormId) {
        const texture = await loadContinuumTargetTexture(scrollState.fromFormId, quality.particleTexSize)
        return { fromTexture: texture, toTexture: texture }
      }

      const [fromTexture, toTexture] = await Promise.all([
        loadContinuumTargetTexture(scrollState.fromFormId, quality.particleTexSize),
        loadContinuumTargetTexture(scrollState.toFormId, quality.particleTexSize),
      ])
      return { fromTexture, toTexture }
    }

    loadTargets()
      .then(({ fromTexture, toTexture }) => {
        if (cancelled) {
          fromTexture.dispose()
          if (toTexture !== fromTexture) toTexture.dispose()
          return
        }
        bundle.simulation.setTargets(fromTexture, toTexture)
        bundle.points.setTargetTextures(fromTexture, toTexture, 0)
      })
      .catch((error) => {
        console.warn('[ParticleContinuum] target failed:', error)
      })

    return () => {
      cancelled = true
    }
  }, [bundle, quality.particleTexSize, scrollState.fromFormId, scrollState.toFormId])

  if (!bundle) return null
  return <primitive object={bundle.points.points} />
}

export default function ParticleContinuum() {
  const [enabled] = useState(() => shouldMountContinuum())
  const [failed, setFailed] = useState(false)
  const quality = useMemo(() => getContinuumQuality(), [])
  const scrollState = useContinuumScroll()
  const stage = useStage()
  const frameloop = getContinuumFrameloop(stage, scrollState.opacity)
  const shouldRun = shouldRunContinuumFrame(stage, scrollState.opacity)
  const rootStyle = { opacity: shouldRun ? 1 : 0 } satisfies CSSProperties

  if (!enabled || failed) return null

  return (
    <div className="particle-continuum" style={rootStyle} aria-hidden="true">
      <ContinuumErrorBoundary onError={() => setFailed(true)}>
        <Canvas
          camera={{ position: [0, 0, 5.2], fov: 42, near: 0.1, far: 100 }}
          dpr={[1, quality.dprMax]}
          frameloop={frameloop}
          gl={{ alpha: true, antialias: false, powerPreference: 'high-performance' }}
        >
          <ContinuumContextRegistration />
          <ContinuumScene quality={quality} scrollState={scrollState} shouldRun={shouldRun} />
        </Canvas>
      </ContinuumErrorBoundary>
    </div>
  )
}
