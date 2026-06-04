# 01 · 运行时架构升级

> **核心诊断**：组合有 SSOT（`src/chapters/registry.ts`），运行时没有。
> 运行时状态散落在 5 套互不知情的机制里：
> window 事件（`intro.ts` / `chapterTransition.ts`）、模块标志（`introExited` /
> `introExitedOnce` / `busyRef`）、MutationObserver（`chaptersReady.ts`）、
> React Context（`chapterState.ts`）、GSAP/ScrollTrigger 全局 + Lenis 单例。
> 它们其实在描述同一个隐式状态机，却没有任何一处把它写出来。

目标：新增 5 个 lib 边界，把运行时收敛成显式、可订阅、可降级的分层。

---

## 1. `src/lib/stage.ts` —— 运行时阶段状态机（最高杠杆，第一步）

### 状态机

```
booting ──(preload.ready && introReady)──▶ intro
intro ──(loader 退场完成)──▶ live
live ──(章节跳转请求)──▶ transitioning
transitioning ──(转场 timeline 结束)──▶ live
```

未来加跨路由后扩展一个 `navigating`（见 03）。

### 设计

- 外部 store（`getStage()` / `setStage()` / `subscribe()`），配 `useStage()` 钩子，
  基于 `useSyncExternalStore`（符合 react-hooks v7 纯度规则，不在 render 读 window）。
- 单一可信来源：**任何地方都能问「现在是哪个阶段」**。

### 取代（删除重复实现）

| 现状 | 改为 |
|---|---|
| `intro.ts` 的 `introExited` 标志 + `INTRO_EXIT_EVENT` + 2200ms 兜底 | `stage` 的一次转移；兜底变状态机显式超时转移 |
| `ParticlePortrait.tsx:604` 的 `introExitedOnce` | 读 `getStage()`，删本地副本 |
| `ChapterTransition.tsx` 的 `busyRef` | `stage === 'transitioning'` |
| `App.tsx:28` 三路 refresh 下注（INTRO_EXIT/load/timeout） | 订阅 `stage→live` 时 refresh 一次 |

### 解锁的新能力（关键）

- **转场时所有 WebGL 自暂停**：Hero/About 的 `frameloop` 改为
  `visible && stage !== 'transitioning' ? 'always' : 'never'`，
  转场那一帧从「三 context 并发」降到「只有转场场在跑」。免费帧率。
- **Lenis stop/start 归位**：从 ChapterTransition 内联挪到 stage 订阅副作用。

### 验收

- `grep introExited|introExitedOnce|busyRef` 只剩 stage 内部。
- 章节跳转时，DevTools Performance 录制确认 Hero/About 的 rAF 在 transitioning 期间停止。
- 现有 e2e（`tests/e2e/frame.spec.ts`）全绿。

---

## 2. `src/lib/scroll/` —— 滚动协调层

### `requestRefresh()`

- rAF 合并窗口（≤200ms）内的所有 `ScrollTrigger.refresh()` 请求成一次。
- 收编现有调用点：[`App.tsx`](../src/App.tsx)、[`lib/lenis.ts`](../src/lib/lenis.ts)、
  [`components/ChapterTransition.tsx`](../src/components/ChapterTransition.tsx)、
  [`components/TextParticles.tsx`](../src/components/TextParticles.tsx)。
- **保留立即旁路**：`stage→live`、字体就绪这种确定点允许越过去抖直接 refresh
  （否则会重蹈 ScrollIndicator/life pin 错位的坑）。

### 可选

- ScrollTrigger 按 chapterId 打标，未来批量暂停某章 scrub 有抓手。

### 验收

- 章节跳转 + intro 退场时，`ScrollTrigger.refresh` 调用次数显著下降（埋点计数）。
- ScrollIndicator 填充比例正确（回归 `tests/activeChapter.test.ts` 思路）。

---

## 3. `src/lib/webgl/` —— GL 资源与预算层（为未来 3D/GLTF 留接口）

