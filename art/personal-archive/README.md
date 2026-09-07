# Personal Archive · 个人空间制作入口

当前阶段：**目录整理完成，模型内容保持原样，等待 tim 检查与后续指示。**

## 打开模型

唯一活跃工程：[tim-cai-personal-archive.blend](source/tim-cai-personal-archive.blend)。

绝对路径：

```text
/Users/tim/DEV/TTT I'M/portfolio/art/personal-archive/source/tim-cai-personal-archive.blend
```

这是原文件的移动，没有重建或重新保存模型。若 Blender 仍开着旧路径，请从新路径重新打开；本次没有操作已打开的 Blender，也没有改动其未保存状态。

## 目录

| 目录 | 放什么 |
| --- | --- |
| `source/` | 唯一活跃 Blender 工程 |
| `textures/` | 原有材质贴图文件；模型中已有的打包贴图保持不变 |
| `references/` | 概念参考说明与最初建模交接；其中桌面参考图片链接仍指向原文件 |
| `reviews/current/` | 当前七张预览、模型清单、渲染记录和本次搬迁核对清单 |
| `history/graybox/` | 最初灰模和预览 |
| `history/backups/` | 既有日期备份，不作为继续制作的入口 |
| `history/legacy-refined/` | 旧细化阶段清单和遗留 `.blend1` |
| `history/legacy-design/` | 原设计目录的 Finder 元数据 |

制作脚本见 [工具入口](../../tools/personal_space/README.md)，设计与交付见 [文档目录](../../docs/README.md)。历史网站构建日志在 `output/logs/personal-archive/`。

本次只改变磁盘目录，不更新 `.blend` 内部记录的历史路径或渲染输出路径，以保证文件字节完全不变。后续若在 Blender 中手动渲染，请自行将输出选择为 `reviews/current/`；制作脚本的路径已随迁移更新。

网页资源仍在原应用目录，未导出或覆盖。前端开发、近景建模收尾均未在本次执行。大体积模型、贴图、预览及历史文件继续仅保存在本地，不因移出 `output/` 而自动进入 Git。
