# 1.3：通用能力收口与统一交付

本次统一汇总1.2之后的开发；原1.0重置版与1.1/1.2包、真实artifacts和旧Skill备份保留。工具目录原地更新，schema仍为1，无Node运行依赖。新源码包只包含Git跟踪的工具、Skill、文档、测试和自有例子，不带游戏、APK、存档、真实证据或机器位置文件。

新增Android隔离origin内的持久自有Mod闭环、完整转发归属清理、只读Android生命周期采集/Diff及Journey checkpoint。生命周期已接入整包语义比较；Issue Report可以直接读取脱敏Support，保留来源与时间限制。独立Skill链接这些实际入口，复用同一份Tools。

原蓝图0..88节的实现/外部/条件路径见[能力覆盖](CAPABILITY_COVERAGE.md)，实际检查见[VALIDATION](VALIDATION.md)。通用产品范围已经收口；受控源码→构建→部署→加载/版本/SHA→复验有桌面及Android隔离夹具证明。其它实体设备、业务Mod/APK更新、专有Activity/WebView重建、重型trace/helper仍由对应环境与项目接入验收，不能把源码交付或隔离夹具当成这些场景通过。

解压后直接运行`DoL-Dev.cmd --version`、`--help`，无需npm install；需要Skill时用[独立安装](SKILL_INSTALL.md)。可选工具缺失保持unsupported，不自动安装、上传或执行未知集成。
