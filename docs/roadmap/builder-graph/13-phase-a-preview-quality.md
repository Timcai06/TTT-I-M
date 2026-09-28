# 13 · Phase A Preview Quality

> A7 提升 public preview 的可读性：推荐排序、repo 分组、README 短摘要和空状态。它仍然不是全量 GitHub Analytics。

## A7 结论

Public preview 需要先让用户一眼看懂：

- 哪些 repo 值得进入草稿。
- 哪些 repo 只是 fork / archived / fresh signal。
- 每个 repo 大概在做什么。
- 不选择 repo 时页面应该如何引导。

因此 A7 引入轻量质量层：

1. 根据 public stars / forks / pushed time / fork / archived 做 preview 推荐排序。
2. 将 repo 分成 `recommended`、`fresh`、`forked`、`archived`。
3. 只为排序靠前的少量 repo 请求 README。
4. 从 README 中提取短摘要，严格限制长度。

## README 边界

当前使用 GitHub repository README endpoint，并请求 raw media type。

限制：

- 只抓前 4 个 repo 的 README。
- 摘要最多 180 字符。
- 不保存完整 README。
- 不解析代码块。
- 不做 AI 总结。

这保证 preview 有项目语义，但不会变成重型爬虫。

## 当前落地文件

- `packages/content/src/builderGraph.ts`
- `packages/content/src/githubGraphAdapter.ts`
- `packages/content/src/githubPublicService.ts`
- `packages/content/src/publicPreview.ts`
- `apps/studio/app/graph/preview/page.tsx`
- `apps/studio/app/studio.css`
- `apps/landing/tests/build/content-layer-guards.mjs`
- `tests/build/platform-guards.mjs`

## 下一步

A8 可以补测试 fixture：

- GitHub user/repo/readme mock。
- 不依赖真实 GitHub 网络的 unit test。
- not_found / rate_limited / empty repo 的稳定回归测试。

这一步会让 public service 更适合长期维护。
