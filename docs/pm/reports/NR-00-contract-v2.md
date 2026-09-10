# NR-00 · 合同修订附录 v2

2026-09-09，ARCH；仅处理 [PM 审查](NR-00-pm-review.md) 的 R1/R2。所有实施卡仍为 DRAFT。本附录不构成开发、测试、服务或发布授权。

## 适用范围与产品决定

本附录替换 [原合同](NR-00-contract.md) 第 5 节的故事世界输出/绑定边界，以及第 6.3 节的 NR-01 行与 resolver 首轮替换安排。原合同第 1–4 节的静态资产事实、完整受控域、第 5 节布局/取消/最终相机与提交顺序、第 6 节 NR-02/03 顺序、第 7 节真实验收要求继续引用；与本附录冲突时以本附录为准。不重新声明静态调查或运行验收已执行。

PM 在本轮追加转达 tim 的明确决定：**D1 采用“按故事位置复原，保留阅读书签”**。因此原合同 D1 待选状态及隐式历史保留分支不再适用：

- 物件开合、抽出、归属和背景静置状态由当前 T 决定；U 保留阅读书签，不添加 visited/opened/最高到达进度等持久房间状态。
- 书签在导航时用于选定目标 StoryPosition；同一 T 的基础世界不因不同书签而改变。预热、恢复、读回或 shadow 观察均不得修改 U。
- D2 延续 PM 推荐：足球图从源物件交接到墙面，再展开 Frame 文字开篇，是两个明确阶段；不添加图库条目，不把 Final Horizon 合并进足球图身份。没有额外素材/正文改动授权。
- D3 顺序已由 PM 接受：NR-02 接管完整样段写入口，NR-03 完成交接/返回，NR-04 统一全站。即时 seek 只用于内部中间交付，不能作为正式样段最终动效验收。

本轮实际 HEAD 为 `55c08029051b11e9687d869747907e20291940fa`，分支 `baseline/personal-archive-20260909`。沿用已认可的 `6137099` 产品基线，不重新盘点 GLB。工作区存在 PM 的文档修改与既有报告，均保留。

## R1 · 语义世界、具体绑定、实际读回分离

### 1. 故事输出只包含样段需要的语义

```ts
type SampleSegment = 'about-reading' | 'about-life' | 'life-reading'
  | 'life-frame' | 'frame-reading'
interface StoryPosition { segment: SampleSegment; progress: number }
interface UserState {
  readingBookmarks: Partial<Record<'about' | 'life' | 'frame', number>>
}
// 书签在 seek 入口解析为目标 T；不是 sampler 的历史输入。
interface SampleInput {
  position: StoryPosition
  storyVersion: string
  contentVersion: string
}
type PhotoPlacement =
  | { kind: 'life' }
  | { kind: 'life-to-frame'; progress: number }
  | { kind: 'frame-wall' }
interface SemanticWorld {
  notebook: { openness: number }
  envelope: { openness: number }
  photo: {
    contentId: 'life-football-action'
    extraction: number
    placement: PhotoPlacement
  }
  wallPrints: { settling: number }
  cabinet: { drawerOpenness: number; folderLift: number }
  screen: { mode: 'inactive' }
}
interface StoryFrame {
  position: StoryPosition
  storyVersion: string
  contentVersion: string
  world: SemanticWorld
  camera: CameraIntent
  presentation: PresentationIntent
}
function sampleStory(input: SampleInput): Readonly<StoryFrame>
```

`CameraIntent` 与 `PresentationIntent` 延用原合同的数值意图和阅读所有权，不含 Three.js/DOM 实例；其中观看/阅读目标使用语义对象角色，由运行适配器解析到原合同登记的物理 surface。上例只展示本次变更边界，不要求新增同名文件或通用框架。

所有 openness/extraction/settling/lift/progress 有效范围为 [0,1]，不是秒或角度；screen 在样段显式 inactive，用于清除外段留下的屏幕状态，不在首轮设计全站屏幕状态机。drawerOpenness/folderLift 虽然在样段为 0，仍必须输出，以便从 Work 返回时完整重建背景。

