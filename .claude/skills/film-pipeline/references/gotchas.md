# 撞过的坑

## Blender / Cycles

- **照片当成密度来读时，贴图色彩空间设成 Non-Color**：先在显示值上混合，再用 Gamma 2.2 转换。不这样做，每张相纸都发灰（暗房显影着色器）。
- **移动道具后要调用 `view_layer.update()`**，否则 `matrix_world` 还是旧值。
- **模拟要增量算**：水波模拟如果每帧都从镜头第一帧重新跑一遍，复杂度是 O(n²)，要改成接着上一帧算。
- **圆形液面的网格用「方到圆」映射**：直接把顶点推到圆弧上，网格会折叠成黑色尖刺。
- **灯要对镜头隐藏**：设 `visible_camera = False` 和 `visible_glossy = False`。否则镜头直接拍到面光，整个背景被洗成一片（数字柱草稿里被洗成了淡紫）。
- **AgX 下自发光强度超过约 3 就会变纯白**，颜色全丢。英雄体保持在 2.5 左右，光晕留给后期。
- **Blender 自带的 Python 没有 PIL**：图像预处理用系统 `python3`，Blender 只读结果。
- **景深太浅就读不出细节**：85 mm f/1.6 离 20 cm 全是虚焦；90 mm f/3.2 离 12 cm，刻在柱顶的数字清楚可读。
- **一次渲染的第一帧约 100 秒**，大部分时间在编译内核；之后每帧才是正常耗时（暗房全分辨率约 20 秒一帧）。
- **后台长任务有超时**（约 1 小时），而且机器可能休眠。每一帧只由帧号决定，才能断点续渲。
- **不同 GPU 的输出有细微差别**（Metal 和 OptiX 的噪点不同），同一个镜头必须在同一台机器上渲完。

## 合成（Remotion）

- **不要用 `CameraMotionBlur`**：plus-lighter 混合会让画面偏红（实测 r−g 从 1.9 升到 7.1）。改为用 `Freeze frame={sub/4}` 渲 4 倍帧率的子帧合成，再用 ffmpeg `tmix=frames=2`、`fps=30` 合成运动模糊（见 `tools/project_films/render.sh`）。
- **颗粒只按整帧变化**（`Math.floor(frame)`），否则子帧平均会把颗粒抹掉。
- **Sequence 里的帧是局部帧**：嵌套的 Sequence 用的是局部帧号，别和全局帧号混用。
- **标签和光标要钉在页面或三维坐标上**，随镜头换算，不要写死屏幕坐标。
- **`staticFile` 统一走一个 public 目录**，用符号链接指向网站 public 和渲染输出。
- **Python 脚本不要以标准库模块命名**（比如叫 `inspect.py` 会遮住标准库的 inspect）。
- **路径里有空格和撇号**（`TTT I'M`）：用 `fileURLToPath`，不要用 `URL.pathname`（后者会得到 `%20`）。
- **zsh 不会对 `$VAR` 做单词拆分**：拼 ffmpeg 多输入参数时用 `${=VAR}` 或 Python。

## 网站

- **应用内浏览器窗格里 `document.hidden` 是 true**，播放器会拒绝播放，测试请用 Playwright。
- **`navigator.webdriver` 会关掉开屏片**，这是有意的，让 e2e 测到的是页面本身；要看片子，加 `?film=on`。
- **800×600 的视口会走手机布局**，桌面端的首屏是房间场景，不是深色 hero。
- **成片必须放在 `/projects/` 下**，才有长缓存头；另外 CSP 的 `media-src` 要允许 `blob:`。
- **推送大文件可能遇到 HTTP 408**：用 `git -c http.postBuffer=1048576000 push`。推送 `main` 就是正式部署。
