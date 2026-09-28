# Intro Film · 暗房

开屏（Loader）与首屏（Hero）之间的一支 12–15 秒的片子。离线渲染成 mp4，由网站播放。视觉和声音的验收由 tim 完成。

## 已定的事（2026-09-28）

- **概念「暗房」**：安全灯的暗红接住开屏的颜色 → 显影盘里照片一张张浮现 → 开灯，晾在绳上的侧脸相片 → 匹配剪辑进首屏的粒子肖像。
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
| `assets/` | GPT 交付的道具 `.blend` 和预览图 | 否 |
| `work/` | 相纸贴图、渲染帧、中间产物，都能由脚本重新生成 | 否 |

脚本在 [`tools/intro_film/`](../../tools/intro_film/README.md)。成片将放在 `apps/landing/public/film/`。

GPT 目前把道具写在 `apps/landing/output/darkroom/assets/`（任务书里写的路径）。交付后迁到 `assets/`，那个目录随后删除。

## ⚠ 备份

`assets/` 和以后的场景 `.blend` 都不进 git，和 `art/personal-archive` 一样，只存在这台机器上。能由脚本重建的（`work/`）不用担心；GPT 交付的道具需要另有一份备份。
