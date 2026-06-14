# 06 · 路线图（执行入口）

> 上半部分：连续体执行清单（勾选当 todo）。
> 下半部分：已交付架构的冻结档（institutional knowledge，别丢）。

---

## 连续体执行清单

> 本期范围 **M0 / M1 / M3 / M4**；M2 延后。每步独立可上线、过全套门。
> 逐里程碑详情见 [`02-continuum-milestones.md`](./02-continuum-milestones.md)。

### M0 · 脊柱
- [ ] 环境：`vite-plugin-glsl` + vendore `lygia` + GLSL `#include`；跑「依赖验证」清单（[03](./03-continuum-tooling.md)）
- [ ] `simulation.ts` GPGPU ping-pong（position/velocity FBO）
- [ ] shaders：sim-position / sim-velocity / render.vert·frag（#include lygia）
- [ ] `continuumQuality.ts`：扩展 `getGLQualityProfile()` 加 continuum 4 档
- [ ] `forms/registry.ts` + `forms/portrait.ts`（肖像采样从 ParticlePortrait 抽出）
- [ ] `ParticleContinuum.tsx`：App 级 fixed canvas + reduced-motion/低端不挂载
- [ ] 保留 Hero：Index 继续使用已确认的 ParticlePortrait 主体；Continuum 在 hero 阶段不显示红色星团
- [ ] `landingScrollNarrative.ts`：全页单源叙事状态（activeId / progress fills / from→to blend / theme mix）
- [ ] `useContinuumScroll.ts` 骨架（landing narrative → opacity/tint/behavior；morph 恒 0）
- [ ] 章节主题色：背景 `--bg` 随滚轮 scrub；Continuum tint 读取混合后的 `theme.cover` 并在帧循环中平滑 lerp
- [ ] 右侧进度条：全站像素级填充，按真实章节 top/bottom 边界推进；修复多消费者覆盖测量 id
- [ ] 守卫：debug 不进 prod + 着色器编译冒烟 + 进度/主题色契约（[05](./05-guards-and-budgets.md)）
- [ ] 验收：Hero 主体零回退、后续章节星团符合主题色、进度条像素级丝滑、全套门绿

### M1 · About 解体 + 吸收 TextParticles
- [ ] `forms/disintegrate.ts`（刚度→0、湍流拉满）
- [ ] 吸收 `lib/textParticles.ts` 采样 → 连续体目标；移除 TextParticles canvas
- [ ] `forms/stardust.ts`（Life/Frame 背景级密度）；Skills 不介入
- [ ] morph 编排（hero→about→life→frame→skills），per-particle seed 错峰
- [ ] 色温联动（About 暖纸 tint）
- [ ] 守卫：形态 fallback 完备门
- [ ] 验收：morph 平滑、文字可读、不抢照片、兜底零回归

### M2 · Work 数学曲面 —— **延后（插槽已留）**
- [ ] *（本期不做）* `lib/mathSurface.ts` 纯函数 + 单测
- [ ] *（本期不做）* Work 形态 + 六卡参数绑定

### M3 · Contact 水面 + 终场
- [ ] `lib/gerstner.ts` 波场纯函数 + 单测
- [ ] `forms/gerstner.ts` 水面形态（TS 公式与 GLSL 单一参数源）
- [ ] 终场散点（footer 揭开时退场，呼应 Hero 开场）
- [ ] 亮底（米白）粒子可读性 + normal blend + Contact tint
- [ ] 验收：水面自然、亮底可读、首尾呼应、兜底零回归

### M4 · 打磨硬化
- [ ] 转场搅动（订阅 stage transitioning）
- [ ] 逐章密度调音
- [ ] 全量性能门：FPS-p95 四形态 / INP / heap·context 回基线
- [ ] GPU 预算守卫：粒子数/纹理上限/单 context（并入 test:build + CI）
- [ ] 降级三档 + 兜底实机复核

### 节奏
M0 是唯一强前置；M1 与 M3 都只依赖 M0，可调换或并行；M4 收尾。

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
7 个 build guard + 单测（node:test）+ e2e gates（degradation 阻塞）+ 顾问全量
（INP / FPS-p95）+ cross-zone-smoke。**唯一积压项**：重复章节跳转的 WebGL context
泄漏门——**由连续体 M0 的「单 context 门」一并关掉**（连续体合一后常驻 context 恒 1）。

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
