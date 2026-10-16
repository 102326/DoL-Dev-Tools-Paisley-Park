# DoL Dev Tools 6.1.0 — White Snake

6.1 让 Agent 更清楚地判断：这次改动该验证什么，哪些有效结果可以复用，以及什么时候证据已经足够。重构时也有了可参考的行为对照方法，帮助发现“最终数字相同，但回调多执行了一次”这类问题。

原有 Android/WebView 诊断、Debug、GER、Workshop 和 Evidence 继续使用，不需要换一套工具链。

## 更新内容

- Skill 补充最小充分验证指导：检查围绕当前改动和实际风险，输入没变的有效证据可以复用，必要证明缺失时如实停止。设备和页面身份仍要核对，不能借“复用”跳过。
- 增加按需使用的[行为保持案例](../examples/behavior-preservation/README.md)：同时比较状态、回调次数与顺序、异常和副作用；明确要保留的行为与有意修复的缺陷。普通编辑不要求先搭一套行为模型。
- 补强配方验证：CE 检查固定原包和完整输出成员，拒绝允许文件里夹带的额外修改；指定 Python 路径无效时明确失败，不偷偷换解释器。
- 修正 Patch 观测的两个边界：安装后保留最初选定的资源；等待摘要使用单调时钟，系统时间回拨也能按时停止。
- 安装说明区分普通诊断与 Gameplay。安装 Skill 不要求先装 XState，固定历史复现也不必下载无关的新版本。

这些改进沿用已有 Skill、配方和测试。历史 Unknown 和原执行记录保留，不迁移 Store，也不重放结果未知的动作。

## 安装与升级

从 [6.1.0 Release](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/releases/tag/v6.1.0) 下载 `DoL-Dev-Tools-6.1.0.zip`，核对 `SHA256SUMS.txt` 后解压到新目录。保留旧 Tools、Skill 和执行记录，再按[安装说明](SKILL_INSTALL.md#610-white-snake-安装与验货)验证版本与安装位置。

最低 Node.js 22.12.0。普通诊断无需 npm 依赖；Gameplay 仍按锁文件安装 XState 5.33.2，最低 Node 版本使用 `--experimental-sqlite`，两个 Windows 启动器已包含该参数。

`artifact-manifest.json` 记录包的源码来源和文件摘要，`validation.json` 说明实际测过什么；它们是验货材料，不需要导入游戏。工具包不包含第三方 Mod、历史源码切片、游戏或私人现场数据。

## 证据与限制

Windows 完整 Node 回归 **449 通过、1 跳过**，最低 Node 22.12 定向检查 **48 通过、1 跳过**，Python **8 通过、1 项可选 Pillow 跳过**，均无失败。真实 CE 原包的完整字节和 16 项表达式检查、带空格的解释器路径、独立包安装及新会话项目 Skill 发现均通过，详见[Windows 记录](WINDOWS_6_1.md)。

行为保持案例有 8 组保持、3 组有意修复和 2 个负对照符合预期；另有 1 项 Unknown 未执行。它只研究固定历史 Hook 与合成宿主，不是 CE R1 修复、可安装补丁或完整 Mod 验收。

本轮未重跑 Android、真实 DoL 或 Chrome；未改动的运行合同按原范围复用已有证据。没有证明所有任务普遍提速或全平台兼容，桌面 GUI 的 Skill 自动热刷新也未验证。更多边界见[6.1 收口](CLOSEOUT_6_1.md)。
