# 个人空间档案：八张参考图审阅与灰模交接

日期：2026-09-05

状态：依据用户提供的八张可见图片整理的建模建议。尚未创建 Blender 模型、验证连续镜头或实现网页效果。文中尺寸和镜头均为待验证方案。

## 1. 参考优先级

| 图片 | 用途 | 不从这张图推定的内容 |
|---|---|---|
| [01 母图](/Users/tim/Desktop/01-母图.png) | 色彩、冷暖照明、材料、入口画面的情绪 | 精确尺寸、被遮挡的几何 |
| [02 空间结构](/Users/tim/Desktop/02-空间结构参考.png) | 房间布局、家具相对位置、行走与镜头空间 | 精确正交投影、真实建筑测量 |
| [03 About](/Users/tim/Desktop/03-about章节.png) | 笔记本封面、纸张、桌面近景 | 桌面其他物件可以随镜头任意消失 |
| [04 Life](/Users/tim/Desktop/04-life章节.png) | 地图、杯子、照片信封这一组的构图与触感 | tim 的真实旅行经历、真实物件所有权 |
| [05 Frame](/Users/tim/Desktop/05-frame章节.png) | 金属夹、挂杆、纸张边缘、照片近景 | 生成照片可作为 tim 的摄影作品 |
| [06 Stack](/Users/tim/Desktop/06-stack章节.png) | 工作桌面的键鼠、显示器、外接设备与红色线缆 | 图中屏幕是实际项目画面 |
| [07 Work](/Users/tim/Desktop/07-work章节.png) | 开启抽屉的视角、滑轨和深红色档案标签 | 竖放文件夹可以装入母图的浅抽屉 |
| [08 手机入口](/Users/tim/Desktop/08-手机入口.png) | 竖屏标题留白与空间氛围 | 房间墙高必须随手机画幅改变 |

采用方式：01 决定视觉气质，02 决定布局；局部细节合并进同一个场景。连续镜头必须来自该场景，不拼接八张互相不一致的空间。

## 2. 当前最需要统一的五处

### A. 抽屉收纳方式

01/02 是多层浅抽屉，07 则出现近乎竖放的文件夹，关闭时需要的高度与浅层柜体存在冲突。

推荐保留母图柜体：六份档案改为水平叠放的薄文件套，索引标签在前缘错开。展开顶部抽屉后，用户选择标签，选中的档案抬升到桌面检查位置。先平移出柜体，再抬升，避免穿过桌板。

若更喜欢竖放档案，则需要将母图中的柜体统一改为少量深抽屉，不能只改近景。

### B. 手机构图

08 的上方墙面占比较大，笔记本和抽屉相对画面很小，适合标题氛围，不适合作为同时操作多个物件的镜头。上部构图还比 01/02 暗示了更高的墙面范围。

推荐保持统一墙高：手机相机靠近、改变目标点，标题占上方约四分之一到三分之一作为起始构图实验。下一屏聚焦一个物件，并提供明确的 DOM 操作标签。确切比例以标题排版实测决定。

### C. 桌面物件持续性

01/02 桌心为纸张与石块，03 强调放大的笔记本和文件夹，06 增加键鼠及外接设备。应当把这些细节确定为唯一布局，而非到某章才凭空出现。

推荐 06 作为工作桌面物件布局基础，03 提供笔记本材质和开启姿态；纸张与镇纸收至左后方。核心互动物件固定，近景只改变相机与物件的显式动作。

### D. 生活架层板内容

04 的地图、杯子和信封在整体参考的对应位置并不完全一致。采用 04 的三件组合作为拟定 Life 热点，并将其加入最终整体场景；书籍、摆件只做背景。

这些物件目前仍是艺术设定。正式内容由 tim 提供的真实故事、照片和物件身份补足。

### E. 首屏排版与椅子遮挡

01 的左侧包含明亮窗户、窗框和前景植物，不能假定那里已经有干净的文字留白。椅背也位于通向桌面互动目标的镜头路径中。

灰模中先放真实姓名和简介测试。尝试让相机偏向桌面一侧并略提高视点；必要时适度移动椅子并固定下来。不要让所有章节镜头穿过椅背、桌板、灯臂或挂杆。

## 3. 建模资产拆分

| 优先级 | 资产 | 拆件与动作 |
|---|---|---|
| P0 | 房间、桌子、柜体、窗、层架 | 用基础几何确定空间比例、遮挡和镜头路线 |
| P0 | 椅子 | 单独物体，确定固定位置并检查镜头碰撞 |
| P0 | 笔记本 | 底封、书脊、纸页块、封面分离；第一版只做封面旋转 |
| P0 | 照片轨道 | 挂杆、夹具、照片分离；照片拥有稳定选择和返回位置 |
| P0 | 档案抽屉 | 静态柜体、可动抽屉、滑轨、六份文件套分离 |
| P1 | 显示器、键鼠、外接设备、红线 | 屏幕独立材质；红线以可控路径制作，保留既有 active flow 的叙事作用 |
| P1 | 台灯 | 灯罩、灯臂、底座分离；初版固定姿态，灯光可控制 |
| P1 | Life 三物件 | 地图、杯子、照片信封；首版仅选中反馈与内容展开 |
| P2 | 植物、暖气片、地毯、边柜、书籍、花瓶 | 建立氛围；先简化轮廓和材质，不承担必要操作 |

