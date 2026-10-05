# DoL Dev Tools: Paisley Park — 历史：1.2：通用开发闭环交付

这是1.0重置后的加法版本；通用能力、可选Integration和Skill职责保持独立，Evidence schema仍为1。旧1.0/1.1源码包及替换前备份保留。源码目录原地更新，真实artifacts/backups不迁移或清理。

统一封装包括已实现的诊断/比较、有限Action/Journey/Recorder候选、矩阵/网络/视口实验、专项Inspector/Performance、公开格式、独立Skill安装，以及固定自有Workshop示例。按原文0..88节的实现、外部依赖和条件验收见[能力覆盖](CAPABILITY_COVERAGE.md)，实际证明见[VALIDATION](VALIDATION.md)。没有Node运行依赖；Python/Pillow、浏览器、ADB、Android CLI、ffmpeg和Perfetto按实际能力选择。

Modify/Build/Deploy使用目标项目自己的源码与命令；Tools不提供通用任意脚本DSL或接管ModLoader。桌面真实ModLoader中的自有ZIP持久部署与源SHA/版本/尺寸复验通过，Android自有临时DOM部署/复验通过，两项证明分别保留。Android持久业务Mod/APK部署、专有recreate、完整游戏和多设备业务矩阵依赖对应项目接口与实际验收；缺失时明确unknown/unsupported，不将通用源码交付误报为业务通过。

解压后用`DoL-Dev.cmd --version`及`--help`，不需要npm install。Skill可以从源码位置使用或通过`install-skill`安装到新的独立目录；解析器核对真实Tools根。旧安装不自动覆盖，工具移动须核对新位置。安装方法见[SKILL_INSTALL](SKILL_INSTALL.md)。

交付包只包含Git跟踪的工具源码/文档/测试/自有例子；不包含Git数据库、机器位置记录、artifacts、backups、真实日志/截图/录屏、存档、游戏、APK或第三方包体。本地反馈报告不自动上传；截图和重型资料仍需单独隐私审阅。
