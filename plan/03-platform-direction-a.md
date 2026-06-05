# 03 · 平台化（方向 A：多 Zone，已锁定）

> **方向 A**：现在这个 Vite landing **一行不动**，内容平台另起一个 Next.js（App Router），
> 用 Vercel rewrites 拼到一个域名。
>
> 理由：landing 的 stage 机 / 整站预热 / Lenis↔ScrollTrigger 深度调优跟 SSR 框架水土不服，
> 迁移高风险低回报；博客/作品/UGC 真正需要 SSR/SSG/RSC/auth/DB，Next 一站给齐；
> 物理隔离保证博客永远不背 landing 的重包。

## 仓库与部署形态

```
（方案：同一 GitHub 仓库 monorepo，或两个独立仓库——推荐 monorepo + pnpm workspace）

repo/
  apps/
    landing/        ← 现在的 portfolio（Vite），几乎不动
    studio/         ← 新建 Next.js（App Router）：/blog /work /dashboard
  packages/
    tokens/         ← 共享设计 token（颜色/字体/ease/间距）
    ui/             ← 少量跨端共享组件（按钮、标签、媒体卡）——可后置
    content/        ← 内容 schema + repository 接口 + adapters（见 04）
```

> 当前 `portfolio/` 即未来的 `apps/landing/`。迁移成 monorepo 是 SOON 阶段的事，
> 现在不必动；先把 `packages/content/` 的接口在 landing 内部建好（见 04），将来平移。

> **执行状态（2026-06-05）**：SOON-1/SOON-2/SOON-3/SOON-4 的地基已落地：
> `portfolio` repo 已改成 npm workspaces，landing 迁到 `apps/landing`；新增
> `apps/studio`（Next App Router，`/blog`、`/blog/[slug]`、`/work`、`/work/[slug]`、
> `/dashboard`、RSS、sitemap、OG image）；新增 `packages/tokens` 与 `packages/content`。
> studio 只依赖 content/tokens/Next/React，guard 禁止引入 GSAP/R3F/Three/Lenis/preload。
> **更新（2026-06-05）**：SOON-2 已从博客骨架升级为真实仓库内容生产链：
> `apps/studio/content/posts/*.mdx` 作为写作入口，`apps/studio/content/mdx.ts`
> 在构建时读取 frontmatter/body，`/blog/[slug]` 用静态参数生成详情页，RSS/sitemap 复用同一 repository。

### Vercel 拼接

- 两个 Vercel project（landing、studio），或一个 project 多 zone。
- 用 `vercel.json` rewrites / Vercel multi-zone：
  - `/` , `/#...` → landing
  - `/blog/*` , `/work/*` , `/dashboard/*` → studio
- 同一根域名，用户无感。

> 🔴 **已知缺陷（2026-06-05 审计，未修，最高优先）** — 当前只 rewrite 了 `/blog`·`/work`·
> `/dashboard`·`/rss.xml` 的**页面 HTML**，**没有 rewrite `/_next/*`**，studio `next.config.ts`
> 也没有 `assetPrefix`/`basePath`。后果：`ttt-i-m.vercel.app/blog` 返回 studio HTML（200），
> 但 HTML 里的 `/_next/static/*.css|js` 被当成主域请求 → 主域是 Vite，无此文件 → **404**，
> 于是博客在主域**无样式、未 hydrate**。curl 实证：main `/_next` css = 404，studio 直连 = 200。
> 修法（与 Vite landing 无冲突，因为 landing 用 `/assets/` 不用 `/_next/`）：root `vercel.json`
> 增加 `{"source":"/_next/:path*","destination":"https://ttt-i-m-studio.vercel.app/_next/:path*"}`，
> 并补 studio 自有静态（OG image、favicon、`/work` 图片等）；或给 studio 设 `assetPrefix` 指向自身 origin。
> 同时建议加一条**运行时 guard**（curl/Playwright 断言主域 /blog 的 css/js 均 200），因为现有
> `platform-guards.mjs` 只断言 rewrite 字符串，抓不到这类资源解析故障。

> 🟡 **"MDX" 现状**：`apps/studio/components/MdxContent.tsx` 是手写 markdown 子集渲染 +
> 扁平 frontmatter 解析（零 MDX 依赖，符合"轻运行时"），但**不是真 `@mdx-js`**：不能在正文嵌
> 组件、frontmatter 仅支持单行字符串。要真 MDX 需引入 `next-mdx-remote`/`@next/mdx`。

## 渲染策略分配

