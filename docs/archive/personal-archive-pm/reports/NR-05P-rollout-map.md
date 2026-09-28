# NR-05P · 后续全站推广边界图

2026-09-09，ARCH，DELIVERED（规划，待 PM 审查）。只新增本报告及 `output/pm/NR-05P/` 最小证据；产品零写入，测试/构建/浏览器/服务均 NOT_RUN。
依据：[用户设计原文](../inputs/narrative-runtime-proposal.md)、[已接受 NR-02P](NR-02P-execution-boundary.md)、[NR-02B v2 READY](../cards/NR-02B-sample-takeover.md)、[NR-Q01 验收映射](NR-Q01-promotion-acceptance.md)。
不用原附件的旧远端实现判断覆盖当前代码。

## 1. 观察版本与不重复的前置成果

仓库 `/Users/tim/DEV/TTT I'M/portfolio`，观察时分支 `feat/narrative-kernel`，HEAD `55c08029051b11e9687d869747907e20291940fa`；
DEV 正写 NR-02B，未冻结，不能以 HEAD 或中途源码称 B 已验收。
源码/资源指纹及观察时间见 `output/pm/NR-05P/source-observation.json`、`b-contract-observation.json`。本次仅核验旧 GLB 与两张原图的 hash，未重新解析/导出模型；
GLB hash `e90528fa…fc40f` 与 NR-00 相同，复用该卡几何/嵌入图证据。
已观察到 B 新模块 `archiveExecution.ts`、`archiveCameraRig.ts`、`archiveSamplePosition.ts`，导出 `createArchiveExecution`、`solveArchiveCamera/applyArchiveCamera`、`createSampleLayout/positionAtScroll/scrollAtPosition` 等；
这些是开发中观察，后续以 B 最终交付的实际接口为准。
B 合同负责：五段状态、唯一 rig、同帧 world→camera→projection→DOM/render、阅读停驻、全入口许可、最小布局/取消事务、样段即时导航/返回/书签与 endpoint-switch-v1。后续不重新建 rig、舞台、requestId 或一套样段导航。
NR-02A 已接受的 rig 仍是 `claim(owner)` 身份令牌、`sample(token,world)`、`seekLegacy/evaluateLegacy`、`readback/dispose`；
每次 claim 撤销旧令牌。推广增加语义覆盖，不重新创建 mixer/action。
建议后续只有三张完整产品卡：**P1=NR-03 连续照片与阅读返回；
P2=NR-04+NR-05 前半（全局协调、Index/entry、Frame→Stack）；
P3=NR-05 后半（Stack→Work→Contact）**。逐卡技术验收后交回，不再拆准备链。
P1 前置 B 被 PM 接受；P2 前置 P1；P3 前置 P2。当前授权到全站推广与必要技术验收，视觉精修、声音增强、最终收尾、提交发布不在本图内。

## 2. 真实照片身份与全部相关消费者

