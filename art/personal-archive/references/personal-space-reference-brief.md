# 个人空间档案：生图提示词与章节衔接方案

日期：2026-09-05。状态：概念提案，供生成建模参考和下一步选型；不是已实现页面，也不是对 tim 真实房间的还原。

## 1. 本轮要做什么

制作一个有生活痕迹的个人工作室，把摄影、学习与工程项目放在同一空间中。第一版采用固定镜头路线和少量可探索物件。空间负责建立个人气质与连接章节；正文、项目证据和联系操作保持易读、易用。

建议第一批生成 10 张图：01 整体母图做 3 个候选，选定其中 1 张后，再生成 02—08 各 1 张。08 是同一个空间的手机构图。

不要一次独立生成全部图片。没有母图约束，不同视角很容易改变房间布局、物件形状和材质。

生成图只用于构图、造型、灯光和材质参考。它们不是有精确尺寸或跨视角几何保证的模型蓝图，也不是摄影测量输入。选定后还需要整理统一的物件清单、尺寸和结构。

## 2. 使用方法

每次输入：下面的「共同设定」+ 对应编号的「镜头提示词」。

- 01：如果生成器支持参考图，可以先附上自己的桌面、物件与喜欢的空间图片；没有也可以先做概念探索。
- 02—08：附上选定的 01 母图，明确要求编辑或延续同一空间。模型细节图再附上相关局部图。
- 尽量使用同一生成模型；若支持参考强度，优先保持物件和布局一致。固定 seed 只能辅助，不保证多视图一致。
- 场景图建议 16:9；结构图 4:3；物件图 1:1；手机构图 9:16。分辨率使用工具可用的清晰档位即可。
- 生成器不支持单独 negative prompt 时，把「避免项」加在正文末尾。
- 保存原图，并记录编号、提示词与采用的母图；图片内无需生成标签。

## 3. 共同设定：每张图都附上

```text
Create a coherent 3D art-direction reference for a personal archive website belonging to Tim, a builder interested in software systems, research, mathematical modeling, and photography. This is a designed interpretation of a personal workspace, not a claim to reproduce a real room.

The space is a compact rectangular studio, approximately 3.6 meters wide and 3 meters deep. Use these fixed landmarks to preserve continuity: a work desk against the back wall; a tall window on the left wall; a small shelf near the back-left corner; a photography rail on the right wall; and a shallow archive drawer unit beneath the right side of the desk. The entrance is on the front side. On the desk, an openable notebook sits on the left, a single slim monitor sits toward the right, and an adjustable task lamp sits at the far right. Leave the center of the desk available for examining one selected object.

Materials: charcoal painted metal, restrained dark walnut, warm off-white paper, muted mineral-gray plaster, brushed aluminum hardware, and tiny deep-red details. Cool soft daylight comes from the left window, complemented by a small warm pool of light from the desk lamp. Keep shadow detail readable. Show subtle fingerprints, paper edges, restrained wear, and intentional asymmetry.

The room should feel personal, quiet, intellectually curious, and physically believable. Use a small number of distinctive objects with enough space around them. Architectural photography, careful material definition, natural lens behavior, restrained cinematic composition. Objects must have plausible thickness, joinery, supports, and gravity.

Any screens, notebook pages, photographs, and archive inserts are placeholders for real material to be supplied later. Keep them blank or use restrained non-legible tonal blocks. Do not invent readable achievements, project results, certificates, personal photographs, or biographical details. Generate a scene reference, not a website screenshot. No interface, no navigation, no captions, no watermark.
```

### 避免项

```text
Avoid neon cyberpunk, purple-blue gradients, gaming-room RGB lighting, spaceship interiors, holographic dashboards, excessive floating particles, luxury showroom sterility, crowded prop collections, illegible fake text, invented trophies, logos, duplicated objects, impossible furniture, ultra-wide fisheye distortion, crushed black shadows, and excessive depth-of-field blur. Do not add a person or a face.
```

