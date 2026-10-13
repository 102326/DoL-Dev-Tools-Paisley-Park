# DoL Dev Tools — Skill 安装与升级

Tools保存采集器、CLI和格式；Skill选择诊断/复现/开发路径，调用同一份Tools与目标项目自己的构建部署命令。仓库内Skill可直接使用，也可装入本机Codex Skill目录，不复制Runtime或第三方项目。

```powershell
node scripts/dol-dev.cjs install-skill --out C:/Users/YOUR_USER/.codex/skills/dol-dev-tools-paisley-park
node C:/Users/YOUR_USER/.codex/skills/dol-dev-tools-paisley-park/scripts/resolve.cjs
```

安装目标必须是尚不存在的`dol-dev-tools-paisley-park`目录。已有安装会拒绝覆盖；本命令不下载、删除或自动更新。安装内容为SKILL.md、位置解析器、显示名元数据agents/openai.yaml和本地tool-location.json；说明链接指向同一份Tools文档。工具包本体需要留在原位置；源码包不包含机器专属位置记录。

解析器核对绝对路径、包名、版本、真实CLI位置和基础文档；这是位置检查，不证明代码可信。先检查来源，再执行。安装后从下一次对话回合开始发现；当前回合显式读取可以验证行为，但不能冒充宿主自动发现验收。

## 5.0.0-rc.1 本地候选验货

当前研发源码与本地候选为 `5.0.0-rc.1 — Paisley Park`；公开稳定版和全局已安装 Skill 仍为 4.0.1。本候选未获本轮远程发布授权，不覆盖已有安装。

核对候选 ZIP 的 SHA-256，解压到新的长期保留目录。`DoL-Dev.cmd --version` 应返回 `5.0.0-rc.1`，help 首行应为 `DoL Dev Tools 5.0.0-rc.1 — Paisley Park`。普通诊断不需 npm 依赖；Gameplay 在此目录运行 `npm ci --ignore-scripts --no-audit --no-fund`，保持锁定 XState 5.33.2。

用本页现有安装命令向新的隔离 Skill 目录安装并运行 resolver，确认版本与 Tools 根目录；只有决定切换全局安装时才备份原 Skill，并向空的原目标安装。候选自测只使用自有临时 SQLite，不复制、迁移或清理旧 Store。5.0 未更改 4.0.1 的 GER/Unknown 合同。Source Link 与 Component Lab 的使用边界见 [5.0 入口](PAISLEY_PARK_5_0.md)。

## 历史：4.0.1 安装与升级

正式产品名为 DoL Dev Tools，版本代号 Bites the Dust。CLI 文件名和 Skill 标识仍使用原名称，已有入口继续有效。正式 ZIP 见 [4.0.1 Release](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/releases/tag/v4.0.1)；历史 3.0.3 下载不是 4.0。

1. 将 `DoL-Dev-Tools-4.0.1.zip` 解压到新的长期保留目录，核对发布时随附的 SHA-256。
2. 在该 Tools 根目录运行 `.\DoL-Dev.cmd --version` 和 `.\DoL-Dev.cmd --help`，确认 `--version` 返回 `4.0.1`，`--help` 首行显示 `DoL Dev Tools 4.0.1 — Bites the Dust` 及用途说明。Node.js 要求 22.12+。
3. 仅使用普通诊断时无需 npm 依赖。使用 Gameplay 时，在同一 Tools 根目录运行 `npm ci --ignore-scripts --no-audit --no-fund`，按锁文件安装 XState 5.33.2。缺少依赖时 Gameplay 会在启动阶段明确拒绝，不会静默使用另一份 Runtime。
4. 完整备份旧 Skill 并将其移出原路径，保留旧 Tools；首次安装则直接使用空目标。按下面命令安装，再检查 resolver 指向新的 Tools 根目录与 4.0.1。安装器拒绝覆盖已有目录。

```powershell
.\DoL-Dev.cmd install-skill --out "$env:USERPROFILE/.codex/skills/dol-dev-tools-paisley-park"
node "$env:USERPROFILE/.codex/skills/dol-dev-tools-paisley-park/scripts/resolve.cjs"
```

更新前保留旧 Tools 与 Skill 副本，安装后核对 resolver。依赖命令仅影响所选 Tools 目录，不全局安装工具。Android 现场另需已有 ADB、USB 调试及支持调试的目标 WebView；详见 [连接说明](DIAGNOSTICS.md#快速入口)。

升级不迁移旧私有 journal、不清空共享执行记录，也不自动结清结果未知的动作。使用 4.0 原生数据重建功能前，对 SQLite 执行记录做一致备份；一旦升级为 schema 3，3.0.3 不得继续写入同一 Store，也不得用它恢复 4.0 的新 Session。直接复制正在写入的 SQLite 主文件可能遗漏 WAL 数据，不能当成一致备份；可在所有写入者关闭后保留数据库及相关文件，或使用 SQLite 备份 API。没有验证过的自动降级或历史合并流程。详见 [技术兼容说明](CLOSEOUT_4_0.md)。

旧 v3.0.0 Foundation 与[撤版记录](WITHDRAWAL_3.0.0.md)保留；3.0.3 [收口](CLOSEOUT_3_0_3.md)是历史依据，不代表 4.0 的新通过数。

移动Tools或恢复安装时，先核对新路径，再在当前进程设置`DOL_DEV_TOOLS_HOME`；它优先于安装记录和仓库相对位置。旧记录失效会停止，不扫描私有目录或自行下载替代包。搬迁后说明中的机器专属链接也可能过期，以解析结果中的docs为准；更新安装前保留旧目录，再向新的空目标安装。

当前机器已实际安装，并由独立任务使用安装副本完成已有WebView前后Evidence的比较和本地报告；没有重新连接设备、上传或复制Tools。该证明覆盖显式使用与定位，不保证每个自然语言提示都会触发Skill，也不代替游戏业务验收。

1.4已将原生和真实业务目标配方加入Skill路由，并保留证明边界。旧安装先移到独立本地备份，再向空目标安装；UTF-8模式quick_validate及resolver通过，定位1.4.0。原生/业务配方不是通用授权，不自动安装未知APK或修改另一项目的Runtime。

1.4独立前向任务使用安装副本完成真实业务设置CSS的两次比较和重启后Evidence报告，三条CLI均complete/exit0。它将“采集完整”“CSS无差异”和“业务/存档正确”区分，未连接设备或把目录名当作重启证明。

1.5安装已保留旧副本备份，UTF-8 quick_validate与resolve通过，定位1.5.0。新增“不重复造轮子”路由，优先复用可用android-cli/android-profiler、Chrome DevTools与目标项目既有流程；不把这些Skill装进Tools、不复制工具实现、不要求缺失时自动安装。独立前向验证使用已有trace与现有分析工具，结果见[VALIDATION](VALIDATION.md)。

[1.5.2](RELEASE_1.5.2.md)将实战后的标准能力优先、点击失败诊断、范围收窄和直接探针/Journey边界纳入同一源码包。更新时保留旧Tools与Skill，将新包解压到新的稳定目录，再按上方既有安装命令生成指向新包的Skill；不是只改旧安装的文字。解析器版本、说明链接和生成指引应同时匹配新目录，避免重装回退。
