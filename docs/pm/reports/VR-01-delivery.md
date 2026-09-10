# VR-01 DEV 交付报告

**状态：READY_FOR_PM_FREEZE。** 本轮已完成空间滚动、真实表面相机路径、六章阅读主题、Index/Loader 首屏清理、双向 RETURN 同一语义进度，以及第三层照片的源模型/GLB 同步修复。未运行浏览器、Playwright 或截图验收；未提交、推送、发布，也未触碰 tim 的 5173 服务。

## 基线与边界

- 分支：`feat/narrative-kernel`
- 起始及当前 HEAD：`55c08029051b11e9687d869747907e20291940fa`
- 写入前核对 NR-05 接受候选：61/61 匹配，0 缺失，0 不一致。
- 完整源文件基线、额外 `readingSnapshot` 原文及 blend/GLB/契约二进制备份位于 `output/pm/VR-01/`；既有 61 文件完整原文继续由 `output/pm/NR-05-R3/pm-candidate-source.json` 保存。
- 保留全部已有未提交改动；未进入 ARCH 的 HTML-in-Canvas、部署 token 或下一张局部效果卡。

## 逐条实现映射

### 1. 滚动与相机

旧 bridge 高度减去 sticky 的一个视口后，有效行程只有 80–150vh；新行程为：entry 300vh、About→Life 240vh、Life→Frame 220vh、Frame→Stack 240vh、Stack→Work 220vh、Work→Contact 200vh。

语义阶段从“前 8% 收页、24–56% 移动、56–72% 对齐、94–100% 展开”改为：

- 源页 0–18% 在真实载体上收回；相机 18–64% 完成主要位移。
- 50–80% 完成旋转对齐，62–90% 完成靠近，82–100% 才从真实表面展开为 2D。
- entry 使用 6–64% 位移、50–86% 对齐，保留更长的房间观察和 About 书页到达段。

相机不再先在两个预设 view 之间插值、再顺序混入 target/source fit。现在从实际源表面 fit（Index 则为规范电脑视角）出发，经过目标表面的物理 standoff，再落到目标 surface fit；旋转与靠近分阶段但共享同一滚动 T。Life→Frame 不再用与载体无关的相机绕行，而是以真实 `FootballTransfer` 四角求解随行相机，再平滑收敛到 Frame surface fit；照片全程保留小幅安全边距，端点仍严格一致。

### 2. 六章表面主题

Headless Blender 读回表明 About 书页、Life 相纸、Frame 装裱纸、Work 档案夹和运行时 Contact 信纸都复用真实 `Paper_fiber`，因此这五章继续使用运行时从受光书页校准的 `--room-paper`，没有凭感觉另配近似底色；Stack 的载体是 `StackScreenSurface`，才使用显示器深色表面。章节辨识沿用仓库已有暖棕、Frame 绿、Stack 红、Work 靛蓝、Contact 棕红色系。每套主题完整提供标题正文、弱文本、链接、按钮、普通与强边框 token。

主题身份写入真实章节、静态 handoff、源页面 snapshot 和 direct-route layer；克隆即使移除原始 DOM id 也不会退回统一白/黑。Stack→Work 静态交接的外层和内部 `.projects` 容器都显式携带 Work 主题，避免章节公共选择器在内层覆盖表面 token。Work 内部深色媒体与 Stack 的显示器性格保留为局部艺术方向。

### 3. Index 与 Loader

- 删除 Index 页面 click/Enter/wheel 上的 520ms 独立 inspection 动画及滚动回放；真实电脑、DOM Index、链接/按钮交互和 ScrollTrigger 进度保留。相机对历史 inspection 值保持规范视角。
- Loader 的资源门仍是 `renderReady || readingFallbackReady`，Dither、计数、失败恢复和 `dispatchIntroExit` 均保留；整块灰幕从 `yPercent: -100 / 1.15s` 改为 `autoAlpha: 0 / 0.42s` 原位淡出。
- 守卫现在明确阻止 Index 计时镜头和 Loader 整屏上滑回归。

### 4. 2D RETURN → 3D

direct open/return 的 route layer 不再使用另一套展开曲线；它直接读取 `sampled.presentation.targetExpand`。正向与反向都沿同一章节 segment/T：先在目标真实表面收回，再随相机离开到房间。现有请求所有权、最终 intent 校验和独立章节书签逻辑未被重置。

### 5. 左柜/第三层核查

Headless Blender 确认用户所指关系为 `Cinema_03_Life` → `Cinema_Focus_03_Life` 与第三层 `LifeMemoryPhoto`/`Life_PhotoPaper`，不是另一个误命名摄像机模型。进一步读取合并建筑网格的全部 primitive 后确认：旧照片终点仍在层板深度内，正对纸面的运行时镜头会穿过 `RoomBake_Walnut_oiled`，仅凭 Blender authored camera 的焦点线不足以证明安全。

因此本轮修改真实 `LifePhotoExtract`：保留原起点、25 帧采样和缓动，把终点从 Blender `[-1.19, 0.91, 1.26]` 移至柜外 `[-1.19, 0.67, 1.35]`。`.blend` 与 GLB 动画逐样本最大坐标差 `2.38e-7`；scene contract 与烘焙清单同步新的源哈希。原二进制均在 `output/pm/VR-01/baseline/` 可恢复。

两种桌面比例下对入口及五段桥接共采样 1,212 个真实 GLB/动画/solver 状态：最小木板净距 `0.030798m`，170 条相机→Life 纸面视线无木板抢先命中，最大 1% 相机位移 `0.140447m`，移动照片四角最大 NDC 绝对值为浮点 `1.0000000000000018`。详见 `output/pm/VR-01/runtime-geometry.json`、`asset-sync.json` 与 `scene-inspection.json`。

## 技术验证

| 检查 | 结果 |
| --- | --- |
| TypeScript typecheck | exit 0 |
| VR-01 受影响文件 ESLint | exit 0 |
| 单元测试 | 170/170 passed（工作区总数含同期已冻结 ARCH 用例） |
| 生产 build | exit 0，446 modules transformed |
| chunk / chapter architecture / loader guards | 均 exit 0 |
| 相机几何 | 1,212 个真实状态；六段端点一致、中停确定、1% 步长连续、纸面投影/木板视线/显示器净距均通过 |
| blend / GLB 同步 | 25/25 动画样本一致；新源哈希同步到契约与烘焙清单 |
| scoped `git diff --check` | exit 0 |

构建仍有既有 `mediaCache.ts` ineffective dynamic import 与体积提示；chunk 守卫把它们作为 advisory。全量 `test:guards` 唯一停止项是本卡未修改的 `DecryptRevealVanilla.ts` 与其 vendor registry 哈希不一致；所有 VR-01 受影响守卫已独立通过，原始结果记录在 `output/pm/VR-01/verification.md`。

## 剩余边界

- tim 仍需完成桌面前端视觉/手感验收：连续滚动、中停、反向、快速跳转、各章主题可读性、Index/Loader 首屏、About 进入和 RETURN。
- 本报告不宣称视觉通过；也不覆盖 HTML-in-Canvas 或后续局部效果。
- DEV 在报告与证据冻结后停止产品写入，等待 PM 冻结与用户验收。
