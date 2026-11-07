# Gold Experience 7.0：本地候选收口

2026-11-07，Windows。用户要求继续7.0剩余计划，本轮完成本地发行准备和安装切换，进展同步 `experiment/tusk-act4-7`。**当前范围 Completed；没有合并main、创建Tag或GitHub Release。**

## Delivered

名称统一为 **DoL Dev Tools — Gold Experience（黄金体验）**，理念为“创造能力，赋予行动”。包元数据、锁文件、CLI banner、README、Skill界面元数据和当前文档已对齐7.0.0。原包名、Skill标识、`Paisley-Park.cmd`、Schema/receipt身份与数据路径继续兼容；历史文档保留当时名称。

新名称原本被resolver精确白名单拒绝，定向测试先失败，再加入该受支持名称。保留两个旧名称及原项目包身份检查，没有放宽为任意元数据。权威CTS修改后由现有生成器更新CJS，没有修改GER业务、权限、回执或Store合同。

README面向首次使用者说明独立PC Chrome、Android/CDP/ADB、源码查询和Skill的用途；更新公告使用Technical Writing、Humanizer整理。实验结果留在验货文件，不放进面向用户的公告。当前页和候选包明确未公开发布，没有伪造7.0下载链接。

新包已安装到本机稳定目录，原6.1.0 Tools保留。全局同名Skill先移到Skill目录之外的独立备份，再通过正式安装器安装；新resolver定位7.0.0及稳定Tools根，两个Windows启动器均返回7.0.0。未迁移、恢复或新建原默认Store。机器专属位置和备份路径只留本地，不写入公开报告。

## 固定候选

- 源码提交：`8804a8f7555a20542ca464901929c11f5a867486`。
- ZIP：`DoL-Dev-Tools-7.0.0.zip`，434个文件。
- SHA-256：`034634e316d7d861458b80a966b37a52c0f0873bd0bb29b8a1d2176c53a043a1`。
- [逐文件清单](gold-7-candidate-manifest.json)核对固定提交的export集合与Git blob字节，运行后原434文件仍一致。
- [本轮验货结果](gold-7-candidate-results.json)记录环境、实际检查、复用证据与限制。
- [源码CI 42371542417](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/actions/runs/42371542417)在该SHA成功。它是Linux CI证据，不计为Windows通过数。

本报告随后提交到测试分支，不改变固定候选源码；不要拿报告提交SHA替代上述ZIP来源。

## Validated

实际环境：Windows NT10.0.26340.0、PowerShell7.6.9、Node26.13.0、npm11.20.0、Python3.14.9、Chrome156.0.8078.81。宿主发现使用已安装Codex CLI0.167.0-alpha.3.2。

| 本轮Windows检查 | 结果 |
| --- | --- |
| 源码完整Node套件 | 667项：665通过，2平台跳过，0失败 |
| 独立解压包完整Node套件 | 667项：665通过，2平台跳过，0失败 |
| 源码与独立包Python | 各10项：9通过，可选Pillow1跳过，0失败 |
| 名称、安装、CLI定向 | 20通过；新名称先红后绿，两个旧名称兼容，非本项目包拒绝 |
| 生成与类型 | 98 strict Node、17 DOM、133生成产物一致；125类型负对照通过 |
| Skill | 源码和全局安装结构校验通过；resolver返回六个既有字段和新版本/名称 |
| 无依赖入口 | 独立包help/version/安装/resolver可运行；Gameplay缺XState时在打开受控Store前明确拒绝 |
| 锁定依赖 | 解压包与稳定安装分别离线`npm ci`，XState5.33.2在各自根目录内解析 |
| 真实Chrome PC | 12项通过，包含目标选择、旧文档拒绝、资源白名单和Profile恢复 |
| 真实Chrome GER | 13项通过，生产CLI/Recipe/SQLite；一次效果、未知保护、原回执恢复与Evidence |
| 真实Chrome Integration | 10项通过，原文档绑定、重载拒绝、单次超时和可选失败保留Generic |
| 宿主发现 | 独立项目安装前0个，forceReload后1个，独立进程重启后1个；新显示名正确，0解析错误、0模型回合 |
| 链接与包清单 | 修改的源Markdown相对链接278项、随包修改文档205项均存在；无编译器、实验探针、数据库或APK进入payload |
| 资源清理 | 9个本轮Chrome根进程已退出，16个本轮HTTP/CDP端口不再监听；宿主发现进程正常退出 |

Node跳过项为仅适用于非特权macOS文件系统及非普通查询输入的平台测试；没有跳过本轮失败用例。一次临时验货脚本读取JSON误用了Windows GBK默认编码，改为显式UTF-8后通过；这是本地记录脚本问题，没有为此改产品或测试预期。

所有运行入口均使用预生成CJS并禁用类型剥离。Chrome用自建无游戏业务夹具和本轮独立Profile/Store，不接管日常浏览器。强制中断仅针对本轮自有CLI；未把未知效果当失败后重试，原未决保留。

未改动的真实PC DoL保存/导航、Android文档及独立原生保存恢复、Windows文件锁、精确上游多区域源码查询和Kotlin取舍，按[此前Windows统一记录](WINDOWS_CLOSEOUT_20261107.md)复用，不计为今天重新执行。Kotlin没有接入生产，也没有宣称设备代理性能收益。

## Not validated

Windows最低Node26.0.0、当前ZIP在Android重装后的业务复验、全Mod/设备/WebView组合、完整无人接管Android Mod修复闭环、当前Desktop聊天自动Skill热重载均未新增验证。独立App Server发现不能代替当前聊天热重载。

## Known limitations

原目标默认Store仍缺失，备份落后于最后已知记录，资源身份差异原因未定；四条历史pending没有被恢复、重放或结清。独立测试副本和新安装不能替它补造历史。更完整SQLite备份机制仍为未来按需增强，本轮没有新建第二账本或数据库服务。

旧Store预检不与外部删除构成原子文件锁。后台截图超时根因未完全确定；截图失败不说明业务未发生。Provider继续受已审版本、原生合同和独立Outcome约束；Integration Worker不是权限沙箱，Evaluator并非物理只读。

当前本地候选没有新增的发布技术阻断；公开合并、Tag和Release仍等待单独指示。后续真实问题按风险补验，不为已经完成的本轮追加穷举覆盖。
