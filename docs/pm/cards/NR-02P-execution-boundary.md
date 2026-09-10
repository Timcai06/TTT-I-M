# NR-02P · 接管实施边界复核

版本 1，**READY**。ARCH `01a08483-8c0c-7fd0-b1a5-9ecc926e4f30`，`gpt-6-astra` / `high`。产品只读；DEV 暂停。目标是给 PM 一份能直接派发的 NR-02 实施边界，不重新规划 NR-00、不写产品代码。

## 当前事实

A/B/C 均已 PM ACCEPTED，实际接口已落地。C 两轮修订证明静态输入必须保留未知事实、诊断失败必须覆盖初始化和清理；实际 Action/帧版本尚不可用，旧 Director 仍唯一 writer。分支 `feat/narrative-kernel`，HEAD `55c08029051b11e9687d869747907e20291940fa`。产品 14 文件指纹：`output/pm/NR-01C-R1/pm-accepted-files.json`。

阅读 NR-00 原合同第 5–7 节与 v2、A/B/C 实际接口、C 最终 PM 验收，重点核对 archiveRuntime、archiveDirector、archiveReadingSurface、PersonalArchiveSurface/ArchiveStage/ArchiveChapterBridge 与它们的直接调用者。只查足够支撑下述决策的代码，不重做资产/内容盘点。

## 必须交回的四项决策

1. **实际单写者交接方案**：选定复用/转交现有 mixer 或明确停用后使用唯一新 mixer 的一种最小实现；列出 11 action 的持有、sample/legacy 切换、准备/恢复/退出/释放时谁能写什么。不要用一个布尔 gate 隐藏仍会写 scene/DOM 的旧调用。
2. **完整入口矩阵**：逐项覆盖 draw、drawRest、drawNavigation、预热/校色、恢复、resize、activate/detach/resumePrevious、样段阅读停驻与 Index/Work 进入/退出；标明实际函数/调用者、输入 StoryPosition 来源、应改的具体文件、禁止旧写入的节点。不知道的边界明确标出，不虚构通过证据。
3. **NR-02/03 分界**：在已有 A candidate 基础上，明确 NR-02 的照片基线展示、相机求解、DOM 投影和样段即时导航怎么形成真实同帧提交；NR-03 保留照片转移动作和完整返回体验。解决“NR-02 所有 writer 都要接管、NR-03 才改路由”的实施接缝，不能留下旧导航临时写 sample 场景的例外。不得引入全站改路由或丢阅读书签。
4. **可派发的实施范围与验收**：给一个优先方案、精确产品/测试文件白名单与调用顺序、必要快照字段的生成责任、关键绑定缺失的可读降级、回退步骤、真实 Action/node/camera/DOM 的最小验收矩阵。使用原合同候选容差并说明必要差异，不放宽以通过。若一张实施卡过宽，最多拆两个有独立验收的串行子卡，只有明确接管卡能影响运行；不要再造一长串准备阶段。

## 范围与交付

独占新增 `docs/pm/reports/NR-02P-execution-boundary.md`（四项决策和可派发范围）与 `docs/pm/reports/NR-02P-delivery.md`（结构化报告）；证据可写 `output/pm/NR-02P/`。无需长篇重复原合同，引用现有条目即可。你不是唯一执行者，不覆盖其他文档/代码；不创建模块/依赖/服务、跑构建浏览器、导出模型、提交推送或派发任务。

开工与结束核对 14 文件指纹、分支和 HEAD。只读规划不能声称功能或视觉验收。交回后停止，由 PM 审查后派发 NR-02 实施。
