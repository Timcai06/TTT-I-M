import type { ReactNode } from 'react'
import CanvasUiHtmlSurface, {
  type CanvasUiHtmlFactory,
} from './CanvasUiHtmlSurface'
import { DECRYPT_REVEAL_CONFIG } from '../../lib/canvas-ui/decryptRevealConfig'
import type { DecryptRevealOptions } from '../../lib/canvas-ui/vendor/DecryptReveal/DecryptRevealVanilla'

let decryptFactory: Promise<CanvasUiHtmlFactory<DecryptRevealOptions>> | null = null

const loadDecryptReveal = (): Promise<CanvasUiHtmlFactory<DecryptRevealOptions>> => {
  if (!decryptFactory) {
    const request = import('../../lib/canvas-ui/vendor/DecryptReveal/DecryptRevealVanilla')
      .then(({ createDecryptReveal }) => createDecryptReveal)
      .catch((error: unknown) => {
        if (decryptFactory === request) decryptFactory = null
        throw error
      })
    decryptFactory = request
  }
  return decryptFactory
}

void loadDecryptReveal().catch(() => undefined)

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
