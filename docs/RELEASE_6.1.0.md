# DoL Dev Tools 6.1.0 — White Snake

本地Release Candidate说明。尚未推送、创建正式Tag或发布GitHub Release；版本号用于候选验货，不表示已对外发布。

6.1改善现有Skill的研发使用方式与重构行为保持方法，继续使用原有诊断、Action/Journey、GER、Workshop和Evidence。

## 更新内容

- **MSV使用指导更具体**：按当前声明和实际风险选择验证，复用必要输入仍有效的证据，明确停止和缺失必要证明的边界。工具位置在安装与命令环境未变时可以复用；页面、设备和执行现场身份不缓存。
- **按需重构行为对照**：比较状态、回调次数/顺序、异常和部分副作用，区分Preserved、Intentional Change、Regression与Unknown；旧实现不自动是正确规范，普通源码修改无需先建行为模型。见[开发流程](DEVELOPMENT_FLOW.md#重构行为保持按需)。
- **固定Hook生命周期配方**：真实历史源码切片与隔离研究候选展示“最终数值相同但回调多执行一次”，也展示已确认缺陷的有意修复。配方随包提供；第三方源码、Mod包、派生切片及私人原始证据不分发，输入须另行取得并审查。见[案例与许可](../examples/behavior-preservation/README.md)。

没有新增Agent Runtime、独立MSV Skill、Judge或通用行为等价引擎，也不将M4故障缩减与Weather Report预测写成已交付功能。

## 候选使用

候选文件名为 `DoL-Dev-Tools-6.1.0.zip`。核对随附 `SHA256SUMS.txt`、`artifact-manifest.json` 和 `validation.json`，解压到新目录，再按[安装说明](SKILL_INSTALL.md#610-white-snake-候选安装与验货)验证CLI与隔离Skill。公开已发布版本仍为[6.0.0](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/releases/tag/v6.0.0)。

最低Node.js22.12.0；普通诊断无需npm依赖。Gameplay仍按锁文件安装XState5.33.2，最低Node版本使用 `--experimental-sqlite`。保留旧Tools、Skill与Store；升级不迁移数据、不清理或重放历史Unknown。

## 证据与限制

M1的五次真实Codex合成任务通过独立断言；未证明所有任务普遍加速、token节省或总研发成本下降。M3的8组保持、3组有意修复及2个负对照符合预期；另1项Unknown未执行，不计作通过。研究候选不是CE R1修复、正式补丁或完整Mod验收。

本地RC按当前制品核对导出文件、字节、路径、许可、依赖和安装入口，具体结果以随附验货记录为准。未重跑Windows、Android或真实DoL，不将历史设备证据计为本轮通过数。范围、复用依据与剩余限制见[6.1收口](CLOSEOUT_6_1.md)。
