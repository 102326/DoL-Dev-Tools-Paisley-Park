# 1.4：完整工具能力与真实目标闭环统一交付

在1.0重置版基础上统一汇总通用诊断、有限Action/Journey、证据比较、可选Integration、公共Skill及目标自有开发配方。1.3是阶段包；本次补齐其未完成的原生重建、真实游戏APK更新和主游戏真实业务Mod更新。包内不含游戏、APK、制品、存档、密钥、机器位置或实际证据。

[原生目标配方](NATIVE_RECREATE.md)在独立离线真实游戏副本证明同进程Activity及实际WebView实例重建、同签名版本递增APK更新、同UID和自有sentinel保留、游戏就绪。[业务配方](BUSINESS_MOD_UPDATE.md)证明DoLGameUI 2.0.3→2.1.0的主游戏持久安装/更新、加载来源、JS/CSS SHA、运行时版本、设置开关及真实App重启后复验。原App与已有传输保留，测试副本保留；没有修改UI项目源码或用户真实数据。

Generic仍不依赖Soft & Wet或原生bridge。只读native Integration与内置SW桥平级可选；Skill只路由现有工具及目标作者命令，不复制Runtime、不提供任意执行框架。91项自动检查通过，三份业务CSS Evidence及标准格式/SHA关联已验证；独立范围审查未发现未实施的产品功能阻断。

[能力覆盖](CAPABILITY_COVERAGE.md)保留实现与条件验收的区别：未知App原生入口、独立WebView-only重建、其它实体设备、重型敏感采集与helper权限不能从本次场景推断；设置场景不等于所有业务/存档/云端回归。外部工具按问题选用，缺失为unsupported，不能伪造结果或自动升级权限。

目录原地更新，旧版本ZIP/tag及Skill备份保留；schema仍为1，零Node运行依赖。解压后`DoL-Dev.cmd --version` / `--help`即可使用，需要Skill时按[独立安装](SKILL_INSTALL.md)定位同一份Tools。所有报告与证据保持本地，不自动上传。
