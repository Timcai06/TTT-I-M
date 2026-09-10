# VR-02P 附录 · 三个旧效果的局部接入边界

2026-09-10，ARCH，DELIVERED。PM 单独授权的有界补充；仅写本附录，未改产品、运行测试或浏览器。基线仍为 feat/narrative-kernel / 55c08029051b11e9687d869747907e20291940fa，加当前未提交候选；DEV 正在写 VR-01，后续卡需在其冻结版本重新对齐。以下是建议方案，不是已接入事实。

**建议顺序：Contact 局部染料 → Work 局部 Laser → Frame 粒子单独定界。** 三者不能通过恢复旧组件开关统一解决；Contact 当前甚至不使用 HTML 捕获。

## 唯一状态入口

现有 `apps/landing/src/core/narrative/types.ts:47` 定义 `StoryPosition { segment, progress }`，`StoryFrame.presentation.readingOwner` 明确真实正文所有者：Frame=`frame`、Work=`projects`、Contact=`contact`，不是章节名 work。`archiveReadingSurface.ts:74` 用此状态设置真实 DOM 的 inert/可见性；不得由效果改回。

`apps/landing/src/components/personal-archive/archiveRuntime.ts:323–355` 完成投影、呈现、composer.render，再递增 committed frameId。当前 ArchiveRuntime 公共接口没有给局部效果的已提交帧订阅；record 是诊断记录，不能用它或 canvas dataset 当生产数据总线。最小新增一个可注销、可读最近值的提交订阅，传 `{ frameId, requestId, layoutVersion, resourceGeneration, position, readingOwner, routing }`；订阅点在成功绘制之后，reading route 时 readingOwner 必须为 null。失败/失效/销毁另发 inactive，使旧效果立刻隐藏；消费者报错隔离，不能让装饰效果击穿主运行时。

这是从现有提交派生的只读通知，不新增 StoryClock、ScrollTrigger 或段落进度。效果只改自身 canvas/局部容器，不改世界、正文 opacity/inert、滚动位置或投影。首个订阅与异步资源 ready 后重放最近状态，避免停在原地时增强永不出现。seek/版本变化不回放途经段，清空临时输入。可见性之外的资源/首帧仍由效果生命周期判断。

## 最小复用与冲突

| 效果 | 现有接口 / 当前阻断 | 推荐局部接入与不能直接保留之处 |
| --- | --- | --- |
| Frame Particles | `src/lib/canvas-ui/particleScroll.ts`：createFrameParticles(source, content, output, onReady, onFailure)，handle.setScrollState({progress,delta})、invalidate/resize/destroy。`particleScrollConfig.ts` 已为 **dissolve**，vendor 的该分支直接设置 signalProgress，不写 content.scrollTop；但仍有 time、introWait、缓动及 rAF。旧 FrameParticleHandoff 仅 mobile/reduced 进入 Legacy，同时内部 disabled。 | 最小安全方案先放在 **frame-reading 的局部非交互标题/装饰区**，捕获该局部 DOM，progress 从已提交 frame-reading 进度映射，离开阅读立即释放；不再捕获整张真实照片，不复活旧 sticky/滚动段。若 tim 要求原“照片消散”画面，则不是等价小修：必须另定真实照片与粒子代理的可见性合同，不能叠在当前照片搬运或 frame-stack 上抢所有权。vendor 增加受控采样模式，把 dissolve 位形与噪声相位从传入进度确定，禁止内部 intro/缓动改变同一 T 的位形；资源 ready 不补播开场。没有这一适配不能声称可逆、seek 一致。 |
| Work Laser | `src/lib/canvas-ui/laser.ts`：createLaser(canvas,capture,beamTarget)，mode html-canvas/beam-fallback；**setScrollActivity({progress,delta}) 实际忽略 progress，只给 vendor delta**。vendor 自增 time、累加/衰减 activity。ProjectLaser 已含可选 context 租约与恢复，但依赖 bento/视口位置。旧 useProjectsNarrative 又有 CTA 事件和独立 GSAP portal。 | 在 **readingOwner=projects 且 segment=work-reading** 的局部标题/卡片上沿做光缝，使用正常阅读进度的短窗口；不要在 stack-work 相机/纸面交接中抢显示。保留 renderer 与租约，增加绝对 `setNarrativeState({progress,phase})`（名称建议）驱动扫描/强度，不能只调用现在空耗的 progress 参数。旧 portal/CTA/锁门不接入，正文始终保持原点击与可见性。限定捕获标题或非交互边缘，改固定视口布局为局部尺寸；HTML 捕获无首帧成功时仅 beam fallback 或隐藏，不伪报 html-canvas 已成功。Glass 与 Laser 同一区域互斥，用现有 glassReady/suppressed 协调而不另建效果调度器。 |
| Contact Liquid | `src/components/FooterLiquidCursor.tsx`：controller.setActive/clear/destroy，内部按 pointermove 调用 splat；`src/lib/canvas-ui/liquidField.ts` 明确 **captureContent:false, distortion:0, blend:0**，detached source，不捕获正文。clear 当前为空操作，真正清理是 setActive(false) 销毁。useFooterReveal 将空间 handoff 的 animated=false，因此液体也关。 | 将液体激活与旧 iris 的 animated 分开，仅在 **readingOwner=contact、非 routing、fine pointer、正文局部区域内** 激活。保留旧 iris 关闭。`footer.css:65` 当前 fixed/100vw/100svh/z-index10001，必须改成 Contact 局部 absolute、裁切于章节背景且低于正文；controller 当前监听全 window，需改局部事件或 bounds 检查，pointerleave 停用并释放。继续 pointer-events:none。不依赖 Origin Trial。流体本身属于局部用户输入暂态，不驱动 T；离开/seek/路由/隐藏销毁后重建，不能承诺同一 T 的指针染料完全一致。若要求连染料像素都由 T 重建，则需另做受控视觉模式，不能沿用现有流体模拟。 |

