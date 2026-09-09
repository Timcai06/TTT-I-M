# 景观窗模型交付

2026-09-08。由 PM 当前会话直接接手并完成本轮模型收尾；DEV 已停止模型工作。状态：模型已保存，等待 tim 美术验收；未接入网站。

## 打开的文件

`/Users/tim/DEV/TTT I'M/portfolio/art/personal-archive/source/tim-cai-personal-archive.blend`

原位保存，没有新增 .blend 或 .blend1。若 Blender 已打开旧场景，需要先处理自己未保存的编辑，再重新打开磁盘上的同一文件；磁盘更新不会实时替换内存场景。

默认摄影机 `WindowRoom_01_Overview`，时间轴第 72 帧，笔记本打开。第 1 帧为闭合姿态。

| 摄影机 | 用途 |
| --- | --- |
| WindowRoom_01_Overview | 房间、大窗、书桌和章节物件 |
| WindowRoom_02_Desk | 桌面、书页、显示器与窗景关系 |
| WindowRoom_03_Window | 窗框、玻璃、帘与外景 |
| WindowRoom_04_Structure | 房间结构 |
| WindowRoom_05_Book | 纸张厚度与书桌近景 |
| WindowRoom_06_Screen | 显示器边框、支架与背后窗户 |

从 Outliner 选择对应摄影机，使用 View → Cameras → Set Active Object as Camera（Ctrl+小键盘0），再看摄影机视图。工程内 `START HERE - Window room review` 也记录入口。

## 本轮实际修改

保留已制作的真实后窗开口、分段墙体、三片窗玻璃、窗框与亚麻帘，以及原来书架、照片墙、笔记本、抽屉的空间位置。

PM 直接重做了窗外：移除先前的山形和树形剪影层，以连续三维地形形成湖盆、岸线、山脊。水面为水平反射面；六种有体积的针叶树共享网格生成森林及近处树木。天空采用 Blender 5.2 的多次散射模型，夕阳方向与太阳灯统一，远处有独立低密度大气层。没有把参考房间图片贴成窗外背景，也没有新增外部图片依赖。

玻璃使用直通透射与菲涅耳反射，兼容材质预览和 Cycles；窗光/补光关闭镜面贡献，避免矩形灯源反射遮住景观。补充内侧木窗台、窗把手、窗帘挂环；降低纸张、灰泥、木材、亚麻的过强微凹凸，保留原纹理连接与真实照片。

材质预览默认启用场景灯光与世界；Cycles 视口开启降噪及自适应采样，预览 96 samples，离线 512 samples。该参数是工作设置，不是已通过画质/帧率验收的声明。相机远裁面随新地形深度更新。

## 数据与保护检查

- 保存后在新的 Blender 后台进程重新打开成功，脚本退出码 0。
- 所有使用中的图片/库依赖完整。
- 关键书本、信封、照片、抽屉枢轴和阅读四角在 1/25/72/110/130/160 帧保持原有世界变换；原动作名称保持。
- 场景 1992 个对象，地形 30,951 顶点，1,053 棵树复用六个网格。唯一网格基础三角形统计 176570；该值不等于实例化后的总渲染面数。
- 新场景分层主要位于 `15 Lake landscape - terrain and forest` 与 `16 Window joinery and textile details`。
- apps/packages 共 611 个文件逐文件 SHA-256 与建模前一致；网站 GLB、相机契约和前端未变。
- 活跃和历史工程的文件列表完全一致，没有额外工程副本。
- 源文件 SHA-256：`56d4962f7183cdb7dfe64f2487c51c6510700c6dc3c17dd3952b438747e1f007`。

证据：`art/personal-archive/reviews/window-room/lake-finish-manifest.json`、`output/pm/lake-window-isolation.json`。

## 后续边界

本次 PM 未渲染或检查成片，没有代替 tim 做美术验收。几何景观是依据参考构图的程序化建模，不声称已与参考图逐像素一致。窗景、玻璃与灯光是否符合预期由 tim 在 Blender 判断。

本轮没有运行网页导出、网页材质烘焙、提交、推送或部署。新三维景观、程序材质和天空需要在 tim 认可后另做网页制作与接入；当前网页仍使用之前的模型。
