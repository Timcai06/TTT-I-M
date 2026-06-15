# 06 · 路线图（执行入口）

> 上半部分：连续体执行清单（勾选当 todo）。
> 下半部分：已交付架构的冻结档（institutional knowledge，别丢）。

---

## 连续体执行清单

> 本期范围 **M0 / M1 / M2 / M3 / M4**。每步独立可上线、过全套门。
> 逐里程碑详情见 [`02-continuum-milestones.md`](./02-continuum-milestones.md)。

### M0 · 脊柱
- [x] 环境：`vite-plugin-glsl` + vendore `lygia` + GLSL `#include`；跑「依赖验证」清单（[03](./03-continuum-tooling.md)）
- [x] `simulation.ts` GPGPU ping-pong（position/velocity FBO）
- [x] shaders：sim-position / sim-velocity / render.vert·frag（#include lygia）
- [x] `continuumQuality.ts`：扩展 `getGLQualityProfile()` 加 continuum 4 档
- [x] `forms/registry.ts` + `forms/portrait.ts`（肖像采样从 ParticlePortrait 抽出）
- [x] `ParticleContinuum.tsx`：App 级 fixed canvas + reduced-motion/低端不挂载
- [x] 保留 Hero：Index 继续使用已确认的 ParticlePortrait 主体；Continuum 在 hero 阶段不显示红色星团
- [x] `landingScrollNarrative.ts`：全页单源叙事状态（activeId / progress fills / from→to blend / theme mix）
- [x] `useContinuumScroll.ts`（landing narrative → opacity/tint/behavior/morph）
- [x] 章节主题色：背景 `--bg` 随滚轮 scrub；Continuum tint 读取混合后的 `theme.cover` 并在帧循环中平滑 lerp
- [x] 右侧进度条：全站像素级填充，按真实章节 top/bottom 边界推进；修复多消费者覆盖测量 id
- [x] 守卫：debug 不进 prod + 着色器编译冒烟 + 进度/主题色契约（[05](./05-guards-and-budgets.md)）
- [x] 验收：Hero 主体零回退、后续章节星团符合主题色、进度条像素级丝滑、全套门绿

### M1 · About 解体 + 星尘 morph
- [x] `forms/disintegrate.ts`（刚度→0、湍流拉满）
- [x] 退役旧 TextParticles canvas；About 粒子叙事由 Continuum `disintegrate` 目标承接
- [x] `forms/stardust.ts`（Life/Frame 背景级密度）；Skills 不介入
- [x] morph 编排（hero→about→life→frame→skills），per-particle seed 错峰
- [x] 色温联动（About 暖纸 tint）
- [x] 守卫：形态 fallback 完备门
- [x] 验收：morph 平滑、文字可读、不抢照片、兜底零回归

### M2 · Work 数学曲面
- [x] `forms/mathSurface.ts` 行为参数 + `createMathSurfaceTargetTexture` 解析目标
- [x] Work 章节映射到低存在感数学曲面，不替代项目图片
- [x] 单测验证目标点有限、稳定、刷新不随机洗牌

### M3 · Contact 水面 + 终场
- [x] `forms/gerstner.ts` 水面行为参数 + `createGerstnerTargetTexture` 解析目标
- [x] Contact 章节映射到低透明水面形态
- [x] 亮底（米白）粒子可读性 + normal blend + Contact tint
- [x] 单测验证水面目标有限、稳定、刷新不随机洗牌
- [ ] 终场散点视觉脉冲（暂缓到后续打磨，不阻塞 M3 结构完成）

### M4 · 打磨硬化
- [x] stage/frameloop 运行门控：intro/transition/不可见阶段不推进 Continuum GPGPU
- [x] 逐章密度调音：About/Frame/Skills/Work/Contact 各自低存在感参数
- [x] 性能门扩展：Continuum 可见段 FPS-p95 顾问采样
- [x] GPU 预算守卫：shader 冒烟 / 纹理上限 / debug 不进 prod / context e2e
- [x] 降级三档 + 兜底路径沿用 shouldMountContinuum / reduced-motion / WebGL fail gates
- [ ] 转场搅动视觉脉冲（暂缓，因 M0 当前选择 transition 阶段暂停 Continuum）

