# NR-02A · DEV 交付报告

日期：2026-09-09  
分支：`feat/narrative-kernel`  
基线 HEAD：`55c08029051b11e9687d869747907e20291940fa`

## 结果

已将 Personal Archive 模型的唯一 `AnimationMixer` 和 legacy actions 从 Director 提取到 `archiveAnimationRig.ts`。生产 runtime 只创建一个 rig、领取一个 `legacy` owner token 并注入 Director；Director 只保留旧 pose/session/camera/page 规则，把动画 seek 和求值委托给 rig。Director 的 rig/token 参数为类型必需。PM 兼容补充授权的 camera-clearance lab caller 也创建自己的单一 rig、注入 legacy token 并在 `finally` 释放。生产没有领取 `sample` owner，没有调用 A canonical story，也没有提前启用 NR-02B gate。

rig 的所有写入口由对象身份和 generation 共同表示的 owner token 约束。每次 `claim('legacy' | 'sample')` 都使旧 token 失效；dispose 使全部 token 失效并释放 mixer/action 绑定。归还 legacy 时，全部旧前缀 action 重新规范为 enabled、`LoopOnce`、clamp、weight 1、timeScale 1、playing/paused，随后仍由 Director 的完整 pose 写入当前状态。

sample 每次先重新执行 B 的静态描述和 11 条声明检查，再核对每个真实 clip/action/node/区间以及 A 的六个数值均为有限 `[0,1]`。任一缺失、未知或无效均返回 `unavailable + issues`，且在 action/node 写入前结束。通过后才对 11 个声明 action 做绝对采样；未被 B 声明但仍匹配 legacy 前缀的 action 在 sample 期间 disabled，归还 legacy 后恢复，避免额外 writer 混入同一属性。

## Action 求值与真实读回

每条 sample action 的实际顺序是：停用旧绑定 → reset → play → enabled → `LoopOnce` → clamp → 暂时 unpaused → `setEffectiveTimeScale(1)` → `setEffectiveWeight(1)` → 写绝对 time；全部 action 就绪后以唯一 mixer 求值一次，再设 `paused=true` 并再次调用公开 `setEffectiveTimeScale(1)` 同步 Three.js 的有效时间倍率缓存，最后更新 `matrixWorld` 并读取真实状态。

先停用旧绑定不是配置装饰：真实测试直接把受控节点污染为任意 TRS 后，若只改 action.time，Three 的已有 PropertyMixer 绑定不会可靠地重写节点；重新挂载后，新加载直达 T、legacy 污染、节点污染、乱序、反向和重复回到 T 才得到同一结果。

固定样本 `notebook=.25, envelope=.5, photo=.75, wallPrints=.4, drawer=.6, folder=.2` 的 11 项实际 action 读回如下。所有 action 均为 `weight=1`、`effectiveWeight=1`、`enabled=true`、`paused=true`、`timeScale=1`、`effectiveTimeScale=0`、`loop=2200 (LoopOnce)`、`clamp=true`：

| binding | clip → node.property | 实际 time (s) |
|---|---|---:|
| notebook-open | `NotebookOpen → NotebookHinge.rotation` | 0.2083333283662796 |
| life-envelope-open | `LifeEnvelopeOpen → LifeEnvelopeHinge.rotation` | 0.4166666567325592 |
| life-photo-extract | `LifePhotoExtract → LifeMemoryPhoto.translation` | 0.6249999850988388 |
| frame-print-settle-04 | `FramePrintSettle_04 → FramePrintPivot.rotation` | 0.9333333015441895 |
| frame-print-settle-01 | `FramePrintSettle_01 → FramePrintPivot_01.rotation` | 0.9333333015441895 |
| frame-print-settle-02 | `FramePrintSettle_02 → FramePrintPivot_02.rotation` | 0.9333333015441895 |
| frame-print-settle-03 | `FramePrintSettle_03 → FramePrintPivot_03.rotation` | 0.9333333015441895 |
| work-drawer-open | `WorkDrawerOpen → WorkDrawerRoot.translation` | 1.84 |
| cinema-rail-left | `CinemaRailTravel_Left → Cinema_RailMiddle_Left.translation` | 1.84 |
| cinema-rail-right | `CinemaRailTravel_Right → Cinema_RailMiddle_Right.translation` | 1.84 |
| work-folder-lift | `WorkFolderLift → WorkFolderPivot.translation` | 2.7066666666666666 |

读回不是配置副本：每项从真实 action 读取 raw/effective weight、raw/effective timeScale、flags/loop/clamp，并复制目标节点 local position/quaternion/scale 和 16 项 `matrixWorld` 后逐层冻结。例如真实 `LifeMemoryPhoto` 在该样本的 local position 为 `[-1.1900000572, 1.2394327792, -0.9403450827]`，保留其非均匀 scale `[1, 1, 0.5625]`；`WorkFolderPivot` local position 为 `[0, 0.0358436040, 0.2275061388]`，其 world translation 为 `[0.9549999833, 0.4658436111, -0.3679606818]`，证明父子层级参与矩阵结果。

