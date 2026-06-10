# Studio Editorial Archive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Studio `/blog` and `/work` from basic text/card pages into a lightweight Quiet Editorial Archive with polished blog reading and structured work case studies.

**Architecture:** Keep all changes inside the Studio app and shared content type package. Extend the static work data contract with optional editorial fields, then update route markup and Studio CSS without importing landing runtime libraries. Preserve MDX posts, RSS, sitemap, and static generation behavior.

**Tech Stack:** Next App Router, React 19, TypeScript, CSS, `@timcai/content`, Studio MDX pipeline via `next-mdx-remote/rsc` and `gray-matter`.

---

## File Structure

- Modify `packages/content/src/index.ts`: extend `WorkEntry` with optional editorial case-study fields.
- Modify `apps/studio/content/index.ts`: enrich static work entries using the new optional fields.
- Modify `apps/studio/app/blog/page.tsx`: replace basic grid with featured post plus archive list.
- Modify `apps/studio/app/blog/[slug]/page.tsx`: add polished article header and metadata strip.
- Modify `apps/studio/app/work/page.tsx`: replace generic grid with archive ledger rows.
- Modify `apps/studio/app/work/[slug]/page.tsx`: add structured case-study sections and external links.
- Modify `apps/studio/app/studio.css`: add Quiet Editorial Archive layout, article, ledger, and responsive styles.

---

### Task 1: Extend Work Content Contract

**Files:**
- Modify: `packages/content/src/index.ts`
- Modify: `apps/studio/content/index.ts`

- [ ] **Step 1: Extend `WorkEntry` with optional editorial fields**

Edit `packages/content/src/index.ts` so `WorkEntry` becomes:

```ts
export interface WorkEntry {
  description: string
  href: string
  liveUrl?: string
  meta: ContentMeta
  notes?: string[]
  repository?: string
  slug: string
  stack?: string[]
  status?: string
  summary?: string
  tags: string[]
  title: string
  year?: string
}
```

- [ ] **Step 2: Enrich the existing work entry**

Edit `apps/studio/content/index.ts` so the `landing-system` entry includes:

```ts
{
  description: 'The existing Vite landing remains the cinematic entry surface with stage, preload, WebGL, Frame, and chapter systems isolated from content pages.',
  href: '/',
  liveUrl: '/',
  meta: {
    ...defaultMeta,
    publishedAt: '2026-06-05',
  },
  notes: [
    'Stage and preload systems keep the cinematic opening deterministic while still reporting real resource progress.',
    'Frame, Life, Work, and Contact sections remain in the landing runtime instead of leaking into Studio.',
    'Mobile rules are handled as a dedicated experience layer so desktop composition stays intact.',
  ],
  repository: 'https://github.com/Timcai06/TTT-I-M',
  slug: 'landing-system',
  stack: ['Vite', 'React', 'GSAP', 'R3F', 'WebGL', 'Playwright'],
  status: 'Live system',
  summary: 'A cinematic portfolio runtime separated from the lighter Studio content surface.',
  tags: ['Vite', 'GSAP', 'WebGL', 'Frame'],
  title: 'TTT I M Landing System',
  year: '2026',
}
```

- [ ] **Step 3: Run shared typecheck**

Run:

```bash
npm run typecheck
```

Expected: command exits `0`. If it fails, fix only type errors caused by this task.

- [ ] **Step 4: Commit content contract changes**

Run:

```bash
git add packages/content/src/index.ts apps/studio/content/index.ts
git commit -m "Extend Studio work content contract"
```

Expected: commit succeeds.

---

### Task 2: Redesign Blog Index as Editorial Archive

**Files:**
- Modify: `apps/studio/app/blog/page.tsx`
- Modify: `apps/studio/app/studio.css`

- [ ] **Step 1: Replace blog index markup**

Edit `apps/studio/app/blog/page.tsx` to use featured and archive sections:

