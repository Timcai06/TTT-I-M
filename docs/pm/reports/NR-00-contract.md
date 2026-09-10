# NR-00 · 最小迁移合同（待 PM 审查 / tim 确认）

本文件是规划产物，不授权产品实现。NR-00 v1；2026-09-09；ARCH。结论以当前本地文件及 GLB 的静态读取为依据，没有运行应用、Three.js、构建或测试。下文“建议/应”均是下一张卡的合同候选，不是已实现或已通过。

## 1. 可识别基线与证据边界

- checkout：`/Users/tim/DEV/TTT I'M/portfolio`；分支：`baseline/personal-archive-20260909`；完整 HEAD：`6137099b950745d06c1f2894d83cdf7a1826684a`。起始工作区干净。远端一致性由 PM 派发消息确认，本卡未另查远端。
- 首次 HEAD 读取后、指纹采集时 HEAD 已前进至 `55c08029051b11e9687d869747907e20291940fa`，新增提交只修改 `docs/pm/baselines/2026-09-09.md` 和 `docs/pm/board.md`。指纹文件 baseline-start.json 与结束核对记录的 HEAD 因此均为 55c0802；首次读取的 6137099 单列于 [时点说明](../../../output/pm/NR-00/baseline-reconciliation.json)。98 个相关文件及 67 条基线记录均未漂移；产品分析仍绑定上述 6137099 基线，未混用不同产品版本。
- 对 [基线清单](../baselines/2026-09-09-files.json) 的 67 条记录逐项核对：66 条文件 SHA-256 一致，1 条删除记录仍不存在；其中 Blender 是 local-only 指纹，不等于远端有完整源工程。另记录 98 个相关跟踪文件指纹。
- 当前计划中的“HEAD 仍为 55c4ad3、未提交”是保存基线前的描述，不能作为本卡当前状态；由 PM 更新，本卡不修改计划。
- GLB SHA-256：`e90528fa2340ead3fbaca7557e38714e8965e1f96a53aec9bb1321cb516fc40f`；场景合同：`ef93d05a2a20798ba0ed53400d103370f1543aad8427a258cf4ce4ebdc37056a`；合同 `sourceSha256` 与已登记本地 Blender 指纹一致。
- [起始指纹](../../../output/pm/NR-00/baseline-start.json)、[GLB 结构](../../../output/pm/NR-00/glb-structure.json)、[对象/纹理/UV/动画端点](../../../output/pm/NR-00/object-bindings.json)、[源码行号索引](../../../output/pm/NR-00/source-index.json)、[结束核对](../../../output/pm/NR-00/baseline-end.json) 为本地证据；`output/` 被忽略，远端评审应以本报告表格为准，必要时由 PM 一并提供证据。
- 基线记录中的 113 单测、构建、模型检查等为 **PM 已报告的历史检查，本卡 NOT_RUN**。vendor integrity 是 `DecryptRevealVanilla.ts` 登记指纹不符的既有问题，与叙事所有权迁移无已证实因果，不修复、不伪称 guards 全绿；未来相关检查单列该失败。chunk 体积仅提示，压缩体积不是开发前置条件。

下文相对路径基准：`PA/` = `apps/landing/src/components/personal-archive/`，`N/` = `apps/landing/src/core/narrative/`，`L/` = `apps/landing/src/lib/`。精确行号见源码索引；符号与完整路径优先于易漂移的行号。

## 2. 附件与当前实现逐项对照

| 附件判断/建议 | 分类 | 当前依据与规划影响 |
| --- | --- | --- |
| 已共享一个世界，不应重建 Renderer | 仍适用 | `PA/archiveRuntime.ts:createRuntime/resource`；保留 retained context、GLTF、composer 和资源准备 |
| `attach(host,...)` 移动 Canvas；fixed Canvas 最后再做 | 已过期 / 能力已实现 | `ArchiveStage.tsx:26` 调用 mount；CSS `.archive-stage` fixed；runtime 已分 mount/activate/rest/navigate。删除“新增 WorldCanvas”任务 |
| 非 About 主要是 Canvas 标题纹理 | 已过期 | `archiveReadingSurface.ts` 现在是 DOM 四角投影，mesh 仅空 Group，textures 为空；`ArchiveHandoffPage` 复用 LifeIntro、ArchiveTextPanel、StackContinuityFrame、ProjectsHeader、Footer；不能退回标题贴图 |
| Life 在其他 shot 归零 | 已过期 | `archiveDirector.ts:pose` 在后续 shot 给 Life 1；`withSession/remember` 又加历史最大值。问题变为明确保持/收回规则与隔离副作用 |
| pose 同时管动画、相机、可见性、DOM | 仍适用 | `archiveDirector.ts:128–189`；输入从 shot 判断，最终还重置 page.style。需完整写入域迁移 |
| 动画名正则、隐藏时间区间、缺失静默 | 仍适用 | Director 构造动作正则、seek 的三种区间及 `if (!action) return`。本卡已静态列出 11 条真实通道；未执行 GLTFLoader 后绑定验收 |
| 多个 clip 可能竞争同一属性 | 静态已核对，运行未知 | 当前 GLB 的 11 个通道在 node+path 上无重复。不能据此声称 Mixer 启停、其他写入者或权重没有残留 |
| 导航集合不能直接作为故事拓扑 | 仍适用 | `L/narrativeChapters.ts` 刻意排除 Life；`ArchiveStage:49` 还用 viewport 特判 Life。扩展已有 NarrativeSpec，不增加同名 DOM section |
| 120/520/1100ms 深链修正 | 仍适用 | `App.tsx:98` 仍有补偿；已存在输入取消监听，不能说完全不可取消。全局替代留 NR-04；样段入口须在 NR-03 排除旧补偿竞争 |
| 统一最终相机后再投影 | 部分已有，合同缺失 | 普通 draw 已先 mixer/matrix，再 camera，再 sheet。缺 frame/layout/resource 身份及统一提交；导航先算起终点 CSS 矩阵，再用另一条 WAAPI 时钟播放 |
| 已按需绘制、不要增加持续循环 | 需校正 | schedule 能合并 rAF，但 `archiveRuntime:138` 的 ambient 在 active 存在时约每 16ms 更新 pointer/lake 并 schedule，即使指针静止。当前静止性能不是已证实的按需达标 |
| 照片依赖数组末项 | 仍适用但消费者更多 | runtimeSignal、旧 ArchiveSignal；另 `FrameParticleHandoff:77` 用 length-1，`Skills:77` 写死 scenery-11。需一个稳定 resolver，不能只替换两处 `.at(-1)` |
| Life 与 Frame 可能是同图 | 已获得资产证据 | LifeMemoryPhoto 与 ArchivePhoto_04 共用 texture 33 / 同一 embedded WebP，字节等于 public/life/football-action.webp；FrameReading 实际在 FramePrintPivot 下，对应 clip _04。没有现成物件连续转移逻辑 |
| 同图进入 Frame 的真实 DOM | 尚未实现 | Frame 首屏为文字 archiveIntro，主题图库无 football-action 记录。不能把同图入墙等同于该照片已进入 Frame DOM 图库 |
| 不复制带交互的 React 树 | 原则适用，不能机械删快照 | 已有惯用 inert 预览及 readingSnapshot/cloneViewport，承担任意阅读位置返回；保留唯一交互正文。快照并非“没有副作用”：内容是冻结时刻的表示 |
| 投影安全与资源/GPU 恢复应保留 | 已实现基础，未验收效果 | pageMatrix 有非有限/凹折/退化过滤；runtime 有 finite pass、shader error、context lost/restored、纹理重新初始化。统一快照应包住这些能力 |
| SoundProvider 可扩展为声场+事件 | 仍适用，后期 | 现有 entry/query/evidence/synthesis cue、取消、偏好、隐藏和 film mode；本轮只保留边界，不写 AudioDirector |
| 提案目录树、三份合同 | 设计候选 | 延用现有 NarrativeSpec/content/scene-contract；只新增有消费者的少量文件，不复制内容数据、JSON 合同或新渲染器 |

