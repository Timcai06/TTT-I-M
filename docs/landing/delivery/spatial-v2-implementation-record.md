# Landing 空间体验 v2 实施记录

日期：2026-09-08<br>
范围：桌面 Landing；不含移动端与 Studio<br>
基线：`main` / `55c4ad384f15dea3147db5832f8810d7f34ccf47`<br>
交付边界：未提交、未推送、未改 `.blend` / `.glb` /图片资源；保留工作区内其他 agent 的既有改动。

## 已实施结果

1. 开幕像素场改为短生命周期、必需的 GPU 上下文租约。它不再因为 Hero 或房间抢先占用可选名额而静默退回普通渐变。
2. Loader 只有在全部规划资源成功下载、解码并完成布局 settle 后才显示 100 并退出。任一任务失败时可用进度最高为 94%，失败项仍保留在 `window.__portfolioPreloadDebug`，重试提示不会再与“100%”并存。
   最终 IAB 复查还定位到 `layout:chapter-pages` 在房间编译和冷图片解码并发时会超过通用 12 秒期限；该真实章节布局任务现使用与房间/媒体一致的 120 秒冷缓存期限，不再把仍在正常解码的内容误报成失败。
3. 房间 WebGL canvas 只挂载在 `ArchiveStage`，章节 adapter 只切换可 seek 的导演状态，不移动或卸载 canvas。GPU 恢复、有限值 pass、金属各向异性、MSAA/FXAA 回退继续保留。
4. Index 的真实 Hero DOM 被投影到电脑 `StackReading` 四角；鼠标、键盘 Enter/Space 可选择性靠近。近景以 520 ms 离开滚动轴，重复点击或 Escape 以 280 ms 返回；滚轮/导航键会先收回近景、再把原始滚动量交还 Lenis。链接、按钮等原生控件不被外层交互截获。电脑正常态不改资源，Frame 后的屏幕记忆使用 Final Horizon。
5. 章节进入前不再显示中央灰色 aperture。原问题是已渲染房间的浅墙/纸面被小裁切窗口先暴露，并非独立 loading placeholder；入口现在以完整房间在纯黑基底上淡入。实际 About 阅读页恢复纯黑背景，小幅边缘仅用于保留空间关系。
6. 阅读页和物件之间使用模型导出的四角投影。直接导航会克隆当前可见视口（同时复制 canvas 已绘制像素和 video 当前帧）、收回源表面，运行源视点到目标视点的房间相机路线，再从目标四角展开真实章节。中途滚轮、键盘滚动或第二次导航会取消旧路线并统一清理 layer、stage、rAF 和 runtime ownership。常驻 runtime 以可恢复的所有权栈管理 Index、桥与直接路线；临时路线释放时会重新绘制最近仍存活的表面，避免回到顶端仍停在 `rest:home`。
7. 章节阅读位置以同一个文档流根（含 GSAP `pin-spacer`）记录和恢复，避免 Stack 内部 reading target 与章节根混用。Frame 横向区间按 pin spacer 的真实长度恢复。
8. 空间中的连续主体可点击；章节正文提供 `RETURN TO OBJECT`，Escape 在没有打开 Work case dialog 时执行同一路径。Work 详情先由 dialog 自己消费 Escape。

## 六段交接

| 流程 | 源身份 | 物件/相机动作 | 目标首帧 |
| --- | --- | --- | --- |
| 书本 → About | Index 电脑中的真实首页 | 电脑退场，书封打开；完整 About dossier 投影到书页并放大 | 同一个 About DOM 排版在纯黑阅读页接管，不重播入场 |
| About → Life | About 最终可读版面 | 当前 About 页面收回 `AboutReading`，生活照片从档案中抽出 | `LifeIntro` 的真实首屏组合接管 |
| Life → Frame | `football-action` 到 `buildings/03` 的生活/观察身份 | 信封与照片累计保持，镜头移到 Frame print | `ArchiveTextPanel` 的真实 intro 排版接管 |
| Frame → Stack | `/frame/scenery/scenery-11.webp` | Final Horizon 保持同一图片、裁切与屏幕身份；实体照片停在墙面，电脑图片接管 | Stack 的 `StackContinuityFrame` 同图重合；标题只在 Stack 正文位置出现 |
| Stack → Work | Stack 最后的 Working set | Working set 收回 `StackReading`，抽屉打开、文件夹抬起 | Work 的真实 `ProjectsHeader` 首屏接管 |
| Work → Contact | Work 最后一张真实项目 identity/图片 | 项目页收回 `WorkReading`，文件夹保留为会话状态，镜头转向 Contact | 真实 `FooterContact` + `FooterMeta` 接管 |

