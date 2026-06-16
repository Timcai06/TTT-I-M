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

const githubConnectorPath = '../../packages/content/src/githubConnector.ts'
if (!existsSync(githubConnectorPath)) {
  throw new Error('Missing GitHub Connector A2 contract at packages/content/src/githubConnector.ts')
}

const githubConnectorSource = readFileSync(githubConnectorPath, 'utf8')
for (const needle of [
  'GitHubPermissionProfile',
  'GitHubSyncManifest',
  'GitHubRepositorySelection',
  'GitHubDisconnectPolicy',
  'public_only',
  'oauth_identity',
  'github_app_installation',
  'metadata:read',
  'contents:read',
  'pull_requests:read',
  'actions:read',
  'deployments:read',
]) {
  if (!githubConnectorSource.includes(needle)) {
    throw new Error(`GitHub Connector A2 contract must expose ${needle}.`)
  }
}

for (const forbidden of ['repo:', 'public_repo', "'repo'", '"repo"']) {
  if (githubConnectorSource.includes(forbidden)) {
    throw new Error(`GitHub Connector A2 must not default to broad OAuth repo scope: ${forbidden}`)
  }
}

const githubGraphAdapterPath = '../../packages/content/src/githubGraphAdapter.ts'
if (!existsSync(githubGraphAdapterPath)) {
  throw new Error('Missing GitHub Graph A3 adapter at packages/content/src/githubGraphAdapter.ts')
}

const githubGraphAdapterSource = readFileSync(githubGraphAdapterPath, 'utf8')
for (const needle of [
  'GitHubGraphAdapter',
  'GitHubGraphAdapterInput',
  'GitHubProfileSummary',
  'GitHubRepositorySummary',
  'GitHubContributionSummary',
  'createGitHubGraphAdapter',
  'createTimPublicDemoBuilderGraph',
  'timPublicDemoBuilderGraphRepository',
  'BuilderGraphRepository',
  'GitHubSyncManifest',
]) {
  if (!githubGraphAdapterSource.includes(needle)) {
    throw new Error(`GitHub Graph A3 adapter must expose ${needle}.`)
  }
}

for (const forbidden of ['accessToken', 'refreshToken', 'installationToken', 'rawPayload', 'rawDiff']) {
  if (githubGraphAdapterSource.includes(forbidden)) {
    throw new Error(`GitHub Graph A3 adapter must not accept token/raw GitHub payload fields: ${forbidden}`)
  }
}

const publicPreviewPath = '../../packages/content/src/publicPreview.ts'
if (!existsSync(publicPreviewPath)) {
  throw new Error('Missing Public Preview A5 draft model at packages/content/src/publicPreview.ts')
}

const publicPreviewSource = readFileSync(publicPreviewPath, 'utf8')
for (const needle of [
  'PublicPreviewDraft',
  'PublicPreviewRepositoryChoice',
  'PublicPreviewProjectDraft',
  'createPublicPreviewDraft',
  'handle_lookup',
  'repo_selection',
  'draft_ready',
  'no OAuth',
]) {
  if (!publicPreviewSource.includes(needle)) {
    throw new Error(`Public Preview A5 model must expose ${needle}.`)
  }
}

for (const forbidden of ['accessToken', 'refreshToken', 'installationToken', 'rawPayload', 'rawDiff']) {
  if (publicPreviewSource.includes(forbidden)) {
    throw new Error(`Public Preview A5 model must not accept token/raw GitHub payload fields: ${forbidden}`)
  }
}

const githubPublicServicePath = '../../packages/content/src/githubPublicService.ts'
if (!existsSync(githubPublicServicePath)) {
  throw new Error('Missing GitHub Public Service A6 at packages/content/src/githubPublicService.ts')
}

const contentPackagePath = '../../packages/content/package.json'
const contentIndexPath = '../../packages/content/src/index.ts'
if (!existsSync(contentPackagePath) || !existsSync(contentIndexPath)) {
  throw new Error('Missing @timcai/content package metadata or main export.')
}

const contentPackage = JSON.parse(readFileSync(contentPackagePath, 'utf8'))
const contentIndexSource = readFileSync(contentIndexPath, 'utf8')
for (const subpath of ['./builder-graph', './github-connector', './github-graph-adapter', './public-preview', './github-public-service']) {
  if (!contentPackage.exports?.[subpath]) {
    throw new Error(`@timcai/content must expose Studio-only graph module ${subpath} as a subpath export.`)
  }
}

for (const forbiddenMainExport of [
  'BUILDER_GRAPH_SCHEMA_VERSION',
  'createGitHubGraphAdapter',
  'timPublicDemoBuilderGraphRepository',
  'createPublicPreviewDraft',
  'fetchPublicGitHubPreviewSnapshot',
]) {
  if (contentIndexSource.includes(forbiddenMainExport)) {
    throw new Error(`Landing-light @timcai/content main export must not include Studio graph value: ${forbiddenMainExport}`)
  }
}

const githubPublicServiceSource = readFileSync(githubPublicServicePath, 'utf8')
for (const needle of [
  'fetchPublicGitHubPreviewSnapshot',
  'GitHubPublicPreviewResult',
  'GitHubPublicPreviewStatus',
  '/users/${encodedHandle}',
  '/repos?type=owner',
  '/readme',
  'README_FETCH_LIMIT',
  'README_EXCERPT_MAX_CHARS',
  'sortRepositoriesForPreview',
  'createGitHubGraphAdapter',
  'public_only',
  'metadata:read',
  'rate_limited',
  'not_found',
]) {
  if (!githubPublicServiceSource.includes(needle)) {
    throw new Error(`GitHub Public Service A6 must expose ${needle}.`)
  }
}

for (const forbidden of ['Authorization', 'accessToken', 'refreshToken', 'installationToken', 'rawPayload', 'rawDiff']) {
  if (githubPublicServiceSource.includes(forbidden)) {
    throw new Error(`GitHub Public Service A6 must not use auth/token/raw payload fields: ${forbidden}`)
  }
}

const contentFixtureTestPath = '../../packages/content/tests/githubPublicService.test.ts'
if (!existsSync(contentFixtureTestPath)) {
  throw new Error('Missing GitHub Public Service A8 fixture tests at packages/content/tests/githubPublicService.test.ts')
}

const contentFixtureTestSource = readFileSync(contentFixtureTestPath, 'utf8')
for (const needle of [
  'fetchPublicGitHubPreviewSnapshot',
  'createPublicPreviewDraft',
  'not_found',
  'rate_limited',
  'empty public repository lists',
  'Authorization',
  'github-public-repos.json',
  'github-public-readme.md',
]) {
  if (!contentFixtureTestSource.includes(needle)) {
    throw new Error(`GitHub Public Service A8 fixture tests must cover ${needle}.`)
  }
}

console.log(`[content-layer-guards] ${componentFiles.length} component files all source data via src/content; repository + schema + Builder Graph + GitHub Connector + GitHub Graph Adapter + Public Preview + GitHub Public Service + fixture tests present.`)
