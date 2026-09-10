# NR-01B-R1 · 已绑定动画完整轨道核验交付

```yaml
task_id: NR-01B-R1
card_version: 1
status: DELIVERED
thread_id: 01a08484-5199-7c22-b54e-38778cd5ed1d
model: gpt-5.6-sol
reasoning_effort: high
baseline:
  checkout: /Users/tim/DEV/TTT I'M/portfolio
  branch: feat/narrative-kernel
  head: 55c08029051b11e9687d869747907e20291940fa
  working_tree_evidence: /Users/tim/DEV/TTT I'M/portfolio/output/pm/NR-01B-R1/baseline-manifest.txt
changes:
  files:
    - apps/landing/src/components/personal-archive/sceneBindings.ts
    - apps/landing/tests/archiveBindingContract.test.ts
  report_file: /Users/tim/DEV/TTT I'M/portfolio/docs/pm/reports/NR-01B-R1-delivery.md
acceptance:
  - id: R1-1
    result: PASS
    evidence: Every channel of each selected clip is compared with that clip's declarations; undeclared channels include clip and target in structured diagnostics
  - id: R1-2
    result: PASS
    evidence: /Users/tim/DEV/TTT I'M/portfolio/output/pm/NR-01B-R1/channel-coverage.json; cross-clip target collision is attached to both affected bindings and their coverage becomes invalid
  - id: R1-3
    result: PASS
    evidence: Inspection only enumerates clip names selected by provided bindings; an overlapping unselected clip leaves the real inspection valid
  - id: R1-4
    result: PASS
    evidence: Three exact counterexamples assert status, issue code, bindingId, target detail, and coverage; existing real GLB, rename, and immutability cases remain passing
checks:
  - command_or_action: rtk node --test apps/landing/tests/archiveBindingContract.test.ts apps/landing/tests/narrativeObjects.test.ts apps/landing/tests/sampleStory.test.ts apps/landing/tests/narrativeSpec.test.ts
    scope: A+B four target files including R1 cases
    exit_code: 0
    result: PASS
    evidence: /Users/tim/DEV/TTT I'M/portfolio/output/pm/NR-01B-R1/checks.txt
  - command_or_action: rtk npm run typecheck:landing
    scope: Landing TypeScript project
    exit_code: 0
    result: PASS
    evidence: /Users/tim/DEV/TTT I'M/portfolio/output/pm/NR-01B-R1/checks.txt
  - command_or_action: scoped ESLint over sceneBindings.ts and archiveBindingContract.test.ts
    scope: NR-01B-R1 two writable TypeScript files
    exit_code: 0
    result: PASS
    evidence: /Users/tim/DEV/TTT I'M/portfolio/output/pm/NR-01B-R1/checks.txt
  - command_or_action: rtk git diff --check
    scope: current tracked working-tree diff
    exit_code: 0
    result: PASS
    evidence: /Users/tim/DEV/TTT I'M/portfolio/output/pm/NR-01B-R1/checks.txt
unverified:
  - AnimationAction weights and effective runtime ownership remain unavailable; this is static potential-conflict inspection only.
  - Runtime execution, matrices, visibility, DOM projection, browser behavior, and visual continuity were not checked.
  - Full build, full suite, services, Blender, commit, push, and NR-01C were not run.
risks_or_blockers: []
scope_deviations: []
rollback: Remove the two new issue codes, selected-clip channel/collision inspection block, and three R1 tests to restore the baseline hashes; remove only the R1 report/evidence and preserve A, B resolver/photo tests, original B report, and PM work.
cost:
  elapsed_minutes: unknown
  retries: 0
  tokens_or_cost: unknown
recommended_next_action: PM reproduce the original extra-channel case and decide whether NR-01B-R1 closes the parent-card rework; do not start NR-01C automatically.
```

## 结论

PM 复现的漏检已定点关闭。检查器现在验证每个已选 clip 的全部实际轨道，
而不仅是寻找一条期望轨道；仍然只做静态元数据分析，Action readback 保持
`unavailable: static-metadata-only`。

## 修订行为

- 已选 clip 出现未声明的 node/property 时，返回
  `undeclared-clip-channel`，并定位 clip、实际目标及负责 binding。
- 两个已选 clip 实际写入同一 node/property 时，返回
  `duplicate-scene-target-writer`，问题关联双方 binding，双方 coverage 均
  不再是 covered。
- 同一已选 clip 重复相同 channel 时，返回 `duplicate-scene-channel`。
- 没有被传入 binding 选择的其他动画不参与 writer 判断，不被误称为运行冲突。

## 范围

只修改 `sceneBindings.ts` 和 `archiveBindingContract.test.ts`。A 六文件、B
resolver/照片测试、原 B 报告、真实 GLB、runtime/ready、内容消费者及依赖均
保持原状；NR-01C 未开始。