概念比例起点：房间可先沿用此前 3.6m × 3m，墙高暂取 2.8m，桌面暂取 1.9m × 0.75m、高 0.75m。它们是灰模假设，不是图片测量结果。以桌子和椅子的人体尺度检查后再统一修订。

物件状态以交互定义为准：closed / opening / inspecting / closing。灯光与镜头另外控制；避免各自创建一套滚动进度。

## 4. 章节镜头分镜

| 章节 | 镜头与动作 | 内容接入 |
|---|---|---|
| Hero | 参考 01 的入口画面，调整留白和椅子位置 | 姓名、身份和签名是 DOM；场景未就绪时保留完整入口 |
| About | 从椅子侧上方靠近桌面左侧；封面绕书脊打开 | 阅读时镜头停稳，个人介绍在平面阅读区出现 |
| Life | 小幅抬升和侧移到层架，保持窗与桌面作为位置参照 | 三件物品对应可选的生活内容；保持现有无独立导航项的间奏关系 |
| Frame | 镜头先稍微回撤，再转向右侧照片墙，避免从书架跨房间甩镜头 | 照片脱夹或由明确的观察动作接管后放大，进入现有真实摄影浏览 |
| Stack | Frame 阅读结束后恢复空间，再靠近工作桌面；保留红色引导 | 技术内容继续可读，实际屏幕内容由前端提供 |
| WorkTransition | 沿红线移向柜体，开浅抽屉，选择水平档案 | 门槛行为是否改动在原型中决定；读取内容不依赖资源无限等待 |
| Projects | 档案先退出柜体，再抬到桌面，封面接入项目界面 | 复用项目卡片、详情、真实媒体和 SciScope 影片；阅读时暂停空间运动 |
| Contact | 用同一个场景重新安排回撤镜头；台灯下联系卡进入前景 | 复用现有邮箱、外链和签名；08 不能自动视为 Contact 的最终画面 |

Frame 的大图、项目详情和 About 长文不要求永久存在于透视纸面或显示器中。三维负责入口与连续转场，阅读阶段有稳定平面。

章节导航直接到目标姿态，不飞行经过所有中间章节。支线关闭后恢复原相机、滚动位置与键盘焦点。手机独立编排相机，保持同一场景和内容。

## 5. 可选补图提示词

现在无需重新生成整套图。灰模可以先开始；下列补图仅用于解决明确歧义。图像生成仍不能代替机械结构验证。

### 07 修订：保留浅抽屉

附 01、02、07，比例 16:9。

```text
Use images 01 and 02 as the authority for the cabinet proportions and shallow drawer heights. Use image 07 only for the close-up camera and material mood. Keep the same walnut desk, charcoal metal cabinet, hardware, and warm task light.

Open only the top shallow drawer. Inside it place exactly six thin archival document sleeves lying flat in a horizontal stack, with six deep-red index tabs staggered along the front edge. Every sleeve must fit fully inside the drawer when it closes. Preserve plausible rails, side-wall thickness, clearance below the desk, and a normal shallow drawer front. No upright hanging folders, no deep file bin, no floating papers, no changed cabinet proportions, no labels or readable text. One image, physically believable storage geometry.
```

### 08 修订：手机可读与可操作构图

附 01、02、08，比例 9:16。

```text
Reframe the exact same room from images 01 and 02 for a portrait 9:16 website entry. Keep the original wall height and every object's proportions. Move the camera closer to the desk and slightly to the left of the chair, aiming toward the notebook and task lamp. Do not stretch the room vertically.

Reserve approximately the upper quarter to upper third as calm wall space for future live typography, without adding text. Make the notebook and the top archive drawer recognizable at phone size, and keep the chair from covering them. Preserve the room's lighting and material character. No tall empty ceiling extension, no interface, no phone frame, no new furniture, no wide-angle distortion. One image of the same room from a new camera.
```

## 6. 下一步范围

第一轮灰模只做：入口相机、桌子和椅子遮挡、笔记本开合、About 阅读态、退出恢复，以及同一段手机视角。由此确认空间尺度、交互手感和资产需要的精细程度。

用户已说明可提供的材料都在项目中。后续直接从工作区资源库与现有内容层选材，不再要求另行准备一批素材。已核对的入口包括工作区根目录 sources/、apps/landing/src/data/life.ts、apps/landing/src/data/frames.ts、packages/content/src/projects.ts，以及 apps/landing/public/ 中的已处理资源。sources/formula*.heic 等候选需查看实际内容后再决定能否用于笔记本，不能仅凭文件名认定为真实手稿。

内容适配沿用现有 repository 边界：照片槽位、笔记本页与档案封面绑定内容 id 或资源引用，不复制一套项目事实。项目原图和已处理发布资源分别保留用途，贴图清单另行派生。

验收必须分开：参考图的视觉方向、模型的几何一致性、连续镜头的可用性、浏览器里的实际画质与性能。当前仅完成第一项的审阅和后续交接建议。
