# 渲染层升级设计 · 面向奖项级体验

状态：2026-09-11 设计稿，tim 发起。范围明确为**渲染层**——不动 GLB 模型、不动 Blender、不动已确认的叙事结构与内容。模型/材质工作由 `tools/personal_space` 与 `room-material-workorder.md` 线并行，本设计与它正交：烘焙给出正确的底，渲染层给出电影感的完成度。

依据：本文件每项"当前观察"均来自 2026-09-11 对 `apps/landing/src` 的实际阅读（archiveRuntime / archiveCameraRig / archiveRuntimeLighting / archiveBackdrop / archiveAtmosphere / shared/effects/manifest / lib/webgl/quality / App.tsx / natural-room.css），以及 [Unseen 实站研究](unseen-reference.md) 中已记录的参考观察。

## 设计判断

奖项级站点与本站的差距不在"更多效果"，而在三件事：

1. **画面是"拍出来的"还是"渲出来的"**。Unseen 首页的颗粒、画面边缘彩色分离、细小亮点（[unseen-reference.md](unseen-reference.md) §02）都是后期层的摄影语言，不是模型细节。本站 composer 目前是工程管线（渲染→NaN 守卫→景深→Bloom→输出→AA），缺一个**统一的摄影调色层**。
2. **空间在静止时是否仍然活着**。本站窗外已有天空漂移、鸟、湖面微光（archiveBackdrop / archiveAtmosphere），但房间内部——光本身、空气、尘埃——是完全静止的。评审停留的每个瞬间，房间应该仍在呼吸。
3. **物件是否回应人的靠近**。房间 canvas 目前 `pointer-events: none`，全站 3D 层唯一的活反馈是相机视差。档案室的物件应该"注意到"访客的手。

另有一条工程底线：奖项站评审设备千差万别，**掉帧比降分辨率更伤印象**。本站质量档位是静态的（quality.ts），没有运行期自适应。

## P0 改造项

### P0-1 电影感统调：ArchiveGradePass

- **当前观察**：`archiveRuntime.ts` 的 composer 为 Render → Finite → Bokeh → Bloom(0.12/0.35/1.35) → Output → (FXAA)。无颗粒、无暗角、无色差、无光晕。且 `natural-room.css` 里 `html[data-archive-visible] .grain { display: none; }`——DOM 颗粒层在房间可见时被隐藏，即**房间恰恰在最电影的时刻丢了颗粒**，与站内其余章节质感不一致。
- **希望访客感知的变化**：房间像被一台真实的相机拍下来——统一的胶片颗粒、柔和暗角收拢视线、画面边缘极轻微的色散、日出高光处有温柔的光晕扩散。静止时质感稳定，滚动时质感有生命。
- **方案**：在 OutputPass 之前插入一个自定义 `ShaderPass`（新增 `archiveGradePass.ts`），单 pass 四件事：
  1. **胶片颗粒**：animated hash noise，按亮度加权（暗部颗粒多于亮部，胶片特性），强度 ~0.035；`reduced-motion` 下时间冻结为静态颗粒。
  2. **暗角**：径向 smoothstep，边缘最多压暗 8–10%，中心阅读区完全保留。
  3. **边缘色散**：径向 chromatic offset，仅在画面最外 15% 渐变到 ~1.2px，中心为零（保护文字阅读）。
  4. **光晕 halation**：对亮度超阈值部分做小半径扩散并微暖化，叠在 Bloom 之后，让窗光"溢"进房间。
  全部参数为 uniform，集中在一个 `GRADE_DEFAULTS` 常量里，按质量档裁剪（low 档关色散与 halation）。
- **影响范围**：新增 `components/personal-archive/archiveGradePass.ts`；改动 `archiveRuntime.ts`（插 pass、resize 时更新 resolution uniform）；`lib/webgl/quality.ts` 增加 grade 预算字段。DOM `.grain` 隐藏规则保留不动（WebGL 接管该职责）。
- **验证方式**：指定视口（1440×900、1920×1080）截图人工对比 + `verify-pixels` 类像素守卫确认中心阅读区 ΔE 无漂移；performance.now 测 pass 耗时，high 档 1440p 下 ≤0.4ms/帧；`prefers-reduced-motion` 下确认颗粒静止。

### P0-2 空气感：体积光束与尘埃

