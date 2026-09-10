# NR-02P · 可派发的接管实施边界

2026-09-09，ARCH。状态：规划交付，待 PM 审查；本报告不是产品实施或视觉验收。依据 [NR-02P v1](../cards/NR-02P-execution-boundary.md)、[原合同第 5–7 节](NR-00-contract.md) 与 [v2 修订](NR-00-contract-v2.md)。以下四项按 PM 最新已派发的 [NR-02A](../cards/NR-02A-animation-execution.md) 约束收敛；固定为 NR-02A（唯一 rig、生产 legacy）→ NR-02B（完整接管），最多两张串行卡，不再拆准备链。这里的 A/B/C 基础能力指 NR-01A/B/C，不与 NR-02A/B 混淆。

基线：`/Users/tim/DEV/TTT I'M/portfolio`，`feat/narrative-kernel`，HEAD `55c08029051b11e9687d869747907e20291940fa`。A/B/C 含修订已由 PM ACCEPTED；开工 14/14 指纹匹配。报告编写期间 PM 已派发 DEV 的 NR-02A，因此结束时允许其卡片白名单内的并行变化；必须与 ARCH 自身写入区分，不能声称仍是冻结代码。源码依据见 `output/pm/NR-02P/source-reference.json`，起止指纹单列。本轮未运行产品、测试或浏览器。

## 决策 1 · 固定 NR-02A 的唯一 rig，NR-02B 复用其 action 集合

**采用已派发的 NR-02A → NR-02B，只有 B 启用页面样段。** A 负责新增 `archiveAnimationRig.ts`：runtime 为模型构造唯一 rig 并注入 Director，mixer/11 actions 只在 rig 内持有；生产继续 legacy，相机/page/session 行为保持。B 不再搬迁或重建 mixer，新增 `archiveExecution.ts` 作为这一个 rig 的调用协调器，负责完整世界计划、非动画载体/monitor 和扩展读回，内部不得创建 mixer/action。B 再迁出 Director 的世界/DOM 写入，保留 legacy 计划与相机解算。整个模型生命周期始终只有 A 的一份 action 集合。

A 的交付报告/实际 API 尚待 DEV 交回与 PM 接受，本文的方法语义是对接要求，不冒称已有签名。B 开工只需定点读取 `archiveAnimationRig.ts`、A 报告与验收；接受 owner token、sample(world)、legacy seek/update、readback、dispose 这些实际能力，用 coordinator 适配真实名称，不因命名不同再造执行模块或重做 A 测试。

以下接管变更均属于 **NR-02B**，不改变 NR-02A 正在执行的 legacy 等价边界。Director 在 B 改为 legacy 状态计划与 legacy 相机求解器：先返回全部 11 通道的目标量、monitor/载体策略，再由 executor 应用；物体矩阵完成后才能调用 legacy 相机求解。原 `pose/navigationPose` 的物件循环、`mixer.update`、monitor visibility 和 `page.style` 写入全部迁出，不能在它们外面加一个 gate 就算完成。sample 分支只消费 A 的 `StoryFrame`，不能再调用 `chapterPose/archiveScrollPose` 重解释世界或相机。

### 唯一持有与调用接口

- runtime 仍持有 A 的唯一 rig 及释放责任，将其引用交给 `execution`；B 中 Director 不再直接调用 rig 写入。调度时生成不可外泄的执行许可 `{kind: foreground|prepare, owner: sample|legacy, requestId, ownerEpoch, resourceGeneration, layoutVersion}`；adapter 只注册页面、进度和请求，不能取得 mixer/action。
- coordinator 只接受完整计划；A rig 继续精确解析 NR-01B 的 `PERSONAL_ARCHIVE_SCENE_BINDINGS`，不再按 clip 前缀扩展匹配。执行前一次校验输入、绑定与许可；缺一条关键通道就拒绝整次应用，不半写后跳过。
- 动作采样直接复用 A rig，B 不复制其 action 循环。A 应保证每次 seek 对每个实际 action 清除 fade/warp/累积播放影响，采用 `reset → setLoop(LoopOnce,1) → setEffectiveWeight(1) → setEffectiveTimeScale(1) → play → paused=true → time=区间插值`，最后统一 `mixer.update(0)`，以 A 交付的已验收调用顺序为准。读回实际 `enabled/paused/time/weight/effectiveWeight/timeScale/effectiveTimeScale/loop/clampWhenFinished`，不能把设定值当读回。`clampWhenFinished=true` 显式恢复；预期 paused 时 effectiveTimeScale=0、基础 timeScale=1，须在真实 Three 实例验证。
- 每帧 11 条全部赋值，0 是采样区间起点，不是节点 TRS 归零。样段不读 session Map。依 B 表绑定，随后执行载体/monitor 可见性，再更新完整模型矩阵并复制锚点。camera 和 presenter 不能随后再写这些节点。
- `dispose` 先撤请求/lease，再由 runtime 唯一调用 A rig.dispose，由 rig 内部执行 `stopAllAction/uncacheRoot`；detach、阅读停驻、Index/Work 切换、同模型 GPU 恢复不释放 action。若以后真的重解析模型，先释放旧 rig，再为新模型创建唯一新 rig。

