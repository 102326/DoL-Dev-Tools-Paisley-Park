# 作弊拓展提示找不到Simple Frameworks，未必缺少前置

2026-10-16，本轮真实问题调查与修复。对象为ModLoader2.101.1、MapleBirch5.4.3及Cheat Extended1.20.3.1；初始测试App装的是1.20.1，先保留旧证据、备份并升级作者当前附件后再次复现。

## 已确认原因

作者[1.20.3 Release](https://github.com/chris81605/Degrees-of-Lewdity_Cheat_Extended/releases/tag/1.20.3)附件的Manifest实际为1.20.3.1，SHA-256与GitHub资产digest一致。tag源码提交`87eb77d85d7babc9b26116801b0b48b32d774fa6`的Manifest仍是1.20.3，不能把tag名、源码和实际执行包混作一个版本。本轮分析和修改以原附件中的真实脚本为输入。

现有MapleBirch已满足CE的框架选择，CE注册和设置区能够运行。错误不是CE Manifest硬性要求同时安装两个框架，也不是已证实的Maple API失效。

真实缓存Console事件的调用栈指向三个CE脚本：

| 消费者 | 触发点 |
| --- | --- |
| `CE_sideBarIcon.js` | `CEiconSFdetect`探测真正的Simple Frameworks |
| `CE_tattoo.js` | `registerCETattoos`分别探测Maple与Simple |
| `CE_TimeTravelPlus.js` | 初始化时判断是否存在真正的Simple |

它们使用`getAnyModByNameNoAlias`，下沉到原Loader的`getByNameOne`。在固定Loader源码中，缺失时默认打印`ModOrderContainer getByNameOne() cannot find name.`再返回undefined。可选探测的结果并未阻断CE选择Maple，但error被日志界面收集，形成误导性前置提示。

MapleBirch包声明Simple Frameworks别名。`getMod`可按别名返回Maple；严格名称查询则不会将它视为真实Simple安装。后者的分支语义应当保留，不能为消除日志而把两种框架强行当成同一个对象。

## 最小修复与验证

只在CE三个成员的四处严格查询前检查`getModListNameNoAlias`是否包含目标名称。存在时调用原查询，不存在时保留undefined。未改Loader、框架、加载顺序、全局日志或CE的真正缺少框架告警；原包其它成员字节、Manifest及许可证不变。

[构建与验证配方](../../examples/cheat-extended-optional-probe/README.md)固定整个输入附件和三个成员摘要，拒绝未审查的新包。原消费者表达式的16组替身对照通过：原分支结果相同，无关错误保留。修改包SHA-256为`d668ef11f93dced622bd0bceff8cd8b7eeebc9c9f1cd378194ba4532bdd2b9e0`；版本字符串仍为1.20.3.1，不能仅靠版本号证明加载了修复。

实机在原39个Mod组合中对照：

- 作者当前附件冷启动后，捕获三次目标名称为Simple Frameworks的原生错误及CE调用栈。
- 备份后通过原ModLoader写入修改包，读回整个ZIP摘要；重启后的新文档捕获零次该错误，错误日志页不再因此自动打开。这里比较的是当前文档的Runtime接收记录，不能外推完整历史或所有Console消息。
- 当前已加载102个CE附件成员逐项对应修改包；原Mod列表、顺序、隐藏状态和Loader三层查询函数源码保持。
- 通过原生选项→模组设置打开页面，CE选项与Maple设置区在修复前后均能显示；没有点击配置值、购买、存档或游戏推进。查询修复没有以禁用CE或框架换取错误消失。

本轮达到“真实报错定位—局部修改构建—原生部署—实际加载—相关入口共存”的有限闭环。它修复的是可选框架探测产生的假错误，不是CE全部功能回归，也不是所有框架关系问题的通用修复。

标准Evidence也在修复后完成，incident为`bdee884a-5f29-44ab-92ef-a9b8e78610bf`。它保留顺序观察、Console缓存/接收窗口及版本来源unknown等边界，不能代替上面的定向调用栈与加载证明。原始截图已检查，停留Start、没有错误日志遮罩；截图不公开分发。

## 新会话实际应用经验

将当前源码和资料冻结到新的隔离快照，只向新会话提供问题、框架版本和作者原附件，没有提供案例文件名或补丁路径。该会话通过安装后的Skill自行找到知识入口、案例及现有配方，完成9条命令，实际构建并验证候选。

候选SHA-256与本轮实机包一致，原输入保持；102个成员中99项未变、3项修改，16组表达式对照通过。新会话明确没有操作Android，也没有把离线重建当作它亲自完成实机验收。原始过程在`artifacts/learning-application-001`，独立回答SHA-256为`4144ec428cea13ee0e71323a7e484133b78bf281d0e518ba253c925e57f84d9a`。

这次接续已从只读摘要判断推进到真实构建应用。宿主沿用gpt-6.1-sol/medium配置，实际后端未独立证明；单个定性样例不证明学习收益率。随后主工作树对验证脚本的临时目录归属和输出字节保全增加检查，已单独通过；独立快照保持当时版本，未改写其过程或制品。

## 调查过程中的反例

此前某些调查脚本在启动未就绪时查询Mod，或严格查询已移除的自有探针，也会制造同类日志。已从本次CE三处调用栈中区分，不能把这些错误都归给第三方Mod。查询看似只读，仍可能打印日志；先确认真实名称，再读取可选项。

初次离线验证误把包含查询的外层IIFE也当成目标表达式，导致替身缺少Console方法；修正AST选择范围后才验证消费者表达式。另有观察脚本假设Macro全局可访问，以及用CE控件ID筛选实际无ID的控件，均已定位为调查方法问题。CE设置控件实际没有这些ID；不能用空选择器结果断言页面缺失。选项页内mouth图像字段当次不可用，本轮不据此声称重新通过嘴部图片解码。

这些失败与原始记录保留，不重派未知业务动作、不删除旧日志来制造通过。用Action入口读取Journey文件的尝试在命令校验阶段失败，未执行动作；按文件结构改用Journey后继续。

## 来源与未验证范围

原始记录在本机忽略目录`cheat-framework-before-001`、`cheat-framework-latest-before-001`、`cheat-framework-fixed-001`；`cheat-optional-build-001`保留构建收据，`cheat-fixed-loaded-proof-002.json`保存加载验证，`cheat-mod-settings-*`保存原生入口对照。下载来源和原始备份另存本机，不公开游戏日志、ZIP或完整运行内容。

未验证真实Simple单独运行、旧Loader、时空旅行、纹身业务、全部作弊功能、存档迁移和其它设备。新版本或不同来源包需要重新调查，不能绕过摘要门禁套补丁；真正两个框架都缺失时的错误也不应被屏蔽。没有向作者提交Issue、PR或发布修改包。
