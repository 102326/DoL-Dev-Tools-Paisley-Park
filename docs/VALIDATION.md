# DoL Dev Tools 验证记录

## Skill 与持久 Mod 夹具验收：2026-10-05

- 最终集成`npm test`：80 passed / 0 failed / 0 skipped。新增Skill检查实际运行独立安装的解析器，覆盖含空格路径、失效位置/显式恢复、防覆盖与无效来源无输出；没有新增Node依赖。
- 本机独立Skill安装与quick_validate通过。独立任务从安装副本定位Tools，使用两次真实WebView自有夹具Evidence完成Compare及本地Issue Report，文件状态complete；Compare exit0，Report单独退出码未捕获。首次猜错结果文件名被纠正为compare.json，失败未隐藏。未重连设备或上传，宿主新回合自动发现未在旧回合冒充验证。
- 持久Mod夹具真实运行complete / exit0：自有源20→48、Python标准库ZIP内两文件一致、CDP部署输入SHA一致、独立profile存入、不同document loader重载、公开ModInfo来源IndexDB/版本/自有源SHA一致、实际CSS20×20→48×48。4份Manifest/Envelope通过Draft2020-12/RFC3339标准验证；不采游戏正文/截图/日志。
- 初始隔离规则未排除127.0.0.1，公共API预检失败；增加固定能力元信息后核对并修正。本地HTML内存副本将标准嵌入Mod数据块清空，排除第三方Mod；原HTML不变。后续重载旧context竞态导致source确认失败，明确ReferenceError后等待新loader再观察，最终新目录通过。中途夹具源码读取路径也从可能已释放ZIP改为公开ModInfo自有preload；不把尝试记录当作通过，不自动重试部署。
- 浏览器使用新profile与独立localhost，输出仅本地忽略目录；原手机、现有Mod列表、存档及业务源码未变更。持久Mod证明限桌面真实加载器的自有夹具，Android现有证明仍为临时自有节点；未验证Android持久Mod/APK更新或任何第三方Mod完整业务。

独立只读审查发现夹具在finally清理前报告complete。改为verification-complete中间态，独立有界等待自有进程exit、自建CDP端口ECONNREFUSED与HTTP关闭回调；不明则partial/exit1，不扩大杀进程范围。修复后新目录再次完成完整持久链，exit0，三项清理确认均记录；独立静态复核未发现新增阻断。另4份最新Manifest/Envelope标准Schema通过。原profile/尝试证据不删除。

## 后续完整能力增补：2026-10-05（未封装）

- 当前完整 `npm test`：79 passed / 0 failed / 0 skipped；覆盖Recorder隐私/候选、matrix全计划校验与失败停止、Network原session恢复、Animation界限/失败保留、Viewport授权/恢复/共享脱敏、Native Layout固定投影、Leak/Timeline清理与未知状态、Hitbox中心命中/SVG及关联进程身份/user/isolated UID。最后user/isolated支持的定向测试1 passed；没有隐藏设备partial或夹具错误。
- 受控已有浏览器：trusted Recorder 3条、输入未落盘、cleanup0；离线实验观察到5个请求失败，声明中性基线恢复后请求继续；phone/tablet/desktop三视口DOM/CSS/PNG完成且恢复观测匹配。独立detached数字可读，不能作为Android协议通过。2秒受控64×64视频抽取8帧complete，非游戏动画验收。
- 真机选定matrix：baseline与background-resume complete；restart动作后等待未完成，矩阵partial并停止；不将动作确认解释成后续业务页面通过。普通heap/DOM/listener采样available；detached与DOM清理确认不完整，Journey停止后续复采并保留partial。没有自动重试让失败变通过。
- `native-layout`未执行helper；现有CLI帮助与flat字段核对，离线runner/边界/脱敏测试通过。Viewport仅桌面受控现场；其它实体设备未模拟或安装。
- 时间对齐已验证源端遗漏传播、未知envelope/格式/锚点、时钟误差与Long Task实际起点；离线源SHA/incident先校验。统一轴不重建native逐帧语义。独立审查指出Viewport共享脱敏与Timeline丢源/错位问题，均修复并补回归；相应定向19 passed。
- [Workshop](WORKSHOP.md) 自有夹具实际完成源码→项目build/deploy→CDP重载→48×48复验，源码/dist/deployed SHA一致，前后Evidence/Diff/Report保留。首次最终断言误用comparison.name而非step，partial保留；修正夹具后新目录通过。Hitbox扩展后的夹具再次通过，前后私有截图人工查看与矩形一致，SVG现场输入导出通过。
- 真机 `process-memory` 读取主进程及一个准确关联的独立进程PSS/RSS。增加user过滤时首次漏支持ISOLATED双UID行而partial；核对实际公开行后修复，加入isolated/foreign-user回归，新目录complete。其它未精确匹配packageList的候选排除；不从名称/UID推断JS renderer。独立只读审查未发现阻断；未证明进程世代的限制保留。
- 已用标准Draft2020-12/RFC3339验证57份stage2 Manifest/Envelope与trusted Recorder payload；格式测试1 passed。Schema不证明SHA关联、隐私、原设置恢复或业务正确。没有新增Node运行依赖，版本仍1.1.0基线，未制作新ZIP/tag或推送。

