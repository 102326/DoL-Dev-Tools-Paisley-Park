# DoL Dev Tools: Paisley Park 3.0.3 — Gold Experience Requiem

本维护补丁改善 Agent 在真实 UI 调查中定位问题与交接进度的体验，继续使用 3.0 的通用诊断和目标驱动 Gameplay 核心。

- **看清 pending 来自哪里**：标准 Session 状态提供目标级只读摘要，区分当前与其它 Session 的未决 effect，列出有限的动作类别、Provider 与状态。当前动作数为零也可能被历史记录阻挡；摘要不会清除或重放它。
- **分开看版本来源**：StartConfig 与 GameVersion Mod 分别报告；一个来源 unknown 不再遮住另一个来源的观察。原 gameVersion 取值规则保持不变，来源信息可随标准证据比较和本地问题报告保留。
- **更容易定位调用错误**：CLI 提供固定 code / stage，Journey checkpoint 的不支持 name 字段可直接定位；未知 Session 失败只标明阶段，继续省略原始异常与私有内容。
- **Skill 指引同步**：优先读标准 pending 摘要；子链接中心未命中时核对真实事件承载区域；保留版本来源、未知原因与调用方错误的区别。

下载 `DoL-Dev-Tools-Paisley-Park-3.0.3.zip` 并核对 SHA256，解压到新的稳定目录。需要 Node.js 22.12+；Generic Diagnostics 不需 npm 依赖。Gameplay 在 Tools 根目录运行 `npm ci --ignore-scripts --no-audit --no-fund`，Node 22 直接运行时加 `--experimental-sqlite`，Windows launcher 已包含。备份并移出旧 Skill 后，按 [安装指南](SKILL_INSTALL.md)安装指向新工具包的 Skill。

完整入门见 [README](../README.md#快速开始)，Gameplay 协议见 [GAMEPLAY](GAMEPLAY.md)。本版针对受影响投影、错误入口与隔离 Session 检查，复用既有 S1/S2 实机证据；没有重新执行游戏业务或修改 UI 项目。

历史 pending、预算与恢复规则保持原样。Gameplay 仍需宿主 Agent 和受支持的动作合同；删除或覆盖已有存档默认禁止，私有证据不自动上传。3.0.2 资产保持冻结。具体检查、旧未知结果及覆盖边界见 [当前收口](CLOSEOUT_3_0_3.md)。