比较严格使用卡片固定容差：position `1e-5m`、scale `1e-6`、quaternion 角差 `1e-5rad` 且 q/-q 等价、action.time `1e-6s`、effectiveWeight `1e-6`、matrix 元素 abs/rel `1e-6`；布尔、owner、clip、node ID 精确比较，未放宽。

## 真实模型测试边界

测试直接读取当前 `personal-space.glb`，解析实际 GLB JSON/BIN chunk，恢复真实 node parent/child 层级和 authored TRS，并从原 FLOAT accessor/stride 建立 11 个真实 `AnimationClip`/keyframe track 交给 Three `AnimationMixer`/`AnimationAction`。测试只跳过 mesh payload、材质和纹理解码，因此证明动画数据、节点层级与执行确定性，不证明材质、像素或最终视觉。

新增 rig 测试共 6 项：

- 11 个真实 action、区间、最终 action flags 和节点不可变读回；
- 新加载直达、多个端点/中点、乱序、反向、legacy 与节点污染后的同 T 一致；
- 合成额外 legacy-prefix clip 在 sample 时被隔离、归还 legacy 后重新参与；
- 缺 clip 与 selected clip 未知 property 在任何部分写入前返回 unavailable；
- stale/disposed token 拒绝写入，sample → legacy 与 fresh legacy 一致；
- runtime/Director/rig 之间只有一个 mixer，既有 C post-render/failure 顺序保持。
- production runtime 与 camera-clearance lab 两个现存 Director caller 均显式注入各自上下文的唯一 rig/token，调用点搜索无遗漏。

## 自动检查

- 新 rig + A/B/C 五份目标回归：34/34 通过，退出 0。
- Landing `npx tsc -b --pretty false`：通过，退出 0。
- 实际修改 TS（含 PM 追加授权的 camera-clearance caller）的限域 ESLint：通过，退出 0，无问题。
- `git diff --check`：通过，退出 0。
- 空闲端口 4295、系统 Google Chrome、既有 `archive-shadow.spec.ts`：3/3 通过，退出 0，33.7 秒；enabled/disabled 都是 588 次 WebGL draw，page error 均为 0，真实 renderer failure 仍先走旧 bridge failure 路径。
- 浏览器检查结束后 4295 无监听；未连接、停止或重启 5173。

完整摘要见 `output/pm/NR-02A/checks.txt`，前后与保护文件指纹见 `output/pm/NR-02A/baseline-manifest.txt`、`output/pm/NR-02A/final-hashes.txt`。

## NR-02B 最小消费接口

NR-02B 不需要新 rig 或重命名。最小接入顺序为：复用 runtime 的唯一 rig → 在完整 sample gate 获得写入权后 `claim('sample')` → 把 A `sampleStory` 返回的 `SemanticWorld` 传给 `sample(token, world)` → 只有 `applied` 才把 action/node readback 纳入完整样段结果 → 同一 gate 再接管照片代理、monitor、相机与 DOM → 退出 sample 时 `claim('legacy')`，并让旧 Director 的完整 pose 重新应用。旧 sample token 在归还后不得复用。

`ArchiveAnimationRig` 对 B 的必要表面是 `claim`、`sample`、`readback`；legacy 侧继续用 `actionNames`、`seekLegacy`、`evaluateLegacy`。`sample` 的 action/node 读回只覆盖动画变换，不代表 camera/DOM/presentation 已接管，也不得替代 NR-02B 的同一帧完整世界验证。

## 范围、接口确认与未验证项

四个既有授权源文件的前指纹已在开工时保存；其余 11 个已验收 A/B/C 文件（含既有 C 三项浏览器测试）与 PM accepted manifest 完全一致。没有修改样式、素材、Blender、章节组件、路由、配置或依赖；没有提交、推送、建分支/worktree，也没有进入 NR-02B。

PM 在本卡末尾追加授权后，已迁移 `src/lab/personal-space/archiveClearance.ts`：该 caller 显式创建一个 rig、领取 legacy token、用四参数构造 Director，并在 `finally` 依次释放 Director 与 rig；原 tracks、101 点采样、raycast 和结果判定算法未改。全仓搜索确认生产 runtime 和该 lab 是仅有两个 caller，均已迁移；完整 tsc、34 项目标测试、包含 lab 的限域 lint 与最终 diff check 在兼容补丁后重新通过。生产逻辑未在该补丁后改变，按 PM 指示没有重复此前已通过的 C 3 项浏览器检查。

未执行 camera-clearance 的完整几何扫描，也未验证生产 sample gate、照片代理互斥、monitor visibility、最终相机/DOM、材质/纹理、人工逐帧视觉、全站 E2E、性能、Studio 或部署；这些不属于 NR-02A。