**两处必须加入实施范围的源代码事实：**

1. 预热和恢复调用的是有副作用的 pose。`archiveRuntime:290–301` 预热多个后段并调用 `pose('entry', .94)` 校色；Director 每次 `remember(authored)`。按代码推导，这可在首次 Index 前把 Notebook、Life、Frame 的记忆抬到 1，WorkDrawer/rails 抬到 .35。`navigate:389–391` 为计算终点投影调用 `navigationPose(...,1)`，也可能先记住目的状态。此为静态因果推导，**未宣称已观察到画面异常**。
2. 普通 draw、drawRest、drawNavigation、初始化预热、恢复、activate/detach 后 resumePrevious 都可进入写场景路径。只替换 `draw('about-life'/'life-frame')` 不足以建立单写者；原始导航的 source/target CSS 矩阵也不能当成当前最终相机投影。

旧 `ArchiveRoom`、`ArchiveChapterRoom → ArchiveSignal` 在本次 src import 搜索中无当前入口引用；当前 Surface 直连共享 runtime。这些旧实现只登记为不接入样段的存量代码，不将其 useFrame 当作已经并行运行，也不在本卡清理。

## 3. 受控状态与所有权清单

### 3.1 动画写入域（GLB 真实通道）

当前所有动作由 Director 的单个 AnimationMixer 创建，play 后 paused，LoopOnce、clampWhenFinished；seek 写 action.time，mixer.update(0) 写节点，随后更新世界矩阵。权重/有效权重、enabled、paused、timeScale、loop/clamp 等多依赖初始化，不能在新绑定中继续隐式继承。

| 精确 clip | GLB 目标及属性 | 键时间范围（秒） | 当前 seek 区间 | 样段基础值建议 |
| --- | --- | --- | --- | --- |
| NotebookOpen | NotebookHinge.rotation（四元数） | 1/30…25/30 | 0…clip.duration | About 阅读到 Frame 阅读均 1 |
| LifeEnvelopeOpen | LifeEnvelopeHinge.rotation | 1/30…25/30 | 0…clip.duration | About 阅读 0；about-life 的 phase(.23,.62)；Life 起为 1 |
| LifePhotoExtract | LifeMemoryPhoto.translation | 1/30…25/30 | 0…clip.duration | 同上；转移期由同一绑定器计算源姿态后组合转移，不另起外部 writer |
| FramePrintSettle_04 | **FramePrintPivot.rotation** | 1/30…70/30 | 0…clip.duration | 到达 Frame 的 settle 轨道；不是 FramePrintPivot_04 |
| FramePrintSettle_01 | FramePrintPivot_01.rotation | 1/30…70/30 | 0…clip.duration | 初轮保留当前四个 pivot 同步节奏；无需误当主角 |
| FramePrintSettle_02 | FramePrintPivot_02.rotation | 1/30…70/30 | 0…clip.duration | 同上 |
| FramePrintSettle_03 | FramePrintPivot_03.rotation | 1/30…70/30 | 0…clip.duration | 同上 |
| WorkDrawerOpen | WorkDrawerRoot.translation | 1/30…4 | 1…2.4 | 样段为 0，保持抽屉的样段静置姿态 |
| CinemaRailTravel_Left | Cinema_RailMiddle_Left.translation | 1/30…4 | 1…2.4 | 样段为 0 |
| CinemaRailTravel_Right | Cinema_RailMiddle_Right.translation | 1/30…4 | 1…2.4 | 样段为 0 |
| WorkFolderLift | WorkFolderPivot.translation | 1/30…110/30 | 74/30…110/30 | 样段为 0；没有 session floor |

“amount 0”不是节点 transform 归零：如抽屉取 clip 的 1s，folder 取 74/30s。新绑定第一版保留上述有效采样区间与端点钳制，避免无意改变现有静置姿态；Frame settle 的首末 rotation 相同也不表示中间没有动作。样段完整域含这些背景动作，以免从 Work 返回后残留抽屉/rail。动作、初始局部 TRS、绑定节点、层级与有效区间一并由资产版本固定。

### 3.2 其他写入域

