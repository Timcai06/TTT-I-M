export const ABOUT_PARTICLE_TEXT = 'Built by hand, frame by frame.'

const PRELOAD_FONT_TIMEOUT_MS = 6000

let preloadPromise: Promise<void> | undefined

function waitForDocumentFonts() {
  if (typeof document === 'undefined' || !document.fonts) return Promise.resolve()

  return Promise.race([
    document.fonts.ready.then(() => undefined),
    new Promise<void>((resolve) => window.setTimeout(resolve, PRELOAD_FONT_TIMEOUT_MS)),
  ])
}

function resolveSerifFont() {
  const root = document.documentElement
  const font = getComputedStyle(root).getPropertyValue('--font-serif').trim()
  return font || 'serif'
}

export function preloadAboutTextParticles() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return Promise.resolve()

  preloadPromise ??= Promise.all([
    import('../components/TextParticles'),
    import('./textParticles'),
    waitForDocumentFonts(),
  ]).then(([, { buildTextParticleField }]) => {
    const maxWidth = Math.min(680, Math.max(320, window.innerWidth - 48))
    const fontSize = Math.max(42, Math.min(72, maxWidth / 6.5))

    buildTextParticleField({
      text: ABOUT_PARTICLE_TEXT,
      maxWidth,
      fontSize,
      fontFamily: resolveSerifFont(),
      fontWeight: 500,
      sampleGap: window.innerWidth < 768 ? 7 : 5,
      maxTargets: window.innerWidth < 768 ? 2600 : 6000,
    })
  })

  return preloadPromise
}
