# 01 · 连续体核心架构

> 一个持久的 GPGPU 粒子系统，App 级挂载，活在所有章节懒加载之外，
> 由滚动驱动在章节间变形。本文定义它的运行时形态、计算管线、形态注册表与模块边界。

---

## 设计意图（先读）

**一个滚动叙事底座，多种视觉消费方。** M0 先统一 landing 的滚动事实源：
同一批章节 rect 派生 activeId、右侧进度、背景色温与 Continuum tint。Hero 的原
ParticlePortrait 仍是 Index 身份主体；Continuum 先在后续章节作为氛围层浮现。

| 章节 | 形态 | 说明 | 里程碑 |
|---|---|---|---|
| Hero | **肖像** | 保留现有 ParticlePortrait 主体；Continuum 不抢 Index 视觉中心 | M0 |
| About | **解体成尘** | 肖像溃散为 curl-noise 流场，再聚成 manifesto 文字 | M1 |
| Life / Frame | **稀薄星尘** | 照片是主角，粒子退为近不可见的背景微尘（密度极低） | M1 |
| Skills | （不介入） | 红色蛇形线已是主角，粒子只路过 | M1 |
| Work | **数学曲面** | 低存在感参数曲面，衬托项目图像而不替代内容 | M2 |
| Contact | **水面** | Gerstner 水面低透明收束，米白 footer 使用 normal blend 保持可读 | M3 |

评委看到的不是「粒子 + 数学图 + 水」三个效果，而是「滚动坐标、章节色温与视觉层都在
同一条叙事线上变化」。连续性即叙事——这是做旗舰的全部理由。

---

## 1. 运行时形态：一个固定全屏 canvas

```
App
├─ <Loader/> <Cursor/> <Nav/> ...
├─ <ParticleContinuum/>        ← 新增：fixed 全屏，z-index 在内容之下、bg 之上
├─ <main> ...章节（懒加载）... </main>
└─ <div class="grain"/>
```

- 单一 R3F `<Canvas>`（或 vanilla three，见「§5 R3F vs 命令式」），`position: fixed; inset: 0`，
  永不随章节卸载——和 `.grain` 层同一种生命周期。
- 粒子**不随内容滚动**：canvas 固定，粒子在屏幕空间里按当前形态布局；滚动改变的是
  「现在是哪个形态、morph 到哪了」。这就是「同一个生命体在原地变形」。
- z-index：内容（z≥1）之上能看到粒子时用通透形态（星尘），需要粒子当主角时（Hero/
  Contact）粒子层在内容视觉重心区。具体分层在 M0 调。

**它暂不吞掉谁**：M0 保留 Hero 内部的 `<ParticlePortrait>` canvas，这是当前站点的
身份主体；Continuum 先作为 App 级氛围层服务后续章节。严格单 context 合并作为 M0b/M1
的候选前置，前提是能无损保留 Index 肖像观感。目标不是新增一层，而是先建立可迁移的
单滚动叙事底座。

---

## 2. 计算管线：WebGL2 GPGPU（ping-pong FBO）

现有 Hero 肖像粒子保留为独立身份主体；后续章节的 Continuum 需要几万粒子平滑 morph，
因此把位置积分搬上 GPU。采用经典 GPGPU：

### 数据

- 两张浮点纹理（RGBA16F，精度不够再升 32F），互为 ping-pong：
  - `positionTexture`：xyz = 位置，w = 每粒子 seed（用于 morph 延迟/抖动）
  - `velocityTexture`：xyz = 速度，w = 备用（每粒子参数）
- **一粒子 = 一 texel**。纹理边长 = ⌈√N⌉：256²≈65k（high）/ 192²≈37k（mid）/
  128²≈16k（mobile）/ 0（low → 兜底）。由 `getGLQualityProfile()` 决定（见 §4）。

### 每帧仿真（fragment shader）

```
读 当前 pos / vel
target = mix(formA.targetAt(uv), formB.targetAt(uv), uMorph)   // 形态混合
force  = (target - pos) * uStiffness            // 朝目标的弹簧力（per-form 刚度）
       + curlNoise(pos*uNoiseScale + uTime) * uTurbulence  // lygia curl 湍流
vel    = (vel + force * dt) * uDamping           // 半隐式欧拉 + 阻尼
pos   += vel * dt
写 新 pos / vel
```

- `uStiffness` / `uTurbulence` / `uDamping` 是 **per-form** 参数（肖像高刚度低湍流=清晰；
  解体刚度→0 湍流拉满=溃散；水面用解析目标+低湍流）。
- morph：相邻两形态的目标在 shader 里 `mix`，配 per-particle seed 做**延迟错峰**
  （`uMorph` 减去 `seed*spread` 再 clamp），让变形像液体而非整体平移。

