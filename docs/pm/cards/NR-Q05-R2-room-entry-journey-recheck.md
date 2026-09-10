# NR-Q05-R2 · 房间入口修复与全站真实旅程复核

**READY，2026-09-10 NR-05-R1已由PM冻结正式派发。** QA沿用当前用户模型，产品只读。

保留NR-Q05主体通过和NR-Q05-R1真实Life入口FAIL。先核NR-05-R1具体修复与候选指纹，复现原真实click不再被舞台拦截，再完成NR-Q05-R1卡明确的一次正常启动、不reload、不reset的用户旅程；不得把分段T采样或多个独立测试合称连续流程。小步真实滚动并在目标可读状态停止，避开已证明的固定wheel越界错误。

Index真实点击→About长文→返回物件→Life真实房间入口点击与阅读→Frame深主题/末簇→Stack→Work真实案例开关→Contact两CTA→回About/Frame核阅读书签。所有输入使用可见真实控件/滚动，允许只读状态诊断；禁止force/evaluate click、改样式、直接sample或T定位。入口独立覆盖有必要时复用DEV命中检查方法，但至少一次当前候选由QA独立实际点击原Life按钮。

只对本修复涉及的命中层补必要回归：当前命中owner唯一、隐藏/非当前舞台不挡前景正文/导航、Index/return/footer仍可用。其他已经独立通过的绑定/GPU/几何/type等不无故重跑。必要原始日志/失败到通过对照、2至3张未覆盖样式截图、准确运行命令与退出码，候选前后一致。清理自有测试端口，禁止碰5173。

报告 `docs/pm/reports/NR-Q05-R2-room-entry-journey-recheck.md`、证据 `output/pm/NR-Q05-R2/`。真实技术问题未闭合不得判PASS；通过后停止，由PM决定最终技术验收。视觉精修及发布等tim。


## 正式候选与已查根因

- `output/pm/NR-05-R1/pm-candidate-files.json`：60文件，PM独立核对4修改产品源+55保护文件无差异，另纳入1个新增入口测试。
- `output/pm/NR-05-R1/pm-candidate-source.json`：59完整文本原文；GLB保持原哈希。
- DEV `NR-05-R1-delivery.md`、`verification.json`：2/2真实点击，六共享入口；源码守卫/完整tsc/lint通过。PM将独立检查。
- QA R1首次所谓visible/enabled按钮实为尚未激活但错误暴露可用性，pointer-events:none；修复隐藏并收回未激活入口，当前owner同步DOM语义。另修复整视口button+clip默认命中点、sticky stage未到top0时坐标归属，以及固定React disabled props阻止合成onClick的问题。
- 真实点击允许先只读当前物件多边形/elementFromPoint，再普通鼠标点击物件内部；这和用户点击真实物件一致，不用force或注入事件。请复用已验证的DEV点击方法，勿再盲点全视口矩形中心/固定大wheel。
- footer只有可见时才可计实际点击通过。尽量在正常flow补一个当前可见的继续阅读链接；若当前owner有意隐藏footer，记录真实条件，不强点不可见控件。


### R2 失败后的只读定位补充

PM 要求 QA 在60候选不变时补一次最小只读事件/导航跟踪，保存到 `output/pm/NR-Q05-R2/diagnostic-followup/` 和单独 `docs/pm/reports/NR-Q05-R2-click-trace.md`。复现同一路径，capture监听真实pointerdown/up/click的target、isTrusted、当时disabled/aria/tab/scroll/位置；只读记录点击前后hash、DOM dataset、当前导航请求（可读取现成只读接口，不调用路由/sample）、目标正文inert与几次短时间读回。确认到point时的elementFromPoint与事件真正target不同与否；最后一轮wheel须等待实际scroll/目标bbox稳定，再获取新点发真实点击。区分导航失败与坐标移动造成未命中。不要凭诊断flag不同推断因果，DEV还改了hardware能力。必要时对相同硬件/viewport/时序仅切flag作单变量对照；最多定点补证，不跑全套。

若Life问题经稳定点击证明仅脚本时序，应继续原真实流程；Frame需通过实际可见主题入口/真实滚动到Cuisine，不能假设全局Frame导航直接激活Cuisine末簇。所有失败保留并准确归因，产品不写。
