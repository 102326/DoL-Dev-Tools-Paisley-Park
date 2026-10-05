# DoL Dev Tools: Paisley Park — 2.0.0重置版

统一主题为 **DoL Dev Tools: Paisley Park**，公开仓库沿用原历史并改名为`102326/DoL-Dev-Tools-Paisley-Park`。本版完整携带已验收通用诊断、可选Integration和实战Skill工作流；重置的是产品身份与交付入口，没有重写已验证的采集器或游戏Runtime。

| 入口 | 当前约定 |
| --- | --- |
| 产品名 / Skill显示名 / CLI help | DoL Dev Tools: Paisley Park |
| 包标识 / Skill调用名 | dol-dev-tools-paisley-park |
| 发布版本 / tag | 2.0.0 / v2.0.0 |
| GitHub仓库 / ZIP根目录 | DoL-Dev-Tools-Paisley-Park |
| 发布资产 | DoL-Dev-Tools-Paisley-Park-2.0.0.zip、SHA256SUMS.txt |
| Windows主入口 | Paisley-Park.cmd；DoL-Dev.cmd保留为同一CLI别名 |

产品名中的冒号只用于显示，路径和Skill标识使用合法字符。原工作区可保留旧本地目录名，下载与安装使用新目录；不因此移动正在被其它项目引用的源码工作区。

## 使用与迁移

从[Release](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/releases/tag/v2.0.0)下载并核对SHA256，再解压到新的稳定Tools目录。已有Skill先保留完整备份，使用新包的[安装入口](SKILL_INSTALL.md)安装`dol-dev-tools-paisley-park`。从工作区外运行resolver，核对产品名、2.0.0版本及实际目录；不要把新版Skill指向旧包。

旧`dol-dev-tools`全局Skill移入备份，避免两份默认Skill同时争用。旧Tools、ZIP和tag继续保留；历史说明见[HISTORY](HISTORY.md)。新位置会由安装器生成，无需自行修改全局PATH或安装依赖。

Schema仍为1，URN、环境变量DOL_DEV_TOOLS_HOME/DOL_ADB、集成名soft-and-wet和自有夹具的内部标识保留其已验证语义。这些是协议/机器标识，不是第二个产品名。Console缓存/DOM截断、事实与Integration解释、unknown与failure、采集状态与任务完成的边界继续有效。

## 本轮验收

Done限定命名、Skill安装、文档/CLI/源码包和仓库入口一致，旧历史可恢复且发布资产经检查。不把更多Android、WebView或Mod组合自动加入本轮。

验证使用现有安装、Evidence与离线比较/自有夹具相关检查、Skill格式与包内链接、Git原文/CRC/SHA、独立安装与启动器，以及仓库现有CI。复用未受影响的1.5现场证据，不重复真机业务验收。检查结果见[VALIDATION](VALIDATION.md)；发布包不含原始现场证据、截图、APK、存档或本机位置文件。

Not validated：新指引在更多项目中的收益、新设备/Provider/Mod组合。Known limitations：GameVersion unknown根因、Console逐条live/replay区分及有界DOM覆盖保持原限制，不以改名掩盖。Generic Diagnostics不依赖任何Mod；Integration仍为经审查本地代码，不是权限安全沙箱，Evaluator仍能执行传入JavaScript。
