# DoL Dev Tools: Paisley Park 3.0.2 — Gold Experience Requiem

正式阶段名统一为 **3.0 — Gold Experience Requiem**，3.0.2 是维护与发布体验修订。3.0.1 的原生 Gameplay Runtime、S1/S2 验收和 Generic Diagnostics 保留；不改低层 Goal、Session 或诊断 Schema。

- Gameplay 缺 XState/SQLite 在任何 Android I/O 或 Session 创建前明确失败；CLI 提供安装命令，Generic 仍可独立使用。
- 明确低层 compatibility API 与长期玩法语义边界，记录新增 Provider/profile 应复用的发现、绑定、执行和 Outcome 路径；未增加抽象框架或重构 Provider。
- 当前 package、README、Skill、CLI 与文档统一英文命名，并提供首次使用简介。2026-10-08 按用户要求重置公开 3.0 提交链，移除 3.0.0/3.0.1 Release 和 tag；当前 3.0.2 重新绑定提交、源码包与校验值，保留实现和验收证据。

Node.js 22.12+；Gameplay 在解压后的 Tools 根目录运行 `npm ci --ignore-scripts --no-audit --no-fund`，Node22 加 `--experimental-sqlite`，Windows launcher 已包含。保留旧安装，向新的稳定目录解压并备份旧 Skill 后重新安装；共享 Store/未决 effect 不随包分发或清除。

见 [工作流](GAMEPLAY.md)、[安装](SKILL_INSTALL.md)、[收口与限制](CLOSEOUT_3_0_2.md)、[验证](VALIDATION.md)。更多环境属于后续覆盖；正常 Gameplay 自治，删除/覆盖已有存档默认禁止。
