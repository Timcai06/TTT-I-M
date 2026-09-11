import { readFileSync } from 'node:fs'

/** Read a landing source file relative to apps/landing. */
export const read = path => readFileSync(path, 'utf8')

/**
 * Blank comments to whitespace, preserving line numbers.
 *
 * Guards that match on source patterns are explained by comments that quote the
 * very pattern they forbid. Without this a guard reports its own explanation,
 * which is exactly what both callers did on their first run.
 */
export const withoutComments = source => source
  .replace(/\/\*[\s\S]*?\*\//g, comment => comment.replace(/[^\n]/g, ' '))
  .replace(/(^|[^:])\/\/[^\n]*/g, (line, lead) => lead + ' '.repeat(line.length - lead.length))
