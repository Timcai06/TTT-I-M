# 空间交付记录

当前范围：桌面端 Landing 与建模空间；手机端和 Studio 暂缓。视觉效果由 tim 验收。

## 01 · 灰模（已生成）

- 独立 Blender 工程、GLB、相机、四张渲染。
- 入口、笔记本展开、About DOM 阅读、返回的开发试验。
- 正式 Landing 未切换为空间入口，Studio 未修改。

## 02 · 材质与近景细化（已生成，待用户视觉验收）

目标：可导出的纹理与法线、家具细节、纸张与杯具、灯具结构、植物形状、窗侧与台灯光照。

设计基准见 [滚动叙事方向](../experience/spatial-narrative.md)。本阶段不实现全站滚动重构，也不将临时阅读卡片作为最终方案。

实际产物：`art/personal-archive/source/tim-cai-personal-archive.blend` 与开发预览 GLB。393 个可编辑网格，46,464 个三角形，网页合并为 122 个网格，GLB 5.63 MiB。颜色、法线、粗糙度均通过 glTF 材质契约检查。笔记本枢轴、动画、照片打包检查通过，Landing 类型检查与 Lint 通过。

本轮没有查看渲染、截图或浏览器画面；视觉验收由 tim 完成。程序纹理不是实拍扫描；离线与实时光照不保证一致。全站滚动接入、最终光照烘焙、移动端性能仍未完成。

Landing 生产构建通过；针对最新构建的检查确认开发模型及动画未进入生产产物。构建日志保存在 `output/logs/personal-archive/build.log`。本轮未运行完整历史守卫套件，未提交或部署。

## 03 · 桌面滚动首段接入（已实现，待用户视觉验收）

正常首页现按「原 Hero → 个人空间 → 原 About」排列。空间作为独立滚动过渡段，相机推进与笔记本展开由滚动进度驱动，支持倒滚；About 正文和既有解密效果继续沿用。详细契约见 [桌面空间首段](../experience/desktop-archive-entry.md)。其余章节的空间衔接尚未实现。

GLB 与相机配置移到 Landing 共享资源目录，由正式入口与 Lab 共用；模型接近视口才加载，并使用现有 WebGL 配额与释放机制。未修改或新增 Blender 文件，未处理手机端或 Studio。

验证：类型检查、Lint、生产构建、模型生产打包契约、16 项针对性测试、`git diff --check` 均通过。构建守卫中 chunks、architecture、frame、loader、content、bytes、effects 通过；vendor 守卫仍因原有 `DecryptRevealVanilla.ts` 哈希不匹配失败，本轮未修改该文件或校验值。JS gzip 总量为 549.9 KiB；为延迟加载的模型解析与场景模块将总预算从 540 调为 560 KiB，原入口和 Hero 的独立预算不变。

构建日志：`output/logs/personal-archive/scroll-integration-build.log`。查看入口为正常首页 `http://127.0.0.1:5173/`，从顶部向下滚动。本轮未进行浏览器视觉验证，未提交或部署。


## 04 · 书页进出 About 与画质升级

已实现真实 About 排版的纸面投影、镜头推进及全屏交接；原 About 阅读结束后，结尾页退回书本，镜头移向 Life 信封，翻盖打开并抽出真实照片。详见 [桌面书页叙事](../experience/desktop-archive-entry.md)。

现有规范命名 Blender 文件原位升级，未新增工程或渲染。新增独立书页面、Life 信封枢轴与照片动画，网格 125 个；主要纹理分辨率翻倍，GLB 从 5.63 MiB 增至 12.68 MiB，预算 14 MiB。高档位空间 DPR 2、2048 阴影、最高 8 倍各向异性采样与预过滤环境反射已接入。

本轮不做浏览器截图、渲染及视觉评分，由 tim 在正常首页滚动验收。未提交、未部署。构建记录：`output/logs/personal-archive/reading-transition-build.log`。


最终技术检查：生产构建（含 TypeScript）、Lint、17 项滚动/投影/上下文/章节测试及模型生产契约检查通过；`git diff --check` 通过。chunks、architecture、frame、loader、content、bytes、effects 守卫通过，vendor 仍为既有 DecryptReveal 文件哈希不匹配，未改写供应商文件或校验值。当前 JS gzip 551.4 KiB / 560 KiB、CSS gzip 148.5 KiB / 160 KiB。模型预算独立于图片预算。


## 05 · 加载黑屏修复（2026-09-06）

修正显示就绪契约：不再把 Canvas 创建当作首帧就绪，改为在 R3F 提交绘制且 context 有效后通知桥接层；超时覆盖到首帧。模型未就绪时不提前隐藏入口文案和原 About，始终保留阅读入口，失败状态也有可见文案。

本地运行检查确认正常及实验性 Canvas 模式没有页面异常；场景提交了实际绘制。以延迟模型请求重现加载阶段，并验证提示可见、资源放行后就绪、About 正文交接及 context 释放、倒滚重载、失败阅读入口。未截图、未做视觉评分。复用脚本：`node tools/personal_space/checks/verify-runtime.mjs`（需要本地 Vite 服务）。

## 06 · 全站设计 v1 定稿（2026-09-07）

完成 [全站效果编排](../experience/full-site-choreography.md)、[交互交接规格](../experience/interaction-contracts.md) 和 [章节建模任务](../assets/chapter-modeling-plan.md)。覆盖 Hero 至 Contact、项目展开/返回、照片查看、目录与导航、详情深链、慢加载和失败退路。

此轮交付是设计规格；没有修改前端效果或 Blender 文件。新增转场尚待实现，当前书页路线和黑屏修复继续作为运行基准。设计文档不作为视觉验收或全站开发完成的证明。
