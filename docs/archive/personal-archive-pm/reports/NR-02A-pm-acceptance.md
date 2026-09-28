# NR-02A · PM 验收

2026-09-09，**ACCEPTED**。基线 `feat/narrative-kernel` / `55c08029051b11e9687d869747907e20291940fa`；未提交、推送或部署。依据 [DEV 报告](NR-02A-delivery.md) 与最终产品代码独立复核。

## 已确认

- runtime 唯一构造 rig，Director 不再创建 mixer/actions；生产仍领取 legacy token，未启用 sample。真实模型的 11 个动作由声明绑定作全量预检后绝对采样；返回冻结的实际 action/node 数据。
- 已处理 PM 的两个执行细节：未声明 legacy-prefix action 在 sample 期间隔离；最终 paused action 的有效时间倍率缓存明确归零。真实 GLB 数据测试覆盖重复/反向/乱序、legacy 和节点污染，以及过期所有权和不可执行绑定。
- PM 扩充一个必要白名单调用点 `archiveClearance.ts`，迁移后 Director 的 rig/token 是必需参数。两个现有调用点均注入并释放唯一 rig；lab 原诊断算法未改。
- B/C 已接受的检查逻辑保持；11 个保护文件指纹不变。18 个当前产品/测试文件冻结于 `output/pm/NR-02A/pm-accepted-files.json`。

## PM 独立检查

6 个目标测试文件 34/34 通过，无跳过；完整 TypeScript solution、7 个修改 TS 的限域 ESLint、diff check 均退出 0。系统 Chrome / 临时端口 4296 的原 C 浏览器测试 3/3 通过（33.5 秒），正常两组页面错误均 0，draw 次数 587/588，均在原断言范围；故障与诊断冲突隔离保持。端口已释放，没有操作 5173。

命令摘要见 `output/pm/NR-02A/pm-checks.txt`，浏览器原日志见 `output/pm/NR-02A/pm-browser.log`。尺寸警告为提示，不阻断验收。

## 边界与后续

本卡证明动画执行层，未证明完整世界、照片转移、camera/DOM 同帧、人工视觉或全站推广。未运行 lab 全量几何扫描；其接口由类型检查和调用点审查覆盖。下一卡 NR-02B 可复用已接受的 rig 接管样段，不创建第二 mixer，也不把 action 读回冒充整帧完成。