```tsx
import Link from 'next/link'
import { posts } from '../../content'

export const metadata = {
  title: 'Blog',
  description: 'Studio essays and platform notes.',
}

export default function BlogIndex() {
  const allPosts = posts.all()
  const [featuredPost, ...archivePosts] = allPosts

  return (
    <>
      <section className="studio-hero studio-hero--editorial">
        <div className="studio-eyebrow">Studio / Blog</div>
        <h1 className="studio-title">Notes from the building table.</h1>
        <p className="studio-copy">
          Essays, platform notes, and quiet records from the systems behind Tim Cai Studio.
        </p>
      </section>

      {featuredPost ? (
        <section className="studio-feature" aria-label="Featured post">
          <div className="studio-section-label">Latest Dispatch</div>
          <Link className="studio-feature__card" href={`/blog/${featuredPost.slug}`}>
            <span className="studio-feature__meta">
              {featuredPost.meta.publishedAt} · {featuredPost.readingMinutes ?? 1} min read
            </span>
            <h2>{featuredPost.title}</h2>
            <p>{featuredPost.excerpt}</p>
            <span className="studio-feature__arrow" aria-hidden="true">Read essay ↗</span>
          </Link>
        </section>
      ) : null}

      <section className="studio-archive" aria-label="Post archive">
        <div className="studio-section-label">Archive</div>
        <div className="studio-archive__list">
          {archivePosts.map((post, index) => (
            <Link className="studio-archive-row" href={`/blog/${post.slug}`} key={post.slug}>
              <span className="studio-archive-row__index">{String(index + 2).padStart(2, '0')}</span>
              <span className="studio-archive-row__meta">
                {post.meta.publishedAt} · {post.readingMinutes ?? 1} min
              </span>
              <span className="studio-archive-row__body">
                <strong>{post.title}</strong>
                <span>{post.excerpt}</span>
              </span>
              <span className="studio-archive-row__arrow" aria-hidden="true">↗</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  )
}
```

- [ ] **Step 2: Add blog archive CSS**

Append CSS to `apps/studio/app/studio.css` near the existing card/grid styles:

```css
.studio-hero--editorial {
  max-width: 980px;
}

.studio-section-label {
  margin-bottom: 18px;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--fg-dim);
}

.studio-feature {
  display: grid;
  gap: 0;
  margin-bottom: clamp(52px, 9vw, 96px);
}

.studio-feature__card {
  position: relative;
  display: grid;
  gap: 22px;
  padding: clamp(28px, 5vw, 56px);
  border: 1px solid var(--line-strong);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.012)),
    var(--bg);
  overflow: hidden;
}

.studio-feature__card::after {
  content: '';
  position: absolute;
  inset: auto clamp(28px, 5vw, 56px) 0 0;
  height: 1px;
  background: linear-gradient(90deg, var(--accent), transparent);
  opacity: 0.5;
}

.studio-feature__meta,
.studio-archive-row__index,
.studio-archive-row__meta {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--fg-dim);
}

.studio-feature__card h2 {
  max-width: 760px;
  margin: 0;
  font-family: var(--font-serif);
  font-size: clamp(34px, 6vw, 72px);
  font-weight: 400;
  line-height: 0.98;
  letter-spacing: -0.045em;
}

.studio-feature__card p {
  max-width: 620px;
  margin: 0;
  color: var(--fg-mute);
  font-size: clamp(15px, 1.5vw, 18px);
  line-height: 1.75;
}

.studio-feature__arrow {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--accent-warm);
}

.studio-archive {
  display: grid;
}

.studio-archive__list {
  border-top: 1px solid var(--line-strong);
}

.studio-archive-row {
  display: grid;
  grid-template-columns: 56px minmax(140px, 0.34fr) minmax(0, 1fr) 32px;
  gap: clamp(16px, 3vw, 32px);
  align-items: start;
  padding: 24px 0;
  border-bottom: 1px solid var(--line);
  transition: color 0.2s, border-color 0.2s;
}

.studio-archive-row:hover {
  border-color: var(--line-strong);
}

.studio-archive-row__body {
  display: grid;
  gap: 8px;
}

.studio-archive-row__body strong {
  font-family: var(--font-serif);
  font-size: clamp(22px, 3vw, 36px);
  font-weight: 400;
  line-height: 1.05;
  letter-spacing: -0.03em;
}

.studio-archive-row__body span {
  max-width: 620px;
  color: var(--fg-mute);
  font-size: 14px;
  line-height: 1.65;
}

.studio-archive-row__arrow {
  color: var(--accent);
  opacity: 0.55;
  transition: transform 0.2s, opacity 0.2s;
}

.studio-archive-row:hover .studio-archive-row__arrow {
  transform: translate(2px, -2px);
  opacity: 1;
}
```

- [ ] **Step 3: Run Studio typecheck**

Run:

```bash
npm run typecheck:studio
```

Expected: command exits `0`.

- [ ] **Step 4: Commit blog index redesign**

Run:

```bash
git add apps/studio/app/blog/page.tsx apps/studio/app/studio.css
git commit -m "Redesign Studio blog archive"
```