| 语义输入 | 实际 clip → 通道 | 时间区间 |
| --- | --- | --- |
| notebook.openness | NotebookOpen → NotebookHinge.rotation | 0…duration |
| envelope.openness | LifeEnvelopeOpen → LifeEnvelopeHinge.rotation | 0…duration |
| photo.extraction | LifePhotoExtract → LifeMemoryPhoto.translation | 0…duration |
| wallPrints.settling | FramePrintSettle_04 → FramePrintPivot.rotation | 0…duration |
| 同上 | FramePrintSettle_01 → FramePrintPivot_01.rotation | 0…duration |
| 同上 | FramePrintSettle_02 → FramePrintPivot_02.rotation | 0…duration |
| 同上 | FramePrintSettle_03 → FramePrintPivot_03.rotation | 0…duration |
| cabinet.drawerOpenness | WorkDrawerOpen → WorkDrawerRoot.translation | 1…2.4s |
| 同上 | CinemaRailTravel_Left → Cinema_RailMiddle_Left.translation | 1…2.4s |
| 同上 | CinemaRailTravel_Right → Cinema_RailMiddle_Right.translation | 1…2.4s |
| cabinet.folderLift | WorkFolderLift → WorkFolderPivot.translation | 74/30…110/30s |

B 的静态表、检查器、A 的类型/版本/采样以及足球 resolver 保持不改。按 NR-02A 约束复用绑定层的静态描述/区间辅助（A 若已迁出 C 则消费其新导出），执行层不反向依赖诊断模块；C 的未知事实不得删掉。新的动作真实读回调用 A rig.readback，coordinator 追加载体/材质等实际值，C 的 `legacy-post-render / actions unavailable` 记录不改装成 sample 提交记录。

### legacy session 与跨域种子：明确保留范围

按 v2 的 D1，样段物件完全由 T 复原，阅读书签继续由 `archiveReadingMemory.ts` 保存。NR-02 不顺手全站删除 legacy session：在连续 legacy 域内保留现有 floor 语义；但 session 只在成功的前台 legacy 提交后更新，计划计算、两端矩阵预求、预热和校色不得 remember。

每次 sample→legacy 交接清空旧 floor，并以目标 legacy 的**现有 authored 状态**种子初始化，再计算当前 pose；不从物件现值或过去到达最大值 seed。entry/index 所有 11 量为 0（entry 随其当前位置开启 notebook）；frame-stack 起点 notebook/Life/四张 Frame=1、drawer/rails/folder=0；Work 阅读 notebook/Life/Frame=1、drawer/rails/folder=1；Contact 阅读前七动作=1、drawer/rails=.35、folder=0。其余旧桥使用当前 `chapterPose` 的绝对 authored 值。legacy→sample 不携带 floor。这个有意的跨域 reset 落实 D1；纯 legacy 行程其余体验保留，后续 NR-05 再移除其历史机制。

A rig 的 token 代次必须随同 runtime 的 permit 一起验证，记录为 rigGeneration；runtime 不以自己的 ownerEpoch 代替 A 的 token 检查。prepare 在隐藏且前台提交暂停时顺序借用 rig，用户 T/U 保持；准备结束重新取得当前 owner 的有效 token 并重采样，不能持跨 await 的旧 token 写入。legacy 导航端点预求只在 legacy 域内进行。

切换顺序固定：取消旧 request → 增加 ownerEpoch → 撤旧 lease 的空间样式/交互 → 选择目标与完整计划 → 同帧提交 → 当前请求结算。旧 cleanup 只可清理仍属于自己 lease 的节点/样式；不能恢复过期 previous 或删除新请求的 routing 标志。

## 决策 2 · 全入口收口与 StoryPosition 来源

新增 `archiveSamplePosition.ts` 只负责五段的布局快照、归属选择和 T↔scroll 映射，不是全站 StoryClock。`ArchiveStage` 注册 entry、about-life、life-frame、frame-stack 的真实 ScrollTrigger 与三个阅读区。桥重叠时使用刷新完成后的数值区间，不能以最后一次 React effect/activeId 为主。

设四个桥为 E、AL、LF、FS，使用其实际 start/end：about-reading `[E.end, AL.start)`；about-life `[AL.start, AL.end)`；life-reading `[AL.end, LF.start)`；life-frame `[LF.start, LF.end)`；frame-reading `[LF.end, FS.start)`。非空阅读区进度按区间线性映射；右端归下一段，桥 endpoint=1 归目标 reading 的 0，FS.start 归 legacy。反向同样选择，不另存方向修正。零长阅读区可省略但不能除零；逆序/缺失/非有限区间不猜测为有效布局。

`ScrollTrigger` 全局 refresh 完成事件后，统一采集 range、viewport/DPR、page 本地宽高和投影容器原点，验证后才发布新 layoutVersion。`onChaptersReady` 的列表不含 Life，不能单靠它宣布样段可定位。沿用现有 requestRefresh 合并机制，注册/卸载负责失效；不为 ready/failed 改变重建样段 trigger。布局失效期间保留最后 T，等待新布局重映射；直接请求先解析书签/子锚点，取得目标 T，至该请求提交前不被中间滚动事件覆盖。普通滚动使用 Lenis 已应用后的实际 scrollY；重复同值不新建持续绘制。

