# DoL Dev Tools — Skill 安装与升级

Tools保存采集器、CLI和格式；Skill选择诊断/复现/开发路径，调用同一份Tools与目标项目自己的构建部署命令。仓库内Skill可直接使用，也可装入本机Codex Skill目录，不复制Runtime或第三方项目。

当前版本为 **7.2.0**，状态见[当前版本说明](CURRENT_STATUS.md)。从 [7.2.0 Release](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/releases/tag/v7.2.0) 下载 `DoL-Dev-Tools-7.2.0.zip`，核对 SHA-256 后解压到新的稳定目录。在包根运行 `DoL-Dev.cmd --version`，应返回 `7.2.0`；安装后的 resolver 也应指向这份包。Android CLI、官方 Android Skills 与本项目 Skill 分别维护，见[工具链指南](TOOLCHAIN.md)。

```powershell
node scripts/dol-dev.cjs install-skill --out C:/Users/YOUR_USER/.codex/skills/dol-dev-tools-paisley-park
node C:/Users/YOUR_USER/.codex/skills/dol-dev-tools-paisley-park/scripts/resolve.cjs
```

安装目标必须是尚不存在的`dol-dev-tools-paisley-park`目录。已有安装会拒绝覆盖；本命令不下载、删除或自动更新。安装内容为SKILL.md、位置解析器、显示名元数据agents/openai.yaml和本地tool-location.json；说明链接指向同一份Tools文档。工具包本体需要留在原位置；源码包不包含机器专属位置记录。

## 从旧版升级

保留旧 Tools 和原有 Store/执行记录。将旧 Skill 备份到宿主不会扫描的位置，使原安装目标为空，再从 7.2 包运行上方安装命令。安装器不会覆盖、删除或迁移旧安装；本次发布也不自动替换本机全局 Skill。

不要只改旧 resolver 的 tool-location.json 来升级。部分旧 resolver 不识别新的英文显示名；使用 7.2 的完整安装器生成 Skill、resolver 和位置记录，再确认解析版本为 7.2.0、root 为新包目录。旧名称、Skill 标识及 Paisley-Park.cmd 仍兼容，名称变化不要求更换账本。

Windows 也可用 `node scripts/dol-dev.cjs`；macOS/Linux 使用同一入口，但本轮没有新增这些平台的安装实测。宿主发现新 Skill 后再开始新任务；保留旧 Tools/Skill 可供选择回退。已有 Store 的数据兼容条件见本页后文，不能用降级写入试探恢复。

解析器核对绝对路径、包名、版本、真实CLI位置和基础文档；这是位置检查，不证明代码可信。先检查来源，再执行。安装成功只证明文件已写入；宿主何时重新扫描取决于实际 Agent 环境。按宿主支持的方法刷新或开启新会话，确认其可发现 Skill 并调用正确版本。当前回合显式读取或 resolver 成功不能冒充宿主自动发现验收。

<a id="resolver-maintenance"></a>

## 当前 resolver 诊断与维护

7.0 的 resolver 成功 JSON 字段保持不变。失败退出1，stderr提供固定代码、阶段及处理建议，不回显输入路径或原始异常：

| 代码 | 阶段 | 处理方向 |
| --- | --- | --- |
| RESOLVER_INSTALLATION_INVALID | resolve.installation | 核对四个安装文件和清单；保留原目录，向新的未使用目标完整安装。 |
| RESOLVER_LOCATION_INVALID | resolve.location | 核对位置记录，或显式指定已检查的绝对Tools根；不会扫描其它目录。 |
| RESOLVER_ROOT_INVALID | resolve.root | 改用明确的绝对路径。 |
| RESOLVER_ROOT_UNAVAILABLE | resolve.root | 核对所选目录、基础文档与读取权限；未自动回退或下载。 |
| RESOLVER_METADATA_INVALID | resolve.metadata | 核对package.json身份、显示名和非空版本。 |
| RESOLVER_ENTRY_INVALID | resolve.entry | 核对根内真实CLI普通文件，不能重定向到其它位置。 |

无法准确识别的异常仍报告原因未知，不猜测根因。显式环境覆盖优先于位置记录，但不会绕过其它安装文件的完整性检查；成功路径按原合同返回工具根目录。

维护者在源码仓库编辑 `scripts/resolve.cts`（Skill目录下），使用隔离开发包生成 `resolve.cjs`；权威TS与开发工具不随运行包分发；使用者和已安装Skill只运行预生成CJS，不需要TS编译器或loader。源码工作区的检查命令：

```sh
npm ci --prefix tools/typescript --ignore-scripts --no-audit --no-fund
node tools/typescript/build.cjs --check
# 修改权威TS后才生成，并审查对应CJS差异
node tools/typescript/build.cjs --write-production
```

开发检查使用锁定TypeScript6.0.2；`--check`不改写resolver或清理目录。当前完整Program检查98个Node文件（含3个开发工具）与独立17个DOM文件，CJS入口及导出保持兼容。生成使用协作构建锁、权限保留与多文件失败回滚；外部编辑不受原子CAS保护，不在生成时手改产物。生成失败保留现场，不把部分输出当成成功安装。旧实验命令仍转接正式构建。完整实验与跨平台边界见[Windows接续任务书](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/blob/experiment/tusk-act4-7/docs/HANDOFF_TUSK_ACT4_7_WINDOWS.md)。这不是已发布6.1.0包的行为追认。

