# ParticlePortrait 组件

**文件**: `src/components/ParticlePortrait.tsx`

## 职责

从肖像照片采样亮度，将每个像素转换为一个在 3D 空间中拥有深度、动画和鼠标交互的粒子。

## 架构

```
ParticlePortrait
└── CanvasErrorBoundary
    └── Canvas (R3F)
        └── PortraitScene
            └── PortraitPoints
                └── ShaderMaterial (自定义 GLSL)
```

## 纹理加载

`useImperativeTexture(src)` — 自定义 hook，使用 `THREE.TextureLoader` 异步加载，处理 404 和组件卸载。加载失败回退为 `null`，渲染空 Canvas。

## 着色器系统

### 顶点着色器 (vertexShader)

| 输入 | 类型 | 用途 |
|------|------|------|
| `uTexture` | sampler2D | 肖像源图 |
| `uTime` | float | 噪声动画时间 |
| `uMouse` | vec2 | 鼠标位置 (UV 空间) |
| `uMouseStrength` | float | 鼠标推开力度 (0.25) |
| `uDepth` | float | Z 轴深度幅度 (0.8) |
| `uIntro` | float | 进入动画进度 [0, 1] |
| `uPointSize` | float | 基础粒子尺寸 (3.5) |
| `uAspect` | vec2 | 纹理宽高比归一化 |

**处理流程**:

1. 采样纹理 → 计算亮度 `vLum` 和边缘 `vEdge` (Sobel 近似)
2. 亮度映射到 Z 轴深度 (`pos.z += (lum - 0.5) * depth`)
3. 加入 Simplex 噪声 (`snoise`) 产生呼吸感
4. 鼠标向量：计算粒子到鼠标的偏移，归一化后乘以 `falloff * uMouseStrength`，推开粒子和推向 Z 轴
5. 进入动画：`pos.z -= introOffset`，粒子从深处飞入
6. 粒子尺寸：`gl_PointSize = uPointSize * (0.75 + lum * 1.5 + edge * 1.35)` — 亮部更大，边缘更大

### 片元着色器 (fragmentShader)

| 输入 | 用途 |
|------|------|
| `uTintCool` | 冷色基调 (#7890a8) |
| `uTintWarm` | 暖色基调 (#e0d5c1) |

- 圆型裁切 (`gl_PointCoord` 半径检测)
- 颜色混合：`cool ← warm` 梯度基于亮度
- 边缘粒子添加 `edgeGlow`
- Alpha 透明度渐变

### Simplex Noise

着色器内嵌了 2D Simplex 噪声实现（`mod289`、`permute`、`snoise`），用于给粒子位置添加有机波动。

## 鼠标交互

- `mousemove` 将光标从 NDC 映射到纹理 UV 空间
- 使用 `lerp` (0.08) 平滑跟随
- `mouseleave` 将目标位置重置到远点 (99, 99)，粒子回复

## 进入动画

`intro` 参数从 0 lerp 到 1，缓动曲线 `1 - pow(1 - t, 3)`，持续 2.2 秒。粒子从 Z 轴深处浮现。
