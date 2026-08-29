import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { gsap } from '../lib/gsap'
import GradualBlur from './GradualBlur'

const CLOSED_X_PERCENT = 150

export interface StaggeredSectionMenuItem {
  id: string
  index: string
  label: string
  summary: string
}

interface StaggeredSectionMenuProps {
  items: StaggeredSectionMenuItem[]
  socialItems: Array<{ label: string; href: string }>
  open: boolean
  activeId: string
  onClose: () => void
  onSelect: (id: string) => void
}

export default function StaggeredSectionMenu({
  items,
  socialItems,
  open,
  activeId,
  onClose,
  onSelect,
}: StaggeredSectionMenuProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const layerRefs = useRef<HTMLDivElement[]>([])
  const openRef = useRef(open)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  const setLayerRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return
    layerRefs.current[Number(node.dataset.layerIndex ?? 0)] = node
  }, [])

  useLayoutEffect(() => {
    const panel = panelRef.current
    const layers = layerRefs.current
    if (!panel) return

    gsap.set([panel, ...layers], { xPercent: CLOSED_X_PERCENT, opacity: 1 })
    gsap.set(panel.querySelectorAll('.staggered-section-menu__label'), { yPercent: 130, rotate: 8 })
    gsap.set(panel.querySelectorAll('.staggered-section-menu__meta, .staggered-section-menu__social-link'), {
      opacity: 0,
      y: 16,
    })
  }, [])

  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return

    const layers = layerRefs.current
    const labels = Array.from(panel.querySelectorAll<HTMLElement>('.staggered-section-menu__label'))
    const meta = Array.from(panel.querySelectorAll<HTMLElement>('.staggered-section-menu__meta'))
    const socials = Array.from(panel.querySelectorAll<HTMLElement>('.staggered-section-menu__social-link'))

    if (open) {
      openRef.current = true
      const tl = gsap.timeline()
      gsap.set(rootRef.current, { pointerEvents: 'auto' })
      gsap.set(layers, { xPercent: CLOSED_X_PERCENT, opacity: 1 })
      gsap.set(panel, { xPercent: CLOSED_X_PERCENT, opacity: 1 })
      gsap.set(labels, { yPercent: 130, rotate: 8 })
      gsap.set([...meta, ...socials], { opacity: 0, y: 16 })

      layers.forEach((layer, index) => {
        tl.to(layer, { xPercent: 0, duration: 0.54, ease: 'power4.out' }, index * 0.055)
      })
      tl.to(panel, { xPercent: 0, duration: 0.68, ease: 'power4.out' }, 0.18)
      tl.to(labels, { yPercent: 0, rotate: 0, duration: 0.82, ease: 'power4.out', stagger: 0.065 }, 0.34)
      tl.to(meta, { opacity: 1, y: 0, duration: 0.42, ease: 'power2.out', stagger: 0.035 }, 0.48)
      tl.to(socials, { opacity: 1, y: 0, duration: 0.42, ease: 'power2.out', stagger: 0.055 }, 0.68)
      return () => {
        tl.kill()
      }
    }

    if (!openRef.current) return
    openRef.current = false
    const tween = gsap.to([panel, ...layers], {
      xPercent: CLOSED_X_PERCENT,
      duration: 0.34,
      ease: 'power3.in',
      overwrite: true,
      onComplete: () => {
        gsap.set(rootRef.current, { pointerEvents: 'none' })
      },
    })

    return () => {
      tween.kill()
    }
  }, [open])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    root.inert = !open
    let focusFrame = 0

    if (open) {
      const activeElement = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
      const controller = root.id
        ? document.querySelector<HTMLElement>(`[aria-controls="${root.id}"]`)
        : null
      previousFocusRef.current = activeElement && activeElement !== document.body
        ? activeElement
        : controller
      focusFrame = window.requestAnimationFrame(() => {
        panelRef.current?.querySelector<HTMLButtonElement>('.staggered-section-menu__item')?.focus()
      })
    } else {
      previousFocusRef.current?.focus()
    }

    return () => window.cancelAnimationFrame(focusFrame)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab') return

      const root = rootRef.current
      if (!root) return
      const focusable = Array.from(root.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      )).filter((element) => element.getClientRects().length > 0)
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, open])

  return (
    <div
      className={`staggered-section-menu${open ? ' is-open' : ''}`}
      id="section-map"
      ref={rootRef}
      aria-hidden={!open}
    >
      <button className="staggered-section-menu__scrim" type="button" aria-label="Close section map" onClick={onClose} />
      {/* Progressive edge dissolve: a vertical blur band just left of the panel
          so the page frosts densest right where the menu begins (heaviest on the
          right/panel side), echoing the Frame edge dissolve. Fades in via .is-open. */}
      <div className="staggered-section-menu__seam" aria-hidden="true">
        <GradualBlur position="right" target="parent" width="100%" strength={2.6} divCount={6} curve="ease-out" />
      </div>
      <div className="staggered-section-menu__layers" aria-hidden="true">
        {['#8b1e16', '#cf9eff', '#f5f2ea'].map((color, index) => (
          <div
            className="staggered-section-menu__layer"
            data-layer-index={index}
            key={color}
            ref={setLayerRef}
            style={{ background: color }}
          />
        ))}
      </div>
      <aside
        className="staggered-section-menu__panel"
        ref={panelRef}
        aria-label="Section map"
        aria-modal="true"
        role="dialog"
      >
        <div className="staggered-section-menu__kicker">Section Map</div>
        <div className="staggered-section-menu__list" role="list">
          {items.map((item) => (
            <button
              className={`staggered-section-menu__item${activeId === item.id ? ' is-active' : ''}`}
              key={item.id}
              aria-label={`Go to ${item.label}`}
              onClick={() => onSelect(item.id)}
              type="button"
            >
              <span className="staggered-section-menu__index">{item.index}</span>
              <span className="staggered-section-menu__label-wrap">
                <span className="staggered-section-menu__label">{item.label}</span>
              </span>
              <span className="staggered-section-menu__meta">{item.summary}</span>
            </button>
          ))}
        </div>
        <div className="staggered-section-menu__socials" aria-label="Social links">
          {socialItems.map((item) => (
            <a className="staggered-section-menu__social-link" href={item.href} key={item.label}>
              {item.label}
            </a>
          ))}
        </div>
      </aside>
    </div>
  )
}