## 运行前提

7.2 工具包与维护源码最低 Node.js 26.0.0，Windows 本轮使用26.13.0；已发布6.1.0工具包保持原Node22.12.0要求，不能用新分支要求改写旧包验收。普通诊断、help/version、Skill 安装和 resolver 不需要 XState/SQLite。Gameplay 另需在实际 Tools 根目录执行 `npm ci --ignore-scripts --no-audit --no-fund`，安装锁定 XState 5.33.2。Node26提供内置SQLite；直接运行Gameplay CLI的现有示例仍使用 `node --experimental-sqlite scripts/dol-dev.cjs ...`，两个Windows launcher也保留该参数，不需修改系统配置。最低版本声明不是新的设备授权、Store迁移或自动环境安装。

缺依赖拒绝不表示设备故障。只使用自有临时库做环境 smoke，不打开旧 Store 来测试是否加载成功。

可选Python入口使用已选解释器，不覆盖系统Python。Doctor、Visual Diff、Perfetto辅助调用及CE定向验证支持当前进程的 `DOL_PYTHON`；需要时设为已有受支持解释器的绝对路径。未设置时各入口沿用原命令名（CE验证在非Windows为python3，其它入口为python）。系统/登录shell、GUI宿主及CLI子进程的PATH可能不同；虚拟环境或PATH选择需在实际进程核对，resolver成功只证明Tools位置。显式解释器失效应修正原配置，不把回退到另一版本当作修复。直接执行Python脚本时使用所选解释器；这些配置不是新的运行时管理器，也未提高Tools最低Node版本。

## 安装失败与重试

5.1 采用隔离暂存而非直接逐文件暴露入口。先完整读取必要源文件，再在目标同一父目录的本轮独占 `.dol-dev-tools-install-*` 中写入并核对字节；暂存文件不叫 SKILL.md，不供宿主发现。最终目标用 exclusive mkdir 创建（已有空目录、文件、坏链接或并发创建都拒绝），逐文件使用同文件系统的 exclusive hard link 发布，**SKILL.md 最后出现**。不用可替换 POSIX 空目录的 rename 来冒充“不覆盖”保证。

新安装包含 install-manifest.json。resolver 验证四个必要文件的存在与摘要，拒绝不完整安装；显式 Tools 环境覆盖只允许绕过过期 tool-location 内容摘要，不跳过其它完整性检查。旧安装/源码目录没有该清单时仍按原位置合同解析，不自动迁移。清单证明本地完整性，不是来源签名。需要实际支持文件 hard link 的本地文件系统；不支持时安全失败，不降级为可见的半写入口。

| 固定错误 | 可执行的处理 |
|---|---|
| SKILL_TARGET_EXISTS | 原目标保持不变。完整、残缺及来历不明目录都不能直接覆盖；保留它，选择另一个父目录下尚不存在的同名目标。 |
| SKILL_SOURCE_INCOMPLETE | 必要源文件缺失/不可读/超限，尚未发布安装；重新核对完整的可信 Tools 包，不能只补一份猜测的 YAML/脚本。 |
| SKILL_INSTALL_FAILED | 本轮可确认归属的临时文件已撤销；检查父目录权限及文件系统 hard link 支持后，可重试同一个未使用路径。 |
| SKILL_INSTALL_INCOMPLETE | 部分路径无法安全清理，保留现场，使用不同父目录的未使用目标重试。不能根据目录前缀自动删除残留。 |

撤销依据已记录的 inode 与预期字节，只处理检查时仍符合记录的本轮文件及空目录；检查发现身份或内容变化、资源归属不明确时保留残留，不递归删除未知目录。这些检查与 unlink/rmdir 不是同一原子操作，不能保证对其它进程在检查后持续替换或修改路径的原子保护。暂存目录创建成功但首次身份记录失败时，目录保留并返回 SKILL_INSTALL_INCOMPLETE，不在缺少归属依据时补做删除。父目录可能保留。安装完成但暂存清理无法确认时报告明确警告，不谎称临时资源已全部撤销。

这不是整个目录事务或断电保证。进程在入口发布前退出时，可能留下隐藏暂存及没有 SKILL.md 的最终目录，下一次安装会拒绝覆盖；resolver 拒绝其不完整清单。入口发布后退出时，安装可能已经完整但命令没有返回成功，先独立核验，不盲目重装。Mac 已测写入/权限/竞争/实际子进程中断；[Windows 补验](WINDOWS_5_1.md)已覆盖 NTFS 中文/空格路径、hard link、真实文件占用、竞争、失败及实际子进程中断，不外推其它文件系统。

<a id="gold-experience-install"></a>

## 历史安装参考

