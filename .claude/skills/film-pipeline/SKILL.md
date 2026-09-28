---
name: film-pipeline
description: "Make a short cinematic film for the portfolio the way the accepted 暗房 Darkroom intro film was made: lock the concept with Tim, get keyframes from ChatGPT images, have Codex/GPT model the props from a brief, build and animate the scene in scripted Blender Cycles, synthesise the score, add a film finish, and wire it into the site. Also how to brief Codex on Blender work and review what it delivers. Use for any request to plan, make, redo or review a film, video, 片子, 开屏动画, 项目片, 赛题片, or a Blender render task."
---

# 片子的做法（以「暗房」为准）

这份 skill 来自开屏片「暗房」。它从零做到被 tim 接受（「这一版本暗房的片子我认为质量是可以的」），然后接入了网站。后来做 EduCanvas 项目片，和 Codex 分工做 Blender 走了几轮，那些经验也收进来了，其中包括走偏的教训。

做新片子时，照这里的阶段走。每个阶段末尾都有一道闸门，**不过闸门不进下一步**。

## 一、角色与验收

- **视觉和声音由 tim 验收。** Claude 只报告测量结果和事实，不说「好看」「好听」，因为听不到声音，画面的审美判断也不归 Claude。
  - 能说的：亮度峰值、平均亮度、饱和度、画面占比、位置、响度（LUFS）、峰值。
  - 结论写成「数据如下，请你看或听」。
- **Blender 的活交给 Codex**（tim 的分工）。Claude 负责三件事：
  - 写设计和给 Codex 的提示词；
  - 审 Codex 的交付；
  - 做合成（Remotion 或 numpy 后期）、声音、网站接入。
  - tim 把提示词转给 Codex，Claude 不直接操作 Codex。
- **交付物用 `SendUserFile` 发给 tim**，不要只报一个路径。审片版和成片都这样发。

## 二、流程

### 1 · 理解与定调

1. 先用自己的话复述理解：片子放在哪、多长、给谁看、要达到什么感觉。
2. 只问真正需要 tim 拍板的事。暗房问的是：
   - 每次访问都播，还是只播一次；
   - 手机上做不做；
   - 要不要音乐；
   - 画面里出不出现人。
3. 把概念收成**一句话**，写进 `art/<片名>/README.md` 的「已定的事」。
   - 暗房那句：安全灯的暗红接住开屏的颜色 → 照片在显影盘里浮现 → 开灯，绳上晾着人像 → 淡入首屏。
   - 用到的素材（哪几张照片、什么顺序）也写进去。
4. 判断改旧片还是重做。原片的基础撑不起目标，就直说该重做。

**闸门：** tim 同意这句话和这几个决定。

### 2 · 视觉目标：关键帧

1. 先用 Blender 占位道具出三张风格帧，快速定光和构图（暗房的 `tools/intro_film/scene.py`）。
2. 细节不够时（暗房就是这样：Blender 风格帧的细节不如生成图），写 ChatGPT 生图提示词，让 tim 去生成关键帧。写法：
   - 一段**共用风格块**：镜头、景深、颗粒、光晕、色彩禁区（「暗部是暖牛血色，绝不是死黑」）、禁止出现的东西（文字、logo、CG 感）。
   - 三张关键帧：开场、中段、交接帧。交接帧要对准接下来的画面（暗房接首屏的粒子肖像）。
   - 先生成第 1 张，再拿它当风格参考去生成第 2、3 张。
   - 提示词存进 `art/<片名>/references/keyframe-prompts.md`，生成的图放 `references/gpt-keyframes/`，这个目录不进 git。
3. 关键帧就是画面细节的**目标**。后面建模和渲染都拿它对照。

**闸门：** tim 认可关键帧。

### 3 · 建模：交给 Codex/GPT

写一份建模任务书，存为 `art/<片名>/references/modeling-brief.md`，模板在 [references/briefs.md](references/briefs.md)。要点：

