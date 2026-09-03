import { useCallback, type ReactNode } from 'react'
import CanvasUiHtmlSurface, {
  type CanvasUiHtmlFactory,
} from './CanvasUiHtmlSurface'
import { PROJECT_GLASS_CONFIG } from '../../lib/canvas-ui/glassConfig'
import type { GlassOptions } from '../../lib/canvas-ui/vendor/Glass/GlassVanilla'

const loadGlass = async (): Promise<CanvasUiHtmlFactory<GlassOptions>> => {
  const { createGlass } = await import('../../lib/canvas-ui/vendor/Glass/GlassVanilla')
  return createGlass
}

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
      renderMargin="25% 0px"
      mountMargin="0px"
    >
      {children}
    </CanvasUiHtmlSurface>
  )
}
