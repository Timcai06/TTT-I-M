# 10 · Phase A Graph Surface

> A4 把 A3 的 demo Builder Graph read model 放进 Studio，形成第一个可浏览的产品 surface。

## A4 结论

当前 `/graph` 是 **demo graph surface**，不是登录后的真实用户 dashboard。

它的职责：

- 读取 `timPublicDemoBuilderGraphRepository`。
- 展示 projects / repositories / evidence / skill signals 的最小闭环。
- 让用户和未来 Agent 看到 Builder Graph OS 的产品雏形。
- 继续保持 Studio 轻运行时，不引入 GSAP、R3F、Lenis 或 landing 的 WebGL 负载。

它不做：

- GitHub OAuth。
- GitHub App installation。
- 数据库存储。
- AI 总结生成。
- 私有仓库导入。

## 当前落地文件

- `apps/studio/app/graph/page.tsx`
- `apps/studio/app/studio.css`
- `apps/studio/content/index.ts`
- `apps/studio/app/layout.tsx`
- `apps/studio/app/page.tsx`
- `apps/studio/app/sitemap.ts`
- `vercel.json`
- `tests/build/platform-guards.mjs`
- `tests/runtime/cross-zone-smoke.mjs`

## 产品语言

页面使用 “Your code has a memory. This is the first map.” 作为当前叙事锚点。

这句话表达两个边界：

- 它不是 GitHub Analytics 的数字看板。
- 它是把项目证据整理成成长地图的开始。

## 线上边界

`/graph` 已经纳入 root Vercel rewrite：

- `/graph`
- `/graph/:path*`

并纳入 cross-zone smoke。未来 push + deploy 后，主域必须验证 `/graph` HTML 和 `/_next` assets 都是 200。

## 下一步

A5 可以开始设计真正的用户路径：

1. 未登录用户输入 GitHub handle，生成 public preview。
2. 用户选择 repo，形成 graph draft。
3. 用户编辑项目叙事和公开范围。
4. 再决定是否进入真实 GitHub App / OAuth。

A5 之前不建议直接接认证；先把 public preview 的成就感和叙事质量打磨出来。
