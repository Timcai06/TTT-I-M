# Desktop Landing 空间转场优化方案

> 后续设计基准更新（2026-09-08）：tim 已确认以房间为主体、电脑初始只承载 Index 本页交互。后续设计与开发基准见[空间主体体验 v2](spatial-experience-v2.md)。本文保留转场优化方案与开发记录；这些记录不构成 v2 已实现或已验收的证据。

> 状态：已实施候选，待产品经理审查与 tim 最终视觉验收
>
> 日期：2026-09-08
>
> 审查基线：`main @ 55c4ad384f15dea3147db5832f8810d7f34ccf47`
>
> 本轮范围：已按方案完成桌面 Landing 前端实施；未修改 Blender 模型、GLB 或图片资源，未提交、未推送。

## 0. 结论先行

推荐把整套桌面 Landing 的转场统一为一条规则：**单一主体托管（Subject Custody）+ 真实页面原子接管（Pixel Handoff）+ 黑底完整房间显影（Prepared Room Reveal）**。

1. 每段转场只允许一个视觉主体拥有注意力。主体从来源章节离开，进入房间中的真实载体，再与目标章节的真实 DOM 对齐；过渡途中不再插入解释性标题卡。
2. 3D 层不再用 Canvas 重新排版目标标题。字体、字号、字距、行高、换行、图片裁切与文案全部来自目标章节本身；只有空间、纸张、屏幕、相机与光影属于 3D。
3. 房间先在屏外完成首帧和曝光预热，再将完整构图从纯黑上整体显影；禁止先露出一块灰墙、纸面或圆角孔径，让准备完成的场景被误认成加载占位。
4. 所有层的交换都发生在像素已重合之后。正向、停住、反向使用同一组可逆关键帧；直接导航不播放中间空间，但必须预备好反向进入所需的场景状态。

这一方向保留原站的黑白编辑感、Playfair Display / Noto Serif SC 排版、超大标题、红色流线、长滚动阅读与现有房间的温暖材质，同时把 3D 从“额外插入的一张卡”改成原站内容的空间延伸。

---

## 1. 审查范围与证据边界

### 1.1 已核对状态

- 实际分支：`main`
- 实际 HEAD：`55c4ad384f15dea3147db5832f8810d7f34ccf47`
- 审查开始时工作区已有其他 agent 的空间转场候选改动；本轮在原位保留并继续收敛，没有清理或覆盖无关差异
- 最终本地生产预览：`127.0.0.1:5192`
- 参考研究使用 1280 × 720 视口；最终逐帧验收使用 Codex 内置浏览器 912 × 863 CSS px
- 只处理桌面 Landing；手机端与 Studio 不在本方案范围内

### 1.2 证据等级

| 标记 | 含义 | 本文使用方式 |
| --- | --- | --- |
| `OBSERVED` | 本轮在真实页面中滚动、点击或返回后亲自观察 | 可直接作为问题与验收依据 |
| `CODE` | 当前代码、样式、内容仓储或场景契约能够直接证明 | 可作为实施边界 |
| `INFERRED` | 根据观察与代码提出的设计或技术推断 | 必须在开发阶段验证，不写成现状事实 |
| `UNKNOWN` | 本轮无法可靠复现或需要模型工具确认 | 列为待决策/风险，不虚构结论 |

### 1.3 不可破坏的稳定性边界

以下能力是前置条件，不是优化对象：

- `Brushed hardware` 金属方向性反光继续保留；不得通过关闭各向异性来“修复”画面。
- 非有限值扫描、修复、最终帧像素完整性守卫继续保留。
- GLB / 图片 / 字体预加载、共享运行时、WebGL 上下文预算、GPU context loss 恢复继续保留。
- 默认电脑屏幕仍是 PulseGraph；只在 Frame → Stack 的照片接管窗口切到照片态，退出后必须恢复。
- 第三方文件哈希守卫的既有差异独立记录，不得把它包装成本方案造成的失败，也不得用它掩盖本方案的失败。

---

## 2. 当前页面审查

### 2.1 已观察到的共性问题

`OBSERVED`

- 六段空间桥接均采用长 sticky 区域，但中间主体经常从“真实章节内容”变成“泛化标题 + 灰色房间 + 米色标题纸”。
- 接近 100% 时，目标标题纸才快速变黑或变米白，随后切换到真实章节。几何、字体、颜色和层所有权同时变化，导致最后一跳最明显。
- 停在中间时相机本身能保持位置，但若该位置恰好被书架横梁、台灯或空白墙占据，就会形成稳定但质量很差的构图。
- 反向滚动使用同一进度，因此运动方向基本可逆；然而从直接导航返回空间桥时，懒加载状态会先出现黑色 loading/标题，再突然接上灰色房间，破坏可逆性。

`CODE`

- `ArchiveChapterBridge` 的目标页预览由 `useChapterPreview` 生成，只复制首个 `h1/h2` 的 `textContent`，不复制真实布局、图片或排版节点。
- `archiveReadingSurface.ts` 在 2048 Canvas 上手工排白字，底纸主要是 `#c6bba3`，到最后极短区间才与目标背景合并。
- `textContent` 会把分行 `<span>` 的视觉空格折叠，因此实际提取结果包含 `The stack I workwith.`、`Six things I madein 2026.`、`Let's buildsomething that lasts.`。
- 每个桥接当前 `initiallyMounted: false`，并依赖邻近滚动区才挂载；直接跳章后反向进入时存在 ready gap。

### 2.2 Book → About

`OBSERVED`

| 近似进度 | 画面 |
| --- | --- |
| 0% | 黑场与抵达文案；房间尚不可见 |
| 9% | 中性灰墙已大面积显出，亮度从黑场快速抬高 |
| 27% | 镜头接近桌面，默认 PulseGraph 屏幕可见 |
| 45% | 书本打开，页面仍以空白纸为主 |
| 60% | 完整 About dossier 已正确出现在书页上，内容身份正确 |
| 75% | 继续推进和倾斜，内容仍可辨认 |
| 90% | 书页被放到很大且透视仍重，标题和人像被视口裁切 |
| 99.7% | 接近真实黑色 About，但仍能感到舞台层存在 |
| 100% 后 | 切到清晰的真实 About DOM |

结论：当前不是“没有 About 内容”，而是**内容身份已经正确，最后 10% 的透视、裁切、颜色与所有权交换不正确**。

### 2.3 About → Life

`OBSERVED`

