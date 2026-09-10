# NR-02A · 唯一动画执行模块与真实确定性读回

版本 1，**READY**；DEV `01a08484-5199-7c22-b54e-38778cd5ed1d`，`gpt-5.6-sol` high。依赖 NR-01A/B/C 均 ACCEPTED。PM 依据原合同批准 NR-02 最多分为 A（本卡）→ B（完整样段接管），不再分出准备链。

## 结果与边界

将旧 Director 内部唯一 mixer/actions 提取为一个有明确所有权的动画执行模块；生产默认继续由 legacy 驱动。新增执行模块能够在真实当前模型上按 A SemanticWorld 绝对采样 11 个动作，提供实际 action/node 读回并证明乱序、往返及旧状态污染后的同点一致。**本卡只在测试中切换 sample 所有权，不在页面启用 sample，不改变镜头、内容或转场。** NR-02B 才接管全部样段 writer、相机与 DOM。

这不是新增第二个 mixer：runtime 为该模型创建唯一 rig 并传给 Director；Director 不再自行创建 mixer/actions。legacy 的当前 clip 选择、区间、remember/withSession、camera 与 page 写入语义保持等价，不提前迁移 D1 到生产。

## 基线与独占文件

同目录 `/Users/tim/DEV/TTT I'M/portfolio`，`feat/narrative-kernel`，HEAD `55c08029051b11e9687d869747907e20291940fa`。初始指纹 `output/pm/NR-01C-R1/pm-accepted-files.json`；开工保存白名单现状/原文，尊重其他任务改动。

- 新增 `apps/landing/src/components/personal-archive/archiveAnimationRig.ts`：唯一真实 mixer/actions，legacy 采样入口、受控 sample 执行、所有权令牌、读回、释放。
- 修改同目录 `archiveDirector.ts`：注入 rig，将原动作 seek/update 委托给它；保留所有相机/页面/历史规则，Director 不拥有第二组 actions。
- 修改同目录 `archiveRuntime.ts`：只做唯一 rig 构造、注入与清理，保留 C hook；不启用 sample gate、不改导航/rest/ready。
- 修改同目录 `sceneBindings.ts`：仅必要的共享静态描述/采样区间辅助导出，既有 inspect/mapping 语义不放宽。
- 修改同目录 `archiveStoryShadow.ts`：仅允许将原静态描述逻辑移到绑定层并复用/兼容导出，避免执行模块反向依赖诊断模块；其他隔离与行为不变。若无需移动则不改。
- 新增 `apps/landing/tests/archiveAnimationRig.test.ts`：真实模型动作和所有权测试。测试专用辅助代码放本测试或 `output/pm/NR-02A/`，不改共享 loader/config。
- 新报告 `docs/pm/reports/NR-02A-delivery.md`，证据 `output/pm/NR-02A/`。

其他 A/B/C 文件及既有测试只读。你不是唯一执行者，ARCH 只读研究 NR-02B，PM 改文档；不要回退他们修改。不改样式/素材/Blender/章节组件/路由/配置/依赖，不提交推送、不建 worktree 或新分支。

## 实现合同

1. 采用一个明确 owner（legacy/sample）与代次令牌控制所有 rig 写入。换 owner 后旧令牌不能继续 seek/update；dispose 后所有旧令牌失效，不能再写真实节点。无异步播放与额外循环。runtime 本卡固定持有 legacy 令牌。
2. sample 仅接收 A 的 SemanticWorld，通过 B 的 11 条声明绑定生成所有区间时间；不从访问历史推导、不将 clip 名带回 A。每次写全 11 个动作，明确 reset/play/LoopOnce/clamp/paused/timeScale/weight 的调用顺序，以实际 getEffectiveWeight/getEffectiveTimeScale 与节点结果验证，不能照抄配置当读回。不能有两套 active mixer。
3. 在任何 sample 写入前验证静态描述、11 精确 clip/target/property、有效区间和真实 action 可用性；缺失或未知明确返回不可执行结果/异常，不得部分执行并报告成功。此严格检查只约束 sample 能力，本卡不因它改变 legacy 现有 ready/降级行为。
4. 旧 legacy API 仅委托现有动画求值，不悄悄调用 canonical 世界或重置其它控制域。归还 legacy 时应明确动作配置/权重重置规则，随后由旧 Director 的完整 pose 重新写入；不让 sample 遗留 paused/disabled/权重影响旧输出。
5. 读回为真实 action 的 time、weight/effectiveWeight、enabled、paused、timeScale/effectiveTimeScale、loop/clamp，加受动画控制节点 local TRS/matrixWorld 的不可变数值副本。测试可污染 action 与节点后重采样，必须恢复规范输出。
6. 本卡 sample 对象范围为动画控制的变换。照片代理互斥、monitor visibility、最终相机和 DOM 属于 NR-02B 的完整应用，不要把本卡读回通过冒充完整世界已接管。保留真实非均匀 scale 与父子层级。

## 验收与检查

- AC-1：生产该模型仅一个 mixer；Director 由 rig 委托且默认 legacy；源码范围与既有 C 正常/故障烟测确认未改变现有成功/失败行为。
- AC-2：用实际 GLB 的层级、TRS、动画数据创建真实 Three AnimationMixer/AnimationAction；新加载后直达 T，与多个 A 端点/中点、乱序、往返及 legacy 污染后回到同 T 的真实读回一致。不能仅造几条手写模拟 clip。Node 无图片解码时可在测试内省略材质/纹理加载，但必须保留真实几何层级与原二进制动画数据，并明确该测试不证明材质/视觉。
- AC-3：静态缺失/未知不能触发部分 sample 写入；旧 owner 令牌、dispose 后令牌不能写；sample→legacy 重新应用后行为正确。实际 Action 有效权重/时间可用，不再 unavailable。
- AC-4：容差先固定为 node position 1e-5m、scale 1e-6、quaternion 角差 1e-5rad（q/-q 等价）、action.time 1e-6s、有效权重 1e-6、矩阵元素 abs/rel 1e-6；BOOL、owner/clip/node ID 精确比较。失败先诊断，不自动放宽。

执行新增 rig 测试、A/B/C 五份目标回归、Landing 完整 tsc-b、实际修改 TS 的限域 ESLint、diff check，以及既有 archive-shadow.spec.ts 三项真实浏览器回归（原配置会构建与临时预览）。使用空闲非5173端口，不停止 tim 正在看的开发服务；完成后只清理本任务进程。不要修改既有测试断言以迁就回归。

交回结构化结果、单 mixer/接口说明、实际读回、范围指纹和未验证项；同时为 NR-02B 列明消费 rig 的最小接口。完成后停止等待 PM，不能自行开始样段运行接管。

## PM 接口兼容补充（2026-09-09）

批准额外修改 `apps/landing/src/lab/personal-space/archiveClearance.ts`：该现存调用方须创建一个 rig、申请 legacy token 并注入 Director，使用 try/finally 释放，保持原诊断算法与结果不变。Director 注入参数设为必需，不以可选参数加运行时抛错掩盖未迁移调用方。搜索全部调用点确认已迁移；对新增调用点执行限域 lint 和完整类型检查。此为本卡必要接口兼容修复，不授权其他 lab 变更或第二 mixer。
