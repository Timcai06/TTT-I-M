# NR-04 · 全局协调及 Index / Frame→Stack 推广

> 最新执行约定：沿用tim当前为负责会话配置的模型/推理设置，PM不覆盖；下方旧模型建议不再生效。额度中断后从已有成果续接。

**READY，NR-03与独立QA已完成技术验收。** DEV / tim当前会话配置。覆盖原 NR-04 与 NR-05 前半，复用已经完成的样段机制，不重做准备阶段。

## 完整结果

全站自然滚动、导航/子锚点、返回、Index 检视、布局更新和恢复共用位置/请求协议；Index、entry、Frame→Stack 和 Stack 阅读停驻进入语义控制。Work/Contact 通过受控 legacy 适配器继续可用，最后两桥及旧 writer 退出留下一张 NR-05。本卡交付是可体验的入口与屏幕章节，不宣称全站 D1 已完成。

依据 [NR-05P 已接受边界图](../reports/NR-05P-rollout-map.md)第2、4–7节，按 NR-03 最终实际接口对接。T唯一，story time从序列派生；bookmark与短期路由输入独立。保持唯一rig、同帧提交、R1暂态恢复、连续照片和阅读返回。

## 文件边界

以下缩写 `S=apps/landing/src`，`P=S/components/personal-archive`，`N=S/core/narrative`，`L=S/lib`，只授权列出的文件，不授权整个目录：

- P：`archiveRuntime.ts`、`archiveExecution.ts`、`archiveCameraRig.ts`、`archiveReadingSurface.ts`、`ArchiveChapterBridge.tsx`、`personal-archive.css`、`archiveSamplePosition.ts`、`sceneBindings.ts`、`ArchiveStage.tsx`、`PersonalArchiveSurface.tsx`、`PersonalArchiveBridge.tsx`、`ArchiveIndexSurface.tsx`、`archiveDirector.ts`、`archiveRuntimeSignal.ts`、`ArchiveSignal.tsx`。
- N：`types.ts`、`specs.ts`、`sampleStory.ts`、`index.ts`。
- L：`lenis.ts`、`chapterScrollMetrics.ts`、`scroll/requestRefresh.ts`、`chapterScroll.ts`、`archiveRoute.ts`、`archiveReturn.ts`、`archiveReadingMemory.ts`。
- S：`content/narrativeObjects.ts`、`components/frame/FrameParticleHandoff.tsx`、`components/Skills.tsx`、`components/ChapterTransition.tsx`、`App.tsx`、`chapters/projects/ProjectsBento.tsx`、`chapters/projects/ProjectCaseDialog.tsx`。

测试：新增 `apps/landing/tests/e2e/archive-global-navigation.spec.ts`；扩展现有 `sampleStory.test.ts`、`narrativeSpec.test.ts`、`archiveSamplePosition.test.ts`、`archiveExecution.test.ts`、`archiveCameraProjection.test.ts`、`narrativeObjects.test.ts`、`archiveBindingContract.test.ts`、`tests/e2e/archive-execution.spec.ts`。其他既有测试行为保护；职责迁移导致源码断言失效时向PM给具体等价证据。NR03 transfer助手原则上只消费原接口，必要适配另报PM。

报告 `docs/pm/reports/NR-04-delivery.md`，证据 `output/pm/NR-04/`。独占产品写入，其他会话只读/PM文档。保存起点原文与指纹，保留全部他人未提交增量。

## 必须闭合

