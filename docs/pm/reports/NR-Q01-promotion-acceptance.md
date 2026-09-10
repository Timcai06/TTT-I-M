# NR-Q01 · 全站推广技术验收映射

```yaml
task_id: NR-Q01
card_version: 1
status: DELIVERED
thread_id: 01a08484-af37-72b1-ab52-deaec8bb1184
model: 派发卡配置为 gpt-5.6-terra；本会话实际模型不可读取
reasoning_effort: high
baseline:
  checkout: /Users/tim/DEV/TTT I'M/portfolio
  branch: feat/narrative-kernel
  head: 55c08029051b11e9687d869747907e20291940fa
  working_tree_evidence: 本报告编写前后的 git status --short；产品和 PM 文档均有未提交修改，且 NR-02A 正在并行写入，未冻结候选版本
changes:
  files: []
  report_file: /Users/tim/DEV/TTT I'M/portfolio/docs/pm/reports/NR-Q01-promotion-acceptance.md
acceptance:
  - id: AC-1
    result: PASS
    evidence: 已只读映射任务卡指定的 6 个 E2E 文件、Landing Playwright 配置、package scripts 与产品简报；未执行产品检查
  - id: AC-2
    result: NOT_RUN
    evidence: 本卡禁止启动服务、浏览器或运行检查；下表命令均为未来冻结候选的执行建议，非当前通过结论
checks:
  - command_or_action: 只读读取 product-brief、NR-Q01 卡、package.json、playwright.config.ts 及指定 E2E 源码
    scope: 全站推广测试映射；未启动服务、浏览器或测试
    exit_code: 0
    result: PASS
    evidence: 当前读取文件 SHA-256 见“读取范围与版本”
unverified:
  - 没有冻结候选、设备/视口/DPR、资产版本或当前运行结果，不能对任何产品行为给 PASS。
  - 自动化不代替 tim 对画面、节奏、材质和内容连续性的体验验收。
risks_or_blockers:
  - About 完整阅读、阅读书签/返回、运行中布局重算后的语义位置、跳转事务取消、运行中 GPU context loss/recovery 缺少指定现有 E2E 覆盖。
  - 测试文件和产品代码均可能被并行任务改动；下列映射在候选冻结后必须复核文件指纹。
scope_deviations: []
rollback: 只新增本报告；删除该文件即可回退本任务增量。
cost:
  elapsed_minutes: unknown
  retries: 0
  tokens_or_cost: unknown
recommended_next_action: PM 在每个推广候选冻结后，按本表选取相关现有检查；对明确缺口另派最小测试或人工实测卡。
```

## 结论

现有套件可作为全站推广的**起步回归清单**，但不是完整验收门禁。尤其是 `frame.spec.ts` 的“全部 section 有高度”、以及历史报告中的通过记录，都不能证明 About 已完整可读、书签可恢复、或新的叙事运行时已完成同帧/恢复语义。以下命令均应在 `apps/landing` 目录、冻结候选上执行；每次使用空闲端口，例如 `PLAYWRIGHT_PORT=4295`，避免复用开发服务。

## 验收映射

