# 候选包内容与验货

发布 ZIP 使用固定提交的 `git archive`，由根目录 `.gitattributes` 的 `export-ignore` 控制文件清单。源码仓库保留所有历史资料；排除清单只影响归档，不删除文件或改写历史。

包内保留 CLI、生产模块、可选 Integration、Probe、Schema、Skill、当前使用文档、许可证、示例和离线回归。旧 Release、废弃设计、内部计划、早期验收和实验说明不进入包；仍有引用时，链接到已经存在的 4.0.1 固定源码提交。历史网页需要联网查看。

`experiments/gold-runtime` 中四个代码文件是现有离线回归的必要资源：`tests/game-goal.test.cjs` 使用 Receiver 检查旧拒绝回执不能结清后续已派发动作，实验测试还调用其 CLI。保留这些夹具以维持原测试入口，不将它们作为第二套正式 Runtime。生产执行仍来自 `scripts/lib/game-runtime.cjs`，实验 README 被排除。

游戏、APK、node_modules、私人 Profile/Store、存档、截图、原始审计材料和临时输出不属于 payload。Component Lab 属于目标 UI 项目，辅助写作 Skills 单独安装，不捆入 Tools。

## 本地验货

保留此前候选的原 ZIP、manifest 和验证记录；新候选使用新目录，不覆盖旧证据。6.0 包保留当前知识入口、专业参考、已审示例和验证脚本；内部执行计划与阶段检查点留在源码仓库，不进入 ZIP。分别检查：

1. 固定源码与导出属性：实际 ZIP 文件集合等于该提交允许导出的集合，文件字节能对应 Git blob。
2. ZIP 路径、敏感文件、许可证、锁文件、摘要及包内文档链接。
3. 在独立于源码依赖的目录解压，验证 help/version、缺依赖拒绝，再按锁文件安装，核对包内 XState。
4. 运行受影响入口测试、隔离 Skill 安装/resolver 与自有 SQLite smoke；先关闭句柄，再清理自有文件。

只整理文档和导出清单时，复用未失效的业务与设备证据；不把此前实机结果计为本轮新通过数。manifest 描述来源和字节，验货结果单独记录，公网发布另按实际授权执行。
