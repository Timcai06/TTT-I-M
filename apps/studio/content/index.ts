import { createStaticRepository, portfolioProjects, type Post, type WorkEntry } from '@timcai/content'
import { readPosts } from './mdx'

export const posts = createStaticRepository<Post>(readPosts())

export const works = createStaticRepository<WorkEntry>(portfolioProjects)
