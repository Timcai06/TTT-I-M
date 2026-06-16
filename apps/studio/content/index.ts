import {
  createStaticRepository,
  portfolioProjects,
  type Post,
  type WorkEntry,
} from '@timcai/content'
import { timPublicDemoBuilderGraphRepository } from '@timcai/content/github-graph-adapter'
import { readPosts } from './mdx'

export const posts = createStaticRepository<Post>(readPosts())

export const works = createStaticRepository<WorkEntry>(portfolioProjects)

export const builderGraph = timPublicDemoBuilderGraphRepository
