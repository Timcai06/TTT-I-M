# 文件分类治理（File Governance）

更新时间：2026-06-04  
目标：给后续维护者一眼就能判断“哪些目录放什么、哪些文件可生成、哪些文件不应手改”。

## 目录职责表

| 目录 | 职责 | 主要放置内容 | 维护边界 |
|------|------|--------------|----------|
| `src/components` | 章节级 UI 组件与交互组件 | 章节渲染器（如 Hero/About/Frame/LifeGallery/Projects）和独立交互组件（Cursor/Nav/Loader/PerfHud） | 组件职责尽量单一；可新增局部样式与 hooks 调用，但不改动 `registry.ts` 以外的章节编排入口。 |
| `src/chapters` | 章节注册（Page Composition 的单一真相源） | `registry.ts` 中的 `chapters`、`navChapters`、`progressChapters` | 新增/删除章节时优先在此文件声明，决定 App、Nav、ScrollIndicator 的同步关系。 |
| `src/lib` | 共享运行时工具与动画生命周期封装 | GSAP/Lenis/word-reveal/touch/磁吸/倾斜等 Hook 与 helper | 作为基础设施层，不直接持有业务数据；避免在这里硬编码章节文案。 |
| `src/data` | 业务数据（纯数据层） | about/projects/skills/life/frames 等定义；`frame` 的 `srcSet` 依赖通过 manifest 提供 | `frameImageSources.generated.ts` 属于派生数据，不应与手工内容定义混在一处修改。 |
| `src/styles` | 视觉样式源代码 | `app.css/global.css` + 分组件 CSS（`components/`） | 新章节建议新增对应组件样式文件并从 `src/styles/app.css` 引入；优先保持选择器 scoped 到章节。 |
| `scripts` | 构建前置与资产生成脚本 | `setup-assets.mjs`（predev/prebuild Hook） | 所有公开资源入口（尤其是 frame 响应式图集）统一从脚本生成链条刷新。 |
| `public/frame` | 运行时图像资源目录 | frame 分类目录 `buildings/cuisine/scenery` 下的 `.webp` | 该目录是运行时输入源；`-720.webp/-1080.webp` 由脚本派生，避免手改。 |
| `tests/build` | 构建前后质量守卫 | `chunk-guards.mjs`（分包/预加载/代码分割约束） | 新增性能守卫优先在此补充 “chunk + preload + deferred assets” 类检查。 |
| `tests/e2e` | 行为与性能回归（浏览器级） | `frame.spec.ts`（滚动、布局、懒加载、可见性） | 新增章节/大资源变更后的体验边界请补充端到端场景。 |

## 生成文件与不应手改文件

- `src/data/frameImageSources.generated.ts`  
  - 生成来源：`scripts/setup-assets.mjs`。  
  - 职责：为 `src/data/frames.ts` 提供三档 `srcSet`（base / 720 / 1080）manifest。  
  - 规则：**不直接手改**，修改图片后先更新源图像并通过 `scripts/setup-assets.mjs` 重算。

- `public/frame/*-720.webp`  
- `public/frame/*-1080.webp`  
  - 生成来源：`scripts/setup-assets.mjs` 的响应式输出。  
  - 规则：**不直接手改**，避免破坏 `srcSet` 与压测假设。

此外，`public/frame/*` 下的无后缀原图（如 `xx.webp`）也应以“由源图生成/替换”为主，不把手工导图当运行时最终真相。

## 未来新增的放置规则

### 新增章节

1. 在 `src/components` 新建章节组件（例如 `xxxx.tsx`）。  
2. 在 `src/chapters/registry.ts` 注册 `id / Component / nav / progress`。  
3. 如有专属样式，在 `src/styles/components` 新增 CSS 并在 `src/styles/app.css` 引入。  
4. 如有新的动画 or 交互强约束，考虑新增/扩展 `src/lib` 的生命周期复用逻辑。  
5. 对应行为回归，新增或更新 `tests/e2e` 用例（必要时加入口视图断言）。  

### 新增图片（Frame）

1. 先补齐源输入（`sources/` 下对应目录）并按既定命名/序列规律放置。  
2. 通过 `npm run setup`（或 `predev / prebuild`）触发 `scripts/setup-assets.mjs` 重新生成 `public/frame` 与 `src/data/frameImageSources.generated.ts`。  
3. 在 `src/data/frames.ts` 使用新 `id` 和 `src` 规则接入（如 `/frame/cuisine/cuisine-XX.webp`）。  
4. 必要时在 `tests/e2e` 追加布局与懒加载断言（`img.srcset`、`loading="lazy"`、`fetchPriority`）。  

### 新增性能守卫

1. 新的构建体积、预加载、代码分包边界约束写入 `tests/build`（`chunk-guards.mjs`）。  
2. 新的运行时交互/滚动/布局回归写入 `tests/e2e`（`frame.spec.ts` 或新建主题 spec）。  
3. 涉及动画生命周期变更时，在文档（`docs`）补充“谁依赖了何种守卫”的说明，避免误删。  