| 身份与内容来源 | 实际消费者/载体 | 保留或迁移的边界 |
| --- | --- | --- |
| `life-football-action`，`data/life.ts`→`content.photos`，`/life/football-action.webp`，1280×960 | `content/narrativeObjects.ts` 已按精确 src 解析；A world 引用该 ID；B execution 控制两个物理载体 | P1 延用 resolver；不新增/重排照片记录，不把素材替换成 Frame 的 scenery-11 |
| 同一足球图 | `LifeGallery.tsx`→`DriftWall.tsx` 多列重复 tile、可访问链接列表；Life 点击按 src 查 photos，经 `openImageLightbox` 展示 | 这些是 Life 阅读内容，tile 的 cover/中心裁切与滤镜不等于物理照片 UV；不把墙上每个重复 tile 当转移载体，也不删掉照片墙 |
| 同一足球图 | GLB `LifeMemoryPhoto`+`Life_PhotoPaper`，`LifePhotoAnchor/LifeReading_*`；目标 `ArchivePhoto_04`+`PhotoMount_04`，父为 `FramePrintPivot` | 两处嵌入 texture 33；旧证据与当前原图 hash 均 `c455f281…e313`，UV覆盖[0,1]²；实际内容尺寸源 .13×.0975m、目标 .29×.2175m |
| `frame-intro` 是文案，不是足球图 | `ArchiveHandoffPage` 的 LF 分支与 `Frame.tsx` 复用 `ArchiveTextPanel(archiveIntro)` | 落墙后展开原文字开篇及摄影主题；足球图不进入 Frame 图库，不新增可点击 Frame 条目 |
| 建议稳定 ID `frame-final-horizon`，scenery→scenery-close→primary→image.id=11 | `data/frames.ts` 经 `content.archiveThemes/archiveImages`；`ArchiveThemeSection/ArchiveClusterPanel/ArchiveImageSlot` 和 PhotoSwipe 原图；Frame 索引仍指原 scenery 主题 | 精确复合键+src唯一校验；单独 id=11 不够，building/cuisine也有11。原图 `/frame/scenery/scenery-11.webp` 1400×1050，hash `66859901…ba2` |
| 同一 Final Horizon | `frameImageSources.generated.ts` 的720×540、1080×810及1400×1050候选；`ArchiveImageSlot` 保留 srcSet/sizes，CSS contain | 候选清晰度不同但同一内容身份；记录实际 currentSrc/比例/裁切，不能要求所有消费者下载原分辨率才能算同图 |
| 同一 Final Horizon | `archiveRuntimeSignal.ts` 当前 `.at(-1)`：为 `StackPhotoViewerSurface` 和 `MonitorPhoto_Thumbnail` 克隆材质，设 map/emissiveMap；按原比例 fit .462×.303m、.067×.073m | P2 改为稳定 resolver，保留 SRGB/flipY=false、fit尺度、材质克隆和资源恢复/释放；不能将材质初始化移入每帧 sampler |
| 同一 Final Horizon | `Skills.tsx/StackContinuityFrame` 固定 src；同时被 `ArchiveHandoffPage(frame-stack)` 和 live Skills 使用 | P2 同源替换；当前 CSS cover 与物理 fit 并不自动等价，交接需读实际图片内容区/clip与UV，不能只对容器或强改全章裁切 |
| 同一 Final Horizon | `FrameParticleHandoff.tsx` 的 legacy 分支按数组末项选图，`ParticleDocument` 供 capture/fallback | 当前 mobile/reduced进入此分支并禁用增强粒子；P2只等价改 resolver，保留静态原图，不复活桌面粒子流程 |
| 同一 Final Horizon | `ArchiveSignal.tsx` 也按末项贴屏/缩放并有shader转移，唯一 src 引用者是 `ArchiveChapterRoom.tsx` | 本次 src 搜索未找到 ArchiveChapterRoom 的当前生产导入，故不记为正在竞争的 writer。P2若保留这些源码则同步改resolver，不挂回页面；不以“死代码”推断其他工具永远不引用 |

三张其他墙照 `ArchivePhoto_01/_02/_03` 对应 building-03、scenery-05、cuisine-04；
仅继续既有 FramePrintSettle 通道，不替代主角。GLB 屏幕初始 scenery-05 会被 runtimeSignal 替换，不能据嵌入初图误判最终屏幕内容。
Life tile 当前 cover/`--dw-card-position` 与灰度滤镜、Frame图库 contain、Stack continuity cover、物理屏幕fit分别属于各自表现；
稳定ID只解决身份，不能用同一src宣称四者已经配准。

## 3. P1 最小增量：连续移交、当前阅读位置收回与返回

