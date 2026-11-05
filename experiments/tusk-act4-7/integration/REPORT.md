# Chrome optional Integration — Mac 接线与文档连续性验证

2026-11-05。分支`experiment/tusk-act4-7`，基线`6a6fb273e619fe5dc6d99713482b9927f1ea5f8f`，固定代码 **`bd3f1b61798552953c27ec0066280169c3f61da3`**。本报告与包清单后于该代码提交；不是正式发布。

## Delivered

标准Evidence原`--integration`/`--integration-file`入口现在可在`--host chrome --host-file ...`下执行已审查的Contract 1本地模块。原先该路径一律unsupported。

- `scripts/lib/integration-worker.cjs`复用已有ChromeHost，固定原Profile、browser、target、frame、loader、完整URL、uniqueContext。没有新浏览器引擎、代理协议或Runtime；Worker另开自己的CDP连接，但不能建立新的文档合同。
- `scripts/lib/integration.cjs`在启动worker前、接收结果后均检查主Evidence连接；保留主连接已经记录的失效事件。单个不超过10秒的总timer包含这两个检查，迟到前检查不启动worker，worker退出不绕过未完成的后检查。
- `scripts/lib/evidence.cjs`移除Chrome无条件unsupported分支，复用现有optional结果处理。失效身份返回`integration-document-failed`，不保存混代成功正文；已成功Generic采集保留。
- 16次evaluate、32KiB表达式、64KiB结果、原脱敏和JSON-only制品、异常正文省略、可选失败语义保持。接口不接管动作，不建GER Goal，不重试求值或结清Unknown。
- Android及历史未绑定Contract 1保留原临时连接、target选择和顺序采样语义；原GER/Store/预算/fencing/回执没有改动。使用者不需要新增依赖、编译器或loader。

生产说明同步至`docs/INTEGRATIONS.md`、`PC_RUNTIME.md`、`EVIDENCE_TOOLS.md`；Windows任务书增加本轮入口与验收事项。

## Validated

macOS27.0.1 ARM64，Chrome156.0.8078.73，源码运行Node26.13.0/npm11.20.0；独立包另用最低Node26.0.0。所有HTML、模块和状态均为自有中性夹具，无DoL/Mod源码、成人资源、存档、设备或SDK。

| 实际检查 | 结果 |
| --- | --- |
| `npm test`最终状态 | 526项：525通过、0失败、1项Windows句柄测试跳过 |
| Integration/Evidence定向回归 | 25条均通过，包含在最终全套中；覆盖缺文档、已失效父连接、前/后检查挂起、迟到检查、原有加载/超时/脱敏与可选失败 |
| 源码真实Chrome夹具 | 10/10，Node26.13.0；本轮实例与控制服务退出确认 |
| 独立包真实Chrome夹具 | 同10/10，最低Node26.0.0；PAISLEY_TOOL_ROOT明确指向解压包 |
| 原5.1文档归属Chrome夹具 | 3/3：稳定同代、导航异代、同URL刷新异代；证明历史未绑定合同保持，不是Android实机证据 |
| 固定bd3f1b6归档 | 321文件，CRC通过，准确导出集合，逐文件字节对应固定Git blob |
| 全新目录入口 | 最低Node26.0.0并显式`--no-strip-types`，help/version/install-skill/installed resolver均通过；安装scripts仍只有resolve.cjs |
| [固定代码GitHub CI](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/actions/runs/41963804264) | success；Linux证据，不替代Windows/设备 |

真实Chrome的10项断言：

1. 正式Evidence CLI经worker采集原文档，detect/collect代次一致。
2. 同URL干扰页不替代明确目标。
3. describe阶段触发hash往返，worker连接时当前字段虽相同，主连接失效仍拒绝结果。
4. detect→collect发生hash变化，拒绝混合正文，保留Generic。
5. 同URL刷新改变loader/context，拒绝混合正文，保留Generic。
6. 显式重新绑定后，新的采集可以成功。
7. redact期间文档变化，结果不能作为成功发布。
8. 模块缺失安全失败，Generic制品保持。
9. 页面只读Promise挂起后有界失败；本地计数确认模块collect只调用一次。
10. 原目标关闭后，即使同URL干扰页仍在，也安全失败且不接替代页。

复现命令（新输出目录，串行运行；Chrome夹具固定18776并使用动态回环控制端口）：

```sh
node --test tests/integration.test.cjs tests/evidence.test.cjs
node experiments/tusk-act4-7/integration/verify.cjs ABS_INSTALLED_CHROME NEW_OUTPUT
PAISLEY_TOOL_ROOT=ABS_EXTRACTED_TOOLKIT node experiments/tusk-act4-7/integration/verify.cjs ABS_INSTALLED_CHROME NEW_OUTPUT
DOL_TEST_CHROME=ABS_INSTALLED_CHROME node tests/integration-document.browser.cjs
```

固定包ZIP SHA-256：`ae2607227eb27d1b04bde9e31973a93655c4ab14cb3a586ba7c5e20c1a1d089d`。[逐文件清单](package-manifest.json)、[脱敏摘要](validation-results.json)。独立解压包不需要源码树node_modules；本轮未改变Skill内容，宿主发现复用[typed resolver报告](../typed-skill/REPORT.md)对应文件的有效证据，没有冒称重验当前Desktop会话。

## 复现、审查与修正

首次回归确认旧实现忽略Chrome原文档要求；真实Chrome入口也因unsupported而未达成功断言，均保存RED记录。接线后初版8项通过，但独立审查指出新worker无法看到连接前的hash往返。补充确定性交错后再次RED：结果仍available。修复主连接前后检查后GREEN；再补父检查超时、迟到不启动、worker退出不抢先发布和关闭原页用例。最终复核未发现剩余实质阻断。

原始Profile、截图、日志、绑定文件及失败现场都保留ignored artifacts，不上传。公开记录只有合成脚本、计数、摘要与文件清单。没有清理历史业务数据、降低断言或把重复操作用于恢复。

## Not validated / Known limitations

- Windows Chrome、Windows worker/句柄/进程退出，Android设备/WebView，真实DoL/Mod及其桥的detect/collect未验证。入口可执行不证明某个第三方API可用。
- worker不是安全沙箱；模块仍有Node权限，只接受已审查本地代码。终止worker不取消已提交的页面求值，不回滚副作用；本接口只用于只读诊断。
- 同一文档身份不等于原子快照，也不证明业务状态不变。Chrome结果属于manifest.target，历史Android结果仍有原顺序观察边界，不能倒推出旧结果同代。
- 导航与CDP拒绝/关闭可能竞争，错误可能按实际detect/collect阶段报告。已知绑定失败有document分类，未知传输错误不被猜测为导航；所有失败都不发布成功正文。
- 10秒保证本地流程恢复；前/后检查或远端请求可能仍有迟到响应。结果不因此成为成功，也不会重放。没有设备代理、性能提速或所有平台发布就绪声明。

## 接续判断

本轮Chrome optional Integration的Mac接线、身份/恢复边界、最低Node独立包达到Scoped Done。Windows仍按[更新任务书](../../../docs/HANDOFF_TUSK_ACT4_7_WINDOWS.md)处理真实环境及游戏验收；本轮关闭的是明确的Chrome实现缺口，不是7.0正式发行验收。
