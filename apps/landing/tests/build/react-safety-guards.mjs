import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { withoutComments } from './lib/source.mjs'

/**
 * Rules React enforces at runtime that eslint cannot see statically.
 */

// A hook on the right-hand side of && / || / ?: is a conditional hook call, and
// react-hooks/rules-of-hooks does not see it — short-circuit operators are a blind
// spot of that rule, so eslint passed this file for months. Hero carried
// `!useMobileExperience() && !useReducedMotion()`. useMobileExperience is two
// useSyncExternalStore calls and useReducedMotion is one, so the two branches
// rendered three hooks or two; when a media query settled after first paint the
// count changed under React, the hook list went inconsistent, and the whole Hero
// chapter went into its error boundary in production with the loader stuck at 99.
{
  const offenders = []
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) { if (entry.name !== 'vendor') walk(path); continue }
      if (!/\.tsx?$/.test(entry.name)) continue
      // Comments are blanked to newline-preserving whitespace rather than removed,
      // so reported line numbers still point at real code. This guard's own
      // explanation quotes the offending line verbatim, and without this it
      // reported itself.
      const source = withoutComments(readFileSync(path, 'utf8'))
      // `<any> && use…(`  /  `|| use…(`  /  `? use…(`  /  `: use…(`
      for (const match of source.matchAll(/(&&|\|\||\?|:)\s*!?\s*(use[A-Z][A-Za-z0-9_]*)\s*\(/g)) {
        const line = source.slice(0, match.index).split('\n').length
        offenders.push(`${path}:${line} ${match[2]} behind ${match[1]}`)
      }
    }
  }
  walk('src')
  if (offenders.length) {
    throw new Error(`Hooks must not sit behind a short-circuit or ternary — they are then called conditionally:\n  ${offenders.join('\n  ')}`)
  }
}

console.log('[react-safety-guards] no hook sits behind a short-circuit or ternary.')
