# Cheat Extended：修复缺少可选框架时的假错误

这是6.0真实案例产生的定向配方。只处理已经核对的作者附件，生成本地修改包；不下载、安装Mod，不修改Loader，也不屏蔽Console或ModHub日志。

## 固定输入与结果

输入为作者[1.20.3 Release](https://github.com/chris81605/Degrees-of-Lewdity_Cheat_Extended/releases/tag/1.20.3)中的`cheat_extended.mod.zip`，实际Manifest版本为1.20.3.1，SHA-256为`16da93387fc026ef6a5fe402e032bd4fd3794cae6487f959b9b85b701d02ac1e`。tag源码Manifest为1.20.3，不能代替这个发布附件。

ModLoader2.101.1的严格名称查询在缺失时会打印error。作弊拓展在已有MapleBirch的环境仍探测真正的Simple Frameworks，因而产生误导性日志。配方只为三个JS成员的四个查询加上真实名称存在检查；保留查询结果、原分支和其它错误处理。特别是不能把MapleBirch的Simple别名冒充实际Simple Frameworks安装。

实际机制、前后证据和范围见[案例](../../docs/knowledge/cheat-optional-framework.md)。本次生成包SHA-256为`d668ef11f93dced622bd0bceff8cd8b7eeebc9c9f1cd378194ba4532bdd2b9e0`。Manifest版本有意保持1.20.3.1，必须用修改收据和成员摘要区分本地修改包与作者原包。

## 本地构建

使用Python标准库，不安装新依赖。先从作者页面下载并核对原附件，再向尚不存在的输出文件生成：

```powershell
python examples/cheat-extended-optional-probe/patch.py PATH_TO_ORIGINAL_ZIP NEW_PATCHED_ZIP
```

命令输出JSON修改收据。输入摘要不符、成员变化或输出已存在时拒绝；不能对未来同名包盲套。生成前不写输入文件，保留全部其它成员字节、README、许可证与Manifest。

## 定向验证

复用已经安装的TypeScript模块进行AST读取，不将它加进Tools依赖。提供模块入口的实际路径：

```powershell
node examples/cheat-extended-optional-probe/verify.cjs PATH_TO_ORIGINAL_ZIP PATCHED_ZIP PATH_TO_EXISTING_TYPESCRIPT_MODULE
```

先由标准库 `verify.py` 独立核对固定原包SHA-256、三个原成员摘要，以及每个候选成员的完整预期字节（不是仅核对允许变化的文件名或四处表达式），逐成员读取同时检查CRC。检查在加载TypeScript模块前执行；同三个文件其它位置夹带逻辑也会拒绝。之后保留原AST/语义检查，从实际三个脚本中提取四处消费者表达式。在Maple单独、Simple单独、两者存在及两者缺失四种注册表替身中，16项检查要求原决策结果不变、缺失可选查询不再打印error、无关错误仍保留。另验证未知输入拒绝及已有输出保全。

验证入口在macOS/Linux调用已有 `python3`，Windows调用已有 `python`；不安装解释器或TypeScript。6.1新增字节检查的回归使用完全合成ZIP与测试专用固定身份，覆盖额外逻辑、同长度改写、原成员变化、其它成员变化和陌生输入拒绝；测试替换身份不暴露为CLI绕过选项。当前Mac未取得真实固定CE附件及已有TypeScript模块，未重跑真实附件的完整16项语义验证。历史16项结果保持原版本归属。

这些替身不证明真实Simple Frameworks全功能。实机另验证获准测试App中MapleBirch5.4.3与CE设置区的共存、102个加载成员，以及目标错误由三次变为零；没有验证时空旅行、纹身应用或所有作弊功能。

## 部署与许可

部署按目标已有原生ModLoader流程进行：备份原始ZIP和配置，核对获准App/用户/文档，写入后读回摘要，重启并用新绑定验证实际加载。此脚本不代替部署授权，也不清理存档或GER历史。

上游为chris81605的Cheat Extended，附件内许可证为CC BY-NC-SA4.0。生成的修改包保留上游README与许可证，仍按上游许可使用，并明确标记本地修改；不是作者正式发行。本仓库不随附原包或修改ZIP。