照片的 `placement` 表达位于源物件、正在交接或已在墙面。source/transfer/wall 的网格名称、材质透明度、动画动作权重及视觉载体混合权重均不进入 `world`；由绑定与 presenter 在原合同唯一交互/受控重合规则下执行。若 NR-03 需要艺术编排的视觉混合量，应放在表现意图，不能与 GLTF AnimationAction.weight 混用。

D1 下沿用原合同第 4.2 节的规范状态表：书本在样段打开，信封及照片在 about-life 抽出，life-frame 完成后归墙面，背景 drawer/folder 归样段静置值。它们不读取旧 session Map。规范具体过渡节奏仍随样段设计确认；原有状态端点与真实数据区分不变。

原先 `Versions.asset/binding` 从 sampler 输入/输出移到运行时的绑定/资源元数据，并与 CommittedFrame 的 stamp 一并记录；实际资产指纹仍不可省。**只改 clip 名或拆分通道时，应只修改绑定版本与映射，不改变 SemanticWorld 或 sampleStory 输出。** 不将实际绑定读回作为采样输入。

### 2. SceneBinding 私有映射覆盖全部 11 条通道

原合同第 3.1 节的精确 clip、node/path 和有效时间区间全部保留，变为绑定验证和真实读回清单。下表说明语义值怎样覆盖每一条通道；不让 sampler 导入此表。

| 语义字段 | 精确 clip → node.property | 绑定采样区间 |
| --- | --- | --- |
| notebook.openness | NotebookOpen → NotebookHinge.rotation | 0…clip.duration |
| envelope.openness | LifeEnvelopeOpen → LifeEnvelopeHinge.rotation | 0…clip.duration |
| photo.extraction | LifePhotoExtract → LifeMemoryPhoto.translation | 0…clip.duration；转移组合仍由同一 binding 执行 |
| wallPrints.settling | FramePrintSettle_04 → FramePrintPivot.rotation | 0…clip.duration |
| wallPrints.settling | FramePrintSettle_01 → FramePrintPivot_01.rotation | 0…clip.duration |
| wallPrints.settling | FramePrintSettle_02 → FramePrintPivot_02.rotation | 0…clip.duration |
| wallPrints.settling | FramePrintSettle_03 → FramePrintPivot_03.rotation | 0…clip.duration |
| cabinet.drawerOpenness | WorkDrawerOpen → WorkDrawerRoot.translation | 1…2.4s |
| cabinet.drawerOpenness | CinemaRailTravel_Left → Cinema_RailMiddle_Left.translation | 1…2.4s |
| cabinet.drawerOpenness | CinemaRailTravel_Right → Cinema_RailMiddle_Right.translation | 1…2.4s |
| cabinet.folderLift | WorkFolderLift → WorkFolderPivot.translation | 74/30…110/30s |

一项语义驱动多条动作是绑定职责；例如 drawerOpenness 同时采样抽屉和两侧滑轨。0 表示绑定区间起点，不等于 transform 归零。关键节点/通道缺失、区间错误或重复 writer 必须报告，不能按名称正则猜测或静默跳过。

NR-02 的绑定执行需显式控制这 11 个 action 的 time、weight/effectiveWeight、enabled、paused、timeScale/effectiveTimeScale、loop/clamp，以及节点矩阵；候选 seek 模式保持单独采样、LoopOnce、clamp、paused，不累积播放。具体运行有效值由 Three.js 实际读回验证，不能用配置值代替。权重/状态属于绑定合同，绝不由故事内核读 clip 对象后推导。

`photo.placement` 映射到 LifeMemoryPhoto/背纸、转移载体、ArchivePhoto_04/背纸的归属；`screen.inactive` 映射到两个 MonitorState 的 false。非均匀 scale、曲面顶点、UV 和材质引用保留为资产事实，仍遵守原合同的单写者顺序和背景完整应用要求。