| 路由 | 渲染 | 框架能力 |
|---|---|---|
| `/`（landing） | 重客户端 SPA + 整站预热 | 现状 Vite |
| `/blog`, `/blog/[slug]` | SSG（MDX-in-repo） | Next RSC + `generateStaticParams` |
| `/work`, `/work/[slug]` | SSR/ISR（吃 repository） | Next RSC + 数据获取 |
| `/dashboard`（UGC 发布） | SSR + Server Actions（鉴权后） | Next Server Actions |

**硬约束**（来自 00 原则）：studio 的任何页面**绝不** import GSAP/R3F/Lenis/sitePreload。
内容是主角，运行时要轻。

## 内容源（两套，藏在同一接口后）

- **博客**：MDX-in-repo（git 即 CMS）。`apps/studio/content/posts/*.mdx`，front-matter 走
  `packages/content` 的 `Post` schema。零 DB。
- **作品/UGC**：Postgres（Neon / Vercel Postgres / Supabase）。
- 两者都实现 `packages/content` 的 repository 接口，studio 组件只认接口（见 04）。

## 跨边界转场连续性（别让电影感断在路由切换处）

- **View Transitions API**：跨文档过渡（多 zone 硬导航也支持），让硬切看起来像设计过。
- 复用 landing 的转场 GL/CSS 粒子场作为**路由 loader 皮肤**，遮住跨 zone 白闪。
- stage 机加 `navigating` 阶段：离开 landing 时统一暂停所有 WebGL + 停 Lenis
  （复用 01·1 已建的 GL 自暂停机制）。
- 共享 `packages/tokens` 保证两端色彩/字体/ease 一致，过渡不突兀。

## UGC 四根新轴（LATER 阶段）

1. **身份与权限**（AuthN/AuthZ）
   - Auth.js / Clerk / Supabase Auth。
   - `content` schema 加 `authorId`；权限 = 谁能 publish/edit 谁的内容。
2. **发布状态机**（平台命门）
   - `draft → submitted → in-review → approved → published / rejected`。
   - 与 landing 的 stage 机同一种思维：用显式状态机管生命周期，可审计。
3. **运行时媒体管线**（区别于现有 build-time sharp/svgo）
   - 用户上传未知图片 → Vercel Blob / S3 + 运行时图像 CDN（Vercel Image Optimization /
     imgix / Cloudinary）做转码、responsive、防滥用。
   - **两套管线分开**：build-time 管 landing 已知资产，runtime 管 UGC 上传。
4. **滥用与配额**
   - rate limit、上传大小/数量限制、内容审核队列（人工 + 可选自动过滤）。

## Route Registry（把 registry 思想往上提一层）

- 现 `src/chapters/registry.ts` = 「landing 一个路由的内部章节 SSOT」。
- 平台期新增 `routeRegistry` = 「路由/表面 SSOT」（landing / blog / work / dashboard）。
- landing 降级为 routeRegistry 里的一条，其 surface 就是现有 chapter registry。
- 新增「作品详情页」等 = 往 routeRegistry 加一条，复用「加一处、导航自动出现」红利。

## 分期

| 阶段 | 动作 | 依赖 |
|---|---|---|
| SOON-1 | monorepo 化（portfolio → apps/landing），抽 `packages/tokens` | 已完成 |
| SOON-2 | 起 `apps/studio`（Next），MDX 博客，SSG | 已完成 MDX-in-repo 内容生产链 |
| SOON-3 | 作品列表/详情页吃 repository（先 static adapter） | 已完成 static repository 骨架 |
| SOON-4 | OG image 生成、RSS、sitemap、内容区 SEO | 已完成基础输出 |
| LATER-1 | Auth + Postgres + repository api adapter | 04 |
| LATER-2 | UGC 上传（运行时媒体管线）+ 发布状态机 | LATER-1 |
| LATER-3 | 审核队列 + 配额/限流 + 用户主页 | LATER-2 |

## 风险

| 风险 | 缓解 |
|---|---|
| 包污染（内容页背 landing 全家桶） | 物理隔离：独立 app / 独立 entry，guard 断言 |
| preload 模型外溢到无限内容 | manifest 锁 scope=landing（00 原则 + 守卫） |
| 双内容源各写一套 UI | 统一 repository 接口 + 统一 schema |
| 转场在路由切换处断裂 | View Transitions + 转场皮肤 + stage `navigating` |
| build-time / runtime 媒体管线混淆 | 明确分离，UGC 永远走 runtime CDN |
| 过早上 DB | 博客先 MDX-in-repo，DB 只为 UGC |
| 设计系统漂移 | 早抽 `packages/tokens` |
