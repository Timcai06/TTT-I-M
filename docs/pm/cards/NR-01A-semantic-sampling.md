# NR-01A · 五段故事的纯语义采样

- 版本：1；状态：**READY，tim 已确认计划并同意启动 NR-01A（2026-09-09）**。
- 负责会话：DEV，`01a08484-5199-7c22-b54e-38778cd5ed1d`。
- 模型：`gpt-5.6-sol` / `high`。首次建立后续依赖的状态合同，优先正确性。
- 依赖：NR-00 规划已 ACCEPTED；用户已确认开工；实际开发分支 `feat/narrative-kernel`。
- 目标：给定五段中的任意有效故事位置，都能独立算出一致的语义状态，为后续绑定提供输入。本卡不改变网站画面。

## 基线与输入

仓库：`/Users/tim/DEV/TTT I'M/portfolio`。产品基线 `6137099b950745d06c1f2894d83cdf7a1826684a`，目前文档 HEAD `55c08029051b11e9687d869747907e20291940fa`。执行时以实际分支/HEAD/范围文件哈希为准，保留 PM 和他人未提交文档。PM 已从当前 HEAD 创建 `feat/narrative-kernel`，使用同一目录，未新建 worktree；PM 未提交的规划文档继续保留。

必读：PM 入口、产品简报、[NR-00 最终验收](../reports/NR-00-pm-acceptance.md)、[v2 修订](../reports/NR-00-contract-v2.md) 的 R1/NR-01A，以及[原合同](../reports/NR-00-contract.md) 第 4.2 节状态表。无需重读整个仓库或重新扫描模型。

## 独占写入白名单

- `apps/landing/src/core/narrative/types.ts`
- `apps/landing/src/core/narrative/specs.ts`
- `apps/landing/src/core/narrative/index.ts`
- 新增 `apps/landing/src/core/narrative/sampleStory.ts`
- 新增 `apps/landing/tests/sampleStory.test.ts`
- `apps/landing/tests/narrativeSpec.test.ts` 仅可增加兼容性用例，保留既有期望，不为通过检查改掉原 Work Transition 约定。
- 报告：`docs/pm/reports/NR-01A-delivery.md`；证据：`output/pm/NR-01A/` 新文件。

你不是唯一执行者。只修改白名单文件，开工先保存范围原始版本/指纹作为本卡回退依据，不回滚他人变化。不得修改 runtime、Director、DOM/样式、导航、书签实现、资产、依赖或 PM 规则；不启动服务，不运行 Blender，不提交推送，不派其他会话。

## 实现合同

1. 五段：about-reading、about-life、life-reading、life-frame、frame-reading。`StoryPosition = segment + progress`；不新增独立可写 global time，不新增 DOM section。
2. `sampleStory` 只接受位置及明确版本数据，输出 StoryFrame。书签仅供未来定位入口选 T，不作为本函数的隐式输入；不读旧 session、当前时间、随机数、浏览器环境或模型。
3. 世界输出采用 v2 语义字段：notebook、envelope、photo（稳定语义 ID、extraction、placement）、wallPrints、cabinet、screen。禁止出现 GLB clip/node/action 权重映射或导入绑定层。
4. 五段所有受控语义字段每次输出齐全。书本在样段打开；about-life 抽出信封与照片；life-frame 转移到墙；背景抽屉/档案恢复样段静置；screen 在样段 inactive。
5. 原状态表的相位数值作为第一版数据合同；使用 core 内部的纯数值 helper，不能反向导入组件的 chapterTracks。camera/presentation 使用必要的语义目标与数值意图，不求物理矩阵。物理 clip 区间留 B，不复制进采样配置。
6. 进度必须有限且在 [0,1]；未知段、无效版本和非法进度给明确错误。调用方未来可自行做有限值钳制，本函数不能把未知输入静默当首帧。
7. 采样不修改输入或之前返回的对象；不能在多次调用间暴露共享可变输出。允许复制或冻结，避免泛化框架。对于等价位置使用稳定可比较输出。
8. 在已有 narrative 目录扩展，保留 defineNarrativeSpec/WORK_TRANSITION_NARRATIVE/narrativeSpecs 的既有语义与消费者行为。新样段数据单独导出，不把五段直接混入旧导航/spec 消费列表。

## 固定验收预期

| 位置 | 关键语义预期（独立于实现） |
| --- | --- |
| about-reading 任意 p；about-life p=0 | notebook=1；envelope/extraction=0；photo=life；wall=0；drawer/folder=0；screen=inactive |
| about-life p=.23 / .62 | envelope/extraction 分别为 0 / 1；不受先前采样 Work 或后段的任何历史影响 |
| about-life p=1；life-reading 任意 p；life-frame p=0 | notebook/envelope/extraction=1；photo=life；wall=0；drawer/folder=0 |
| life-frame p=.24 / .56 | 转移开始/结束；p=.24 为源端点、p=.56 为墙端点。中间 placement.kind=life-to-frame，progress 在 [0,1]；端点标准化为 life/frame-wall，避免两个等价端点表示 |
| life-frame p=1；frame-reading 任意 p | photo=frame-wall；wall=1；notebook/envelope/extraction=1；drawer/folder=0；screen=inactive |

样段端点处世界与基础相机意图必须连续或可说明等价，离散阅读所有权允许按明确阶段切换。对连续量与离散状态分别断言，不把“全对象完全相等”当成所有跨段边界的要求。

- AC-1：上述固定预期、边界前后和非法输入用例通过；expected 手工给出，不能调用被测函数生成。
- AC-2：正序、倒序、乱序和重复采样得到相同 T 的一致世界；输入及先前输出不被修改；不存在书签/时间/GLB 对采样的隐式依赖。
- AC-3：现有 Work Transition 合同兼容；产品白名单外零修改；没有新运行时消费者、依赖或资产。
- AC-4：必要检查与原始结果可读，回报如实注明“纯数据合同完成，画面未接入”。

## 必要检查与收口

正式派发后执行：目标 `sampleStory.test.ts` 与已有 `narrativeSpec.test.ts`；Landing 类型检查；仅修改 TypeScript 文件的 ESLint；差异格式检查。若测试组织要求使用现有 loader，沿用仓库机制，不新增框架。无需全站构建、浏览器或视觉测试，本卡不将这些写成已通过。

例如从仓库根目录执行 `node --test apps/landing/tests/sampleStory.test.ts apps/landing/tests/narrativeSpec.test.ts`、`npm run typecheck:landing`；遵守 RTK 包装约定。命令若失败先报告真实原因，不放宽测试或删除既有检查。

回报按模板，列 AC-1…4、实际文件、执行命令/退出码、证据、未验证、回退方式及模型配置。完成后交回 PM；B/C 不自动启动。若核心意图需要修改，给 PM 最小问题与建议，继续独立可做部分，不自行扩展为运行时重构。