- 开始先出现泛化标题“系统之外，生活仍在发生。”，不是 About 中的实体。
- 镜头转向信封/照片时，大块书架横梁与杯子挡住主体。
- Life 标题投到纸上时被遮挡，末端变成大面积米灰标题纸。
- 最后切到真实 Life 黑色页面；真实标题、正文与 DriftWall 没有和纸面预览重合。

### 2.4 Life → Frame

`OBSERVED`

- Life 图片墙结束后，连续主体被泛化标题替代。
- 中段多次经过空白灰墙；随后看到多张相片，但没有一张被明确选为“从 Life 带入 Frame”的对象。
- 末端米灰纸上的 `Frames of living systems.` 与实际 Frame 入口的字体比例、位置、正文和索引均不同。

### 2.5 Frame → Stack

`OBSERVED`

- 桥接开头立即切成“从观看，到构建。”标题卡，Frame 最后一张照片没有继续拥有画面。
- 照片墙出现时，注意力被足球、餐桌、秋日建筑等多张照片分散。
- `Final Horizon` 随后出现在电脑屏幕，但第一次出现时屏幕大多被裁在左侧，空白墙和台灯反而更显眼。
- 镜头靠近后，`Final Horizon` 能成为中央主体；再往后它被米灰的 `The stack I workwith.` 标题纸替代。
- 直接跳到 Stack 后反向滚动，桥接曾先显示 `ready=false` 的黑色 loading 状态，约一秒后突然接成米灰纸。
- 100% 切到真实 Stack 黑色首屏：102.4px Playfair Display 标题、-4.096px 字距、102.4px 行高与红色流线。

`CODE`

- 现有图片已经唯一确定为 `Final Horizon`：`/frame/scenery/scenery-11.webp`，1400 × 1050，4:3。
- 运行时已有 `StackPhotoViewerSurface`、`MonitorPhoto_Thumbnail` 与 `MonitorState_project/photo`，无需为主体接管新增屏幕模型。
- 桌面 `FrameParticleHandoff` 实际直接进入 `ArchiveChapterBridge track="frame-stack"`；旧粒子实现只服务降级路径。因此实施时不能在现有桥之前再叠一段独立“粒子结尾”。

### 2.6 Stack → Work

`OBSERVED`

- 开始被泛化标题“让想法成为可以打开的作品。”抢走主体。
- 中段靠近 PulseGraph 屏幕是正确的身份延续；随后抽屉打开、文件卡抬起，语义也成立。
- 文件卡上已有 `WORK / SELECTED PROJECTS`、`SIX PROJECTS / 2026`，是可以继续利用的真实空间对象。
- 末端又变成米灰标题纸，文字出现 `Six things I madein 2026.`，再切到真实 Work 黑色标题与项目卡。

### 2.7 Work → Contact

`OBSERVED`

- 前 90% 的房间远景、暖灯、桌面与抽屉是一段质量相对较好的停顿。
- Contact 内容直到约 98% 才突然作为米白纸出现，实际可读窗口被压缩在很短的滚动范围。
- 纸面文字是 `Let's buildsomething that lasts.`，没有真实页面的两行节奏、斜体 `lasts`、链接和 ASCII 视觉结构。
- 100% 切到真实米白 Contact 页面；这段允许从黑色转到米白，但交换仍需在布局对齐后发生。

---

## 3. 参考网站 Unseen：观察与推断分离

研究对象：Unseen 首页、Projects Index 与 Superlist 项目页。

### 3.1 本轮亲自观察到的机制

`OBSERVED`

1. 首次进入有独立的浅粉进入页、中央眼睛动画和音频选择；选择无声后才进入主体验。
2. 首页使用柔和、低对比的 3D 空间作为场所；全局导航在页面/空间变化中持续存在。
3. 从首页进入 Projects Index 时，URL 已改变后旧的首页构图仍短暂保留，随后才进入项目索引；没有先暴露空白等待页。
4. Projects Index 保留明亮的空间背景作为地点线索，项目卡在滚动/运动时发生弯曲或透视形变，停下后回到容易阅读的近矩形状态。
5. 直接进入 Superlist 项目页后，首屏是另一套但同属一个世界的白色空间，项目名称、类型、overview、services、date、client、location 都属于项目真实首屏，不是过渡标题卡。

### 3.2 本轮没有可靠观察到的机制

`UNKNOWN`

- 当前浏览环境下，Projects Index 的 Canvas 卡片命中没有可靠触发内部项目详情；因此未取得可信的“点卡片 → 详情 → 浏览器返回 → 原卡片”的完整连续画面。
- 从直接 URL 返回会重新出现进入加载页，不能据此推断站内返回设计。
- 因此本文不声称 Unseen 使用了共享图片元素、同一相机或图片全屏接管；这些若无后续录像证据，都只能是推断。

### 3.3 可借鉴原则

| Unseen 中实际可见的原则 | 对本项目的适配 | 不照搬的部分 |
| --- | --- | --- |
| 旧构图在路由变化初期不先消失 | 在新 3D 首帧 ready 前继续显示来源章节/主体 | 不复制其浅粉、白色雕塑或视觉语言 |
| 空间背景持续提供“仍在同一地点”的感觉 | ArchiveRoom 成为六段共享地点，但只从主体边缘显出 | 不让灰墙全屏压过原站的黑色编辑感 |
| 运动时有形变，停下恢复清晰阅读 | 转场运动可有透视；停住时主体必须可辨、无遮挡 | 不把所有内容做成弯曲卡片 |
| 目标文字属于目标真实页面 | 所有标题在真实章节位置出现，由同一 DOM/CSS 提供 | 不在 3D 中再造一套标题视觉系统 |

### 3.4 本项目自己的推导

`INFERRED`

“照片从 Frame 到电脑，再接管 Stack”不是对 Unseen 的复刻，而是把上述原则应用到本项目已有的照片墙、电脑屏幕、红色流线与章节结构：来源主体不先消失，空间作为地点存在，目标页面到位后才接管。

---

## 4. 统一转场语法

### 4.1 单一主体托管

每个桥接配置一个 `subjectId`，在任意进度只能有一个权威视觉主体：

