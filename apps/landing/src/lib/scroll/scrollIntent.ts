const SCROLL_KEYS = new Set(['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '])

const INTERACTIVE_SELECTOR = [
  'a[href]',
  'button',
  'input',
  'select',
  'textarea',
  '[contenteditable="true"]',
  '[role="button"]',
  '[role="checkbox"]',
  '[role="menuitem"]',
  '[role="option"]',
  '[role="radio"]',
  '[role="slider"]',
  '[role="switch"]',
  '[role="tab"]',
].join(',')

/**
 * Distinguishes document-navigation keys from keyboard input owned by an
 * interactive control. A space press on a button or arrows inside a form must
 * never be mistaken for evidence that the user started navigating chapters.
 */
export function isKeyboardScrollIntent(event: KeyboardEvent): boolean {
  if (event.defaultPrevented || !SCROLL_KEYS.has(event.key)) return false
  if (!(event.target instanceof Element)) return true
  return event.target.closest(INTERACTIVE_SELECTOR) === null
}