- **只要道具**，不要灯、相机、动画和着色器，这些由 Claude 组装。
- **用脚本建**：交付 `build_assets.py`，用 `blender -b -P` 能原样重建 `.blend`。`.blend` 不进 git，脚本进 git。
- 真实尺度、Z 轴朝上、原点放在自然支点、统一前缀命名（`DR_`）、每个道具一个 collection。
- 只用 Principled BSDF，贴图打包进文件，不依赖外部文件和插件。硬边要有真倒角，要贴图的地方要展 UV。
- 按镜头远近分三档：主体（微距特写）、中景、背景。主体的倒角、磨损、小零件最要紧。
- 每个道具出一张预览图，外加 `asset_manifest.json`（尺寸、拓扑、支点）和 `verify_assets.py`（能独立复查）。
- 写清「不要做」的：不要人和手，不要文字和 logo，不要把照片贴到纸上。

**闸门：** 看预览图和 verification，道具能在微距下站住。

### 4 · 场景、时间、渲染

- **一个共享时钟** `timing.py`：帧率、BPM、剪辑点（落在拍子或半拍上）、关键事件的帧号。画面和声音都读它。
  - 暗房：24 fps，80 BPM，一拍 18 帧。
- **场景每次从零搭**（`film.py`），从道具库 append collection，不存场景 `.blend`。
  - **每一帧只由帧号决定**，所以渲染中断后用 `frames=<下一帧>-<最后一帧>` 就能续上。
- **三档渲染**，先便宜后昂贵：
  1. 单帧：`still=40,130`；
  2. 动态预演：`res=25 samples=8 mb=0`，约 10 分钟，用来看时间；
  3. 正式：`res=100 samples=96 mb=1`，暗房约 2 小时。
- 长渲染放后台跑；有超时的环境下，要能随时断开再续。

**闸门：** 动态预演的时间和运动由 tim 确认，再开正式渲染。

### 5 · 声音：自己合成

- numpy 合成，不用采样，也不用授权音乐。暗房用了毛毡钢琴、pad、混响，配房间底噪、计时器、水声、铃、开关、灯管。
- 每个声音都放在画面发生那件事的帧上，从 `timing.py` 读。
- 用 `ffmpeg -af ebur128=peak=true` 量整合响度和峰值，报数给 tim，由他听。

### 6 · 成片：胶片质感与编码

- `post.py`：高光溢出和光晕、调色（可以逐帧在两套调色之间过渡，比如暗房里安全灯 → 开灯）、横向色差、暗角、颗粒。
- **颗粒要轻**：颗粒是噪声，压缩不下去；网站本身也会叠一层颗粒。
- `finish.py`：逐帧调色，然后 H.264 + AAC 编码。
  - 成片放 `apps/landing/public/projects/<目录>/`，只有 `/projects/` 下才有 `vercel.json` 的长缓存头。
  - 画质优先，**不为网页压缩画质**（tim 明确说过）。

### 7 · 接入网站

暗房的播放器是 `apps/landing/src/components/film/IntroFilm.tsx`，登记和看门狗在 `lib/introFilm.ts`。规则：

- **影片永远不能拖住开屏。**
  - 开屏期间以低优先级把影片整段下载成 blob。下载完、确认能解码，才向开屏登记；没准备好就不播。
  - 影片不能做成必须预加载的任务。
- 看门狗（暗房 26 秒）：影片卡住也一定会进入首屏。
- 随时能跳过：点击、滚轮、Esc、Enter、空格、↓。结尾前 1 秒，首屏在下面开始出场，影片淡出。
- 这些情况不播：`?film=off`、带 `#章节` 的深链接、手机和触屏、开了减少动态效果、自动化浏览器（`navigator.webdriver`）。`?film=on` 强制播放。
- CSP 的 `media-src` 要允许 `self` 和 `blob:`。
- 测试用 Playwright 加 `?film=on`。**应用内浏览器窗格的 `document.hidden` 是 true**，播放器会正确地拒绝播放，在那里测不了。

### 8 · 审片节奏

- 每一步都先自查：`ffmpeg ... fps=0.5,tile=4x4` 拼接触表；检查黑场（`blackdetect`）和冻帧（`freezedetect`）。然后再发给 tim。
- 审片版用低成本画面（预演帧、静帧），明说它能看什么、不能看什么。
- 正式版之前一定有一次 tim 确认运动的机会。

## 三、和 Codex 协作

提示词要自带全部上下文。Codex 看不到这段对话，只能看到仓库。模板在 [references/briefs.md](references/briefs.md)。

