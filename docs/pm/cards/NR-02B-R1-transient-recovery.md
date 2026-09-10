# NR-02B-R1 · 暂态布局/投影失败后的恢复

**READY，NR-Q02 已完成冻结版取证，产品写入解冻仅限本卡。** DEV / Sol high。已定位的恢复缺陷，复用现有架构定点修复；不重做 NR-02B。

## 已复现问题

QA 在真实浏览器进入 life-frame .56，临时令目标 preview 的 clientWidth 为 0，再到 .72。系统正确隐藏画布并恢复可读正文；随后恢复尺寸、resize、dispatch load、导航 About，等待 8 秒仍无法产生 about-reading 提交。canvas state=ready 但隐藏、shot仍life-frame，html fallback=true，life-frame failed=true。

证据 `output/pm/NR-Q02/qa-transient-projection-recovery.json` 和同名截图。源码原因：sampleFallback 锁定 sampleUnavailable，只有 GPU restored 会清除；active.events.failed 还会让桥适配器卸载。合法新布局/请求无法恢复控制链。不要全文打印大型 JSON，只读取 failure/state 和必要记录摘要。

## 范围与基线

基线 `output/pm/NR-02B/pm-candidate-files.json`，38 文件冻结，未 ACCEPT；当前代码40单测与DEV22浏览器通过并不能覆盖该反例。分支/HEAD不变，同目录保留所有已有增量。

仅允许修改：

- `apps/landing/src/components/personal-archive/archiveRuntime.ts`：区分暂态失效与真实能力/renderer失败，恢复有效执行许可和本次提交结果。
- 同目录 `ArchiveChapterBridge.tsx`：必要的暂态 pending/恢复生命周期接线，不能让一个可恢复错误永久卸载适配器。
- 同目录 `ArchiveStage.tsx`、`archiveReadingSurface.ts`：仅确实需要的合法布局重试/正文和focus恢复接缝。
- `apps/landing/tests/e2e/archive-execution.spec.ts`：加入QA反例→恢复的行为测试；既有暂态故障断言可适配“暂挂→合法条件恢复”，但故障期画布隐藏、hit禁用、正文可读以及真实renderer/绑定缺失隔离不可删除。

报告 `docs/pm/reports/NR-02B-R1-delivery.md`，证据 `output/pm/NR-02B-R1/`。不改rig/语义/资产/依赖/其他章节。你不是唯一执行者，PM维护文档，QA只读取旧候选证据；保留所有他人修改。

## 正确行为

1. 旧 request/layout 作取消或等待处理；暂态尺寸/投影/DOM未就绪须可在新有效布局、目标位置或请求后恢复。无需整页reload或故意触发GPU loss。由现有调度重试，不增加永久轮询/rAF、超时猜测或第二执行链。
2. 同一无效条件不无限重试、不露出旧画布、不伪ready；依赖恢复后先完整验证并成功render，才恢复canvas、preview/hit、bridge可用态和唯一正文owner。不能仅清error字段、保留失效的适配器。
3. 缺关键clip/node/错误parent、真实renderer失败仍保持已有能力/全局失败边界，不因普通resize把永久失败伪装成功。暂态重试也不能让过期请求重新写入或覆盖新书签。
4. 核对原桥和另一章均恢复：先恢复原LF合法中点并核实际camera/DOM配准，再导航About/Life阅读确认新请求提交与可交互正文；保留阅读书签。

## 必要验证

新回归必须在修前复现、修后通过；记录故障期和恢复后的实际DOM/提交值。执行该例与现有非法投影、sample真实draw失败、关键绑定失败、resize/GPU恢复中换请求、书签/快跳、load增长的相关浏览器回归；复用原配置/系统Chrome/空闲非5173端口。运行原40目标单测、完整tsc-b、实际修改TS限域lint/diff，并核保护指纹。无需重跑不受影响的全部素材/跨context矩阵用例。

交回后停止，PM/QA定点复核再决定B接受和NR03开工。不提交推送/建worktree/发布，不做视觉精修或新架构规划。
