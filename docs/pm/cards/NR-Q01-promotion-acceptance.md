# NR-Q01 · 全站推广的技术验收映射

版本 1，READY；QA `01a08484-af37-72b1-ab52-deaec8bb1184`，`gpt-5.6-terra` high。与 DEV 的 NR-02A 和 ARCH 的 NR-02P 并行，只读产品/测试。

目标：从现有测试中给 PM 一份精简、可执行的全站推广验收映射，避免各实施卡只测新模块而漏掉完整内容、返回和外章回归。不参与架构设计或视觉打分。

阅读最新产品简报执行授权，C 最终 PM 验收，以及 Landing 现有 tests/e2e 中 frame、projects-experience、chrome-ui、degradation、loader、effects-context 的相关用例与其直接 fixture；必要时核对引用的页面 selector/内容入口。只读需要的信息，不做全仓审计、不启动浏览器/服务、不运行测试。

只新增 `docs/pm/reports/NR-Q01-promotion-acceptance.md`，包含结构化回报和一张映射表：推广验收项 → 现有测试文件/测试名或缺口 → 可以直接运行的最小命令 → 实际能够证明/不能证明什么。覆盖 Index/entry、About 完整阅读、Life、Frame 深阅读与 Final Horizon、Stack、Work/Contact、书签/跳章/返回、reduced/narrow 保持可读、布局/GPU/资源失败。不存在的覆盖明确缺口，不编造 PASS。

当前 HEAD `55c08029051b11e9687d869747907e20291940fa`、分支 feat/narrative-kernel，代码正在 DEV 白名单内变化；记录读取范围和当前版本，不对未冻结候选执行验收。你不是唯一执行者，不改代码/测试/其他文档，不派发任务，不提交推送。

报告直接帮助后续测试选择，避免长篇重复流程；视觉精修与最终收尾尚未授权。交回后停止并通知 PM，待未来候选实测卡。