### 3. BindingReadback 是独立的实际观察

```ts
interface BindingReadback {
  assetHash: string
  bindingVersion: string
  observedAt: {
    frameId: number | null
    resourceGeneration: number | null
    phase: 'legacy-post-render' | 'bound-post-apply'
  }
  nodes: readonly {
    name: string
    localTransform: readonly number[]
    worldMatrix: readonly number[]
    visible: boolean
  }[]
  actions:
    | { status: 'unavailable'; reason: string }
    | { status: 'read'; values: readonly {
        clip: string; node: string; property: string
        time: number; weight: number; effectiveWeight: number
        enabled: boolean; paused: boolean
        timeScale: number; effectiveTimeScale: number
        loop: number; clampWhenFinished: boolean
      }[] }
}
```

这是最小动作/节点读回结构；原合同要求的材质、纹理来源、scale/opacity/parent、相机及 DOM 几何等证据仍由对应读回项记录，不降级为只查 stamp。数据是不可变数值副本，不返回会被下帧修改的数组/矩阵引用。

依赖方向固定为：`sampleStory → SemanticWorld → SceneBinding.apply`；随后 `SceneBinding.readback → 诊断/验收`。prepare/inspect 的静态发现另用 BindingInspection（节点/通道存在性、绑定区间、缺失/冲突），不得冒充真实动作读回。纯内核不导入 sceneBindings、GLTF、Readback 或 DOM，也不消费诊断错误来调整故事。

**分阶段可用性必须真实：** NR-01B 只静态检查元数据，不能报告 effectiveWeight。NR-01C 复用旧模型已更新的局部数据/matrixWorld 做观察，不创建 Mixer，不调用 mixer.update 或 updateMatrixWorld 补帧。旧 Director 的 actions 为内部私有，C 不为观察而新增第二个动作集合或扩大 Director 接口：该项明确 `unavailable: legacy-private-actions`；没有 frameId/resourceGeneration 的旧字段写 null。NR-02 binding 取得真实动作句柄后，才补齐全部 action 读回和实际同帧证据。

## R2 · NR-01 拆为三张串行小卡

下列路径以仓库根为准，均为**将来实施卡的候选文件**，本轮不创建它们。原合同 NR-01 的整组同时修改范围作废。依赖为 A → B → C → NR-02，每一张完成即交 PM；确认计划、单独 READY 派发及文件所有权登记仍是开工前提。现有 `apps/landing/tests/*.test.ts` 使用 node:test，沿用现有组织，不新增测试框架。

### NR-01A · 纯语义采样

| 项目 | 限定内容 |
| --- | --- |
| 产品候选文件 | `apps/landing/src/core/narrative/types.ts`、`specs.ts`、`index.ts`；新增同目录 `sampleStory.ts` |
| 测试候选文件 | 新增 `apps/landing/tests/sampleStory.test.ts`；仅在共享 NarrativeSpec 校验行为确实变动时调整现有 `narrativeSpec.test.ts` |
| 依赖 | v2 合同获认可；D1 已明确；PM 单独派发 A READY |
| 交付 | 五段语义类型/数据和纯函数；不导入真实模型或章节组件，零运行时接入。无消费者时如实称数据合同交付 |
| 未来验收 | 依据原状态表手工固定端点/边界预期；乱序/重复采样一致；无效位置拒绝；输出无 clip/node/action 名称依赖；书签改变不影响同一 T 的世界。改 GLB 命名无需改内核；不通过模拟绑定执行证明纯采样 |
| 退出条件 | 数据合同可独立检查，现有 Work Transition spec 接口保持兼容；没有 runtime/ready/事件/DOM 导入或改动；测试实际结果随卡报告 |
| 回退 | 撤销 A 的类型/spec/export 增量及新增采样/用例，不涉及 GPU、资源或已挂载场景；已有非本卡修改保留 |

A 不建立全站 graph、renderer 或空 adapter 文件。camera/presentation 只给样段所需意图；实现测试不是把函数输出复制为 expected。