## 4. 第一批镜头提示词

### 01 · 整体母图：选择空间气质

比例：16:9。做三个候选；保持布局相同，只改变轻微的镜头位置和灯光平衡。

```text
Show the studio from near the front-left entrance, looking diagonally toward the desk on the back wall and the photography rail on the right wall. Use a natural 35mm-equivalent architectural view at approximately seated eye level. The desk and key objects occupy the center-right of the frame. Reserve the left third as calm, low-detail negative space for future live website typography, but do not draw any text.

Make the notebook, monitor, task lamp, archive drawer unit, and photography rail recognizable as distinct future interaction destinations. Include just a few understated personal objects on the small shelf. Prioritize a strong composition that remains beautiful when completely still. Keep foreground, middle ground, and background separated by light and occlusion rather than heavy blur. One image, one coherent room.
```

评估：静止画面是否有吸引力；第一眼是否能看懂空间；左侧是否适合排版；关键物件是否能被辨认。

### 02 · 空间结构参考：固定方位

比例：4:3。附母图。

```text
Using the attached approved room as the design authority, show one orthographic axonometric cutaway view from above the front-left corner. Remove the ceiling and only the front wall to reveal the interior. Preserve the exact desk, window, shelf, photography rail, archive drawers, proportions, and object placement from the reference. Use neutral soft studio illumination so construction and surfaces are easy to inspect.

Reveal the floor plan and the spatial relationships between interaction destinations. Maintain real object thickness and plausible furniture construction. No cinematic depth of field, no perspective lens distortion, no exploded parts, no measurements, no arrows, no text, and no alternate room design. This is one clear modeling reference view, not a collage.
```

评估：与母图的左右关系、物件数量和家具结构是否一致。若矛盾，先回到母图纠正，再开始建模。

### 03 · About：桌上的个人笔记

比例：16:9。附母图。

```text
Move the camera closer to the notebook on the left side of the same desk. Preserve its position and the established room lighting. Show a three-quarter overhead view: a cloth-bound off-white notebook with a restrained dark-red bookmark, a single pen, and a thin paper folder. The cover is slightly open, revealing the thickness of the paper block and a plausible hinge.

The notebook should look used and cared for, without becoming antique or distressed. Keep the page mostly blank for real notes to be inserted later. Leave a calm area around the notebook for a future readable biography overlay. Show enough of the desk, monitor edge, or lamp to locate this close-up within the same room. No generated handwriting, equations, achievements, or UI.
```

用途：About 的空间落点。用户打开笔记时，介绍与真实经历进入正常 DOM 阅读层。

### 04 · Life：有生活痕迹的小物件

比例：16:9。附母图。

```text
Frame the small shelf near the back-left corner of the approved studio. Preserve the exact room, materials, and lighting. Compose a close view of three simple provisional personal objects: a folded paper map without readable labels, a small unbranded everyday ceramic cup, and a plain envelope containing a few photographic prints. These are placeholders whose final identities will come from the owner's real life.

Give each object a different silhouette and a clear resting position. Leave enough separation for individual selection in an interactive scene. Show natural material variation and modest signs of use. Keep the composition warm and intimate while retaining the charcoal, paper, and walnut palette. No trophies, collectibles added for decoration, fake travel stamps, invented personal photos, or readable text.
```

用途：Life 的间奏入口。最终替换为 tim 选择的真实物件与故事；不把本图当作经历证据。

### 05 · Frame：照片墙与可抽出的照片

比例：16:9。附母图。

```text
Show the photography rail on the right wall of the exact same studio from a gentle oblique angle. Use four slim brushed-metal clips holding off-white photographic print mounts with visible paper thickness. The mounts contain muted grayscale image placeholders, not invented photographs. Give the prints generous spacing and preserve the editorial calm of the room.

One mount is pulled slightly forward, parallel to its neighbors, suggesting that it can be selected and brought closer for viewing. Show believable clips and attachment details. Let side lighting reveal paper edges and shallow shadows. Keep enough empty wall around the selected print for it to expand visually into a full-screen photograph during a website transition. No museum labels, decorative image warping, floating unsupported prints, or text.
```

