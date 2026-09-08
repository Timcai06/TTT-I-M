# 转场近景收尾

日期：2026-09-07。目录整理以 `d3739a1` 推送后，按 tim 指示开始本阶段。范围只包括 Blender 物件、承接表面、镜头与供 tim 查看的预览，不修改前端或网页模型。

## 已制作

- About：保留平整阅读中心，在页边增加轻微翻起的纸张轮廓；为阅读区域提供四角定位点。
- Life：原厚实体信封底改为薄纸，补侧折及下折；独立照片、翻盖和抽出动作保留。
- Life → Frame：默认入口明确绑定墙上第 04 张足球照片，与信封中的图片一致。`FramePrintPivot` 和 `FrameEntryAnchor` 移到这一张；第 01 张改为带 `_01` 后缀的节点。
- Frame → Stack：显示器表面改为墙上第 02 张对应的风景图片，保持比例；保存旧工作站图片身份供未来切换。实际 Frame 尾图选择、屏幕内容切换和 Stack 正文接续仍待前端开发。
- Work：首份档案改为选作索引封面，使用已有 `ProjectsIntro` 标题 “Six things I made / in 2026.”，保留真实项目缩略图；封面四角跟随档案父节点。
- Contact：新增 `ContactCameraAnchor` 和结尾相机，附带文字安全区提案。留白是否合适由 tim 检查，尚未接入 Footer。

本轮共补齐 About、Life、Frame、Stack、Work 五组四角节点。Frame 的四角取自实际弯曲纸面，其余阅读表面使用明确的局部尺寸。1、25、72、110 帧下的位置记录在本地清单中，供后续接入读取；没有改写网站的相机配置。

## 查看

唯一工程：`art/personal-archive/source/tim-cai-personal-archive.blend`。

最新预览：`art/personal-archive/reviews/closeups/`。01–07 对应上一轮的房间和章节视角；08 为 Contact，09 为打开的书页特写，10 为提起的档案特写。1 帧静止、25 帧书和照片展开、110 帧档案提起。相机位于 `08 Model review cameras` 集合。

上一轮 `reviews/current/` 中的预览、模型清单和目录迁移记录保持原样，作为修改前的对照；它的模型哈希现在不代表最新模型。最新 `model-manifest.json` 和 `renders-all.json` 位于 `reviews/closeups/`。

## 边界

本轮只完成近景制作及接入参考数据。尚未检查网页导出后节点/动作保留、材质兼容、静态合并、压缩和运行时性能，也没有将 Blender 预览等同于网页最终效果。视觉验收由 tim 完成。网站接入继续等待明确指示。

目录整理提交不包含本地 Blender 工程及渲染图；它们仍按既有忽略规则保存。近景阶段的脚本与记录属于随后产生的工作，不计入 `d3739a1`。