| 桥接 | 主体 | 来源 | 空间载体 | 目标归属 |
| --- | --- | --- | --- | --- |
| Book → About | 完整 About dossier | 黑场/抵达页 | 打开的书页 | `AboutDossier` |
| About → Life | 第一张 Life 照片“球场 · 运球” | 书中生活档案页 | 信封/抽出的照片 | Life DriftWall 首张照片 |
| Life → Frame | “庭院 · 木门” / Green Doorway | Life 中现有 `/frame/buildings/03-720.webp` | 照片墙指定相框 | Frame Building 的 `/frame/buildings/03.webp` |
| Frame → Stack | `Final Horizon` | Frame 最终主图 | 照片墙 → 电脑照片视图 | Stack 首屏的空间开口，随后由红线/标题接管 |
| Stack → Work | `WORK / SELECTED PROJECTS` 文件卡 | Stack 的 PulseGraph/红线语境 | 抽屉与抬起的文件夹 | `ProjectsIntro` |
| Work → Contact | 完整 Contact 首屏 | Work 最后一张项目/文件边缘 | 暖灯下的浅色纸面 | `FooterContact` |

说明：Life → Frame 的 Green Doorway 已同时存在于两章，是当前无需新资源即可建立真实内容对应的最佳选择。产品可决定 Frame 入口索引是否把 Building 预览改为该图；如果不改，主体应落到 Building 首组中该图的真实位置，而不能假装它是当前索引首图。

### 4.2 真实页面原子接管

同一内容有三种所有权，但只有一个视觉结果：

1. `DOM-owned`：来源章节真实 DOM。
2. `scene-owned`：3D 载体上的同一图片或目标 DOM 的无交互镜像。
3. `target-owned`：目标章节真实 DOM。

交换协议：

- 新层完成图片 decode、字体 ready、布局测量和首帧渲染前，旧层保持 100% 可见。
- 先对齐四角、裁切窗口、颜色与基线，再交换 opacity/visibility。
- 交换区间建议占全桥接 4%–8%，两层 alpha 总和恒为 1；不能先淡出旧层再等待新层。
- 3D/镜像内容必须 `aria-hidden` 且 `inert`，真实 DOM 是唯一可访问、可点击层。
- 目标章节已有的 GSAP 入场不得因接管再重播；接管结束时目标处于其真实“已进入首帧”，继续滚动后才播放章节内部节奏。

### 4.3 黑底完整房间显影

实现规则：

- WebGL 场景在桥接进入视口前已渲染目标 shot 的有效首帧。
- 黑色仍铺满视口；只有在 shot ready 后，房间完整构图才整体淡入。
- 不再使用会先暴露中央灰墙/纸面的圆角 `clip-path` aperture；书页、照片、屏幕和文件夹仍可作为场内主体，但不承担加载遮罩。
- 前 15% 锁定曝光和白平衡，不在首屏同时做曝光 tween。
- 目标为黑色章节时，房间的中性灰墙不得接触视口四边；四边始终保持黑色或由主体覆盖。
- Contact 是唯一允许最终全屏转为 `#f5f2ea` 的桥接；也只能在 Contact DOM 已对齐后扩展浅色面。

### 4.4 通用进度模型

所有桥接使用一个规范化 `P ∈ [0,1]`；下表是语义区间，不要求六段机械地共享同一相机速度。

| P | 所有权与动作 | 停住时必须成立 |
| --- | --- | --- |
| 0.00–0.10 | 来源章节 hold；目标场景屏外 ready | 与来源末帧完全一致 |
| 0.10–0.30 | 完整房间从黑底显影；主体从 DOM 对齐到空间载体 | 主体完整、没有标题卡或灰色孔径 |
| 0.30–0.62 | 空间旅行；主体始终是构图第一层级 | 不被梁、灯、杯或空墙挡住 |
| 0.62–0.82 | 镜头接近目标载体；透视逐步归零 | 内容可辨且裁切连续 |
| 0.82–0.94 | 载体扩展到目标视口几何 | 字体/图片还不换身份 |
| 0.94–1.00 | 像素对齐后原子交换到目标 DOM | 1.00 与真实章节首帧无跳变 |

缓动建议：主体的屏幕空间矩形采用 monotonic `power2.inOut`；相机路径可用 custom cubic，但屏幕空间速度不能在 0.85 以后再次加速。接管区使用线性 alpha 或等亮度 crossfade，不使用 overshoot、elastic 或惯性补间。

---

## 5. 三个必须解决的问题

### 5.1 “从观看，到构建”：Final Horizon 连续接管

#### 唯一图片

- 标题：`Final Horizon`
- 路径：`/frame/scenery/scenery-11.webp`
- 尺寸：1400 × 1050
- 画幅：4:3
- 选择理由：它是 Frame 最后一组 `scenery-close` 的 primary，当前运行时也已经把它送入电脑屏幕。

#### 设计关键帧

| P | 推荐画面与动作 |
| --- | --- |
| 0.00 | 保持 Frame 最后一张 `Final Horizon` 的真实最终帧；照片标题/索引可收束，但图片不动。 |
| 0.08 | 图片从真实 DOM 无缝交换为 screen-space custody layer；四角、4:3 裁切、焦点坐标完全一致。 |
| 0.16 | 黑色边界内开始显出照片墙；custody layer 对齐到墙上指定相框，再交换给物理相框材质。其它照片降到 35%–45% 对比，只作场所背景。 |
| 0.30 | 相机沿现有 CinemaRailTravel 转向电脑；`Final Horizon` 仍通过 custody layer 保持在视觉中心，墙上实体和屏幕缩略图只在对齐瞬间换权。 |
| 0.44 | 电脑完整进入构图，屏幕内只显示 `Final Horizon`；PulseGraph 暂存但不销毁。屏幕边框、键盘、暖灯建立“从观看到构建”的含义，不显示这句标题。 |
| 0.58 | 镜头开始正对屏幕，偏航/俯仰收敛；屏幕照片的 4:3 内容采用 contain，左右可留黑色 viewer gutter，禁止为适配宽屏突然改裁切。 |
| 0.72 | 显示器边框开始退出视口，同一图片从屏幕 quad 交换为屏幕空间 4:3 层；焦点锁定为原图归一化坐标，不跳到中心。 |
| 0.82 | 图片扩大到全屏安全区；不出现 Stack 标题、不出现米灰底纸。 |
| 0.88–0.99 | 显示器边框退出，同一张图片以 `100vw × 100svh / cover` 接管视口，并出现极轻的来源/去向 trace；图片身份、裁切与焦点保持不变。 |
| 1.00 | 空间层与真实 Stack 的连续图片帧逐像素重合后交换所有权；电脑恢复 PulseGraph。继续滚动一屏后，图片自然退入纯黑，真实标题 `The stack I work / with.` 才在章节自己的位置出现。 |

#### 反向

反向严格读取同一 `P`：从 Stack 阅读区回到全屏 `Final Horizon`，再收进电脑屏幕、回到照片墙、最后回到 Frame 原图。任何阶段都不得重新请求图片或出现 loading 文案。

