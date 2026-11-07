# DoL Dev Tools 7.0.0 — Gold Experience（黄金体验）

创造能力，赋予行动。

Gold Experience 是面向 DoL Mod 作者和 Agent 的本地开发工具。7.0 将独立 Chrome 测试和按版本查找源码接入已有流程，让你从真实运行现场找到相关代码，修改后再回到目标环境核对结果。

此前的 Paisley Park 从这一版起使用新名称。工具可以独立使用，也可以交给宿主 Agent 调用；原 Skill 标识、启动命令和数据路径继续保留。

[下载工具包](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/releases/download/v7.0.0/DoL-Dev-Tools-7.0.0.zip) · [安装说明](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/blob/v7.0.0/docs/SKILL_INSTALL.md#gold-experience-install) · [反馈问题](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/issues)

## 本次更新

### 在电脑上复现和调查

现在可以选择已安装的 Chrome，用独立测试 Profile 打开获准的本地 HTML，并明确列出页面需要的资源。选中目标后，可以读取 DOM、样式、Console 和网络信息，执行复现步骤，再保存前后证据。

PC 入口使用已有 Action/Journey、Gameplay Runtime 和 Evidence。页面重载后，旧文档绑定会被拒绝；重新建立绑定后，可以继续调查当前页面。

### 按版本找到游戏源码

`source-find` 可以在源码工作树或固定 Git revision 中组合 Passage、文字、符号和路径线索，返回候选文件、上下文和摘要。结果会标出尚未查完的范围，便于缩小线索继续调查。

找到候选代码后，再核对设备实际加载的游戏和 Mod，避免把另一版本的实现当成当前现场。入口见[游戏源码查询](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/blob/v7.0.0/docs/GAME_SOURCE.md)。

### 接续已有的开发工作

Android CLI、ADB 和 Chrome Inspect/CDP 继续负责真机与 WebView 现场。Mod 研究经验、Debug、受支持的 Gameplay 和原回执恢复仍可使用，普通诊断无需创建 Gameplay Goal。

工具包继续提供可直接运行的 CommonJS。内部 TypeScript 维护不增加使用者的编译步骤；Android 也不需要安装新的 helper。

## 安装与升级

需要 **Node.js 26.0.0 或更新版本**。下载命名的工具 ZIP 后解压使用，不要放入 ModLoader。

1. 保留旧 Tools、Skill 和执行记录，将新包解压到长期保留的新目录。
2. 在工具根目录运行 `DoL-Dev.cmd --version`，应返回 `7.0.0`；用 `DoL-Dev.cmd --help` 查看入口。macOS/Linux 使用 `node scripts/dol-dev.cjs`。
3. 需要 Agent 工作流时，按[安装指南](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/blob/v7.0.0/docs/SKILL_INSTALL.md#gold-experience-install)备份旧 Skill，再向空目标安装。
4. 需要 Gameplay 时，在新 Tools 根目录运行 `npm ci --ignore-scripts --no-audit --no-fund`。普通诊断、源码查询和 Skill 安装无需这一步。

Android 调查另需已有 ADB、USB 调试授权，以及支持调试的目标 WebView；PC 测试使用已安装的 Google Chrome。原 `Paisley-Park.cmd` 和 `$dol-dev-tools-paisley-park` 继续可用。

## 下载文件

| 下载 | 用途 |
| --- | --- |
| [DoL-Dev-Tools-7.0.0.zip](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/releases/download/v7.0.0/DoL-Dev-Tools-7.0.0.zip) | 工具、Skill、使用文档和必要资源 |
| [SHA256SUMS.txt](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/releases/download/v7.0.0/SHA256SUMS.txt) | 核对下载文件完整性 |
| [artifact-manifest.json](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/releases/download/v7.0.0/artifact-manifest.json) | 核对工具包对应的源码与文件摘要 |

GitHub 自动生成的 Source code 是源码归档；首次使用请下载上方命名的工具包。游戏、APK 和第三方 Mod 需另行取得。

## 已知限制

- 缺失的旧 Store 仍需可信原记录才能恢复；四条历史待处理任务没有被这次升级结清。
- 后台截图可能超时。先核对动作是否已经发生，不因截图失败直接重复业务操作。
- Windows 最低 Node 26.0、当前正式 ZIP 重装后的 Android 业务流程，以及当前聊天的 Skill 热重载没有新增验证。Skill 可能需要刷新宿主或开启新会话才能被发现。
