# Intro Film · 暗房

开屏（Loader）与首屏（Hero）之间的一支 12–15 秒的片子。离线渲染成 mp4，由网站播放。视觉和声音的验收由 tim 完成。

## 已定的事（2026-09-28）

- **概念「暗房」**：安全灯的暗红接住开屏的颜色 → 显影盘里照片一张张浮现 → 开灯，晾在绳上的侧脸相片 → 淡入首屏。桌面端的首屏是湖边房间里那台显示着 Index 的显示器，侧脸相片和显示器里的粒子肖像落在画面相近的位置。
- **每次访问都播**，随时可以跳过。开了“减少动态效果”的访客不播。**暂不做手机版。**
- **有音乐**，自己合成，不用授权曲目；配合暗房的声音设计（底噪、水声、计时器、开灯）。
- **不出现手或人物**，由夹子自己的动作暗示有人在操作。
- **显影的照片**（按出场顺序）：
  1. `life/football-action.webp`：盘里第一张，完整显影。
  2. `projects/sciscope/tui-product.webp`：作品，快切。
  3. `life/shanghai-skyline.webp`：地方，快切。
  4. `portrait/tim.jpg`：晾在绳上的最后一张，也是接首屏的那一帧。
  - 背景里晾着的：`life/night-portrait.webp`、`portrait/about_me.jpg`。

## 目录

| 路径 | 内容 | 进 git |
| --- | --- | --- |
| `references/keyframe-prompts.md` | ChatGPT 生成关键帧用的提示词 | 是 |
| `references/modeling-brief.md` | 交给 GPT/Codex 的道具建模任务书 | 是 |
| `references/gpt-keyframes/` | ChatGPT 生成的三张关键帧，是画面细节的目标 | 否 |
| `references/blender-style-frames/` | 第一轮 Blender 风格帧 | 否 |
| `assets/build_assets.py`、`verify_assets.py`、`README.md`、`asset_manifest.json` | GPT 交付的道具库的构建脚本和说明，能原样重建 `.blend` | 是 |
| `assets/darkroom_assets.blend`、`previews/` | 道具库本体和预览图 | 否 |
| `work/` | 相纸贴图、渲染帧、中间产物，都能由脚本重新生成 | 否 |

脚本在 [`tools/intro_film/`](../../tools/intro_film/README.md)。成片在 `apps/landing/public/projects/film/darkroom.mp4`（放在 `/projects/` 下才有 `vercel.json` 的长缓存头），网站端的播放器是 `apps/landing/src/components/film/IntroFilm.tsx`。

## 网站怎么播

- 影片在开屏期间以低优先级整段下载成 blob，下载完且能解码才向开屏登记。没准备好就不登记，开屏照常直接进首屏，**影片永远不会拖住开屏**。
- 开屏退场时影片接管画面（stage 为 `film`，滚动暂停），声音开着就有声播放，浏览器不允许时静音播放。
- 点击、滚轮、Esc/Enter/空格/↓ 都能跳过；距结尾 1 秒时首屏开始在下面出场，影片淡出。
- 不播的情况：`?film=off`、带 `#章节` 的深链接、移动端/触屏、减少动态效果、自动化浏览器（`navigator.webdriver`，让 e2e 测的是页面本身）。`?film=on` 强制播放。
- 看门狗 26 秒（`lib/introFilm.ts`）：影片卡住也一定会进首屏。

## ⚠ 备份

道具库的 `.blend` 不进 git，但它的构建脚本进了 git，`blender -b -P assets/build_assets.py` 能原样重建。场景本身由 `tools/intro_film/film.py` 每次从零搭建，不存 `.blend`。所以除了 `work/` 里可再生的中间产物，这支片子没有只存在于这台机器上的东西。
