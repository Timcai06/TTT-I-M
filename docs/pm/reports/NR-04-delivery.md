# NR-04 DEV Delivery

Status: **DELIVERED FOR PM/QA REVIEW**  
Task: `NR-04 — Global rollout through Stack reading`  
Branch: `feat/narrative-kernel`  
Recorded HEAD: `55c08029051b11e9687d869747907e20291940fa`  
Working tree: dirty before and after this card; no pre-existing change was discarded.

## Delivered boundary

- One semantic story position, layout snapshot, and route-request protocol now describes all 13 segments from Index through Contact reading.
- The sample runtime is the sole camera/world/DOM/signal owner for Index, Entry, the five previously promoted sample segments, Frame → Stack, and Stack reading.
- Work and Contact are represented in the canonical story, but their final four segments deliberately return control to the legacy adapter. Their production takeover remains NR-05.
- Index inspection is explicit user state and can be cancelled/replaced independently of scroll position.
- Frame → Stack carries the stable Final Horizon identity `scenery/scenery-close/primary/image11/src` into both the monitor and the Stack photo viewer.
- The App-level `120/520/1100 ms` hash-correction sequence and the NR-03 temporary About camera-pose adapter were removed. No new permanent requestAnimationFrame loop or second state machine was added.

## Integration details

- The layout publisher combines the seven live chapter ranges into one 13-segment semantic clock. The overlapping Hero/Entry legacy triggers are normalized so Index retains its own non-zero range.
- Object routes for About, Life, Frame, and Stack now land through semantic segment positions. Project cards use their concrete card anchors and a bounded visual offset.
- Lenis pause ownership is tokenized, preventing dialog cleanup from unpausing a newer navigation request.
- Stack reading uses the live Skills surface and retires obsolete focus state. Required Stack surface bindings are covered by the scene contract tests.
- Final Horizon consumers resolve a composite semantic identity rather than array order; reverse ordering, missing identity, and duplicate identity are unit-tested.

## Verification

| Check | Result | Notes |
| --- | --- | --- |
| Unit suite | PASS — 159/159 | Semantic story, position, camera, execution, binding, object identity, and shadow coverage. |
| Typecheck | PASS | `tsc -p tsconfig.app.json --noEmit --pretty false`; rerun after the final route repair. |
| Task-scoped lint | PASS | No issues found in the NR-04 implementation/test set. |
| Landing production build | PASS | Existing dynamic-import and large-chunk warnings remain non-fatal. The build's asset setup did not change the protected GLB or scene contract hashes. |
| New global navigation E2E | PASS — 3/3 | Covers all 13 layout segments, new-segment sampling, forward/reverse/history, direct routes, Index cancellation, project-card offset, resize, GPU restore, Stack content, and the NR-05 legacy tail. |
| Existing E2E + NR-03 photo regression | 24/25, then repaired | The single failure exposed an About return landing on the old overlapping trigger coordinate. It was moved to the semantic route. |
| Targeted post-repair regression | PASS — 4/4 | The failed About case plus Life/Frame bookmarks, About/Life/Frame retract, and return cancellation/resize/GPU restoration all passed after the repair. |

The first browser attempt used an unavailable bundled Playwright browser and produced launch-only failures. Product verification was rerun with the installed system Chrome on port 4312; port 5173 was not used.

## Evidence

- [`global-story-samples.json`](../../../output/pm/NR-04/global-story-samples.json) — sampled semantic/runtime readback.
- [`frame-stack-final-horizon.png`](../../../output/pm/NR-04/frame-stack-final-horizon.png) — Frame → Stack signal displaying the actual Final Horizon image.
- [`stack-reading.png`](../../../output/pm/NR-04/stack-reading.png) — live Stack reading surface visible in the room.
- [`final-files.json`](../../../output/pm/NR-04/final-files.json) — delivery-candidate source and test hashes.
- [`rollback-status.json`](../../../output/pm/NR-04/rollback-status.json) — exact recovery boundary and protected-asset hashes.

The screenshots and automated readbacks prove that real content rendered and the selected state was coherent. They are not a claim of final human visual acceptance.

## Rollback and preservation

- `output/pm/NR-04/baseline.json` records 23 accepted starting hashes.
- `output/pm/NR-04/pm-preserved-accepted-files.json` stores exact accepted content for 16 files captured while still unchanged.
- Twenty-five accepted files had already changed before that content capture. Their exact NR-04 starting bytes are not available in that preservation file. Older baselines have different hashes and are not treated as exact replacements.
- A broad HEAD rollback is unsafe because the accepted NR-01–NR-03 runtime work is also uncommitted at the recorded HEAD. Any rollback must therefore use the preserved bytes where available and a reviewed inverse patch for the remaining NR-04 delta.

## Remaining gate

- PM/QA must review the evidence and run human visual acceptance.
- Work/Contact production ownership and full-site D1 promotion are explicitly not claimed by this delivery; they remain separate work under NR-05 and the later promotion gate.
- No commit, push, deployment, dependency/configuration change, or asset/model edit was made. The task-owned port 4312 service was stopped. An unrelated pre-existing process on port 5173 was observed and left untouched; NR-04 did not use it.
