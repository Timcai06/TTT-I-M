# 网页导出职责

只读打开唯一活跃工程；网页调整仅发生在内存中，不保存或新增 `.blend`。

按顺序运行：

```sh
rtk proxy /Applications/Blender.app/Contents/MacOS/Blender --background --python-exit-code 1 --python tools/personal_space/exporting/bake_web_materials.py
rtk proxy /Applications/Blender.app/Contents/MacOS/Blender --background --python-exit-code 1 --python tools/personal_space/exporting/export_web_scene.py
rtk proxy node tools/personal_space/exporting/optimize_web_scene.mjs
rtk proxy node tools/personal_space/checks/verify-model.mjs
```

第一步烘焙原生材质，清单绑定源 SHA；第二步检查 SHA，建立状态组、摄影机和定位契约，合批静态几何并烘焙间接光。第三步压缩颜色图片，给 RGB 间接光建立独立图片，保留数据贴图无损，移除不再使用的传输图片并重建 GLB 偏移。上限为 20 MiB。

`verify-model` 检查动作节点、贴图尺寸、图集坐标、间接光 RGB 与源文件一致、粗糙度与间接光没有混用图片。加 `--production` 检查构建产物也使用同一份资产。

不要用 `legacy/` 覆盖本流程；旧脚本可能重建或保存模型。当前成果与限制见[交付](../../../docs/landing/delivery/warm-archive.md)。
