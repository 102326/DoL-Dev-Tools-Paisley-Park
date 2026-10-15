# 先下载当前版本，再区分源码、安装包和运行现场

2026-10-16核对。用于6.0研究输入与获准测试平板的版本接续；“最新”仅指本次查询时的作者仓库，不是持续更新保证。

## 已下载的输入

通过agent-reach的GitHub CLI入口读取作者仓库、最近发布与默认分支提交，再下载正式附件及固定提交源码。下载物保存在本机独立研究目录，不进入Tools源码或发行包。未执行第三方安装脚本，也没有安装新工具链。

| 对象 | 本次正式发布与固定源码 | 原测试版本 → 当前测试版本 |
| --- | --- | --- |
| MapleBirch | [5.4.3](https://github.com/MaplebirchLeaf/SCML-DOL-maplebirchFramework/releases/tag/maplebirch-release-v5.4.3)，`4b4b6e26e934d2e848058f21dfa1df0f71cc455d` | 5.4.2 → 5.4.3 |
| ModHub | [1.7.0](https://github.com/JohnLiao501/ModHub/releases/tag/v1.7.0)，`5963b211c0243b9fd5468d65f18720fe1a7bd153` | 1.5.0 → 1.7.0 |
| 原版优化 | [1.1.1.5](https://github.com/ANLINSTUDIO/Degrees-of-Lewdity-DolOptimization/releases/tag/v1.1.1.5)，`0bfba4bfb719dbf35ed66f4875cefe394ff0fa61` | 1.1.1.2 → 1.1.1.5 |
| TweeReplacer | [默认分支固定源码](https://github.com/Lyoko-Jeremie/Degrees-of-Lewdity_Mod_TweeReplacer/tree/5094160465b0c5ef034eb5acd3d4f8122bdf8e09)，Manifest 1.7.0；仓库没有Release | 1.7.0，未重装 |
| TweeReplacerLinker | [默认分支固定源码](https://github.com/Lyoko-Jeremie/TweeReplacerLinkerAddon/tree/bb045cb493b284cef33ddcdebb972ad846349a52)，Manifest 1.0.0；仓库没有Release | 1.0.0，未重装 |

本次三个Release对应的提交恰与各自默认分支HEAD一致。TweeReplacer的package.json仍是1.0.0，不能代替boot.json中的1.7.0。下载它及Linker的源码不代表取得正式可安装附件。

三个正式附件的本地SHA-256均匹配GitHub发布资产的digest：

| 附件 | 字节数 | SHA-256 |
| --- | ---: | --- |
| `maplebirch-0.5.12.13-v5.4.3.mod.zip` | 375230 | `776a16a96c64086a0fe985a00de5951a82f6cb4e9865dc28d74f41e205bf9d84` |
| `ModHub-v1.7.0.zip` | 521449 | `7f136ca6b0fa6d710cc14c93de09bff11aca9fda1212d1acb5b47553e8756710` |
| `Optimization-v1.1.1.5.mod.zip` | 31428013 | `94644b19e199bdb0abd3f8e7b35dd95de2cecba239c882ee9f2e194d8849367a` |

摘要确认下载字节与发布附件对应，不是第三方代码安全审计，也不证明源码重建可复现。

## 本轮实际更新与验证

用户明确允许更新比平板新的版本。核对原测试App、设备、user0、前台与`https://localhost`文档后，先备份三个原始ZIP及Mod顺序/隐藏列表。通过ModLoader原接口逐项覆盖对应Mod，读回整个存储ZIP摘要；顺序、隐藏状态及其它Mod保持。写入后的旧文档仍报告旧版本，随后用标准Action显式重启并建立新绑定。

新文档中的三个Manifest及声明的JS、CSS、Twee成员共44项，与下载包逐项摘要一致。另取得以下实际结果：

- MapleBirch5.4.3中的原0.1.2嘴部消费者仍只注册一次；指定srcfn进入侧栏缓存，原showfn身份保留，图片解码256×256，已审的已知/回退路径函数返回正确。
- ModHub1.7.0管理面板与原版优化1.1.1.5设置入口，经同一16步原生Action/Journey打开、检查并关闭，回到Start。没有点击设置值、购买或存档按钮。
- 两个共享资源的最终摘要与旧组合对照相同；所审入口替换文件逐字节未变。详细证据及限制见[共存案例](shared-caption-coexistence.md)。

现场仍保留正式UI2.7.0和嘴部消费者0.1.2。自有传输/临时上传对象已清理；未更改GER、Store或历史Unknown。当前执行环境为Windows、PowerShell7、Node26.12.0/npm11.20.0；此前Node24的实验结果仍按原环境引用。

## 证据与边界

本机独立研究目录的`downloads.json`、各`identity.json`及`archive-inspection.json`保留API来源、时间、提交、源码ZIP摘要和正式附件记录。本项目忽略目录`phase2-latest-mod-upgrade-001`保留备份、派发前记录和存储读回；`phase2-latest-restart-001`、`phase2-latest-readiness-001.json`、`phase2-latest-loaded-proof-001.json`及`phase2-latest-maple-consumer-001.json`保留新文档证据。

本轮没有重建三个上游项目，没有验证全部ModHub功能、全部优化规则、所有表情、存档迁移或其它设备。更新与有限入口验证没有新增一项真实兼容故障修复正例；6.0的该项验收仍未完成。历史5.4.2及旧组合记录保持原样。
