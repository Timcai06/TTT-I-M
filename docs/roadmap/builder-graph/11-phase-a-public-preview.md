# 11 · Phase A Public Preview

> A5 建立 “输入 GitHub handle → 选择 repo → 生成 graph draft” 的公开预览路径。它仍然不接 OAuth，不请求 GitHub，不读取私有仓库。

## A5 结论

Builder Graph OS 的第一条用户路径不是登录页，而是 public preview：

1. 用户输入 GitHub handle。
2. 用户选择想放进草稿的 repo。
3. 系统生成一个可读的 Builder Graph draft。
4. 用户先感受到“我做过什么、我进步在哪里”。
5. 之后再决定是否连接 GitHub App 做自动刷新。

这样做的原因：

- 先给用户成就感，再要求授权。
- 避免一开始就把产品体验绑定到 OAuth / token / private repo。
- 让 UI 和叙事质量先跑通，再接真实 GitHub service。

## 当前实现

当前 A5 仍使用 Tim 的 demo graph 作为安全数据源：

- `packages/content/src/publicPreview.ts`
- `apps/studio/app/graph/preview/page.tsx`
- `apps/studio/app/graph/page.tsx`
- `apps/studio/app/page.tsx`
- `apps/studio/app/sitemap.ts`
- `tests/build/platform-guards.mjs`
- `tests/runtime/cross-zone-smoke.mjs`

## Preview Draft Model

`createPublicPreviewDraft()` 接收：

- `BuilderGraphSnapshot`
- GitHub handle
- selected repository ids

输出：

- repository choices
- selected repositories
- project drafts
- top skill signals
- next actions

这个模型只做 read model 上的确定性折叠，不发起网络请求。

## 安全边界

A5 不允许出现：

- access token
- refresh token
- installation token
- raw webhook payload
- raw diff / patch
- private repo 自动导入

页面文案必须明确：

- no OAuth
- no token
- no private repository access

## 当前产品状态

`/graph/preview` 是一个 server-rendered GET flow：

- handle input 使用 `name="handle"`。
- repo checkbox 使用 `name="repo"`。
- 提交后通过 URL query 重建 draft。
- 不需要客户端 JS。

## 下一步

A6 可以开始定义真实 public GitHub service：

1. 只读取公开 profile / repositories。
2. 加 rate-limit 和失败状态。
3. 将 GitHub REST 输出清洗成 A3 的 Summary。
4. 继续复用 A5 的 preview draft model。

A6 仍不需要 private repo，也不需要 GitHub App installation。