每段均由进度函数直接 seek，不依赖累计播放历史；反向滚动恢复相同姿态。桥的点击落点和像素工具均以实际 ScrollTrigger `start/end` 计算，不再用章节高度近似。

## 像素与负向控制

`tools/personal_space/checks/verify-pixels.mjs` 继续读取 HDR scene、finite pass 和最终 framebuffer，并保留 NaN/Infinity/负 HDR 注入。覆盖判断读取每 tile 的有效亮像素比例，并计算最大连续暗 tile 矩形；另主动覆盖半屏不透明黑矩形，断言检测器必须失败。均匀暖墙、纸面和屏幕是合法画面，因此纹理方差下限从误报性的 8 校准为 1；透明像素、有效覆盖、暗块面积、scene/finite 非有限值和 AA 模式仍分别设硬门槛。

实际执行覆盖 1200×760 与 1440×900、DPR 2，六段转场正向/反向各 51 个采样点，共 1224 个交接帧，另加 2 个 Index 帧；总计 1226 帧、2 次故障注入、0 错误。最小非黑覆盖 0.9916809210526316，最小有效 tile 覆盖 1，最大连续暗 tile 比例 0，scene 与 finite 非有限值均为 0，AA 均为 `msaa-4x`。结果见 `output/playwright/archive-pixels.json`。该工具证明真实 framebuffer 未出现透明洞、半屏黑块或异常数值，不替代美术验收。

## V2-01—V2-10 实施闭环

| ID | 实施位置 | 当前证据 | 尚未满足 / 验收边界 |
| --- | --- | --- | --- |
| V2-01 | `ArchiveStage`、`ArchiveIndexSurface`、`archiveRuntime` | 同一常驻 canvas；开屏结束直接是房间；电脑投影真实 Hero/Index | tim 最终构图验收 |
| V2-02 | `ArchiveIndexSurface`、`archiveReadingSurface` | 屏幕局部坐标命中；点击、Enter、Space 可选靠近；Escape/重复点击可退，滚轮/导航键退场后续接原意图；原生控件优先 | Safari 实机键盘/指针验收 |
| V2-03 | `ArchiveChapterBridge`、`chapterTracks`、六个实际章节内容 | 六段均以真实首屏/末屏内容投影；目标 DOM 到最后交接点才接管，避免双影；同一 DOM 与四角单应矩阵保证排版、图片身份和裁切不替换 | tim 逐段美术验收 |
| V2-04 | `archiveDirector` 会话姿态、`archiveReadingMemory` | 书、Life 信封/照片、Frame 照片、Work 抽屉按会话保存；章节阅读位置和 Frame pin 位置恢复 | 跨浏览器刷新不持久化，属于当前会话边界 |
| V2-05 | `archiveRuntime.navigate`、`archiveRoute` | 源物件四角→房间镜头路线→目标物件四角；快点第二导航、滚轮、触摸、按键均取消并清理；所有姿态可 seek/反向；两个 Chrome 桌面视口已跑直接跳章、路线替换、缩放取消和所有权恢复 | Safari 全路线实机验收 |
| V2-06 | `ArchiveHandoffPage` 与真实章节组件 | 保留原字体、排版、图片和滚动叙事；空间仅承接首末帧，不重播目标入场 | “SOTD 级”只能由 tim 美术验收，不能由自动测试自证 |
| V2-07 | `FrameParticleHandoff`、`chapterTracks`、`archiveDirector` | 唯一主体为 `/frame/scenery/scenery-11.webp`；实体照片至 0.46、屏幕 0.44—0.49 接管，0.48 后仅一张图 | 其他桌面宽高比的裁切视觉需抽查 |
| V2-08 | `ArchiveReturnControl`、`archiveReturn`、`archiveRoute` | 物件点击、外层导航、Escape、Work dialog 优先级、深链、返回位置、旧路线取消均已接通；自动路线检查确认 layer、矩阵和 stage 均在取消后清理 | 辅助技术完整走查仍待 Safari 验证 |
| V2-09 | `archiveRuntimeLighting`、HalfFloat MSAA/FXAA、finite pass | M5 Pro IAB 为 `msaa-4x`；保留金属方向性、暖光、景深与有限值保护 | 模型、UV、纹理未改；材质美术不宣称全部完成 |
| V2-10 | Loader/资源门禁、上下文恢复、像素检查器 | 冷启动 pixel dither；render-ready 前不报 100；GPU 恢复与半屏黑块负向控制已保留；1226 个真实帧与 2 次故障注入通过 | Safari 与 M5 性能分布待人工验收 |

