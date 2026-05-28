# 设计系统

**文件**: `src/styles/global.css`

## 颜色令牌

| 变量 | 值 | 用途 |
|------|-----|------|
| `--bg` | #0a0a0a | 主背景 |
| `--bg-elev` | #121212 | 抬高面 |
| `--bg-soft` | #181818 | 柔和面 |
| `--line` | rgba(255,255,255,0.04) | 极淡分割线 |
| `--line-strong` | rgba(255,255,255,0.12) | 可见分割线 |
| `--fg` | #f0f0f0 | 主文字 |
| `--fg-soft` | rgba(240,240,240,0.82) | 辅助文字 |
| `--fg-mute` | rgba(240,240,240,0.60) | 静默文字 |
| `--fg-dim` | rgba(240,240,240,0.38) | 极淡文字 |
| `--accent` | #7890a8 | 主强调色（冷色） |
| `--accent-warm` | #d6c5a8 | 辅强调色（暖色） |

## 字体

| 角色 | 字体 | 回退 |
|------|------|------|
| 无衬线 (sans) | Inter 300/400/500 | system-ui, PingFang SC |
| 衬线 (serif) | Playfair Display 400/italic | Noto Serif SC, Songti SC |
| 等宽 (mono) | JetBrains Mono | SFMono-Regular |

## 暗色主题

- `color-scheme: dark` 声明
- 所有颜色基于低亮度高对比度
- 选择色: `rgba(255,255,255,0.15)`
- 全局噪点叠加: `.grain` (fixed, SVG feTurbulence, opacity 0.015, mix-blend: overlay)

## 排版规范

| 层级 | 字体 | 大小 | 字重 |
|------|------|------|------|
| 章节标题 | serif | clamp(48px, 8vw, 120px) | 400 |
| 章节标签 | mono | 10px, 0.18em letter-spacing | 400 |
| 正文 | sans | 默认 | 300 |

## 分句拆行动画 (Split Line)

```css
.split-line {
  display: block;
  overflow: hidden;
  padding-bottom: 0.1em;
  margin-bottom: -0.1em;  /* 抵消 padding 对布局的偏移 */
}
.split-line__inner {
  display: block;
  will-change: transform;
}
```

每行文字包裹在 `.split-line` + `.split-line__inner` 中，通过 GSAP 控制 `yPercent` 从下方展开。
