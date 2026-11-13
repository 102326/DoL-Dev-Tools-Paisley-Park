# 候选包内容与验货

发布 ZIP 使用固定提交的 `git archive`，由根目录 `.gitattributes` 的 `export-ignore` 控制文件清单。源码仓库保留所有历史资料；排除清单只影响归档，不删除文件或改写历史。

Windows 的系统 Git 可能配置 `core.autocrlf=true`，导致归档文本与 Git blob 字节不同。为保持固定提交的字节，不修改全局配置，归档命令显式使用 `git -c core.autocrlf=false -c core.eol=lf archive --format=zip --prefix=DoL-Dev-Tools-VERSION/ --output=NEW_ZIP FULL_COMMIT`，替换占位符并使用尚不存在的输出。仍须逐文件核对，不能把“仅换行不同”当作字节验货通过。

包内保留 CLI、生产模块、可选 Integration、Probe、Schema、Skill、当前使用文档、许可证、示例和离线回归。旧 Release、废弃设计、内部计划、早期验收和实验说明不进入包；仍有引用时，链接到已经存在的 4.0.1 固定源码提交。历史网页需要联网查看。

7.1 候选进一步排除数字版本的历史发布公告与 5.0 RC 收口材料；当前说明中的相应引用指向已经公开的固定主线提交。仍有效的兼容说明和必要测试夹具继续保留。本地候选以实际 package 版本命名，附源码提交、逐文件清单、SHA-256 和单独的验货结果，不自动替换现用全局 Skill。

7.2 沿用 RC.2 按实际用途划定的文件边界：移出早期交付进展、冗余收口与首轮 Lab 接续流水，引用改为固定历史源码；保留 4.0 兼容约束、7.0 验证基线、5.1/6.1 平台证据、经验导航和当前功能指南，并在页首标明适用范围。旧版本文档不等于旧 Skill，Skill 数量和身份按实际 ZIP 与安装清单检查。具体分类留在源码交接记录，不把审查过程放进运行包。

正式 Release 只附工具 ZIP、SHA256SUMS.txt 和 artifact-manifest.json；manifest 内含固定来源、ZIP 摘要及逐文件清单。原始验证日志、validation.json、源码交接及实验资料只留维护记录，不作用户下载附件。GitHub 自动生成的源码压缩包不替代命名的正式 ZIP。

`experiments/gold-runtime` 中四个代码文件是现有离线回归的必要资源：`tests/game-goal.test.cjs` 使用 Receiver 检查旧拒绝回执不能结清后续已派发动作，实验测试还调用其 CLI。保留这些夹具以维持原测试入口，不将它们作为第二套正式 Runtime。生产执行仍来自 `scripts/lib/game-runtime.cjs`，实验 README 被排除。

游戏、APK、node_modules、私人 Profile/Store、存档、截图、原始审计材料和临时输出不属于 payload。Component Lab 属于目标 UI 项目，辅助写作 Skills 单独安装，不捆入 Tools。

## 本地验货

保留此前候选的原 ZIP、manifest 和验证记录；新候选使用新目录，不覆盖旧证据。7.0 包保留当前知识入口、专业参考、已审示例和验证脚本；内部执行计划与阶段检查点（含WHITE_SNAKE_6_1）留在源码仓库，不进入ZIP。M3行为保持配方随包保留以供按需复现，固定第三方源码、派生切片及原始输出不分发；输入须用户另行取得并审查，见配方README。分别检查：

1. 固定源码与导出属性：实际 ZIP 文件集合等于该提交允许导出的集合，文件字节能对应 Git blob。
2. ZIP 路径、敏感文件、许可证、锁文件、摘要及包内文档链接。
3. 在独立于源码依赖的目录解压，验证 help/version、缺依赖拒绝，再按锁文件安装，核对包内 XState。
4. 运行受影响入口测试、隔离 Skill 安装/resolver 与自有 SQLite smoke；先关闭句柄，再清理自有文件。

只整理文档和导出清单时，复用未失效的业务与设备证据；不把此前实机结果计为本轮新通过数。manifest 描述来源和字节，验货结果单独记录，公网发布另按实际授权执行。

## 发布执行必须失败即停止

PowerShell 的 `$ErrorActionPreference` 不能单独替代原生命令退出码检查。Python 断言、Node 测试或 Git/GitHub CLI 退出非零后，未显式检查的组合脚本仍可能执行下一条命令。每次原生命令返回后，立即保存并核对 `$LASTEXITCODE`；不能等另一个原生命令覆盖它。

```powershell
# 示意：替换为已经审查的检查入口与固定输入。
& python -X utf8 REVIEWED_AUDIT.py FULL_COMMIT NEW_CANDIDATE
$checkExit = $LASTEXITCODE
if ($checkExit -ne 0) { throw "Candidate audit failed: $checkExit" }
# 此处还须验证实际结果中的状态、源码提交及 ZIP 摘要。
# 退出 0、结果文件存在或旧的 passed 标记都不能单独授权发布。
```

验货和远端写操作分开执行，不能在未经核实的检查后顺序拼上发布命令：

1. 固定最终候选，核对实际 ZIP、隐私、清单、来源和安装；失败就保留候选及原错误，不推送后续发布阶段。
2. 验证所需 CI 已完成且 success，head SHA 与该候选来源完全一致；未知、排队中或失败都不进入发布写操作。
3. 只执行已授权的 main 合并、Tag、Release 和明确资产上传。逐项检查退出码及真实状态；前一步失败不执行依赖步骤。
4. 发布后读回 Release/Tag/main 和资产字节。若一部分已完成，先核实实际状态，只补缺失部分，不重复创建、覆盖旧版或重写公开历史。

更改源码或候选输入后，旧成功结果不能冒充新候选结果。文档之外的运行逻辑未变时可明确复用有效测试，但最终包内容、摘要及所需 CI 必须对应最终来源。后续规范补丁也不能悄悄移动已发布 Tag 或替换已验货资产。
