# DoL Dev Tools 4.0.1 — Bites the Dust

DoL Dev Tools 是面向 DoL Mod 作者和开发者的本地工具包。它连接 Android、WebView 与项目源码，帮助 Agent 查看现场、保留证据，在授权范围内连续调试、修改与验证。通用诊断不要求安装特定 Mod；持续游戏目标使用共享 GER Runtime 保存进度与动作结果。

## 本次修订

- **只授权保存也能使用原存档脚本**：读取和删除仍按各自授权筛选，无须为了保存开放其它操作。
- **执行记录并发打开更可靠**：不会把已升级的 SQLite 版本写回旧版，保留原生资源代次和旧任务隔离。
- **保存读回卡住会清理观察器**：迟到结果不能冒充成功；无法确认保存是否发生时仍保留未知结果。
- **完成前核对原生 App 身份**：不会把替换后的 App 数据误判为旧任务成果；正常文档重载可自动重新绑定。
- **导航清理冲突如实报告**：不再把清理失败当作安全的执行前拒绝。

Debug 与受支持 GER 操作继续在一次授权范围内自主执行，无新增逐项审批。

## 支持边界

数量调整和 Soft & Wet 衣柜选槽暂不支持自动 GER 派发：购买前数量须已为 1，穿脱前槽位须已选好。两项操作缺少可靠终态证明，本次明确收窄能力，避免点击后卡在 Pending；不宣称自动「2 → 1 → 购买」或选槽连续链已完成。历史未决动作保持原记录，不追认、不清除。

初始状态已满足目标时仍可零动作完成。需要证明「本 Session 执行过保存」的工作流，要核对实际保存回执与执行见证。缺少原始原生身份的历史 Session 不能用当前实例补造证明后完成；Android 完成证明依赖可读取的原生身份。详见 [修复记录](F1_F5_CLOSEOUT_4_0.md)。

## 验证

复用同日验货修订的 Windows Node 完整回归 **406 项通过**，Python **2 项通过、2 项因可选依赖缺失跳过**；独立解压候选的 99 项相关回归通过。4.0.1 仅调整版本、文档和安装指引，修复代码与测试保持一致；发布包另外核对固定源码、CLI、Skill resolver、锁定依赖与 SQLite 清理。

真实 Android 本轮修复仅复验文档重载与原生身份；购买、穿戴、保存等业务没有因补丁发布重新执行。完整 Android Mod 自主修复闭环和其它设备/存档后端仍未验证。先前 4.0 的真实实验是历史有效证据，不算本轮新通过。

## 安装与更新

从 [4.0.1 Release](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/releases/tag/v4.0.1) 下载 `DoL-Dev-Tools-4.0.1.zip` 并核对随附 SHA-256。解压到新目录，保留旧 Tools 与 Skill；版本应返回 `4.0.1`。

```powershell
.\DoL-Dev.cmd --version
.\DoL-Dev.cmd --help
# 使用 Gameplay / Agent Skill 时，在 Tools 根目录安装锁定依赖：
npm ci --ignore-scripts --no-audit --no-fund
# 旧 Skill 先备份并移出原路径，再向空目标安装：
.\DoL-Dev.cmd install-skill --out "$env:USERPROFILE/.codex/skills/dol-dev-tools-paisley-park"
node "$env:USERPROFILE/.codex/skills/dol-dev-tools-paisley-park/scripts/resolve.cjs"
```

需要 Node.js 22.12+；包不捆绑游戏、APK、ADB、node_modules 或私人执行记录。Gameplay 缺依赖时会在创建 Store 前明确拒绝。更新不迁移或清空旧 Store，不用新 Store 规避未知副作用；涉及 schema 升级前须一致备份。见 [安装指南](SKILL_INSTALL.md)与 [技术兼容说明](CLOSEOUT_4_0.md)。

采用新补丁版本而不替换 4.0.0，便于核对下载来源、复现问题和保留历史制品。
