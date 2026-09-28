# Portfolio 结构整理记录

本轮从 `4155975` 建立 `chore/repo-structure`，独立 worktree 为仓库旁的 `portfolio-repo-structure/`。只在该 worktree 整理和检查，逐批本地提交；不推送、部署或合并。原工作区的未提交暗房片工作与 Blender 渲染不在本轮读写范围。

## 批次与证据

| 批次 | 内容 | 状态 |
| --- | --- | --- |
| 1A | 根、文档与 Personal Archive 工具的当前入口 | `3900ff4`；四类检查通过 |
| 1B | 路线图、架构文档、历史 PM 文档搬迁与反向链接 | `3514f6a`；四类检查通过 |
| 1C | 本地产物保留、归档建议、可清理候选 | 四类检查通过；仅清单，不删除、不移动 |
| 2A | Hero、Life、Skills、Frame、About、Work transition 章节归位 | 待执行 |
| 2B | `features/personal-archive` 目录方案 | 仅评估，待记录 |
| 3 | 17 个静态分析候选逐项审计 | 待执行；vendor 来源与许可证单独保留 |

- [文档搬迁与链接验证](document-migration.md)、[149 项路径与 SHA-256 对照](document-moves.tsv)。
- [1C 三份产物清单](local-artifacts.md)：逐项注明引用、唯一性与再生成条件。
- [逐批检查记录](verification.md)。

1C 的数量和容量来自此前审阅快照，不是本轮扫描结果。脚本引用在新 worktree 核对；原工作区中新增或持续写入的文件按 tim 提供的边界保留。所有源模型、基线、唯一或尚未确认是否唯一的证据均优先保留。

## 目录对照

| 原路径 | 整理后路径 |
| --- | --- |
| `plan/` | `docs/roadmap/builder-graph/` |
| `docs/pm/` | `docs/archive/personal-archive-pm/` |
| `docs/01–05-*.md` | `docs/architecture/01–05-*.md` |

`apps/landing`、`apps/studio`、`packages/content`、`packages/tokens` 边界保持不变。未来项目片的独立 Remotion 工程预留为 `tools/project_films/`，源素材与简报为 `art/project-films/`；本轮仅记录目录约定，不创建工程、不加入 Landing 打包。

## 合并次序与可能交叉的文件

先让暗房片完成验收，并在 `feat/intro-film` 提交其工作区改动。再从该分支的干净状态建立集成工作区，依次集成 1A → 1B → 1C → 2A → 2B → 3；本分支不操作现有原工作区。合并后重新运行四类检查，再检查真实页面的开场交接与章节导航。

- `apps/landing/src/styles/app.css`：暗房片新增导入与章节 CSS 路径调整会交叉。保留视频主线的 `intro-film.css` 导入位置，保留原有 layer 与相对顺序，再应用章节路径迁移。
- `docs/04-file-structure.md` → `docs/architecture/04-file-structure.md`：可能发生 rename/modify 协调。保留视频主线新增的 `art/<项目>/`、`tools/<项目>/` 约定，以及项目片预留目录。
- 根与文档 README：如果主线随后更新入口，需人工合并导航信息。
- `apps/landing/src/App.tsx` 在本分支不改，预计不会因本次整理产生该文件的直接内容冲突；它仍是集成后验证开场挂载与章节入口的位置。
- `chapters/projects/Projects.tsx`、`components/SciScopeFilm.tsx`、`lib/resources/mediaCache.ts` 均保留原位。项目片数据驱动化、懒加载与挂载调整应由主线另行排序；不要与结构整理同时改动这三个文件。

以上冲突预测依据共同基点和 tim 描述的未提交改动，不是对原工作区现状的重新扫描。技术检查、文件哈希和路径对照不替代浏览器/GPU 检查或 tim 的视觉验收。
