import type { ReactNode } from 'react'
import CanvasUiHtmlSurface, {
  type CanvasUiHtmlFactory,
} from './CanvasUiHtmlSurface'
import { DECRYPT_REVEAL_CONFIG } from '../../lib/canvas-ui/decryptRevealConfig'
import type { DecryptRevealOptions } from '../../lib/canvas-ui/vendor/DecryptReveal/DecryptRevealVanilla'

const loadDecryptReveal = async (): Promise<CanvasUiHtmlFactory<DecryptRevealOptions>> => {
  const { createDecryptReveal } = await import(
    '../../lib/canvas-ui/vendor/DecryptReveal/DecryptRevealVanilla'
  )
  return createDecryptReveal
}

export default function AboutDecryptReveal({ children }: { children: ReactNode }) {
  return (
    <CanvasUiHtmlSurface
      className="about-decrypt"
      contentClassName="about-decrypt__content"
      effectId="about-decrypt-reveal"
      exclusiveGroup="canvas-ui-html-primary"
      options={DECRYPT_REVEAL_CONFIG}
      loadFactory={loadDecryptReveal}
      renderMargin="20% 0px"
      mountMargin="65% 0px"
    >
      {children}
    </CanvasUiHtmlSurface>
  )
}
