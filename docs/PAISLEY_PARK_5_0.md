# DoL Dev Tools 5.0 — Paisley Park

当前为 `5.0.0` 本地正式包，尚未公开发布。它在 4.0.1 的 Android/CDP/ADB、Action/Journey、GER 与 Evidence 上改善研发接续，不另建执行平台。公开稳定版仍为 4.0.1。

## 第一次使用

先按 [README 快速开始](../README.md#快速开始) 核对 Tools 版本和连接条件。普通观察用现有 Doctor、capture、DOM/CSS 或 Evidence；需要持久目标及未决副作用恢复时才用 GER。源码与构建仍由目标项目的工具负责。

## A：选定 UI 组件与源码关联

入口是 Tools 的 `integrations/soft-and-wet/source-link.cjs`，不是新的通用 DOM Inspector。需要已接入的 UI 项目提供 source index 与当前 Lab clue，三份输出使用新文件名：

```powershell
# 在已接入 Component Lab 的 UI 项目中生成 index，并从当前 Lab 保存 clue：
node component-lab/source-index.cjs --out NEW_INDEX.json
# 从所选 Tools 运行；各路径须替换为实际已核对的文件：
node integrations/soft-and-wet/source-link.cjs --root ABSOLUTE_UI_ROOT --index NEW_INDEX.json --clue CAPTURED_CLUE.json --out NEW_RESULT.json
```

当前 consumer 仅支持 `shop.toolbar / toolbar`。`matched` 表示列明的输入适用，不证明 CSS 根因、游戏业务或发行包实际加载；字节变化保留 stale，陌生组件保持 unknown。不会为定位源码扫描私人目录，普通 Debug 也不要求经过 Source Link。

## B：目标项目拥有的 Component Lab

Lab 复用真实 Vue 组件、样式和项目自己的 Vite，用于编辑与 HMR。它的源码、依赖、producer 和运行命令属于 UI 仓库，**不包含在 Tools ZIP 中**；无需为普通诊断安装 Vite 或 Playwright。现有 UI 2.5 Lab 测试分支不能整分支覆盖 UI 3.0；在目标版本薄接入，重新生成当前 index/clue。

代表性 Windows 联合运行与可复用命令见 [A/B 记录](PAISLEY_PARK_5_0_WINDOWS_AB.md)。首轮只覆盖有限组件、内存回调和几何/HMR，不承诺原生购买、存档或全部组件。

## C：按需接续现场、源码与制品

跨现场、源码、构建/加载或复盘已有轨迹时，按需使用 [development-flow Recipe](DEVELOPMENT_FLOW.md)。保留正确设备与文档身份，读取新状态，区分源码、构建、存储包、加载资源和业务结果。普通任务不强建 Goal；Unknown 仍由原链路恢复。

旧打赏调查已复核原因与证据限制；新的平板只读任务验证生产文档绑定与制品正反例，发现同版本 UI 实际仍加载旧包。没有重演打赏或制作第三方修复。见 [C 报告](PAISLEY_PARK_5_0_C_REVIEW.md)。

## 状态与边界

A/B 的有限原型和 C 的代表性接续已按约定收口，证据分别注明平台与时段。5.0 未改变 GER/SQLite/Effect Ledger，没有追认或清理历史 Unknown。完整 Android Mod 修复、更多组件与设备、全部 Debug/GER 组合仍为 Not validated / Additional coverage，不自动扩大验收。C-EXT 未触发的外部工具研究不是运行前置条件。

正式包的版本、安装与内容核验独立于这些已有证据；本地打包不代表公网发布、正式合并或全局 Skill 更新。具体检查与复用依据见 [5.0 收口](CLOSEOUT_5_0.md)。
