import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'

/**
 * Reusable mount/pause lifecycle for an in-page WebGL surface.
 *
 * Extracted from ParticlePortrait's hand-rolled dual-IntersectionObserver setup
 * so every R3F scene (and future GLTF/shader chapters) can inherit the same
 * "smart load/pause/unmount" contract instead of re-implementing it:
 *
 *  • `visible` (render margin) — within this band the render loop should run.
 *    Off-screen, callers set frameloop="never" so the shader stops stealing GPU.
 *  • `mounted` (mount margin, wider) — outside this band the whole Canvas should
 *    unmount, freeing its WebGL context / textures / geometry. The gap between
 *    the two margins is hysteresis: a paused-but-mounted band that prevents
 *    mount/unmount thrash right at the boundary.
 *
 * Callers combine `visible` with their own pause conditions (e.g. the runtime
 * stage being `transitioning`) to compute the final frameloop.
 */
export interface GLSurfaceOptions {
  /** rootMargin for the render (pause) observer. Default 120px. */
  renderMargin?: string
  /** rootMargin for the mount (unmount) observer. Default one viewport. */
  mountMargin?: string
}

export interface GLSurface {
  ref: RefObject<HTMLDivElement | null>
  /** Within the render band — the frameloop may run. */
  visible: boolean
  /** Within the mount band — the Canvas should be mounted. */
  mounted: boolean
}

export function useGLSurface({
  renderMargin = '120px',
  mountMargin = '100% 0px',
}: GLSurfaceOptions = {}): GLSurface {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(true)
  const [mounted, setMounted] = useState(true)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const render = new IntersectionObserver(
      ([entry]) => { if (entry) setVisible(entry.isIntersecting) },
      { rootMargin: renderMargin }
    )
    const mount = new IntersectionObserver(
      ([entry]) => { if (entry) setMounted(entry.isIntersecting) },
      { rootMargin: mountMargin }
    )
    render.observe(el)
    mount.observe(el)
    return () => { render.disconnect(); mount.disconnect() }
  }, [renderMargin, mountMargin])

  return { ref, visible, mounted }
}
