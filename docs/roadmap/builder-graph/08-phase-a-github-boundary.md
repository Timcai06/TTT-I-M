# 08 · Phase A GitHub Boundary

> A2 定义 GitHub 授权和同步边界。它不实现登录，不保存 token，不创建数据库表，也不发起真实 GitHub 请求。

## A2 结论

Builder Graph OS 采用混合边界：

- **公开模式**：无需登录，只读取公开 repo 能公开看到的 metadata。
- **OAuth 身份模式**：只用于识别用户，默认只请求 `read:user`，必要时才考虑 `user:email`。
- **GitHub App 安装模式**：用于 repo 级只读同步，权限按 repository permission 精细授权。

核心判断：**repo evidence 同步优先使用 GitHub App，不优先使用 OAuth repo scopes。**

原因：

- GitHub App 默认无权限，可以按 repository permission 精确选择。
- GitHub App 可以让用户选择安装到哪些 repo。
- OAuth 的 repo 类 scope 对本产品过重，不适合作为默认路径。

## 权限层级

### public

用于未登录访客或用户只想预览时：

- mode: `public_only`
- OAuth scopes: none
- repository permissions: `metadata:read`
- private repo: false
- default visibility: private

### identity

用于登录和建立站内身份：

- mode: `oauth_identity`
- OAuth scopes: `read:user`
- repository permissions: none
- private repo: false
- default visibility: private

如果未来确实需要邮箱，只能在用户明确知道原因时增加 `user:email`。

### repository_read

用于真正同步 Project Graph evidence：

- mode: `github_app_installation`
- repository permissions:
  - `metadata:read`
  - `contents:read`
  - `pull_requests:read`
  - `issues:read`
  - `actions:read`
  - `deployments:read`
- OAuth scopes: none
- private repo: false by default
- default visibility: private

私有 repo 必须单独确认，且导入后仍默认 private。

## 同步 Manifest

同步 worker 不能“看到账户就全量吸入”。每次同步必须基于 `GitHubSyncManifest`：

- ownerId
- accountLinkId
- permissionProfile
- repositories
- evidenceKinds
- trigger
- createdAt

这保证同步输入是可审计的。worker 只能处理 manifest 中明确列出的 repo 和 evidence 类型。

## 仓库选择

`GitHubRepositorySelection` 是用户意图的显式记录：

- fullName
- githubRepositoryId
- selected
- private
- visibility
- excludedEvidenceKinds

默认策略：

- public repo 可以被推荐导入，但仍需要用户选择。
- private repo 不自动导入。
- 用户可以排除任何 repo。
- 用户可以排除某类 evidence，例如 issue 或 workflow_run。

## 断开与删除

断开 GitHub 绑定不能只停止 UI 展示。必须定义本地数据策略：

- `pause_sync`：停止后续同步，保留已有数据。
- `delete_private_evidence`：删除私有来源 evidence，保留用户已公开确认的内容。
- `delete_all_imported_evidence`：删除该账号导入的全部 evidence。

默认推荐：用户断开账号时提供三档选择，并明确说明影响。

## 安全边界

- access token / refresh token / installation token 不进入 `@timcai/content`。
- token 不进入前端 bundle。
- manifest 不代表权限本身；服务端请求 GitHub 前仍必须校验真实授权。
- AI 只能读取已经写入 graph/evidence 的安全投影，不能直接拿 token 调 GitHub。

## 当前落地文件

- `packages/content/src/githubConnector.ts`
- `packages/content/src/index.ts`
- `apps/landing/tests/build/content-layer-guards.mjs`

## 下一步

A3 可以开始定义服务端适配层：

- 选择 Studio 内的 route handler / server action / 独立 package 边界。
- 定义 GitHub profile/repo list 的 adapter interface。
- 定义 mock adapter，用 Tim 的公开 repo 生成第一份 demo graph。
- 仍不需要马上接真实 OAuth。
