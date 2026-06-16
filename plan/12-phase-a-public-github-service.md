# 12 · Phase A Public GitHub Service

> A6 把 `/graph/preview` 从 demo graph 推进到真实 GitHub public profile / public repositories。它仍然不接 OAuth、不保存 token、不读取 private repo。

## A6 结论

Public preview 的数据入口现在是：

1. `GET /users/{username}`
2. `GET /users/{username}/repos?type=owner&sort=pushed&direction=desc`
3. 清洗为 A3 的 `GitHubProfileSummary` / `GitHubRepositorySummary`
4. 生成 `BuilderGraphSnapshot`
5. 复用 A5 的 `createPublicPreviewDraft()`

这让用户输入 GitHub handle 后可以看到真实公开仓库形成的 graph draft。

## 官方 API 边界

依据 GitHub REST API：

- `GET /users/{username}` 可以无鉴权读取公开用户信息。
- `GET /users/{username}/repos` 可以无鉴权读取公开仓库。
- repository list 支持 `type`、`sort`、`direction`、`per_page`。

当前只使用公开资源，不使用 Authorization header。

## 当前实现

- `packages/content/src/githubPublicService.ts`
- `packages/content/src/index.ts`
- `apps/studio/app/graph/preview/page.tsx`
- `apps/landing/tests/build/content-layer-guards.mjs`
- `tests/build/platform-guards.mjs`

## 失败态

`GitHubPublicPreviewStatus` 当前包括：

- `ready`
- `not_found`
- `rate_limited`
- `network_error`
- `invalid_response`

页面会显示安全错误信息，不展示 GitHub 原始 response body。

## 安全边界

A6 仍禁止：

- Authorization header
- access token
- refresh token
- installation token
- raw webhook payload
- raw diff / patch
- private repository 自动导入

所有数据先清洗成 Summary，再进入 Builder Graph adapter。

## 性能边界

当前默认只读取一页公开 owner repos，最多 12 个。

这是刻意限制：

- 降低无鉴权 API rate limit 压力。
- 避免 preview 页面等待过久。
- 先打磨产品叙事，不急着追求全量 GitHub analytics。

## 下一步

A7 可以开始做 preview 质量增强：

1. 按语言 / 更新时间 / topic 给 repo 推荐排序。
2. 加空仓库、纯 fork、archived repo 的更清楚分组。
3. 从 README 公开内容中提取项目简介，但仍需做大小限制和超时。
4. 增加 public service 单元测试或 fixture，避免 GitHub 网络波动影响本地验证。
