# Projects 组件

**文件**: `src/components/Projects.tsx`

## 职责

展示六个作品卡片，数据驱动渲染。每个卡片有其独特的 accent 色彩。

## 数据驱动

从 `src/data/projects.ts` 导入 `projects` 数组。卡片通过 `data-accent` 属性为每个卡片注入 CSS 变量 `--accent`。

## 卡片结构

```
article.project-card (data-accent, data-project-id)
├── .project-card__index           # "01" ~ "06"
├── .project-card__main
│   ├── .project-card__title       # 项目英文名
│   ├── .project-card__cn          # 中文名
│   └── .project-card__tagline     # 一句话描述
├── .project-card__detail
│   ├── .project-card__desc        # 详细描述
│   ├── ul.project-card__highlights # 亮点列表
│   ├── .project-card__stack       # 技术标签
│   └── .project-card__links       # GitHub / Live 链接
└── .project-card__year            # 年份
```

## 动画

| 动画 | 触发 | 行为 |
|------|------|------|
| 卡片可见性 | `top 88%` | 添加/移除 `is-visible` 类 |
| hover accent | CSS + data-accent | 卡片边框/装饰色切换 |
