# 个人空间制作工具

最新制作：`modeling/furnish_warm_archive.py` 原位追加温暖软装；`exporting/bake_web_materials.py` 与 `export_web_scene.py` 制作网页贴图和间接光，再运行优化及契约检查。见[当前交付](../../docs/landing/delivery/warm-archive.md)。下方电影感脚本是前一阶段入口，不应重建覆盖现在的软装。


当前模型制作入口：`modeling/finish_cinematic_model.py`，调用 `cinematic_materials.py`、`cinematic_details.py`、`cinematic_stage.py`。原位更新唯一工程，完成后重复运行只检查已保存的版本，不覆盖手工调整。它不渲染、不导出网页资源；详见[电影感制作交付](../../docs/landing/delivery/cinematic-model.md)。旧制作脚本属于历史阶段，不应重新运行来覆盖最新工程。

模型与预览从 [制作入口](../../art/personal-archive/README.md) 查找。目录整理已提交；后续近景收尾使用 `modeling/finish_transition_closeups.py`，配套预览使用 `rendering/render_transition_closeups.py`。两者都不会导出网页资源。

近景脚本原位修改唯一工程，带版本标记，重复执行不会覆盖手工调整；图片对应、正文承接表面的四角位置及结尾相机保存在 Blender 与 `reviews/closeups/model-manifest.json`。渲染脚本生成十个视角，不保存模型。技术检查不替代 tim 的视觉验收。

屏幕后续修正入口为 `modeling/refine_monitor_display.py`，两种屏幕状态的预览入口为 `rendering/render_monitor_display.py`。结果在 `reviews/monitor/`；默认项目画面，130 帧为照片窗口，160 帧恢复项目。只处理 Blender 屏幕，不导出网页资产。

## 按用途查找

| 目录 | 入口 / 职责 |
| --- | --- |
| `modeling/` | `finish_model_review.py` 及几何、材质、动作辅助模块；执行会保存活跃模型 |
| `rendering/` | `render_model_review.py` 从模型生成预览，不保存模型或导出网页资源 |
| `checks/` | `verify-model.mjs` 检查现有网页 GLB；`verify-runtime.mjs` 检查网站运行状态 |
| `exporting/` | `export_web_scene.py` 只读导出；`optimize_web_scene.mjs` 压缩网页颜色图；见该目录 README |
| `legacy/` | `build_scene.py`、`upgrade_reading_surface.py` 及历史操作说明；这些旧入口同时涉及模型修改和网页导出 |

空间转场功能回归：`checks/verify-chapters.mjs` 检查章节投射、退出与倒滚；`checks/verify-space-lifecycle.mjs` 检查快速跳章、GPU 中断恢复与超时重试。均使用独立桌面测试浏览器，不截图或评价画面。加载、热更新和几何检查见[修复记录](../../docs/landing/delivery/space-recovery.md)。

像素缺失回归必须包含 `checks/verify-pixels.mjs`：直接读取后处理前的 HDR 与最终画布，在两种桌面尺寸下逐段正反扫描，并注入一个 NaN/Infinity 像素检查异常隔离；输出在 `output/playwright/archive-pixels.json`。`checks/verify-about-handoff.mjs` 分别检查普通和实验 Chrome 下书页与实际 About 的文字、图片和布局一致性。两项通过 `ARCHIVE_BASE_URL` 指定现有预览服务，默认 `http://127.0.0.1:5173/`；像素检查可用 `HTML_CANVAS_EXPERIMENTAL=1` 覆盖实验模式。见[黑块修复记录](../../docs/landing/delivery/spatial-artifacts.md)。

此次脚本只调整路径和导入位置，几何、材质、动作、渲染参数、检查规则保持不变。`refine_scene.py` 仍在 `modeling/`，保留旧脚本依赖的函数，不在目录整理中拆解功能。

## 路径约定

- 活跃模型：`art/personal-archive/source/tim-cai-personal-archive.blend`
- 贴图：`art/personal-archive/textures/`
- 当前预览及清单：`art/personal-archive/reviews/current/`
- 网页模型：`apps/landing/src/assets/personal-archive/`，已按 tim 的第 2、3 步指示更新；当前状态见 [网页交付](../../docs/landing/delivery/web-choreography.md)

`reviews/current/website-assets-before.json` 仍记录建模验收轮开始前的网站资源哈希，不因搬迁重置。当前模型清单仅更新 `source` 路径，模型哈希及其他字段保持不变。

后续获得对应任务指示时，入口命令如下；这不是本轮已执行的操作：

```sh
rtk proxy /Applications/Blender.app/Contents/MacOS/Blender --background --python-exit-code 1 --python tools/personal_space/modeling/finish_model_review.py
rtk proxy /Applications/Blender.app/Contents/MacOS/Blender --background --python-exit-code 1 --python tools/personal_space/rendering/render_model_review.py
rtk proxy node tools/personal_space/checks/verify-model.mjs
```

渲染入口末尾可加 `-- 02-about 06-work` 选择视角。当前不要运行历史重建或升级脚本；它们会修改模型和网页资源，与目录整理的边界不同。历史记录保存在 [legacy/README-history.md](legacy/README-history.md)，里面的旧路径和统计仅作当时记录。
