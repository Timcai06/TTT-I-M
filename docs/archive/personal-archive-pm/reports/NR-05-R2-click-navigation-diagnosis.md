# NR-05-R2 · 点击后未进入正文只读定位

**结论：入口命中修复有效；另有点击后布局刷新与最终提交之间的间歇竞态。当前卡仅只读定位，未修改任何产品文件。**

## 已确认的事件链

正常生产模式、系统 Chrome、无 `__portfolioArchiveExecutionEnabled`、无 hardware 能力覆盖下，重复执行 QA 的 Index→About 长读→RETURN TO OBJECT→Life 物件路径：

- `elementFromPoint` 在点击前归属 `button[aria-label="打开 life"]`；
- 真实 `pointerdown/mousedown/pointerup/mouseup/click` target 均可到达该按钮；
- React `onClick` 会调用 `scrollToChapter('life', { updateHash:true, immediate:true, restore:true })`；
- `archive-request-start` 被捕获，URL 更新为 `#life`。

因此 R1 的 sticky 舞台拦截已修复，QA R2 的失败不能再归为命中层或 diagnostic flag。

## 重复证据

在 1280×720、`hardwareConcurrency=15`、`deviceMemory` 未提供的正常页面上：

| 路径 | 结果 |
| --- | --- |
| 立即读取质心并 `mouse.click`，共 6 次 | 4 次进入 `life-reading`；2 次点击与请求均发生，但结束在 `about-life`、Life 仍 inert |
| 指针先移入投影、等待稳定后原地按下 | 进入 `life-reading`，Life 非 inert |

失败试次的关键读回为：`click target=打开 life`、`archive-request-start=1`、`hash=#life`、`readingRequest/routing` 已清理，但 `sampleOwner=about-life` 且 `lifeInert=true`。这证明请求不是没发出，而是最终提交回了旧 handoff 段。

稳定试次首次物件中心漂移约 305.20px，三轮后降至 0.89px；真实点击、请求启动、`#life` 与 `life-reading` 全链成功。原始逐事件数据见 `output/pm/NR-05-R2/click-navigation-evidence.json`，摘要见 `diagnosis-summary.json`。

## 代码定位

1. `ArchiveChapterBridge.tsx` 的 Life 入口只调用统一 `scrollToChapter`，没有第二条 writer。
2. `chapterScroll.ts` 把请求交给 `ArchiveStage` 安装的 interceptor。
3. `seekArchiveChapter` 先以当前 DOM 位置执行 `scrollToChapterRaw`，随后等待一帧、调用 `ScrollTrigger.refresh()`、再等待一帧并提交。
4. `ScrollTrigger.refresh()` 会重新计算 pin spacer 与章节跨度；它之后没有再次按新布局解析目标落点。
5. `archiveRuntime.commitPosition(requestId, targetId?)` 的实现实际只接收/使用 `requestId`，最终由当时 `scrollY` 重新采样。如果刷新后该位置仍映射到 `about-life`，请求即使已更新 `#life` 也会提交旧段，Life 保持 inert。

诊断开关只创建只读 `getSnapshot()` 并让 `record()` 保存冻结副本；关闭时 `record()` 直接返回。它不参与路由选择、请求号、scroll、commit 或输入处理，因此不能解释该差异。DEV 旧用例额外等待首个 diagnostic commit，改变的是准备时序，不是产品分支。

## 最小修复建议（待 PM 放行）

首选仅改 `apps/landing/src/lib/archiveRoute.ts`：

1. `ScrollTrigger.refresh()` 后，针对 `top === undefined` 的章节打开请求再次用新布局解析并立即落到目标阅读位置；
2. 最终 commit 前验证 `positionAtScroll(getSampleLayout(), scrollY)` 已属于请求目标的 reading segment；不一致时重新落位并等待一帧，不能把旧 handoff 段当作成功提交；
3. 保留现有请求号与 wheel/touch/key 取消语义，不靠固定延时、force click 或恢复旧 writer。

若 ARCH 希望 target 校验由 runtime 负责，可再把已存在但实现未使用的 `commitPosition(requestId, targetId?)` 参数收紧；这会额外涉及 `archiveRuntime.ts`，不是首选最小范围。

## 边界

- 未改产品、旧测试、候选、依赖、配置或 3D 资产。
- 没有把单次成功当成缺陷消失；也没有把单次失败先归咎于坐标。
- 本报告只完成根因边界与修复接口建议，不宣称 QA 完整旅程通过。