下表中“提交”均指第 3 节同一执行链；不是允许另一路局部修补。

| 当前入口 / 直接调用者 | T 或旧输入来源 | NR-02 要改的文件与拦截点 |
| --- | --- | --- |
| runtime.draw；Surface progress 订阅 | AL/LF 映射到五段选择器；其它 shot 仅作为 legacy 候选 | runtime、Director、executor；在旧 pose 之前路由，样段不调用旧 pose，旧 draw 也通过同一 executor |
| drawRest / restoreRest；Stage 的 rest(activeView) | 当前已提交布局+scroll/request 选择；阅读 T 保持 | runtime、Stage、selector；sample reading 优先于 activeId 与 Life 中线特判，不再走 navigationPose(view,view,1) |
| drawNavigation / runtime.navigate；archiveRoute.playRoute | 样段相关走显式目标 T；legacy↔legacy 保留 from/to/p | runtime、archiveRoute；分流必须早于隐藏 active.page，尤其早于目前两次 navigationPose(0/1) 和 root route-matrix 写入。runtime 再拒绝任何涉样段的 legacy navigate 作为防漏检查 |
| legacy 导航两端矩阵预求 | 两份纯 legacy endpoint 计划 | Director、runtime、executor；使用 prepare 许可和 session 副本，不 remember；同一 mixer 顺序采样，无 DOM提交；完成后立即恢复当前正式计划，再允许可见绘制 |
| 首次 prewarm：当前先 pose、compileAsync、再 draw | 固定准备位置，不成为用户 T | runtime、executor；prepare 专属许可、canvas 隐藏、无 page/hit/ready/书签/session 更新。await 前后验证许可，结束后按最新用户 T/legacy输入重新提交 |
| calibrateRoomPaper 及其内部 composer.render | 明确 entry .94 校色准备计划 | runtime 包装 prepare 许可；保留 roomPalette.ts；校色额外离屏 render 标为 preparation，不分配用户 committed frame。校色后恢复当前完整状态 |
| webglcontextlost/restored 与超时 | loss 时保存当前 T；恢复末尾取最新请求，不用恢复开始的旧 shot | runtime；loss 立即增加 resourceGeneration、使旧请求失效，清空间交互。每次异步恢复检查代次/abort；同模型复用 mixer，成功重采样后才 ready，超时走正文 fallback |
| resize、字体/图片/pin refresh | 保持语义 T，用新 layout 映射 | runtime、Stage、selector；resize 只更资源尺寸并失效布局，禁止先独立写 camera.aspect 再画旧 rest。相机 aspect 在正式 solve 中取新快照；一次 schedule 合并 |
| activate；PersonalArchiveSurface effect | 注册 page/source/track/progress 与有效 lease；输入由 selector 决定 | Surface、runtime；旧 active 栈不能按注册顺序夺 owner，不在许可外 hide 前任 page；隐藏/未选中的 adapter 不报告已成功提交 |
| detach / resumePrevious / mount cleanup | 重新选择最新有效 T/legacy 候选 | Surface、runtime；先撤自己的 lease，重新仲裁，禁止直接 replay previous。stale cleanup 不隐藏新 page、不清新 root 属性。mount 只持有固定 canvas |
| AL/LF onUpdate、onRefresh、ready/release | trigger 提供区间和候选 p，runtime 选唯一 T | ArchiveChapterBridge、Surface、selector、presenter；迁出样段 phase、stage/copy/room/vignette/target-opacity、live-target、hit 的写入；保留 inert sourceSnapshot 捕获，捕获不等于获得提交权 |
| 样段正文停驻、About entry 结束 | 三个 reading 段，完整 p | Stage、PersonalArchiveBridge、presenter；live 正文是唯一交互 owner，preview 退出；entry 的 --archive-reading/cleanup 仅在 entry lease 下有效，不能覆盖 sample About |
| Index 检视→样段、样段→Index/entry | 当前请求目标或实际边界；Index 保留其原 progress | ArchiveIndexSurface、runtime、archiveRoute；取消检视 rAF、清 pendingScroll，不让 release 动画完成后重放旧 Lenis scroll；Index 页可见/可交互交给当前 presenter，返回 legacy 显式 seed |
| Work/Contact→样段、sample→Frame→Stack/Work | sample 从 A 写全；legacy 用第 1 节目标 seed | runtime、Director、executor、archiveRoute；样段 drawer/rail/folder=0、两个 monitor=false，无 max floor；Frame→Stack 的 Final Horizon 身份和原曲线不迁移 |
| hidden→visible、pointer/ambient | 同一 T + 本帧短期 pointer 输入 | runtime、cameraRig；沿用一个 schedule，取消隐藏 rAF；重新可见按当前 owner 重提交。reading 不依赖 active 非空才能刷新，也不新增常驻循环 |
| dispose / fail / request cancel | 无新的故事输入 | runtime、presenter、archiveRoute；先失效 request/epoch，再撤空间遮挡/hit，统一释放。诊断异常不触发 fail，真实绑定/渲染错误不得吞掉 |