用途：Frame 的入口与返回定位。四个挂位仅用于概念构图，不限制现有摄影内容数量；正式图像使用真实照片。

### 06 · Stack：工作的桌面

比例：16:9。附母图。

```text
Return to the desk of the approved studio, now at a close seated working viewpoint facing the single monitor. Preserve the notebook on the left and the lamp at the far right. Show a restrained keyboard, one small unbranded external device, and physically plausible cable routing. The monitor screen contains a quiet dark surface with a few non-legible neutral blocks reserved for real project content.

Introduce one very restrained deep-red cable or desk-edge guide as a physical visual motif connecting the working area toward the archive drawers. It must not emit a neon glow. Leave enough uncluttered composition around the monitor for a future DOM-based technology map. The mood is a focused working session. No code gibberish, fake performance metrics, transparent holographic panels, or science-fiction hardware.
```

用途：Stack 的工作视角。保留现有红色 active flow，其运行态由前端绘制，不烘焙成不可变图片。

### 07 · Work：浅抽屉与项目档案

比例：16:9。附母图。

```text
Show a close three-quarter view of the shallow archive drawer beneath the right side of the same desk. The top drawer is pulled halfway open on simple believable rails. Inside are exactly six thin removable archival folders, separated by subtle dividers. Each folder has an off-white insert and a small deep-red index tab, with no readable lettering.

The front folder is lifted slightly toward the viewer as the next interaction target. Preserve realistic drawer-wall thickness, handles, runner clearance, and support. Warm desk-lamp light reaches the folder edges while the surrounding furniture remains softly lit. The composition should suggest a clear sequence: open drawer, choose a folder, inspect the contents. No extra drawers added to the unit, no holograms, no invented project imagery, no floating cloud of paper, and no UI.
```

用途：WorkTransition 引出 Projects。六份档案对应当前六个首页项目；正式数量应由内容数据驱动。

### 08 · 手机入口：同一空间的竖屏构图

比例：9:16。附母图。

```text
Recompose the exact approved studio for a portrait 9:16 view. Preserve all room landmarks and furniture; move the camera instead of redesigning the space. Focus on the desk with the notebook and lamp clearly identifiable, and retain a small contextual glimpse of the photo rail or archive drawer.

Reserve the upper quarter as calm wall space for future live typography. Keep the three nearest interaction targets separated and visually recognizable at phone size. Use natural perspective and readable material detail. This is a new camera composition for the same 3D scene, not a crop of a wide screenshot. No phone frame, no browser chrome, no UI controls, no text, no extra props, and no tiny scattered hotspots.
```

用途：提前验证手机构图；正式手机交互使用明确可点击标签及单物件聚焦，不要求精确点击远处小物件。

## 5. 第二批：选定后再做建模细节

先确定母图与结构，再对笔记本、照片挂架、抽屉各生成独立物件图。每个方向单独出图，避免一张多视图中出现互相矛盾的结构。

### 通用物件模板

```text
Extract only the [OBJECT] from the attached approved reference. Preserve its exact silhouette, material, proportions, construction, number of parts, and surface details. Place it against a plain neutral-gray studio background with diffuse even illumination and a faint contact shadow.

Show a single [FRONT / RIGHT SIDE / TOP] orthographic view, with no perspective distortion. The entire object must be visible and centered, with clear boundaries. Do not redesign or beautify the object. No text, labels, dimensions, collage, depth-of-field blur, or surrounding room objects. This image will guide manual 3D modeling; prioritize structural clarity over cinematic presentation.
```

### 动作状态参考模板

