# 桌面空间叙事接入

> 历史阶段记录。当前房间软装、网页烘焙、共享渲染和加载策略以[温暖档案室交付](warm-archive.md)为准。下方哈希、预算与生命周期描述保留为当时版本。

2026-09-07。按 tim「先把你设计的内容做好了，也就是 2、3」接入桌面 Landing。模型工程未保存、未新增；网页 GLB 从当前工程只读导出。视觉、光影与节奏由 tim 验收。未提交或推送本轮工作。

## 已接入的主线

| 位置 | 当前实现 | 阅读接管 |
| --- | --- | --- |
| Hero → About | 保留原 Hero；房间靠近书桌，封面打开，AboutDossier 投射到真实书页四角，靠近并铺满视口 | 原 About 与解密效果 |
| About → Life | 从书桌转向书架，信封打开、足球照片抽出；Life 首屏投射到照片后归正 | 原 Life 文案、DriftWall；桌面照片可打开现有 PhotoSwipe |
| Life → Frame | 从书架移向照片墙，纸张动作与相机均按滚动取样；Frame 首屏从照片平面展开 | 原 Frame 摄影索引、横向主题、HUD |
| Frame → Stack | 最后风景图沿可逆波形进入显示器内同一图像，再靠近屏幕；Stack 首屏从屏幕展开 | 原 Stack 技能行与红线 |
| Stack → Work | 显示器移向档案柜，抽屉拉开，首份档案抬起；Work 开场从封面展开 | 原项目开场、Glass、卡片与 SciScope；顺滚进入时触发原 Laser |
| Work → Contact | 文件放回、抽屉回收，镜头退到房间暖光构图；原 Contact 首屏接管 | 保留联系按钮、字体、Iris 与局部 Liquid |
| 项目 → 详情 | 点击时的活动封面连续展开至详情首图，分别处理图片尺寸与裁切；关闭回收 | 原 Base UI Dialog、证据长文、图片查看器 |

各空间段共享同一个 GLB 和渲染生命周期。About 使用专用书页轨道，其余五段使用 `chapterTracks`；空间段只在附近挂载，可见且页面 live 才按需绘制。结束后释放 Canvas，倒滚重新按当前位置取样。

## 资产与画质

- 活跃工程：`art/personal-archive/source/tim-cai-personal-archive.blend`。
- 源 SHA-256：`6deccfb4e2dc60c7ab938689ecdc495f829dcb89e603da3446515d7f0cc2fccb`。
- 网页资产：`apps/landing/src/assets/personal-archive/personal-space.glb`，14,141,520 bytes，13.49 MiB，76 meshes。
- 新 `scene-contract.json` 保存相机、四角节点与屏幕状态名称；现有书页镜头基准继续使用 `cameras.json`。
- 导出保留动作节点；静态几何按父节点和材质合批；普通颜色图采用高质量压缩，法线、粗糙度与带透明材质保留数据。
- 网页使用 PBR 贴图、环境反射、冷窗光和暖台灯、软阴影、ACES 色调映射、抗锯齿与最高 2 倍 DPR。此处记录配置，不代表美术验收通过。
- 默认屏幕仍显示项目。Frame → Stack 的临时照片状态由网页控制，使用真实摄影尾图并保持原比例；不写回 Blender。

## 交接与异常行为

阅读副本复用真实章节的内容和 CSS，移除交互、Canvas 与运行标识；SVG 蒙版使用独立 ID。物件动画采样后再投影真实四角，最后归正为实际视口。章节导航对空间目标精确落到正文起点，跳过空间运动；摄影子章节继续使用原导航留白。

显示器里的照片采用网页波形形变，替换桌面原来的粒子交接段，共用房间的 WebGL context。没有并排运行两段图像消散。书页、照片、档案的几何厚度与实体动作仍来自模型。

慢加载、配额等待、模型失败时保留文字与直接阅读链接。首帧就绪在实际提交绘制后报告；屏幕外预取等待不算首帧超时。快速跳过取消过期加载，反向进入恢复当前进度，页面后台停止绘制。

项目 URL 使用 `?project=<id>#projects`，保留其他参数。从列表打开写入一次历史；关闭返回列表；刷新、直接访问和前进/后退从 URL 恢复。直接访问后关闭只移除参数，无效 ID 回到列表。详情开启期间章节监听不覆盖 URL。转场遇到缺失目标、窗口变化、Escape 或超时均恢复真实 DOM；长文关闭时首图已不在视口则直接返回，不把正文先滚到顶部。延迟模块失败有返回和重新加载入口。

## 当前版本与设计 v1 的取舍

本轮完成空间主线与项目详情的网页实现。相比最初分镜，Life/Frame 首屏采用真实 DOM 在照片平面上的投射，而非把一张照片准确停进漂移中的某一个卡位；Frame → Stack 采用保留完整图像的波形，Contact 接回原站浅色结尾。Hero 可选窗光、照片背面和杯具自由探索不属于本轮必需项。

这些区别明确记录，避免把设计提案当成已实现细节。后续优先根据 tim 实际检查调整镜头距离、动作区间、投影放大速度与色调，无需先重建房间或改写原章节。

## 技术检查入口

```sh
rtk proxy npm run typecheck:landing
rtk proxy npm run lint:landing
rtk proxy npm run build:landing
rtk proxy npm run test:unit --workspace @timcai/landing
rtk proxy npm run test:guards --workspace @timcai/landing
rtk proxy node tools/personal_space/checks/verify-model.mjs --production
rtk proxy node tools/personal_space/checks/verify-runtime.mjs
rtk proxy node tools/personal_space/checks/verify-chapters.mjs
```

运行脚本只检查状态、几何有效性、阅读入口、历史和资源释放，不截图、不评价效果。全站 JS gzip 上限从 560 调为 564 KiB，Projects 从 18 调为 19 KiB，用于五段轨道与详情历史/恢复；首屏、Hero 与空间载入器上限不变，新增章节渲染包单独限制为 5 KiB。

已完成：类型检查、Lint、生产构建、106 项单元测试、模型与生产资产契约；五段转场的内容投射、反向恢复及画布释放，详情打开/关闭/前进/刷新；生产预览两项 Frame→Stack 与 Stack→Work 滚动测试。构建守卫中的 chunks、architecture、frame、loader、content、bytes、effects 通过。最终 JS 为 560.8 KiB gzip，CSS 为 148.7 KiB gzip。

已有失败仍保留：vendor 完整性检查中 `DecryptRevealVanilla.ts` 与清单哈希不一致。这在[此前空间交付](personal-space.md)已记录，本轮没有修改该源文件或将清单改成通过值。

最终运行复查通过：六个正文锚点直达均释放空间层；Life 图片可打开并用 Escape 返回，包括展开过程中立即关闭；项目历史复查通过。PhotoSwipe 的展开期间关闭请求现在会在打开动作结束时执行，不再丢失 Escape。