#### 不能接受的替代

- 不显示“从观看，到构建。”或“Stack I work with”中间标题卡。
- 不把照片 dissolve 成无语义粒子后才重新出现另一张照片。
- 不把 4:3 图在照片墙、16:9 屏幕和全屏之间分别独立 `cover`。
- 不让台灯或空墙比照片更大、更亮。

### 5.2 Book → About：书页与真实 About 完全同屏

#### 内容契约

书中只允许出现真实 `AboutDossier`：相同的标签、kicker、中文四行标题、摘要、人像、三项 meta 与 decrypt hint。不得使用精简版或 Canvas 重排版。

本轮实测的真实目标参数（1280 × 720，DPR 2）：

| 元素 | 真实页面参数 |
| --- | --- |
| `.about__lead` | Playfair Display / Noto Serif SC；51.2px；400；字距 -2.304px；行高 53.248px；688 × 213 |
| `.about__dossier-summary` | 同 serif；15px；300；行高 23.7px；590 × 47.4 |
| `.about__portrait-img` | 428 × 502；`object-fit: cover`；`object-position: 70% 50%` |
| 页面主色 | 文字 `rgb(240,240,240)`；真实目标背景为黑色语境 |

这些数值只作为当前视口的验证样本；实现必须从目标 DOM computed style/geometry 实时读取，而不是把数值写死。

#### 设计关键帧

| P | 推荐画面与动作 |
| --- | --- |
| 0.00–0.08 | 保持黑场；房间已在屏外完成渲染。抵达文案先结束，不与书页争夺。 |
| 0.08–0.22 | 完整房间构图在纯黑上显影；镜头从可辨识的宽景进入，不先暴露局部灰墙。 |
| 0.22–0.38 | 镜头接近书本，封面打开；书页暂时保持有质感的空白，不提前塞入文字。 |
| 0.38–0.55 | 书页接近可读角度后，将完整 About DOM 镜像对齐到页面；内容作为一次整体 reveal，不分裂成另一套动画。 |
| 0.55–0.72 | 保持一个可读的稳定窗口，让用户确认“书里的就是 About”；人像不得被裁掉。 |
| 0.72–0.86 | 镜头与页面法线收敛，页面四角向视口四角扩展；先消透视，再放大，避免现在 90% 的巨幅斜裁切。 |
| 0.86–0.96 | 页面几何已固定，才把纸张/光照颜色过渡到真实 About 黑色；所有文本和人像坐标保持不动。 |
| 0.96–1.00 | 3D 页与真实 DOM 至少重合 4% 进度后交换所有权；目标章节内部动画不重播。 |

#### 对齐验收

- 1280 × 720 与 1440 × 900 下，标题、人像、摘要四角与目标 DOM 最大误差 ≤ 1 CSS px。
- 人像 normalized crop 中心误差 ≤ 0.5%，保持 `70% 50%`。
- 0.96、0.98、1.00 三帧的静态区域像素差必须只剩允许的 3D 光照/颗粒区域；文字轮廓不能重影。
- 反向时 About DOM 先与书页重叠，再恢复纸张透视；不能先把 DOM 切掉再出现空白书页。

### 5.3 空间进入：消除灰色 loading / placeholder 阶段

#### 根因拆分

当前“灰色阶段”不是一个单独 loader：

1. 入口根背景本身是黑色，正确。
2. 旧入口的 `clip-path: inset(34% 42%)` 即使处于“关闭”状态仍留下一个 16% × 32% 的中央窗口，首先露出的恰好是中性灰墙/纸面，因此像未完成占位。
3. 目标预览使用 `#c6bba3` 米灰 Canvas 纸，到末端才变成真实黑色或 Contact 米白。
4. `initiallyMounted: false` 与 200/350px mount margin 会在直接跳章后反向进入时造成真实 ready gap。

#### 推荐生命周期

```text
unmounted
  -> booting (共享 GLB / shader / fonts / critical images)
  -> shot-ready (目标相机、材质、纹理已画出一帧)
  -> armed (来源 DOM 仍 100% 可见)
  -> visible (完整房间在黑底上显影，不暴露局部灰墙)
  -> handed-off (目标 DOM 已接管)
  -> parked (保留可逆状态，不销毁关键纹理)
```

- 首屏空闲后预热六个桥接的代表帧，而不只预热 entry、frame-stack、stack-work。
- 桥接可以进入可见区的硬门槛是 `shot-ready`，不是“组件已挂载”。
- 未 ready 时继续显示来源章节/纯黑基底，滚动距离仍可累积，但不得显示局部灰墙；ready 后以完整目标 shot 开始，不能把用户丢到未完成的中间画面。
- 加载失败时跳过 3D 并保持原站 DOM 连续滚动；不要保留一段空黑或显示内部 loading 状态。
- resize、字体加载完成、图片 decode 或 GPU 恢复后，先离屏重算并画出一帧，再交换到屏幕。

---

## 6. 六段转场完整设计

### 6.1 Book → About：档案从物体变成页面

- 来源主体：黑场中的抵达线索。
- 空间主体：书本与完整 About dossier。
- 目标：真实 `#about`。
- 叙事：进入房间 → 发现一本关于“我”的档案 → 打开 → 档案铺满视口 → 页面接管。
- 正向：按 5.2 关键帧。
- 中途停止：0.55–0.72 可完整读出 dossier，0.72 以后仍不裁掉人像。
- 反向：页面重新成为书页，内容始终同一套。
- 直接跳 About：播放已有导航章节间场后直接落到真实 About；不补播房间。

### 6.2 About → Life：从档案字段到一张生活照片

- 来源主体：About dossier 的内容页。
- 空间主体：信封中抽出的 `/life/football-action.webp`。
- 目标：Life DriftWall 的同一图片。
- 叙事：镜头从完整 dossier 退回书桌，页边压入信封；信封打开，球场照片被抽出；照片成为 Life 墙的第一块，真实 Life 标题在墙稳定后出现。

建议进度：

- 0.00–0.16：About 页面保持；先缩回书页，不显示新文案。
- 0.16–0.32：完整桌面构图从黑底显影，书回到可辨识角度。
- 0.32–0.52：沿无遮挡路径移向信封；书架梁必须退出主体安全区。
- 0.52–0.72：抽出球场照片；画面中心只保留照片，杯子/梁亮度降级。
- 0.72–0.90：照片转正并对齐 Life DriftWall 里的同一项；标题仍不进入照片。
- 0.90–1.00：真实 Life DOM 接管；eyebrow、89.6px 标题和正文只在目标位置出现。

