import { projects as rawProjects } from '../data/projects'
import { photos as rawPhotos } from '../data/life'
import { facts as rawFacts } from '../data/about'
import { skillRows as rawSkillRows } from '../data/skills'
import { archiveThemes as rawArchiveThemes } from '../data/frames'
import { createStaticRepository } from './adapters/static'

// Public content surface. UI components import types + data from here, never from
// src/data/* directly — so the data source is an adapter swap, not a component
// rewrite. (plan/02-system-boundaries.md)

export * from './schema'

// Single-object panels: no collection semantics needed, re-export directly.
export { archiveIntro, archiveOutro } from '../data/frames'

// Repositories (the swap point). Today every collection is static; the studio
// (plan 03) will point individual repos at MDX/DB adapters without UI changes.
export const projectsRepo = createStaticRepository(rawProjects, (item) => item.id)
export const photosRepo = createStaticRepository(rawPhotos, (item) => item.src)
export const factsRepo = createStaticRepository(rawFacts, (item) => item.label)
export const skillsRepo = createStaticRepository(rawSkillRows, (item) => item.index)
export const framesRepo = createStaticRepository(rawArchiveThemes, (item) => item.id)

// Sync, bundled landing data — what the landing components actually render.
export const projects = projectsRepo.all()
export const photos = photosRepo.all()
export const facts = factsRepo.all()
export const skillRows = skillsRepo.all()
export const archiveThemes = framesRepo.all()
export const archiveImages = archiveThemes.flatMap((theme) => (
  theme.clusters.flatMap((cluster) => cluster.slots.map((slot) => slot.image))
))
