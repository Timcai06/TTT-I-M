# VR-01 · PM增量审阅与真实几何反例

2026-09-10，阶段性问题记录，不是最终验收。DEV仍在实现，不能用此文档当冻结候选。

## 已反馈的问题

1. 初版camera重写在entry计算FOV插值后重新写Index FOV，导致entry终点与About reading不一致；后续源码已补恢复interpolatedFov，尚待最终候选检查。
2. 初版用source/destination quaternion直接插值，导致FootballTransfer的target跟随仅影响focus而不影响实际朝向；后续lookAt已恢复。删除旧避障/取景补偿后仍需要真实模型几何证据。
3. 初版natural-room.css新增6套硬编码背景。用户要求当前背景下文案对应调整，PM要求保留实际受光表面来源，或提供确证依据；不能借前景修复另换背景导致色跳。

## PM独立非浏览器诊断

证据：output/pm/VR-01-PM/geometry.ts、geometry-result-v1.json、geometry-result.json。仅写输出，不改产品，不启动浏览器/服务。

基于当前真实GLB accessor/索引/节点/动画与实际createArchiveExecution、sampleStory、solveArchiveCamera。Contact使用实际addContactReadingPlane。纹理为占位图像；材质双面以找几何碰撞，没有模拟renderer完整材质与视觉，因此近距命中最初作为候选。

旧archivePhotoTransfer.test读取器只取每个mesh的primitive[0]；ArchiveArchitecture实际有21个primitive。PM补全全部几何后，2视口×6桥接×101=1212样本：投影函数异常0，六方向3cm近距探测命中48条；这不是PASS，也不是仅有48处可能问题的穷尽证明。

具体反例：about-life p=.50、1280×720，相机[-1.1318105,1.9692112,-.8876843]。前后射线与RoomBake_Walnut_oiled的交点Y分别1.9630001和1.9970000，faces6468/6475，距离0.00624m与0.02793m，相机处于木板厚度内；p=.55/.60/.65及Life reading端点附近也有近距命中。prepareArchiveMaterials未发现隐藏该木质primitive或缩放场景的逻辑。

Life→Frame p=.45照片投影角点NDC Y达到+2.12/-3.19，p=.50也明显越界；必须结合照片实际显示阶段修复取景，不能仅凭平行自造planes测试关闭。

受检指纹：camera f16f51bf90a4656db8e9650efe7e923def2ed63f95ed147f9a451f0ada283476；spec 9b043d2e09a1e5c607d90c6a4e4929fd8712d39f6e01c39a1a46c6df1b5f0a41；GLB e90528fa2340ead3fbaca7557e38714e8965e1f96a53aec9bb1321cb516fc40f。后续变化需重验相关样本，不能引用这些数值当新候选结果。

DEV已收到数据与脚本路径；等待真实路径/必要模型修复、最后修改后的检查和完整交付。Blender保存相机的视线无碰撞不替代实际runtime solver轨迹；几何通过也不替代tim前端效果验收。

## 后续中间方案反例

随后源码对LifeReading增加最小standoff=.9，将相机移出木板但仍置于柜顶。PM的inspect-life.ts与life-sight-lines.txt实测：真实LifeReading/photo平面Y=1.26，normal竖直向上，阅读相机Y=2.16；指向照片四角的四条视线全部先在距离约0.16366m处撞到Y=1.997顶木板，之后还穿过中间层板。该中间方案未解决“从柜顶看第三层”的根本关系，且直接扩大surface.distance并未保持原物理拟合含义。已要求DEV调整真实载体/抽取动作/锚点与路径，不能靠最终DOM遮住物理错误取得验收。

## 载体修复后的定点复核

新GLB 69ae089f729f668787211fa2223ddcf64cac10fbc8e2e15db96885f651afa8ea将照片抽取终点调整至[-1.1900001,1.35,-.67]。DEV的asset-sync.json记录源Blend与GLB全25采样点最大差2.38e-7m。

PM重跑同一全primitive脚本：1212样本projectionFailures=0、六方向3cm近距命中0，42个照片样本NDC范围均未超过1.001；life-sight-lines-after-carrier-fix.txt中阅读终点通往照片四角的四条视线无阻挡。此前几何反例已闭合。新数值为有限采样/几何验证，不包含浏览器材质实效或tim审美验收。

旧geometry-result-before-carrier-fix.json及life-sight-lines.txt保留。当前全卡仍待DEV正式交付冻结、最后源码检查与后续集成，不因这项复核自动全卡完成。
