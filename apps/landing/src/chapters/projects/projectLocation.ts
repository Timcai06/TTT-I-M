export function projectLocation(href: string, projectId: string | null) {
  const url = new URL(href)
  if (projectId) { url.searchParams.set('project', projectId); url.hash = 'projects' }
  else url.searchParams.delete('project')
  return url.pathname + url.search + url.hash
}

export function readProjectLocation(href: string, ids: readonly string[]) {
  const id = new URL(href).searchParams.get('project')
  return id && ids.includes(id) ? id : null
}