## 实际浏览器证据

在用户已打开的 1280×720 Codex IAB 中完成以下检查：

- 冷启动可见红黑 pixel dither；最终完整重载在 20.323 秒达到 146/146 fulfilled、0 failed、0 pending 后退出，未再出现“进度完成 + 部分内容未准备好”的矛盾状态。
- Index 位于电脑屏幕，点击后相机靠近但保留屏框、台灯与环境关系。
- Index 点击近景、Enter、Escape、ArrowDown 中断续滚与反向回顶重新接管均通过；未出现点击即跳帧或下一次滚动突跳。
- About → Life 正向 0.55/0.90、反向 0.90、0.9999 接管：均只有一份排版；末帧由真实 Life 接管。
- Life → Frame 0.55/0.90；Frame → Stack 0.42/0.45/0.48；Stack → Work 0.55/0.90；Work → Contact 0.55/0.82/0.9999：未观察到灰色等待帧、白色 iris 泄漏或双层目标内容。
- Home → Work 后 160 ms 内改点 Contact：旧导航被取消，最终为 `#contact`，route layer 清零、房间回到 `rest:contact`。
- Contact → Home 后书本、抽屉等已发生物件保持会话姿态；`#projects` 冷深链落在 `rest:work`。
- 1200×760 与 1440×900 的自动路线检查均通过：Work→Contact 快速替换、Index 路线中 resize+wheel 取消、路线矩阵清理、Index 点击/键盘近景、反向滚动重新接管。

## 自动证据

- `npm run typecheck:landing`：通过。
- `npm run lint:landing`：通过。
- Landing unit：114 / 114 通过。
- production build：通过，434 modules；常驻房间 runtime 9.10 KiB gzip，低于 12 KiB 单块预算。
- chunk guard：通过；总 JS 583.3 KiB gzip / 584 KiB 记录预算，CSS 152.3 KiB / 160 KiB。584 KiB 如实记录源物件—镜头—目标物件路线与可逆 Index 所有权的成本，逐块预算仍单独限制入口和 room runtime。
- architecture / Frame / Loader / content / byte / effects guards：通过。
- `verify-pixels.mjs`：两个桌面视口、1226 帧、2 次异常/黑块负向控制，全部通过；报告为 `output/playwright/archive-pixels.json`。
- `verify-routes.mjs`：两个桌面视口的快速跳章、路线替换、resize/滚轮取消、Index 点击/键盘/反向恢复全部通过。

## 单独记录的既有失败

`canvas-vendor-integrity` 仍因第三方 `DecryptReveal/DecryptRevealVanilla.ts` 哈希差异失败：期望 `97b9d215d98bdc7cc49f953ab686c8f6c4097cbba173f1514113dabae54098be`，实际 `f59883071a44403f667f55eef8089628e9a7de28e79b9988de63561220944b1d`。该差异不是本轮空间实现造成，未修改守卫或掩盖失败。

## 人工验收边界

当前实现已达到可交给 tim 审查的完整候选，不再有已知的功能性空间断链。Chrome 的两个桌面视口已覆盖真实像素、双向采样、快速跳章、窗口缩放和加载交接；同一 DOM + 单应矩阵及其单位测试覆盖文案、图片和末帧/首帧对齐。仍未满足的是 Safari 实机全流程、M5 性能分布，以及 tim 的最终美术判断。自动通过与浏览器观察均不等于 SOTD 视觉通过。
