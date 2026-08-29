/** A browser-local subset of cli-spinners' data contract. */
export interface SpinnerDefinition {
  readonly interval: number
  readonly frames: readonly string[]
}

/**
 * dots12 from cli-spinners, copied as data so the browser does not ship the
 * full package (70+ definitions) or Ora's terminal runtime.
 */
export const DOTS12 = {
  interval: 80,
  frames: [
    '⢀⠀', '⡀⠀', '⠄⠀', '⢂⠀', '⡂⠀', '⠅⠀', '⢃⠀', '⡃⠀', '⠍⠀', '⢋⠀', '⡋⠀',
    '⠍⠁', '⢋⠁', '⡋⠁', '⠍⠉', '⠋⠉', '⠋⠉', '⠉⠙', '⠉⠙', '⠉⠩', '⠈⢙', '⠈⡙',
    '⢈⠩', '⡀⢙', '⠄⡙', '⢂⠩', '⡂⢘', '⠅⡘', '⢃⠨', '⡃⢐', '⠍⡐', '⢋⠠', '⡋⢀',
    '⠍⡁', '⢋⠁', '⡋⠁', '⠍⠉', '⠋⠉', '⠋⠉', '⠉⠙', '⠉⠙', '⠉⠩', '⠈⢙', '⠈⡙',
    '⠈⠩', '⠀⢙', '⠀⡙', '⠀⠩', '⠀⢘', '⠀⡘', '⠀⠨', '⠀⢐', '⠀⡐', '⠀⠠', '⠀⢀', '⠀⡀',
  ],
} as const satisfies SpinnerDefinition

export function nextSpinnerFrame(index: number, definition: SpinnerDefinition = DOTS12): number {
  return (index + 1) % definition.frames.length
}

export function advanceLoaderSpinnerFrame(options: {
  index: number
  hidden: boolean
  ready: boolean
  reducedMotion: boolean
}): number {
  return options.hidden || options.ready || options.reducedMotion
    ? options.index
    : nextSpinnerFrame(options.index)
}

export function loaderSpinnerGlyph(options: {
  frameIndex: number
  ready: boolean
  reducedMotion: boolean
}): string {
  if (options.ready) return '✓'
  if (options.reducedMotion) return '·'
  return DOTS12.frames[options.frameIndex % DOTS12.frames.length] ?? DOTS12.frames[0]
}
