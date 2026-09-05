import { useCallback, useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react'
import CanvasUiHtmlSurface, {
  type CanvasUiHtmlFactory,
} from './CanvasUiHtmlSurface'
import { PROJECT_GLASS_CONFIG } from '../../lib/canvas-ui/glassConfig'
import {
  getWorkGlassSelection,
  registerWorkGlassSurface,
  subscribeWorkGlassSelection,
} from '../../lib/canvas-ui/workGlassCoordinator'
import type { GlassOptions } from '../../lib/canvas-ui/vendor/Glass/GlassVanilla'

let glassFactory: Promise<CanvasUiHtmlFactory<GlassOptions>> | null = null

function preloadProjectGlass(): Promise<CanvasUiHtmlFactory<GlassOptions>> {
  if (!glassFactory) {
    const request = import('../../lib/canvas-ui/vendor/Glass/GlassVanilla')
      .then(({ createGlass }) => createGlass)
      .catch((error: unknown) => {
        if (glassFactory === request) glassFactory = null
        throw error
      })
    glassFactory = request
  }
  return glassFactory
}

const loadGlass = async (): Promise<CanvasUiHtmlFactory<GlassOptions>> => {
  const createGlass = await preloadProjectGlass()
  return (elements, options) => createGlass(elements, {
    ...options,
    continuityKey: 'work-project-glass',
    viewportOutput: true,
    scopeSelector: '#projects',
  })
}

// Projects is fetched while the Loader is still active. Warm the small shader
// chunk at module evaluation so entering Work never starts with a network-bound
// Glass initialization.
void preloadProjectGlass().catch(() => undefined)

interface ProjectGlassSurfaceProps {
  children: ReactNode
  enabled: boolean
  surfaceId: string
  onActiveChange: (surfaceId: string, active: boolean) => void
  variant?: 'overview' | 'card'
}

export default function ProjectGlassSurface({
  children,
  enabled,
  surfaceId,
  onActiveChange,
  variant = 'card',
}: ProjectGlassSurfaceProps) {
  const unregisterHost = useRef<(() => void) | null>(null)
  const selectedSurface = useSyncExternalStore(
    subscribeWorkGlassSelection,
    getWorkGlassSelection,
    () => null,
  )
  const reportActive = useCallback(
    (active: boolean) => onActiveChange(surfaceId, active),
    [onActiveChange, surfaceId],
  )
  const bindHost = useCallback((element: HTMLDivElement | null) => {
    unregisterHost.current?.()
    unregisterHost.current = element ? registerWorkGlassSurface(surfaceId, element) : null
  }, [surfaceId])

  useEffect(() => () => unregisterHost.current?.(), [])

  return (
    <CanvasUiHtmlSurface
      className={`project-glass project-glass--${variant}`}
      contentClassName={`project-glass__content project-glass__content--${variant}`}
      effectId={`project-glass-${surfaceId}`}
      exclusiveGroup="canvas-ui-html-primary"
      enabled={enabled && selectedSurface === surfaceId}
      options={PROJECT_GLASS_CONFIG}
      loadFactory={loadGlass}
      onActiveChange={reportActive}
      onHostChange={bindHost}
      portalOutput
      renderMargin="25% 0px"
      mountMargin="220% 0px"
    >
      {children}
    </CanvasUiHtmlSurface>
  )
}