P1 只替换 B 的 endpoint-switch-v1，保持 About→Life 现有抽出节奏和 A 的语义 placement；
LF 默认沿当前 travel .24–.56，目标 reveal .60–.77，不以新素材或共享 opacity 掩盖接缝。
源基准来自已采样的 LifePhotoExtract 端点及不可变局部几何/父变换；
目标来自本帧 FramePrintPivot 下真实 ArchivePhoto_04 几何。不能从上一帧被移动的载体反算下一帧，也不能 onComplete/reparent 后才决定归属。
新增一个实际使用的 `archivePhotoTransfer.ts`，由 B execution 唯一调用：prepare保存几何/材质基准，apply在rig动画与矩阵更新后按T构造转移，dispose只释放自有资源。不得另起rAF、mixer或第二世界。
转移载体用独立 geometry/material 实例，复用同一只读原图纹理；
不改共享材质 opacity/transparent，也不替换素材。采用可见性独占：transfer=0显示源，0<transfer<1只显示转移，transfer=1只显示墙；
同图背纸一起交接。
按同一UV参数对齐源平面与目标曲面，保留两处非均匀scale和纸边。目标为旧证据中的5×17曲面，转移geometry需在端点贴合实际网格；不能用四角平面拉伸冒充全图吻合，至少验证中心与边中点。
几何变化只为既有物件间连续移动与必要避碰；沿现有相机视图和B最终相机求解，镜头若遮挡转移物体按实际证据定点修正，不能另作美术路线。该路径是否避开架子当前 UNKNOWN，须P1实际取证。
读取/反滚/直接跳到中间T都按同一公式生成source/transfer/wall及背纸状态；Frame→Stack出口继续墙面独占种子，不允许回到legacy时信封里重新多出一张主角。
阅读返回沿 B 已有 request/completion 协议加“收回→移镜/物件→展开”的短期表现相位，仍由同一个提交器执行；不再调用旧 route 的两端 scene 预求，不另建导航事务。
收回源用 `readingSnapshot` 捕获当前可见长文/图片/canvas/video内容，绑定requestId/layoutVersion且inert；
先把当前viewport构图映回真实物件，再移动相机。真实live正文仅在交互owner交出时禁用，完成/取消后恢复唯一owner与焦点。
About返回目标仍是现有 entry.p=.48（局部复用entry纯相机/物件计划并经统一提交）；
Life/Frame仍为AL/LF.p=.56。P1不提前推广完整Index，只完成这些样段返回端点；
再次打开按U书签回原阅读位置，而非章首。
动画期间T和短期route相位分别显式记录：同T基础世界不受动画播放历史影响；新请求、wheel/touch/导航键、资源失效撤旧相位。旧finally不得清新routing，取消不丢书签、不补播声音。
复用 `readingSnapshot.ts`、`archiveReadingMemory.ts`、`archiveReturn.ts`、`pageProjection.ts`、B projector/camera/execution；
只按实际缺口修capture/交互与动画消费。
LifeIntro、ArchiveTextPanel、AboutDossier正文不改。
P1退出：正反连续、任意中点直入均为一张足球图，照片端点内容区/纸边/曲面内点吻合；完整About/Life/Frame可读可返，书签/中断/布局恢复沿B证据复核。视觉质量仍由tim另行认可。

## 4. 剩余章节逐段的状态、入口与 writer 退出

所有阶段沿用11条声明动画通道。以下 N/L/F 分别为Notebook、Life envelope+extraction、四个Frame settle；
D表示drawer及左右rail，Q表示folder。值是当前 authored 曲线要转为语义的目标，不是被session-floor抬高后的运行读回。

| 段 / 完整基础状态 | 最终相机/表面与内容 | 实际入口、剩余writer与推广卡 |
| --- | --- | --- |
| Index/hero：N=L=F=D=Q=0；足球源端，两个monitor状态false；真实Index DOM唯一可点 | 当前Director的home↔stack .08混合indexView及检视近景，StackReading；保留Hero/Index原文与开场像素效果 | ArchiveIndexSurface的hero进度、点击检视/pendingScroll；PersonalArchiveSurface/Stage、Director index pose。P2移为全局T+显式短期检视输入，检视结束不重放已取消滚动 |
| entry：N=现有cover(.22,.48)，L=F=D=Q=0；Index淡出、About接入 | indexView→AboutReading；保留archiveScrollPose的camera/approach/flatten、书页和像素开场，不只套views.about | PersonalArchiveBridge及entry样式/reading回调，Director entry pose，准备校色entry .94。P2迁到统一state/presenter，B已有lease限制直接复用 |
| About→Life→Frame五段 | B最终相机/三阅读面，P1连续足球图 | P2/P3只回归，不再重做五段、scope gate、样段request协议 |
| frame-stack：N=L=F=1，D=Q=0；足球留墙；Final Horizon由Frame离场构图→屏幕→Stack正文 | FrameReading→StackReading；monitor project=false，photo按明确归属接入；屏幕大图与缩略图各有真实fit尺寸 | Desktop FrameParticleHandoff→ArchiveChapterBridge、Director frame-stack、runtimeSignal资源绑定、sourceSnapshot与StackContinuityFrame。P2移除该桥旧世界/相机/DOM相位writer，保留原图/原Stack正文 |
| stack-reading：N=L=F=1，D=Q=0；足球墙面、monitor photo=true | StackReading，live Skills及红色active flow、LogoLoop原样 | Stage/rest与Director导航rest。P2完成该停驻及其进出；Skills局部SVG/reveal不是房间writer，不合并进故事时钟 |
| stack-work：N=L=F=1；D=phase(.14,.52)，Q=phase(.38,.73)；photo=true | StackReading→WorkReading，WorkFolderPivot随抽屉/rail移动；目标为共享ProjectsHeader，不是把GLB屏幕改成项目图 | chapters/work-transition/ArchiveWorkTransition桌面分支→bridge(id=work-transition)→Director；P3迁移全部动作/相机/投影，保留可逆、无forward gate |
| work-reading：N=L=F=1，D=Q=1；monitor仍Final Horizon | WorkReading、真实Projects的六项目/案例与Glass等阅读效果 | Stage/rest、ProjectsBento内部定位、ProjectCaseDialog的Lenis暂停/释放。P2先接请求/输入暂停协议，P3替换Work空间rest控制；卡片媒体与案例内容保持 |
| work-contact：N=L=F=1；D=1-.65*phase(.08,.56)，Q=1-phase(.08,.5) | WorkReading→ContactReading；沿现有contactView=indexView避开椅背，不恢复被遮挡的导出contact相机 | ArchiveContact→ArchiveChapters→bridge、Director、runtime Contact surface；P3迁移，真实FooterContact/FooterMeta预览与live对应 |
| contact-reading：N=L=F=1，D=.35，Q=0；photo=true | addContactReadingPlane 创建 .48×.30m纸面，位置(.55,.827,-.70)、x旋转-π/2，ContactReading_TL/TR/BR/BL；实际Footer完整可点 | Stage/rest、useFooterReveal局部文字动画/700ms直接hash补偿。P3用有效提交触发可读状态，删除该桌面补偿；时钟/本地光标继续独立 |