### NR-01B · 只读绑定检查与样段内容身份

| 项目 | 限定内容 |
| --- | --- |
| 产品候选文件 | 新增 `apps/landing/src/components/personal-archive/sceneBindings.ts`，第一版仅语义→资产绑定表与只读 inspect；新增 `apps/landing/src/content/narrativeObjects.ts`，仅足球图的稳定 resolver |
| 测试候选文件 | 新增 `apps/landing/tests/archiveBindingContract.test.ts`、`narrativeObjects.test.ts`；测试读取已有 GLB 和内容数据，缺失/改名/重复通道通过内存描述副本构造，不修改资产 |
| 依赖 | A 经 PM 接受；绑定使用 A 的语义类型，采样不反向依赖 B |
| 交付 | 11 精确通道、相关节点/锚点与区间的只读 BindingInspection；足球图按稳定 contentId 解析到现有 photos 的精确 src，核对已认可的嵌入/public 身份 |
| 未来验收 | 全部 11 通道覆盖；改 clip 名仅改绑定表；缺失和冲突有结构化结果；inspect 不创建 action、不改矩阵/材质/可见性、不加载第二 renderer；resolver 不重排/复制内容、不新增素材或可点击图库记录 |
| 退出条件 | 只读检查结果可审阅；未知项显式报告；无 runtime 接口/ready 修改，无跨组件换资源；B 的失败不接入现有启动流程 |
| 回退 | 删除 B 两个新模块及本卡测试；A 的纯采样继续存在但未接入。不撤素材/内容数组、不修改现有消费者 |

**跨组件等价替换清单：本卡为零项。** 当前足球图的物理两载体本来就读取 GLB 嵌入图；其运行接管留 NR-02/03。B 的 resolver 是样段身份合同，供 C 诊断和随后绑定使用，不为“用起来”而改 LifeGallery/Frame 首屏。

以下原 NR-01 中的 Final Horizon 替换统一延至 **Frame→Stack 交接实施卡（NR-05 对应子卡）**：

| 延后文件 | 届时等价替换边界 |
| --- | --- |
| `apps/landing/src/components/personal-archive/archiveRuntimeSignal.ts` | 数组末项改为明确 scenery/scenery-close/primary/id=11 resolver，保持 src、纹理参数、fit 与材质行为 |
| `apps/landing/src/components/frame/FrameParticleHandoff.tsx` | length-1 改 resolver，保持 legacy 窄屏/减少动态路径及原图 |
| `apps/landing/src/components/Skills.tsx` | scenery-11 写死路径改同一身份结果，保持 StackContinuityFrame 构图 |
| `apps/landing/src/components/personal-archive/ArchiveSignal.tsx` | 先在该卡确认可达性；若仍保留则只等价改 resolver，不趁机接回旧 R3F 场景 |

延后的资源仍是独立 Final Horizon，不能自动回退为足球图。未来替换必须对 src/crop/fit 做等价验收；延期不等于取消检查。本轮 B 不改 `content/index.ts` 的导出以强迫消费者接入，resolver 可读取现有内容入口且避免反向循环导出。

### NR-01C · 一个成功渲染后的 shadow 观察点

| 项目 | 限定内容 |
| --- | --- |
| 产品候选文件 | `apps/landing/src/components/personal-archive/archiveRuntime.ts`，只增加一个成功 draw 后的观察调用；新增同目录 `archiveStoryShadow.ts`，封装纯诊断、开关及有界内存记录 |
| 测试候选文件 | 新增 `apps/landing/tests/archiveStoryShadow.test.ts`；必要的接入行为复核放新增 `apps/landing/tests/e2e/archive-shadow.spec.ts`，是否执行浏览器由 C 卡明确授权 |
| 依赖 | A/B 均经 PM 接受，旧 runtime 仍为唯一场景 writer；单独 C READY |
| 接入位置 | 现有 `draw(shot,p,page,sourcePage)` 中 `composer.render()` 成功且 shaderFailure 检查通过之后。只此一处，不增加 rest/navigate/prepare/ready 分支里的诊断 hook |
| 观察范围 | 只记录实际呈现桥的 about-life/life-frame；显式非准备阶段、active 存活、page 非空才观察。预热调用 page=null 不采样；正文停驻/导航不覆盖，报告为 NOT_OBSERVED |
| 退出条件 | 默认关闭，可显式诊断启用；开/关时旧场景写入、ready/pending/failed 事件、资源准备和正文状态不改变；纯语义候选与可读实际节点分开记录；不要求 shadow 与旧隐式历史输出相等 |
| 回退 | 先关闭观察开关；必要时移除唯一调用与 import，再撤 C helper/测试。保留 A/B 未接管模块；不动 Director、桥接、材质或 ready |

