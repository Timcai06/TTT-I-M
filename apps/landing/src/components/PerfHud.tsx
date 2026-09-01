import { useEffect, useRef } from 'react'
import { supportsHtmlInCanvas } from '../lib/canvas-ui/runtime'

/**
 * Dev-only performance HUD: live FPS (with a rolling worst-case) and a
 * long-task counter. Writes straight to the DOM via refs so the HUD itself
 * never triggers a React re-render (a perf tool must not add jank).
 *
 * Mounted only behind `import.meta.env.DEV` in App, so it is dead-code
 * eliminated from production bundles. Click to re-baseline the worst-case.
 */
export default function PerfHud() {
  const rootRef = useRef<HTMLDivElement>(null)
  const fpsRef = useRef<HTMLSpanElement>(null)
  const worstRef = useRef<HTMLSpanElement>(null)
  const ltRef = useRef<HTMLSpanElement>(null)
  const canvasRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    let raf = 0
    let frames = 0
    let last = performance.now()
    let worst = Number.POSITIVE_INFINITY

    const color = (fps: number) =>
      fps >= 57 ? '#4ade80' : fps >= 40 ? '#fbbf24' : '#f87171'

    const tick = (now: number) => {
      frames++
      const elapsed = now - last
      if (elapsed >= 500) {
        const fps = Math.round((frames * 1000) / elapsed)
        worst = Math.min(worst, fps)
        if (fpsRef.current) {
          fpsRef.current.textContent = `${fps} fps`
          fpsRef.current.style.color = color(fps)
        }
        if (worstRef.current) {
          worstRef.current.textContent = `min ${worst}`
          worstRef.current.style.color = color(worst)
        }
        frames = 0
        last = now
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    const resetWorst = () => { worst = Number.POSITIVE_INFINITY }
    const root = rootRef.current
    root?.addEventListener('click', resetWorst)

    let longTasks = 0
    let lastLt = 0
    let po: PerformanceObserver | undefined
    try {
      po = new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          longTasks++
          lastLt = Math.round(e.duration)
        }
        if (ltRef.current) ltRef.current.textContent = `LT ${longTasks} · ${lastLt}ms`
      })
      po.observe({ entryTypes: ['longtask'] })
    } catch {
      /* longtask API unsupported (Safari/Firefox) — FPS still works */
    }

    if (canvasRef.current) {
      const active = supportsHtmlInCanvas()
      canvasRef.current.textContent = active ? 'Canvas HTML on' : 'Canvas HTML fallback'
      canvasRef.current.style.color = active ? '#60a5fa' : '#fbbf24'
      document.documentElement.dataset.htmlCanvas = active ? 'active' : 'fallback'
    }

    return () => {
      cancelAnimationFrame(raf)
      root?.removeEventListener('click', resetWorst)
      po?.disconnect()
    }
  }, [])

  return (
    <div
      ref={rootRef}
      style={{
        position: 'fixed',
        bottom: 10,
        left: 10,
        zIndex: 99999,
        display: 'flex',
        gap: 10,
        font: '11px/1.4 ui-monospace, SFMono-Regular, monospace',
        color: '#4ade80',
        background: 'rgba(0,0,0,0.62)',
        padding: '5px 9px',
        borderRadius: 5,
        backdropFilter: 'blur(4px)',
        userSelect: 'none',
        cursor: 'pointer',
      }}
      title="Click to reset worst-case FPS"
    >
      <span ref={fpsRef}>– fps</span>
      <span ref={worstRef} style={{ opacity: 0.85 }}>min –</span>
      <span ref={ltRef} style={{ color: '#94a3b8' }}>LT 0</span>
      <span ref={canvasRef}>Canvas HTML …</span>
    </div>
  )
}
