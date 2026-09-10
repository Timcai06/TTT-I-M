# NR-03 · 连续照片与当前阅读位置返回

> 最新执行约定：沿用tim当前为负责会话配置的模型/推理设置，PM不覆盖；下方旧模型建议不再生效。额度中断后从已有成果续接。

**READY，NR-02B（含R1）已被 PM 接受。** DEV / tim当前会话配置；本卡完成连续几何与阅读返回的完整样段。

实际基线：同目录 `feat/narrative-kernel` / HEAD `55c08029051b11e9687d869747907e20291940fa`，叠加 `output/pm/NR-02B-R1/pm-accepted-files.json` 的38文件。见 [B最终验收](../reports/NR-02B-pm-acceptance.md)。开工保存本卡额外修改文件的原文/指纹，已接受的未提交代码不能按HEAD覆盖。

实际接线：runtime持有唯一rig与 `createArchiveExecution(model.scene, rig)`；execution的 `begin/sample/legacy/validate/invalidate` 控制permit对象身份和代次。`drawSample` 调用sampleStory→world/anchors→solve/applyCamera→projection→present→render/publish，非render失败分别处理暂态与永久能力。`seekArchiveChapter`/`routeToArchiveObject` 已统一即时请求，`commitPosition(requestId,targetId)` 返回真实committed/cancelled/readable-fallback；请复用该协议加短期返回相位。转移助手只能由execution调用。保持R1暂态恢复行为与相同无效条件限流。

## 用户可体验的结果

Life 的真实足球照片连续移动到 Frame 的对应墙照；向前、反向和直接跳到途中得到相同几何。About/Life/Frame 长文中返回物件时，先收回当前阅读构图，再回到对应物件；再次打开恢复阅读书签。完整正文、原图和现有阅读效果保持。技术修复所需的镜头避碰属于本卡，美术精修不属于。

依据已接受的 [NR-05P 边界图](../reports/NR-05P-rollout-map.md) 第 2/3/6/7 节；复用 B 最终唯一执行链和 request/layout/resource 协议，不再建舞台、mixer、第二套导航状态机或常驻 rAF。

## 产品文件范围

`apps/landing/src/components/personal-archive/` 下：`archiveRuntime.ts`、`archiveExecution.ts`、`archiveCameraRig.ts`、`archiveReadingSurface.ts`、`ArchiveChapterBridge.tsx`、`personal-archive.css`；新增 `archivePhotoTransfer.ts`；按实际缺口修改 `readingSnapshot.ts`、`ArchiveHandoffPage.tsx`。

仅必要语义/短期表现接口修改：`apps/landing/src/core/narrative/{types.ts,specs.ts,sampleStory.ts}`；阅读/请求接缝 `apps/landing/src/lib/{archiveRoute.ts,archiveReturn.ts,archiveReadingMemory.ts}`。

测试：新增 `apps/landing/tests/archivePhotoTransfer.test.ts` 与 `tests/e2e/archive-photo-return.spec.ts`；按移交行为变化扩展现有 `sampleStory.test.ts`、`archiveExecution.test.ts`、`archiveCameraProjection.test.ts`、`tests/e2e/archive-execution.spec.ts`。B 基础故障/取消/布局行为断言保留。其他文件受保护；必要越界只向 PM 报具体接口原因。

写报告 `docs/pm/reports/NR-03-delivery.md`，证据 `output/pm/NR-03/`。同目录开发，保留所有他人未提交修改；不提交、推送、建 worktree 或修改素材/模型/依赖。

## 必须闭合

1. 源 `LifeMemoryPhoto`/`Life_PhotoPaper` 与目标 `ArchivePhoto_04`/`PhotoMount_04` 沿同一足球图 ID 和真实 UV。转移代理使用自有几何/材质、共用只读原图纹理；不修改共享透明度。源/转移/目标按 T 独占，不靠 onComplete/reparent 记忆决定状态。
2. 每次从不可变基准及本帧实际父变换计算；保留真实非均匀 scale、背纸和曲面。端点不仅四角，中心/边中点也应贴合实际目标；不把平面四角重合当作整张曲面吻合。正常段落既有时序保持，必要路径避碰用运行证据调整。
3. 返回沿 B 请求加显式短期表现相位。当前视口快照须包含原阅读构图且 inert；live 正文的交互和焦点只归一个有效 owner。保留 About→entry .48、Life/Frame→相应桥 .56 的物件落点，书签独立保留。
4. 新请求、用户中断、resize、资源失效撤销旧相位；旧 finally 不清新请求的状态。恢复重建自有资源后按当前 T 重采样，不补播事件。直接 seek 与减少动态/不可用路径使用明确即时或正文回退。
5. 删除默认运行的 endpoint-switch-v1；诊断准确记录真实转移和短期返回状态。世界 T 不因动画访问历史变化。未完成的全局推广继续走 B 已验证边界，不能提前删除未接管的旧章节。

## 验收

真实 GLB/纹理配准单元证据；真实浏览器正反、中点直入及端点几何/UV/可见性；长文和 Frame 子主题书签收回再开；返回中取消/新请求、布局与 GPU 恢复；完整 About 映射与唯一可交互正文。保存少量截图/可复現记录用于 PM 功能观察，最终画面节奏仍由 tim 判断。

复用固定数值容差，不放宽。运行新增必要目标与 B 受影响回归、完整 tsc-b、限域 lint/diff；用本机 Chrome、空闲非 5173 端口与原 Playwright 配置，不能动用户服务。不要重复无关全量套件或为旧文档测试硬编码保留多余实现。

交回实际命令/退出码、指纹、真实读回、未验证项，完成后停止等待 PM。PM 已获连续执行授权，普通实现问题由 PM 处理；视觉精修、声音增强和最终收尾/发布仍等 tim 指示。

## PM 接口补充 · 2026-09-09

允许定点修改 `apps/landing/tests/archiveStoryShadow.test.ts`：NR03仅About短期readingRoute分支可复用 `director.pose('entry', .48)` 求入口相机，仍禁止普通样段调用旧pose、navigationPose、世界plan/legacy写入。保留shadow隔离全部行为断言。此函数会临时写共享camera，不能称作纯函数；必须仍由本帧最终相机投影/提交统一覆盖，且路由计算不能夹带旧pointer历史。NR04入口接管后撤该临时接缝。DEV保存这个新增授权文件的原文/指纹后修改，并给等价门控断言与实际返回证据。
