# Paisley Park 5.1 实施记录与计划

目标：维护现有 5.0 能力，校正文档/入口/错误、改善安装失败后态、核对 Integration 文档身份并独立验包。禁止真实游戏/旧 Store、Unknown 清理、全局覆盖及远端发布；不接入 Star Platinum/White Snake。

基线：5.0.0 `607d2807d8735233e986d048849d8b14b23c4f22`。开发起点为远端 main `99affae8c6545b5ed8cf0493db687c18c33ab813`，仅增加 README 改善。原研究分支干净并保留；独立 worktree 分支 `maintenance/paisley-park-5.1`。

初始核对：P1 的无进展/seconds/SQLite/宿主发现表述仍有漂移；P2 主 Skill 仍混合任务细则；P3 仅三个已知错误映射；P4 最终目录先创建、后续文件失败会残留；P5 Worker 普通 evaluate 没有执行层文档绑定；P6 需按改动后新提交验包。不是所有观察都已构成 Bug。

1. **P1 + P3**：以 parser/runtime 为准，修 Help、当前示例及安装消息；在现有 cli-errors/install-skill 测试补固定错误阶段/字段/建议和隐私检查；在受控 evidence 边界验证 seconds。提交独立记录，不改业务执行语义。
2. **P2**：逐段映射 Skill 规则到任务与权威文档，主入口保留身份/权限/证据/Unknown；同样六个代表提示检查前后路由，不用样本宣称通用成功率。
3. **P4**：先复现缺后置文件/写入失败后态，对比完整预检与暂存发布；据文件系统真实语义选择方案。覆盖已存在、竞争、权限、重试、自己资源清理，不宣传跨平台原子保证。
4. **P5**：自建 loopback Chrome 在 detect/collect 间导航，核对当前消费者和输出语义；只对真实身份缺陷局部修复，Generic 不受可选失败影响。不修改 Android 强绑定，除非证据确实要求。
5. **P6**：按现有 git archive/export-ignore，固定本地源码提交、版本/锁/白名单、ZIP/hash；独立解压、依赖拒绝、安装/resolver、CLI/临时 SQLite、链接锚点。真实宿主发现与 resolver 分开验收；Windows/Android 缺口单列，不伪造通过。

Mac：2026-10-15 实测 macOS 27.0.1 ARM64 / Node24.18.0 / npm11.16.0 / Git2.54.0 / Chrome155.0.8059.41。适用测试按实际改动选择；Node22.12、Windows 文件占用及真实宿主发现的可执行性仍待核实。必要发布验证未完成时明确报告，不偷偷将承诺改为可选。
