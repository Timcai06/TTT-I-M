# 提示词模板

真实版本在仓库里，写新提示词前先读它们：

- 关键帧：`art/intro-film/references/keyframe-prompts.md`
- 建模：`art/intro-film/references/modeling-brief.md`
- Blender 底片：`tools/project_films/briefs/codex-educanvas-v3-blender.md`

## 1 · ChatGPT 生图关键帧

```text
（共用风格块，贴在每条提示词后面）
Cinematic 35mm film still, <lens> lens, shallow depth of field, fine organic film grain, soft halation around
the brightest highlights, gentle vignette. Photographic and tactile — <材质>. Not CGI, not a 3D render,
no text, no logos, no watermark. The darks are <有颜色的暗，给色值>, never flat pure black.

Frame 1 · <开场>：<机位、主体、光源、景深里有什么、唯一的冷/暖色点、情绪>
Frame 2 · <中段>（附一张照片）：<这张照片在画面里处于什么状态>
Frame 3 · <交接帧>（附照片）：<主体位置和大小要对准下一个画面；负空间留在哪边；调色>

先生成 Frame 1，再把它作为风格参考附给 Frame 2 和 Frame 3（match the lighting, grain and color of the attached still）。
```

## 2 · 给 Codex/GPT 的建模任务书

```text
# <片名> — 3D asset brief
> 附上关键帧，作为形体、材质和细节程度的目标。

## Context
这是一支 <时长> 的片子，内容是 <一句话>。场景组装、灯光、相机和动画由另一位艺术家负责，你**只做道具**。道具要在微距下站得住（<焦距>、离主体 <距离>），所以边缘、倒角、磨损比面数经济更重要。

## Technical requirements
- Blender <版本>，用你一并交付的 build_assets.py 生成，命令 blender -b -P build_assets.py，产出 <name>.blend。
- 单位米，真实尺度，Z 轴朝上。放在 Z=0，原点放在自然支点上（每个道具单独注明）。
- 统一前缀 <XX_>，每个道具一个同名 collection。
- 只用 Principled BSDF；程序纹理或打包进文件的贴图；不依赖外部文件，不用插件。
- 硬边都要有真倒角；需要贴图的地方要展 UV；有用的修改器保持可编辑。
- 资产文件里不放灯光、相机和世界环境（单独的预览场景除外）。
- 每个道具渲一张预览 PNG（1600×1000，中性灰棚拍，一张 3/4 视角加一张特写）；另交 asset_manifest.json 和 verify_assets.py。
- 输出目录：<绝对路径>

## Assets
### Hero tier（微距特写）
1. <名字>：<尺寸、结构、材质、磨损、原点、需要单独做成对象以便动画的部件>
### Mid tier（中景）
### Background tier（永远虚焦，轮廓比细节重要）

## Do not
- 不做人和手；表面不放文字和 logo；不要把照片贴上去（组装时再贴）。
```

## 3 · Blender 底片（Codex 做场景和渲染时）

```text
# Codex 任务：<片名> 的 Blender 底片
先读 <设计稿路径>。

## 环境与边界
- 仓库 <路径>，分支 <分支>。不要 commit，不要 push，完成后留在工作区等审阅。
- 只在 <脚本目录>（新建）和 <输出目录>（被 git 忽略）里工作；不要动 <禁区列表>。
- Blender <版本>：<路径>，Cycles + Metal，全部后台脚本化（-b -P script.py -- key=value）。
- Blender 自带的 Python 没有 PIL：图像预处理用系统 python3 输出 .npz 和贴图 PNG，Blender 脚本只读这两样。

## 要做的东西
<几何、材质、灯光（写色值）、色彩管理 AgX>
所有灯都要设 visible_camera=False 和 visible_glossy=False。
<已验证的草稿结论：多近能读出细节、什么强度会过曝>

## 镜头（写帧率、BPM、一拍几帧）
| 编号 | 帧 | 内容 |
所有镜头的左下三分之一留给字幕。
<需要合成对位的点：要求导出逐帧投影坐标 JSON，并报告最终落点的实测位置>

## 渲染与交付
1. 定调静帧：每个镜头一张关键帧，50% 分辨率、64 采样，拼成 stills.png，附测量报告。**然后停下，等 tim 定调。**
2. 动态预演：step=4、50% 分辨率、32 采样，拼成 motion-test.mp4。**然后停下。**
3. 正式渲染：100% 分辨率、96 采样、adaptive 0.015、OIDN、运动模糊，输出到 <独立版本目录>/<镜头>/<全片帧号>.png。
   - 按便宜、短的镜头先渲的顺序逐个镜头渲；每个镜头出首、中、尾三帧拼图并记录耗时。
   - 只有场景指纹一致时才能 resume，否则该镜头从头重渲。
   - 最后报告总帧数、缺帧检查结果、总耗时。
在 README 里写清每个脚本的作用、怎么重跑、参数含义，以及哪些结论来自实测。
```

## 4 · 返工提示词

```text
静帧已审：<通过的镜头> 通过。<要返工的镜头> 需要按以下几点返工。
只重出受影响的静帧（<帧号>），仍然 50% 分辨率、64 采样，完成后停下，等 tim 确认。

1. <问题>：<设计理由>。改法：<具体参数>。验收：<可测量的阈值，写明在报告里怎么证明>。
2. ...
不 commit，不 push。
```
