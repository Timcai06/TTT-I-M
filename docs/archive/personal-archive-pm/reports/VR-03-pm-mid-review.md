# VR-03 PM中途检查

本文件记录动态候选的审查提示，不是冻结候选结论。DEV仍唯一产品写入，完成后的源码和证据必须重新确认。

## 已交DEV核对

1. ProjectLaser的ref保存controller，但独立effect cleanup永久destroy该controller：React StrictMode重复setup可能复用disposed实例，拒绝第二次启动。建议按effect代次构建或用可恢复deactivate；须核对Frame是否同模式。
2. Frame粒子初始host绝对定位无尺寸，却需mounted/visible后才syncGeometry：观察资格和几何建立应独立，不让零面积host造成启动等待。
3. Frame capture父host和source初始opacity为0，而父host又需首帧成功才显示：须按可绘制捕获源、独立输出显隐建立首帧路径，避免能力存在却无法形成有效捕获。该项为代码风险核对，未运行浏览器判断实际绘制。

以上已通过任务消息发给DEV。最终QA要核对闭合，不把消息发送视为问题已解决。

## PM授权的冻结守卫更新

VR-03最终build通过后，旧chunk守卫要求workHandoff独立文件，实际保留的移动/reduced WorkTransition单一消费者使其合并进入work-transition-V-ubghVy.js。PM读取源码调用链并确认该产物含portfolio:work-enter；允许DEV只解冻tests/build/chunk-guards.mjs，用实际延迟边界替代旧文件名断言，保持与eager index分离检查、体积advisory。该文件须纳入VR-03冻结清单并由QA最终重审；不得恢复已删除的Laser portal消费来迎合旧断言。