| 域/属性（完整样段范围） | 当前 writer | 状态类别和拟定所有者 |
| --- | --- | --- |
| 上述 11 通道的 time、weight/effectiveWeight、enabled、paused、timeScale/effectiveTimeScale、loop/clamp；节点 local TRS、matrix/matrixWorld | Director seek/mixer；pose/navigationPose/rest/预热共同进入 | T 推导；SceneBinding 单一执行，明确 11 动作的状态，动画表每帧绝对应用 |
| LifeMemoryPhoto 及子 Life_PhotoPaper 可见性、Frame ArchivePhoto_04/PhotoMount_04 可见性；转移载体 TRS/几何/opacity | 当前载体基本沿用 GLB，Director 不执行互斥接管 | 新 StoryFrame 的 ownership/transfer 推导；binding 单写，锚点随父更新；共享材质不得直接改透明度影响两张图 |
| LifePhotoAnchor 的 scale 1,1,1.77777779 与照片 scale 1,1,.5625；Frame 曲面顶点及四角 | GLB 静态基准 | 资产事实；保留，不能把 export scale 统一重置为 1。转移引用独立基准，不能以已被移动的源锚点反算下一帧造成反馈 |
| MonitorState_project/photo.visible | Director pose/navigationPose | 样段明确 false/false；外段仍旧 owner，跨域交接要重设。Index DOM 不属于 monitor project plane |
| StackPhotoViewerSurface、MonitorPhoto_Thumbnail.material map/emissiveMap、scale.x/z；纹理 flipY/colorSpace | runtimeSignal 初始化/销毁；旧 ArchiveSignal 非当前入口 | 内容/资产代次配置，非 T。保留 Final Horizon 的 resolver；样段不逐帧重贴图/缩放 |
| camera position/quaternion/up、fov/aspect/near/far、projectionMatrix/matrixWorld/inverse；target、focus | Director、runtime resize | CameraRig 在 binding/matrix 更新后唯一求解；viewport 是布局输入；pointer 是短期输入，加入后再出最终快照 |
| focus pass focus/aperture/enabled；sheet active/mesh visible/userData；canvas datasets | runtime draw/navigation/rest 与 readingSurface | T+投影有效性派生；presenter/render 配置同帧提交。sheet 空 Group 不再变回标题绘制器 |
| 目标/源 page.style.transform/opacity/pointerEvents，entry --paper-hint；Index page opacity/pointerEvents | Director、readingSurface.update/projectSource、runtime.hide/activate/cleanup | Presenter 唯一日常 writer；失败/销毁进入同一个清理入口。样段 Index page 必须明确隐藏/禁交互，避免底层 active 的旧 Index 写回 |
| bridge 的 --archive-stage/progress/copy/room/vignette/target-opacity、dataset.phase、ready/failed/completed/active；目标 --archive-live-target | ArchiveChapterBridge sync + React；PersonalArchiveBridge 入口 | 样段桥只注册布局与 DOM/输入；帧提交负责可见性和交互。React 仅订阅离散状态，不每帧传整个世界 |
| hit button left/top/width/height、可见性与可点范围 | runtime.draw 四角 AABB；CSS 默认区 | Presenter 从同帧投影导出。投影无效时不得保留上帧 hit；读回 computed style 与 inert/focus，不只查 pointerEvents |
| 路由 source/target layer transform/opacity/filter；html routing、CSS 起终矩阵、stage/scroll stop/start | archiveRoute WAAPI/rAF、runtime.navigate、ChapterTransition、Lenis | 短期请求状态；样段由 requestId/lease 控制，不能与旧 WAAPI 同时写同一表面；保留其他章节既有路径 |
| session Map 的各 action 最大进度、Work .35 floor | Director withSession/remember；包含预热与导航端点 | 当前是隐式历史。建议样段全部改 T 派生；不能直接包装成 U.visited 再声称无历史。旧域暂存有显式入口/出口 seed，见第 6 节 |
| positions Map、阅读恢复 ratio | archiveReadingMemory | 显式 U（用户阅读书签），保留；不是当前 T 的第二份可写副本。当前章节 T 由测量求出，离开时保存书签 |
| snapshot 内容、canvas/video 捕获；来源 rect 与当前位置 | readingSnapshot、archiveRoute.cloneViewport | 短期 presentation capture，绑定 requestId/layoutVersion；不进纯世界。保存正文原位置、移除 id、inert，取消后清理 |
| pointerX/Y、targetX/Y、dt；lake archiveTime | runtime ambient、Director pointer/follow、archiveAtmosphere | 短期输入/装饰时钟；固定状态验证置零或重放同一序列。静止画面仅在可见动态仍需更新时绘制，不能无条件循环 |
| 纹理/材质光照修正、castShadow/receiveShadow、lightMap/depthWrite；--room-paper | prepareArchiveMaterials、archiveAtmosphere 初始化、roomPalette 校准 | 资产代次初始化事实；复用既有像素/纸色防护，恢复准备期间执行但不能污染用户语义状态 |
| retained context、ready/recovering/failed、recovery计数/timeout、纹理与 composer resize | runtime/sharedResource/contextRegistry | 资源生命周期；资源代次失效取消未提交帧，失败公开正文；与 T 分离 |
| 声音 enabled、film mode、cue / sources、取消代次 | SoundProvider | 偏好 U + 事件；NR-01/02/03 不增声音，预热、seek、恢复均不派发叙事事件 |

Life DriftWall、Frame 各主题的 horizontal pin/bend、文字 reveal、lightbox 仍由章节拥有；它们影响阅读布局与快照捕获，但不在主空间的姿态写入域。不顺手重写其 rAF/GSAP；读取它们刷新后的范围，保留正文交互。

## 4. 样段对象与边界姿态

### 4.1 稳定内容身份、物件与载体

ID 以下为候选名称；`contentId` 代表内容，`carrierId` 代表物理/DOM 表示，`handoffId` 代表一次明确交接，三者不混用。内容集合不因故事 ID 新增重复照片记录。

