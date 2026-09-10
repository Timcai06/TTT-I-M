# VR-Q01 冻结核心技术审查

## 结论

**TECHNICAL PASS（仅限本卡冻结核心）**。未发现需要退回 DEV 的新代码级问题；VR-01、VR-02A、VR-02B 的当前受审文件均与验收快照逐字节一致。

这不是发布通过，也不是浏览器、GPU、Origin Trial 签名/资格、最终美术或叙事节奏通过。那些边界仍由后续浏览器验收与 tim 判断。

## 本次范围与可追溯性

- 审查 checkout：`feat/narrative-kernel`，`55c08029051b11e9687d869747907e20291940fa`。
- VR-01：`output/pm/VR-01/pm-accepted-files.json` 所列 24 项（含 Blender、GLB、scene contract、纹理 manifest）当前 SHA-256 全部一致。
- VR-02A：`output/pm/VR-02A/pm-accepted.json` 所列 5 项全部一致。
- VR-02B：`output/pm/VR-02B/pm-accepted.json` 所列 6 项全部一致。
- 因哈希无偏移，本报告的源码结论针对当前工作区即冻结候选；历史交付报告仅作为证据定位，不单独构成当前通过。

## 核心复核

### VR-01：空间阅读、语义路由与真实几何

- 六章实读页、桥接预览和 `readingSnapshot` 共享 `about/life/frame/stack/work/contact` 主题；克隆清除重复 ID、冻结媒体并继承主题，避免预览页成为另一套主题系统。
- `chapterTracks` 的桥接高度、旅行/贴近/展平相位与语义规格一致；`archiveRoute` 以 sample segment/position 为语义落点，刷新后复算并校验意图，取消时移除 wheel/touch/keyboard 监听。书签仅在真实阅读章之间保留，不把 D1/Index 状态写入章节记忆。
- 直接进入与返回复用同一 `sampleStory` 的 `targetExpand` 和阅读表面投影；未发现第二个世界状态写入者或“固定延时后二次校正”的路径。
- Index 由 ScrollTrigger 进度驱动；检查参数只传给真实屏幕的指针采样，未发现旧的滚动灰度/计时器相机轴。Loader 仅在 `renderReady || readingFallbackReady` 后可达到 100%，且以面板淡出交接，不平移整个视口。
- `archiveCameraRig` 以真实阅读锚点 fit 作为端点；Life→Frame 特例沿 `FootballTransfer` 真正载体求姿并执行深度回退。冻结 VR-01 几何记录中的修复、Blend↔GLB 同步和有限采样结论可由当前哈希关联：2 个桌面尺寸、6 条桥、1,212 个有限样本、170 条 sightline；这是有限边界证据，不是全视角艺术验收。

### VR-02A：Origin Trial 初始 HTML 配置

- 插件在 Vite `pre` 阶段写入初始 head；Production token-only 使用 canonical `https://www.crt-dsg.com`，Preview 必须有平台给出的实际 URL，错误/继承不匹配 token 降级而非声称可用。
- 令牌处理仅做公开 payload 的 Base64、长度、UTF-8 JSON、feature、origin、expiry 与第一方策略检查，并明确不验证签名；代码与部署文档的表述一致，未把实验 flag、构建 mode 或 payload 解析误当作访客实际资格。
- 非浏览器定点复跑：`node --test tests/htmlInCanvasOriginTrial.test.ts`，**9 passed / 0 failed**。

### VR-02B：About 语义资格与异步清理

- About 预览副本关闭 decrypt；真实 DOM 需为已连接的唯一 `#about`，且不能位于 clone/capture/bridge/return、inert/hidden/aria-hidden/不可见祖先或 archive routing 状态中。
- 工厂创建、capture 与首帧均复查资格；真实可见像素与真实 instance 均满足后才 `ready`，空工厂、资源错误、context loss 与超时均回退至 DOM。
- cleanup 覆盖 RAF、定时器、图片监听、MutationObserver、WebGL 监听、capture 子树、instance destroy 与 context lease release。
- 非浏览器定点复跑：`node --test tests/aboutCaptureEligibility.test.ts tests/canvasSurfaceAdmission.test.ts`，**13 passed / 0 failed**。

## 未执行与剩余边界

- 按卡片约束，未运行浏览器、Playwright、截图、服务、构建、全量 guard 或动态 VR-03 文件审查；这些未执行项不是本卡代码失败。
- Origin Trial 的真实 token 签名、注册有效期、目标 Chrome API 能力和首帧仍为 **NOT_RUN**。
- About/Decrypt 的真实 GPU 首帧、反复滚动、context-loss 恢复与视觉表现仍为 **NOT_RUN**。
- 现有全量 guard 曾报告 vendored `DecryptReveal` 完整性登记不匹配；该 vendor 文件不在本卡冻结清单，且本轮未重跑全量 guard，因此不把历史报告直接转写为当前卡失败。PM 已要求在 VR-03 冻结时单独核对登记与完整性守卫。
- tim 仍需对材质、灯光、视差、节奏与整体阅读感作最终人工判断。

## 证据

- [review-evidence.md](../../../output/pm/VR-Q01/review-evidence.md)
- 冻结清单：[VR-01](../../../output/pm/VR-01/pm-accepted-files.json)、[VR-02A](../../../output/pm/VR-02A/pm-accepted.json)、[VR-02B](../../../output/pm/VR-02B/pm-accepted.json)

