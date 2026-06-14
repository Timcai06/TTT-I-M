import { Component, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { acquireContext, releaseContext } from '../webgl/contextRegistry'
import { createContinuumSimulation, type ContinuumSimulation } from './simulation'
import { buildContinuumPoints, type ContinuumPoints } from './renderPoints'
import { getContinuumQuality, shouldMountContinuum } from './continuumRuntime'
import { loadPortraitTargetTexture } from './forms/portrait'
import { getContinuumForm } from './forms/registry'

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

function ContinuumScene({ quality }: { quality: ReturnType<typeof getContinuumQuality> }) {
  const { gl } = useThree()
  const portrait = getContinuumForm('portrait')

  const bundle = useMemo<ContinuumBundle | null>(() => {
    try {
      const simulation = createContinuumSimulation({
        renderer: gl,
        texSize: quality.particleTexSize,
        radius: 1.18,
      })
      const points = buildContinuumPoints({
        texSize: quality.particleTexSize,
        pointSize: quality.pointSize * quality.dprMax,
        tint: portrait.tint,
        blending: THREE.AdditiveBlending,
      })

      points.setPositionTexture(simulation.positionTexture)
      points.setOpacity(0.32)
      return { simulation, points }
    } catch (error) {
      console.warn('[ParticleContinuum] simulation init failed:', error)
      return null
    }
  }, [gl, quality, portrait.tint])

  useEffect(() => {
    return () => {
      bundle?.simulation.dispose()
      bundle?.points.dispose()
    }
  }, [bundle])

  useFrame((_, delta) => {
    if (!bundle) return
    const positionTexture = bundle.simulation.compute(delta, portrait.behavior)
    bundle.points.setPositionTexture(positionTexture)
  })

  useEffect(() => {
    if (!bundle) return
    let cancelled = false

    loadPortraitTargetTexture('/portrait/tim.jpg', quality.particleTexSize)
      .then((texture) => {
        if (cancelled) {
          texture.dispose()
          return
        }
        bundle.simulation.setTarget(texture)
      })
      .catch((error) => {
        console.warn('[ParticleContinuum] portrait target failed:', error)
      })

    return () => {
      cancelled = true
    }
  }, [bundle, quality.particleTexSize])

  if (!bundle) return null
  return <primitive object={bundle.points.points} />
}

export default function ParticleContinuum() {
  const [enabled] = useState(() => shouldMountContinuum())
  const [failed, setFailed] = useState(false)
  const quality = useMemo(() => getContinuumQuality(), [])

  if (!enabled || failed) return null

  return (
    <div className="particle-continuum" aria-hidden="true">
      <ContinuumErrorBoundary onError={() => setFailed(true)}>
        <Canvas
          camera={{ position: [0, 0, 5.2], fov: 42, near: 0.1, far: 100 }}
          dpr={[1, quality.dprMax]}
          gl={{ alpha: true, antialias: false, powerPreference: 'high-performance' }}
        >
          <ContinuumContextRegistration />
          <ContinuumScene quality={quality} />
        </Canvas>
      </ContinuumErrorBoundary>
    </div>
  )
}