| 建议 contentId / handoffId | 当前源→目标 | 已核实资产/裁切 | 交互及未决边界 |
| --- | --- | --- | --- |
| about-dossier / about-reading-to-room | 正文 About 当前阅读快照→NotebookReadingAnchor 的 AboutReading 四角 | AboutDossier 真实全文/排版；四角有效区 .250×.314m，物理纸面约 .266×.332m；不是照片 | snapshot inert；正文唯一可交互，完整文案/阅读位置不能压回首屏；entry→About 保留回归 |
| life-intro / about-life-reading | AboutReading 源快照→LifePhotoAnchor/LifeReading→LifeIntro 正文 | 目标当前为共享 LifeIntro 文案；房间底层照片是 football-action；纸上标题排版不能称为照片本身 | 预览 inert，最后 live Life 接管；同一语义内容复用，不要求复制整个 DriftWall |
| life-football-action / life-photo-to-frame | LifeMemoryPhoto + Life_PhotoPaper→候选 runtime 转移载体→ArchivePhoto_04 + PhotoMount_04 | public `/life/football-action.webp`，1280×960，GLB 两处 texture 33，embedded/public SHA `c455f28157c4a10a3b5fe2f809ef7087e940f76884fbc7cb05d165a7de6ee313` 相同；UV 两处均覆盖 [0,1]²；Life 成品 .13×.0975m，Frame 图像 .29×.2175m | 真实同图，可共用 contentId；载体仍不同。当前未连续移动/互斥，需 D2 选择。物理内容不直接触发 lightbox，room hit 与 live Life 图片交互分离 |
| frame-intro / frame-object-to-reading | FramePrintPivot 下 FrameReading 四角→ArchiveTextPanel(archiveIntro)→Frame 正文 | **FrameReading 对应足球图 _04**；真实 Frame 首屏是文字，然后摄影索引/主题。足球图不在 Frame 主题数组 | 建议保持文字开篇；物件落墙后展开正文，不宣称足球图变成 Frame 图库条目；若要新增图库位置属产品决策 |
| frame-final-horizon / frame-to-stack（回归边界） | Frame scenery/scenery-close/primary image id=11→StackPhotoViewerSurface/MonitorPhoto_Thumbnail→StackContinuityFrame | `/frame/scenery/scenery-11.webp`；独立 SHA `6685990126a7d047b1ac255c842a8e1e01a6d88b10a00b3507593ed6d8af4ba2`；runtime 以原始比例 fit 进 .462×.303m / .067×.073m。GLB 初始 screen 图片 scenery-05 会在 runtime 被替换，不能按模型初始纹理判断上线画面 | 必须保持另一 contentId；本轮只登记 resolver 及边界，不迁移 Frame→Stack 动作。DOM 最终 crop/滤镜与物理屏幕 fit 一致性 NOT_RUN |
| frame-building-03 / frame-scenery-05 / frame-cuisine-04 | ArchivePhoto_01/_02/_03，非入口主图 | 对应 public 03-720 / scenery-05-720 / cuisine-04-720，嵌入/public 字节各自一致；精确指纹在 object-bindings | 背景纸片，其 settle 轨道属于完整域；不能替代主角照片或 Final Horizon |

**几何限制（从资产读取，非目测）：** LifePhotoAnchor 与 LifeMemoryPhoto 含相互补偿的非均匀 scale；Frame 图片是有弯曲的 5×17 网格，四角拟合只约束边界，不能证明中部像素配准。两个照片共用材质，若新增透明度切换必须 clone material 或由载体可见性独占，不能全局改共享 opacity。转移端点必须按图片 UV 内容区对齐，纸边另算；实际近景遮挡/色彩仍 UNKNOWN。

### 4.2 最小语义位置和状态表

样段先注册 5 个语义段，不新增 DOM sections：`about-reading → about-life → life-reading → life-frame → frame-reading`。阅读段覆盖该章节真实可读范围，包括 Frame pin 产生的距离；过渡段复用已有桥 start/end。段首/段尾唯一归属采用半开区间，精确相接时归后段；最后尾端例外封闭。布局尚未可靠时不猜进度，保留上一已提交语义位置或可读降级。

`phase(p,a,b)` 可延用当前 smoothstep。下表是 **推荐的规范状态**，区别于受 session 污染的基线输出；D1/D2 确认后写入样段 spec。

| 位置 | Notebook / envelope / extraction | 足球照片归属 | Frame settle / 背景 | 相机和正文 |
| --- | --- | --- | --- | --- |
| about-reading，任意阅读位置 | 1 / 0 / 0 | 信封源；墙上同图载体隐藏（D2） | Frame 0；drawer/rail/folder 0；monitor 两态 false | AboutReading 最终阅读构图；live About 唯一交互 |
| about-life p=0 | 同上一段末端 | 源；target/transfer 权重 0 | 同上 | 与 About 最终相机一致；冻结当前阅读 composition 为 source |
| about-life 中间 | 1 / phase(.23,.62) / 同值 | 源照片抽出 | Frame 0；背景显式保持 | 0… .08 收回页面到纸面，.08… .24 离开；.24… .56 空间移动；.56… .72 对齐；.74… .94 靠近；.94…1 展开 |
| about-life p=1 = life-reading 起点 | 1 / 1 / 1 | 抽出源照片 | Frame 0；背景同上 | LifeReading 阅读相机；LifeIntro 预览退出，live Life 接管 |
| life-reading，任意阅读位置 | 1 / 1 / 1 | 源照片 | 同上 | live Life/DriftWall 独立交互；房间停驻由同一提交器处理 |
| life-frame p=0 | 1 / 1 / 1 | 源 | Frame 0 | 与 Life 最终相机一致；快照来自当前阅读位置 |
| life-frame 中间（D2） | 1 / 1 / 1（源动画基准，不是转移路径） | 建议 transfer=phase(.24,.56)，源→转移→墙面；非重合阶段只显示一个图像载体 | 当前 settle=phase(.24,.56) 先作基线候选，若物件到达与 settle 节奏冲突由样段调整 | 显式世界空间路径追踪照片；不跟镜头贴一张图。转移基准从不可变源端点及当前目标绑定得出，不靠上一帧/reparent 回调 |
| life-frame p=1 = frame-reading 起点 | 1 / 1 / 1 | 墙面；源图与其纸背隐藏，转移载体隐藏 | 四个 Frame settle 1；背景同上 | FrameReading 最终相机→现有文字开篇；正文唯一交互 |
| frame-reading，任意阅读位置 | 同上一行 | 墙面 | 同上 | 保持房间状态；现有 Frame 主题滚动可用，结束接旧 frame-stack |

