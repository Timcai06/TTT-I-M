# 个人空间目录整理

日期：2026-09-07。按 tim 最新约束，本次只整理目录、更新路径与说明。不执行之前讨论的近景建模收尾，不改变模型，不改变前端样式、代码、架构或网页资源。

## 新入口

- [制作入口](../../../art/personal-archive/README.md)：唯一工程、贴图、预览和历史文件。
- [工具入口](../../../tools/personal_space/README.md)：按建模、渲染、检查和历史脚本分组。
- `output/logs/personal-archive/`：既有网站构建日志。

原 `output/design/personal-space-refined/tim-cai-personal-archive.blend` 移至 `art/personal-archive/source/tim-cai-personal-archive.blend`。原灰模、备份和旧预览移至 `art/personal-archive/history/`；没有删除历史模型或新增模型副本。

文档继续使用 `docs/landing/experience`、`assets`、`delivery` 三层结构。最初的参考说明和交接文档移至 `art/personal-archive/references/`，历史工具 README 归入工具的 `legacy/`。现行说明更新了路径；历史资料中保留的旧地址仅用于追溯。

## 核对方式

搬迁前记录所有原设计资产与前端等受保护文件的 SHA-256。搬迁后逐一比较内容，核对文件集合未增删。完整清单位于 `art/personal-archive/reviews/current/directory-migration.json`。

核对已通过：666 个受保护文件的内容及文件集合不变；54 个原设计资产逐一核对，包含 5 个 `.blend` / `.blend1` 文件，所有模型、贴图、预览和网页资源字节一致。唯一更新的原资产元数据是 `model-manifest.json` 的 `source` 路径；源模型哈希及其他字段不变。模型内部历史路径没有重写，也没有打开或保存 Blender。

11 个 Python 脚本和 2 个 JavaScript 脚本语法检查通过，相关导入与入口路径、制作入口文档链接有效。未运行建模、渲染、网页导出或浏览器视觉检查。没有构建、提交或部署前端。
