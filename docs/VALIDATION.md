# DoL Dev Tools 验证记录

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