### 节奏
M0-M4 当前结构已落地；后续只剩视觉打磨项（转场搅动脉冲、Hero/Continuum 无损合并候选）和真实 RUM 数据驱动的阈值收紧。

---

## 已交付架构（冻结）

> 上一阶段（landing → 内容平台多 zone 迁移 + 运行时 SSOT + 性能硬化）**已全部落地**。
> 此处冻结其决策与交付清单作 institutional knowledge；完整设计的历史版本在 git history。

### 运行时 SSOT（原 plan 01）
组合有 SSOT（`chapters/registry.ts`），运行时也补上了：`lib/stage.ts` 显式阶段状态机
（booting→intro→live→transitioning），收编了原先散落在 window 事件 / 模块标志 /
MutationObserver / Context / GSAP 全局的隐式状态。配套落地：`lib/scroll/requestRefresh`
（rAF 合并 ScrollTrigger.refresh）、`lib/webgl/{contextRegistry,useGLSurface,textureCache,quality}`
（GL 资源/预算/生命周期/设备分级）、`lib/resources/{manifest,loaders,preloadController}`
（分层预热，替代 sitePreload）、`lib/timelines/{heroParallax,transitionTimeline}`。
转场时 GL 自暂停（Hero/About frameloop 订阅 stage）。

### 性能硬化（原 plan 02 / 02.5）
单图失败非致命（修永久黑屏）、decode 风暴进 idle 队列、grain 滚动压力降级静态 PNG、
`.disable-hover` 去通配符（靠 pointer-events 继承）、footer 脉冲改合成友好、
chunk gzip 体积预算、`webgl/quality` 设备分级、`chapterScrollMetrics` 单布局快照源、
`imageDecodeQueue` 近屏 idle decode。

### 内容层（原 plan 04 → 现 [04](./04-content-layer.md)）
`packages/content` 端口-适配器：`PublishState` 6 态、`WithMeta` 泛型、
`createKeyedStaticRepository` 工厂；组件零 `data/*` 直连。

### 平台多 zone（原 plan 03）
npm workspaces：`apps/landing`（Vite）+ `apps/studio`（Next App Router）+
`packages/{tokens,content}`。studio 有 `/blog`（真 MDX：`next-mdx-remote/rsc`+`gray-matter`）、
`/work`、`/dashboard`、RSS、sitemap、OG image。`/_next/:path*` 跨 zone rewrite（root vercel.json
首项，platform-guards 锁顺序，cross-zone-smoke 运行时复验）。studio guard 禁 GSAP/R3F/three/Lenis。
canonical 域 `www.crt-dsg.com`。

### 守卫与门（原 plan 05 → 现 [05](./05-guards-and-budgets.md)）
8 个 build guard + 单测（node:test）+ e2e gates（degradation/chrome/hero/context 阻塞）+ 顾问全量
（INP / FPS-p95）+ cross-zone-smoke。重复章节跳转的 WebGL canvas/context 增长已由 `continuum-context.spec.ts` 守住；Hero 与 Continuum 暂时允许最多两个可见 WebGL surface，单 context 合并留到能无损保留 Hero 观感之后。

### 决策记录（冻结）
| 决策 | 选择 | 理由 |
|---|---|---|
| 渲染分叉 | 多 zone（方向 A） | landing 不动；内容平台用 Next 拿 SSR/SEO/后端 |
| 博客内容源 | MDX-in-repo（git 即 CMS） | 设计师开发者，MDX 又快又强，无需 DB |
| 内容访问 | repository + adapter | 切后端 = 换 adapter，UI 零改 |
| 整站预热 | 保留（只改失败语义 + 分层） | 连续影像作品集，零 pop-in 是有意产品体验 |

### 平台未来（LATER，连续体之后再议）
Auth + Postgres + api adapter → UGC 上传（运行时媒体管线）+ 发布状态机 → 审核队列/配额。
studio 视觉与 landing 气质对齐仍是产品侧最大可见差距（独立于连续体）。