### 6.3 Life → Frame：生活照片进入视觉档案

- 来源主体：Life 中已有的“庭院 · 木门” `/frame/buildings/03-720.webp`。
- 空间主体：照片墙指定相框。
- 目标主体：Frame Building 中 `Green Doorway` `/frame/buildings/03.webp`。
- 叙事：DriftWall 的多图运动逐步减速，一张共享照片脱离墙面；相机通过同一张图进入 ArchiveRoom 的物理照片墙；图片对齐到 Frame 的真实内容位置，随后 Frame 入口文本/索引在原站位置出现。

建议进度：

- 0.00–0.14：Life DriftWall 降速并停到稳定矩形，Green Doorway 获得边缘/亮度强调。
- 0.14–0.30：其它照片退到黑色，Green Doorway 保持原裁切并进入 custody layer。
- 0.30–0.58：完整房间构图显影；相机只围绕这张图运动，不扫过大面积空墙。
- 0.58–0.80：图片转正、消透视，使用高清 `/frame/buildings/03.webp` 无感替换 720 版本。
- 0.80–0.94：落到 Frame 的真实 Building 内容位置或经 PM 确认后的 Index 预览位置。
- 0.94–1.00：真实 Frame DOM 接管；`Frames of living systems.`、正文和 Archive Index 保持原排版。

### 6.4 Frame → Stack：照片成为屏幕，再让位给系统

- 按 5.1 执行。
- 图片主体：`Final Horizon`。
- 连接符：原图红色栏杆切线 → Stack 现有红色 flow line。
- 默认显示器状态：只在 0.36–0.78 切 `photo`；前后都恢复 `project` / PulseGraph。
- 目标标题：只在真实 `#skills` 位置出现，不进入显示器、不进入米灰纸。

### 6.5 Stack → Work：从工具运行到可打开的项目档案

- 来源主体：Stack 红色 flow + 默认 PulseGraph 屏幕。
- 空间主体：已有 `WORK / SELECTED PROJECTS` 文件卡与抽屉。
- 目标：真实 `ProjectsIntro`，包括 MaskedHeading、侧文与首组项目卡。
- 叙事：红色 flow 从页面进入电脑屏幕边缘，再沿桌面指向抽屉；抽屉打开，文件卡抬起；文件卡不是手工标题纸，而是 Work 首屏的真实无交互镜像；放大对齐后目标 DOM 接管。

建议进度：

- 0.00–0.14：Stack 首屏保持，红线继续流动但标题不复制到空间。
- 0.14–0.34：红线引导镜头靠近 PulseGraph；屏幕内容保持默认项目态。
- 0.34–0.58：镜头沿红线转向抽屉，执行现有 WorkDrawerOpen / WorkFolderLift。
- 0.58–0.76：文件卡抬起，先显示既有档案标签；避免空白灰墙占据超过 20% 视口。
- 0.76–0.92：文件正对相机，交换为真实 `ProjectsIntro` 镜像；MaskedHeading 必须使用其 SVG mask/真实图片源，不能变成普通 Canvas 白字。
- 0.92–1.00：黑色目标 DOM 接管；实际首屏的位置、侧文和项目卡均不跳。

### 6.6 Work → Contact：从档案室退场到真实邀请

- 来源主体：Work 最后的项目/文件边缘。
- 空间主体：暖灯下的浅色纸面与房间远景。
- 目标：真实 `FooterContact`。
- 叙事：最后的项目重新归档，镜头退到房间远景，暖灯形成浅色安全区；真实 Contact 首屏进入该区域并逐步成为整个米白页面。

建议进度：

- 0.00–0.24：Work 最终内容缩回文件/抽屉，仍可认出来源对象。
- 0.24–0.58：镜头退到当前表现较好的房间宽景；PulseGraph 降亮但内容不替换。
- 0.58–0.78：暖灯和纸面建立 Contact 安全区，四边仍为深色。
- 0.78–0.92：真实 Contact DOM 镜像出现：两行标题、斜体 `lasts`、kicker、两条联系方式与 ASCII 结构都在正确位置；镜像链接 inert。
- 0.92–1.00：浅色安全区扩展到 `#f5f2ea` 全屏，真实 Contact DOM 原子接管并恢复可点击链接。

当前把 Contact 文字塞进最后约 1.5% 的做法必须取消；可读内容至少占 14%–22% 的转场进度。

---

## 7. 字体、文案、图片与动效一致性合同

### 7.1 真实内容来源

| 目标章节 | 唯一内容来源 | 禁止来源 |
| --- | --- | --- |
| About | `AboutDossier` 同一组件/DOM capture | 手工 Canvas 排版、精简 dossier |
| Life | `LifeGallery` 的真实标题、正文、DriftWall item | “系统之外……”替代标题 |
| Frame | `ArchiveTextPanel` + `AccordionGallery`/真实 Frame 节点 | 只有标题的米灰纸 |
| Stack | `Skills` 的 split-line 标题和 flow SVG | `textContent` 拼接的标题 |
| Work | `ProjectsIntro` 的 MaskedHeading、侧文、项目卡 | 普通白字 `Six things...` |
| Contact | `FooterContact` 完整结构 | 缺空格、无斜体、无链接的 Canvas 文本 |

### 7.2 本轮实测排版样本

视口 1280 × 720，DPR 2：

| 章节 | 真实标题样本 |
| --- | --- |
| Life | 89.6px serif；字距 -4.928px；行高 82.432px；两条显式 mask line |
| Frame | 47.36px serif；行高 46.4128px；正文和索引属于同一入口构图 |
| Stack | 102.4px serif；字距 -4.096px；行高 102.4px；两条显式 split line |
| Work | 标题由 SVG MaskedHeading 和项目图片源生成，不能用外层元素的 24px computed size 重建 |
| Contact | 81.92px serif；字距 -3.2768px；行高 73.728px；第二行 `lasts` 为 emphasis |

### 7.3 运行时对齐字段

每个 handoff contract 至少记录：

```ts
type SubjectHandoff = {
  subjectId: string
  sourceElement: Element
  targetElement: Element
  sourceRect: DOMRectReadOnly
  targetRect: DOMRectReadOnly
  objectFit: 'cover' | 'contain'
  focalPoint: { x: number; y: number }
  sourceCrop: { x: number; y: number; width: number; height: number }
  targetCrop: { x: number; y: number; width: number; height: number }
  fontReady: boolean
  imageDecoded: boolean
  sceneFrameReady: boolean
}
```