### 目标的来源（targetAt）

不同形态用不同方式提供目标位置：

| 形态 | 目标来源 | 文件 |
|---|---|---|
| 肖像 | 启动时采样 `/portrait/tim.jpg`：按亮度阈值发射 N 个点，z 按亮度微位移保留景深 | `forms/portrait.ts`（采样 → 目标纹理） |
| 解体 | **无显式目标**：刚度→0，湍流主导，粒子自由漂移 | `forms/disintegrate.ts`（仅参数） |
| 星尘 | 稀疏随机分布 + 极缓流场，密度压到背景级 | `forms/stardust.ts` |
| 水面 | **程序化目标**：网格 + 多波叠加，生成确定性目标纹理 | `forms/gerstner.ts` + `forms/proceduralTargets.ts` |
| 数学曲面（M2） | **程序化目标**：倾斜参数带 + z 轴起伏，确定性采样 | `forms/mathSurface.ts` + `forms/proceduralTargets.ts` |

### 渲染（vertex + fragment）

- 点几何：N 个顶点，每个携带一个 `reference`（指向 position 纹理的 uv）。
- vertex shader：从 `positionTexture` 读位置 → 投影；尺寸按 quality + 景深。
- fragment shader：柔边圆 sprite；颜色 = per-form 调色板 × 章节色温 tint（uniform）；
  暗底章节（Hero）additive blend，亮底章节（Contact 米白）normal blend。

---

## 3. 形态状态机与滚动驱动

### 形态注册表 `forms/registry.ts`

每章注册一个 `FormDescriptor`：

```ts
interface FormDescriptor {
  id: string                       // 'portrait' | 'disintegrate' | 'stardust' | 'gerstner' | ...
  buildTarget?(ctx): TargetSource  // 生成目标纹理 / 解析目标标志（可选，解体无）
  params: { stiffness; turbulence; damping; density; size }  // per-form 行为
  palette(theme): Color            // 读章节色温 → tint
  blend: 'additive' | 'normal'
  fallback: string                 // 该章现有静态兜底的 DOM 标识（00 原则·不变量2）
}
```

章节 ↔ 形态映射沿用 `chapters/registry.ts` 的章节顺序（组合 SSOT 不动）。

### `useContinuumScroll.ts`

- **复用 `chapterScrollMetrics` + `landingScrollNarrative`**：`chapterScrollMetrics` 是唯一
  布局快照源，`landingScrollNarrative` 从同一批 rect 派生 activeId / progress fills /
  from→to blend / theme mix。
- M0 输出 `{ activeId, fromId, toId, blend, theme }`：右侧进度条、背景色温、
  Continuum tint 共用同一滚动事实；后续形态 morph 再挂到同一 blend 上。
- 写进 sim 的 uniform。章节间的过渡区（真实滚动像素段）就是 tint / opacity / morph 发生区。

### stage 订阅

- `stage === 'transitioning'`（液体波转场触发）时，Continuum 暂停推进，避免与 ChapterTransition 抢帧；
  转场搅动视觉脉冲保留为后续打磨项。
- reduced-motion：连续体根本不挂载（见 §4）。

### 颜色联动

- 读 `landingScrollNarrative.theme.cover` 的混合色 → 写 `uTint` uniform。整站色温叙事延伸进粒子空间。
  这是别的站没有的系统级细节（因为别人没有色温基建）。

---

## 4. 性能、预算与降级

### 设备分级（扩展现有 `webgl/quality.ts`）

`getGLQualityProfile()` 已返回 `{ portraitSegments, dprMax, ... }`。**扩展**它新增：

```ts
continuum: {
  particleTexSize: 256 | 192 | 128 | 0   // 0 = 不挂载，走兜底
  pointSize: number
  noiseOctaves: number                    // 湍流噪声层数随档缩
}
```

- high 256²≈65k / mid 192²≈37k / mobile 128²≈16k / low|reduced-motion|无 WebGL2 → 0。

### context 预算

- 连续体启动时 `contextRegistry.acquire()`，Hero 的 `ParticlePortrait` 继续独立保留。
- 当前预算是 Hero + Continuum ≤2；只有在能无损保留 Index 肖像观感时，再推进单 context 合并。
- 守卫：连续跳转 N 次后 canvas/context 数量不增长（见 05，关掉积压的泄漏门）。

### 降级阶梯（每个形态都必须有）

