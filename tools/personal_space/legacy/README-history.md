# 个人空间：灰模与材质细化

## 当前：模型先行，等待 tim 验收（2026-09-07）

当前交付见 [模型验收记录](../../docs/landing/delivery/model-review.md)。以下 Study 01/02 和网页导出命令为历史记录，**在 tim 明确要求接入前不要运行会覆盖共享 GLB 的 `build_scene.py` 或 `upgrade_reading_surface.py`**。

本轮脚本分工：

- `finish_model_review.py`：只加载和保存唯一活跃工程，检查节点、动作、图片打包和网站资源哈希；已有版本标记时不重建模型。
- `model_finish_work.py`：深抽屉、导轨、六份档案与独立动作。
- `model_finish_details.py`：照片墙、工作站、纸张和房间物件。
- `model_finish_common.py`：层级、命名、材质和表面辅助函数。
- `render_model_review.py`：从已保存工程生成七张 PNG；不保存工程或导出网页资产。

模型完成脚本以 `model-review/website-assets-before.json` 为接入边界基线；它记录的是进入本轮之前的网页资源，不应为绕过检查而自动刷新。模型、清单和 PNG 位于被 Git 忽略的 `output/design/personal-space-refined/`，并不意味着已提交远程。

```sh
rtk proxy /Applications/Blender.app/Contents/MacOS/Blender --background --python-exit-code 1 --python tools/personal_space/finish_model_review.py
rtk proxy /Applications/Blender.app/Contents/MacOS/Blender --background --python-exit-code 1 --python tools/personal_space/render_model_review.py
```

渲染时可在命令末尾加 `-- 02-about 06-work` 只输出指定视角。脚本只生成图片，不进行视觉评判。

## 当前版本：Study 02

设计方向见 [滚动叙事文档](../../docs/landing/experience/spatial-narrative.md)，资产规范见 [制作文档](../../docs/landing/assets/personal-space.md)。

- 细化工程：`output/design/personal-space-refined/tim-cai-personal-archive.blend`；原始灰模仍保留。
- 木材、灰泥、布料、纸张、地毯、陶瓷使用打包的颜色/粗糙度/法线贴图。木材 1024px，其他 512px。
- 增加杯内壁与把手、灯罩内壁/灯泡/弹簧、椅背木条、五金、笔记本缝线与页边、弯曲叶片。
- Blender 物件按建筑、家具、About、Life、Frame、Stack、Work、灯光相机分 collection。
- 393 个可编辑网格、46,464 个三角形；网页静态合并后 122 个网格，GLB 5.63 MiB。
- 网页增加一张 1024px 阴影贴图与冷窗光/暖台灯光；不代表完成真实设备性能或视觉验收。

生成细化版（不渲染、不进行视觉验证）：

```sh
rtk proxy blender --background --factory-startup --python tools/personal_space/build_scene.py -- --refined --skip-render
```

后续仅更新固定名称的现有工程，脚本不再生成 `.blend` 备份，并在后台生成进程中关闭 `.blend1` 保存备份。历史文件保留，不自动删除。工程不会自动同步到已打开的 Blender，需重新打开。去掉 `--skip-render` 可以生成供用户查看的渲染；本轮没有生成或查看渲染。

以下为保留的 Study 01 操作与交付说明；当前网页模型已更新为 Study 02。

第一阶段交付空间布局和一个可逆交互：入口 → 笔记本 → About 阅读 → 返回。
视觉验收由 tim 完成。当前使用基础材质、代理植物和简化家具，尚未进行木纹、墙面、地毯、烘焙灯光和最终构图制作。

## 打开

- 历史灰模：仓库内 `output/design/personal-space/personal-space.blend`；当前请打开上方固定名称的活跃工程。
- 本地 Landing 开发服务：`http://127.0.0.1:5173/lab?scene=personal-space`。
- 点击笔记本或“打开笔记本”进入；“返回空间”、关闭按钮或 Escape 返回。
- About 正文为 DOM，统计来自现有 `src/content`。该开发入口独立于正式章节，Studio 不在本次范围内。

## 重建

从 portfolio 仓库运行（默认生成细化版并更新唯一活跃工程、GLB、相机配置与渲染；运行前先协调 Blender 中尚未保存的手工修改）：

```sh
rtk proxy blender --background --factory-startup --python tools/personal_space/build_scene.py
```

只生成工程、模型和相机，不渲染：

```sh
rtk proxy blender --background --factory-startup --python tools/personal_space/build_scene.py -- --skip-render
```

macOS 的受限执行环境可能阻止 Blender 初始化 Metal；本次在允许本机图形访问后生成成功，未安装额外插件。

## 资产约定

- `build_scene.py`：布局、物件、镜头、灯光、导出；尺寸是设计假设。
- `primitives.py`：基础几何和材质辅助函数。
- `.blend`、四张参考渲染和 manifest 位于已忽略的 `output/design/personal-space/`。
- GLB 和相机 JSON 位于 `apps/landing/src/assets/personal-archive/`，由桌面滚动间奏与开发 lab 共用；正式构建包含模型资产，接近间奏时才请求。
- `NotebookHinge` 为书脊；`NotebookCover` 为其子节点；动画名 `NotebookOpen`。
- `ArchiveTray` 为档案托盘。其他章节仅有占位物件，尚未绑定交互。
- Study 01 GLB 约 2.67 MiB、282 个网格对象、33,664 个三角形。Study 02 数值见上方。
- Blender 灯光不导出到 GLB；当前网页使用独立的基础灯光，所以两者画面不完全一致。

## 检查

```sh
rtk proxy node tools/personal_space/verify-model.mjs --production
rtk proxy npm run typecheck --workspace=@timcai/landing
rtk proxy npm run lint --workspace=@timcai/landing
```

`--production` 需要先生成 Landing 的 `dist`，验证模型契约、生产模型与源资产一致，以及开发 lab 界面未进入生产产物。
浏览器已观察到加载、展开、正文焦点和 Escape 返回；手机视觉、减少动态效果、WebGL 丢失恢复及长时性能未完成验收。


## 书页与 Life 原位升级

`upgrade_reading_surface.py` 加载现有 `tim-cai-personal-archive.blend`，升级贴图与 `reading_details.py` 定义的书页、信封翻盖和照片抽出动画，然后覆盖同名文件、导出共享 GLB。`save_version=0`，不渲染、不新增 blend 副本。更新不会自动刷新 Blender 中已打开的内存场景；重新打开文件前请先处理自己的未保存修改。

当前 GLB 12.68 MiB、125 网格；网页预算 14 MiB。动画契约：`NotebookOpen`、`LifeEnvelopeOpen`、`LifePhotoExtract`。网页入口是正常 Landing；书页上的 HTML 排版由前端叠合，Blender 中查看几何、纹理和动画。