`WorkReading_*`、`StackReading_*` 已在 scene-contract 的surface清单，Contact锚点由runtime生成，不假报GLB自带。P2/P3扩展sceneBindings的必需节点/父关系及runtime生成surface验证，实际父变换读回后绑定；
缺失走可读fallback。
每个新增段还要显式写monitor、足球载体、11action完整状态、focus和source/target/live/hit归属。Work的1与Contact的.35是T规范值，不保存成visited/opened；
从Contact直接到Index必须回到Index规范0。
入口/prepare/rest/resize/资源恢复/activate-detach-resume都复用B的一条提交链，只新增目标段覆盖与绑定依赖，不再复制生命周期分支。初始缺关键绑定按能力降级，不能使全部正文白屏。

## 5. P2 全局协调增量与 P3 删除边界

P2把B五段映射扩为已有DOM故事序列：Index→entry→五段→frame-stack→stack-reading→stack-work→work-reading→work-contact→contact-reading；
不新增对应DOM section。故事time只从顺序/权重派生，T仍唯一。
原 `narrativeChapters` 是nav/progress追踪集合，刻意没有Life/work-transition；
保留导航展示集合，不拿它做故事拓扑。P2拓展B实际layout注册；
`chaptersReady`仅代表chrome节点存在，不能代表所有pin/media/阅读面可定位。
全局自然输入使用现有Lenis推进后的scroll，保持 `lenis.raf → ScrollTrigger.update → 更新/采样当前T → B提交` 的可追溯顺序，不给故事时间再加平滑。沿现有schedule合并，无新增永久rAF。
全局refresh完成后统一发布range/viewport/表面测量版本并同步Lenis尺寸；
普通滚动消费缓存范围。`chapterScrollMetrics`继续服务chrome，只共享合适的测量快照，不反向用activeId覆盖场景T；
pinned面不能按offsetTop猜测。
将B已经完成的样段request/cancel/书签/完成结果扩展到全部章节及真实子锚点：Nav/SectionMap、AccordionGallery、深链、返回物件、Index检视、ProjectsBento。保留offset、replaceState和完整阅读目标，撤剩余App三次旧纠偏。
P2阶段所有章节请求已共用协议，尚未迁移的Work/Contact通过B受限legacy计划适配器执行，其状态/相机/DOM推广归P3；这是一张可用的入口+屏幕成品卡，不宣称全站D1已达成。
P3把这最后两桥与阅读停驻纳入语义采样后，默认桌面不再调用legacy pose/navigationPose或session-floor；
删生产session Map/withSession/remember及跨域seed、旧active栈回放、旧导航端点预求和WAAPI空间分支。B已经删过的不再列为新任务。
Director的lab调用 `lab/personal-space/archiveClearance.ts` 确实存在；
P3更新为用新语义/相机的诊断适配，之后才删除不再引用的实现，不用可选参数掩盖故障。默认生产零legacy writer是退出证据，整个文件是否删除服从剩余引用。
启动时legacy兼容模式仅在迁移中保留作回退。P3确认新链覆盖正常/故障/降级后，撤生产旧分支及其入口；C原legacy e2e改为新执行链的等价隔离验证须在正式卡明示，保留旧验收记录，不能删行为断言换绿。
`ArchiveRoom/ArchiveChapterRoom/ArchiveSignal` 是当前src未接入的存量，不必为全站推广批量清理；
若选择删除，须另核实际导入/工具调用。这不等于留默认生产双writer。
输入暂停需避免 `ProjectCaseDialog` 清理时无条件 `lenis.start()` 抢过当前route：复用/补充全局有主人的暂停释放接口，只改接入，不重写项目弹窗或PhotoSwipe。用户发起新章请求按策略取消旧空间请求；
弹窗关闭不能恢复过期route。
`workHandoff.ts` 的pending布尔和 `useProjectsNarrative` 的Laser完成回调属于有历史的阅读效果：本次src只找到WorkTransition CTA派发，未找到桌面archive-scroll派发。P3不得仅因类型存在而新增桌面Laser；
保留当前可达表现，需桥消费的效果才按request失效清理。
窄屏/reduced下 `ArchiveWorkTransition` 仍选旧WorkTransition；
不把其CTA门控搬回桌面，不删其fallback。Contact的空间wrapper已关闭旧全屏iris，推广不能重启iris覆盖房间。
Life DriftWall、Frame主题pin/Bend/PhotoSwipe、Skills红色flow/LogoLoop、项目媒体/Glass/Tilt/案例、Footer时钟/局部交互等不写空间受控属性，原则上原样；
仅布局完成、交互owner或取消接缝需要接入时定点修改。

