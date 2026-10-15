# 5.1 Skill 选路核对

对比固定 P1/P3 提交 ba54aad 的主 Skill 与本轮版本。主入口36111→8261字节；不是按字节下降宣称 Agent 成功率提高。具体任务条款按原文迁入现有文档，只调整相对链接；独立检查49/49段迁移及111个本地链接/锚点通过。

## 条款去向

| 使用场景 | 权威入口与保留范围 |
|---|---|
| 普通观察/环境/collector选型 | DIAGNOSTICS 的 Agent task notes，保留模式表、ADB环境、重型采集与隐私条件 |
| 普通执行/复现 | ACTIONS 的 Agent task notes，保留目标、授权、未知结果、控件命中与自有资源清理 |
| DOM/CSS与截断 | INSPECTORS 的 Agent task notes，保留唯一scope、结构地址不等于对象、截断不是缺失 |
| Session业务/恢复 | GAMEPLAY 的 Agent task notes，完整Decision、预算、pending归属、Outcome、保存、购买/衣柜限制、过期清理；主入口明确按任务强制读取 |
| 源码/构建/加载/工具来源 | WORKSHOP 和 PROJECT_EXPERIMENTS，保留原生/业务证明界限及模块审查，不另造开发Runner |
| Evidence与对外投影 | EVIDENCE_TOOLS、INTEGRATIONS，保留时钟/缓存/截断、可选失败不抹Generic、分享授权与来源限制 |
| 特定诊断 | PERFORMANCE、ANIMATION、PROCESS_MEMORY、APP_LIFECYCLE；不把具体性能/生命周期解释塞进每次Debug入口 |
| 文档/归档/包 | AUXILIARY_SKILLS；辅助写作不改Unknown或扩大权限 |

## 六个相同提示的前后静态评估

| 提示 | 旧入口 → 新入口 | 结果与证据边界 |
|---|---|---|
| 只查一个CSS布局问题 | 旧DOM/layout、Modes → 首表第1行、INSPECTORS/DIAGNOSTICS | 不新建Goal；scope/截断约束保留 |
| 普通Action/Journey操作 | 旧Debug/reproduce/Fix loop → 第2行、ACTIONS | 不新建Goal；授权、Unknown和清理可发现 |
| 源码修改→构建→实际加载 | 旧development-loop/Fix loop → 第3行、WORKSHOP/DEVELOPMENT_FLOW | 不强制Goal；各证明层次保留 |
| 长期状态和预算Gameplay | 旧Gameplay多段 → 第4行、GAMEPLAY task notes | 正确选GER，不能省略业务合同 |
| 历史Unknown，当前独立只读/源码 | 旧Unknown通用段 → 第5行、Common boundaries | 独立工作可继续；关联副作用仍阻挡 |
| 工具root/依赖错误 | 旧resolver/环境段 → 第一节、第6行、SKILL_INSTALL | 不新建Goal，不私扫、不自动下载或换设备 |

六项文本均可发现正确入口，无错误强制Goal或漏掉副作用约束；文本本身不要求为选路追加用户确认。缺实际目标/授权时仍需补事实。这里是独立只读评估，未将六项真实执行，也没有测量真实宿主需要的用户提示次数；不宣称普遍改善百分比。宿主是否发现并读取安装副本另由P6记录，resolver不是其替代证明。