这只是接口草案，不要求文件名或 API 原样实现；关键是验收字段必须存在，不能靠肉眼猜对齐。

### 7.4 动效边界

- 主体不使用 blur 作为交换遮羞布；允许的最大 blur 只服务景深，且接管前归零。
- 不在最后 10% 同时改相机、纸张颜色、字体布局和页面 opacity。
- 页面内已有 reveal 若在目标首屏尚未完成，桥接层应显示它的最终首屏状态；进入目标后不再次触发。
- 在任意中间进度停止 500ms 后，除胶片颗粒、呼吸灯和已存在的环境动效外，主体矩形两帧位移应 < 0.5 CSS px。

---

## 8. 正向、停止、反向、直接导航

### 8.1 正向滚动

- `P` 只由实际滚动位置计算；不得用独立时间线偷偷跑完。
- 内容 ready 之前视觉进度钳在来源状态；ready 后追上时采用不超过 120ms 的无 overshoot 校正。
- 主体权威层按 `DOM → scene → target DOM` 变化。

### 8.2 中途停止

- 每个 10% 采样点都必须是一张可接受的构图，而不是“只有动起来才成立”。
- 主体占比、无遮挡安全区、标题可读性和视口边缘颜色都有静态验收。
- 不继续执行相机 tween；环境动效不得改变交接几何。

### 8.3 反向滚动

- 反向使用完全相同的 mapping、crop 与 camera state，不建立第二条“看起来差不多”的返回时间线。
- 目标 DOM 在 scene 层 ready 前保持可见。
- 经过 `P=0.5` 后再正向，必须回到同一矩阵和同一裁切；不能因 attach 次数不同改变画面。

### 8.4 直接导航

- 保留现有章节导航的品牌间场；它与空间转场是两种不同语法。
- HOME/ABOUT/FRAME/STACK/WORK/CONTACT 的直接跳转落到真实章节 anchor，不播放中间房间飞行。
- 跳转完成前在后台把相邻前后桥接设为 `parked/shot-ready`。
- 用户随后反向滚入桥接时，从对应 `P=1` 的像素状态开始，不能出现 loading、灰场或先跳到错误相机。
- 导航直接落在真实阅读首帧，不重播空间桥；Stack 使用章节内部 `data-chapter-reading-target`，因此直接导航跳过全屏照片，而自然滚动仍完整保留照片接管。
- 快速滚动/直接跨章以当前实际滚动或最后一次导航意图为准；旧桥接的异步 decode/attach 结果必须丢弃。

---

## 9. 现有模型支持与最小模型变更

### 9.1 当前模型/运行时已经支持

`CODE`

- 一套共享 `ArchiveRoom` 与 seekable rig。
- 书本打开、信封打开/照片抽出、照片墙/相机轨道、抽屉打开、文件夹抬起、打印件落位等现有动画。
- About/Life/Frame/Stack/Work 的 reading surface anchors。
- `StackPhotoViewerSurface`、`MonitorPhoto_Thumbnail` 与显示器 project/photo 状态。
- 相机 view、共享材质与现有温暖灯光。

因此推荐方案第一版**不需要新增房间、网格、材质、图片或动画 clip**。大多数问题在内容所有权、屏幕空间对齐、相机曲线、遮罩和加载门控。

### 9.2 只有满足以下条件才允许最小改模

先用代码测量模型节点 world-space bounds 与投影四角。如果仍无法通过验收，可在同一 `.blend` 内做以下非视觉辅助项：

1. 为 Frame → Stack 指定照片墙相框补四个 non-rendering corner empties。
2. 为显示器内框补四个 bezel-safe anchors，避免用近似 bounding box。
3. 为 About → Life 增加/调整一个 camera target empty，绕开书架横梁与杯子遮挡。
4. 为 Contact 增加一个 paper safe-area empty，定义浅色面展开边界。

限制：

- 不新增网格、材质、纹理、灯光主题或大段动画。
- 不替换 `tim-cai-personal-archive.blend` 的房间设计。
- GLB 替换必须保留节点/动画契约检查、像素完整性检查和明确回滚点。

---

## 10. 开发任务拆分

| ID | 优先级 | 任务 | 主要模块 | 依赖 | 是否可能改模 | 验收要点 | 回滚边界 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ST-00 | P0 | 固化基线与视觉证据矩阵 | docs、QA 脚本 | 无 | 否 | 记录 branch/HEAD/status、六桥双向样本、既有 hash 差异 | 纯证据提交可独立回退 |
| ST-01 | P0 | 建立 SubjectHandoff 配置与单一 `P` 状态机 | `chapterTracks.ts`、bridge/director | ST-00 | 否 | 正反同值同矩阵；异步结果可取消 | feature flag 回旧 bridge |
| ST-02 | P0 | 去除非 About 的泛化标题纸；引入真实 DOM capture/几何对齐 | `useChapterPreview`、`archiveReadingSurface`、目标章节 | ST-01 | 否 | 无缺空格；字体/换行/图片/正文与目标一致 | 每桥独立开关 |
| ST-03 | P0 | shot-ready 门控、六桥预热、完整房间黑底显影 | runtime、bridge、CSS | ST-01 | 否 | 冷启/反向/跳章无灰 loading；失败时原站 DOM 连续 | 关闭 3D，回 DOM fallback |
| ST-04 | P0 | Book → About 最后 30% 重构 | entry bridge、About dossier、camera mapping | ST-02/03 | 条件性 | 0.96–1.00 ≤1px 对齐；人像 crop 不跳 | 只回退 entry track |
| ST-05 | P0 | Final Horizon custody chain | frame-stack、monitor surfaces、flow geometry | ST-01/03 | 条件性 | Frame→墙→屏幕→Stack 全程同图；无中间标题；反向无 load | 只回退 frame-stack track |
| ST-06 | P1 | About→Life 主体/无遮挡相机 | about-life | ST-02/03 | 条件性 | 球场照片映射；中段无遮挡 | 单桥回退 |
| ST-07 | P1 | Life→Frame 共享 Green Doorway | life-frame、Life/Frame content mapping | ST-02/03、PM 决策 | 条件性 | 720→原图替换无裁切跳变 | 单桥回退；不改原内容 |
| ST-08 | P1 | Stack→Work 真实 ProjectsIntro 文件卡 | stack-work、ProjectsIntro | ST-02/03 | 否 | MaskedHeading/侧文/首卡全映射 | 单桥回退 |
| ST-09 | P1 | Work→Contact 完整 Contact 浅色接管 | work-contact、FooterContact | ST-02/03 | 条件性 | 两行/斜体/链接/ASCII；浅色扩展不闪 | 单桥回退 |
| ST-10 | P0 | 直接跳章、快速跳章与反向 parking | nav、runtime lifecycle | ST-01/03 | 否 | 最后意图生效；反向首帧 ready | 关闭邻桥预备策略 |
| ST-11 | P0 | resize、字体、图片 decode、GPU 恢复后的再投影 | runtime、surface/capture | ST-01–10 | 否 | 居中过程离屏完成；无 1 帧错位 | 保留旧尺寸至新帧 ready |
| ST-12 | P0 | 真实像素与视觉回归验收 | tests、截图、raw/final probe | 全部 | 否 | 完成 11 节矩阵；hash guard 单列 | 不通过即不合并对应桥 |

