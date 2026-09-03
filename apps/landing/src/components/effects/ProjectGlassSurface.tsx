import { useCallback, type ReactNode } from 'react'
import CanvasUiHtmlSurface, {
  type CanvasUiHtmlFactory,
} from './CanvasUiHtmlSurface'
import { PROJECT_GLASS_CONFIG } from '../../lib/canvas-ui/glassConfig'
import { supportsHtmlInCanvas } from '../../lib/canvas-ui/runtime'
import type { GlassOptions } from '../../lib/canvas-ui/vendor/Glass/GlassVanilla'

let glassFactory: Promise<CanvasUiHtmlFactory<GlassOptions>> | null = null

function preloadProjectGlass(): Promise<CanvasUiHtmlFactory<GlassOptions>> {
  glassFactory ??= import('../../lib/canvas-ui/vendor/Glass/GlassVanilla')
    .then(({ createGlass }) => createGlass)
  return glassFactory
}

const loadGlass = () => preloadProjectGlass()

// Projects is fetched while the Loader is still active. Warm the small shader
// chunk at module evaluation so entering Work never starts with a network-bound
// Glass initialization.
if (supportsHtmlInCanvas()) void preloadProjectGlass()

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
  const reportActive = useCallback(
    (active: boolean) => onActiveChange(surfaceId, active),
    [onActiveChange, surfaceId],
  )

  return (
    <CanvasUiHtmlSurface
      className={`project-glass project-glass--${variant}`}
      contentClassName={`project-glass__content project-glass__content--${variant}`}
      effectId={`project-glass-${surfaceId}`}
      exclusiveGroup="canvas-ui-html-primary"
      enabled={enabled}
      options={PROJECT_GLASS_CONFIG}
      loadFactory={loadGlass}
      onActiveChange={reportActive}
      retainFallbackUntilReady
      renderMargin="25% 0px"
      mountMargin="35% 0px"
    >
      {children}
    </CanvasUiHtmlSurface>
  )
}
