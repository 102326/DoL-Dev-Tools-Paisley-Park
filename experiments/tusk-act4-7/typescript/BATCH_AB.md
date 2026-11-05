# TS First A+B — 构建正式化与叶子契约

2026-11-05。代码提交`0196e86989facae13e765dc3bff58046b53502a7`，开工基线`18544c8d1cb2a751130bf023cfc37b531ed6b722`，分支`experiment/tusk-act4-7`。A+B本机Scoped Done；完整95个Node核心入口迁移尚未完成，是7.0发布门槛。开发包P2，UI4.2为P1。

## Delivered

- `tools/typescript`成为正式隔离开发包，沿用TypeScript6.0.2、Node类型25.9.5和原lock依赖版本，根运行依赖仍只有XState5.33.2。实验线最低Node26.0.0、已发布6.1.0最低22.12.0均不改。
- 完整Program一次检查/发射4个CTS模块，检查5个产物；默认check不写文件、不清目录。已知输出先全部暂存并验证，再按协作构建锁发布；保留权限、处理部分写入和后续发布失败回滚，未知修改保留备份。不是任意外部编辑的原子CAS，也不是断电事务。
- diagnostics和runtime-target迁移为CTS，使用标准CJS export=保持原导出属性集合。未知输入仍走原运行校验，Android没有新增host字段，目标key不变。原可选选择器透传行为保持unknown，不借迁移偷偷改变接受范围。
- source-find.cts是单一权威源，CJS仅修改生成头，函数实现字节未改；MTS成为生成的native比较视图。resolver生成字节完全未改。旧实验命令转接正式构建，不再递归清dist。
- 编译器配置不启用erasableSyntaxOnly，因为标准CJS export=需要编译；运行时不引入TS loader。CI改用正式隔离包和完整Program检查。源码、开发包、生成MTS比较视图及内部计划从运行ZIP排除。

## Validated

实际macOS27.0.1 ARM64、Node26.13.0/npm11.20.0、Chrome156.0.8078.73；独立包使用最低Node26.0.0。合成内容，无游戏/Mod源码、成人资源、设备、SDK或正式Store。

| 检查 | 结果 |
| --- | --- |
| `npm test` | 527项：526通过、0失败、1项Windows句柄行为跳过 |
| CLI/Chrome目标/Source Find/resolver定向 | 44/44通过，随后加入固定目标键和CJS导出回归并包含在全套 |
| `node tools/typescript/build.cjs --check` | 4个strict Node模块、5个产物一致；新增类型源未生成时先报告drift且不修改旧CJS |
| `node tools/typescript/check-types.cjs` | CJS消费路径能解析权威类型；14个预期TS2322负对照均被拒绝 |
| `node --test tools/typescript/test/build.test.cjs` | 4/4；CRLF、漂移、类型失败、部分暂存写、后续rename失败、权限保留、已观察peer与备份、协作锁 |
| 旧构建命令 | build与build-resolver转接成功；native MTS比较5查询/非法输入/取消通过 |
| 固定旧CJS对照 | 16组目标/错误/key、9组诊断输出一致；CJS Reflect.ownKeys一致 |
| 最低Node26.0.0且禁用类型剥离 | 独立包help/version/install-skill/resolver、成功source-find及脱敏拒绝通过；正式开发构建check也通过 |
| 最低Node26.0.0独立包真实Chrome | 原10项Integration/文档身份/Generic保留场景全部通过；退出确认 |
| 固定ZIP | 320文件，CRC、准确导出集合、每文件对应Git blob；不含CTS/MTS权威或比较源、开发构建包 |

包SHA-256：`e2fe8ae75aab901799f258aced38df245913beaaca46d5418943b1c523b93a13`。[逐文件manifest](package-ab-manifest.json)、[脱敏结果](batch-ab-results.json)。此身份属于代码0196e86，不适用于后续报告或迁移提交重建包。

## 审查、失败与修正

离线安装缺少undici-types缓存，按原锁文件在项目隔离目录完成安装，未升级npm或修改全局配置。初次类型检查发现旧配置与CJS发射的差异，最终使用标准CJS编译；Source Find实现产物与旧版本除生成头外相同。

独立审查发现0600暂存权限会带到CJS、以及检查后rename无法提供外部编辑原子保护。已保留原mode（含回滚），增加本工具多进程互斥锁与边界说明。新回归实际覆盖0755/0640的Mac行为、后续发布失败和已观察peer改动；复核未发现剩余阻断。任意外部编辑仍可在检查和rename间竞态，使用者须避免生成时手改产物，不能将锁误当文件系统CAS。

## Not validated / Known limitations

Windows文件占用/rename/权限、Android设备/WebView与真实游戏仍未验证；不把Mac模式位证明套到Windows。第一批没有改业务注入代码、GER、SQLite schema、预算或回执合同，也未重跑原13场景GER浏览器脚本；现有相关单元/SQLite回归包含在全套中。

Skill文件和安装payload未变，复用此前有效宿主发现证据；本轮独立安装/resolver通过不冒称当前Desktop聊天热重载。只有4个模块的strict类型检查，不是全仓strict；Node类型声明版本不证明所有Node26 API可用。

## 后续

继续[完成清单](PROGRESS.md)中的C–G，先处理CDP边界；不能将A+B局部通过当成7.0整体完成。原始实验数据、临时锁/备份、Profile与日志留本地，不上传，不清理私人维护草稿。正式版本、main、Tag、Release不在本批范围。
