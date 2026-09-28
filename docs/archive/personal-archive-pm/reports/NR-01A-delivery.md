# NR-01A · 五段故事纯语义采样交付

```yaml
task_id: NR-01A
card_version: 1
status: DELIVERED
thread_id: 01a08484-5199-7c22-b54e-38778cd5ed1d
model: gpt-5.6-sol
reasoning_effort: high
baseline:
  checkout: /Users/tim/DEV/TTT I'M/portfolio
  branch: feat/narrative-kernel
  head: 55c08029051b11e9687d869747907e20291940fa
  working_tree_evidence: /Users/tim/DEV/TTT I'M/portfolio/output/pm/NR-01A/baseline-manifest.txt
changes:
  files:
    - apps/landing/src/core/narrative/types.ts
    - apps/landing/src/core/narrative/specs.ts
    - apps/landing/src/core/narrative/index.ts
    - apps/landing/src/core/narrative/sampleStory.ts
    - apps/landing/tests/sampleStory.test.ts
    - apps/landing/tests/narrativeSpec.test.ts
  report_file: /Users/tim/DEV/TTT I'M/portfolio/docs/pm/reports/NR-01A-delivery.md
acceptance:
  - id: AC-1
    result: PASS
    evidence: /Users/tim/DEV/TTT I'M/portfolio/output/pm/NR-01A/checks.txt; fixed hand-written world, boundary, camera/presentation, and invalid-input expectations all passed
  - id: AC-2
    result: PASS
    evidence: /Users/tim/DEV/TTT I'M/portfolio/apps/landing/tests/sampleStory.test.ts; order/repetition, fresh nested references, frozen outputs, and unchanged input are asserted
  - id: AC-3
    result: PASS
    evidence: /Users/tim/DEV/TTT I'M/portfolio/output/pm/NR-01A/scope-final.txt; existing Work contract passed and sample data is not added to narrativeSpecs
  - id: AC-4
    result: PASS
    evidence: Pure data contract completed; picture/runtime integration was not made or claimed
checks:
  - command_or_action: rtk node --test apps/landing/tests/sampleStory.test.ts apps/landing/tests/narrativeSpec.test.ts
    scope: NR-01A target tests and existing narrative contract
    exit_code: 0
    result: PASS
    evidence: /Users/tim/DEV/TTT I'M/portfolio/output/pm/NR-01A/checks.txt
  - command_or_action: rtk npm run typecheck:landing
    scope: Landing TypeScript project
    exit_code: 0
    result: PASS
    evidence: /Users/tim/DEV/TTT I'M/portfolio/output/pm/NR-01A/checks.txt
  - command_or_action: scoped ESLint over the six changed TypeScript files
    scope: NR-01A product and test TypeScript only
    exit_code: 0
    result: PASS
    evidence: /Users/tim/DEV/TTT I'M/portfolio/output/pm/NR-01A/checks.txt
  - command_or_action: rtk git diff --check
    scope: current tracked working-tree diff
    exit_code: 0
    result: PASS
    evidence: /Users/tim/DEV/TTT I'M/portfolio/output/pm/NR-01A/checks.txt
unverified:
  - Browser and visual behavior were not checked; this card has no runtime consumer.
  - GLB bindings, DOM projection, navigation, actual camera matrices, and scene readback belong to later cards.
  - Full-site build, full unit suite, end-to-end tests, service startup, and Blender were not run per card scope.
risks_or_blockers:
  - Camera and presentation fields are semantic intentions only and may need an explicitly versioned revision after real binding and visual review.
scope_deviations: []
rollback: Restore the four pre-existing product/test files from output/pm/NR-01A/baseline (or the recorded HEAD paths), remove sampleStory.ts and sampleStory.test.ts, and remove only this card's report/evidence; preserve all PM/ARCH changes.
cost:
  elapsed_minutes: unknown
  retries: 2
  tokens_or_cost: unknown
recommended_next_action: PM independently review NR-01A and decide acceptance; do not start NR-01B automatically.
```

## 结论

纯数据合同完成，画面未接入。`sampleStory` 现在能从五段任意有效
`segment + progress` 独立计算完整 StoryFrame；物件状态只由当前故事位置
决定，不读取书签、访问历史、时钟、随机数、浏览器或模型状态。

## 实际增量

- 新增五段 StoryPosition、SemanticWorld、CameraIntent、PresentationIntent
  与 StoryFrame 类型；语义世界包含 notebook、envelope、稳定照片身份及归属、
  wallPrints、cabinet 和 inactive screen 的完整状态。
- 新增独立的 `PERSONAL_ARCHIVE_SAMPLE_STORY` 数据与版本，保留原
  `WORK_TRANSITION_NARRATIVE` 和 `narrativeSpecs` 消费行为。
- 新增纯 `sampleStory`：拒绝未知段、错误版本、非有限及越界进度；照片
  转移端点标准化为 `life` / `frame-wall`，仅内部区间使用
  `life-to-frame`。
- 每次返回新建并冻结完整嵌套结果；输入和先前结果不因后续采样改变。
- 测试 expected 为手写固定预期，没有调用被测函数生成 oracle。

## 请求 PM 决策

请 PM 按 A 卡独立审查类型合同、相位数值与范围证据。NR-01B/NR-01C
未开始；本交付不包含运行时接管、真实绑定、画面变化、提交或推送。