### `textureCache.ts`

- 引用计数的共享纹理加载器，KTX2-ready。
- **顺带修双重上传**：`sitePreload.ts:222` 的 `loadHeroTexture` 加载后立即
  `dispose()`（只暖 HTTP 缓存），ParticlePortrait 又自己加载上传一遍。
  共享缓存让 GPU 上传只发生一次。

### `contextRegistry.ts`

- 登记/注销活跃 WebGL context，暴露 `canAcquire()` 与「预算紧张」信号。
- ChapterTransition 的 `TransitionField` 借不到时退化为 CSS 粒子 / clip-path。

### `useGLSurface.ts`

- 把 [`ParticlePortrait.tsx`](../src/components/ParticlePortrait.tsx) 手写的
  `mount / unmount / pause / resume / dispose` 生命周期
  （双 IntersectionObserver + 滞回 + frameloop 切换）抽成契约。
- TextParticles 和**未来任何 R3F 场景**直接继承，不再各写一遍。
- 这就是「让聪明地加载/暂停/恢复/销毁成为可枚举契约」。

### 验收

- 连续跳转 10 次章节后，活跃 context 数回到基线（防泄漏，见 05）。
- 新增一个示例 GL 章节时，只需实现 `useGLSurface` 契约即可获得完整生命周期。

---

## 4. `src/lib/resources/` —— 分层预热（保整站预热意图）

把 363 行的 `sitePreload.ts` 拆成 4 个职责单一的文件：

- `manifest.ts` —— 声明式资源表，每条 `{ id, type, url(s), tier }`：
  - `type`: `image | font | texture | chunk | gltf | ktx2`（可扩展）
  - `tier`: `critical | nearFold | deferred`
- `loaders.ts` —— 按 type 分发加载器，KTX2/Draco/Meshopt 在此接入。
- `preloadController.ts` ——
  - `critical` 门控 intro；
  - intro 退场后**立即全速后台拉满 `deferred`**（不是懒加载，保零 pop-in）；
  - **失败非致命**（超时 + 计入完成 + 日志），杜绝单图永久黑屏；
  - 真实 `completed/total` 继续喂 [`Loader.tsx`](../src/components/Loader.tsx) 进度条。
- 调试 instrumentation（现 `__portfolioPreloadDebug`）作为独立关注点保留。

### 验收

- 故意让一张 frame 图 404，loader 仍正常退场（见 05 守卫）。
- manifest 中 frame/projects 图均为 `deferred`，hero 纹理/字体/Pretext/about manifesto
  为 `critical`。

---

## 5. `src/lib/motion/` —— timeline 工厂 + 动效 token

- **动效 token**：duration / ease 命名常量，与 CSS `--ease-out` 对齐，消灭散落魔法数字。
- **timeline 工厂**：
  - `createTransitionTimeline({ root, refs, target })` ← 抽 `ChapterTransition.tsx:365-418`
  - `createHeroParallax(refs)` ← 抽 `App.tsx:54`
- **修耦合泄漏**：`App.tsx:55` 直接 query `.hero__split .split-line__inner`——App 不该
  知道 Hero 内部 DOM。这条 tween 搬回 Hero。

### ChapterTransition 职责拆分

现在一个组件管「监听→播动画→停 Lenis→落位→refresh→通知→队列」。拆成：
- `useTransitionConductor`（状态机 + 队列，读 stage）
- `createTransitionTimeline`（纯动画）
- 落位/同步交给 scroll 层 + stage 副作用

### 验收

- App 不再出现任何 `.hero__` 选择器。
- 转场录屏与重构前逐帧一致（视觉零回归）。

---

## 模块依赖方向（避免环）

```
registry.ts ─┐
             ├─▶ stage.ts ◀─ 所有组件订阅
resources/ ──┘        │
                      ▼
            scroll/  webgl/  motion/   ← 读 stage，互不依赖
```

stage 是叶子被依赖方，不反向依赖任何业务组件。