上表 `src/` 均相对 `apps/landing/`。移动端、减少动态、不支持 API、租约不足、捕获失败保持原正文；不得隐藏原内容等待增强。Frame 的建议保留粒子视觉语言，不等于原整照片消散的等价恢复，需 PM 向 tim 明示这一取舍。

## 后续卡最小建议白名单

- 共用提交通知：`apps/landing/src/components/personal-archive/archiveRuntime.ts`，一个紧邻的轻量订阅模块（如确需），针对订阅生命周期的测试。无需改 sampleStory 的世界/相机模型；阈值从现有阅读进度派生，具体窗口在 VR-01 冻结后定。
- Contact 卡：`apps/landing/src/chapters/contact/useFooterReveal.ts`、`src/components/FooterLiquidCursor.tsx`、`src/styles/components/footer.css`；必要时 Footer.tsx 传区域 ref。先独立交付，不恢复 ContactIris。
- Work 卡：`src/components/ProjectLaser.tsx`、`src/lib/canvas-ui/laser.ts`、`src/lib/canvas-ui/vendor/Laser/LaserVanilla.ts`、`src/chapters/projects/useProjectsNarrative.ts` 及实际 Laser 样式文件；仅接新局部状态、隔离旧 portal 分支，保留其他调用方契约。不得改 WorkTransition 的 gate 重新引流。
- Frame 卡：现有 `FrameParticleHandoff.tsx` 保留空间 bridge；另在真实 Frame 阅读组件内挂局部 surface，复用 `particleScroll.ts`、vendor ParticleScroll 的受控模式及局部样式。先选定具体非照片捕获区再锁文件，不直接允许改真实照片绑定/投影模块。

非浏览器验收建议：乱序/重复提交获得相同受控参数；stale frame/request 与迟到 ready 不复活效果；seek 不补播；reading/routing 关闭时清理；订阅异常不影响主渲染；Particle dissolve 与 Laser 绝对参数不依赖上一帧；Liquid setActive(false) 确实释放；原 DOM 交互属性不被效果写入。以上本次未运行，视觉、捕获首帧、裁切和点击仍由 tim 验收。

不恢复 Index 下滑、灰幕、旧 CTA 锁门，不新增叙事时间所有者，不覆盖真实照片转移。交回 PM 后停止，待确认局部增强意图及 VR-01 冻结后由 DEV 串行实施。
