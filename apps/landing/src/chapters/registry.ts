import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import Hero from '../components/Hero'

// Hero is eager: it paints first and hands the intro off to the loader.
// Everything below the fold is code-split and fetched on mount (in parallel,
// while the loader intro plays), so the initial app chunk only carries Hero.
type LazyChapterLoader = () => Promise<{ default: ComponentType }>

export const lazyChapterLoaders = {
  about: () => import('../components/About'),
  life: () => import('../components/LifeGallery'),
  frame: () => import('../components/Frame'),
  skills: () => import('../components/Skills'),
  workTransition: () => import('../components/WorkTransition'),
  projects: () => import('../components/Projects'),
  contact: () => import('../components/Footer'),
} satisfies Record<string, LazyChapterLoader>

export function preloadLazyChapters() {
  return Promise.all(Object.values(lazyChapterLoaders).map((load) => load())).then(() => undefined)
}

const About = lazy(lazyChapterLoaders.about)
const LifeGallery = lazy(lazyChapterLoaders.life)
const Frame = lazy(lazyChapterLoaders.frame)
const Skills = lazy(lazyChapterLoaders.skills)
const WorkTransition = lazy(lazyChapterLoaders.workTransition)
const Projects = lazy(lazyChapterLoaders.projects)
const Footer = lazy(lazyChapterLoaders.contact)

/**
 * A Chapter is one section of the narrative, rendered in order inside <main>.
 *
 * This registry is the single source of truth for page composition: the page
 * body (App), the top nav (Nav), and the scroll-progress rail (ScrollIndicator)
 * all derive from it. To add a new narrative section, add one entry here — the
 * nav link and progress segment appear automatically.
 *
 * `id` MUST match the DOM id the component renders on its <section>/<footer>,
 * because Nav scrolls to `#id` and ScrollIndicator measures `#id`.
 */
export interface Chapter {
  /** DOM id of the rendered section. Also used as React key. */
  id: string
  /** The section component rendered inside <main>. May be lazy-loaded. */
  Component: ComponentType | LazyExoticComponent<ComponentType>
  /** Top-nav entry. Omit to keep the chapter out of the nav. */
  nav?: { label: string }
  /** Scroll-progress rail entry. Omit to keep it off the rail. */
  progress?: { index: string; name: string }
}

export const chapters: Chapter[] = [
  {
    id: 'hero',
    Component: Hero,
    nav: { label: '00 · Index' },
    progress: { index: '01', name: 'HOME' },
  },
  {
    id: 'about',
    Component: About,
    nav: { label: '01 · About' },
    progress: { index: '02', name: 'ABOUT' },
  },
  {
    // The life gallery is an interstitial — intentionally absent from nav/rail.
    // 有意不纳入 nav/progress → 也不进 `lib/narrativeChapters` 的测量集合。
    // 后果（接受）：滑过它时 active 章节与背景色温会定格在上一节被追踪的章节。
    id: 'life',
    Component: LifeGallery,
  },
  {
    id: 'frame',
    Component: Frame,
    nav: { label: '02 · Frame' },
    progress: { index: '03', name: 'FRAME' },
  },
  {
    id: 'skills',
    Component: Skills,
    nav: { label: '03 · Stack' },
    progress: { index: '04', name: 'STACK' },
  },
  {
    // A cinematic bridge from capability to proof; intentionally navless.
    // 同样刻意不纳入 nav/rail/narrative 测量 —— 滑动期间 active/色温定格于 skills。
    id: 'work-transition',
    Component: WorkTransition,
  },
  {
    id: 'projects',
    Component: Projects,
    nav: { label: '04 · Work' },
    progress: { index: '05', name: 'WORK' },
  },
  {
    id: 'contact',
    Component: Footer,
    nav: { label: '05 · Contact' },
    progress: { index: '06', name: 'CONTACT' },
  },
]

/** Chapters that appear in the top nav, in document order. */
export const navChapters = chapters.filter(
  (c): c is Chapter & { nav: NonNullable<Chapter['nav']> } => Boolean(c.nav)
)

/** Chapters that appear on the scroll-progress rail, in document order. */
export const progressChapters = chapters.filter(
  (c): c is Chapter & { progress: NonNullable<Chapter['progress']> } => Boolean(c.progress)
)