| 触发 | 行为 |
|---|---|
| `particleTexSize === 0`（低端/reduced-motion/无 WebGL2） | 连续体不挂载；各章显示**现有**静态兜底（Hero 幽灵照片、About 衬线正文、Contact 排版）——零新增兜底资产 |
| 运行时 FPS 跌破阈值 | quality 实时降档：减粒子数 + 降 DPR，形态不变（效果可逆） |
| GPGPU 初始化失败 | 静默 catch → 同「不挂载」路径，绝不白屏 |

**关键红利**：各章的静态兜底**今天就存在**（Hero ghost、About serif、Contact 排版），
连续体「降级而非删除」几乎零成本——这是把连续体做成 App 级背景层而非章节内组件的
直接好处。

---

## 5. R3F vs 命令式 / 模块边界

- 现栈是 R3F 9（React 19）。连续体用**一个 App 级 R3F `<Canvas>`** 承载，但 GPGPU
  仿真本身是**命令式**的（GPUComputationRenderer 风格的 ping-pong 在 `useFrame` 里推进）。
  React 只负责挂载/卸载与 props，不参与逐帧。
- 纯几何（Gerstner、数学曲面）抽成 TS 纯函数 + 单测，**不混进 React/three**——沿用
  Frame 范式（`lib/skillsFlowPath.ts`、`lib/waveFrontPath.ts` 是范本）。

### 目录

```
src/lib/continuum/
  ParticleContinuum.tsx     ← App 级 fixed canvas，挂载/卸载/quality 分级
  simulation.ts             ← GPGPU ping-pong（position/velocity FBO 推进）
  forms/
    registry.ts             ← FormDescriptor 注册表（章节 → 形态）
    portrait.ts             ← 肖像采样（从 ParticlePortrait 抽出）
    disintegrate.ts         ← 解体参数
    stardust.ts             ← 星尘参数
    gerstner.ts             ← 水面 form（行为参数 + fallback/blendMode）
    mathSurface.ts          ← Work 数学曲面 form（行为参数 + fallback/blendMode）
  landingScrollNarrative.ts ← rects → activeId / progressFills / from→to blend / theme
  useLandingScrollNarrative.ts ← chapterScrollMetrics → landing narrative hook
  useContinuumScroll.ts     ← landing narrative → Continuum tint / opacity / form state
  continuumQuality.ts       ← getGLQualityProfile 的 continuum 扩展
  shaders/
    sim-position.glsl       ← 位置积分（#include lygia curl/noise）
    sim-velocity.glsl       ← 速度积分
    render.vert / .frag     ← 点云渲染
src/lib/continuum/forms/proceduralTargets.ts ← disintegrate / stardust / mathSurface / gerstner 目标纹理
```

### 依赖方向（避免环）

```
chapters/registry.ts ───────────────────────┐
chapterScrollMetrics ─▶ landingScrollNarrative ─┬─▶ ChapterStateProvider / Nav
chapterThemeTokens.ts ───────────────────────┘  ├─▶ ScrollIndicator / ChapterThemeDriver
                                                └─▶ useContinuumScroll ─▶ ParticleContinuum ─▶ simulation
stage.ts ───────────────────────────────────────────────────────────────────────────────┘（订阅，单向）
webgl/{quality,contextRegistry} ◀── ParticleContinuum（复用，不反向依赖）
```

连续体是**叶子消费方**：读 stage / 滚动度量 / 色温 / quality，不被任何业务组件反向依赖。

---

## 6. 复用的既有基建（不重造轮子）

| 既有 | 连续体怎么用 |
|---|---|
| `lib/webgl/quality.ts`（`getGLQualityProfile`） | 扩展 `continuum` 字段，粒子数/DPR/噪声层随档缩 |
| `lib/webgl/contextRegistry.ts` | 连续体登记常驻 context；当前预算为 Hero + Continuum ≤2，守住跳转后不增长 |
| `lib/webgl/textureCache.ts`（引用计数） | 肖像源图、噪声纹理走共享缓存，避免重复上传 |
| `lib/webgl/useGLSurface.ts`（生命周期契约） | 连续体的 mount/pause/resume/dispose 继承此契约 |
| `lib/chapterScrollMetrics.ts`（单布局快照源） | morph 进度的唯一滚动来源，零新监听 |
| `lib/chapterThemeTokens.ts` + `lib/landingScrollNarrative.ts` | 粒子 tint / 页面背景的颜色来源 |
| `lib/stage.ts`（阶段状态机） | 转场搅动、reduced-motion 不挂载的判定来源 |
| 各章静态视觉（ghost/serif/排版） | 直接作为形态 fallback，零新增兜底资产 |

> 连续体不是推翻现有 webgl 层，而是它的**第一个一等公民消费者**——`useGLSurface` 当初
> 写的就是「让未来任何 R3F 场景继承生命周期契约」，连续体正是那个未来。