Expected: commit succeeds.

---

### Task 3: Polish Blog Article Reading Surface

**Files:**
- Modify: `apps/studio/app/blog/[slug]/page.tsx`
- Modify: `apps/studio/app/studio.css`

- [ ] **Step 1: Replace blog detail article header**

Edit `apps/studio/app/blog/[slug]/page.tsx` return markup to:

```tsx
return (
  <>
    <Link href="/blog" className="studio-back">All posts</Link>
    <article className="studio-article studio-article--post">
      <header className="studio-article__header">
        <div className="studio-eyebrow">Studio Essay</div>
        <h1 className="studio-title">{post.title}</h1>
        <p className="studio-copy">{post.excerpt}</p>
        <dl className="studio-meta-strip" aria-label="Article metadata">
          <div>
            <dt>Date</dt>
            <dd>{post.meta.publishedAt}</dd>
          </div>
          <div>
            <dt>Author</dt>
            <dd>{post.meta.author}</dd>
          </div>
          <div>
            <dt>Read</dt>
            <dd>{post.readingMinutes ?? 1} min</dd>
          </div>
        </dl>
      </header>
      <MdxContent body={post.body} />
    </article>
  </>
)
```

Keep imports, `generateStaticParams`, `generateMetadata`, and `notFound()` behavior unchanged.

- [ ] **Step 2: Add article metadata CSS**

Append CSS near the article styles in `apps/studio/app/studio.css`:

```css
.studio-article--post {
  max-width: 820px;
}

.studio-article__header {
  display: grid;
  gap: 20px;
  padding-bottom: 34px;
  border-bottom: 1px solid var(--line-strong);
}

.studio-meta-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1px;
  margin: 18px 0 0;
  padding: 0;
  border: 1px solid var(--line);
  background: var(--line);
}

.studio-meta-strip div {
  display: grid;
  gap: 8px;
  padding: 14px 16px;
  background: var(--bg);
}

.studio-meta-strip dt,
.studio-meta-strip dd {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.studio-meta-strip dt {
  color: var(--fg-dim);
}

.studio-meta-strip dd {
  color: var(--fg-mute);
}
```

- [ ] **Step 3: Adjust MDX body rhythm if needed**

In `apps/studio/app/studio.css`, keep `.studio-mdx` but ensure it has comfortable article rhythm:

```css
.studio-mdx {
  display: grid;
  gap: 30px;
  padding-top: 52px;
  color: var(--fg-soft);
  font-size: clamp(17px, 1.65vw, 20px);
  line-height: 1.82;
}
```

- [ ] **Step 4: Run Studio typecheck**

Run:

```bash
npm run typecheck:studio
```

Expected: command exits `0`.

- [ ] **Step 5: Commit article polish**

Run:

```bash
git add 'apps/studio/app/blog/[slug]/page.tsx' apps/studio/app/studio.css
git commit -m "Polish Studio article reading surface"
```

Expected: commit succeeds.

---

### Task 4: Redesign Work Index as Archive Ledger

**Files:**
- Modify: `apps/studio/app/work/page.tsx`
- Modify: `apps/studio/app/studio.css`

- [ ] **Step 1: Replace work index markup**

Edit `apps/studio/app/work/page.tsx` to:

```tsx
import Link from 'next/link'
import { works } from '../../content'

export const metadata = {
  title: 'Work',
  description: 'Repository-backed work index for future detail pages.',
}

export default function WorkIndex() {
  return (
    <>
      <section className="studio-hero studio-hero--editorial">
        <div className="studio-eyebrow">Studio / Work</div>
        <h1 className="studio-title">Case notes for systems that shipped.</h1>
        <p className="studio-copy">
          A quieter index of projects, prototypes, and infrastructure decisions behind the public portfolio.
        </p>
      </section>

      <section className="studio-work-ledger" aria-label="Work archive">
        <div className="studio-section-label">Selected Systems</div>
        <div className="studio-work-ledger__list">
          {works.all().map((work, index) => (
            <Link className="studio-work-row" href={`/work/${work.slug}`} key={work.slug}>
              <span className="studio-work-row__index">{String(index + 1).padStart(2, '0')}</span>
              <span className="studio-work-row__meta">
                {work.year ?? work.meta.publishedAt ?? 'Now'} · {work.status ?? 'Case study'}
              </span>
              <span className="studio-work-row__body">
                <strong>{work.title}</strong>
                <span>{work.summary ?? work.description}</span>
                <span className="studio-pills" aria-label="Tags">
                  {work.tags.map((tag) => (
                    <span className="studio-pill" key={tag}>{tag}</span>
                  ))}
                </span>
              </span>
              <span className="studio-work-row__arrow" aria-hidden="true">↗</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  )
}
```