- **边界写在最前面**：只改哪个目录、输出到哪里、哪些目录不能碰、不 commit、不 push、旧输出保留。
- **分三道闸门，每道都写「然后停下」：**
  1. **定调静帧**：50% 分辨率、64 采样，每个镜头一张，拼成对照图，附测量报告。
  2. **动态预演**：每 4 帧渲 1 帧（`step=4`）、50% 分辨率、32 采样，拼成 mp4。
  3. **正式渲染**：全分辨率、96 采样、OIDN 降噪、运动模糊。
     - 每个版本输出到**独立目录**，例如 `out/blender/v3-final/`。
     - 按镜头依次渲，便宜、短的镜头先渲。
     - 每个镜头渲完出首、中、尾三帧拼图，并记录耗时。
     - 全部渲完检查缺帧（帧号必须连续）。
     - 续渲只允许在场景指纹完全一致时进行。
- **验收写成可测量的阈值**，让 Codex 自己测、自己报。例如：
  - 每个镜头主体最亮处 ≥ 0.9；
  - 某区域饱和度 ≥ 0.3；
  - 背景亮度低于焦点；
  - 句点的方点落在 (1350, 560)、尺寸约 20 px；
  - 字幕区的亮度为 0。
- **审交付的方法**：先读它的测量报告，再自己测关键数字。用「数据 + 设计理由」指出问题，最后给一份编号清单式的返工提示词。
- 合成需要三维里的位置时（标签钉在物体上、光点落点），让 Codex 导出**逐帧的投影坐标 JSON**，不要靠目测。
- 多台机器分工渲染时：按镜头分，不交错分帧（Metal 和 OptiX 的噪点不同，交错会闪）；统一用 OIDN；连续的镜头放在同一台机器上。

## 四、设计纪律

教训来自 EduCanvas 项目片：从 v2 到 v3.2 走了一圈，最后回到 v3。

- **方向先定死，再动 Blender。** 三维返工很贵，定调阶段多花一轮，胜过后面三轮。
- **不要为了「内容多」去延长一个比喻。** 数字柱适合讲好一个瞬间（「一张照片是一张数字表格」），拿它撑整支片就会走偏。tim 看出来了：「为什么死纠缠在那堆柱子」。
  - 内容不够时，回到「这支片子要让人记住什么」，而不是给已有的素材加戏。
- **不要自己加限制。**「全部留在某个世界里」这种约束，tim 没说就不要加。
- **一个镜头只讲一件事，但整支片要有层次**：要有不同的材质、明暗、节奏。
- **画面规则**（暗房和 v3 都在用）：
  - 每个镜头只有一个最亮区域；
  - 暗部是有颜色的暗，不是灰；
  - 两色光：暖主光加冷轮廓光；
  - 转场用形状匹配（像素 → 柱顶 → 脸，光点 → 句点）；
  - 只有一处允许回弹（比如结尾的句点）。
- **字幕**：1080p 下中文至少 72 px，一个镜头一行，放在左下三分之一，三维画面要把这块留空。落在拍点上，停留至少 2 拍，再加上每秒约 5 个字的阅读时间。
- **产品界面的字**：要推近到 1080p 下 40 px 以上才读得出，截图原大放进画面只有约 18 px。

## 五、坑

Blender、合成、网站里实际撞过的坑，见 [references/gotchas.md](references/gotchas.md)。动 Blender 场景或后期之前先看一遍。

## 六、暗房的文件在哪

| 路径 | 内容 |
|---|---|
| `art/intro-film/README.md` | 已定的事、目录说明、网站怎么播 |
| `art/intro-film/references/` | 关键帧提示词、建模任务书、生成的关键帧（不进 git） |
| `art/intro-film/assets/` | 道具库的构建和校验脚本（进 git）；`.blend` 和预览图不进 git |
| `tools/intro_film/` | `timing.py`、`prints.py`、`film.py`、`sound.py`、`post.py`、`finish.py`，用法见其中的 README |
| `apps/landing/public/projects/film/darkroom.mp4` | 成片 |
| `tools/project_films/` | Remotion 项目片、录屏、赛题片；Blender 底片在 `blender/` 下（Codex 维护） |
