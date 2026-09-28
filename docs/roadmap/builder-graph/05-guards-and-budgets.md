# 05 · 守卫与预算

> 本文件定义 Builder Graph OS 的长期守卫方向。它不列具体任务，只规定未来实现必须被哪些边界约束。

## 现有守卫继续有效

当前 landing / studio / platform 的守卫仍然是地基：

- typecheck / lint。
- landing build guards。
- platform guards。
- cross-zone smoke。
- e2e gates。
- performance advisory。
- Vercel production smoke。

新阶段不能削弱这些门。

## 新阶段必须新增的守卫类型

### 数据同步守卫

GitHub 同步必须可重试、可恢复、可解释。同步失败不能破坏已有 graph，也不能让用户误以为数据完整。

未来需要守住：

- API rate limit 处理。
- 增量同步边界。
- duplicate repo / renamed repo 合并策略。
- 私有 repo 不进入公开输出。
- 删除授权后的数据清理。

### 证据链守卫

所有 AI 生成的公开结论都必须能追溯 evidence。没有 evidence 的内容只能作为 draft 或建议，不能成为公开事实。

### 隐私守卫

任何公开页生成前都必须经过可见性过滤。私有 repo、用户隐藏 repo、未确认 AI draft、敏感 metadata 不得进入公开 profile。

### AI 安全预算

AI 不应无限制读取 raw code、diff 和私有内容。未来应按用户授权、上下文必要性和成本预算分层读取。

### 运行成本预算

GitHub 同步、embedding、AI 摘要和图谱生成都有成本。系统必须区分：

- 首次导入。
- 增量同步。
- 用户主动刷新。
- 后台周期任务。
- 公开页读取。

公开页必须轻运行时，不因为用户 graph 很大而拖慢访问。

### 体验预算

Project Graph 可以复杂，但用户第一次看到结果必须快。首次体验应优先生成可理解的 high-level graph，再逐步补充深层 evidence。

## 观测原则

新阶段不能只靠本地测试。需要持续看：

- Vercel Speed Insights。
- Web Analytics。
- API error logs。
- GitHub sync failure rate。
- AI generation latency。
- graph publish conversion。

## 视觉预算

Landing 的电影感可以重；Studio 和用户公开页必须克制。用户的 graph 页面要漂亮，但不能把每个用户都变成 GPU-heavy 作品站。

Tim 的个人页可以是 flagship，普通用户页应该默认轻量、快速、可分享。
