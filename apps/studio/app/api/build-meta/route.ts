export const dynamic = 'force-dynamic'

function deploymentCommit(): string {
  const candidate = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA ?? ''
  return /^[a-f\d]{7,40}$/i.test(candidate) ? candidate.toLowerCase() : 'local'
}

export function GET() {
  return Response.json(
    { application: 'studio', commit: deploymentCommit() },
    { headers: { 'cache-control': 'no-store, max-age=0' } },
  )
}