Index 实际检视存在 `pendingScroll` 的动画完成后重放；entry cleanup 会移除 `--archive-reading`；二者必须列入产品白名单，不能只改 AL/LF bridge。环境动画继续归 atmosphere，作为非叙事动态记录，不成为受控 11 通道的第二 writer。

## 决策 3 · NR-02 做真实同帧基线和即时导航，NR-03 做连续体验

### 照片基线：按 placement 到墙端点切换既有两载体

选择 `photoMode = endpoint-switch-v1`，不增加网格、纹理或图库记录。`placement.kind=life` 或 `life-to-frame` 时显示 LifeMemoryPhoto/Life_PhotoPaper，隐藏 ArchivePhoto_04/PhotoMount_04；`frame-wall` 时相反。父节点、局部 scale、材质、纹理、UV 使用现有值，11 clip 照常执行。只改变对应载体及背纸可见性，不能隐藏 FramePrintPivot 而连带杀死阅读锚点。

因此 AL 抽出由真实 clip 驱动；LF 的转移期间照片仍留在源物件，A 的 travel 到 1（当前 p=.56）时瞬时切到墙，在当前 targetReveal=.60 开始前就位。每帧仅一处显示，反向按同一状态切回。读回同时记语义 placement、实际 carrier flags 与 `transferGeometryApplied=false`；这明确不是连续转移。没有移动中的第三载体，也不把 A 的 transfer progress 写成“实际转移距离”。样段外恢复存储的资产基线载体状态；紧邻 Frame→Stack 出口显式 seed 墙面载体、源隐藏，避免切换瞬间复现一对照片。该 seed 归 executor 管理，后段曲线保持。

NR-03 再替换这个基线策略，完成源→转移→墙的路径、曲面/裁切/遮挡与返回编排；保持同一 contentId 和执行域，Final Horizon 仍独立。硬切是 NR-02 已知可见限制，只能接受为中间交付。

### 相机、投影、正文提交顺序

1. runtime 取得最新有效 request/owner/resource 与不可变 LayoutSnapshot，调用 A `sampleStory` **一次**。全部数值/绑定准备好后才允许写入。
2. executor 应用 11 action、两个 monitor 与照片基线，`mixer.update(0)` 后更新模型矩阵，复制必要锚点；不留下跨帧引用。
3. `archiveCameraRig.ts` 用 A 的 CameraIntent 求最终相机：surface-fit 用相应 view 的 FOV 与实际四角求法向、中心和容纳宽高的距离；handoff 用 source/target view 插值 travel，现有 AL `[-.12,.09,.04]`、LF `[0,.10,.20]` 弧向量乘 A.arc，依 A.align/dolly 拟合目标，再按 A.leave 拟合源。距离沿用现有 `d + (max(.5,1.8*d)-d)*(1-dolly)`；不得再用旧 .60/.78 的导航相位。
4. pointer 是显式短期输入，样段首轮保留小幅偏移：handoff 增益 `smoothstep(.24,.32,p)*(1-align)*(1-targetExpand)`，reading 为 0；这里保留旧 pointer 入场响应区间，只属于显式短期偏移，不重新采样动作或相机故事相位。位移量沿现有相机 x=.032、y=.020 和 target x=.008、y=.006 的系数，在 source/target surface 拟合前加入。相机最后一次更新投影/世界逆矩阵后复制 FinalCamera；本帧后续不再 lookAt/改 FOV。确定性验收 pointer=0，另测相同短期输入序列。
5. readingSurface 从复制的锚点和 FinalCamera 计算 source/target/hit 的数值投影，不再访问活动 camera 或 getWorldPosition 补算。source/target 统一 finite、near、depth、退化检测；保留现有 .0018/.0015m 防重合偏移并在读回记录。NDC→CSS 用 viewport，pageMatrix 的输入平面大小用 page 本地 width/height，并扣容器原点；不能继续把 page.clientWidth 当 viewport。页面 transform-origin 保持并记录为 0 0。
6. 一次校验全部投影后，presenter 同步写受控 DOM、CSS、hit、focus。使用 A 的 sourceReveal/sourceExpand/targetReveal/targetExpand；当前 reveal 是 .60–.77，不能沿用旧 sheet 的 .66–.74，readingOwner 以 A 为准。focus 开启条件为 A.focusEnabled 且无有效可见阅读预览，aperture 使用 A 值；记录实际 pass 值。样段 CSS 的 guidance 等非核心装饰可从当前 T 算，但只能由此 presenter 写，不重新定义世界/阅读归属。
7. readingOwner 非空时显示唯一 live 正文并隐藏 inert previews；桥中 sourceSnapshot/target preview 均 inert，live 正文禁用交互，room-hit 仅在 A允许且投影有效时启用，否则清几何、disabled/tabIndex。About 的 --archive-reading 与 Life/Frame --archive-live-target 也归当前 presenter；读不到目标正文直接 fallback。
8. 验证 stamp 仍匹配，`composer.render()` 成功且 shader 检查通过才发布 CommittedFrame/结算当前请求。诊断复制错误隔离，不改 ready；实际绑定/渲染失败发布 readable-fallback 并撤空间遮挡。本轮同步提交无 await，准备与校色 render 不计入 committed。

