# 5.1.0 — Paisley Park（本地候选）

5.1维护5.0既有能力，重点修正文档与CLI反馈、缩短Skill选路入口并改善安装失败恢复。尚未推送、打Tag或发布Release；正式跨平台发布仍需Windows安装器定向验证。

- Debug、Action/Journey、源码构建、GER与安装排障先按任务选路，完整合同放入现有对应文档；普通Debug不强制走GER。
- seconds适用范围、无进展提示、Node/SQLite前提及宿主发现说明与实际行为对齐。已知错误返回稳定分类和处理建议，不泄漏原始异常，不将timeout当设备故障。
- Skill先暂存核验，再独占发布且SKILL.md最后出现。新完整性清单拒绝残缺安装；已有目标不覆盖，未知资源不清理。中断后的处理见 [安装说明](SKILL_INSTALL.md#安装失败与重试)。
- Integration明确顺序观察的文档归属边界；不以相同URL、采集目录或manifest假定同一文档代次。

最低Node22.12.0；Gameplay仍需SQLite启动参数与锁定XState5.33.2，普通help/version/诊断/Skill安装不引入这些依赖。GER schema、Unknown、预算、Effect Ledger与Android目标身份合同保持原样，不迁移私人数据。向新空目录安装，保留旧Tools/Skill/Store。

Mac自动化与真实隔离Chrome的实际记录、未验环境和发布条件见 [5.1维护验收](MAINTENANCE_5_1.md)。无真实游戏资源或私人Profile进入包。候选包遵循 [固定提交验货规范](RELEASE_PACKAGE.md)。