反向沿同表采样，不以完成回调交换 parent；第一次直接进入与多次来回后进入同一 T/U 应完全一致。照片 scale、纸边、transfer 的精确路径/遮挡是 NR-03 实测范围，不能提前宣称视觉连续。

NR-02 尚无转移载体时可先交付数据/真实绑定确定性，照片使用显式基线展示策略；该卡不得冒充 NR-03 的照片连续性已完成。NR-03 启用 D2 后同一版本下的状态规范和验收 oracle 一并更新，不混用两版期望。

## 5. 最小接口与提交合同（伪代码）

只扩展现有 N/types.ts、specs.ts；不建立全仓通用 Graph/ECS，不增加第二套 React Context，也不新增 WorldCanvas。以下名称为草案，结构足以限定职责，具体 TypeScript 以实施卡为准。

```ts
type SampleSegment = 'about-reading' | 'about-life' | 'life-reading'
  | 'life-frame' | 'frame-reading'
interface StoryPosition { segment: SampleSegment; progress: number }
// global time 只读地由 segment 顺序/权重计算，不存入可写 StoryPosition。
interface Versions { story: string; content: string; asset: string; binding: string }
interface UserState {
  readingBookmarks: Partial<Record<'about' | 'life' | 'frame', number>>
  // 已有偏好留在现有 owner；样段不发明 visited/opened 等历史状态。
}
interface LayoutSnapshot {
  version: number
  viewport: { width: number; height: number; dpr: number }
  spans: readonly { segment: SampleSegment; start: number; end: number }[]
  surfaces: ReadonlyMap<string, { width: number; height: number }>
}
interface SampleInput { position: StoryPosition; versions: Versions; user: UserState }
interface StoryFrame {
  position: StoryPosition; versions: Versions
  world: {
    actions: Readonly<Record<BoundClipId, number>> // 第 3.1 节 11 个精确 clip 的 amount
    monitor: { project: boolean; photo: boolean }
    football: {
      contentId: 'life-football-action'
      transfer: number
      weights: { source: number; transfer: number; wall: number }
    }
  }
  camera: CameraIntent
  presentation: {
    sourceSurface: 'AboutReading' | 'LifeReading' | null
    targetSurface: 'AboutReading' | 'LifeReading' | 'FrameReading'
    sourceReveal: number; sourceExpand: number
    targetReveal: number; targetExpand: number
    readingOwner: 'about' | 'life' | 'frame' | null
    roomHitEnabled: boolean
    focusEnabled: boolean; aperture: number
  }
}
// CameraIntent = 已有视图引用 + travel/arc/leave/align/dolly 的数值意图，
// 阅读段用 surface-fit；不含相机实例，不提前把最终位置写死到数据层。
// BoundClipId = 第 3.1 节精确名称的联合；无任意字符串缺失跳过。
function sampleStory(input: SampleInput): StoryFrame
```

采样拒绝未知 segment/版本不兼容/非有限进度；调用适配器负责有限值钳制，不静默把无效输入当 About 首帧。story/content/asset/binding 的固定版本包随构建配置，第一轮可用合同常量及文件指纹，不增加在线内容版本平台。读取 DOM、素材解码、生成快照均不在 sampleStory 内。

```ts
interface BindingContract {
  clips: readonly { id: BoundClipId; node: string;
    property: 'translation' | 'rotation'; start: number; end: number }[]
  // surface 四角精确名称、photo/背纸/monitor 节点与基准 TRS；见第 3、4 节。
}
// prepareBindings 一次解析索引与关键缺失，验证 hash、clip 区间、node/path。
// applyWorld 独占 mixer + 载体，返回同次写入后的锚点值；不写 DOM/camera。
// solveCamera 在实际物体矩阵完成后，组合 CameraIntent + pointer/短期输入。
interface FrameStamp {
  frameId: number; layoutVersion: number; resourceGeneration: number
  requestId: number; ownerEpoch: number
}
interface FinalCamera {
  position: readonly number[]; quaternion: readonly number[]
  viewMatrix: readonly number[]; projectionMatrix: readonly number[]
  fov: number; aspect: number; near: number; far: number
}
interface SurfaceProjection {
  surfaceId: string
  worldCorners: readonly number[][]; cssCorners: readonly number[][]
  matrix3d: readonly number[] | null
  valid: boolean
  reason?: 'missing' | 'non-finite' | 'near-clip' | 'degenerate' | 'outside-depth'
  // 不用 visible=true 冒充经过遮挡检测。
}
interface CommittedFrame {
  stamp: FrameStamp; story: StoryFrame; camera: FinalCamera
  projections: readonly SurfaceProjection[]
}
```

快照是不可变数值副本，不能暴露下帧会改变的 Vector3、Matrix4.elements 引用。frameId 单调增加；layoutVersion 在已完成刷新、pin range/viewport/表面测量一并可用后增加；resourceGeneration 在 GPU 丢失/重建开始即递增，拒绝旧纹理/准备回调；ownerEpoch 防止已释放 adapter 再提交；requestId 标记当前 seek/输入请求。字段一致只是可追溯条件，真实矩阵读回与执行轨迹才是证据。

**单次调度（不新增永久 rAF）：**