建议提交策略：每个 ST 一个可回滚 vertical slice；任何模型辅助修改单独提交，不能和转场状态机混在同一提交。

---

## 11. 技术与视觉验收矩阵

### 11.1 固定采样

每个桥接正向与反向都采样：

`0.00, 0.05, 0.12, 0.25, 0.40, 0.55, 0.70, 0.82, 0.90, 0.96, 0.995, 1.00`

至少覆盖：

- 1280 × 720，DPR 2
- 1440 × 900，DPR 1/2（按设备可用）
- 正常速度、快速滚动、来回 scrub、中途停 500ms
- 冷加载、热缓存、CPU/网络降速
- resize 发生在 `P=0.50` 与 `P=0.96`

### 11.2 像素完整性

- raw HDR 与最终 postprocessed framebuffer 均检查 non-finite、透明洞、未清理像素和大面积异常值。
- 各向异性、DOF、bloom 与异常值修复全部开启后验收；关闭 bloom 只能用于定位，不能作为通过条件。
- 每个主体四角附近额外布置高密度 probe，防止边框缩放后出现 1–2px 裂缝。
- GPU context loss/restore 后重新跑六桥至少 `P=.12/.55/.96` 三点。

### 11.3 文案与布局

- 文字内容从语义节点拼接或直接 capture，禁止裸 `textContent` 导致分行空格丢失。
- 目标接管帧比较 font-family、font-weight、font-style、font-size、letter-spacing、line-height、显式换行和 emphasis。
- 标题/正文/图片/索引关键矩形最大误差 ≤ 1 CSS px。
- 图片 normalized crop/focal point 误差 ≤ 0.5%；不得发生 `cover ↔ contain` 无过渡切换。
- 3D 镜像无重复可访问文本、无重复 tab stop；真实 DOM 接管后链接可用。

### 11.4 交互与生命周期

- 双向滚动 round-trip 后，相机/物体矩阵与 crop 回到同值（浮点容差由测试固定）。
- 快速跳章只落到最终意图；旧异步任务不可晚到覆盖新状态。
- 直接跳章后首次反向进入相邻桥：0 个 loading frame，0 个灰色 placeholder frame。
- resize 后两帧内完成重投影；重算期间保留旧有效帧。
- 图片 decode 失败或 WebGL 不可用时，原站章节连续、可读、可导航，不保留空白桥接长度。

### 11.5 第三方哈希守卫

- 现有 `DecryptRevealVanilla.ts` vendor hash 差异继续作为“既有、独立”项记录：expected `97b9d215d98bdc7cc49f953ab686c8f6c4097cbba173f1514113dabae54098be`，actual `f59883071a44403f667f55eef8089628e9a7de28e79b9988de63561220944b1d`。
- 本次分支若未触碰该文件，不得因为该差异把转场视觉失败标为通过，也不得把整个任务伪装成只剩 vendor 问题。
- 若本次实际触碰第三方文件，必须重新判定为本次范围内失败并走单独审查。

### 11.6 人工视觉验收

自动检查只证明有限值、矩阵与几何，不等于视觉接受。产品经理/设计负责人必须逐桥观看：

- 来源主体是否始终清楚；
- 中途每一停驻是否仍是好构图；
- 目标首屏是否像原站，而不是 3D 重新设计的页面；
- Forward、reverse、jump-back 是否具有同一内容身份；
- 暖材质与光影是否丰富了叙事，而不是把黑色编辑感洗成灰色。

---

## 12. 主要风险与待决策

### 12.1 主要风险

1. **DOM capture 与动态效果**：Work 的 MaskedHeading 包含 SVG mask/图片源，简单截图可能在 resize 或图片 decode 时失配；应复用真实渲染节点或稳定的 capture runtime。
2. **WebGL 与 DOM 像素对齐**：相机透视、DPR 和 postprocess 会放大 1px 错误；需要屏幕空间四角测量而不是凭相机参数估算。
3. **滚动长度**：现有每桥 180–250svh。重新分配节奏后可能需要小幅调整，但不得用更长滚动掩盖构图问题。
4. **场景遮挡**：About → Life 当前书架梁/杯子明显遮挡。若只靠相机曲线仍无法避开，才需要 camera target empty。
5. **预热成本**：六桥全预热不能等于六套 WebGL 上下文或六份 GLB；必须继续共享 runtime，并按纹理优先级预备。
6. **降级一致性**：reduced-motion/低能力设备虽不在手机范围，但桌面降级仍应保持内容身份，不能回到另一套标题卡。

### 12.2 待产品经理决策

1. Life → Frame 的 Green Doorway 最终落点：
   - A（推荐）：把 Frame Index 的 Building 预览调整为 Green Doorway，使交接后仍落在 Frame 入口；
   - B：保持 Index 现状，空间直接对齐 Building 首组中的 Green Doorway，并为章节导航保留 Frame 入口锚点。
2. Frame → Stack 全屏照片阶段的长度：推荐 10%–14% 进度；更长会压过 Stack 的黑色首屏，更短会削弱主体确认。
3. 直接导航现有品牌间场是否保留当前时长：推荐保留视觉，但总时长控制在 1.2–1.8s；空间桥接不参与。
4. 是否允许 Contact 在空间层显示可读联系方式：推荐显示但 inert，真实 DOM 接管后才可点击。

---

## 13. 第一阶段最小完整体验（MVE）

第一阶段不应只做好一条桥、让另外五条继续暴露米灰标题纸。最小“完整”交付建议是：