Stage3标准验证进一步发现Workshop夹具漏写Evidence必需的privacy与step source/required/captureStart；宽松消费器能比较，但不能据此宣称公共Schema合格。修复夹具的实际采集元信息并新目录重跑闭环，38份stage3 Manifest/Envelope和最新user/isolated进程payload通过；6份旧夹具manifest按预期拒绝，旧资料不回填或冒充有效公共格式。最新Skill quick_validate valid，仍未全局安装；格式修复没有放宽Schema。

完整蓝图的实现/外部/条件路径与剩余验收见 [CAPABILITY_COVERAGE](CAPABILITY_COVERAGE.md)。真实目标项目制品部署与真机业务复验、最终Skill安装/独立任务与独立解压包检查仍未宣称完成。

后续在当前授权App执行固定自有WebView夹具：源码修改经其build/deploy形成SHA一致制品，实际矩形20×20→48×48。只采自有CSS scope；自有节点最终确认不存在，自建转发核对后移除，complete/exit0。未安装持久Mod/APK或操作业务存储。`node --check` 两个例子通过；4份真机夹具Manifest/Envelope标准验证通过，stage3/4累计42份及最新进程payload通过，6份旧夹具格式仍按预期拒绝。

## 完整能力开发工作区：2026-10-05（未重新封装）

在现有目录继续开发，package 仍为 1.1.0 基线；按用户要求暂不新建 ZIP、版本 tag 或推送。已明确当前连接 App 可用于普通测试动作，真实存档/云数据删除覆盖仍排除。

- CSS/Environment：限定 CSS styles/矩形、scopeHash、环境与公开 Mod metadata；真机 Evidence complete，CSS 154 节点、公开 runtime list 37 项。列表顺序是 reportedIndex，不证明实际执行顺序；未知 enabled/loadOrder 为 null。
- Action/Journey：完整计划先验证、静态 plan 零设备调用、当前用户安装与精确 foreground/focus、准备后再校验、派发后失败结果未知、总截止后不继续下一动作、独立恢复预算、未知动态 forward 端口不猜删。独立审查发现并修正准备后前台竞态与断链结果标记，已复核覆盖。
- 真机六步 Journey：等待页面、web-focus（activeElement 验证）、DOM/CSS/Environment/Console/Network checkpoint、旋转设置实验、短等待、截图。complete / exit 0；原旋转设置和既有 ADB forwarding 清单逐项一致，自己的传输清理完成。没有购买/输入/剧情推进/存档操作；此处未做真实 tap/input/restart，旋转设置成功不证明 App 实际转向。
- DOM Inspector/Storage：真机限定范围记录 154 节点，深度截断如实标记；所有权 unknown。local/session 数量 43/1，9 个数据库的只读结构/count 均 available；不读取键值或记录正文。Selector Health 对零/多匹配输出数量，不强行报唯一；半透明背景不报已知对比，色彩对比是 computed color-only 估计。
- Timeline：独立审查用 VM 复现 setup 异常泄漏、setter/冻结实例恢复失败、方法 getter 改变构造行为；外层 finally、独立资源清理、完整描述符复核与无 getter 探测修复，7 项模块回归及独立复核通过。真机 500ms 显式 instrumentation 窗口正常结束，3 类构造器可观察，cleanupConflicts=0；records=0，不能宣称捕获到了动作/Mutation 或 callback 执行。已有 Observer 与 callback 不跟踪，不主动 disconnect 项目实例。
- Storage 只读独立审查确认 upgrade race abort、截止关闭自有句柄/事务、迟到 count callback 不改返回结果；补充 hash 后 deadline 再核对及局部 incomplete 对比 unobserved，避免虚构删除。相关新增回归通过。
- Schema：隔离于忽略目录的可选开发 jsonschema 4.25.1 + rfc3339-validator 0.1.4 实际验证 Draft 2020-12 Schema、56 份当前真机 JSON 和 12 份对应 Collector payload；date-time/UUID/version 负例回归 1 passed。首次只有 jsonschema 时未启用 date-time format checker，负例失败；查明可选 RFC3339 检查器缺失后补到同一隔离目录，并断言检查器存在。未添加 Node 运行依赖、未改全局 Python 环境；CI 使用显式开发依赖。

