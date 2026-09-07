# 章节交接的建模任务

更新：2026-09-07。状态：章节物件已完成一轮 Blender 制作，等待 tim 视觉验收；网页接入未执行。配套 [整站效果设计](../experience/full-site-choreography.md)与[本轮模型交付](../delivery/model-review.md)。下方表格保留设计契约，实际节点以交付记录及模型清单为准。

## 工作方式

沿用唯一活跃工程 `art/personal-archive/source/tim-cai-personal-archive.blend`。不新增 `.blend` 或 `.blend1`。**当前先完成模型及预览，等待 tim 明确指示后才导出更新共享 GLB、相机配置和前端。** 原位修改前读取实际节点，保留已有编辑，不重建整间房代替局部修改。

旧网页导出已包含笔记本、Life 信封与照片、四张 `ArchivePhoto`、六个 `ArchiveFolder`、显示器和抽屉面板。本轮只更新 Blender 源工程；网页导出有意保持上一版本，两者此时不要求内容一致。

## 按章节制作

| 用途 | 当前可复用物件 | 待制作内容 | 预期导出契约 |
| --- | --- | --- | --- |
| About | `NotebookHinge`、`NotebookCover`、`NotebookReadingSurface` | 保留现有书页；仅随实际镜头修正边缘接缝 | 保留 `NotebookOpen` 与当前阅读锚点 |
| Life → Frame | `LifeMemoryPhoto`、`ArchivePhoto_01…04`、`PhotoClip_01…04`、挂杆 | 固定同图对应；图像面和纸边分开，夹具与纸张保留独立层级 | `FrameEntryAnchor`、`FramePrintPivot`、`FramePrintSettle` |
| Frame → Stack | `Monitor screen`、`Monitor bezel`、底座 | 清楚的屏幕内边界、薄玻璃层与屏幕角点；文字由前端承载 | `StackScreenAnchor`、`StackScreenSurface` |
| Stack → Work | `Drawer_01_front`、标签、`ArchiveFolder_01…06` | 把首个抽屉的相关面板、把手、底板和档案归到同一导轨父节点；首份封面单独枢轴 | `WorkDrawerRoot`、`WorkFolderPivot`、`WorkCoverAnchor`、`WorkDrawerOpen`、`WorkFolderLift` |
| Work → Contact | 打开的书、照片、台灯、微开抽屉 | 建立结尾镜头和文字安全区；只调整镜头可见的桌边细节 | `ContactCameraAnchor`；优先复用已有物件姿态 |

书页/屏幕/档案封面的真实文字由共用 DOM 组件或前端展示面承担，不把中文正文烘进低分辨率贴图。网页和 Blender 的职责在交付时明确：Blender 提供物理表面、枢轴、材质和姿态；网页提供可读内容与交接。

## 动画与坐标

新增枢轴放在真实连接处，抽屉移动轴与柜体一致，纸张旋转轴位于夹具下方。各动画独立于相机，采用可正反采样的 clip，不依赖前一条动画播放完成。

Blender 使用 Z 向上，网页资产为 Y 向上。导出锚点位置、朝向及表面尺寸，前端读取同一数据；新增章节不再各自手写一份无法核对的纸面坐标。正视相机下的表面角点应能与网页四角准确对应。

现有 `NotebookOpen`、`LifeEnvelopeOpen`、`LifePhotoExtract` 动作名称保留。当前完成脚本有版本标记：重复执行不重建已完成模型，避免覆盖后续手工调整。新增修改采用有界迁移；关键锚点不依赖 Blender 自动生成的 `.001` 后缀。

## 纹理、灯光与预算

当前 GLB 为 12.68 MiB、125 网格，已有 14 MiB / 150 网格预算。优先复用木材、纸张、金属和真实图片，新增近景节点不自动提高全屋贴图分辨率。预算不够时先检查重复贴图与批处理，再决定是否需要独立近景资源，不能悄悄放宽上限。

环境反射与窗/灯方向保持一致。显示器屏幕、纸张内容、金属夹具分别控制粗糙度；不让文字受到过强反射或暗部影响。真实照片保持比例，裁切在源图/展示面契约中明确。

本阶段不引入必须先购买的模型、HDRI 或材质包。现有资源足以建立完整镜头路线；后续若某个近景确实需要扫描材质，再提出具体资产与用途。

## 每次导出的技术交付

记录更新的唯一工程路径、GLB 字节和网格数量、独立节点与动画名称、表面尺寸和坐标系。检查既有照片、书脊和新动作均能从 GLB 读取，生产资源与当前源资产一致。截图、离线渲染和效果优劣由 tim 决定是否需要；建模结构检查不代替美术验收。