1. 实际故事序列覆盖Index/entry/阅读与桥；导航展示集合缺Life/work-transition，不能代替故事拓扑。复用现有Lenis推进和ScrollTrigger更新后采样/提交顺序，不另做时间平滑或永久rAF。普通滚动用缓存范围；完整refresh统一发布版本并保持T。
2. 全部导航入口、hash/真实子锚点、项目卡定位、Index pendingScroll进入同一请求/取消协议；保留offset、replaceState、书签和NR03返回构图。删除已被可靠替代的App三次纠偏。项目弹窗释放暂停不能抢过新路由，保留原案例与PhotoSwipe交互。
3. Index/entry保留真实Index及原像素开场、书页About映射；由T和显式检视状态生成物件/相机/DOM。回Index复原规范物件，不靠visited floor。FS/Stack的N/L/F=1、D/Q=0，足球留墙、Final Horizon进入屏幕和真实Stack正文。
4. `frame-final-horizon`用scenery/scenery-close/primary/image11及src复合身份定位，与足球图严格分开。runtimeSignal、Skills、FrameParticleHandoff fallback及存量ArchiveSignal所有相关消费者同卡对接；不改数据数组/原图，不新增死代码入口。保留不同分辨率srcSet、独立材质与释放，实际裁切/内容区配准不能由同src假定。
5. 新段的完整动作/载体/monitor/相机/正文/hit/焦点都经过同一提交器。扩展实际静态节点与运行时生成surface验证，但不要把Contact运行时生成节点假称GLB必须自带而破坏真实GLB检查。未经推广的Work/Contact仍明确用受控legacy计划，不能与sample竞争。
6. 删除本卡已接管段的旧世界/相机/DOM writer及路由例外，包括NR03 About短期返回复用director.pose(entry,.48)的临时接缝；同步撤结构测试中该临时豁免，保留真实等价隔离断言。独立阅读效果（Life照片墙、Frame主题/PhotoSwipe、Stack flow、项目媒体、Footer时钟）保持；只接布局/取消/owner的必要边界。

## 验收与交回

每个新增段0/中点/1与边界正反、fresh-vs-history、Index真实检视/离开、Frame深层子锚点与项目卡、快跳/取消、晚到内容/resize、GPU恢复中换请求、暂态失败恢复。实际action/node/camera/DOM四角、身份/裁切与唯一交互作为证据；固定原容差，不仅比stamp。

运行新增及受影响回归、完整tsc-b、限域lint/diff与保护指纹；原配置/系统Chrome/空闲非5173端口。可复用B/NR03不受影响证据，必要回归按NR05P/Q01选取，不重复无关全套。卡片范围大可分段实现，但最终接缝必须闭合后交回；不另拆空准备卡。

视觉精修、音效增强、最终收尾/发布不在本卡；不提交推送/建worktree/换素材。完成结构化报告后停止，PM验收再派NR05。

## 实际开工接缝

基线为同目录feat/narrative-kernel / HEAD55c08029051b11e9687d869747907e20291940fa，加 `output/pm/NR-03/pm-accepted-files.json` 的42文件；见 [NR03 PM验收](../reports/NR-03-pm-acceptance.md)。开工保存新增范围原文/指纹，禁止按HEAD重置。runtime已暴露 `readingTransition(requestId, chapter, return/open, inertLayer)` 返回ArchiveSeekResult，与现有seek/commit及request/layout/resource一致；execution内独占photoTransfer并发布FootballTransfer/Source/Wall anchors，默认continuous-surface-v1。延用这些实际接口，按新章节必要扩展，不重建另一套路由或照片状态。

本卡明确允许定点更新 `tests/archiveStoryShadow.test.ts` 中About旧entry适配豁免，入口迁移后撤豁免并保留诊断隔离行为。`tests/e2e/archive-photo-return.spec.ts` 是保护回归；拓扑扩展引起必要断言接缝变化时先向PM给具体原因，由PM处理，不等用户授权。

## PM 开工快照补充

本卡最初baseline仅存23文件指纹，之后已有修改。DEV补充未改文件原文，并优先按现有NR03/B快照和本卡逆补丁恢复接受版本，每份以目标SHA核验；PM已保存仍匹配NR03接受清单的16份文本至 `output/pm/NR-04/pm-preserved-accepted-files.json`。不要伪造开工原文，也不做长时间历史日志考古。若有限旧版本无法快速重建，交付中明确列出不完整回退边界，保存当前候选完整原文及后续增量；此文档缺口不单独阻塞已正确验证的产品接管。此后PM接受时保存原文+指纹再派下一卡。
