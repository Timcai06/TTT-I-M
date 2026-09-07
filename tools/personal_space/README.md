# 个人空间制作工具

模型与预览从 [制作入口](../../art/personal-archive/README.md) 查找。当前只完成目录整理；本次未运行建模、渲染、导出或网站运行检查。

## 按用途查找

| 目录 | 入口 / 职责 |
| --- | --- |
| `modeling/` | `finish_model_review.py` 及几何、材质、动作辅助模块；执行会保存活跃模型 |
| `rendering/` | `render_model_review.py` 从模型生成预览，不保存模型或导出网页资源 |
| `checks/` | `verify-model.mjs` 检查现有网页 GLB；`verify-runtime.mjs` 检查网站运行状态 |
| `exporting/` | 导出职责说明；当前尚未有独立导出入口 |
| `legacy/` | `build_scene.py`、`upgrade_reading_surface.py` 及历史操作说明；这些旧入口同时涉及模型修改和网页导出 |

此次脚本只调整路径和导入位置，几何、材质、动作、渲染参数、检查规则保持不变。`refine_scene.py` 仍在 `modeling/`，保留旧脚本依赖的函数，不在目录整理中拆解功能。

## 路径约定

- 活跃模型：`art/personal-archive/source/tim-cai-personal-archive.blend`
- 贴图：`art/personal-archive/textures/`
- 当前预览及清单：`art/personal-archive/reviews/current/`
- 网页模型：`apps/landing/src/assets/personal-archive/`，当前保持原样

`reviews/current/website-assets-before.json` 仍记录建模验收轮开始前的网站资源哈希，不因搬迁重置。当前模型清单仅更新 `source` 路径，模型哈希及其他字段保持不变。

后续获得对应任务指示时，入口命令如下；这不是本轮已执行的操作：

```sh
rtk proxy /Applications/Blender.app/Contents/MacOS/Blender --background --python-exit-code 1 --python tools/personal_space/modeling/finish_model_review.py
rtk proxy /Applications/Blender.app/Contents/MacOS/Blender --background --python-exit-code 1 --python tools/personal_space/rendering/render_model_review.py
rtk proxy node tools/personal_space/checks/verify-model.mjs
```

渲染入口末尾可加 `-- 02-about 06-work` 选择视角。当前不要运行历史重建或升级脚本；它们会修改模型和网页资源，与目录整理的边界不同。历史记录保存在 [legacy/README-history.md](legacy/README-history.md)，里面的旧路径和统计仅作当时记录。