1. 缓存本轮最后输入，取得已提交 LayoutSnapshot、requestId、ownerEpoch、资源代次；尚未 ready 则交可读降级。NR-02 沿用 runtime 的 schedule，桥只供位置；NR-04 才将 Lenis 驱动与全局测量收拢。
2. `sampleStory(T, U, versions)`；一次应用全部 11 个动作和本帧 carrier 状态；binding 内部的 animation sample → transfer composition 是有序的一次写入责任，不允许第二模块再写该节点。
3. 更新模型世界矩阵，再读取锚点；求最终相机（包含 pointer），更新相机投影/逆矩阵；source、target、hit 共享此结果与同一 viewport。
4. 先计算/校验全部 CSS 矩阵及 hit bounds；无效投影明确清空本帧 hit/预览，必要时让正文可读，不能留下上一帧坐标。复用 pageMatrix 的退化过滤，并统一源/目标的近裁剪检查。
5. 检查 request/layout/resource/owner 仍匹配，再同步写 DOM/passes，调用 composer.render；渲染无错误后发布 CommittedFrame。若失败，集中撤销空间交互/遮挡，显示正文，结果为 fallback 而非 render-success。
6. 本轮无 await；异步加载/字体/图像只让下一轮失效重算，不修改正在提交的数据。后续声音事件只在合格提交后放行；本轮所有事件静默。

这是 JS 同步的逻辑提交，不保证浏览器 DOM 与 GPU 原子呈现，更不代表显示器已呈现。不能命名 actuallyPresented。

**取消 / 定位：** `seek(position, {requestId, signal, restore})` 的结果为 `committed | readable-fallback | cancelled`，附 stamp 或明确原因。新请求、用户 wheel/touch/导航键、owner release、GPU 代次变化均使旧请求失效；完成回调只准结算当前 requestId，不得取消新 owner。layoutVersion 变化时保留语义位置重新映射；未取得新布局不返回成功。读取书签是确定目标位置的步骤，不是每帧改写世界的历史 floor。NR-03 做样段版；NR-04 才统一全站 API。

## 6. 新旧所有权与迁移退出

### 6.1 接管不能只按 visible shot 判断

runtime 内部增加一个有限 owner 判定：`legacy | sample` + epoch。样段包含上述五个段的**桥、正文停驻、即时定位**。所有 writer 入口（draw、rest、navigate、预热、恢复、resize、resumePrevious、activate 清理）先经过这个门；sample owner 下不得调用 legacy pose/navigationPose 或旧 page/route 矩阵写入。

旧章保留既有机制，样段入口可继续接收旧 `{track, progress}`，但只是转成 StoryPosition 的适配器，不能在应用新 StoryFrame 后再按 shot 解释第二套动作。多个桥同时可见时按当前实际 scroll 和已提交 spans 选择唯一段，不能按最后执行 React effect 的顺序决定世界。正文/桥重叠的 margin-bottom=-100svh 必须通过半开 spans 划出唯一所有权。

### 6.2 具体边界矩阵

| 路径 | 必须显式重置 / 保持 | 退出旧路径的约束 |
| --- | --- | --- |
| entry 最后帧 → about-reading | 书打开；相机 AboutReading 精确拟合；源预览退出，正文打开；Life/Frame/Work/monitor 按样段规范写全 | 保留 entry 的现有入口效果；sample 获取 epoch 后 entry 不得 cleanup 覆盖新 page；背景规范变化只能在旧入口已释放时发生，并实际检查可见跳变 |
| 旧任意章直接进入样段 | 取消旧 route/WAAPI/active lease；样段全部动作和图像载体写全；保持用户书签与偏好 | 可先直接定位呈现规范目标，不沿用上次 Work drawer floor 或终点矩阵；旧 pending 回调必须失效 |
| Life/Frame 阅读期间 | sample rest 保持同一世界规范；保持章节自身交互与书签 | 不再由 ArchiveStage 的 activeId 或 Life viewport 特判调用 legacy rest 覆盖相机 |
| frame-reading → 旧 frame-stack | 显式把 Notebook/Life/Frame 置 1，work/rails/folder 0；隐藏 transfer；明确 football 源/墙载体状态；旧 frame-stack 再决定 monitor/Final Horizon | 只在 gate 释放 sample 后允许旧 pose。临时 legacy 适配器必须接收明确 seed，不 max 合并旧残留；同一时刻不允许两个 mixer 写节点 |
| 倒滚返回 entry / 离开样段到其他旧章 | 关闭样段 DOM/hit，恢复被样段临时 clone 的材质和 carrier 基准；给旧域确定 seed，旧域绝对应用 | 先 cancel epoch；再准备目的状态；不能直接 resume 已过时的 previous surface。进入 entry 需单独复核其像素开场、书页全文和真实 Index |
| 预热/校色/GPU 恢复 | 用户 T/U/书签不变；prepare 时不 remember；每次临时 pose 后按当前 owner 重采样最终完整状态 | 可复用同一 GPU，不能建第二 renderer。legacy 准备调用增加显式“无会话写入”模式；sample 预热只取 canonical frame，显示前重新提交 |
| 样段绑定缺失或投影不可用 | 清理空间 page/hit/routing 标志，正文可读；保持返回目标与书签 | 缺失关键绑定报告名称并 fallback；不能静默跳过又宣称 ready，不能阻塞全站正文 |

legacy session 不全站删除。先改“准备模式不记忆”，并为跨域列出显式 seed 接口；只有 sample 域拒绝隐式 floor。D1 推荐规范重建会让访问后退回样段时背景抽屉收回，是产品行为取舍，须确认。若 tim 要“开过永久留下”，应另给显式用户房间选择并重写 oracle，不能保留偷偷累积的 Map。

NR-02 的基线展示模式退出时可恢复旧 carrier 原状；NR-03 一旦启用同图互斥，frame-stack 入口至少接收这一个 carrier 的连续归属 seed。不能为了旧路径可跑，在边界重新亮起信封中的第二张同图。无需迁移 frame-stack 整段曲线，但需登记这条跨域 carrier 状态。

### 6.3 NR-01 / NR-02 / NR-03 文件合同候选

下表全部为 PM 待生成的实施卡范围；同一时间唯一 DEV 写产品。公共文件按卡串行交接，不并行改。