## 6. 三张可派发产品卡的文件与删除清单

路径缩写：`S=apps/landing/src`，`P=S/components/personal-archive`，`N=S/core/narrative`，`L=S/lib`，`T=apps/landing/tests`。下列是具体文件集合建议，PM按B验收版本定点确认，不是授权目录通配。
公共接管集合 K：`P/archiveRuntime.ts`、`P/archiveExecution.ts`、`P/archiveCameraRig.ts`、`P/archiveReadingSurface.ts`、`P/ArchiveChapterBridge.tsx`、`P/personal-archive.css`；
各卡只改本卡段的真实增量。

| 卡 | 产品文件边界（K之外逐项列明） | 删除项与独立交付 |
| --- | --- | --- |
| P1 / NR-03 | K；新增P/archivePhotoTransfer.ts；N/types.ts、specs.ts、sampleStory.ts（仅必要transfer/return意图）；P/readingSnapshot.ts、ArchiveHandoffPage.tsx；L/archiveRoute.ts、archiveReturn.ts、archiveReadingMemory.ts（捕获/书签适配确有缺口才改） | 删endpoint-switch-v1的默认运行分支，替换为连续真实几何；样段即时事务保留为reduced/失败/直接seek。交付可正反/中断的照片和当前阅读位置返回，接口不另建导航状态机 |
| P2 / NR-04+NR-05前半 | K；N/types.ts、specs.ts、sampleStory.ts、index.ts；P/archiveSamplePosition.ts、sceneBindings.ts、ArchiveStage.tsx、PersonalArchiveSurface.tsx、PersonalArchiveBridge.tsx、ArchiveIndexSurface.tsx、archiveDirector.ts、archiveRuntimeSignal.ts、ArchiveSignal.tsx；S/content/narrativeObjects.ts；S/components/frame/FrameParticleHandoff.tsx、S/components/Skills.tsx；L/lenis.ts、chapterScrollMetrics.ts、scroll/requestRefresh.ts、chapterScroll.ts、archiveRoute.ts、archiveReturn.ts、archiveReadingMemory.ts；S/components/ChapterTransition.tsx、S/App.tsx；S/chapters/projects/ProjectsBento.tsx、ProjectCaseDialog.tsx | 全局request/layout形成真实可用闭环；Index/entry/FS/Stack进入语义控制；删这些段的legacy floor/pose与路由例外，删剩余App纠偏；末项/硬编码图片选择改稳定ID。Work/Contact适配器暂保留到P3 |
| P3 / NR-05后半 | K；N/types.ts、specs.ts、sampleStory.ts、index.ts；P/archiveSamplePosition.ts、sceneBindings.ts、ArchiveStage.tsx、PersonalArchiveSurface.tsx、ArchiveHandoffPage.tsx、ArchiveChapters.tsx、archiveDirector.ts、readingFrame.ts；L/archiveRoute.ts、archiveReturn.ts、archiveReadingMemory.ts、chapterScroll.ts、lenis.ts、workHandoff.ts；S/components/ChapterTransition.tsx；S/chapters/work-transition/ArchiveWorkTransition.tsx；S/chapters/projects/useProjectsNarrative.ts；S/chapters/contact/ArchiveContact.tsx、useFooterReveal.ts；S/lab/personal-space/archiveClearance.ts | 推广抽屉/rail/folder、Work/Contact全部表面和返回；撤默认生产legacy/session/旧导航余量及Contact700ms补偿，保留内容、无gate桌面与窄屏fallback。交付全站可定位与技术证据，非美术收尾 |

