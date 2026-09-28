# VR-03 · Work Laser 捕获定点只读核对

2026-09-10 · ARCH · DELIVERED。仅新增本报告；未改产品、新增/运行测试、启动服务或浏览器。分支 feat/narrative-kernel，冻结 HEAD 55c08029051b11e9687d869747907e20291940fa。对照 `output/pm/VR-03/pm-frozen.json`，laser.ts、ProjectsIntro.tsx、ProjectLaser.tsx、LaserVanilla.ts、useProjectsNarrative.ts 五文件当前 SHA-256 **全部匹配冻结值**；MaskedHeading 与样式额外只读。

**结论：存在确定的 SVG 引用完整性缺陷，以及由创建时机触发的动画状态固化风险。不能把已有局部状态测试通过当成标题捕获正确，也不能仅凭源码断言每次显示都空白。**

## 真实引用链

以下路径相对 `apps/landing/`：

1. `src/chapters/projects/ProjectsIntro.tsx:60–66`：laserTarget 包裹 `<ProjectsHeader />`，直接传给 ProjectLaser.captureRef；不是独立静态标题。
2. 同文件 `:15–29`：ProjectsHeader 默认 preview=false，MaskedHeading 使用 wipe、view、parallax=18。当前实际来源为 headingSources 图片，未启用 video。
3. `src/components/ProjectLaser.tsx:52–54,128`：该容器同时作为 capture 和 beamTarget，传给 createLaser；启用逻辑没有等待 MaskedHeading reveal 完成的握手。
4. `src/lib/canvas-ui/laser.ts:24–34,53–54`：深克隆后清除所有后代 id，未重写任何 SVG 片段引用；只在 createLaser 时克隆一次。
5. `src/components/MaskedHeading.tsx:62,140,153`：每个标题建立 `<mask id=maskId>`，foreignObject 以 `mask="url(#maskId)"` 引用它。

## A · 确定的局部引用缺陷

克隆的 `<mask>` 仍在 defs 中，但 id 被删，foreignObject 的 `url(#原id)` 未变；因此**捕获子树内已无该引用的目标**，无法独立表达原 SVG。当前 MaskedHeading 真正用到的是 mask URL；没有发现其本身声明 `<clipPath>` 或 `<use href>`，不可把其他类型说成已发生的具体缺陷。

“克隆内部悬空”不等于“整个 document 一定找不到”：真实标题仍保留原 mask id，浏览器可能解析到原节点。这样仍依赖捕获子树外定义；HTML-in-Canvas 中该引用能否绘制、字体/media 是否完整以及异常时为空白/缺遮罩/其他结果，本次未运行浏览器，均不能确定。

最小修复：仅在 Laser 克隆步骤给已有 id 分配**每个捕获实例唯一且该实例内稳定**的命名空间，同时重写本克隆内引用这些 id 的 `url(#…)`、`href="#…"`/xlink:href 等。当前必修 mask 属性；处理其余引用是同一函数的完整性保护，不声称当前标题已经使用它们。普通无需引用的 id 可删除；不能只保留原 id 造成文档重复，也不能只删除 mask 属性而丢掉照片字形。保留 inert/aria-hidden，不动真实标题节点。

## B · 确定的一次性快照行为，条件性的隐藏/裁切风险

`MaskedHeading.tsx:85–104` 在真实 SVG stage 上设置 wipe 的起点 opacity=0.18、clipPath=inset(0% 100% 0% 0%)，然后用 GSAP 展开；`:108` 还给 media 写视差 transform。cloneNode(true) 会复制当时的 inline style，但不会复制 GSAP 动画控制器。

Laser 的 `invalidate()`/`setScrollActivity()`（laser.ts:89–98）只 requestPaint/resize；驱动 `LaserVanilla.ts:325–329` 重画传入的 content 克隆，不重新克隆真实标题，也没有监听真实标题 style 变化。因此如果创建时处于 wipe 起点或中途，之后原标题完全展开，捕获仍可停留在旧裁切/透明度/视差。若创建时已经展开则不会出现这次初始遮挡；创建次序和实际遮挡程度需要 tim 看效果，不能报作每次必现。

首屏 inRange/正文 eligibility 与 MaskedHeading 的 once reveal 不是同一就绪条件；现有入口没有保证先完成后克隆。`source.dataset.captureState=ready` 仅由 paint 事件设置（laser.ts:61），不证明字形、mask 或图片完整。

最小方案推荐**静态完整的标题捕获副本**：只在 Laser 克隆内对 `.masked-heading__stage` 明确设为完整 clip、opacity=1、visibility=visible；media 使用不含滚动偏移的稳定 fillScale 状态，保留图片裁切/字形/实际缩放意图，不随意删掉所有 transform 或修改真实 DOM。这样无需增加第二条时间线。若产品要求 Laser 严格跟随实时标题 wipe，则应采用限定标题的样式同步并随 resize/invalidate 更新克隆；这比静态副本范围更大，需另定语义，不同时做两套。

## 建议交给 DEV 的最小卡

首选只改 `apps/landing/src/lib/canvas-ui/laser.ts` 中捕获克隆构造（必要时一个紧邻小辅助）：SVG id/引用映射 + 克隆 stage 静态显示归一化。media 的稳定 fillScale 若无法从现有结构可靠取得，再允许 ProjectsIntro 给捕获提供明确参数；**不改全局 MaskedHeading 动画、空间 runtime、真实正文点击、旧 CTA 或整个 vendor**。

后续定点验证建议（本次没有新增或运行）：同页两个克隆 id 不冲突、每个 mask 引用在自身克隆内可解析、原 DOM id/style 保持不变；从 wipe 初始态克隆后获得完整静态 stage；重复 invalidate 不破坏映射。最终仍由 tim 核对真实 HTML 捕获中的照片字形、首帧、裁切和原文点击。报告交回 PM 后停止。