- **当前观察**：日出 key 是 11° 低角度暖光（archiveRuntimeLighting），窗外全景有漂移、鸟、31s 呼吸辉光（archiveBackdrop），湖面有微光（archiveAtmosphere）。但**窗到地板之间没有光的存在**——光路是空的；房间内部在阅读停靠时零微动。
- **希望访客感知的变化**：停在某一段阅读时，能看到窗光在空气里的形状，光路中有极缓慢漂浮的尘埃；光是房间里"活着"的东西。
- **方案**（全部在现有 archive scene 内，不占用 optional context 预算）：
  1. **体积光束**：2–3 个 additive billboard 面片沿窗到地板的光路布置，soft gradient shader（横向羽化 + 纵向衰减），depthWrite 关、depthTest 开，强度以 30s+ 周期做 ±10% 摆动。low 档减为 1 片或关闭。
  2. **尘埃**：一个 `THREE.Points`（≤300 点，additive，sizeAttenuation，canvas 生成的软圆 sprite），约束在光路包围盒内做慢速上飘 + 正弦扰动 + 亮度 twinkle；`gl_PointSize` 按 DPR 折算。medium/low 档减半或关闭。
  3. **台灯呼吸**：task spot 强度 1.9 上叠加 ±2%、4–7s 不规则周期的摆动（与 ChapterSoundCues 互不依赖）。
- **影响范围**：新增 `archiveLightShaft.ts`、`archiveDust.ts`；`archiveRuntime.ts` 挂载并在 ambient rAF 中更新；`quality.ts` 增加开关字段。
- **验证方式**：指定视口截图确认光束不遮挡任何阅读面（含 About/Life 平铺姿态）；`renderer.info` 确认新增 draw call ≤4、顶点增量 ≤1k；帧时对比；reduced-motion 下全部静止。

### P0-3 物件可触：3D hover 反馈

- **当前观察**：房间 canvas 为 `pointer-events: none`（archiveRuntime 挂载时显式设置），指针只驱动相机视差（ambient rAF，指数平滑 rate 5）。物件对手没有任何"被注意到"的回应。
- **希望访客感知的变化**：指针掠过显示器、照片、笔记本、台灯、抽屉时，物件有轻微的受光回应（emissive 微抬），光标变为可查看语义；点击沿既有章节导航进入对应内容。档案室开始"认识"访客的手。
- **方案**：新增 `archiveHover.ts`：复用 ambient rAF 与 window pointermove（canvas 保持 pointer-events:none，不需要 DOM 命中）；Raycaster 只对白名单物件（≤8 个 mesh：显示器、照片墙照片、笔记本、信封、台灯、抽屉、书、窗）做相交，指针静止或移动超过阈值后每 3 帧一次；hover 命中时对该物件材质 `emissiveIntensity` 从 base 缓动到 base×1.35（200ms），离开后 300ms 回落；`document.body.style.cursor` 切换；点击复用既有章节导航入口。命中结果同时发布给 P1-5 的音效钩子。
- **影响范围**：新增 `archiveHover.ts`；`archiveRuntime.ts` 接入 pointer 状态与 dispose；`archiveMaterials.ts` 记录可 hover 材质的 base emissive。
- **验证方式**：指针在 4 个指定物件上移动的行为记录（命中/反馈时延）；无 hover 状态下渲染输出与现状逐像素一致（守卫）；点击导航到正确章节；reduced-motion 下保留 hover 高亮（无动效，直接切换）。

### P0-4 帧率自适应：动态 DPR

- **当前观察**：`quality.ts` 按 deviceMemory/cores/mobile 静态定档，`resize()` 里 pixelRatio 上限写死（high 2.0 / medium 1.35 / low 1.15），运行期帧率恶化时不会降载——评审设备上掉帧就是掉印象。
- **希望访客感知的变化**：任何设备上运动都稳；只有机器宽裕时才看到最锐的画面，且切换不可感知。
- **方案**：在 drawSample/schedule 路径测 frame-time EMA；连续 1.5s 超 17ms → pixelRatio 降一档（×0.85，下限 1.0）；连续 4s 低于 12ms → 回升一档（上限按 tier）；加滞回避免来回抖动。复用现有 `gl.setPixelRatio + composer.setPixelRatio` resize 路径。
- **影响范围**：`archiveRuntime.ts`、`quality.ts`。
- **验证方式**：人为 GPU 压力（并发 4K 视频播放）下观察到 pixelRatio 降档且滚动恢复顺滑；压力解除后回升；1 分钟内升降次数 ≤2。

## P1 改造项

### P1-5 滚动速度响应的摄影层

- **当前观察**：`lib/chapterScrollMetrics.ts` 已有滚动状态，Lenis 暴露 velocity；grade pass 参数是静态的。Frame 章节的 horizontal-bend 已是速度响应的（[unseen-reference.md](unseen-reference.md) §05 确认沿用），但房间本身对速度无感。
- **希望访客感知的变化**：快速滚动时画面有轻微"动感"——色散与颗粒微微增强、曝光轻移，停下立刻归于稳定，像镜头真的在移动。
- **方案**：grade pass 的 CA/grain 强度乘一个 velocity 包络（|velocity| → smoothstep(2, 30) → 上限 +80%），在 schedule/ambient 路径每帧写 uniform；Bokeh aperture 随速度轻微上探后回收（rack-focus 感）。静止 300ms 内回基线。
- **影响范围**：`archiveGradePass.ts`、`archiveRuntime.ts`。
- **验证方式**：快速滚动与静止的截图对比；速度归零后 300ms 内参数回到基线的记录。