```text
Using the approved [OBJECT] reference, show the same object in its [CLOSED / HALF-OPEN / FULLY-OPEN] state. Keep the camera, lighting, materials, dimensions, and construction identical. Change only the intended mechanical movement: [ROTATE THE COVER AROUND ITS SPINE / SLIDE THE DRAWER ALONG ITS RAILS]. Preserve plausible hinges, supports, and clearances. One state in one image. Do not generate arrows, text, ghosted motion, or a collage.
```

建模时需要人工统一尺度，并验证关节与活动空间。重要部件分离，例如 notebook_cover、drawer_front、drawer_body、folder_01。命名仅为建议，不要求生图工具写在图片上。

## 6. 与现有章节的衔接

以当前 registry 中八个章节及其 DOM id 为基础。空间是可跨章节延续的视觉层，现有内容和直达导航继续作为信息结构。

| 现有章节 | 空间位置 | 用户动作与转场 | 内容衔接 |
|---|---|---|---|
| Hero / #hero | 入口看向工作台 | 初次小幅视差；滚动逐渐靠近桌面；可直接导航到任意章节 | 姓名、身份、签名保留 DOM 排版。现有粒子肖像与房间的视觉主次需要在原型中二选一或分时展示，避免两套主视觉同时竞争 |
| About / #about | 桌面左侧笔记本 | 笔记本封面打开，镜头稳定后让正文进入阅读态 | 复用现有个人介绍与事实内容；不让长文永久贴在透视纸面上。Decrypt 与翻页若重复表达揭示，仅选一个负责该动作 |
| Life / #life | 左后方小物件架 | 轻微侧移；点击物件可查看照片或故事 | 复用现有生活图库。保持它作为无独立导航项的间奏；选中物件是可选探索 |
| Frame / #frame | 右墙照片轨道 | 选中照片向前移动，扩大至与现有摄影画面匹配，随后接入横向浏览 | 真实照片和现有 Frame 主题结构继续使用。Bend 如保留，作用于既有横向边缘；完整照片阅读区保持清晰 |
| Stack / #skills | 桌面显示器与工作区 | Frame 最后画面退出，沿桌面红色引导回到工作视角；技术内容在平面阅读层展开 | 保留红色 active flow 与已有技能内容；不额外在场景中复制一套技能卡片 |
| WorkTransition / #work-transition | 工作台右侧的档案抽屉 | 红色流抵达抽屉；抽屉开启，六份档案出现；滚动或明确操作进入 Work | potential / system / proof 可映射为工作台、归档、展示三个动作。建议原型比较短过渡与当前长过渡；是否改 explicit CTA gate 需在方案选择后确定 |
| Projects / #projects | 被选档案在桌面展开 | 档案面贴合到真实项目卡片，转入现有项目区域；进入案例后空间暂停或退场 | 复用 ProjectCard、ProjectCaseDialog、真实媒体和项目数据。SciScope 保留现有影片入口和原生播放。Glass / Laser / Portal 按段选用，不在同一次展开中重复叠加 |
| Contact / #contact | 回到入口附近的桌面全景 | 镜头回撤，台灯照亮一张空白联系卡，签名与链接进入前景 | 复用 FooterContact 与 FooterMeta；纸卡只提供视觉承托，实际邮箱和外链保留 DOM。Iris / Liquid 是否保留由最终收尾画面决定 |

### 主线与支线

- 滚动始终是一条可前后移动的主线；不要求用户学会第一人称漫游。
- 物件点击是可选的支线。退出后恢复原章节位置、选中对象和键盘焦点。
- 顶部章节导航和深链接直接进入目标状态，不强制飞过整个房间。
- 手机采用定制竖屏镜头和一次一个目标的展示；拖动、hover 均有点击替代。
- 页面正文与点击目标先可用。资源失败或设备无法运行场景时使用选定镜头的静帧，叙事内容仍然完整。
- 新空间的低细节版本先到位；细节资源在相关章节前准备。不要把整间房全部高质量资源加入首屏强制等待。

