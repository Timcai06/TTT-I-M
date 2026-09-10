# NR-Q04 · 入口、全局导航与屏幕章节独立验证

**READY，NR-04已交付，PM已冻结50文件候选及49份文本原文。** QA沿用tim当前模型/推理设置，产品只读；实际清单、接口和测试名以派发时版本为准。

仅写 `docs/pm/reports/NR-Q04-global-verification.md` 及 `output/pm/NR-Q04/`。不改产品/正式测试/DEV证据，不在未冻结候选上作最终验收。基于NR-Q03经验续接，不再初始化或重复全库盘点。

四组实际结果：

1. 真实Index检视、退出到entry/About、Frame→Stack与Stack阅读：0/中点/1和边界正反、fresh直接定位与经历史后同T的真实actions/物件/camera/DOM一致。保留原开场像素及About书页映射。Work/Contact仍受控legacy，当前只验可达与不争写，不提前声称其D1已经推广。
2. 全局真实导航/深链/Frame子主题/项目卡子目标、同章/无源、返回和新请求取消；项目案例关闭不能恢复旧路由。Index pending请求最后一个生效，旧定时纠偏不在之后拉走位置。复验一条NR03深Frame返回和连续照片路径，范围按实际改动选取。
3. Final Horizon是scenery/scenery-close/primary/image11的稳定复合身份，与足球分开。屏幕和Stack正文及相关fallback消费者一致，重排/同号不同主题不串图、缺失/重复明确失败；实际srcSet/裁切/内容区域配准有几何或浏览器证据，不只断言同src。
4. 晚到内容/嵌套pin刷新/resize保持语义T与统一layoutVersion，真实GPU恢复中换新请求；至少一条暂态投影恢复及永久绑定失败可读退路。减少动态/窄屏初始正文可达，涉及改动才追加回归。

先看DEV具体覆盖再复用必要用例独立运行，另留一条贯穿入口→Frame深层→Stack→项目子目标的真实用户操作。真实动作/节点/投影读回与唯一交互为技术依据，不以stamp、bbox、固定长等待或截图存在替代。固定既有数值容差；未测明确NOT_RUN，不把一次通过扩张成所有设备通过。

原Playwright配置、系统Chrome、空闲非5173端口；被中断的流程也清理自有预览并核lsof。前后核候选指纹，结构化报告PASS/FAIL/NOT_RUN、实际命令/退出码及证据，交回后停止。视觉精修与最终收尾发布等tim，不自行修产品。

## 当前候选与必要核对

`output/pm/NR-04/pm-candidate-files.json` 是统一50文件清单，源版本快照 `pm-candidate-source.json`；分支feat/narrative-kernel、HEAD55c08029051b11e9687d869747907e20291940fa。DEV34交付文件匹配，NR03未列为改动的已接受文件保持，4312已释放。DEV只报告app级tsc，PM另跑完整tsc-b。DEV159单元、新global3项、旧24/25后修About落点并4项重验均为报告陈述，现有证据目录没有对应完整测试JSON，请独立重验关键新用例并保留命令/退出码日志，不直接引用为QA实测。

重点看真实Index交互/检视取消、入口About物件返回落点（刚修过）、Frame深链→Stack→项目实际子锚点、模态关闭不抢新路由、Final Horizon所有消费者身份/裁切和GPU/布局最新位置。至少核新global3项和必要About返回/NR03照片回归；已有案例焦点与reduced/narrow受影响时选定复验。现场发现行为缺口交PM，不降低断言。用户视觉精修/最终体验判断不阻塞已授权技术推广，报告不得把它列为下一卡必须等待用户的门槛。
