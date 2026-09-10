# NR-05-R1 DEV 交付报告

**状态：READY_FOR_QA。** 本轮只修复房间入口的真实命中链，不改 GLB、相机、叙事段、颜色、内容、布局节奏、依赖、资源策略或既有测试。未提交、未推送、未发布，也不代替 QA 连续旅程复验与 tim 的视觉验收。

## 基线与边界

- 分支：`feat/narrative-kernel`
- 起始 HEAD：`55c08029051b11e9687d869747907e20291940fa`
- 修复前核对 `output/pm/NR-05/pm-candidate-files.json`：59/59 匹配，0 缺失，0 不一致。
- 四个授权产品文件的旧原文均已存在于 `output/pm/NR-05/pm-candidate-source.json`；本轮完整新原文见 `output/pm/NR-05-R1/candidate-source.json`。
- 其余 55 个 NR-05 候选文件逐项复核未变，见 `output/pm/NR-05-R1/protected-files.json`。

## 根因

原始 About→Life 路径中，`button[aria-label="打开 life"]` 在未由运行时接管时仍以 enabled/tabindex 0 暴露，但计算样式是 `pointer-events:none`、bridge 无 phase。Playwright 自动滚入后，`elementFromPoint` 首先命中同一 `about-life` track 的整屏 sticky `.archive-bridge__stage`（`z-index:30; pointer-events:auto; visibility:visible`），不是相邻章节。

逐层透传后又确认两个关联问题：

1. `.archive-bridge` 与外层 sequence 仍可能成为空白命中所有者；
2. 激活按钮原来铺满视口、只靠绝对坐标 `clip-path` 留出物件四边形，自动化或用户命中点可能落在外接矩形而不在物件内；
3. 把原生 `disabled` 固定在 React JSX、再由运行时直接改 DOM，会让 React 事件系统继续按 disabled props 抑制 `onClick`。

基线读回与失败信息保存在 `output/pm/NR-05-R1/diagnosis.json`。

## 实现

- `personal-archive.css`
  - bridge、sticky stage 与 desktop sequence 作为透明承载层，不再吞掉物件之外的输入；真实正文子树、footer 控件、运行时命中按钮继续显式接收输入。
  - room-hit 默认 `visibility:hidden; pointer-events:none`。
- `archiveReadingSurface.ts`
  - 每帧先把所有非 owner 命中区设为 disabled、`aria-disabled=true`、tabindex -1、hidden、不可命中。
  - 仅当前 sticky stage 已稳定占据视口且投影有效时，开放该 owner。
  - 命中按钮改为以投影四边形质心为中心的真实局部包围盒，并把 `clip-path` 坐标转换为局部坐标；默认点击中心因此位于物件四边形内部，同时保留完整物件裁剪。
  - 激活时同步 `disabled=false`、`aria-disabled=false`、tabindex 0。
- `ArchiveChapterBridge.tsx`、`PersonalArchiveBridge.tsx`
  - 初始语义改为 `aria-disabled=true` 与 tabindex -1；不再把原生 disabled 写死进 React props，运行时开放后 `onClick` 可进入 React 处理链。
- 新增 `archive-room-entry.spec.ts`
  - 不使用 force click、DOM click 或事件注入；先以 `elementFromPoint` 验证物件四边形质心确由当前按钮持有，再发真实 `page.mouse.click`。

## 验证结果

| 检查 | 结果 |
| --- | --- |
| `npx tsc -b --pretty false` | exit 0 |
| 受影响 TS/TSX 与新 e2e ESLint | exit 0 |
| `npm run test:build:architecture` | exit 0 |
| `npm run test:build:loader` | exit 0 |
| `git diff --check` | exit 0 |
| 系统 Chrome，独立端口 4364，`archive-room-entry.spec.ts` | 2/2 passed，38.8s |

浏览器覆盖：Index 点击、About 导航、About 长读、RETURN TO OBJECT、About→Life 原反例，以及 entry / About→Life / Life→Frame / Frame→Stack / Stack→Work / Work→Contact 六个共享入口的唯一 owner、可见/可用/焦点语义、`elementFromPoint` 与真实鼠标点击。footer 控件保留显式 `pointer-events:auto`；没有把当前不可见的 footer 强行计作点击通过。

构建仍有候选既存的 `mediaCache.ts` ineffective dynamic import 与大于 720 kB chunk 提示；没有新增错误。未重复 51/162 全套单测，符合卡片范围。

## 清理与剩余验收

- DEV 自有 4352、4354—4364 端口均已无监听；Playwright 自有服务已清理。
- tim 的 5173 仍由原 PID 53714 监听，本轮未触碰。
- QA 仍需按 `NR-Q05-R2` 重跑完整连续用户旅程；tim 仍需做最终视觉验收。
