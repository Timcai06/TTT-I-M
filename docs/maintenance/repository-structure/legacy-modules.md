# Legacy module disposition — batch 3

Source baseline: `4155975`. After the chapter move (`8de990b`) and room plan (`277a826`), a fresh source/test/tool search confirmed 14 retired modules and 3 modules that must remain. This record describes the batch 3 source result; the implementation checkout is `chore/repo-structure`. No ignored artifacts or model assets were removed.

The check searched literal names/import paths across `apps/landing/src`, `apps/landing/tests`, `tools`, and `packages` with `rtk proxy rg -n`, then inspected direct file reads in build guards, E2E selectors, the Canvas UI integrity manifest, and the local clearance runner. This accounts for references outside the app import graph. `apps/landing/src/components/personal-archive/` below is the pre-feature-migration location; this batch does not move the room feature.

| Baseline candidate under `apps/landing/src/` | Final status | Decisive evidence and disposition |
| --- | --- | --- |
| `components/ASCIIText.tsx` | Deleted | Contact mounts static `FooterArtwork` (`chapters/contact/Footer.tsx`); the old canvas had only stale guard reads. Build guards now test current Contact behavior, and two E2E checks now assert loaded static artwork/absence of ASCII. |
| `components/Footer.tsx` | Deleted | Deprecated forwarding facade with no importer; current entry is `chapters/contact/index.ts`. |
| `components/Projects.tsx` | Deleted | Unused forwarding facade; current entry is `chapters/projects/index.ts`. |
| `components/personal-archive/ArchiveChapterRoom.tsx` | Deleted | Disconnected React Three Fiber room; current `App.tsx` mounts `ArchiveStage`/`archiveRuntime`. |
| `components/personal-archive/ArchiveLighting.tsx` | Deleted | Only old room components imported it; current renderer uses `archiveRuntimeLighting.ts`. |
| `components/personal-archive/ArchiveRoom.tsx` | Deleted | Disconnected old room; no app/test/tool caller. |
| `components/personal-archive/ArchiveSignal.tsx` | Deleted | Only old `ArchiveChapterRoom` imported it; current renderer uses `archiveRuntimeSignal.ts`. |
| `components/personal-archive/archiveStoryShadow.ts` | Deleted | Old writer was test-only. Its six writer tests retired; the post-render runtime diagnostic test moved to `tests/archiveExecution.test.ts`, and two scene-description/binding tests moved to `tests/archiveBindingContract.test.ts` with a direct `sceneBindings.ts` import. |
| `components/personal-archive/chapterProjection.ts` | Deleted | Only old R3F rooms used it; current runtime projects via `archiveReadingSurface.ts`. `pageProjection.ts` remains. |
| `components/skills/useSkillsFlowLine.ts` → `chapters/skills/useSkillsFlowLine.ts` after 2A | Deleted at the **post-2A** path | No current Skills caller. `tests/build/chapter-state-guards.mjs` retains its negative check that approved static Stack does not use the retired hook. |
| `content/repositories.ts` | Deleted | Unused type alias. Actual `KeyedCollectionRepository` contract lives in `packages/content/src/index.ts`; package `staticRepository.test.ts` exercises its behavior. The landing guard no longer checks token strings in this alias's comment. |
| `lab/personal-space/archiveClearance.ts` | Retained | `tools/personal_space/checks/verify-clearance.mjs` dynamically imports the diagnostic; `tests/archiveAnimationRig.test.ts` verifies its rig path. |
| `lib/canvas-ui/provenance.ts` | Retained | Holds upstream URL/license/commits; `tests/canvasUiIdentityEffects.test.ts` checks provenance. |
| `lib/canvas-ui/vendor/Bend/BendVanilla.ts` | Retained | `vendor/integrity.json` pins revision/SHA; `tests/build/canvas-vendor-integrity.mjs` checks inventory, digest and program boundary. Vendor/license scope is not a dead-code cleanup. |
| `lib/magnetic.ts` | Deleted | No app, test or tool consumer of `attachMagnetic`. |
| `lib/scheduleIdle.ts` | Deleted | No app, test or tool consumer of `scheduleIdle`. |
| `lib/skillsFlowPath.ts` | Deleted | Only the retired Skills hook and its five unit tests used it. |

Related removals outside the 17 candidates: exclusive `styles/components/ascii-text.css`, the obsolete `.footer__ascii` selectors in `styles/components/footer.css`, its single import in `styles/app.css`, and the two obsolete test files `tests/archiveStoryShadow.test.ts` and `tests/skillsFlowPath.test.ts`. The three meaningful shadow tests remain in existing suites. E2E checks now cover Contact's static artwork, the Frame-to-Stack release and readable static Stack instead of positively requiring the retired ASCII canvas or Skills flow. The E2E performance label also describes static artwork. Current `FooterArtwork`, Contact content/layout classes and CSS cascade layer order remain. `styles/global.css:270` still contains an old `.skills__flow-svg` selector; global CSS is outside this batch's edit scope, so that dead selector is deferred.

Test inventory effect: the nine old shadow tests became three relocated current-contract tests (six writer tests retired), and five unused Skills path tests retired. The root verification passed: landing 209 + content 30 + studio 5 = **244** tests. Typecheck, lint and complete build guards also passed; see [batch verification](verification.md). The package repository tests remain behavioral; no placeholder tests were added. This count excludes E2E tests, whose assertions were updated rather than removed. Browser behavior and visual quality are not claimed by this source-level result.
