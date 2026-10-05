# 1.5.1：首次试用提示与采集范围

本次是1.5的兼容补丁：依据实际UI项目试用反馈改善指引和证据元数据。通用能力与可选Integration继续分离，schemaVersion保持1；不改变默认采集范围、正文省略、完成判定或退出码，不要求重新执行全量验收。

| 试用发现 | 本次处理 |
| --- | --- |
| Doctor找不到PATH中的ADB | 指引先检查已有platform-tools，通过当前进程DOL_ADB选择；新输出保留原失败记录，不安装或修改系统PATH |
| Console短接收窗口内收到更早的事件 | 明确接收窗口、目标事件时间和可能缓存回放；live/replay保持unknown，保留原时间戳与200条上限、omitted；Support分别记录来源省略和50条投影省略 |
| Evidence complete但DOM truncated | DOM增加可选truncationReasons，manifest步骤和CLI提示范围限制；旧包没有原因时保持unknown，不自动扩大范围或升级Full Evidence |
| 游戏核心版本未知但App版本可读 | CLI分列CDP GameVersion与ADB package versionName；核心未知保持unknown，不用包装App版本代替 |
| 猜错内置Integration文件入口 | 指向integrations/soft-and-wet/index.cjs；常规使用--integration soft-and-wet即可 |

V8的Runtime.enable会发送已存储的Console消息，因此连接期间接收到的事件不一定在该接收窗口内发生。[V8实现](https://chromium.googlesource.com/v8/v8/+/refs/heads/main/src/inspector/v8-runtime-agent-impl.cc)；Runtime事件时间戳使用Unix毫秒，但没有与本机时钟校准，不能靠直接比较将每条事件分类为live或replay。[CDP协议定义](https://raw.githubusercontent.com/ChromeDevTools/devtools-protocol/master/json/js_protocol.json)

截图与目标前台匹配、默认Evidence和可选Soft & Wet采集、既有ADB映射的保留与清理在试用中正常。页面Adapter idle/inactive或无Surface本身不表示工具失败。目标项目的自定义DOM身份断言属于其自身验收，未作为Tools缺陷处理。私有截图和原始现场资料不进入源码包。

本轮Done：上述指引与可选元数据交付、受影响的离线行为检查通过、包内链接与Skill定位正确、本机安装可从工作区外调用并保留旧版。验证记录见[VALIDATION](VALIDATION.md)。Completed表示本轮交付完成；未增加设备、Provider或完整游戏业务覆盖。

已知限制：缓存回放与实时事件逐条区分仍为unknown；截断DOM只代表范围内结构；未知核心版本仍需要目标项目提供可读来源。它们不是自动追加的Remaining work。
