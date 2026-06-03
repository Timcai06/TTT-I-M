# 性能优化与构建策略 (Performance & Build)

> [!NOTE]
> 本文档基于 `vite.config.ts`、`src/lib/lenis.ts` 及构建日志的真实源码逆向分析写成，是项目性能优化的真理基石。

## 1. 极致分包策略 (Chunk Splitting & Dependency Isolation)

现代前端由于引用的三方库体积庞大，首屏加载（LCP）经常受阻。我们在 `vite.config.ts` 中实现了手动分包机制，彻底隔离了业务代码与第三方引擎。

### 1.1 `manualChunks` 隔离规则
在 `vite.config.ts` 的 `build.rollupOptions.output` 中，我们制定了严格的分包：
```typescript
manualChunks(id) {
  // 1. React 核心框架 (React, ReactDOM, Scheduler) -> react-vendor
  if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/') || id.includes('/node_modules/scheduler/')) {
    return 'react-vendor'
  }
  // 2. GSAP 动画引擎 -> gsap-vendor
  if (id.includes('/node_modules/gsap/') || id.includes('/node_modules/@gsap/')) {
    return 'gsap-vendor'
  }
  // 3. WebGL 渲染引擎 (Three.js, React Three Fiber) -> three-vendor
  if (id.includes('/node_modules/three/') || id.includes('/node_modules/@react-three/')) {
    return 'three-vendor'
  }
}
```

### 1.2 商业价值与技术收益
- **强效缓存 (Long-term Caching)**：`three-vendor-[hash].js` 重达近 900KB，但因为它是纯第三方库，只要您不升级版本，用户浏览器就会永久缓存它。未来您无论怎么修改您的业务组件（如 `ParticlePortrait`），用户只需重新下载那 7KB 的业务代码，实现了**秒级二次加载**。
- **并行解析**：浏览器能并行获取不同的 Chunk，避免了主线程被单一的巨型 JS 文件阻塞。

## 2. 交互节流与降级 (Interaction Throttling & Degradation)

在大量的 3D 渲染和滚动视差下，DOM 的频繁重排/重绘（Reflow/Repaint）是性能杀手。

### 2.1 滚动悬停防抖 (Disable Hover Thrash)
**来源：`src/lib/lenis.ts`**
在用户快速滚动页面时，鼠标指针划过页面上的各种交互元素，会触发大量的 CSS `:hover` 计算，导致滚动卡顿。
```typescript
const onScroll = () => {
  const body = document.body
  // 滚动时，向 body 注入 .disable-hover 类
  if (!body.classList.contains('disable-hover')) {
    body.classList.add('disable-hover')
  }
  // 利用定时器防抖，滚动停止 150ms 后才恢复 hover 交互
  clearTimeout(hoverTimeout)
  hoverTimeout = window.setTimeout(() => {
    body.classList.remove('disable-hover')
  }, 150)
}
lenis.on('scroll', onScroll)
```
这段代码配合 CSS 中的 `pointer-events: none`，是保证 120Hz 高刷屏上滚动极致顺滑的核心秘诀。

### 2.2 自动无障碍降级 (Prefers-Reduced-Motion)
**来源：`src/lib/motion.ts`**
如果用户的操作系统或浏览器开启了“减弱动态效果”选项，项目会通过 `matchMedia('(prefers-reduced-motion: reduce)')` 自动捕获。
- **Lenis 的响应**：`smoothWheel: !reduced`。如果开启，立刻切断 Lenis 平滑滚动，交还给浏览器的原生硬滚动，避免触发用户的晕眩症（Vestibular trigger）。
- **ParticlePortrait 的响应**：如果开启，3D 粒子系统不会被挂载，直接展示降级的静态光影效果。