**shadow 不干预旧流程的具体合同：**

1. helper 的模块初始化无副作用，默认 disabled；关闭时立即返回。不 fetch、不等待字体/图片、不触发资源 load，不额外解析 GLB、不创建 Mixer/renderer，不写 DOM/CSS/Three.js 状态，不产生声音。
2. 只读传入的有限 shot/p 值与旧 draw 后已有模型数据，复制必要字段。B 的绑定索引最多按该模型建立一次，只读访问；记录缓存有固定上限，不逐帧 console 输出、不增加 rAF/timer。启用时存在观察开销，不能宣称绝对零性能影响。
3. 诊断边界自行捕获 sample/inspect/readback 的错误，产出 diagnostic-error 或暂停诊断；错误不得冒泡到 runtime 外层 fail，不调用 events.failed/pending/ready，也不能改变 `renderReady`、resource 结果、Loader 或现有降级条件。该边界只包住诊断，不能吞掉本来就应失败的 renderer 错误。
4. 不把 B.inspect 的新发现变成现有 ready 前置条件，不等待它才能 mount/activate。schema/binding mismatch 在诊断记录中暴露，由 PM 决定是否影响 NR-02 派发；运行时不得自动选择新 owner。
5. 不查询 Director 私有 actions、不重采样/seek 真实节点。旧场景可读值与规范候选不同是诊断事实，不回写纠正。真实动作状态不可取时按 R1 的 unavailable 记录，不从 semantic amount 或静态表“生成”实际权重。
6. 同一处 hook 不能代表完整生命周期覆盖。C 对新纯内核/观测隔离负责；原合同要求的 rest、navigate、resumePrevious、预热、恢复及同帧完整接管，仍须 NR-02 单独获批后实现。

C 的未来用例包括：disabled 不观察；支持/不支持 shot 的筛选；prepare/page=null 排除；诊断抛错不影响宿主成功/既有失败；有界记录；readback unavailable；采样/检查不变更传入对象。接入复核另外观察旧 ready 事件顺序和 render 调用数，不能仅用 helper 单测宣称真实 runtime 完全等价。具体运行结果本轮全部 NOT_RUN。

## 接管与验收的修订衔接

- **A/B/C 无一张有场景接管权。** B/C 新检查失败只产生规划/诊断结果；即使诊断全部通过，runtime 也不能自动打开 sample owner。
- **NR-02 才从“观察”转为“执行”。** PM 在单独卡中批准 owner gate、SceneBinding.apply 和完整关键绑定的准备/降级行为，补足实际 Action 读回；不能把 C 的宽松诊断直接当作执行时允许缺绑定继续绘制的规则。
- R1 的基础验收改为比较语义预期；11 个精确动作的 time/weight、节点/材质状态继续在绑定层验收。更换 clip 命名对故事输出不产生影响，是接口边界的必要用例。
- 原合同全部照片几何、完整正文、反向/seek/布局/恢复、最终相机/DOM 配准要求保留；新增纯采样、静态绑定或 shadow 通过都不能替代真实 Three.js 状态或 tim 的动效验收。
- 所有回退只撤对应卡增量并尊重共享文件所有权；本轮只交付这份附录和修订摘要，不改原合同、产品、测试、资产或 PM 文件。
