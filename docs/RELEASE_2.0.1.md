# DoL Dev Tools: Paisley Park — 2.0.1实战经验指引补丁

本版吸收真实项目反馈中的通用决策经验，更新Skill、项目规则与诊断文档。CLI实现、Collector、Integration、Schema和默认隐私策略沿用2.0.0；不增加采集或游戏动作。

## 交付

- Doctor的`complete`不代表App运行或WebView可检查。先核对子检查；无法检查不直接归因为崩溃或关闭调试，只有当前任务需要现场时才恢复运行。
- DOM兼容契约先区分原生、第三方与UI自有节点及允许的例外。项目负责精确identity/handler断言；UI自有重建、约定移动和结构Diff不自动判定兼容失败。
- 标准能力适合且成本低时优先使用；直接CDP/ADB/Playwright、项目测试保留精确断言或更便宜的一次性调查出口。稳定路径需要复用、交接或诊断checkpoint时才考虑最小Journey。
- 现场事实、来源、解释与原因分开；没有因果证据保留unknown。反馈先核对、去重、提炼与登记，不自动推动功能、重构、全量测试或新版本。

项目选择器、私有Runtime字段、节点数量、原始截图/日志与候选清单没有进入公共Skill或源码包。帮助可发现性、额外环境与专属Integration保留为后续按需项目。

## 安装与更新

发布tag为`v2.0.1`，资产为`DoL-Dev-Tools-Paisley-Park-2.0.1.zip`及`SHA256SUMS.txt`。从[Release](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/releases/tag/v2.0.1)下载并核对SHA256，解压到新的稳定目录；原2.0.0包、tag与Release保持冻结。

保留已有Skill完整备份，再使用新包的[安装入口](SKILL_INSTALL.md)向空目录安装。核对resolver指向新包、版本2.0.1、文档链接与生成指引一致。Windows入口仍为`Paisley-Park.cmd`，`DoL-Dev.cmd`是同一CLI别名；Skill调用名仍为`$dol-dev-tools-paisley-park`。

## 验证与限制

本轮Done为指引修订的封装、独立安装、命名/版本/链接一致性及正式发布，不包含新设备或业务覆盖。按[验证记录](VALIDATION.md)检查安装、源/安装Skill及Git原文发布包；复用2.0.0未改动的运行时和既有真机证明。现有CI按仓库配置执行，其结果只证明相应离线检查。

Not validated：新指引在未来任务中的决策收益、更多设备/Provider/Mod组合及候选能力的额外使用场景。Known limitations：GameVersion unknown、缓存事件逐条live/replay区分、有界DOM和Integration解释精度保持现有边界；本版不声称修复这些限制。
