# Typed Skill resolver — Mac 验证与 Windows 接续增量

2026-11-05。分支 `experiment/tusk-act4-7`。上一交接提交 `01fe9fd478a770d71bcd63ec4e5cfaa6ebecd5dd`，本轮固定代码提交 **`10082eff5715e26f086d19310f815c22872b9dfe`**。本报告后于代码提交，不是正式Release。

## Delivered

选择主Skill每次首次调用必经的位置解析器作为有界TS接入点；已有Source Find继续采用原TS/CJS路线，没有为迁移比例改写GER或整仓。

- `.agents/skills/dol-dev-tools-paisley-park/scripts/resolve.cts`为权威源，JSON以unknown进入并逐步收窄。有限错误码、阶段、成功对象和环境输入有类型约束。
- 安装/运行继续使用独立生成的`resolve.cjs`，只依赖Node内置模块。安装器仍只复制原四个payload及清单，不复制TS/编译器/loader；成功JSON的六个字段、原导出函数、显式根优先级和旧安装支持保持。
- 拒绝空白版本、畸形/primitive元数据和非普通文件CLI。已知失败输出code/stage/hint，不回显输入、路径或原始异常；不认识的异常保留原因未知，不推断设备故障、不扫描替代目录、不重试动作。
- 复用已有TypeScript6.0.2隔离开发依赖和生成逻辑。Source Find生成内容未变；新增resolver构建入口，CI只增加一个生成一致性检查。生成时在同父目录暂存、验字节，再替换该生成文件；失败保留原CJS。
- 不改Runtime、SQLite schema、Store、Session、预算、fencing、Unknown或原回执合同；不增加普通Debug依赖。

相关生产模块只有上述Skill解析器。开发工具在`experiments/weather-report-20261104/source-finder/`，回归在`tests/skill-resolver.test.cjs`和已有构建测试内。

## Validated

macOS27.0.1 ARM64，Node26.13.0/npm11.20.0；独立包入口另用最低Node26.0.0。无游戏资源、真实Store、设备、SDK或APK。

| 实际检查 | 结果 |
| --- | --- |
| `npm test` | 523项：522通过、0失败、1项Windows专属跳过 |
| `node --test tests/skill-resolver.test.cjs tests/install-skill.test.cjs tests/install-skill-failures.test.cjs tests/source-find.test.cjs tests/source-find-cli.test.cjs` | 43项：42通过、0失败、1项Windows跳过 |
| `node experiments/weather-report-20261104/source-finder/build.cjs --check` | 原Source Find生成字节一致 |
| `node experiments/weather-report-20261104/source-finder/build-resolver.cjs --check` | strict类型与resolver生成字节一致 |
| `node experiments/weather-report-20261104/source-finder/check-types.cjs` | 8个预期TS2322；4个原Source Find、4个resolver错误码/阶段/版本/环境负对照 |
| `node --test experiments/weather-report-20261104/source-finder/test/build.test.cjs` | 3/3；CRLF、漂移拒绝、类型失败、部分写入、旧CJS及未知目录文件保留 |
| 同一合成工具根对照旧/新validateRoot | 01fe9fd接受空版本；新代码明确RESOLVER_METADATA_INVALID / resolve.metadata |
| 固定10082ef ZIP | 321文件，准确导出集合，全部逐一对应固定Git blob；CRC通过 |
| 全新目录、最低Node26.0.0、`--no-strip-types` | help/version、实际安装、独立resolver通过；安装scripts只含resolve.cjs，成功六字段不变 |
| Codex CLI0.166.0-alpha.6独立App Server | 安装前0，forceReload后1，重启后1；repo/enabled，resolver指向独立包，两个宿主退出0 |
| [固定代码GitHub CI](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/actions/runs/41962097547) | success；Linux证据，不能代替Windows |

ZIP SHA-256：`f2704fbdc0b204800ed3b895098f531884aba78bda88d000ec677c4a2f30c38b`。[逐文件manifest](package-manifest.json)与[入口/宿主摘要](validation-results.json)绑定该代码及包，不是后续文档提交的包。

归档验货可复现：

```sh
git archive --format=zip --prefix=Paisley/ --output=NEW_ZIP 10082eff5715e26f086d19310f815c22872b9dfe
python3 experiments/tusk-act4-7/verify-package.py 10082eff5715e26f086d19310f815c22872b9dfe NEW_ZIP NEW_EXTRACT_DIRECTORY
# 使用本机已有Codex；probe只initialize/skills/list，不发起模型任务
node experiments/weather-report-20261104/host-discovery/probe.cjs NEW_ZIP
```

### 失败、审查与修正

- 最初全套测试在受限沙箱得到520通过、2项本地HTTP监听EPERM、1跳过；在获准的正常本机权限下完整重验后522通过、1跳过。没有改产品或断言来规避失败。
- 独立审查发现初版resolver构建会递归清理新增输出目录。已取消该目录，`--check`只读；加未知文件哨兵并跑3项构建回归，复核未发现新的实质阻断。旧Source Find实验dist行为原样保留，没有扩大到resolver。
- 独立包初轮入口检查误把macOS临时目录符号别名当成不同工具根；按产品原有realpath合同修正验货预期，再向新隔离目标安装通过。产品位置解析规则未为此改变。
- 原失败及原始输出留本机ignored artifacts；公开资料只有合成测试、代码、脱敏计数及摘要。

## Not validated / Known limitations

Windows路径/句柄/rename占用、Windows实际安装与宿主发现未验证；Android SDK/APK/设备/WebView与真实DoL/Mod/源码验收继续留Windows。独立App Server发现不证明当前Desktop聊天热重载或自然语言任务必然选路。

类型检查只覆盖所选边界；JSON和文件系统仍需运行时校验。新stderr更具体，依赖原整段错误文本的外部消费者需改用有限代码；成功结构保持兼容。开发构建需隔离编译依赖，普通工具运行不需要它。没有实测Agent普遍提效或运行性能改善。

原Chrome GER/Evidence证据继续见[报告](../ger/REPORT.md)，本轮未修改其生产代码；未因换交接阶段重跑真实Chrome业务，也不冒称这一增量重新验证了它。

## 接续判断

本轮Mac typed resolver实现、目标回归、独立包入口和实际宿主发现达到Scoped Done。下一步按[Windows任务书](../../../docs/HANDOFF_TUSK_ACT4_7_WINDOWS.md)在相同开发包分支接续W0–W5；UI Mod CI不在本对话职责内。7.0正式发布尚未授权，也未声称全部平台验收完成。
