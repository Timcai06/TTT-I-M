# NR-05-R4 DEV 交付报告

**状态：PASS_NO_PRODUCT_CHANGE / READY_FOR_PM_FREEZE。** QA 截图中的 EduCanvas 画面是既有、有限的案例收回动画，不是 Contact 稳态残留。生命周期结束后画面自动释放，Contact 标题和两个 CTA 均无遮挡；本卡没有修改任何产品或官方测试文件。

## 基线与边界

- 分支 / HEAD：`feat/narrative-kernel` / `55c08029051b11e9687d869747907e20291940fa`。
- 开始前复算 `output/pm/NR-05-R3/pm-candidate-files.json`：61/61 SHA-256 匹配，0 mismatch。
- 只读检查 `caseImageTransition.ts`、卡片列出的五个候选媒体模块及 `archiveReadingSurface.ts`；完整原文和 SHA-256 见 `output/pm/NR-05-R4/inspected-source.json`。
- 没有修改 Canvas UI、Project Glass、Projects、Archive Runtime、room sample、第三方、资产、样式或内容；既有未提交改动全部保留。

## 确认的真实绘制源

系统 Chrome、1280×720、正常生产路径复现 Work 首个 EduCanvas 案例打开→Escape 关闭→立即进入 Contact。QA 截图中的大图来自：

- 组件责任：`src/lib/caseImageTransition.ts` 的 `runCaseImageTransition`；
- 实际节点：`.case-image-transition > img`，图片本身无 class；
- `src`：`/projects/educanvas/home.webp`，来源项目 `data-project-id="educanvas"`；
- 祖先链：`IMG → DIV.case-image-transition → BODY → HTML`；所有祖先 `display:block`、`visibility:visible`、有效 opacity=1；
- 容器：`position:fixed; inset:0; z-index:2147483647; pointer-events:none`；
- 活动标记：`body[data-case-image-transition="case-collapse"]`。

这条祖先链与截图形状完全吻合。QA overlap 列表中的 `.archive-handoff-page--contact` 位于 opacity=0 的父层；ArchiveStage Canvas、Project Glass 和 ParticlePortal 也不是该张可见 EduCanvas 大图的所有者。

## 生命周期证据

以 Escape 为采样起点：

| 时点 | 读回 |
| --- | --- |
| 约 49.4ms | 项目 dialog 已从 DOM 移除 |
| 约 194.9ms | Contact 已进入 `contact-reading`，route layer 已清理；临时图仍为 `case-collapse` |
| 约 791.4ms | 最后一次采到临时图，仍是 `/projects/educanvas/home.webp`，有效 opacity=1 |
| 约 850.6ms | 首次同时满足 case overlay=0、case/particle body 标记为空、Project Glass 输出=0、route layer=0、dialog=0 |
| 约 1109.5ms | 有限生命周期清理条件的浏览器轮询正式通过 |

因此旧“settled”判定只覆盖 scroll/route/dialog，截到了 Contact 可读后仍剩约 0.66 秒的合法案例收回动画；它不能代表媒体稳态。

清理后的 Contact 状态：`sampleOwner=contact-reading`，临时 overlay、ParticlePortal、Project Glass 输出、route layer、dialog 均为 0；邮件与 GitHub 两个 CTA 都 `opacity=1`、`visibility=visible`，中心命中各自真实控件。截图 `contact-after-media-cleanup.png` 中标题和两个 CTA 无项目图遮挡。

随后返回 Work：同一 `/projects/educanvas/home.webp` 恢复为可见项目媒体，案例可再次打开、Escape 关闭，第二次媒体生命周期也完整归零。没有出现 Contact 恢复旧项目输出。

## 验证与证据

| 检查 | 结果 |
| --- | --- |
| 系统 Chrome，独立端口 4383，`contact-media-lifecycle.spec.ts` | 1/1 passed，10.0s |
| 构建 | exit 0；仅候选既有 dynamic-import 与 chunk-size warning |
| 61 文件候选保护复核 | 61/61 匹配 |
| 产品 / 官方测试 diff | 0 个 R4 新改动 |

证据：

- `output/pm/NR-05-R4/contact-media-lifecycle.json`
- `output/pm/NR-05-R4/contact-during-case-return.png`
- `output/pm/NR-05-R4/contact-after-media-cleanup.png`
- `output/pm/NR-05-R4/baseline.json`
- `output/pm/NR-05-R4/protected-files.json`
- `output/pm/NR-05-R4/inspected-source.json`

## 决策与剩余边界

- 不以全局隐藏 Canvas、压层级或修改视觉来遮掩合法的 case-collapse 动画；不需要扩写白名单。
- PM/QA 定点复核必须等待 `body.dataset.caseImageTransition` 清空且 `.case-image-transition` 数量为 0，再做 Contact 截图判断。
- 本结论只闭合输出所有权与有限退出时序，不代替 tim 的最终视觉节奏验收。
- 未提交、推送、发布；未触碰 5173。DEV 生成证据后停止写入，等待 PM 冻结。
