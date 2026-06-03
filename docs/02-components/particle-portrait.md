# WebGL 粒子肖像系统 (Particle Portrait)

> [!NOTE]
> 本文档基于 `src/components/ParticlePortrait.tsx` 真实源码编写。这是整个网站性能开销最大，但也最具视觉冲击力的核心组件。

## 1. GLSL 着色器机制 (Shader Architecture)

粒子的渲染完全脱离了 React DOM 树，由底层的 WebGL Shader 直接驱动。

### 1.1 顶点着色器 (Vertex Shader)
- **亮度置换 (Luminance Displacement)**：着色器通过采样传入的照片纹理（`texture2D(uTexture, uv)`）计算每一个像素点的灰度亮度（`lum`）。亮度越高的区域，粒子在 Z 轴被推起得越高，形成了 3D 浮雕效果。
- **边缘发光 (Edge Detection)**：通过采样上下左右邻近像素的亮度差（`abs(lum - lumX) + abs(lum - lumY)`），计算出轮廓边缘（`edge`）。
- **Simplex 噪声流体**：利用 `snoise` 算法，粒子不仅根据亮度排列，还会随着时间 `uTime` 产生一种类似于水面波纹的自然呼吸感。

### 1.2 鼠标排斥交互 (Mouse Repulsion)
当鼠标移动时：
1. 捕获归一化设备坐标 (NDC)。
2. 将 NDC 映射到 ThreeJS 世界坐标系。
3. 减去平移偏置并对齐宽高比后，传入 Shader 的 `uMouse` uniform。
4. Shader 计算当前顶点离鼠标的距离 `d`，在 `0.32` 的爆炸半径内，粒子向四周散开。

## 2. 极致性能节流 (GPU Throttling)

一个拥有 78,000+ 个粒子的 WebGL 画布，如果不加以控制，会让用户的笔记本风扇狂转。

### 2.1 视口外休眠 (IntersectionObserver)
在组件的顶层：
```tsx
const io = new IntersectionObserver(
  ([entry]) => {
    if (entry) setVisible(entry.isIntersecting)
  },
  { rootMargin: '120px' }
)
io.observe(el)
```
向下游的 `<Canvas>` 传入：
```tsx
<Canvas frameloop={visible ? 'always' : 'never'}>
```
> [!TIP]
> **商业级优化**：当用户向下滚动查看其他内容时，`isIntersecting` 变为 `false`。`frameloop="never"` 会瞬间掐断 Three.js 的 `requestAnimationFrame` 渲染循环。CPU/GPU 占用立刻归零，为下方的复杂滚动动效让路。

### 2.2 显存垃圾回收 (Garbage Collection)
在异步加载大图时，通过自定义 Hook `useImperativeTexture` 拦截加载生命周期。
如果在图片加载完成前（比如网速很慢），用户已经划走了，触发了组件卸载：
```tsx
loader.load(src, (tex) => {
  if (cancelled) {
    tex.dispose() // 直接丢弃刚下好的贴图，绝不偷偷占显存
    return
  }
  // ...
})

return () => {
  cancelled = true
  if (currentTexture) {
    currentTexture.dispose() // 卸载时主动清空显卡内存
  }
}
```

## 3. 优雅降级 (Graceful Degradation)

```tsx
const reduced = useReducedMotion()
// Honour the OS "reduce motion" setting
if (reduced) return null
```
如果用户的设备开启了系统级的“减弱动态效果”，整个 3D 画布组件会直接 `return null`。底层垫底的静态光影照片（Hero 背景）依然能保持设计美感，体现了极致的人文关怀。
