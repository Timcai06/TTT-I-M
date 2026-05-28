# 组件层次结构

```
App
├── Loader                 # 全屏加载进度条（GSAP timeline → slide up exit）
├── Cursor                 # 自定义光标（GSAP ticker lerp 跟随）
├── ScrollIndicator        # 右侧浮动：章节进度条 + 活跃章节名
├── Nav                    # 顶部导航：品牌 + 链接 + 位置活性
├── <main>
│   ├── Hero               # 首页：粒子肖像 + 文字 intro + 滚动形变
│   │   └── ParticlePortrait  # GLSL 粒子系统（R3F Canvas）
│   ├── About              # 自述：split-line 排版 + SVG 流动曲线
│   ├── Skills             # 技能：自适应蛇形 SVG 曲线 + 行展开
│   ├── Projects           # 作品：数据驱动卡片 + accent 注入
│   └── Footer             # 页脚：CTA + 链接
└── <div.grain>            # 固定噪点叠加层
```

## 职责矩阵

| 组件 | 动画类型 | 数据来源 | 交互 |
|------|----------|----------|------|
| Loader | 时间线驱动 | 无 | 自动播放 |
| Cursor | ticker lerp | 无 | pointer move |
| Nav | IntersectionObserver | 无 | click → scrollTo |
| ScrollIndicator | ScrollTrigger | 无 | passive |
| Hero | timeline + scroll scrub | 无 | scroll |
| ParticlePortrait | rAF + shader | texture | mouse move |
| About | scroll trigger | 无 | scroll |
| Skills | scroll trigger + resize | 无 | scroll |
| Projects | scroll trigger | `projects.ts` | card hover |
| Footer | scroll trigger | 无 | link click |

所有动画组件都遵循同一生命周期模式：`useEffect` 内创建 `gsap.context()`，返回 `() => ctx.revert()` 清理。
