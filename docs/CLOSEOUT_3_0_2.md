# DoL Dev Tools: Paisley Park 3.0.2 — Gold Experience Requiem

本轮 Done：检查 Provider/profile 维护边界、明确 compatibility API、验证 Gameplay 缺依赖体验并统一正式名称。阶段名为 **3.0 — Gold Experience Requiem**，发行版本为 **3.0.2**；包标识、Skill 标识、Session 协议和旧 Goal 不改名。2026-10-08 根据用户明确要求，将 3.0 研发链压成当前 Requiem 提交并接在 v2.0.1 后；删除 3.0.0/3.0.1 Release 与 tag，3.0.2 绑定新历史。原实现、验证文档与私有证据保留，完整旧历史仅存本地备份。

## Delivered

- Provider 维护检查通过：发现/对象及源码绑定、原 Scene transfer、共享 Action、回执读取与校验已有可复用路径。不同业务的事实和终止条件仍由领域合同负责；本轮没有再拆 Provider 或增加框架。见 [维护边界](GAMEPLAY.md#providerprofile维护边界)。
- `reach-passage`、`native-state`、`native-knowledge` 明确为低层 compatibility API，不是长期 Gameplay semantic API 的最终形态；不做无收益改名或 Session 迁移。
- 缺 XState/SQLite 在 ADB、输出目录、Store 与 Session 创建前失败。CLI 输出明确的 Tools 根目录锁文件安装命令/Node 参数；其它未知错误仍隐藏原始内容。Generic 仍不依赖 Gameplay。
- package releaseName、README、Skill、CLI banner、当前 Release/Closeout 与仓库定位统一为 Gold Experience Requiem；历史 Foundation/Gold Experience 名称保留在明确历史语境。

## Validated

受影响 Goal/CLI 检查覆盖缺 XState、缺 SQLite、零 Android I/O、零本地 Session 写入和 Generic 独立性。CI 继续用锁文件 `npm ci --ignore-scripts --no-audit --no-fund`。最终包/安装与发布结果见 [VALIDATION](VALIDATION.md)。

复用 [3.0.1 S1/S2、共享 Runtime 和实机证据](CLOSEOUT_3_0_1.md)：本轮没有改动作/Provider/原游戏执行、Outcome、预算或 Recovery，因此不重复真机游戏路径。

## Not validated

其它设备、DoL 版本、Mod/活动组合仍属于 [Coverage Ledger](CLOSEOUT_3_0_1.md#not-validated--coverage-ledger)，不自动变为本轮待开发事项。

## Known limitations

Provider 仍为受审本地显式路由，不是动态第三方插件注册平台。新增业务需审查自己的事实/终止合同；已有共享 helper 不能证明新业务正确。低层 Goal 仍含当前实现名。旧两个物理目标的未决 effect 和已审支持范围继续按 [3.0.1 限制](CLOSEOUT_3_0_1.md#known-limitations)保留；本轮未重放、重置或结清它们。