上述模块测试、现场采集与普通复现实验分别记录，不代表最终能力、兼容矩阵或完整游戏验收已经完成。现场资料保存在忽略的 artifacts/complete-development-*，不打入源码交付包。

本轮后续验收：

- `npm test` 全仓 64 passed / 0 failed / 0 skipped。系统 Python（隔离 schema 开发依赖）4 项：3 passed / Visual 1 skipped；现有 Pillow Python 的区域比较 1 passed。统一 CLI 实际比较同一截图的 10×10 区域，complete；不证明跨版本视觉条件一致。Skill quick_validate valid，未全局安装。
- 增加 perf-series：先在休眠设备取得 3 组 native 内存/帧/thermal/battery，CDP unavailable，保留 partial。观察到 power Asleep、黑色截图和 NotificationShade 焦点；显式 wake Journey complete 后同一 PID/socket 恢复 HTTP。未重启 App。新的 3 组 native 与 WebView heap/DOM/listener/时间指标全部 complete；没有把首次失败删掉或隐藏，内存变化不作泄漏结论。Device 采集新增可用时的 wakefulness 元信息。
- Evidence Compare/Report/Known Good：离线 7 项行为检查覆盖 SHA、路径、缺失/未知、固定投影、Journey 任意字段/数组限额、防覆盖与选择参考。真实小范围 DOM/CSS/Environment Reference 建立后与原来源比较，三类 changes=0；参考新分配 incidentId，SHA 校验通过。首次默认包含 Storage 的基线因键名遗漏而拒绝；后来明确只选完整三类，没有虚构完整 Storage。失败的性能 Evidence 生成 Issue Report 为 partial，保留原始失败说明范围。
- 后续标准 Schema 验证累计 97 份真实 Manifest/Envelope 与 17 份对应 payload，包括新的 series profile 与 Known Good manifest；Schema 仍不证明跨文件真实性或业务正确。新增所选类型缺失回归首次命中通用错误文字；调整检查顺序以给出明确 missing 原因后定向与全仓检查通过，未放宽拒绝条件。

## 1.1.0 公共接入：2026-10-05

原目录继续更新，无新增 Node 运行依赖；证据 schema 仍为 1。1.0 源码包、tag 与替换前备份保留，未推送 GitHub 或上传真实资料。

- `npm test`：28 passed，0 failed，0 skipped；补充的 Integration 文件测试覆盖缺失/未知契约、错误钩子/结果、脱敏状态、输出限额、核心过滤、同步导入死循环、异步未完成及后台句柄清理、JSON-only 保存与 Generic 完整性。最后的 Support 名称/版本投影及嵌套元数据拒绝增补由同一测试文件复验，4 passed。
- 独立只读审查发现原地 redact 可改变 collect.status；保存脱敏前标量并在模块和核心过滤后对照，回归与独立静态复核通过。其他未发现阻断问题。审查中的 CDP budget/close 检查为 VM 模拟，不能当作真机传输验收。
- 异步 Promise 无 Node 活跃句柄时可能让 Worker 提前退出；测试明确接受 worker-exited 或 timeout 两种失败，不强求某种内部事件顺序，也不把退出视为成功。
- 真机：沿用已核对的显式设备/App，250ms CDP 事件窗口、`#passages` DOM，同时选择 Soft & Wet 与复制到仓库外临时目录的独立 DOM 示例。Evidence complete / exit 0；两个集成 available；示例只返回 childCount=1、hidden=false，Support complete，保持 incidentId。采集后原有两条 ADB 转发清单逐项一致，临时模块副本已删除。
- 本轮人工查看截图为清晰店铺页面。没有点按、购买、推进剧情、启动/重启或改存档；这里只验证现场采集，不代表游戏/视觉兼容矩阵。没有在真机卸载 Soft & Wet；真正缺失和未知 API 的边界由已有受控测试证明。
- Schema：JSON 解析、8 个本地 `$ref` 解析、真机 Manifest / Support / 14 份 JSON envelope、步骤/DOM/集成数据的必需字段检查通过。**尚未使用完整 Draft 2020-12 标准验证器验证 Schema 或实例**；检查结果不能写成完整 JSON Schema 验证通过。没有为验证安装新依赖。
- 仓库 Skill 的 quick_validate.py valid；更新公共接入与格式链接，不代表全局安装或宿主自动发现验收。
- 可携带源码候选包：53 个源码文件逐项 SHA、ZIP 可读性及 38 个本地 Markdown 链接通过；独立含空格路径解压，工作区外调用 `DoL-Dev.cmd --version` 返回 1.1.0，解压包 Integration 四组测试通过。不包含 artifacts、私有 backups、Git、游戏或 APK。最终包只更新这条验收记录并加入源码 commit 信息；制品逐项校验，复用已有效的产品测试。