旧版安装实测保留在 [7.0 固定源码](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/blob/8c5628fc2bd93cf6116e5cef3fe597315a2525f1/docs/SKILL_INSTALL.md)；需要旧包时使用对应 Release。Windows 的 NTFS/hard link、失败回滚及文件占用依据见 [5.1 平台参考](WINDOWS_5_1.md)，6.1 的边界见 [平台参考](WINDOWS_6_1.md)。这些旧版本命令和次数不是当前安装步骤。

## 解压包的依赖隔离检查

只在验证独立安装或缺依赖拒绝时使用。Node 会向祖先目录寻找依赖；解压包自身没有 `node_modules`，仍可能借到源码工作树的 XState。先用解压包 `package.json` 建立 `createRequire` 并检查实际 `resolve('xstate')`，记录执行进程的环境和解析位置；GUI/CLI 版本可运行不能替代这一检查。

缺依赖试验应在确认没有祖先 XState 的独立目录执行，保留原失败和解析结果。正常安装按原锁文件进行，再核对依赖解析到候选包自己的目录。使用自有 smoke Store，成功或失败都先关闭句柄，再删除本轮拥有的文件；不改全局依赖、旧 Store 或原安装。

5.0 RC.1 验货实际遇到这一问题：初次解压借到源码树依赖，改用独立目录后真正缺依赖的拒绝成立，安装后自有 Runtime smoke 通过。这是验货条件修正，不要求每个诊断任务额外测缺依赖，也未改 Runtime。关联与限制见 [C 后续记录](PAISLEY_PARK_5_0_C_FOLLOWUP.md)。

## 历史：4.0.1 安装与升级

正式产品名为 DoL Dev Tools，版本代号 Bites the Dust。CLI 文件名和 Skill 标识仍使用原名称，已有入口继续有效。正式 ZIP 见 [4.0.1 Release](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/releases/tag/v4.0.1)；历史 3.0.3 下载不是 4.0。

1. 将 `DoL-Dev-Tools-4.0.1.zip` 解压到新的长期保留目录，核对发布时随附的 SHA-256。
2. 在该 Tools 根目录运行 `.\DoL-Dev.cmd --version` 和 `.\DoL-Dev.cmd --help`，确认 `--version` 返回 `4.0.1`，`--help` 首行显示 `DoL Dev Tools 4.0.1 — Bites the Dust` 及用途说明。Node.js 要求 22.12+。
3. 仅使用普通诊断时无需 npm 依赖。使用 Gameplay 时，在同一 Tools 根目录运行 `npm ci --ignore-scripts --no-audit --no-fund`，按锁文件安装 XState 5.33.2。缺少依赖时 Gameplay 会在启动阶段明确拒绝，不会静默使用另一份 Runtime。
4. 完整备份旧 Skill 并将其移出原路径，保留旧 Tools；首次安装则直接使用空目标。按下面命令安装，再检查 resolver 指向新的 Tools 根目录与 4.0.1。安装器拒绝覆盖已有目录。

```powershell
.\DoL-Dev.cmd install-skill --out "$env:USERPROFILE/.codex/skills/dol-dev-tools-paisley-park"
node "$env:USERPROFILE/.codex/skills/dol-dev-tools-paisley-park/scripts/resolve.cjs"
```

更新前保留旧 Tools 与 Skill 副本，安装后核对 resolver。依赖命令仅影响所选 Tools 目录，不全局安装工具。Android 现场另需已有 ADB、USB 调试及支持调试的目标 WebView；详见 [连接说明](DIAGNOSTICS.md#快速入口)。

升级不迁移旧私有 journal、不清空共享执行记录，也不自动结清结果未知的动作。使用 4.0 原生数据重建功能前，对 SQLite 执行记录做一致备份；一旦升级为 schema 3，3.0.3 不得继续写入同一 Store，也不得用它恢复 4.0 的新 Session。直接复制正在写入的 SQLite 主文件可能遗漏 WAL 数据，不能当成一致备份；可在所有写入者关闭后保留数据库及相关文件，或使用 SQLite 备份 API。没有验证过的自动降级或历史合并流程。详见 [技术兼容说明](CLOSEOUT_4_0.md)。

旧 v3.0.0 Foundation 与[撤版记录](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/blob/cf405fdf132468a8ca9dbb8a3a2c7efbf8e874b1/docs/WITHDRAWAL_3.0.0.md)保留；3.0.3 [收口](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/blob/d85b7e275881b8c78ce66432b4e988511f748655/docs/CLOSEOUT_3_0_3.md)是历史依据，不代表 4.0 的新通过数。

移动Tools或恢复安装时，先核对新路径，再在当前进程设置`DOL_DEV_TOOLS_HOME`；它优先于安装记录和仓库相对位置。旧记录失效会停止，不扫描私有目录或自行下载替代包。搬迁后说明中的机器专属链接也可能过期，以解析结果中的docs为准；更新安装前保留旧目录，再向新的空目标安装。

更早的 1.x 安装、宿主显式调用和配方记录留在[历史安装文档](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/blob/8c5628fc2bd93cf6116e5cef3fe597315a2525f1/docs/SKILL_INSTALL.md)。它们不证明当前机器已安装本版本或宿主已热重载。
