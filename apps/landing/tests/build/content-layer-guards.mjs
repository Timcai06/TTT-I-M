import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

// plan/02-system-boundaries.md: UI components depend on the src/content/ boundary,
// never on src/data/* directly, so the data source is an adapter swap rather than
// a component rewrite. This guard locks that in.

const requiredContentFiles = [
  'src/content/schema.ts',
  'src/content/repositories.ts',
  'src/content/adapters/static.ts',
  'src/content/index.ts',
]
for (const file of requiredContentFiles) {
  if (!existsSync(file)) {
    throw new Error(`Missing content layer file: ${file}`)
  }
}

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })
}

const componentFiles = walk('src/components').filter((file) => /\.(ts|tsx)$/.test(file))
const dataImport = /from\s+['"][./]*data\//

const offenders = componentFiles.filter((file) => dataImport.test(readFileSync(file, 'utf8')))
if (offenders.length > 0) {
  throw new Error(
    `Components must import content from src/content, not src/data directly:\n  - ${offenders.join('\n  - ')}`
  )
}

// The repository abstraction must expose both the sync landing accessor and the
// async (future MDX/DB) contract.
const repoSource = readFileSync('src/content/repositories.ts', 'utf8')
for (const needle of ['all()', 'list()', 'get(']) {
  if (!repoSource.includes(needle)) {
    throw new Error(`CollectionRepository must declare ${needle} (sync landing + async studio contract).`)
  }
}

// Forward-looking metadata must be in the schema now (UGC publish workflow, plan 03).
const schemaSource = readFileSync('src/content/schema.ts', 'utf8')
for (const needle of ['publishState', 'PublishState', 'ContentMeta']) {
  if (!schemaSource.includes(needle)) {
    throw new Error(`Content schema must reserve ${needle} for the future publish/UGC workflow.`)
  }
}

const graphContractPath = '../../packages/content/src/builderGraph.ts'
if (!existsSync(graphContractPath)) {
  throw new Error('Missing Builder Graph A1 contract at packages/content/src/builderGraph.ts')
}

const graphSource = readFileSync(graphContractPath, 'utf8')
for (const needle of [
  'BUILDER_GRAPH_SCHEMA_VERSION',
  'BuilderGraphSnapshot',
  'EvidencePointer',
  'GitHubAccountLink',
  'RepositoryNode',
  'ProjectNode',
  'SkillSignal',
  'BuilderGraphRepository',
  'visibility: BuilderGraphVisibility',
  'evidenceIds: string[]',
]) {
  if (!graphSource.includes(needle)) {
    throw new Error(`Builder Graph A1 contract must expose ${needle}.`)
  }
}

console.log(`[content-layer-guards] ${componentFiles.length} component files all source data via src/content; repository + schema + Builder Graph contracts present.`)
