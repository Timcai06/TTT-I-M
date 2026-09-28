# 2A 章节实现与样式归位

基点为 1C 提交 `47ee2e5`。[36 项逐文件映射](chapter-moves.tsv)记录原路径、新路径、前后 SHA-256 和比对方式；其中 Skills 的旧 flow hook 在这一批仅搬迁，是否删除由批次 3 单独决定。

Hero、Life、Skills、Frame、About、Work transition 的实现与专属样式已放进对应章节。Hero 的粒子肖像和两份 GLSL 同属 Hero；Frame 的内部组件与滚动辅助函数同属 Frame。共用视觉组件、AboutDossier、房间运行时、跨章节桥接组件保留现有位置，仅更新必要的 import。

迁移验证包含：

- 36 个文件逐项检查：TypeScript/TSX 经过 import 相对路径解析、路径映射和注释剔除后，AST 打印结果一致；CSS 与 GLSL 字节一致。
- `styles/app.css` 与基点相比只有八条 import 的目标路径变化，导入相对顺序、layer 和其余内容完全相同。
- build guards 与 unit tests 的直接文件读取路径同步更新；内容边界守卫原已覆盖 `components/` 和 `chapters/`，React 守卫覆盖 `src/`，保持原覆盖范围。
- 当前架构文档的阅读锚点随目录更新；历史 PM 记录继续描述当时实现。
- 264 个基点已跟踪的受保护文件与 `4155975` 的 SHA-256 一致，涵盖 App、registry、指定视频主线文件、Projects 的三个保护文件、公共素材、模型、vendor 与 workspace 配置。

`ArchiveAbout` 等桥接组件仍在 `components/personal-archive/`，没有在本批实施 2B。`chapters/projects/Projects.tsx`、`components/SciScopeFilm.tsx`、`lib/resources/mediaCache.ts` 没有改动。四类检查的原始日志见[逐批验证](verification.md)；这些检查不等同于浏览器视觉验收。