A rig原则上三卡都复用；
扩展新SemanticWorld时保持既有11动画字段可赋值，monitor/内容等非动画仍由execution处理。若真实rig签名形成类型阻断，正式卡定点加入 `P/archiveAnimationRig.ts`，不新建rig或扩大到新动作。
同一提交始终只一个世界/相机/presenter owner；
P1转移助手由execution内部调用，不允许React或GSAP独立更新该mesh。资源恢复重建自有geometry/material后按当前T重采样，不发事件补播。
不改数据数组、原图、GLB/scene-contract、Blender导出器、依赖或声音代码；
扩展必需节点用sceneBindings及runtime生成节点的实际验证。几何事实不符则报具体阻断，不擅自改资产补模型。
P2的各Final Horizon消费者必须同卡替换，不能先只改runtimeSignal后让fallback/Stack残留另一来源；
resolver测试验证重排不换图、同号不同主题不串图、缺失/重复明确失败。
各卡回退到自己的开工快照，仅撤本卡差异，不按HEAD覆盖未提交的A/B/前卡或他人修改；P1可回到B基线，P2回到P1，P3回到P2。完整重建页面/rig后验证回退，不能热切半个owner。

## 7. 复用 NR-Q01 的测试与最小新证据

现有映射中的通过能力沿[NR-Q01](NR-Q01-promotion-acceptance.md)限界；本卡未跑。B未来实际通过的V1–V7同样先读其报告，不能把READY合同当结果。
建议新增测试仅三份产品结果E2E：`T/e2e/archive-photo-return.spec.ts`（P1）、`archive-global-navigation.spec.ts`（P2）、`archive-rollout.spec.ts`（P3）；
不再创建覆盖同一request协议的准备测试链。
单元层P1新增 `T/archivePhotoTransfer.test.ts`；
P2/P3扩展B已有 `sampleStory.test.ts`、`archiveSamplePosition.test.ts`、`archiveExecution.test.ts`、`archiveCameraProjection.test.ts`，P2扩展 `narrativeObjects.test.ts`/`archiveBindingContract.test.ts`。
A真实rig测试只读复用，新增通道前不改其意义。

