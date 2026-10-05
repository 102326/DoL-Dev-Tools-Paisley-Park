# 1.5：完整能力验收与Skill复用

在1.0重置版路线基础上补齐后续能力清单：同Activity/PID内真实WebView替换、实际Perfetto/bugreport/Android CLI helper、detached基线/三次真实设置开关/复采Journey及lock/unlock生命周期。原生目标与业务Mod更新的已有证明继续保留，新的范围见[最终验收](FINAL_ACCEPTANCE.md)。

Skill优先复用成熟、已验证、边界清楚的能力与诊断方法：Android CLI管原生屏幕/布局/交互，Android Profiler管官方录制和trace/SQL，Chrome DevTools管深入WebView检查，目标项目负责build/deploy。DoL只补目标绑定、脱敏证据、有限复现与必要Integration。复用不继承其它项目假设，不自动安装依赖或扩大权限；Generic不依赖Soft & Wet。

锁屏动作证明screen-off，不能保证凭据锁定；unlock不读取或输入密码，secure/未知keyguard显示时必须由本人认证。此次设备本人解锁后新返回收据complete，页面及资源清理确认。旧partial、启动地址错误和超限采样失败都保留，不回填旧收据或重试已派发动作。

96项Node检查通过。Python Backup/Visual三项由已有带Pillow运行时通过，公共Schema测试由匹配现有jsonschema/RFC3339环境通过；四项均实际执行。26份新增公开JSON及18份制品的Schema/incident/SHA核对通过，Support无重型二进制。源码Skill的UTF-8 validator和位置解析已通过；独立安装、前向使用及源码包检查见[验证记录](VALIDATION.md)。

目录原地更新，旧ZIP/tag与Skill备份保留。schema仍为1，零Node运行依赖；发行只包含源码、文档、测试和示例，不带游戏/APK/密钥/存档/机器位置/证据。源码包可通过`DoL-Dev.cmd --version`/`--help`使用，Skill定位同一份Tools。其它设备/Provider/Mod按实际问题选定矩阵；所有业务/存档与未知App专有接口不是这一台设备的通过结论。报告与证据保持本地，无上传。
