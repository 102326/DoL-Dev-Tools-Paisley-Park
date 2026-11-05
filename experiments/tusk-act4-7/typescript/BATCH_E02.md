# TS First E02 — 安装、Doctor与源码查询入口

2026-11-05。代码`5ebc5d8ea75f17f05498730d9b232220fca7643b`，基线`3a5c33edc4441004e1dfefcfb343bf700dda2575`。新增install-skill、doctor、source-find-cli权威CTS，26Node+3DOM/33产物，完整迁移未结束。

## Delivered

安装器直接消费typed resolver和owned-files；保留预读完整payload、原文件大小/布局限制、owned暂存、独占目录/hardlink、SKILL入口最后发布、未知路径保留和失败恢复语义。Skill与resolver实际文件内容未改，未将resolver成功冒称宿主重新发现。

Source Find CLI从unknown读取查询，按原parseRequest规范进入typed engine；延迟require、原版本门槛、源/请求错误分类、独占输出、发布确认丢失与清理保持。Doctor使用真实utf8 Runner及脱敏输出类型。修复其旧Node22.12检查与当前ACT4包>=26不一致；正式6.1历史不改。新用例先RED后GREEN，在Node26中可恢复地模拟版本属性22/24/25/26，不宣称实际运行这些旧Node进程。独立静态审查未发现新增阻断，未独立跑测试。

## Validated

- `build.cjs --check`26Node+3DOM/33产物一致；`check-types.cjs`41负例；构建5/5。
- `node --test tests/diagnostics.test.cjs tests/install-skill.test.cjs tests/install-skill-failures.test.cjs tests/source-find-cli.test.cjs`32项：31通过、1Windows跳过。包含Mac真实临时FS、安装故障注入/归属/权限、安装后resolver与实际CLI查询。
- `npm test`543项：542通过、0失败、1Windows跳过。
- 源码树祖先之外固定包最低Node26.0.0，`--no-strip-types --experimental-sqlite --test`同四个测试文件31通过/1Windows跳过；无源码树依赖、未启动设备。
- 固定ZIP330文件逐一对应Git blob、CRC及导出集合，SHA-256`df1ffcfdf32db464e2ce07e7edf4f2eac703c4dc1cfd344bc66aef47c882b41c`；[清单](package-e02-manifest.json)、[结果](batch-e02-results.json)。环境与E01相同。

## Not validated / Known limitations

Windows文件占用/硬链接/安装和Android命令真机未验证。Doctor工具Runner均为替身，没有用此测试调用ADB或安装helper。Skill内容/布局未变，可复用此前实际宿主发现证据，但没有宣称此次重新注册/重载当前Codex会话。其他CLI主体、Support、Action/Journey/Evidence及GER和浏览器边界继续迁移。
