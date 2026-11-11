# Gold Experience 7.1 工具链同步记录

状态：本地研发候选，尚未发布。检查日期：2026-11-12（北京时间）。

本轮从正式 7.0 后的主线提交 `8c5628fc2bd93cf6116e5cef3fe597315a2525f1` 开始，在唯一项目目录的 `maintenance/toolchain-refresh-7.1` 分支工作。源码候选版本 `7.1.0-rc.1`；正式下载仍为 7.0.0。8.0 编排、Runtime/GER 重构与公开发布不在本轮范围。

## 本轮 Done

核对组件来源和本机版本，实施有收益的兼容更新，更新工具选择 Skill/指南，验证受影响的 Windows 离线路径。Android 设备和新 Mod 组合没有本轮真实观察时明确列为 Not validated；不替代历史验收，不清理或重建旧 Store。

## 组件决策

| 组件 | 本轮实际核对 | 决策与原因 |
| --- | --- | --- |
| Android CLI | `1.0.16486076` → `1.1.16717390`，由现有 Google CLI 自带更新器安装 | 已更新；input、profiler、device hub 的本机 help 可用。设备执行尚未证明。 |
| 官方 Android Skills | `android-cli` 与 `android-profiler` 分别通过官方 CLI 更新；profiler 元数据日期 2026-10-23 | 已更新；文件摘要和回退副本在本机记录，不把 CLI 版本视作 Skill 版本。 |
| ADB / Platform Tools | 旧 SDK 已不在当前项目；官方 CLI 稳定目录提供 37.0.1，ADB 报 37.0.1-15733141 | 安装至本项目 `tools/android-sdk/`；只装 platform-tools，不使用页面上 37.0.3 Canary 代替稳定版。 |
| Node / npm / SQLite | Node 26.13.0、npm 11.20.0、内置 SQLite 3.54.0；npm registry 最新为 12.2.2 | 保留本机版本和 Node 26.0.0+ 下限；不为同步切换 npm 大版本，不独立替换 SQLite。 |
| XState | 本机锁定 5.33.2；registry 与作者 Release 为 5.33.4 | 保留 5.33.2；5.33.4 公告修正 assertEvent 类型收窄，当前 GER 不使用该 API；不为此改变运行依赖。 |
| Chrome / CDP | 本机 Chrome 157.0.8103.39；项目使用现有 CDP/ChromeHost | 保留已装 Chrome；按生产合同回归，不下载替代浏览器或宣称 WebView 已验证。 |
| Playwright | registry 1.65.0；根生产包未声明该依赖 | 不引入；现有 ChromeHost 和 Node 测试不依赖 Playwright。 |
| Perfetto | profiler help 提供 systemtrace、heapdump、session；独立 trace processor 不在 PATH | 复用已更新官方 Skill/CLI和现有工作流；没有实际 trace 需求，不下载分析器或启动录制。 |
| Integration | 本机 UI 4.2.0 主线、Sticky Fingers 研究分支；本项目桥接仍为可选 `DoLGameUI.ui` 观察 | 保留当前桥接；只读源码核对不证明当前实机兼容。Sticky Fingers 没有已接入的专属 Provider，不新增或臆造接口。 |

## 已查明的非问题

Doctor 的 `android --no-metrics --version` 在更新前后都返回成功；帮助未列出该参数，不足以认定它失效。本轮保留原行为，没有为猜测的缺陷改代码。

## 证据和范围

本机 `artifacts/toolchain-refresh-20261112/` 保存更新日志、帮助、更新前副本、KB 搜索和后续验证输出。SDK、回退副本和原始日志不进 Git 或发布包；本记录也由 export-ignore 排除，使用指南与当前项目 Skill 保留。

官方来源：[Android CLI 下载域](https://dl.google.com/android/cli/)、[Platform Tools 修订说明](https://developer.android.com/tools/releases/platform-tools)、[Node 下载](https://nodejs.org/en/download)、[XState 5.33.4](https://github.com/statelyai/xstate/releases/tag/xstate%405.33.4)、[Perfetto 分析文档](https://perfetto.dev/docs/analysis/trace-processor)。CLI 版本/help、SDK 稳定目录和更新成功记录是本轮本机证据；网页描述不代替它们。

## 本轮验证

- 工具链同步后、显示名修改前的完整 Node 套件：667 项，665 通过，0 失败，2 跳过。跳过为仅适用非特权 macOS 文件权限、非 Windows 特殊文件路径的用例。其后代码改动仅为下述 resolver 名称兼容，由安装/解析定向回归覆盖，不将前一轮全量结果冒充最终文件的重新全量运行。
- Python 套件：10 项，9 通过，0 失败，1 跳过；可选 Pillow 未安装，Visual Diff 像素用例未运行。不为提高通过数额外安装依赖。
- resolver 修复后，按权威 CTS 重新生成并检查全部 98 个严格 Node 模块、17 个 DOM 模块和 133 个生成产物；类型合同检查通过，125 项负例被正确拒绝。
- 真实 Chrome：复用 `tests/integration-document.browser.cjs`，独立无游戏页面与专用 Profile；稳定文档、导航、同 URL 重载 3 种情况通过，自有浏览器退出、loopback 服务关闭。原脚本保留历史输出父目录 `artifacts/5.1/`，本轮 stdout 在本轮证据目录指向实际新报告；目录名不改变测试运行日期或范围。该实验使用真实 CDP 和受控 Integration，ChromeHost/PC Session 合同由本轮离线套件覆盖。
- 新旧 Android CLI 的 Doctor 版本查询成功；新 CLI input/profiler/hub 查询成功，ADB `version` 成功。没有对设备执行输入、录制或镜像。
- KB 实际搜索：`Android CLI input WebView accessibility profiler`，返回包括 `kb://android/develop/ui/views/layout/webapps/webview` 的 10 项；这证明搜索入口可用，不证明搜索结果覆盖全部 CLI 新能力。
- 当前候选去除 package/项目 Skill 显示名的中文括注；旧正式 Tools/全局 Skill 保留原样，没有执行热替换。

名称修改时实际复现了 resolver 白名单拒绝纯英文显示名；已在权威 CTS 与生成 CJS 中增加该名称，同时保留三种历史名称和其它身份检查。失败输出保存在 `english-name-before.txt`，针对安装/解析的修复后结果另行保存。这是本轮唯一生产代码改动，不涉及 GER、Provider 或持久化。

修复后的安装、失败清理和解析定向回归：19 项，18 通过，0 失败，1 项因仅适用非特权 macOS 文件权限而跳过；当前候选 resolver 与旧 7.0 全局 Skill 的默认解析分别成功。当前 CLI 的 layout/screen help 保留现有 `--device`、`--flat`、`--full`、`--no-idle`、`--output` 和 `--annotate` 接口；这只证明命令形状兼容。

## Not validated / 当前限制

本轮没有执行 Android 设备/App 操作、真实游戏业务、存档或 GER 历史恢复；input/profiler/hub 目前只有本机能力发现证据。真实 Android/CDP、更多 WebView/Mod 组合、Mac/Linux、ZIP 重装、Gold Experience 全局 Skill 更新和宿主热重载未新增验证。没有生成正式 ZIP、Tag 或 Release，本地源码提交不代表公开发行。

旧本地输入、缺失 Store 和历史 Unknown 不由本轮工具升级恢复。无证据表明需要修改 GER/SQLite 语义，本轮未改变其实现和锁定 XState 版本。