1. 全局完成 ST-01 / ST-02 / ST-03 / ST-10：建立可逆所有权、移除所有泛化标题纸、消除灰色 loading、处理直接跳章与反向 parking。
2. Book → About 完整达到像素接管标准。
3. Frame → Stack 完整实现 `Final Horizon` 从 Frame → 照片墙 → 电脑 → 全屏 → Stack 红线/真实首屏。
4. 其余四桥在完整精修前使用克制的保底方案：来源主体 + 黑底完整房间显影 + 真实目标 DOM 对齐；宁可减少相机动作，也不再显示不对应的标题纸。
5. 完成六桥的正向、停止、反向、快速跳章、resize、冷加载、GPU 恢复和真实像素 QA。

这个阶段已经形成从 HOME 到 CONTACT 的一致产品语法，同时把最有品牌辨识度的 Book → About 与 Frame → Stack 做成可供下一阶段复用的标杆。

---

## 14. 产品经理审查摘要

### 推荐方案

采用“单一主体托管 + 真实页面原子接管 + 黑底完整房间显影”。删掉所有过渡性标题卡和米灰仿页面，让 3D 承担空间、载体和光影，让原站 DOM 承担字体、文案、图片与阅读。

### 三项核心问题

1. **Frame → Stack 图片连续**：固定使用现有 `Final Horizon`，按 Frame 原图 → 照片墙 → 电脑照片视图 → 全屏图片 → 红栏杆切线接 Stack 红线 → 真实 Stack 首屏的路径交接；中间无标题卡。
2. **Book → About 同屏**：继续使用已经正确的完整 `AboutDossier`，重做最后 30%；先消透视、再固定几何、再变背景、最后交换 DOM，保证文字、人像、crop 与实际 About 对齐。
3. **空间进入不再发灰**：场景先离屏 ready，来源页面/黑底保持；取消会先暴露局部灰墙的圆角 aperture 和 `#c6bba3` 泛化标题纸，完整房间一次显影，反向不出现 loading。

### 主要风险

- 动态 DOM capture（尤其 Work MaskedHeading）的稳定性；
- DPR/透视/postprocess 下的亚像素对齐；
- About → Life 遮挡可能需要一个最小 camera target；
- 六桥预热必须在共享 runtime 内完成，不能增加 WebGL context。

### 待决策事项

- Green Doorway 是落在 Frame Index 还是直接落到 Building 内容；
- Frame → Stack 全屏照片的节奏长度；
- 直接导航品牌间场是否缩短；
- Contact 空间镜像是否显示完整联系方式但保持 inert。

### 第一阶段应交付

全站统一移除错误标题纸/灰 loading，完成可逆 handoff 基础设施；精修 Book → About 与 Frame → Stack；其余四桥至少切换为来源主体到真实目标 DOM 的克制保底；跑完六桥的双向、跳章、resize、加载、GPU 和真实像素验收。

---

## 15. 实施结果（2026-09-08）

### 15.1 已落地

- 六个空间入口改为同一套可寻址进度合同；进度只决定完整房间显影、镜头、主体和真实章节接管，不再依赖播放历史。
- 五个章间桥全部移除泛化标题卡，直接复用 Life、Frame、Stack、Work、Contact 的真实首屏组件；预览层为 inert，真实章节接管后才恢复交互。
- Book → About 保留完整 `AboutDossier`。书页在 68%–84% 消除透视，在 80%–92% 从纸张材质合并为原站纯黑，92% 已与 About 画面重合。
- Frame → Stack 固定使用 `/frame/scenery/scenery-11.webp`（Final Horizon）。电脑常态仍显示 PulseGraph，仅在该桥 16%–84% 进入照片态；照片扩大到视口后与 Stack 真实连续图片帧重合，继续滚动才进入标题和红线，途中没有替代标题卡。
- About → Life 使用 `/life/football-action.webp`，Life → Frame 使用 `/frame/buildings/03.webp`；两张图只作为真实内容主体，目标文案仍由章节组件排版。
- Stack → Work 延续抽屉与项目文件夹；Work → Contact 将真实 Contact 页面映射到 `WorkReading` 阅读面，再扩展至完整米白页。
- 空间入口和章间入口统一使用纯黑基底上的完整房间显影；资源未 ready 时保持黑场与原章节，不显示灰色占位。全部预览图片、字体和共享房间在 Loader 释放前完成准备。
- 开幕 Dither 像素画布在 Loader 的 loading、ready 与退出阶段始终保留，不再因资源状态切换提前卸载。进度条按“成功完成的资源”计算；失败项会留下真实缺口，不再出现 100% 后仍提示部分资源未准备好的矛盾状态。
- 保留方向性金属材质、非有限值像素修复、共享 WebGL 运行时、context loss 恢复和 PulseGraph 常态屏幕；未修改模型与资源。

### 15.2 当前证据

- 实际基线：`main @ 55c4ad384f15dea3147db5832f8810d7f34ccf47`。
- 生产构建通过；TypeScript、ESLint、113 个单元测试和除既有 vendor hash 外的全部构建守卫通过。
- 912 × 863 的生产预览中，六个空间入口已逐段抽查；共享画布均回报 `ready`，没有再出现局部灰色 aperture 或大面积缺失像素。
- 五个章间桥在 99.5% 的预览首帧与真实章节具有相同的字体、行高、字距、换行和宽度；剩余约 3–5 px 垂直差来自目标章节尚距 100% 约 0.5%，到 100% 消失。
- Frame → Stack 的 58% → 90% → 58% 往返后，主体位置、缩放、透明度、目标透明度及 GPU 进度回到同值。
- 直接导航 `#skills` 时落在 Stack 的可读首帧（标题距视口顶约 194px），自然滚动则先看到与空间末帧完全同图同裁切的连续照片。
- 浏览器在多标签上下文压力下记录过 context lost，随后共享画布恢复为 `ready`，六桥继续保持 `failed=false`。

### 15.3 独立未通过项

第三方哈希守卫仍报告既有差异：`DecryptRevealVanilla.ts` expected `97b9d215d98bdc7cc49f953ab686c8f6c4097cbba173f1514113dabae54098be`，actual `f59883071a44403f667f55eef8089628e9a7de28e79b9988de63561220944b1d`。本轮没有修改该文件，故该失败单列，不计作空间转场通过，也不用于掩盖视觉问题。

### 15.4 仍需人工决策

- tim 最终判断房间中段的合理墙面亮度是否仍偏高；入口黑场本身已经消除灰色等待帧。
- tim 最终判断 Final Horizon 全屏保留约 10% 的滚动长度是否合适。
- 产品经理确认 Green Doorway 作为“进入 Frame 前的内容线索”即可，还是未来要进一步把 Frame Index 第一张预览也换为同图；后者属于内容编辑，不是本轮模型变更。
