# 网页导出职责

当前交付流程为 2026-09-11 的日出材质与烘焙流程。源模型继续使用 `art/personal-archive/source/tim-cai-personal-archive.blend`，只在原位更新获授权的 10 个道具材质与其独立 UV。

在仓库根目录设置 `TOKTX`、`KTX`，分别指向 Khronos KTX-Software 4.4.2 的 `toktx`、`ktx` 可执行文件，然后运行：

```sh
rtk proxy node tools/personal_space/exporting/rebuild_sunrise.mjs
```

流程先生成压缩基线，再校准灯光、制作道具贴图、烘焙 37 个接收材质的 AO/间接色、组装 ORM、压缩为 KTX2，最后验证几何、动画、受保护材质与源模型。验证的 SHA 必须与待交付文件一致，才替换网页资产。

现有法线和粗糙度使用原 UV/原分辨率。ORM 的 R/G/B 分别为 AO/粗糙度/金属度；AO 可以通过 glTF 的独立 `texCoord` 读取同一纹理的另一个 UV。RGB 间接色通过 `extras.archiveLightTexture` 单独传输，不占用 AO 槽。`RoomBake_` 名称保留，新增槽在 `archive_bake_slot` 中记录。

编码采用 UASTC quality 4、关闭 RDO、Zstandard 18、完整 mipmap。WebP/JPEG 基础色保留。tim 已明确放宽原 50 MiB 目标，以材质质量优先；构建继续报告真实总量，并计入 KTX2 解码器。

环境输入保存于 `art/personal-archive/textures/sunrise-bake/environment.json`，来自项目实际 RoomEnvironment PMREM；重建流程不启动浏览器，也不做前端视觉验证。中间结果及原文件备份位于 `output/material-optimization/`，仍需保留供回退和核对。

`bake_web_materials.py`、`export_web_scene.py`、`optimize_web_scene.mjs` 是旧导出链，不要在日出交付后直接运行并覆盖新资产。完整记录见[材质交付](../../../docs/landing/delivery/material-optimization-20260911.md)。
