# 书本阳光修复 · 2026-09-12

目标是让书上的晨光保留窗框投射方向，同时恢复纸张本色、阴影中的细节和柔和边缘。tim 授权效果需要时更换技术、修改文档和注释。本次通过现有 Three.js / WebGL 修复，不需要增加渲染后端。

## 诊断依据

基线 `main` / `0a6f9cf1b674532d6c0fe05fe8623fcd484f792a`，工作区干净。真实浏览器为 headed Chromium，WebGL 通过 ANGLE Metal 使用 Apple M5 Pro，1440 × 900，MSAA 4x。检查的是项目实际网页，HTML-in-Canvas 处于正常 DOM fallback，三维房间使用 WebGL。

- 关闭太阳实时阴影，书上斜向黑块消失；关闭台灯阴影没有消除它。
- 保留太阳阴影、关闭 AO，纸面由棕色 / 近黑恢复为浅暖纸色 / 灰色阴影，页边密集的黑白颗粒明显减少。
- 运行时阴影类型为 `2`（`PCFSoftShadowMap`）。Three.js r182 的 `WebGLProgram` 只为 PCF 和 VSM 选择对应分支，其余落到 BASIC。该版本 `WebGLShadowMap` 的旧类型兼容判断读的是 `lights.type`，没有修正 renderer 的类型。实测切换 `PCFShadowMap` 后深度纹理使用比较采样（`LessEqualCompare`，515），阴影边缘得到过滤。
- 模型烘焙脚本在节点的默认闭合姿态烘焙 AO 和间接光，没有为开书状态生成另一套贴图。它们不能继续代表打开后的纸面和翻转封面。

上游实现：[r182 WebGLProgram](https://github.com/mrdoob/three.js/blob/r182/src/renderers/webgl/WebGLProgram.js)、[r182 WebGLShadowMap](https://github.com/mrdoob/three.js/blob/r182/src/renderers/webgl/WebGLShadowMap.js)。

## 最终实现

1. 主运行时和旧 R3F 灯光组件显式使用 `PCFShadowMap`。太阳保持原方向、色彩及强度；4096 阴影图配合 3 texel 过滤半径。半径是图像过滤宽度，不宣称模拟随遮挡距离变化的物理半影。
2. 在 shader 准备前，为 `Notebook*`、`About_*` 及其子节点创建独立材质副本。去掉书本的 AO 和间接光贴图及对应加载标记，保留基础色、法线、粗糙度等原纹理。
3. 书本由现有环境反射、半球填充、实时太阳和台灯共同照亮；封面与纸页继续投射和接收真实阴影。房间其他物件保留原烘焙，即使共用 `Paper_fiber` 或 `Linen_natural`。
4. 每个源材质只复制一次。释放时恢复源材质，释放副本的 GPU 程序；共享纹理仍交给模型统一释放。

这是一套适合当前交互场景的实时近似，没有计算动态全局光照。GLB、Blender 源文件、几何、动画、相机路径保持原样。旧烘焙文档中的“全部漫反射接收材质在运行时使用闭合姿态烘焙”不再适用于书本。

## 验证与证据

对照图片保存在 `output/playwright/book-light/`，该目录为本地忽略的证据目录，不随 Git 交付。`comparison.html` 提供原始截图的同机位滑块对照和书本放大；修改前为基线开发预览，修改后为生产构建，动态屏幕内容可能不同。

- `node --test tests/archiveBookMaterials.test.ts tests/archiveAnimationRig.test.ts`：8 项通过，退出码 0。覆盖共享材质隔离、纹理保留、释放所有权、材质数组与真实 GLB 动画绑定。
- `npm run typecheck:landing`、修改过的 5 个 TS/TSX 文件的 ESLint：通过，退出码 0。
- `npm run build:landing`、`npm run test:guards --workspace @timcai/landing`：通过，退出码 0。构建体积提示仍为 advisory；构建日志和 guards 日志分别为 `build.log`、`guards.log`。
- 开发预览实际 WebGL shader：41 个程序包含 `SHADOWMAP_TYPE_PCF`，renderer 类型为 `1`。书页材质不再带 AO / 间接光贴图。
- 生产预览关闭所有诊断注入后，采样开书与反向返回共 9 个滚动位置：全部 `ready`，无 sample fallback，无页面 JS 异常。另检查五段章节过渡的中间位置：全部 `ready`，无 sample fallback。
- agent 已查看房间远景、封面、开书与近景的实际截图：原来的近黑色斜块消失，纸色恢复，投影边缘得到过滤，页边颗粒明显减少。生产截图为 `production-1600.png`、`production-1950.png`、`production-2450.png`。
- GLB SHA-256 仍为 `f79c081dd3a3e38224b67bfbbc122bec89dda8906d9865a41535874ca11d5417`，未修改资产。

本地 Vite preview 中 Vercel 的两个遥测脚本返回 404；无对应渲染或页面 JS 失败。上述检查针对 Chromium / Apple M5 Pro 和 DOM fallback 展示模式，没有覆盖其他 GPU、浏览器或实验性 HTML-in-Canvas 路径。技术检查和 agent 的截图检查不能替代 tim 对晨光氛围的验收。未提交、推送或部署。

## 回退

移除 `archiveRuntime.ts` 中书本材质准备调用和对应 import，恢复两个灯光文件原来的类型并移除太阳过滤半径，即恢复旧运行时外观。资产没有变更。
