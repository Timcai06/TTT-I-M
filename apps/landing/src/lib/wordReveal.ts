import { gsap } from './gsap'
import { prefersReducedMotion } from './motion'

// CJK ranges that should reveal one glyph at a time (no spaces between them).
const CJK = '\\u4e00-\\u9fff\\u3400-\\u4dbf\\u3040-\\u30ff\\uff00-\\uffef\\u3000-\\u303f'
const TOKEN_RE = new RegExp(`(\\s+)|([${CJK}])|([^\\s${CJK}]+)`, 'g')

/**
 * Wrap each token of `el`'s text in <span class="word"> for staggered reveal:
 *   - every CJK glyph becomes its own token (character-level cascade)
 *   - latin runs stay whole words (no mid-word break)
 *   - whitespace is preserved verbatim as plain text nodes
 *
 * Uses a TreeWalker so existing inline children (e.g. <em>, highlight spans)
 * are kept — their inner text just gets tokenised in place. Idempotent.
 */
export function splitWords(el: HTMLElement) {
  if (el.dataset.wordsSplit) return

  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  const textNodes: Text[] = []
  let node: Node | null
  while ((node = walker.nextNode())) textNodes.push(node as Text)

  textNodes.forEach((textNode) => {
    const text = textNode.textContent ?? ''
    if (!text) return
    const frag = document.createDocumentFragment()
    let match: RegExpExecArray | null
    TOKEN_RE.lastIndex = 0
    while ((match = TOKEN_RE.exec(text))) {
      const [token, ws] = match
      if (ws) {
        frag.appendChild(document.createTextNode(token))
      } else {
        const span = document.createElement('span')
        span.className = 'word'
        span.textContent = token
        frag.appendChild(span)
      }
    }
    textNode.parentNode?.replaceChild(frag, textNode)
  })

  el.dataset.wordsSplit = 'true'
}

interface RevealOptions {
  /** ScrollTrigger start (default 'top 85%'). */
  start?: string
  /** ScrollTrigger end (default 'top 45%'). */
  end?: string
}

interface RevealOnceOptions {
  /** Element whose entry fires the reveal (default: each matched target). */
  trigger?: HTMLElement
  /** ScrollTrigger start (default 'top 82%'). */
  start?: string
}

/**
 * One-shot per-word blur→clear + lift reveal (no scrub). Use inside pinned /
 * horizontally-scrubbed sections where a vertical scrub can't track progress,
 * or anywhere a title should resolve once as it enters. Same CJK-aware split as
 * revealWords; blur dropped under reduced-motion / touch.
 *
 * MUST be called inside a `gsap.context(..., scope)`.
 */
export function revealWordsOnce(scope: HTMLElement, selector: string, opts: RevealOnceOptions = {}) {
  const noBlur = prefersReducedMotion() || window.matchMedia('(hover: none)').matches

  gsap.utils.toArray<HTMLElement>(scope.querySelectorAll(selector)).forEach((target) => {
    splitWords(target)
    const words = target.querySelectorAll<HTMLElement>('.word')
    if (!words.length) return

    gsap.fromTo(
      words,
      { opacity: 0, yPercent: 30, ...(noBlur ? {} : { filter: 'blur(6px)' }) },
      {
        opacity: 1,
        yPercent: 0,
        ...(noBlur ? {} : { filter: 'blur(0px)' }),
        ease: 'power3.out',
        duration: 0.7,
        stagger: 0.018,
        scrollTrigger: {
          trigger: opts.trigger ?? target,
          start: opts.start ?? 'top 82%',
          toggleActions: 'play none none reverse',
        },
      }
    )
  })
}

/**
 * Scroll-scrubbed blur→clear reveal for every element matching `selector`
 * inside `scope`. One ScrollTrigger per paragraph (cheap); the cascade comes
 * from a per-word stagger. Blur is dropped under reduced-motion / touch — the
 * reveal degrades to a plain opacity ramp.
 *
 * MUST be called inside a `gsap.context(..., scope)` so the triggers are
 * reverted with the component.
 */
export function revealWords(scope: HTMLElement, selector: string, opts: RevealOptions = {}) {
  const noBlur = prefersReducedMotion() || window.matchMedia('(hover: none)').matches

  gsap.utils.toArray<HTMLElement>(scope.querySelectorAll(selector)).forEach((target) => {
    splitWords(target)
    const words = target.querySelectorAll<HTMLElement>('.word')
    if (!words.length) return

    gsap.fromTo(
      words,
      { opacity: 0.12, ...(noBlur ? {} : { filter: 'blur(8px)' }) },
      {
        opacity: 1,
        ...(noBlur ? {} : { filter: 'blur(0px)' }),
        ease: 'none',
        stagger: 0.35,
        scrollTrigger: {
          trigger: target,
          start: opts.start ?? 'top 85%',
          end: opts.end ?? 'top 45%',
          scrub: true,
        },
      }
    )
  })
}
