# Tests, Guards & CI Pipeline

## Command Dictionary
- `npm run typecheck`: Runs `tsc` to ensure TypeScript safety (especially critical for R3F generics and GSAP typing).
- `npm run lint`: ESLint checks. Enforces hook dependencies and code style.
- `npm run test:unit`: Runs content, Studio, and Landing unit suites in one command.
- `npm run test:studio`: Runs the Studio MDX publication and URL/link-boundary tests directly.
- `npm run test:build`: A meta-script that runs multiple build guards to ensure architectural integrity before deployment.
- `npm run test:e2e`: Builds Landing, starts an isolated production preview on port 4173, and runs the Chromium engineering suites with one worker. It never reuses a developer server.
- `npm run test:e2e:canvas-experimental`: Runs only the explicit CanvasDrawElement lane with Chromium feature flags; stable Chromium skips these two assertions.

## Build Guards (`test:build:*`)
Located in `tests/build/`, these scripts analyze the codebase to enforce structural rules:
- **Chunk Guards** (`chunk-guards.mjs`): Verifies that `three-core`, `react-three-fiber`, `gsap-vendor`, and deferred feature chunks remain split and within budget.
- **Visual-contract Guards**: Pin the narrative spec, effect manifest, development-only Lab boundary, CSS cascade layers, and deferred UI chunks.
- **Architecture Guards** (`chapter-state-guards.mjs`): Ensures Chapter state management is unbroken.
- **Frame Architecture Guards** (`frame-architecture-guards.mjs`): Enforces rules specific to the horizontal scroll Frame section.
- **Loader/Preload Guards** (`loader-preload-guards.mjs`): Validates that all necessary assets, including the Liquid Metal and Spark renderer documents, are registered in the preload manifest and retain abort-safe shared-resource semantics.
- **Canvas Vendor Integrity** (`canvas-vendor-integrity.mjs`): Pins every vendored Canvas UI file to an exact SHA-256 and upstream commit/local-adapter classification.
- **Deferred Image Budget Guards** (`deferred-image-budget-guards.mjs`): Keeps the deferred landing manifest inside the agreed byte budget so background preloading does not become an invisible LCP/CPU tax.
- **Platform Guards** (`platform-guards.mjs`): Enforces workspace split, Studio runtime isolation, ordered ≤500-line Studio CSS modules, the GitHub validation/transport/success-cache/orchestration split, strict MDX publication and authored-link boundaries, shared tokens, isolated production-preview Playwright, deferred Vercel observability wiring, immutable hashed-asset caching, exact CSP hashes for canonical and play-variant inline renderer scripts, and deterministic Node/npm deployment contracts.

## End-to-End Testing (`Playwright`)
Critical paths verified:
- The Loader completes and unmounts gracefully.
- Lenis scroll hijacking functions without locking the page.
- Chapter transitions execute without throwing errors or causing memory leaks.
- `tests/e2e/frame.spec.ts` specifically guards the horizontal scroll behaviors.
- `tests/e2e/performance.spec.ts` covers LCP, long tasks, CLS, heap, scroll-scrub, stage/overlay cleanup, INP, and FPS-p95. CI uses relaxed env budgets where 2-core headless runners are noisy; local browser runs are the stricter signal.

## Content-layer guard
- `content-layer-guards.mjs`: scans both `components/**` and `chapters/**`, rejects direct `data/*` imports, and asserts the repository/schema plus intrinsic media and evidence contracts.

## Dependency security
- Dependabot maintains grouped npm runtime/toolchain and GitHub Actions update PRs. Registry-backed advisory scans are not run implicitly: they transmit the workspace dependency graph and require explicit project-owner authorization.
- Do not use `npm audit fix --force`; inspect the exact advisory and dependency path, apply the smallest compatible update, then rerun both app builds.

## Guard coverage gaps (important — "build green" ≠ "works in prod")
Build guards are **static source-string assertions**. They do NOT exercise runtime, so they cannot catch deploy/integration failures on their own. Runtime complements:
- **Cross-zone smoke**: push CI first polls non-cacheable Landing/Studio metadata until both report the full `${{ github.sha }}`, then checks archive and representative detail routes on the canonical origin. Every referenced `/_next` CSS/JS asset must return the correct status and content type; RSS and sitemap must also expose valid XML payloads. It cannot pass against a previous deployment.
- **Perf/context gates**: `performance.spec.ts` covers INP and FPS-p95 in addition to LCP / long-task / CLS / heap / scroll-scrub / stage / overlay; `effects-context.spec.ts` traverses chapters and enforces the two-canvas ceiling.
- **Degradation e2e (implemented)**: `degradation.spec.ts` — reduced-motion, simulated WebGL failure, a 404 image, and a missing fingerprinted Liquid Metal renderer must not strand the Loader or Work gate; CI-blocking (`e2e-gates`).
