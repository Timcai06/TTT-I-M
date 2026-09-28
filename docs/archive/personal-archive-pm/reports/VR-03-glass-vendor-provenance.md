# Glass既有本地修复的完整性审阅

2026-09-10，PM读取三笔实际提交差异并重算源码SHA。此项仅同步经审阅的历史登记，不修改Glass源码，不放宽守卫。

| 状态 | SHA-256 |
| --- | --- |
| 原登记/131d751 | 02fb8b589fbc8d9132f223799c1593feb2251c49dd1717f64b4c056248c645af |
| e0970bb | 81798315baf3ff5334d50844827490e1e692871a087bbc6e47c1fdfd41a743c7 |
| 73d8ac7 | 4966f7db8f743e61d33d1f781543d7359923ac10f12d2ad77dd2c7cfc642ae2c |
| 586378c、HEAD及当前工作区 | 9cdfd471d2ae005bdcc7ee39c0c54e0001cbb2601ec1afcca4430096ebf05caa |

逐笔变化：

- e0970bba31624f769e8332d84fe67f7314f896a4：捕获纹理的几何使用文档内host，避免staging canvas位置影响玻璃采样。
- 73d8ac7950c937ab6ba0fc203ea34cde1f3d72d2：引入hasVisibleCapture/contentUsable，纹理内容分支按真实可用性判断。其临时ready条件由下一笔收紧。
- 586378ccef2f2f0a7ece6de7c80a75470785592f：有效像素先上传再清空staging；失败保留最后纹理；contentReady/contentUsable成功后才通知初始化握手。

Glass通知仍在render清屏后、指针presence条件前，代表捕获内容已供渲染使用，不代表用户已看到玻璃镜片；没有指针时本来就不显示镜片。当前审阅不将该通知或hash验证冒充GPU可见首帧证明。实际指针效果仍WAIT_TIM。

PM接受上述既有本地适配来源，授权DEV在VR-03同步Glass的integrity.json hash并记录三笔本地提交，保留上游revision a4b40d03ad92a6210af114df7a1900a2675fe288。源码若不再是9cdfd4...需重新审阅。最终QA核对清单与守卫实际结果。