| 卡 | 独占候选文件 / 具体责任 | 接入/旧退出与回退 | 可感知结果和退出条件 |
| --- | --- | --- | --- |
| NR-01 | N/types.ts、specs.ts、index.ts 扩展；新增 N/sampleStory.ts；新增 `content/narrativeObjects.ts`；新增 PA/sceneBindings.ts 的只读 prepare/validate 部分；PA/archiveRuntime.ts 仅接一处不驱动场景的 shadow 采样；PA/archiveRuntimeSignal.ts、`components/frame/FrameParticleHandoff.tsx`、`components/Skills.tsx`、旧 PA/ArchiveSignal.tsx 只改稳定 resolver 的等价引用 | 旧 draw 仍唯一写世界；shadow 只记录输入/规范输出/已有场景读值，禁止 apply/新 mixer/声音。新 resolver 指向当前同一资源；无资产重排。关闭单一 shadow 接入、撤回本卡增量即可回退 | 访客体验应保持基线；退出靠固定预期状态、11 clip+节点/锚点验证、四处 Final Horizon 消费者同源。明确 shadow 与当前历史输出可不同，不能强求相等而复制旧 floor |
| NR-02 | PA/archiveRuntime.ts 调度/owner/恢复；PA/archiveDirector.ts legacy 准备模式和 seed，sample 停用旧 pose；PA/sceneBindings.ts apply/readback；新增 PA/archiveCameraRig.ts；PA/archiveReadingSurface.ts 分离数值投影与提交；PA/PersonalArchiveSurface.ts 注册/释放；PA/ArchiveStage.ts 样段停驻入口；PA/ArchiveChapterBridge.ts 样段桥改供位置/目标；N/sampleStory.ts 仅必要修订 | 在 runtime.draw 分支 **调用旧 Director 之前** gate；统一 drawRest/navigation 入口。使用一个现有 mixer 交接或停用旧 mixer 后创建唯一新 mixer，禁止同时 active；prepare 期间不污染 session。关闭 sample gate 后恢复旧 actions/carrier/material/DOM，重新应用当前旧 pose | 样段基础姿态直达与往返一致，物件/相机/DOM 同帧；先无新照片转移动作。必须拿真实 scene 读回，覆盖正文停驻和旧边界；不提前称完整交互闭环 |
| NR-03 | N/specs.ts、sampleStory.ts 中 transfer/owner 数据；PA/sceneBindings.ts 新照片载体（若复杂再新增 PA/archivePhotoTransfer.ts，只有 binding 调用）；PA/archiveCameraRig.ts 路径；PA/archiveReadingSurface.ts presenter；PA/ArchiveChapterBridge.ts、ArchiveHandoffPage.tsx、readingSnapshot.ts、personal-archive.css 的样段接管；L/archiveRoute.ts、archiveReturn.ts、archiveReadingMemory.ts、chapterScroll.ts 的样段 request/return 适配；`App.tsx` 与 `components/ChapterTransition.tsx` 仅样段分流/取消，不全站改导航；必要 runtime 接口与 types 同步 | 样段不走旧 navigate+WAAPI 端点矩阵；先可靠的即时 seek/返回，动画返回也必须消费同帧快照。保留 inert 阅读捕获和 live chapter 唯一交互。样段 skip App 三次延迟纠偏；非样段保持。回退只撤本卡 carrier/路由分支，返回 NR-02 的确定性基线模式 | 同一足球照片从源到墙连续，可读可返；长文/Frame 深处书签恢复；任意样段位置快跳/倒滚/中断/布局变化可用。QA 定点复核、tim 看实际节奏；此前不接受视觉完成 |

NR-01 resolver 采用现有 `content/index.ts` 数据入口，不复制 public 数组：足球按精确 src 查现有 photos；Final Horizon 按 scenery theme + scenery-close cluster + primary + image id=11 解析，检测 id/src 是否匹配。Frame 的 image.id 是主题内数字，不能单凭 11 全库查找。新 content/narrativeObjects 可直接从同目录 index 引入数据，避免 index 再反向导出造成循环。