这证明逻辑同帧顺序，不能声称显示器原子呈现。相机数值连续性和实际 DOM 配准尚待实施测量；照片硬切除外，其余差异不能用“留 NR-03”掩盖。

### 路由接缝：现在搬入最小样段请求事务

NR-02 修改已有 `archiveRoute/chapterScroll/ChapterTransition/App` 的样段分支。命中条件是**源、目标或当前 owner 任一属于样段**，包括 About/Life/Frame 正文、AL/LF 桥和 `frame-*` 子锚点；不只比较目标 ID。legacy↔legacy 的 WAAPI 路线保留。

- `archiveRoute.ts` 实现一个样段即时请求入口，返回 `committed | readable-fallback | cancelled`；这是本轮唯一 requestId/cancel 的 owner。`chapterScroll.ts` 拆出原始定位 helper，并注册可返回 `{handled:true, completion:Promise<SeekResult>}` 的样段拦截器。它不反向导入 runtime；由 ArchiveStage 安装拦截器，布局模块提供同步域识别。无 handler/无 runtime 而目标属于样段时使用可读原始定位，不能调用旧 navigate 补救。
- 顺序：新请求先取消旧 route/WAAPI/Index 检视 → 确定目标（restore=true 才读现有书签）→ 以原始定位 helper 即时落点 → 刷新完成后获取同版本 T/layout → runtime 提交 → 当前请求才报告到达。所有异步等待携带 requestId/signal；wheel/touch/导航键、第二请求、lease释放或资源代次变化使旧请求 cancelled。布局刷新在同请求内保留 T 重映射，旧 layout 结果丢弃。
- `routeBetweenChapters` 在 `playRoute/cloneViewport` **之前**分流；`runtime.navigate` 入口在任何隐藏页面/两端预求前再拒绝涉样段旧调用。拒绝不能映射成“失败后再试旧路由”；上层落到可读定位并明确 fallback。
- `ChapterTransition` 的 source 缺失、source.id 相同分支同样走拦截器并等待 completion，不能用 nextFrame 代替提交。旧布尔 arrived 接口可以在 route 边界将 committed/readable-fallback 映成 true、cancelled 映成 false；内部必须保留区分以报告空间是否成功。
- `App` 的样段深链使用这一请求，并跳过该请求的 120/520/1100ms 三次旧修正。保留非样段逻辑；字体/图片变化由同布局版本机制重新定位，不由旧定时器抢回。Frame 主题子锚点也必须命中，不能仅处理 #frame。
- `routeToArchiveObject` 即时返回：Life→AL.p=.56，Frame→LF.p=.56；About 当前回物件实际是 **legacy entry.p=.48**，需先释放 sample 再用 entry 的绝对状态提交。使用实际 trigger start/end；找不到有效 range 时留在可读正文并返回原因，不套旧估算公式。
- `archiveReturn.ts` 已在返回前记阅读书签，保留；返回后再进入正文继续用 `restore:true` 解析原书签，包括长 About 和 Frame 深处。保留 `readingSnapshot` 的真实阅读内容捕获，NR-02 不改书签存储，也不重建第二棵可交互 React 内容树。
- 普通滚动和重叠桥通过 selector 接管，无需 route API；sample↔Work/Index 的直接导航本轮也即时落点，避免以保留外章动效为由允许旧导航横穿 sample 写域。取消后的旧 finally 只清自己拥有的 routing 标志，不能 setStage('live') 覆盖新事务。

NR-03 接着用这同一个 request/completion 协议做完整收回/返回动画、连续照片和阅读捕获精修；NR-04 才把 ScrollMap/StoryClock 与非样段全局导航合并。不再延期上述即时分流，也不扩为全站路由重写。

## 决策 4 · NR-02B 一张完整接管卡的范围、验收与回退

### 产品与测试白名单

前置 NR-02A 的文件范围、生产 legacy、真实 rig 验收均以其已派发任务卡为准，本文不追加 A 的工作。**以下是 A 经 PM 接受后 NR-02B 的完整白名单**，以仓库根为基准：16 个产品文件和 5 个测试文件，不使用目录通配授权。新增文件包含真实职责，不建空模块。NR-01 的既有 14 文件以 NR-02A 验收时的实际状态重取基线，B 只追加修改其中 runtime 和 C e2e，其余 12 文件不在 B 写域。`archiveAnimationRig.ts` 与 `archiveAnimationRig.test.ts` 在 B 只读复用；若 A 的真实接口缺必要能力，先交 PM 定点调整，而不是自行重写 rig。