| 推广验收项 | 现有测试（精确名称）/缺口 | 最小可执行命令 | 实际能证明 | 不能证明 |
| --- | --- | --- | --- | --- |
| Index / 入口 | `degradation.spec.ts`：`reduced motion: site loads with the static fallback and real text intact`；`chrome-ui.spec.ts`：`Staggered section map opens from the retained top nav and jumps to chapters` | `PLAYWRIGHT_PORT=4295 npx playwright test --project=chromium-desktop tests/e2e/degradation.spec.ts tests/e2e/chrome-ui.spec.ts --grep "reduced motion: site loads|Staggered section map"` | 首屏文本/静态降级可到达；顶部 Section Map 的打开、Escape 和一次 Frame 跳转 | 房间内真实可交互 Index 的功能、入口物件状态、跳转取消或视觉品质 |
| About 完整阅读 | **缺口**；`frame.spec.ts` 的 `waitForFrameReady` 仅检查 `#about` 有非零高度 | 无现成最小命令 | `frame.spec.ts` 可作为所有主 section 挂载的粗烟测前置 | About 全文、排版/原图身份、阅读停驻、返回及书签恢复；不得据此宣称 About 通过 |
| Life | `effects-context.spec.ts`：`desktop life archive uses seven equal-width columns with varied photographs` | `PLAYWRIGHT_PORT=4295 npx playwright test --project=chromium-desktop tests/e2e/effects-context.spec.ts --grep "desktop life archive"` | 桌面 Life 照片墙的列数、部分图片多样性和既定计算样式 | Life 完整阅读、物件进入/退出、反向恢复、内容身份/裁切交接和视觉评判 |
| Frame 深阅读与 Final Horizon | `frame.spec.ts`：`Frame keeps the horizontal archive structure available`、`Frame archive index enters the selected photography theme`、`Frame themes show their final clusters before the next chapter takes over`、`Frame handoff does not repeat the Stack chapter title`；`effects-context.spec.ts`：`Frame final exposure enters the screen and releases the original Stack reading surface` | `PLAYWRIGHT_PORT=4295 npx playwright test --project=chromium-desktop tests/e2e/frame.spec.ts tests/e2e/effects-context.spec.ts --grep "Frame keeps the horizontal|Frame archive index enters|Frame themes show|Frame handoff does not repeat|Frame final exposure"` | Frame 索引/主题锚点、部分 DOM/布局、`FINAL HORIZON` 文案与 Frame→Stack 释放状态 | 新运行时对真实物件/相机/投影的同帧矩阵；照片四角、裁切、交互唯一归属；tim 的深阅读与视觉连贯判断 |
| Stack | `effects-context.spec.ts`：`Frame final exposure enters the screen and releases the original Stack reading surface`、`Stack flow enters continuously from outside the viewport` | `PLAYWRIGHT_PORT=4295 npx playwright test --project=chromium-desktop tests/e2e/effects-context.spec.ts --grep "Frame final exposure|Stack flow enters"` | Frame→Stack release 与 Stack SVG 流线在几个滚动采样点的可见/递增状态 | Stack 的完整阅读、反向回到 Frame 的内容归属和书签恢复 |
| Work / Contact | `effects-context.spec.ts`：`desktop stack-to-work uses a reversible drawer bridge without a forward gate`；`projects-experience.spec.ts`：`project case study traps focus, pauses Lenis, and restores the trigger`；`chrome-ui.spec.ts`：`Direct Contact hash lands on a stable readable footer` | `PLAYWRIGHT_PORT=4295 npx playwright test --project=chromium-desktop tests/e2e/effects-context.spec.ts tests/e2e/projects-experience.spec.ts tests/e2e/chrome-ui.spec.ts --grep "desktop stack-to-work|project case study|Direct Contact hash"` | Stack→Work 的几次正反滚采样、项目弹窗焦点回归、直接 `#contact` 的可读 footer | 从任意章进入 Work/Contact 后的统一叙事状态、所有项目内容、物件交接与最终视觉效果 |
| 书签 / 跳章 / 返回 | 部分覆盖：`chrome-ui.spec.ts`：`Scroll indicator stays aligned with the active chapter after navigation`、`Staggered section map opens from the retained top nav and jumps to chapters`；`frame.spec.ts`：`Natural chapter scrolling replaces the hash without creating a navigation jump`、`Frame and Work navigation active states stay aligned with scroll targets`。**无阅读书签和返回用例** | `PLAYWRIGHT_PORT=4295 npx playwright test --project=chromium-desktop tests/e2e/chrome-ui.spec.ts tests/e2e/frame.spec.ts --grep "Scroll indicator stays|Staggered section map|Natural chapter scrolling|Frame and Work navigation"` | 若实测通过，可证明若干导航入口、hash/active-state 与一次 Frame/Work 目标对齐 | 中断旧导航请求、恢复原阅读位置、历史状态不隐式改变物件开合、任意章节往返一致性 |
| reduced / narrow 下保持可读 | `degradation.spec.ts`：`reduced motion: site loads with the static fallback and real text intact`；局部窄屏：`frame.spec.ts`：`Frame falls back to a stable vertical layout on mobile`、`Mobile navigation collapses chapters behind a menu and lands on Frame content`；`projects-experience.spec.ts`：`mobile Projects uses an Embla rail without claiming vertical touch gestures` | `PLAYWRIGHT_PORT=4295 npx playwright test --project=chromium-desktop tests/e2e/degradation.spec.ts tests/e2e/frame.spec.ts tests/e2e/projects-experience.spec.ts --grep "reduced motion: site loads|Frame falls back|Mobile navigation collapses|mobile Projects"` | reduced-motion 首屏可读；390×844 下的 Frame 和 Projects 局部布局/菜单断言 | 本阶段桌面所有章节在窄窗口的完整阅读与空间退化；不能将旧移动端局部测试扩写成全站保证 |
| 布局变化 | `frame.spec.ts`：`Frame capture plane and every archive slot keep a safe vertical band across desktop heights`、`Frame first pinned movement releases after lazy pin heights settle`、`Frame keeps responsive images and stable intrinsic track geometry` | `PLAYWRIGHT_PORT=4295 npx playwright test --project=chromium-desktop tests/e2e/frame.spec.ts --grep "safe vertical band|lazy pin heights settle|responsive images and stable"` | Frame 在若干桌面高度下的既定 slot 边界、pin height 与图片候选/几何 | resize/font/image load 后新 StoryPosition 的语义保持、layoutVersion 不混用、跨章节位置恢复或取消旧事务 |
| GPU / 资源失败 | `degradation.spec.ts`：`WebGL unavailable: app still loads, fallbacks hold, no uncaught crash`、`a 404 frame image does not strand the loader (A1)`、`a missing Liquid Metal source cannot trap the Work gate`、`loader hands off after render-ready tasks without downloading every frame variant`；`loader.spec.ts`：`Loader progress keeps moving and intro title layout remains stable`（本地、可 skip） | `PLAYWRIGHT_PORT=4295 npx playwright test --project=chromium-desktop tests/e2e/degradation.spec.ts`；本地 loader 另用 `PLAYWRIGHT_PORT=4295 npx playwright test --project=chromium-desktop tests/e2e/loader.spec.ts` | 初始 WebGL 被拒、一个 Frame 图片或 Work 资源缺失时的降级/loader 行为；后一条仅在 loader 停留足够久时采样 | 运行中 WebGL context loss/restored、真实 GLB/绑定缺失后的阅读恢复、资源代次/同帧提交、GPU 设备间像素一致性 |