现场只在忽略的 `artifacts/public-1.1-*` 本地保存。Worker 隔离的是故障/本地流程时限，不是文件/网络权限，也不回滚远端 JS 副作用。自定义普通字段的隐私仍由作者白名单与人工分享审查负责。

下面保留 1.0 和早期验证历史。

日期：2026-10-05（Asia/Shanghai）。本机原工具包已更新到 1.0.0；没有推送 GitHub 或上传真实证据。

## 1.0 收尾检查

- `--version` 返回 1.0.0；README / 命令说明 / 迁移说明一致。保留旧入口，JSON schema 仍为 1。
- 独立只读审查发现 Support 的版本字段可接受嵌套对象，导入格式异常但 SHA 正确的 Evidence 时会泄露无关数据。修正为 ≤64 字符字符串/null；新增回归覆盖五个字段，异常投影 partial 且敏感值被排除。审查者静态复核通过，实际测试由主线程执行。
- 1.0 真机 Doctor、未启用 Integration 的 Generic Evidence（限定 DOM + 短 Logcat + 示例复现说明）、Support 均 complete / exit 0。版本一致、incidentId 对应、全部制品 SHA 校验通过；默认 Support 无截图。复现说明是文档示例，不是自动识别出的真实故障。
- 本轮截图人工查看为全黑；系统报告 NotificationShade 获得焦点，目标 App 仍有可读主进程 / WebView。不能据此确定黑屏原因或声明目标页面视觉通过，没有点按或唤醒设备以制造通过结果。`complete` 只说明请求的制品采集完成；旧版本已验证的清晰截图/录屏记录仍列在下面。
- 采证前后已有转发清单一致，新增转发仅由当前会话清理。
- 源码包在独立临时目录（含空格路径、没有相邻 UI 源码）解压，43 个源码文件逐项 SHA、ZIP 可读性、文档本地链接校验通过。`DoL-Dev.cmd --version` 从工作区外调用通过；解压包 Node 24 项及已有含 Pillow Python 的 3 项测试全部通过，Visual Diff 统一入口也实际生成了受控图片差异。
- 解压包的 `evidence --full` / `perf --deep` 未给 `--sensitive yes` 时返回 1，且不创建输出目录；没有借交付测试采集重型系统资料。
- 已为替换前源码（含未提交 0.5.0）建立独立 ZIP 与 Git bundle 备份；原 artifacts / backups 没有清理或覆盖。

## 离线行为检查

| 检查 | 实际结果 | 证明范围 |
| --- | --- | --- |
| `npm test` | 24 passed，0 failed，0 skipped | CDP 传输、显式目标、输出保护、collector 失败保留、可选 Integration 隔离、脱敏、DOM 范围/Diff、性能解析、Doctor、Logcat、Recording、Support、重型包装及采集 profile |
| `python -X utf8 -m unittest discover -s tests -p "test_*.py"` | Backup 2 passed；Visual 1 skipped | 系统 Python 无 Pillow，明确跳过可选视觉能力；没有隐藏失败 |
| 已有含 Pillow 的 Python：`python -m unittest discover -s tests -p "test_visual.py"` | 1 passed | 实际图片像素变化、容差、尺寸拒绝、防覆盖与输出统计 |
| skill-creator `quick_validate.py`（`python -X utf8`） | valid | frontmatter、名称与结构校验，不代表 Skill 的现场行为已经验收 |
| `git diff --check` | passed | 已跟踪 diff 的格式；新模块由测试实际加载 |
| 新 CLI `--help` | passed | 入口可运行，不代表全部设备能力可用 |

Perfetto / bugreport 测试使用受控模拟 runner 和本地临时文件，不执行真实系统 trace 或 dumpstate。
无 Soft & Wet、API 未知、诊断缺失/异常由 VM 和采集器测试覆盖；没有卸载或修改真机 Soft & Wet 来制造这些条件。
原 evaluator、Android CLI 和 Backup 已有检查继续保留。没有新增 Node 运行依赖。