| 产品文件 | 操作与限定责任 |
| --- | --- |
| apps/landing/src/components/personal-archive/archiveRuntime.ts | 修改：复用唯一 rig、持有 coordinator、owner/lease、调度、prepare/recovery、提交与降级 |
| apps/landing/src/components/personal-archive/archiveDirector.ts | 修改：A 已搬出 mixer/action；B 迁出剩余 rig 调用和 DOM/visibility，保留 legacy 计划、session/seed 和 legacy 相机解算 |
| apps/landing/src/components/personal-archive/archiveExecution.ts | 新增：验证完整世界计划、调用 A rig、载体基线、扩展实际读回与有界诊断；禁止创建 mixer/action |
| apps/landing/src/components/personal-archive/archiveCameraRig.ts | 新增：仅样段 CameraIntent+数值锚点+布局+短期输入→最终相机 |
| apps/landing/src/components/personal-archive/archiveSamplePosition.ts | 新增：五段有效布局快照、域识别、T 与实际滚动映射；无全站时钟 |
| apps/landing/src/components/personal-archive/archiveReadingSurface.ts | 修改：数值投影与受控 presenter 分开；legacy 包装保留，sample 不重采旧相位 |
| apps/landing/src/components/personal-archive/ArchiveStage.tsx | 修改：布局/请求接入、sample reading rest 仲裁，固定 canvas 不变 |
| apps/landing/src/components/personal-archive/ArchiveChapterBridge.tsx | 修改：AL/LF 注册与供输入，移除其竞争样式/交互 writer，保留其它桥行为 |
| apps/landing/src/components/personal-archive/PersonalArchiveSurface.tsx | 修改：注册/释放 lease、真实提交回调，避免 effect 顺序抢占与过期 cleanup |
| apps/landing/src/components/personal-archive/PersonalArchiveBridge.tsx | 修改：entry→About 的受控样式交权及旧 cleanup 约束；开场曲线/像素效果保留 |
| apps/landing/src/components/personal-archive/ArchiveIndexSurface.tsx | 修改：请求取消时终止检视动画、pendingScroll 重放；不重做 Index 内容 |
| apps/landing/src/components/personal-archive/personal-archive.css | 修改：样段 presenter 状态、唯一交互/可读 fallback；不全站换视觉 |
| apps/landing/src/lib/archiveRoute.ts | 修改：样段即时事务、取消、返回物件、旧 route 分流与 request 所属清理 |
| apps/landing/src/lib/chapterScroll.ts | 修改：原始定位 helper 与样段拦截协议，原书签/Lenis/offset 语义保留 |
| apps/landing/src/components/ChapterTransition.tsx | 修改：桌面样段/无源/同章等待提交结果；不重写 mobile shutter |
| apps/landing/src/App.tsx | 修改：样段深链与三次延迟纠偏分流、等待布局；其它应用职责不动 |

| 测试文件 | 操作与必要覆盖 |
| --- | --- |
| apps/landing/tests/archiveExecution.test.ts | 新增：使用 A 实际 rig 验证完整世界协调器、非动画状态、许可与 prepare/session 隔离；A 的真实 GLB 动作测试只读复用，不复制一套动作实现 |
| apps/landing/tests/archiveSamplePosition.test.ts | 新增：半开边界、重叠/无效布局、T 映射与新旧请求取消；固定预期，不调用被测函数生成期望 |
| apps/landing/tests/archiveCameraProjection.test.ts | 新增：实际 Three 相机、手工可核四角、viewport≠page 尺寸、source near/退化、冻结副本 |
| apps/landing/tests/e2e/archive-execution.spec.ts | 新增：真实 GLB/action/node/camera/DOM 与完整入口/恢复/失败矩阵；运行方式沿现有 Playwright 配置 |
| apps/landing/tests/e2e/archive-shadow.spec.ts | 修改：C 回归显式使用启动时 legacy 兼容模式，保留原正常/初始化故障/真实绘制失败断言，不能弱化为只查开关 |

提供只在 runtime 创建前选定的 `archiveSample=legacy` 兼容模式，用于 C 隔离回归及紧急降级；默认 sample。此模式仍使用**A 的同一个 rig 与 B 的 coordinator**，只是选择 legacy 计划，不恢复 Director 中的旧写入代码；切换需整页重新初始化，禁止热切换后保留一半 DOM/旧 lease。selector/bridge/routes/presenter 必须读取同一初始化模式。sample 模式下 C hook 不伪造 legacy 观察，新诊断另记 sample-committed；C helper 本身不修改。

不改 core/narrative 四文件、sceneBindings、archiveStoryShadow、narrativeObjects、内容数组、GLB/manifest、导出器、依赖/构建配置。`readingFrame/pageProjection/roomPalette/readingSnapshot/archiveReadingMemory/archiveReturn/requestRefresh` 复用；如实施证明必须改白名单外文件，记录具体调用阻断交 PM 调卡，不能自行扩范围。

两张串行卡的退出点固定：NR-02A 只交唯一 rig 与真实动作读回，默认页面 legacy，其独立验收不代表样段已接管；A 经 PM 接受后，NR-02B 内依次完成 legacy 纯计划/prepare 入口 → sample 世界/最终相机/投影 → 生命周期/阅读停驻 → 即时路由/Index/entry 取消 → 下列真实验证。B 全部入口收口后才交默认 sample 候选，不再拆 B1/B2 或先开 gate 后补导航的运行卡。

