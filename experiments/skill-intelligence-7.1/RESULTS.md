# Windows 首轮结果

本轮跑通了 Windows 的版本化情境评测，没有证明给主 Skill 增加长段落会更好。因此主 Skill 保持原文，具体的隔离接续与产物收口经验补到已存在的 [DEVELOPMENT_FLOW](../../docs/DEVELOPMENT_FLOW.md)。试验长稿以补丁保留供复核，没有热替换现用全局 Skill。

## 实际调用

基线与长稿各一次独立 Codex 调用，每次回答同样的 12 题；另一次新调用的 Judge 只看匿名回答和题面。既有配置为 `gpt-6.1-sol / high`，未修改模型、规则或用户配置；没有独立核验服务端最终解析的模型修订。原始 prompt、Skill 摘要和 JSONL 在本机保留，公开的 [results.json](results.json)仅含脱敏必要字段。

| 检查 | 基线 | 长稿 | 解释 |
| --- | ---: | ---: | --- |
| 初版严格标签匹配 | 9/12 | 8/12 | 原始结果保留，不作为语义正确率。 |
| 修订后的可接受标签匹配 | 12/12 | 12/12 | 同一批回答复算，没有重跑模型；修订发生在看过结果后。 |
| Judge 认为解释受题面支持 | 12/12 | 12/12 | 12 题均判 tie；这是模型评价，不是人工或真机证据。 |
| 情境轮中的实际工具调用 | 0 | 0 | 只完成判断，不能声称实际操作通过。 |

初版四处标签口径过窄：复用后可不再调用工具；“停止沿用旧预览”可以同时继续局部复验；云边界澄清可归为 ownership；停止被拒绝删除时 cleanup 可表示操作类别。修订保留 proceed/clarify/stop 的关键约束，并要求 Judge 阅读解释。相关四题仍列为待人工复核，不把模型 Judge 当成人工裁决，也不把修订后的满分写成版本提升。

原始输出和初版 oracle 没有覆盖。没有为提高分数重试模型。固定顺序、每组一次、同一宿主既有上下文和后验评分修订都限制因果判断；本轮不宣称更快、更聪明或泛化已验证。

## 真实工具探针：Blocked

另一次有界调用请求使用现有 source-find 查询本工具固定提交的 `validLimit`，只允许读取源码和写本轮自有输出，没有游戏输入或设备操作。

实际只尝试一次前置命令：

```text
node <PROJECT>/.agents/skills/dol-dev-tools-paisley-park/scripts/resolve.cjs
```

子进程的 unified exec 启动返回原错误：

```text
Rejected("Failed to create unified exec process: registered Core launch requires an installed app")
```

JSONL 记录该命令 `status=failed`、`exit_code=-1`；模型对话随后正常结束，不等于操作成功。resolver 进程未启动，source-find 未执行，result.json 未创建。探针状态为 Blocked；未换宿主、工具、权限或安全设置重试。这里能确认的是子 Codex 的进程启动接缝，不能据此认定源码查询本身、Windows ACL 或业务合同有问题。该阻塞只限制这条实工具验收，不阻断独立离线工作。

四次调用都报告同一个未识别的 computer-use 配置项被忽略，统计保留每次两条提示，未修改配置。情境判断没有 computer-use 调用；不能把这个提示等同于上述进程启动失败的根因。未知错误项、工具失败、文件改动及明显 oracle 读取会使轨迹不具备比较资格；正常 turn.completed 本身不足以认证成功。

## 本轮改动与验证

- 新增 12 题版本化语料、两个固定评分版本、响应/Judge schema、评分器负例与 CI 离线入口；不在 CI 调用模型。
- 修正轨迹检查，区分对话完成、工具失败和已记录的非致命配置提示，避免把“CLI 返回 0”当作工具成功。
- 主 Skill 没有采用长稿；按用户反馈在既有 Recipe 中澄清授权连续性和产物责任。该 Recipe 的实际 Agent 行为没有单独完成 A/B。
- Skill 自带验证器在 Windows 默认 GBK 下曾解码失败；使用当前命令的 `python -X utf8` 后通过，没有改系统编码或权限。
- 最终评分器 5 项测试全通过；实际 A/B/Judge 输出 schema、文档链接和 Skill 验证器检查通过。安装器与最终主 Skill 内容未变，复用已有安装/解析与 7.1 候选验货，不计成本轮新通过数。

未执行正式游戏、存档、Android/WebView、删除或旧 GER 恢复。未取得或采用 Mac 成果；按新授权 Windows 独立推进。没有创建新的工具平台，也没有公开发布。
