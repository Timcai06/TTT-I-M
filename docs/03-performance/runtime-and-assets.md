# 运行时与资源策略 (Runtime & Assets)

> 本文档基于真实源码编写，聚焦近期的性能/架构决策：Hero 首屏 WebGL、About 延迟特效、Frame 响应式图资源、`Vercel` 缓存。  
> 目标是“为什么这么做 + 改动入口 + 验证命令”闭环。

## 1. Hero WebGL 为什么首屏预加载

### 1.1 为什么这么做
- `Hero` 是全站首屏入口，`ParticlePortrait` 是当前体量最大、也最耗资源的 WebGL 组件之一。  
- 先预加载 `/portrait/tim.jpg` 可以减少 `src` 纹理就绪前的空白窗口，并让 `hero__ghost` 能快速显示。  
- `three-vendor` 被拆分成独立 chunk 后，能被长期缓存，结合首屏预加载更适合高频回访场景。

### 1.2 改动入口
- `index.html`
  - 增加 `link rel="preload" as="image" href="/portrait/tim.jpg" fetchpriority="high"`（`/portrait/tim.jpg`）。
  - `Hero.tsx` 在首屏直接挂载 `ParticlePortrait`（条件是非 `prefers-reduced-motion`）。
  - `Hero.tsx` 中 `.hero__ghost` 作为占位与视觉衔接层，与 WebGL 渲染层叠加。
- `vite.config.ts`
  - `build.rollupOptions.output.manualChunks` 保持 `three-vendor` 独立分块，包含 `three` 与 `@react-three/*`。
- `tests/build/chunk-guards.mjs`
  - 自动校验：
    - `dist/index.html` 是否包含 `three-vendor`。
    - 首屏入口 chunk 里应包含 `ParticlePortrait`。

### 1.3 验证命令
- `npm run build`
- `npm run test:build:chunks`
- 关键路径快速核对：
  - `grep -n "preload\" as=\"image\" href=\"/portrait/tim.jpg\""` `index.html`
  - `rg -n "three-vendor|ParticlePortrait|TextParticles" tests/build/chunk-guards.mjs`

## 2. About `DeferredTextParticles` 为什么延迟

### 2.1 为什么这么做
- `TextParticles` 不在 About 首屏即时加载，避免首屏主线程早期被非关键动画抢占。  
- 只在可见时、并在空闲时机再启用，兼顾 `scroll` 体验与电量稳定性。  
- 也给 `reduce motion` 用户保留静态降级路径，避免无意义的交互开销。

### 2.2 改动入口
- `src/components/DeferredTextParticles.tsx`
  - `TextParticles` 使用 `React.lazy`。
  - 通过 `IntersectionObserver`（`rootMargin: '70% 0px'`）观察 fallback 节点。
  - 命中后通过 `scheduleIdle(..., 1500, 360)` 再设 `enabled=true`。
  - `reduced-motion` 时直接返回静态文案，不启动 WebGL 文本粒子分支。
  - `Suspense` + fallback 实现“静态文案先行、粒子后挂载”。
- `src/components/About.tsx`
  - `About` 段落中的 `Built by hand, frame by frame.` 使用 `DeferredTextParticles`。
- `tests/build/chunk-guards.mjs`
  - 约束 `TextParticles` 不允许进首屏入口 chunk，防止 `About` 资源提前打包。

### 2.3 验证命令
- `npm run build`
- `npm run test:build:chunks`
- `npm run build && rg -n "StaticTextParticles|scheduleIdle|DeferredTextParticles" src/components/DeferredTextParticles.tsx src/components/About.tsx`

## 3. Frame 响应式 `srcset` 与 manifest 的设计决策

### 3.1 为什么这么做
- Frame 采用横向簇列图片布局，内容较密，若只走单一大图源会显著抬高首个可见簇的下载代价。  
- 用 `srcset` + `sizes` 让浏览器按视窗选图，避免在移动端重复下载 desktop 级别资源。  
- 由构建脚本生成 manifest 可避免手写维护，减少误差和发散。

### 3.2 改动入口
- `scripts/setup-assets.mjs`
  - `FRAME_RESPONSIVE_WIDTHS = [720, 1080]`，用于输出 `-720.webp` / `-1080.webp`。
  - `encodeFrameResponsiveVariants()` 负责基于源图 `mtime` + 缓存签名生成变体并写盘。
  - `writeFrameImageSourcesManifest()` 扫描 `public/frame/{buildings,cuisine,scenery}`，生成 `src/data/frameImageSources.generated.ts`（键为原图路径，值按宽度列表排序）。
  - 对 `frame/buildings`, `frame/cuisine`, `frame/scenery` 都执行 WebP 编码并保留主图与变体。
