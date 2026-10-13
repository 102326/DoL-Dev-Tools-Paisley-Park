# Gold Experience 辅助 Skill 与交付规范

2026-10-14 用户长期规范 V0.1 的项目版。适用于本开发包及相关 UI/Mod 开发；辅助 Skill 服务经验整理和人与项目的沟通，核心开发仍使用现有 Skill、Debug、GER、Workshop、Evidence。完整本机共享约定由全局 Agent 上下文加载；本页保留跨机器可用的项目规则。

## 面向读者的说明

README、Release Notes、Changelog、公告、技术摘要和用户说明，从验证报告、commit、修改说明与已知限制出发。按需沿工程事实 → 技术报告 → PRP Technical Writing → Humanizer → 最终文档接续，不强制日常开发或每次回复都走整条链。

- [PRP Technical Writing](https://github.com/Wirasm/prp/blob/435292597e7b04f64f8f275da9d2c985c4251281/.agents/skills/prp-technical-writing/SKILL.md)（`prp-technical-writing`）：结构、重点与读者解释，保留真实命令、路径和结果。
- [Humanizer](https://github.com/blader/humanizer/blob/225a6f39ac85f76ee48dbad772ea4abe4ed6c9d8/SKILL.md)（`humanizer`）：去模板腔和空泛修辞；不得改变结论、删除 Unknown、扩大验证范围或编造收益。

来源链接是此前核对的固定快照，不证明本机已安装、已调用或中文效果已验证。任务需要时先确认可用性；缺失时如实说明，不从零开发替代写作系统。既定范围内自主写作与核对，辅助 Skill 的默认提问、工具链或分工方式不能覆盖用户已有选择。

完成文档后核对事实、限制、实验/正式能力区别与读者可理解性。保留命令、代码、状态和引用的实际含义，不能为“更像人话”删掉影响判断的证据边界。

## 仓库记忆与目录职责

当前有效内容是默认依据；历史设计、废弃方案和结束实验作为带时间、来源和取代关系的参考。实验记录目标、方法、结果、是否建议继续，沿用项目已有报告/记忆和标识。

`current/archive/experiments/artifacts` 是职责示例：保留现有 `scripts/`、`.agents/skills/`、`docs/` 与构建入口，不为记录规范进行目录迁移。历史记忆不替代当前合同，Unknown 不因归档被清除。归档需要保留必要引用，不直接搬走被当前运行或安装入口依赖的文件。

## 发布包文件清单

源码仓库保留经验，发布包保留当前使用所需的代码、Skill、说明、必要资源、Schema 与许可证/声明。排除内部实验、废弃方案、私人测试数据、审计原始材料及临时文件；按实际依赖和文件清单判断，不直接按目录名批量剔除。

历史依据需要可追溯时，可由当前说明链接归档或源码仓库，不要求把全部历史装入包。`bin/skills/templates` 同样是示例，不改变当前 launchers 和 Skill resolver。发布前分别核对源码提交、包内容及摘要、安装入口和实际验货结果。

既有 RC.1 包不重写，也不追认为已经按新卫生规范重新验货。RC.2 按[包清单](RELEASE_PACKAGE.md)落实导出与链接检查，实际结果由随附验货记录说明；推送、正式合并、Tag/Release 仍依实际授权。敏感原始资料保留本地，不能因归档进入公开仓库或发行包。

不新增 Runtime、Runner、Ledger、数据库、权限流程或管理平台。按任务选择现有辅助 Skill，真实效果决定是否保留；文档规范的落地用链接、入口和一致性检查，复用有效工程证据。
