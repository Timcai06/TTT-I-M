# Nav 组件

**文件**: `src/components/Nav.tsx`

## 职责

- 顶部固定导航条
- 通过 IntersectionObserver 追踪当前活跃章节
- 点击链接通过 Lenis 编程滚动

## 活性追踪

```typescript
const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) setActive(e.target.id)
    })
  },
  { threshold: 0.35 }
)
```

当某个章节在视口中占比超过 35% 时，导航对应链接高亮。

## 滚动控制

`scrollTo(id)` 优先使用 `lenis.scrollTo()`，回退为原生 `element.scrollIntoView()`。

## 结构

```
header.nav
└── .container.nav__inner
    ├── .nav__brand         # "Tim · 蔡"
    ├── nav.nav__links      # 5 个按钮链接
    └── .nav__counter       # "SHA ● 1 — ZJGSU"
```
