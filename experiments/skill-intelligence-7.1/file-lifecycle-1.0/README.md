# 真实文件副本生命周期验证

本轮已完成一次低风险的实际文件实验：复用已授权的隔离事实，修改一个合成输入后只重验受影响输出，重建测试副本，并清理本轮准确列出的生成物。没有设备、真实存档或共享云操作，也不是 Agent 安装环境 A/B。

## 目标与执行范围

直接复用项目现有 `examples/workshop/index.html`、`build.cjs` 和 `deploy.cjs`。HTML 只有静态样式和按钮；两个脚本只用 Node 内置 fs/path 在各自目录复制文件，不访问账号、云、浏览器或游戏数据。运行前对这三个源文件核对当前提交的 Git blob，保留原字节作为恢复来源；不把“目录独立”当作隔离证明。

用户已授权本阶段的新建纯合成夹具、准确副本重建和可再生产物清理。`verify.ps1` 只接受一个新 run 名，固定在本项目的忽略目录内操作；存在同名 run 就停止。未注册到任何宿主或服务，未安装 Skill、App 或依赖，没有启动 HTTP 服务。子构建进程结束后才检查和清理。

删除范围固定为本轮 `working-copy` 下的五个文件：

```text
index.html
build.cjs
deploy.cjs
dist/index.html
deployed/index.html
```

每次删除前检查最终绝对路径、已有祖先和目标的 ReparsePoint 标志、文件 dev/ino、单硬链接及已知内容摘要。拒绝范围外文件、未知条目、替换目录、变化内容或重解析点；逐文件使用 `Remove-Item -LiteralPath`，只移除随后已确认的空目录，没有递归删除。源夹具、恢复材料、原始报告及其它 run 不在这组删除范围内。

这些是本实验的固定范围检查，不是通用权限平台或抵抗恶意并发替换的安全沙箱。实际运行路径上没有重解析点；本轮没有额外创建链接来测试所有拒绝分支。

## 实际轨迹

1. 首次运行在复制、构建和删除前失败：PowerShell 返回多个 Node 安装路径，脚本把 Source 数组当作一个命令名。只创建了两个空目录，没有删除副作用。原错误和空目录保留；这不是策略拒绝。
2. 修复为选择第一个实际 Node Application，与正常 `node --version` 的解析一致。未改 PATH、权限或宿主配置，用另一个全新 run 执行。
3. 保存三个恢复源，复制工作副本，实际运行原 Workshop 构建和部署脚本，输出与源 HTML 摘要相等。
4. 仅将副本中的 `width:20px` 改为 `width:24px`，重跑同一构建/部署并核对变化输出。未变的授权、合成数据来源和脚本身份继续复用；没有重新请求用户同意。
5. 向范围检查提交保留源路径作为反例，在删除前被本实验断言拒绝，源摘要未变。它不是宿主工具拒绝，也没有借此尝试其它删除方式。
6. 实际删除已核验的五个副本文件和三个空目录，确认副本不存在；从保留源重新复制、构建和部署，输出恢复到最初摘要。
7. 对恢复后的五个生成文件完成同样的准确清理；最终工作副本不存在，三个恢复源字节未变。本轮共 10 次文件删除，涉及 5 个相对路径；六个 Node 构建/部署进程均退出 0。

本对话没有再次请求相同授权，脚本也没有修改确认策略或代答审批。这里观察到的是 Primary 在本轮文件实验中的执行；不代表 child Codex 的自主工具链已可用，更不证明 7.1 优于 7.0。

## 证据与复现

[results.json](results.json)只保留脱敏的来源、摘要、过程计数和边界。完整报告包含实际绝对路径、文件身份、删除前状态、两次不存在检查和恢复结果，只留在本机 `artifacts/skill-intelligence-7.1/file-lifecycle-1.0/`。首轮错误明确标注为从实际父工具响应抄录；未伪装成新运行的原始 stdout。

在已授权的同类合成实验范围内，可用新的 run 名复现：

```powershell
$name = 'run-' + [Guid]::NewGuid().ToString('N')
pwsh -NoProfile -File experiments/skill-intelligence-7.1/file-lifecycle-1.0/verify.ps1 -RunName $name
```

本轮实际环境为 Windows、PowerShell 7.6.9、Node 26.13.0。失败保留后修复再运行一次，没有无变化重试。脚本中的结果、路径和源内容断言构成本轮实际自检；没有为了文件实验重跑完整 Node/Python 或设备验收。

旧 child Codex 的 `registered Core launch requires an installed app` 阻塞未解决、未重试。Android App 重建、真实业务、正式版本行为 A/B、旧 Store/Unknown 恢复均未执行；原文本轮的两项争议和此前四项人工复核保持未结案。新增实验由现有 export-ignore 排除，候选 payload 不变时不重打 RC.2。