- [ ] **Step 2: Add work ledger CSS**

Append CSS to `apps/studio/app/studio.css`:

```css
.studio-work-ledger {
  display: grid;
}

.studio-work-ledger__list {
  border-top: 1px solid var(--line-strong);
}

.studio-work-row {
  display: grid;
  grid-template-columns: 56px minmax(170px, 0.3fr) minmax(0, 1fr) 32px;
  gap: clamp(16px, 3vw, 32px);
  align-items: start;
  padding: clamp(26px, 4vw, 42px) 0;
  border-bottom: 1px solid var(--line);
}

.studio-work-row__index,
.studio-work-row__meta {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--fg-dim);
}

.studio-work-row__body {
  display: grid;
  gap: 12px;
}

.studio-work-row__body strong {
  font-family: var(--font-serif);
  font-size: clamp(28px, 4vw, 52px);
  font-weight: 400;
  line-height: 0.98;
  letter-spacing: -0.04em;
}

.studio-work-row__body > span:not(.studio-pills) {
  max-width: 680px;
  color: var(--fg-mute);
  font-size: 15px;
  line-height: 1.7;
}

.studio-work-row__arrow {
  color: var(--accent);
  opacity: 0.55;
  transition: transform 0.2s, opacity 0.2s;
}

.studio-work-row:hover .studio-work-row__arrow {
  transform: translate(2px, -2px);
  opacity: 1;
}
```

- [ ] **Step 3: Run Studio typecheck**

Run:

```bash
npm run typecheck:studio
```

Expected: command exits `0`.

- [ ] **Step 4: Commit work index redesign**

Run:

```bash
git add apps/studio/app/work/page.tsx apps/studio/app/studio.css
git commit -m "Redesign Studio work ledger"
```

Expected: commit succeeds.

---

### Task 5: Build Work Detail Case Study Skeleton

**Files:**
- Modify: `apps/studio/app/work/[slug]/page.tsx`
- Modify: `apps/studio/app/studio.css`

- [ ] **Step 1: Replace work detail markup**

Edit `apps/studio/app/work/[slug]/page.tsx` return markup to:

```tsx
return (
  <>
    <Link href="/work" className="studio-back">All work</Link>
    <article className="studio-article studio-case-study">
      <header className="studio-article__header">
        <div className="studio-eyebrow">Studio Case Study</div>
        <h1 className="studio-title">{work.title}</h1>
        <p className="studio-copy">{work.summary ?? work.description}</p>
        <dl className="studio-meta-strip" aria-label="Work metadata">
          <div>
            <dt>Year</dt>
            <dd>{work.year ?? work.meta.publishedAt ?? 'Now'}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{work.status ?? 'Case study'}</dd>
          </div>
          <div>
            <dt>Focus</dt>
            <dd>{work.tags.slice(0, 2).join(' / ')}</dd>
          </div>
        </dl>
      </header>

      <section className="studio-case-section">
        <div className="studio-section-label">Overview</div>
        <p>{work.description}</p>
      </section>

      {work.stack?.length ? (
        <section className="studio-case-section">
          <div className="studio-section-label">Stack</div>
          <div className="studio-pills" aria-label="Stack">
            {work.stack.map((item) => (
              <span className="studio-pill" key={item}>{item}</span>
            ))}
          </div>
        </section>
      ) : null}

      {work.notes?.length ? (
        <section className="studio-case-section">
          <div className="studio-section-label">Notes</div>
          <ul className="studio-case-notes">
            {work.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="studio-case-section studio-case-links" aria-label="Project links">
        {work.liveUrl ? <Link href={work.liveUrl}>Open live surface ↗</Link> : null}
        {work.repository ? <Link href={work.repository}>Open repository ↗</Link> : null}
      </section>
    </article>
  </>
)
```

Keep imports, `generateStaticParams`, `generateMetadata`, and `notFound()` behavior unchanged.

- [ ] **Step 2: Add case study CSS**

Append CSS to `apps/studio/app/studio.css`:

```css
.studio-case-study {
  max-width: 900px;
}

.studio-case-section {
  display: grid;
  gap: 18px;
  padding: clamp(34px, 6vw, 58px) 0;
  border-bottom: 1px solid var(--line);
}

.studio-case-section p {
  max-width: 680px;
  margin: 0;
  color: var(--fg-soft);
  font-size: clamp(16px, 1.6vw, 19px);
  line-height: 1.8;
}

.studio-case-notes {
  display: grid;
  gap: 14px;
  max-width: 760px;
  margin: 0;
  padding-left: 1.2em;
  color: var(--fg-mute);
  line-height: 1.75;
}

.studio-case-notes li::marker {
  color: var(--accent);
}

.studio-case-links {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  border-bottom: 0;
}

.studio-case-links a {
  display: inline-flex;
  padding: 10px 12px;
  border: 1px solid var(--line-strong);
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--fg-mute);
  transition: border-color 0.2s, color 0.2s;
}

.studio-case-links a:hover {
  border-color: var(--accent);
  color: var(--fg);
}
```

- [ ] **Step 3: Run Studio typecheck**

Run:

```bash
npm run typecheck:studio
```

Expected: command exits `0`.

- [ ] **Step 4: Commit work detail skeleton**

Run:

```bash
git add 'apps/studio/app/work/[slug]/page.tsx' apps/studio/app/studio.css
git commit -m "Build Studio work case study skeleton"
```

Expected: commit succeeds.

---

### Task 6: Add Responsive Editorial Rules and Final Verification

**Files:**
- Modify: `apps/studio/app/studio.css`

- [ ] **Step 1: Replace the existing mobile media query**

At the bottom of `apps/studio/app/studio.css`, replace the current `@media (max-width: 640px)` block with:

```css
@media (max-width: 760px) {
  .studio-shell__header {
    align-items: flex-start;
    gap: 18px;
    padding: 18px 20px;
  }

  .studio-shell__nav {
    gap: 14px;
  }

  .studio-shell {
    width: min(100% - 40px, 1080px);
    padding-block: 64px 88px;
  }

  .studio-grid,
  .studio-meta-strip {
    grid-template-columns: 1fr;
  }

  .studio-feature__card {
    padding: 28px 22px;
  }

  .studio-archive-row,
  .studio-work-row {
    grid-template-columns: 42px minmax(0, 1fr) 26px;
    gap: 14px;
  }

  .studio-archive-row__meta,
  .studio-work-row__meta {
    grid-column: 2 / -1;
    grid-row: 1;
  }

  .studio-archive-row__body,
  .studio-work-row__body {
    grid-column: 2 / -1;
  }

  .studio-archive-row__arrow,
  .studio-work-row__arrow {
    grid-column: 3;
    grid-row: 2;
  }

  .studio-case-links {
    display: grid;
  }
}

@media (max-width: 480px) {
  .studio-shell__header {
    position: static;
  }

  .studio-shell__nav {
    width: 100%;
    justify-content: space-between;
  }

  .studio-title {
    font-size: clamp(38px, 16vw, 64px);
  }
}
```

- [ ] **Step 2: Run Studio typecheck**

Run:

```bash
npm run typecheck:studio
```

Expected: command exits `0`.

- [ ] **Step 3: Run Studio build**

Run:

```bash
npm run build:studio
```

Expected: command exits `0` and lists generated Studio routes.

- [ ] **Step 4: Run root typecheck**

Run:

```bash
npm run typecheck
```

Expected: command exits `0`.

- [ ] **Step 5: Inspect changed files**

Run:

```bash
git diff --stat
```

Expected: changes are limited to Studio route/CSS files and `packages/content/src/index.ts` unless implementation revealed a necessary adjacent change.

- [ ] **Step 6: Commit final responsive pass**

Run:

```bash
git add apps/studio/app/studio.css
git commit -m "Add responsive Studio editorial rules"
```

Expected: commit succeeds if CSS changed. If there are no remaining CSS changes because they were committed in earlier tasks, skip this commit and note that final verification passed with no extra diff.

---

## Self-Review Checklist

- Spec coverage: Tasks cover blog index, blog detail, work index, work detail, data contract, responsive behavior, lightweight runtime constraint, and verification.
- Placeholder scan: No `TBD`, `TODO`, `FIXME`, or unspecified implementation steps should remain in this plan.
- Type consistency: `year`, `status`, `summary`, `stack`, `repository`, `liveUrl`, and `notes` match the `WorkEntry` fields defined in Task 1.
- Runtime boundary: No task imports GSAP, Three, R3F, Lenis, landing preload, or landing stage systems into Studio.