### 快照字段的真实生成责任

| 字段 / 数据 | 唯一生成者与时点 |
| --- | --- |
| storyVersion/contentVersion、position/world/intent | A.sampleStory；每次选择 T 后生成；书签不进 world |
| assetHash/bindingVersion/photoMode | coordinator 准备；assetHash 对实际 fetch 的 GLB 字节计算并与本卡基线对应，bindingVersion 为本次绑定实现标识，不能拿静态文件名冒充资源版本 |
| layoutVersion/viewport/DPR/pageSizes/containerOrigins/spans | Stage+selector，在完整 refresh/尺寸采集且合法后递增并发布；失效期间无新 layout-ready |
| resourceGeneration、ownerEpoch | runtime：资源失效起点/owner更换与释放分别递增，不等恢复完成才加 |
| requestId、cancel 原因 | archiveRoute 的样段请求入口；自然输入通过同一登记接口建立最新请求上下文，runtime 不再造独立导航序号 |
| attemptId、frameId | runtime：attemptId 在尝试起点递增；frameId 只在成功 render 后分配并发布。准备帧只有 prepare trace；失败有 attemptId/reason，无伪成功 frameId |
| action 实值、node local TRS/worldMatrix/parent/visibility、材质/纹理标识与 flags | 动作/动画节点由 A rig.readback、其余节点/材质由 coordinator：apply 后数值副本；render 前诊断阶段再读一次验证没有中途外写。纹理身份用 src/hash/用途，不用随机 UUID 跨新模型比较 |
| FinalCamera（position/quaternion/view/projection/FOV/aspect/near/far） | runtime 在 rig 最终相机更新后读 actual camera；cameraRig 意图不是最终读回 |
| source/target/hit 投影、CSS矩阵、偏移/有效性、交互归属和 pass 实值 | readingSurface 从同帧数值输入解算；提交后测试另读 computed style/DOMQuad/实际禁用状态，不能只复制计划矩阵 |
| CommittedFrame、request completion | runtime 成功 render 后发布不可变副本，route 仅结算仍有效请求。诊断注册/读取/清理全程隔离且有界，不是 ready 前置条件 |

帧轨迹至少标明 permit-check → actions/world → matrix/anchors → camera → projections → DOM/passes → render → publish；保存各阶段实际值。单一 frameId 复制到每个字段不证明这些调用真的按序发生。

### 缺关键绑定与可读降级

B.inspect 必须 valid 且 11 动作/30 必需节点、锚点父关系、时域、真实材质/照片载体等执行依赖全部可用，才允许 sample prepare 成功。invalid/unknown 都结构化记录具体 binding/node/property/reason，并阻止整次 sample 应用；新的验收不能把“静态未知”变成成功。sample 能力检查失败只标记该能力不可用，初始仍可维持可运行的 legacy Index；跳过无效 sample 预热，进入样段时走正文 fallback，不为新增检查把无关章节一并判失败。原有全局资源失败仍沿既有处理。

资源或关键绑定失败、投影非法、DOM目标缺失时：取消当前空间请求与 lease，隐藏 canvas/空间预览，清 hit 与 root routing/route matrices、桥遮挡及 stale live-target 隐藏，恢复 About/Life/Frame 正文及继续阅读/返回控件；保留书签与 hash 目标。沿用既有空间 failed/正文 fallback，不调用伪造 scene ready，不等待永远不会到来的 ready。Loader 不把不可用空间声称 renderReady；不新增全站 Loader 规则。若 roomPalette 校色所需节点不可用，也从同一准备失败出口可读降级。

无效投影的 hit 必须本帧清空，不能保留旧矩形；先计算全部再写 DOM，失败不部分露出两个可交互副本。diagnostic-error 与真实 execution-error 分开：前者不改变体验，后者不能被诊断 catch 吞掉。减少动态/窄屏仍走现有 DOM 模式，不开放手机 3D。

### 最小验收矩阵（将来实施卡运行；本轮全部 NOT_RUN）

