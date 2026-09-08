# 空间像素缺失与 About 衔接修复

2026-09-08，桌面 Landing。视觉验收由 tim 完成；本记录区分像素故障、几何检查与页面衔接。

## 已确认的根因

之前把大片黑块主要归因于 DOM 预览并宣布修复，是不充分的。原先的功能、投影、加载测试没有读取实际渲染像素，因此不能证明黑块消失。把完整 About 书页改成标题元数据还造成了独立的内容退化。

在 1200×760 / DPR 2 的六段正反扫描中，五段复现大片缺失：入口 87.4%、Life → Frame 94.4%、Frame → Stack 89.7%、Stack → Work 98.7%、Work → Contact 100%（均为采样中最大值）。About → Life 未复现。1440×900 的扫描也复现同一组问题。

源头是 `Brushed hardware` 与 `RoomBake_Brushed hardware` 的方向性反光计算：背光或掠射视角下退化的 GGX 分母产生非有限值。少量异常进入景深与泛光后污染大片画面。入口采样的 133 个原始异常像素，经景深成为 359 个，泛光后成为 3,187,440 个。

隔离试验显示，关闭泛光只能限制扩散，原始异常仍在；关闭材质方向性反光可同时消除源头异常与最终缺失。正式实现保留该材质效果，修正计算边界。

## 当前实现

- `archiveRenderSafety.ts` 为有方向性反光的物理材质安装局部编译钩子：无正向入射或观察分量时不计算该反射项，为可见性和分布函数的退化分母设置下限。保留约 0.32 的方向性强度、材质贴图、颜色、金属度和粗糙度。不会修改全局 ShaderChunk 或第三方源码；Three 着色器契约变化时明确失败。
- 原始场景后、景深之前增加有限值保护通道。NaN/Infinity 被转换为有限值，负值与超出半浮点范围的值受限，输出保持不透明，避免单个后续异常传播成全屏透明缺失。测试必须同时检查保护前的源画面，不能让保护层掩盖未修好的材质。
- About 书页重新直接渲染 `AboutDossier`，与实际章节共用完整排版、肖像和元信息。该组件不包含滚动占位、背景画布或章节动画副本。
- 书页使用同一组已检查近裁切和有效性的四角，投影完整 DOM 到书本上。78%–94% 展开，满屏后再转为原站配色；最终投影精确覆盖 viewport，避免交接时尺寸跳变。其他章节继续使用原有原生阅读表面。
- 开屏等待书页肖像解码以及字体准备；快跳、倒滚、舞台释放和 GPU 恢复继续由共享运行时管理。

## 回归方法

从仓库根目录对现有开发预览运行，可用 `ARCHIVE_BASE_URL` 改端口：

```sh
rtk proxy env ARCHIVE_BASE_URL=http://127.0.0.1:5191/ node tools/personal_space/checks/verify-pixels.mjs
rtk proxy env ARCHIVE_BASE_URL=http://127.0.0.1:5191/ node tools/personal_space/checks/verify-about-handoff.mjs
rtk proxy env ARCHIVE_BASE_URL=http://127.0.0.1:5191/ node tools/personal_space/checks/verify-artifacts.mjs
```

`verify-pixels.mjs` 在独立浏览器的响应中插入读取钩子，不改变网站资源。两种窗口尺寸、六段、51 个位置、正反两个方向，共 1,224 次检查：要求原始 HDR 非有限像素为零、最终输出缺失为零，且金属方向性保持开启。另在每种尺寸注入一个异常 HDR 像素，要求保护层输出有限、不透明像素，后续不扩散。完成后的数据位于 `output/playwright/archive-pixels.json`。

`verify-about-handoff.mjs` 覆盖普通和实验 Chrome，比较完整书页与实际 About 的内容、图片加载、字体和元素位置；进入与倒滚时只显示正确的阅读层。`verify-artifacts.mjs` 检查六段的投影范围及满屏变色边界。离散采样不代表所有浏览器和所有连续帧；以上检查不替代 tim 的美术验收。

## 资产与边界

- 本轮不修改或新增 Blender 工程，不重新导出模型。
- Blender SHA-256：`62ff2fc6ddfce16488cbb28040992d586a680f9b65186916910e1380fd535127`。
- GLB SHA-256：`c990c7d6c02b1b5ec25dfa26895dd889e9bc28e5aa0291fff5a8f616b79f9911`。
- 工作目录 `/Users/tim/DEV/TTT I'M/portfolio`，分支 `main`，基线 `d3739a1487ebca730303e0d03d05cce6a0760987`。保留已有未提交改动，不修改手机端或 Studio。
- 历史屏幕贴图位置、显示器图片比例、近景阴影修正仍保留；默认电脑画面仍为 PulseGraph。
- 第三方完整性守卫已有 `DecryptRevealVanilla.ts` 哈希差异，需单独披露，不能因为本修复通过而宣称全仓守卫全部通过。

## 本轮完成结果

- 普通 Chrome：两种桌面尺寸，六段正反向，共 1,224 次采样；原始 HDR 非有限像素 0，最终缺失像素 0。
- 实验 Chrome（CanvasDrawElement）：两种尺寸、每段 9 个包含原故障视角的进度、正反向，共 216 次采样；原始 HDR 非有限像素 0，最终缺失像素 0。数据在 `output/playwright/archive-pixels-experimental.json`。
- 四次单像素故障注入（两种尺寸 × 两种模式）均验证：异常实际进入 HDR 目标，保护层输出有限不透明像素，泛光没有扩散出缺失。
- 完整 About 的文字、图片、字体、位置及双向显隐，在普通和实验 Chrome 均通过；六段裁切与满屏变色边界通过。
- 快速跳章、活动/离屏 GPU 恢复、恢复期间换章、桌面缩放、恢复超时与重试通过。缩放测试现等待 ScrollTrigger 刷新布局后再计算目标位置，避免拿旧 pin 偏移做滚动定位。
- 生产预览完成 146 项开屏准备，失败与待处理为 0；进入房间和播放已有影片没有新增相关资源实际传输。
- 生产构建、Lint、108 项单元测试、差异空白检查退出码均为 0。构建前七项守卫通过，JS 572.8 / 576 KiB gzip、CSS 148.8 / 160 KiB gzip。
- 第三方完整性守卫仍退出码 1：`DecryptRevealVanilla.ts` 预期 `97b9d215…`、实际 `f5988307…`。该既存差异未在本轮修改，不宣称全仓守卫通过。
- Blender 与 GLB 哈希复核一致。本轮未提交或推送。
