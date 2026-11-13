# 7.1 Windows 阶段同步与 Skill Intelligence 接续

检查日期：2026-11-13（北京时间）。本页记录 Windows 的已完成阶段和下一步输入，不替代 Mac 实验材料。

最新有界接续：[Android CLI 1.1.16919734 更新及兼容检查](ANDROID_CLI_16919734.md)。本机工具更新不改变 RC.2 候选身份；以下阶段记录保留各自的输入和验证范围。

设备连接后的独立阶段见[7.1 平板只读预检](ANDROID_PREFLIGHT_20261113.md)：系统和 Doctor 实际核对已完成，原 App 停止且当前数据隔离/恢复条件未确认，没有进入 App/CDP 操作。

后续授权已调整：7.1 Skill Intelligence 由 Windows 独立推进，不再等待 Mac。下文“Mac 输入缺口”保留当时的交接事实，只限制未来吸收 Mac 原成果及其原 A/B 对照，不阻塞 Windows 新实施；Windows 新案例和结果不能标成 Mac 已有成果。

Windows 独立阶段的实际评测、未采用长稿的决定和子进程宿主阻塞见 [Skill Intelligence 结果](../../../experiments/skill-intelligence-7.1/RESULTS.md)。下方机器可读记录中的零模型轮次属于此前交接快照，不代表后续实验没有运行。

## 已同步阶段

`9136c79b5129d04b708f6e7496bed89bf330ff4e` 与 `8028efa5aee043c965ed9f9a761367726e5aa41f` 已推送到既有仓库的 `maintenance/toolchain-refresh-7.1`，Git 远端及 GitHub API 均确认后者的完整 SHA。未合并 main 或发布；仓库可见性未改。

两项提交的作者和提交者均为 Codex bot。审查覆盖全部 21 个变更文件、提交元数据与新增文本；没有发现个人身份、私人绝对路径、凭据、截图、日志、APK、存档或私有输入进入变更。原始验货、回退副本和工具安装仍留在本机。公开交接只保留下面的脱敏摘要和[机器可读记录](summary.json)，不上传候选 ZIP 或原始验证目录。

候选仍为 `7.1.0-rc.1`，来源提交 `8028efa5aee043c965ed9f9a761367726e5aa41f`，ZIP SHA-256 为 `f9df530951acd1f476cef0c33985296b2dc9b5d7efe7e5b6fcc1bd60b5024238`。该包的 425 个文件逐项对应 Git blob，两次构建字节一致。后续交接文档提交不是该包的来源，不重新标注或覆盖既有 ZIP。

输入与实现未变化，复用此前最终验货：完整 Node 665 通过、2 跳过；TypeScript 构建测试 6 通过；Python 9 通过、1 跳过；候选包定向回归 159 通过、2 跳过。跳过项是平台专属文件语义和可选 Pillow。缺依赖拒绝、隔离安装/解析、候选自身 XState 及 SQLite 关闭重开已有有效证据。Android 真机、真实 DoL 业务、最低 Node 26.0、Mac/Linux、全局 Skill 热替换仍未新增验证。本轮不重跑这些套件或操作设备。

## Windows 评测入口

本机实际运行 `codex --version` 得到 `codex-cli 0.167.0-alpha.4.1`；`codex exec --help` 提供 `--json`、`--output-schema`、`--output-last-message`、`--ephemeral`。它们可以承接已有评测的调用记录和结构化结果，不需要另建 Runner。官方说明见 [OpenAI 非交互模式](https://learn.chatgpt.com/docs/non-interactive-mode)与[命令参考](https://learn.chatgpt.com/docs/developer-commands)。本机帮助是当前命令是否存在的依据。

本轮只检查版本和帮助，模型调用为 0；没有验证模型/账号实际可用、Judge 质量或新旧 Skill 效果。没有读取认证材料、修改任一电脑的安全配置、重试 Mac 的 AGENTS 读取拒绝，或启动替代 A/B。当前项目 Skill 文件摘要见 summary；交接规则改变了本仓库 AGENTS，后续 A/B 要固定实际读取的指令与配置身份，不能假定与 Mac 原实验相同。

## Mac 输入缺口

协调方报告 Mac 分支为 `maintenance/skill-intelligence-7.1-mac`、提交为 `40a89d1bdadcb6c3373685df14fd0e8f96c93b99`。本轮两次查询服务器均没有该分支，本机没有该对象和 `experiments/skill-intelligence-7.1`。这不是收到文件后的独立复审；传述的案例、测试结果和 EPERM 仍保留其原证据边界。不能据此说新 Skill 更好。

取得该提交仍是合并 Mac 成果、核对其案例/rubric 与进行其原 A/B 对照的前提。用户后续已授权 Windows 独立建设自己的案例与评测，不需要等待这个前提；新材料明确标记 Windows 来源，不冒称替代或采用未取得的 Mac 文件。不从工作树目录名推断 Mac 基线。

远端材料到达后，在同一个仓库内依次核对：

```powershell
git ls-remote --heads origin refs/heads/maintenance/skill-intelligence-7.1-mac
# 只有分支确实存在后再获取；不自动合并或新建 checkout
git fetch origin refs/heads/maintenance/skill-intelligence-7.1-mac:refs/remotes/origin/maintenance/skill-intelligence-7.1-mac
git cat-file -t 40a89d1bdadcb6c3373685df14fd0e8f96c93b99
git ls-tree -r --name-only 40a89d1bdadcb6c3373685df14fd0e8f96c93b99 -- experiments/skill-intelligence-7.1
```

随后核对该提交是否被实际分支包含、共同基线、指令/Skill/案例和依赖差异，再使用原有测试与 rubric。固定模型、推理设置、权限与输入；真实工具记录先做客观检查，Judge 单独记录，争议留人工复核。未取得源文件前不预设其命令、格式或评分规则。

## 下一阶段关注点

Skill Intelligence 的目标是提高工具使用质量：任务理解与路由、最小充分验证与证据复用、授权判断、结论与证据一致、停止与资源效率、跨项目泛化。当前不改 GER 或增加 8.0 编排。

两项重点反馈交给现有 Mac 案例审查：产物空间失控要分别核对任务理解、归属、实际权限与工具限制，不能把未知当无限保留；已验证隔离且获授权的测试 App 要复用有效事实，只重核变化的安装、数据或云边界。独立 APK 不是全部数据隔离的证明。这些是评测关注点，本轮没有新增案例、设备操作权限或删除范围。

## 阶段交接规则

Windows/Mac 完成一段可交接工作后，及时提交，在任务已授权时审查并同步到指定维护分支，记录服务器完整 SHA。未同步提交、私有输入和实际失败要单列；本地提交不等于另一台机器已可接续。AGENTS 中保留这条简要规则；它不授权正式合并或发布。
