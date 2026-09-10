# VR-Q01 · VR-03 R1 最终技术复核

## 结论

**NEEDS_REVISION**。上一轮 Frame P1 已完成代码级闭环，但最终静态复核发现 Work Laser 的资格检查以自身 `aria-hidden` 装饰层为基点，令它在真实运行中稳定无法启动。PM 已要求 DEV 仅修正资格检查基点并重新冻结；本报告保留 R1 已通过证据，但不能作为 VR-03 技术关闭结论。

## 冻结与版本一致性

- checkout：`feat/narrative-kernel`，`55c08029051b11e9687d869747907e20291940fa`。
- `output/pm/VR-03-R1/pm-frozen.json`：11/11 当前文件 SHA-256 完全一致。
- 有效 VR-03 集：24/24 一致；其中原 VR-03 的 18 项保持不变，6 项由 R1 白名单哈希覆盖。R1 新增 5 项均已纳入冻结清单。
- 早期核心：VR-01/VR-02A/VR-02B 的 34 项未授权文件继续匹配 accepted snapshots；`tests/build/chunk-guards.mjs` 是唯一 PM 授权变动，仍匹配 VR-03 冻结值。

## P1 闭环：Frame 标题 capture

上一轮指出的“透明/位移标题被视为 ready”已关闭：

- Frame 现在构造惰性的静态标题副本，只清除克隆 `.word` 上由 `revealWordsOnce` 写入的 `opacity`、`transform`、`filter`；真实 `h2` 未被更改、隐藏或替换。
- `ParticleScroll` 在 `drawElementImage` 成功后、纹理上传和 `onCaptureReady` 之前检查 staging canvas 的实际 alpha；空白、读取异常或尚无像素时 fail closed，不会提升效果层。
- Frame 输出还要求“像素已就绪 + generation handle 已接纳 + 当前语义 surface 仍 live”三项同时成立；清理/资格失效/迟到回调不能重新激活增强。
- 独立复跑：`frameTitleCapture` 与 `laserCapture` 共 **8/8 passed**。

## Work、Contact 与资源边界

- Work Laser 的 capture 修复本身已覆盖：克隆内 SVG id 使用每实例命名空间，并重写 `url(#...)`、`href`、`xlink:href`；静态副本完整显示 stage、清除仅滚动产生的 media 位移，保留稳定 fill scale。真实标题、Glass Bento、章节路由与交互 DOM 未被捕获层取代。
- **P1：Laser 当前无法启用。** `ProjectLaser` 将自身装饰 host 标为 `aria-hidden="true"`，但 effect 入口与 context lease callback 都调用 `canRunLocalEffect(host, 'projects')`。该 helper 从传入节点开始检查 `aria-hidden`，所以在申请 context 前稳定返回 false。Frame 使用真实 title、Contact 使用真实 owner，未共享此矛盾。最小修复是以真实 `capture`/章节节点作为资格基点；不得移除装饰层的 `aria-hidden`，也不得放宽通用 helper。
- 除该阻断项外，Laser 由本章绝对 ScrollTrigger progress 驱动，delta 仅供响应性使用；没有恢复已退役的 Work portal、滚轮拦截或第二条路由时间线。context loss、重试、ResizeObserver、lease 和 StrictMode 代次均有释放/失效路径。
- Contact Liquid 限于真实 `#contact` 的绝对定位背景层；仅当真实章节可读、章节进入范围且指针在本章内时申请 context。离开、资格变化、context loss 和卸载都会移除监听、destroy field、释放 lease 和移除 canvas。语义内容保持前景。

## 相关守卫与边界

- `experience-effects-guards.mjs`：通过，覆盖 R1 static capture、ready 前像素资格、Laser 命名空间、局部资源边界和 vendor integrity 接线。
- `chunk-guards.mjs`：通过；确认 Work 的延迟边界仍在 `work-transition`，没有回退到旧 `workHandoff` 文件名断言，也没有泄漏到 eager entry。
- 两项 advisory 未升级为失败：`archiveRoute` gzip 21.3 KB（参考 12 KB）；总 JS gzip 598.3 KB（参考 584 KB）。CSS 153.0 KB（参考 160 KB）。
- DEV 的 R1 typecheck、lint、production build、完整 guards 与 19 项定点测试记录已阅读，但本 QA 本轮未无变化重建；本轮独立执行的是 R1 新增 8 项测试及两项相关守卫。

## 明确未验收

- 浏览器、Playwright、截图、服务、真实 HTML-in-Canvas 字形/照片 mask、真实 WebGL/GPU 首帧与 context-loss 表现：**NOT_RUN**。
- Work Laser、Glass、Frame 粒子和 Contact Liquid 的最终视觉、可读性、节奏与跨浏览器表现：**WAIT_TIM**；其中 Work Laser 还须先完成上述代码修复与冻结复核。
- 未提交、推送或部署。

## 证据

- [review-evidence.md](../../../output/pm/VR-Q01-R1/review-evidence.md)
- [VR-03 R1 frozen manifest](../../../output/pm/VR-03-R1/pm-frozen.json)