| 必要退出项 | 直接复用项及其证明边界 | 最小新增实证 / 所属卡 |
| --- | --- | --- |
| 原图与几何连续 | A真实rig、B真实投影；`effects-context`的“desktop life archive…”只证明七列与部分图片 | P1在LF start、中点、落墙及反向实读source/transfer/wall、UV、纸边、中心/边中点和最终camera；录可复现片段，不以同src或bbox当连续 |
| 完整正文/阅读返回 | Q01指出About全文、书签/返回原本缺覆盖；B合同V4承诺需核实际证据 | P1检查About完整内容序列/原图、Life全文、Frame三个主题含最后cluster；从长文/深cluster收回再恢复，snapshot inert、live唯一可交互、焦点回到有效opener |
| 全局正反/任意T | `frame.spec`的结构/主题到达，`effects-context`的FS release、Stack flow、可逆抽屉只覆盖局部 | P2/P3每个新增段0/中点/1及交界两侧：fresh模型直接定位，对比经全站正反/随机跳转再到同T的11动作、nodes/visibility/material/camera/DOM实际读回 |
| 导航/深链/子锚点/取消 | `chrome-ui`的SectionMap、Scroll indicator、Direct Contact；`frame.spec`的自然hash与Frame/Work active | P2新增Index检视中导航、无源/同章、Frame子锚点、新请求/用户取消；P2覆盖project-card子目标；P3补该目标的真实Work状态及所有章回物件/书签，取消后旧timer/WAAPI/pendingScroll零提交 |
| 布局与正文晚到 | `frame.spec`的safe vertical band、lazy pin settle、responsive image几何 | P2/P3在字体/图像晚到、resize和嵌套pin刷新后保持语义T，layoutVersion统一；不以固定等待几百ms后碰巧在目标处代替版本证据 |
| GPU/资源/diagnostics | `degradation.spec`只覆盖初始WebGL拒绝、404图、Work资源和loader；C/ B故障隔离取实际报告 | P1自有转移资源释放/重建；P2/P3全站运行中loss/restore、恢复中换请求、关键绑定缺失、诊断槽异常；generation正确、旧回调无写入、正文可读可返 |
| 真实内容消费者与效果回归 | `frame.spec`索引/末cluster与handoff标题；`projects-experience`焦点陷阱/Lenis恢复；`effects-context`FS与Stackflow | P2确认Final Horizon所有消费者复合身份与实际裁切；P3确认六项目仍完整、案例焦点、Glass/Tilt/原可达Laser，Contact无旧iris挡正文、不新增声音 |
| reduced/narrow与Loader | `degradation.spec`整份；`frame.spec`mobile稳定竖排/菜单；`projects-experience`mobile Embla；本地loader可skip | 每卡复核修改影响的静态入口，不开手机3D；P3抽查所有正文和返回可达。loader skip必须标NOT_RUN，不能写全站通过或为绑定失败宣称空间ready |

上述新E2E复用现有Playwright项目/设备能力；
未来命令在 `apps/landing` 用空闲非5173端口和原配置，例如 `rtk proxy env PLAYWRIGHT_PORT=<空闲端口> npx playwright test --project=chromium-desktop tests/e2e/archive-photo-return.spec.ts`。
这只是派卡后的执行建议，本轮未执行。
旧用例的精确grep与命令直接采用Q01，按本卡影响选取frame/projects-experience/chrome-ui/degradation/effects-context，不跑无关Studio/全量套件。必要单元、tsc、限域lint按各正式卡约定，不把体积设硬门槛。
数值容差沿NR-02P：position/anchors 1e-5m、scale 1e-6、q角差1e-5rad、action time1e-6s、weight1e-6、FOV1e-5°、matrix abs/rel1e-6、CSS角点0.5px；
新增转移内点沿位置/投影容差。离散ID/ownership/同帧stamp精确比较，NaN直接失败，不自动放宽。
证据需实际action/node/camera/DOM与调用顺序，不只日志stamp；
固定设备、viewport、DPR、资源/代码hash，诊断默认关且有界。无WebGL或未能执行项目标BLOCKED/NOT_RUN，不用mock替代真实场景PASS。
技术退出：全部段能正反/直接定位；
同T无session依赖；
唯一交互与完整正文；
书签独立；
新请求取消旧写入；
布局/资源恢复对应最新T；
所有失败保持可读；
默认桌面无legacy空间writer或多mixer。一次静止/隐藏观察确认无新增永久循环，湖面动态单列，非要求冻结艺术效果。
NR-Q01现有截图/高度/少量滚动断言不能替代上述实证；技术证据也不能代表tim对画面、节奏、材质或连续体验的认可。P3结束交PM技术汇总后停止，等待tim另行指示视觉精修与最终收尾。

## 8. 本卡交付边界

已完成：只读映射后续三张产品卡、具体内容/节点/调用入口、D1/书签、可删legacy范围和退出证据；没有向DEV派发任务，也没有覆盖其开发中文件。
尚未验证：B最终接口与结果、连续照片可见路径/曲面配准、全局布局/恢复及全站运行行为。本图是可派卡的规划，未知项留在对应产品卡实际测量，不再拆成空准备阶段。
证据：`output/pm/NR-05P/source-observation.json`、`b-contract-observation.json`、`delivery-check.json`。本卡单份报告，无重复摘要；
完成通知PM后停止。