测试文件仅在未来实施卡获授权后登记：NR-01 用已有测试组织新增必要 sample/binding-data 用例；NR-02 记录真实 GLTF/Mixer 读回与同帧轨迹；NR-03 用已有浏览器设施做关键操作。不在本卡编写测试或引入测试框架，具体文件名由 PM 随卡写明，不能用“tests/**”授权无限扩张。

**为何 NR-02 不等 NR-04：** 样段已经有 bridge ScrollTrigger start/end，可缓存它们和阅读 spans，驱动现有 schedule；最小布局版本及 owner gate 足以把这一个域的绑定/相机/DOM 放入同次调用。NR-04 才接管所有章节、Lenis/全局 ScrollMap、全局深链和恢复协调。NR-03 的样段事务以后被同接口替换，不能成为第二套长期全局路由。

回退按每卡开工时的目标文件指纹和补丁，仅撤任务增量；本基线虽曾干净，未来不能 reset/clean 全仓。报告和证据是追加产物，勿覆盖其他卡。模型/导出器不在这三卡写域；若视觉结论需要改曲面/锚点，另交模型卡。

## 7. 验收矩阵与真实证据（本卡全部运行项 NOT_RUN）

### 7.1 两层数据与帧证据

| 项目 | 将来执行方式 | 必须记录 / 判定 |
| --- | --- | --- |
| 纯采样 | 固定版本、T、U；五段端点和过渡 .08/.20/.23/.24/.26/.56/.62/.66/.72/.74/.94/1，各取左右 epsilon；另测试未知段/NaN/Infinity；初始与乱序调用 | 对第 4.2 节手工预期，不以同一函数生成 expected；记录 11 action amount、照片权重、monitor、presentation、camera intent，无隐藏 session |
| 真实 GLB 绑定 | 相同解析配置的全新模型 A 直接 apply T；模型 B 历经 entry→sample→后段→反滚→sample、随机 seek 和取消后 apply T。可分次使用同一 renderer，勿为验收常驻两 context | 两边实际 Object3D local TRS、matrixWorld、carrier/parent/visible、11 个 AnimationAction time/weight/effectiveWeight/enabled/paused/timeScale/loop/clamp、map/emissiveMap/scale/透明度等；对象定位用名字+asset hash，不比较随机 UUID |
| 真正的同帧配准 | 在 apply 后、相机 solve 后、DOM commit 前与 render 前四个阶段留顺序轨迹；取实际 scene/camera 矩阵和 DOM computed matrix | 独立从实际节点重投影四角，对实际 CSS 内容边界；同时比 frame/layout/resource/request/owner；不能仅把同一个 stamp 复制五次当成功 |
| 新旧 owner | 从 entry/Index/Work 进入、两个桥 viewport 重叠、阅读 rest、detach/resumePrevious、导航源/目标矩阵预求、预热和恢复 | 每个 frame 属性域 writer 计数/名称；sample 域不出现 legacy.pose/navigationPose；旧 release 回调无权写新 DOM；T 规范无 Work floor 残留 |
| 字体/图片/pin/resize | 定位到 About 长文、Life 阅读、Frame 中间 cluster；图片 decode/font ready 后刷新，横竖窗尺寸改变，再定位 | 刷新后唯一新 layoutVersion、语义位置不漂移、旧事务 cancelled；Frame 用真实刷新后 pin-spacer 范围，不用初始 offsetTop |
| GPU / 准备 | context lost→restore、恢复过程中新 seek/离开样段、准备失败 | generation 增加、旧 async 回调无提交；临时预热不改 T/U；纹理/环境恢复后重采样当前 T；不能用未显示预热帧当用户完成 |

建议初始容差写进实施卡并在执行前锁定：位置/锚点 1e-5m、scale 1e-6、四元数角差 1e-5rad（q/-q 等价）、action.time 1e-6s、有效权重 1e-6、FOV 1e-5°、矩阵元素相对/绝对 1e-6、CSS 投影角点 0.5 CSS px。理由：资产为米级 Float32、同版本同 JS 路径应高度一致，屏幕允许亚像素舍入；真实 scene 比较失败时先分类数值误差/所有权/错误几何，不能自动放宽。BOOL、ID、clip/节点绑定、epoch/layout/resource/request 等用精确相等。以上是候选数值，不是已测设备的误差保证。

### 7.2 产品操作与降级

| 操作 | 证据与退出要求 |
| --- | --- |
| About 完整阅读→收回→Life→Frame，反向、停驻与快滚 | 保留全文/原图，source snapshot 是离开时的实际阅读位置；逐阶段录屏/定点图及复现位置，由 tim 判断画面/节奏，不作自动美术评分 |
| Life 同图转移 | 对照 public/embedded hash、运行时纹理来源、UV、图片内容四角/纸边；转移开始/中间/落墙时展示归属清楚，源与墙不能独立残留两张；曲面中部至少额外采样，四角通过不等于整面重合 |
| 唯一交互 | inert preview/clone 无可聚焦副本，live About/Life/Frame 可操作；room hit 无效投影时清空；通过键盘、点击、lightbox 开合和恢复 opener 取证；CSS opacity=0 不能替代 inert/禁用 |
| 导航与返回 | 样段三章相互直达，外部章→样段，返回物件再回任意阅读位置；第二次请求/用户滚动/键盘取消后只剩新请求；不存在 120/520/1100ms 旧回调抢回滚动 |
| 入口/出口回归 | 原 Index 可交互、entry 像素开场和 About 映射；Frame→Stack 仍 Final Horizon（不同于足球图），monitor/photo 归属不闪回 PulseGraph plane；后续 Work/Contact 不被样段 reset 污染 |
| 资源失败/减少动态/窄屏 | 不开放手机 3D；保持 DOM 可读可返，缺绑定报告具体名称；关键资源不可用不能显示虚假完成 100%；无空间时不等待一个不会发生的 scene ready |
| 静止与隐藏 | 相同设备、视口、DPR、质量档记录 draw 次数、ambient 原因与时间窗；无输入且无可见动态时停止绘制，隐藏页停止；有湖面动画则标成动态状态，不伪称零帧。体积仅提示 |
| 声音边界 | 本样段迁移不增加声源/事件；seek/预热/恢复不补播。真实声场/听感验收留 NR-07 |

设备、浏览器版本、viewport、DPR、资源与代码指纹必须随证据记录；本卡均未实际运行，不能填写真实帧率、容差通过率、视觉分数或 PASS。历史像素回归及 Loader 问题只用于提醒回归边界，不继承旧会话任务或旧通过结论。

## 8. 待决策项（3 项）

| 编号 | 明确推荐 | 理由与代价 |
| --- | --- | --- |
| D1 · 样段的物件记忆 | 采用第 4.2 节规范：物件由 T 推导，阅读书签保留为 U；回到样段收回不属于该段的抽屉/rail | 消除预热/访问顺序污染，可证明直达一致；代价是“访问过就一直打开”的隐式行为不保留。若 tim 希望永久保留需显式产品选择，不能藏在 session floor |
| D2 · 足球照片与 Frame 内容 | 复用已核实的 football-action 做源→墙的连续主角，保持 Frame 现有文字开篇/主题内容，不添加足球图到图库；Final Horizon 始终独立 | 无需换原图或重建模型；需 NR-03 建明确载体接管和曲面匹配。若目标改为足球图进入 Frame 可点击图库，须另指定位置/文案，会扩展正文内容范围 |
| D3 · 样段导航切换顺序 | NR-02 接管所有真实写入口；NR-03 先完成样段可靠即时 seek/返回，再按同一快照完善收回动画；NR-04 做全站统一 | 避免等待全局重构才能检验同帧正确性；代价是中间版本样段直达可能暂用即时定位，不能接受为最终运动精修。外章保留旧路由，不批准全站重写 |

其余工程选择由 ARCH/DEV 在卡内落实：精确 clip 绑定、单写者、快照不可变、取消 token、投影失败 fallback、复用安全/加载/声效基础，不逐项上交 tim。精确照片路径/遮挡/色彩是 NR-03 和后续 ART 的实测/设计工作，不提前假定已达标。

**交付边界：** 本卡完成静态架构规划；产品零修改。PM 审查本合同、处理 D1–D3 后再与 tim 确认开发计划；ARCH 不自行续接 NR-01，不向 DEV/QA 派工，不恢复其他会话历史任务。