- `src/data/frames.ts`
  - `FRAME_IMAGE_SIZES = '(max-width: 768px) calc(100vw - 32px), (max-width: 1200px) 72vw, 640px'`。
  - `frameSrcSet()` 从 `frameImageSources` 读取变体拼成 `srcSet`。
  - `ArchiveImage` 统一接收 `src` / `srcSet` / `sizes`。
- `src/components/Frame.tsx`
  - `ArchiveImageSlot` 渲染 `<img src, srcSet, sizes, loading, decoding, fetchPriority>`。
  - 首个簇图优先 `loading="eager" / fetchPriority="high"`，其余图默认 `lazy/low`。
  - `warmClusterImages()` 用 `Image` 对象预热临近簇图，降低滑动阶段抖动。

### 3.3 验证命令
- `npm run setup`
- `npm run build`
- `rg -n "frameImageSources|srcSet|FRAME_IMAGE_SIZES" src/data/frames.ts src/components/Frame.tsx src/data/frameImageSources.generated.ts`
- `ls -1 public/frame/buildings/*-720.webp public/frame/cuisine/*-720.webp public/frame/scenery/*-720.webp`

## 4. `setup-assets.mjs` 在本次决策中的角色

### 4.1 为什么这么做
- 将图像资源处理集中在可复现脚本中，`npm run dev/build` 前自动运行，避免开发者手工处理失配。  
- 统一覆盖 portrait、life、Frame 建筑/美食/风景三类图源，避免多入口重复逻辑。

### 4.2 改动入口
- `scripts/setup-assets.mjs`
  - `predev`/`prebuild` 通过 `package.json` 触发自动执行。
  - 通过 `node_modules/.cache/setup-assets-*.json` 做幂等增量与签名控制，减少无意义重编码。
  - 负责输出：
    - `public/portrait/tim.jpg`
    - `public/life/*.webp`
    - `public/frame/buildings/*.webp`, `public/frame/cuisine/*.webp`, `public/frame/scenery/*.webp`
    - `src/data/frameImageSources.generated.ts`
- `package.json`
  - `predev` / `prebuild` / `setup` 三条脚本路径统一指向 `node scripts/setup-assets.mjs`。

### 4.3 验证命令
- `cat package.json | rg -n "\"predev\"|\"prebuild\"|\"setup\""`
- `npm run setup`
- `test -f src/data/frameImageSources.generated.ts`
- `test -f public/portrait/tim.jpg`

## 5. `vite image optimizer` 与 `public/frame` 排除策略

### 5.1 为什么这么做
- `public/frame` 的图由 `setup-assets.mjs` 已经按项目目标质量与尺寸生成，并作为 `srcset` 清单消费。  
- 若又经过 `vite-plugin-image-optimizer` 二次压缩，可能造成不一致签名与额外开销，不利于可控构建。

### 5.2 改动入口
- `vite.config.ts`
  - `ViteImageOptimizer` 的 `exclude: /public\/frame\//` 显式跳过 `public/frame` 下图片优化链路。
  - 其他公开目录通过 `includePublic: true` 仍保留优化策略。

### 5.3 验证命令
- `rg -n "exclude: /public\\/frame\\//|includePublic" vite.config.ts`

## 6. Vercel 缓存策略

### 6.1 为什么这么做
- `frame/life/projects/portrait` 属于高频读取、变化较慢的静态目录。  
- 采用一周强缓存 + 长时 `stale-while-revalidate` 平衡“首屏命中率”与“内容更新可恢复性”。

### 6.2 改动入口
- `vercel.json`
  - `headers` 对 `/(frame|life|projects|portrait)/(.*)` 设置：
    - `Cache-Control: public, max-age=604800, stale-while-revalidate=31536000`

### 6.3 验证命令
- `cat vercel.json`
- `rg -n "\"source\": \"/\\(frame\\|life\\|projects\\|portrait\\)/\\(\\.\\*\\)\"|Cache-Control" vercel.json`

## 7. `tests/build/chunk-guards.mjs` 的作用边界

### 7.1 为什么这么做
- 这是当前版本的资源策略总阀门：约束「哪部分必须同步」、「哪部分必须延迟」。  
- 一旦被误改，首屏策略会失守而不必通过手工检查页面源码。

### 7.2 改动入口
- `tests/build/chunk-guards.mjs`
  - 校验 `three-vendor` 在 `dist/index.html` 里可见（首屏 WebGL 预加载入口生效）。  
  - 校验 `index-*.js` 含 `ParticlePortrait`，确保 Hero 的 WebGL 入口未延后。  
  - 校验 `TextParticles` 不应出现在首屏入口，并不应在 `index.html` 中提前露出（About 为延迟路径）。

### 7.3 验证命令
- `npm run test:build:chunks`