## 7. 技术接入建议：待实施

### 接入位置

| 现有边界 | 建议职责 |
|---|---|
| apps/landing/src/chapters/registry.ts | 继续作为章节顺序、导航、进度的来源；第一阶段不更改 id |
| apps/landing/src/core/narrative/ | 增加可序列化的镜头、物件动作、章节锚点配置，避免阈值散落在场景组件 |
| apps/landing/src/lib/chapterScrollMetrics.ts 与现有章节滚动基础设施 | 为共享空间提供统一章节进度；不新建独立滚动容器 |
| apps/landing/src/lib/webgl/contextRegistry.ts | 对房间 renderer 登记配额，并协调现有 Hero、Glass、Laser 等效果的启停 |
| apps/landing/src/lib/resources/ | 分层准备房间模型、关键贴图和相关静帧；沿用取消、超时与显式备用路径 |
| apps/landing/src/shared/effects/manifest.ts | 登记空间及物件交互的触发方式、运动策略、资源成本与备用表现 |
| apps/landing/src/chapters/projects/ | 复用现有案例内容、弹窗、关闭后的焦点恢复和媒体播放 |

### 新模块的候选结构

建议在 apps/landing/src/features/personal-space/ 下分离 scene、camera、objects、interaction、assets、fallback。此路径尚未创建，具体命名以实施前仓库约定为准。

- 使用一个共享的房间 renderer 表现相关空间镜头；同一帧内同一个物件变换只由一个控制器写入。
- 共享 renderer 不等于永久渲染。场景退出、正文阅读、后台状态下暂停或按预算释放。
- 接入初期必须和现有 Canvas 分段协调；不能直接在现有两个活动 context 之上再叠加一个常驻房间。
- 房间镜头通过配置定位到章节，不与 DOM 测量互相写回，避免滚动和镜头互相追赶。
- 物件热点使用清晰的 DOM 标签与键盘操作；三维命中测试只提供增强，不承担唯一入口。
- 大块场景光照可以烘焙，可操作部件保持独立模型。网页端最终效果需要单独检查，不能以 Blender 渲染图作为浏览器效果证明。

## 8. 分阶段制作与验收

### A：概念选择

产物：母图、结构图、三件核心物件、手机构图。确认房间气质、物件轮廓和布局一致。生成图中的虚构内容在正式素材中替换或明确作为概念呈现。

### B：灰模验证

先做「Hero 入口 → About 笔记本」的一段，不做全站精模。用简单几何体验证滚动、点开、关闭、导航跳转、恢复焦点与手机构图。动画应该可逆，快速跳转不遗留半开的阻塞态。

### C：一个精细物件与 Frame 衔接

制作笔记本或照片夹中的一个精模，确定材质和浏览器灯光；完成「空间中的照片 → 现有 Frame 阅读界面 → 返回」的连续体验。验证照片保持真实、可看清，阅读过程中没有持续镜头漂移。

### D：扩展 Stack → Work

完成档案抽屉与现有六项目的映射，比较缩短后的过渡节奏。确保 CTA、章节导航和项目详情在场景加载失败时仍可用。

### E：整站收口

接入 Life、Contact；整理重复特效；验收手机、弱设备、后台恢复、连续反向滚动、截图构图、资源体积及帧耗时。该阶段的预算需根据灰模和目标设备测量制定，不能先把概念图的画质当作已达成性能。

## 9. 提交图片时附带的信息

- 选中的 01 母图是哪张。
- 最喜欢的三处细节、最不喜欢的一处。
- 哪些物件是自己真实拥有或有故事的，哪些仅是占位。
- 希望更写实还是更适度风格化。

后续先整理最终物件清单、镜头分镜和 Blender 建模拆件表，再进入生产。概念图片本身不直接导入网站替代所有三维交互。