## 读取范围与版本

本次只读：产品简报、NR-Q01 卡、`apps/landing/package.json`、`apps/landing/playwright.config.ts`，及 `tests/e2e/{frame,projects-experience,chrome-ui,degradation,loader,effects-context}.spec.ts`。读取时 SHA-256：

| 文件 | SHA-256 |
| --- | --- |
| `apps/landing/package.json` | `e7455bd91d426423362bd8428932bf4ee57b48d3fd9b5b4822a299370215bd3e` |
| `apps/landing/playwright.config.ts` | `69f21590b537f2d62d5ccf33cc0a5e58959296202b6d526f219c3433643a5e9b` |
| `tests/e2e/frame.spec.ts` | `17c3e0850a1ee062a36845b14caf25e9d09bf1e3ede8dcca9ea071894f00fa2c` |
| `tests/e2e/projects-experience.spec.ts` | `cc5a742232e00a41f40c1f8f9c15835b9acea07736d28e35ebe3669bc1c34db3` |
| `tests/e2e/chrome-ui.spec.ts` | `7f23607e3b27b02e95ad5cb72372cf02137020c81d0fc986aec963c6e8924256` |
| `tests/e2e/degradation.spec.ts` | `52402e7582c1a4c1ea5c03deb1f04d39caa2279304044c85dff55a5e452370f2` |
| `tests/e2e/loader.spec.ts` | `84dcfd613906e21cf58efe9af0848413ef63cbe4544efd8d1e72f38b784ea672` |
| `tests/e2e/effects-context.spec.ts` | `bd3dfd62cdb90e29d4e6625f2e623ac4a2263fe01332f3c1dd9fb71c945adbf9` |

读取时 `HEAD` 与任务卡一致，但工作区已有 DEV 和 PM 未提交修改及未跟踪文件；本报告不将它们归因于 QA，也不对它们作候选验收。