测试过程里发现两类问题并修正：

- 实际 Logcat 有缓冲区分隔行及 epoch 数据行前导空白，旧解析会失败；增加定向回归后重新采集一个新会话。
- Windows skill validator 默认以 GBK 读取 UTF-8 文档；使用 `python -X utf8` 验证。未更改系统编码或安装依赖。

夹具错误与产品错误分别处理：新增 Support 模拟制品必须有真正 SHA，模拟 MP4 须符合最小容器头；修正夹具后验证输出防护，不放松产品校验。

## 实际机器与 Android 验证

经用户授权使用空闲机器，核对当前可用工具与唯一连接设备。ADB 未在 PATH，但已存在独立 Platform Tools，调用时通过进程内 `DOL_ADB` 指定；完成后恢复环境变量，没有安装或修改全局 PATH。
当前 Android 前台是已经运行的 DoL UI 兼容 App；使用它的显式 package，不切换到另一个已安装的 DoL App。未启动/重启游戏、点按、换装、购买、推进剧情或访问存档。
实时截图、录屏和 JSON 仅保存在 Git 忽略的 `artifacts/validation-*`；本文不附 serial、私有路径、截图正文或原始日志。

| 实際操作 | 结果与限制 |
| --- | --- |
| Doctor（显式设备/App） | complete，exit 0；没有创建转发或修环境，可选 scrcpy 缺失被单独记录 |
| 初次常规 Evidence + 短录屏 + Logcat + Integration | partial，exit 1；仅 Logcat 格式失败，其他成功制品保留，原会话没有覆盖 |
| 修正格式后的新 Evidence + Logcat + Soft & Wet | complete，exit 0；Public API 被识别，适配当前状态未自动当作业务兼容通过 |
| 0.5.0 Generic Evidence + Logcat + 合成复现说明，未启用任何 Integration | complete，exit 0；manifest integrations 为 []，不读取 Soft & Wet 专属诊断 |
| 0.5.0 独立 perf profile | complete，exit 0；只有设备、App、gfxinfo、meminfo，没有顺带打开 CDP 或 Integration |
| Support 投影 | complete，exit 0；保持 incidentId，带入明确标注的合成复现说明；默认没有复制截图、DOM、Network、录屏或 trace |
| 两份真机 DOM contract 的 Diff | exit 0；结构地址比较可运行，未据此宣称完整兼容矩阵通过 |
| 两份实际截图 Visual Diff | complete，exit 0；尺寸相同，正常生成当前/参考/diff/统计；未将差异当作视觉失败或更新 Golden |
| Screenshot 人工查看 | 当前 DoL 店铺页面清晰可读，非锁屏；它包含真实屏幕资料，分享仍需检查 |
| 3 秒 screenrecord 的外部 ffprobe | H.264，3408 × 2272，约 3.013889 秒；没有操作 Drawer/Modal，因此没有验证这些动画或完整播放效果 |

未验证 Android CLI 新 layout 聚合。原入口可能安装独立辅助 APK，并包含原始布局正文，因此仍未纳入默认脱敏包。
真机采集后临时转发删除步骤完成，录屏自建临时文件清理状态为成功；不删除原有转发、系统 bugreport 或其他文件。

## 当前实机指标限制

当前 gfxinfo 提供汇总帧数与 jank，120 个时长记录的 Flags 均为非零（观察到 32）。本工具没有针对该标志推断时长语义，记录 excludedSamples，并将无有效样本的 median/p95 留为 null。
不把这些值解释成当前操作卡顿、整个游戏速度或 UI 优化收益；要分析该平台时长，后续应核对平台语义或按具体问题升级诊断。
meminfo 能解析 PSS/RSS，但没有按多次界面开关进行实验，也没有枚举 WebView 子进程，不能得出泄漏结论。
Console / Logcat 默认摘要不含原文；若摘要不能解释根因，报告该证据限制，不猜测原始异常内容。

## 未验收范围

- Perfetto helper 真机运行、trace 数据语义和 bugreport 完整性；本轮未下载 helper 或为了测试包装生成重型系统资料。
- 多设备、多 WebView/进程、其他 socket 命名、不同页面标题、其他 Android 与 WebView 版本。
- 原生 action/journey、游戏操作、存档恢复、性能改进、Drawer/Modal 动画和第三方 Mod 的完整业务矩阵。
- Skill 的自动发现与独立真实任务前向验证；它仅维护在仓库中，没有安装到全局。

收集完整性、离线测试、真机采证和业务/视觉验收分别报告；本版本的通过项不扩大到以上未验证范围。