### P1-6 落定呼吸与焦点拉拽

- **当前观察**：相机 dock 到阅读面是精确几何 fit（solveArchiveCamera），到位即停；Bokeh focus 跟 camera.focus，aperture 由 story 给出。交接中段焦点不追踪移动物件。
- **希望访客感知的变化**：每次"落定"有极轻的物理回稳（厘米级 overshoot、~300ms），像镜头真的停住；照片/物件在交接途中短暂成为焦点，再交还给阅读面。
- **方案**：(a) **dock settle**：不改 solve 端点（端点有守卫保护），在 runtime 层对最终 position 加 settle offset——仅在 align 到达 1 后的 0.3s 内，沿 view 轴加衰减正弦（幅度 ≤1.5cm），时间到精确归零。(b) **rack focus**：交接 travel 中段 aperture 从 story 值短暂升到 1.6× 再回收，focus 在 carrier 物件与阅读面之间做一次往返。
- **影响范围**：`archiveRuntime.ts`（settle offset 与 aperture 包络）、不动 `archiveCameraRig.ts` 的端点语义。
- **验证方式**：端点像素守卫不变（落定 0.3s 外逐像素一致）；连续性守卫（.17m/1% 进度速度上限）通过；录屏人工回看。

## P2 改造项

### P2-7 入场光圈：iris reveal

- **当前观察**：intro 按真实进度释放（critical 必达 / prewarm 可降级）；房间 reveal 是 visibility 切换。
- **希望访客感知的变化**：第一次看见房间，像睁开眼睛——光从中心展开，焦点从虚到实。
- **方案**：首次 reveal 时 grade pass 叠加 iris 包络（中心圆形 aperture 展开 + 曝光从 1.3 回落 + focus 从模糊到清晰，600–900ms），只发生一次，刷新/恢复路径不重放。
- **影响范围**：`archiveGradePass.ts`、`archiveRuntime.ts`。
- **验证方式**：首帧到稳定的时间记录；无白闪；恢复路径（GPU recovery）不触发 iris。

### P2-8 微音效钩子

- **当前观察**：SoundProvider / roomListener / ChapterSoundCues 已存在，听者位置跟随相机。
- **方案**：滚动速度 → 极轻的风/纸声（随速度淡入淡出）；hover 命中 → 极轻的单音（音量 −24dB 级，可关）。全部挂在既有 sound manifest 下，默认关，沿用既有声音开关。
- **影响范围**：`lib/sound/*`、P0-3 的 hover 事件。
- **验证方式**：声音开关行为；静音状态下零音频节点创建。

## 性能与工程预算（新增）

| 项 | 预算 |
| --- | --- |
| GradePass 耗时 | high 档 1440p ≤ 0.4ms/帧 |
| 新增 draw call | ≤ 4（光束 ≤3 + 尘埃 1） |
| 尘埃 | ≤300 points；medium 减半；low 关闭 |
| hover raycast | 白名单 ≤8 mesh；≤每 3 帧一次；指针静止即停 |
| 动态 DPR | 滞回：1 分钟内升降 ≤2 次 |
| 内存纪律 | 沿用 module-scope scratch 模式，帧路径零分配 |
| context 预算 | 不新增 optional WebGL context（保持 2） |

## 边界（明确不做）

- 不动 GLB / Blender / 材质烘焙线（并行的模型工作不受影响；P0-2 的光束是渲染层假体积，不要求模型配合）。
- 不动 studio、不动手机端（archiveEnabled 的 768px / reduced-motion 边界保持原样）。
- 不动已确认的叙事结构、内容、书签与物件复原行为；dock settle 等均在端点守卫之外叠加。
- reduced-motion 运行时：所有新环境动效关闭或静态化，信息不少。
- 体积仍非硬性约束，但新增纹理/代码体积变化需记录（遵循产品简报）。
- 每项改动按本流程出验证证据；最终视觉判断由 tim 给出。

## 分期建议

1. **第一批（P0-1 + P0-4）**：grade pass + 动态 DPR。改动面最小、收益最直接（统一质感 + 帧率保险），先立住"摄影层"这个地基。
2. **第二批（P0-2 + P0-3）**：光束/尘埃 + hover 可触。让房间活起来、开始回应人。
3. **第三批（P1-5 + P1-6）**：速度响应 + 落定/焦点。运动语言的精修。
4. **第四批（P2-7 + P2-8）**：入场时刻与音效细节，配合最终收尾。

每批独立可验收、可回退；均不依赖模型层在途工作的完成。