| 编号 | 必做场景 | 独立证据与退出条件 |
| --- | --- | --- |
| V1 · 真实动作确定性 | 同配置新解析真实 GLB A 直接到 T；新解析 B 经 Index→entry→AL→LF→Frame→Work→倒滚/随机 seek→同 T。按一次一个 context 顺序取证 | 五段端点及 AL/LF .08/.20/.23/.24/.26/.56/.60/.62/.72/.74/.77/.94 两侧 epsilon、1。11 实际 actions 全字段及所有受控节点/材质/载体/monitor 对比；独立按绑定表手算 amount→seconds，不以 candidate 自比代替 |
| V2 · 相机与 DOM | AL/LF source 收回、转场中、target reveal、expand、三个 reading 停驻；另测 viewport≠page尺寸 | 实际 Object3D 矩阵+actual camera 独立重投影四角，对实际 computed matrix 映射的 DOM 四角/DOMQuad；测量可用方法和坐标系写明，不能用轴对齐 bbox 证明透视四角。frame/stamp/调用序列也一致 |
| V3 · writer 与生命周期 | draw/rest/nav两端预求/prewarm/校色/resize/activate-detach-resume；两个桥同时相交；Index 检视关闭中直达、Work→sample | 样段整个受控域没有 legacy pose/navigationPose 写入；每次前台提交 mixer.update 恰一次，旧清理不再写新 DOM。11 handles 长寿命/唯一 mixer；prepare 单独分类，原 T/U 不变 |
| V4 · 导航与书签 | 三章互跳、外章进出、无源/同章、Frame 子锚点深链、返回物件再回长文；请求中用户取消/第二请求 | 当前请求才结算；sample无旧WAAPI端点求值/三次旧修正。About 返回 entry .48、Life/Frame .56 真实落点；书签恢复到原阅读区间与内容，不只章首 |
| V5 · 布局/恢复 | 字体/图片完成、pin refresh、resize、context loss→restore；恢复等待中换请求/退出；隐藏→可见 | 新 layout 维持 T，旧 layout/generation/request 无成功提交；恢复后真实 action/camera/DOM 对应最新 T；scene ready 只在当前有效完成后，未获取 WebGL 时为 BLOCKED/NOT_RUN 而非 PASS |
| V6 · 故障/隔离 | 内存故障夹具删关键 clip/node、改父关系/未知 channel、无效投影；诊断槽冲突/读回抛错；真实 draw 抛错 | 前两类不部分写入且正文可读可返，说明精确缺失；diagnostic故障不影响渲染/ready，真实draw失败走fallback。故障只改内存fixture，不改资产文件 |
| V7 · 回归与基线限制 | C 原三类浏览器隔离、entry 像素开场与完整 About 映射、真实 Index、Frame→Stack Final Horizon、Work/Contact、reduced/narrow | 同次候选版本记录回归图/操作结果；NR02照片硬切明确展示与标记，不能宣称连续动效接受。固定设备/视口/DPR/版本，tim最终视觉验收另列PENDING |

容差采用原合同不放宽：位置/锚点 1e-5m；scale 1e-6；q/-q 等价的四元数角差 1e-5rad；action.time 1e-6s；weight/effectiveWeight 1e-6；FOV 1e-5°；矩阵绝对/相对 1e-6；CSS 四角 0.5 CSS px。新增 action timeScale 数值用 1e-6；BOOL/ID/绑定/离散状态及同一提交各 stamp 精确相等。不同新模型实验的 resourceGeneration/requestId 不要求数字相等，而分别验证单次链一致和正确递增。任何 NaN/Infinity 直接失败，不能让误差计算跳过。

必要差异是：NR02 以 endpoint-switch-v1 作为载体 oracle，不测尚未实现的转移曲面重合；它不会降低已实现 action、相机或 DOM 的容差。需要修改 A 的时间或照片策略才能达标时先报告，不改期望来通过。静止采样关闭 pointer/冻结非叙事动态，另取真实 ambient 的绘制计数；湖面仍动态时不能宣称零帧，不新增一套常驻 rAF。

NR-02B 沿现有测试组织运行 NR-01A/B/C 和 NR-02A 必要回归、上述新用例、TypeScript solution 与 lint；真实浏览器需原配置和实际可用 WebGL。记录具体命令、exit、设备/viewport/DPR、资产/代码指纹和未覆盖项，不强行扩到无关性能或全仓测试。C 的既有 PM 通过只说明其旧成功 draw 观察隔离，不覆盖任何 V1–V7 的接管结论。

### 回退与交回

B 开工时 DEV 以 PM 已接受的 NR-02A 为基线，为本卡全部既有白名单文件保存指纹及精确差异，保留 NR-01A/B/C、NR-02A 接受状态和他人未提交变更。快速停用 sample 可在**全页重载**后选 legacy 兼容模式；这只停用语义分支，不是对 executor 重构的完整回退，也不适合作为绑定损坏的补救。

完整回退：停止候选运行并释放唯一 rig → 仅撤 NR-02B 在 16+5 文件中的增量/本卡新增文件 → 恢复 B 开工时 runtime、Director、DOM/路由实现及 C e2e 配置（保留 A 已接受的 rig 构造/注入）→ 新建页面/runtime → 对 accepted 14文件、本卡原有文件与 A rig 核对 B 开工指纹。禁止 reset/clean 全仓，禁止按 HEAD 覆盖尚未提交的 NR-01A/B/C 或 NR-02A。证据与报告保留供 PM 审查。

本规划没有新增待 tim 的产品决策：D1/D2/D3 沿已确认合同。请 PM 在 NR-02A 验收后按这张完整 NR-02B 范围派给 DEV；若实施出现白名单外依赖，交 PM 定点调整。NR-02B 完成后停止交回，NR-03 的照片/返回动效仍需单独派卡。PM 已转达 tim 授权后续按流程推进 NR-02～05 与必要技术验收；本卡仍止于只读报告，不安排 ART、声音增强或视觉重设计。视觉精修与最终收尾等待 tim 另行指示。当前证据支持的是实施边界，实际可行性、数值配准、设备恢复和视觉质量均未验证。
