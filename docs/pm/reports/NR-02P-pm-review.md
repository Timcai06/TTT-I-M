# NR-02P · PM 实施边界审查

2026-09-09，**ACCEPTED（规划）**。不代表 NR-02 接管已实现或运行通过。

PM 已阅读最终两份报告，并结合当前 Director、runtime、Stage 与 Surface 的实际代码复核关键边界。接受 NR-02A 唯一 rig → NR-02B 完整接管两卡；B 不再复制 mixer，也不得先开 sample 后把导航/停驻留待以后。

接受的落地要点：旧 navigate 两端 scene 预求之前分流；Index pendingScroll 与 entry cleanup 一起约束；正常 draw/rest/prepare/校色/恢复/resize/lease 统一许可；样段即时导航在 B 完成，NR-03 再补照片连续转移与返回动画。endpoint-switch-v1 仅属可回退中间基线，不作为最终体验接受。

16 产品文件与 5 测试文件的范围有实际调用依据。A 最终 API 尚未取得，因此 B 卡保持 DRAFT，待 A 验收时核对接口后派发；不会按规划草图另造 rig 或覆盖 A 成果。B 的严格 sample 能力检查不得把本可用的 legacy Index 一并判坏，真实执行失败必须仍能阅读和返回。

NR-02P 产品只读交付无运行验收；结束指纹是观察时刻证据，DEV 随后的 A 白名单变化属于已授权增量。原报告的帧/动作/投影/恢复容差与 V1–V7 为后续验收要求，不是当前通过结论。

本次无需 tim 新的产品选择；继续按已授权主线到全站推广。视觉精修与收尾继续等待 tim 指示。
