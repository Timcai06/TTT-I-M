# Tests, Guards & CI Pipeline

## Command Dictionary
- `npm run typecheck`: Runs `tsc` to ensure TypeScript safety (especially critical for R3F generics and GSAP typing).
- `npm run lint`: ESLint checks. Enforces hook dependencies and code style.
- `npm run test:build`: A meta-script that runs multiple build guards to ensure architectural integrity before deployment.
- `npm run test:e2e`: Playwright tests for critical user flows.

## Build Guards (`test:build:*`)
Located in `tests/build/`, these scripts analyze the codebase to enforce structural rules:
- **Chunk Guards** (`chunk-guards.mjs`): Verifies that `three-vendor`, `gsap-vendor`, etc., are correctly split and haven't bloated the main bundle.
- **Architecture Guards** (`chapter-state-guards.mjs`): Ensures Chapter state management is unbroken.
- **Frame Architecture Guards** (`frame-architecture-guards.mjs`): Enforces rules specific to the horizontal scroll Frame section.
- **Loader/Preload Guards** (`loader-preload-guards.mjs`): Validates that all necessary assets are correctly registered in the preload manifest.
- **Platform Guards** (`platform-guards.mjs`): Enforces workspace split, Studio runtime isolation, MDX-backed posts, shared tokens, and Vercel observability wiring.

## End-to-End Testing (`Playwright`)
Critical paths verified:
- The Loader completes and unmounts gracefully.
- Lenis scroll hijacking functions without locking the page.
- Chapter transitions execute without throwing errors or causing memory leaks.
- `tests/e2e/frame.spec.ts` specifically guards the horizontal scroll behaviors.

## Content-layer guard
- `content-layer-guards.mjs`: asserts no `apps/landing/src/components/**` file imports `data/*` directly (everything goes through `src/content`), and that the repository (`all()`/`list()`/`get()`) + schema (`ContentMeta`/`PublishState`) contracts exist.

## Guard coverage gaps (important — "build green" ≠ "works in prod")
Build guards are **static source-string assertions**. They do NOT exercise runtime, so they cannot catch deploy/integration failures on their own. Runtime complements:
- **Cross-zone smoke (implemented 2026-06-10)**: `tests/runtime/cross-zone-smoke.mjs` (`npm run test:smoke`, CI job `cross-zone-smoke` on pushes to main) fetches the deployed main domain and asserts `/blog`,`/work`,`/dashboard` HTML **and** their referenced `/_next/*.css|js` all return 200 — the unstyled-blog failure mode the string guards missed in 2026-06-05.
- **Perf gates (partial)**: `performance.spec.ts` covers LCP / long-task / CLS / heap / scroll-scrub / stage / overlay. **Still missing: INP, FPS p95, WebGL context-leak after repeated chapter jumps.**
- **Degradation e2e (implemented)**: `degradation.spec.ts` — reduced-motion / simulated WebGL failure / a 404 image must not strand the loader; CI-blocking (`e2e-gates`).
