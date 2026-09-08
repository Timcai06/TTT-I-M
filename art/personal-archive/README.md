# Personal Archive · 个人空间制作入口

当前阶段：**温暖软装、材质与光影已原位更新，并制作网页资产。** 设计来源、新增物件、当前哈希与整站预备加载见[本轮交付](../../docs/landing/delivery/warm-archive.md)。视觉验收由 tim 完成。

屏幕最新修正：默认恢复 PulseGraph 项目；时间轴第 130 帧查看照片窗口，第 160 帧恢复项目。屏幕特写与最新模型哈希见 `reviews/monitor/`。网页默认使用项目，Frame → Stack 使用照片过渡状态。

支架已移至屏幕后方，底座位置同步调整。两种屏幕状态继续保留。最新工程哈希见 `reviews/cinema/model-manifest.json`；`reviews/monitor/stand-fix.json` 记录支架修正时的历史版本。

## 打开模型

唯一活跃工程：[tim-cai-personal-archive.blend](source/tim-cai-personal-archive.blend)。

绝对路径：

```text
/Users/tim/DEV/TTT I'M/portfolio/art/personal-archive/source/tim-cai-personal-archive.blend
```

目录整理时只移动了原文件；后续近景制作已在这个固定路径原位更新。若 Blender 仍开着旧场景，请处理自己的未保存修改后从这里重新打开。后台保存不会自动刷新已打开的内存场景。

## 目录

| 目录 | 放什么 |
| --- | --- |
| `source/` | 唯一活跃 Blender 工程 |
| `reviews/cinema/` | 最新电影感制作清单与网站哈希基线；本轮未生成渲染图片 |
| `reviews/monitor/` | 最新屏幕修正的两张特写及清单 |
| `textures/` | 原有贴图；`web-cinema/` 为最新网页材质与间接光烘焙 |
| `references/` | 概念参考说明与最初建模交接；其中桌面参考图片链接仍指向原文件 |
| `reviews/closeups/` | 屏幕修正前的近景收尾版预览和清单；包含 Contact、书页和档案特写 |
| `reviews/current/` | 上一轮七张预览和清单，以及目录搬迁核对清单、网站哈希基线；保留作对照 |
| `history/graybox/` | 最初灰模和预览 |
| `history/backups/` | 既有日期备份，不作为继续制作的入口 |
| `history/legacy-refined/` | 旧细化阶段清单和遗留 `.blend1` |
| `history/legacy-design/` | 原设计目录的 Finder 元数据 |

制作脚本见 [工具入口](../../tools/personal_space/README.md)，设计与交付见 [文档目录](../../docs/README.md)。历史网站构建日志在 `output/logs/personal-archive/`。

目录整理时没有重写 `.blend` 内的历史路径。近景制作仍复用已有打包贴图；若在 Blender 中手动渲染，请将输出选择为 `reviews/closeups/`。脚本会自行设置对应输出位置。

网页资源仍在原应用目录，已有接入见[网页交付](../../docs/landing/delivery/web-choreography.md)。本轮模型已导出到共享 GLB。大体积模型、贴图、预览及历史文件继续仅保存在本地，不因移出 `output/` 而自动进入 Git。
