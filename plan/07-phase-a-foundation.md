# 07 · Phase A Foundation

> 本文件是 Builder Graph OS 进入实现阶段后的第一份事实源。它只定义「可信数据边界」，不实现 GitHub OAuth、数据库、同步任务或 AI 生成。

## A1 目标

Phase A 的第一步不是做 dashboard，也不是做酷炫 graph。第一步是让项目知道未来要信任哪些数据、哪些数据可以公开、哪些内容必须保留证据链。

当前 A1 只落地一件事：

- 在 `@timcai/content` 定义 Builder Graph 的最小 read model。

## 为什么放在 packages/content

`packages/content` 已经是 landing 和 studio 的共享内容边界。Builder Graph OS 未来需要同时服务：

- Studio dashboard 的私有图谱。
- Public Growth Profile 的公开页面。
- Landing/Work 的精选作品展示。
- AI Mentor 的证据引用。

因此 A1 类型不能直接放在某个 app 内部。它必须先成为 workspace 共享契约。

## 当前契约

`packages/content/src/builderGraph.ts` 暴露以下核心节点：

- `BuilderIdentity`：站内用户身份，和 GitHub login 分离。
- `GitHubAccountLink`：GitHub 绑定元数据，不包含 token。
- `EvidencePointer`：所有 AI 叙事必须引用的事实锚点。
- `RepositoryNode`：GitHub repo 的 graph 节点。
- `ProjectNode`：用户理解自己作品的核心单位，可连接多个 repo。
- `ContributionNode`：接近 GitHub 原始对象的原子贡献事件。
- `SkillSignal`：由证据支持的能力倾向，不是考试分数。
- `GrowthEvent`：把多个证据折叠成用户可读的成长时间线。
- `BuilderGraphSnapshot`：某个用户在某个时间点的 graph 读模型。
- `BuilderGraphRepository`：未来 DB/GitHub adapter 需要实现的读取契约。

## 信任边界

### AI 不是事实源

AI 可以做三件事：

- 总结证据。
- 生成草稿叙事。
- 提醒用户下一步可以补什么。

AI 不能做三件事：

- 凭空创造证据。
- 把没有证据的能力写成事实。
- 绕过用户确认直接公开叙事。

因此类型层明确要求：公开叙事相关节点必须能回到 `evidenceIds`。

### Token 不进内容层

`GitHubAccountLink` 只保存授权边界需要展示和判断的元数据，例如：

- GitHub user id。
- login。
- connection kind。
- permissions。
- installation id。
- sync 时间。

access token / refresh token / webhook secret 不属于内容层，也不能进入前端 bundle。

### 可见性先于展示

`private | unlisted | public` 是 Builder Graph 的基本可见性边界。任何 repo、project、evidence、growth event 在进入公开页之前，都必须有明确 visibility。

## 非目标

A1 不做：

- GitHub OAuth。
- GitHub App installation。
- 数据库存储。
- 后台同步。
- AI 总结。
- dashboard UI。
- public profile UI。

这些属于 A2 之后。

## 下一步

A2 应围绕授权和同步边界展开：

- 选择 GitHub OAuth、GitHub App，或二者组合。
- 明确最小权限。
- 定义同步任务的输入输出。
- 定义删除和断开绑定后的数据清理策略。
