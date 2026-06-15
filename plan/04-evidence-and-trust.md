# 04 · 证据与信任

## 信任原则

Builder Graph OS 的可信度来自证据链。每一个公开结论都应该能回答：

- 这个判断来自哪个 repo？
- 来自哪些 commit / PR / README / workflow / release？
- 是系统推断、AI 总结，还是用户手动确认？
- 用户是否选择公开这条信息？

## Evidence 类型

| 类型 | 说明 |
|---|---|
| Repo metadata | 名称、描述、语言、topic、创建/更新时间、可见性 |
| Commit | 时间、message、文件变化摘要、贡献趋势 |
| Pull Request | 协作、review、merge、问题解决过程 |
| Issue | 需求、bug、讨论和维护行为 |
| README / docs | 项目表达能力、架构说明、使用说明 |
| Workflow / CI | 工程化、测试、部署纪律 |
| Release / tag | 阶段性成果 |
| Live URL | 项目是否可访问、是否产品化 |
| User annotation | 用户对项目意义的补充说明 |

## AI 输出分级

| 级别 | 含义 | 公开默认 |
|---|---|---|
| Fact | 直接来自 GitHub / 用户输入 | 可公开，取决于用户设置 |
| Inference | 系统基于 evidence 的规则推断 | 需要标明“推断” |
| AI Draft | AI 生成的总结或建议 | 默认私密，用户确认后公开 |
| User Statement | 用户手动编辑确认的叙事 | 可公开 |

## 隐私边界

- 默认只同步公开 repo。
- 私有 repo 必须单独授权，并默认不公开。
- 用户可以排除任何 repo 或 contribution。
- 删除账户应删除本地数据库中的用户数据和 AI 草稿。
- 公开 profile 不展示 raw diff、敏感 commit 信息、email、私有协作者数据。

## 反包装原则

产品不应该鼓励用户伪造能力。AI 可以帮助表达，但不能把没有 evidence 的能力写成事实。

示例：

- 可以说：「这个项目显示出 FastAPI + PostgreSQL 的实践痕迹。」
- 不应说：「用户是资深后端专家。」

## 成长失败也算证据

断更、失败 CI、未完成项目、重构中断都可以成为复盘材料。系统应该帮助用户理解为什么停下、学到了什么、如何重启，而不是把它们简单归为负面。

## 用户修订优先

用户可以纠正 AI 的项目分类、技能解释和项目意义。用户修订后的内容应成为下一次生成的高优先级上下文。
