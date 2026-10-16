# DoL Dev Tools — Skill 安装与升级

Tools保存采集器、CLI和格式；Skill选择诊断/复现/开发路径，调用同一份Tools与目标项目自己的构建部署命令。仓库内Skill可直接使用，也可装入本机Codex Skill目录，不复制Runtime或第三方项目。

```powershell
node scripts/dol-dev.cjs install-skill --out C:/Users/YOUR_USER/.codex/skills/dol-dev-tools-paisley-park
node C:/Users/YOUR_USER/.codex/skills/dol-dev-tools-paisley-park/scripts/resolve.cjs
```

安装目标必须是尚不存在的`dol-dev-tools-paisley-park`目录。已有安装会拒绝覆盖；本命令不下载、删除或自动更新。安装内容为SKILL.md、位置解析器、显示名元数据agents/openai.yaml和本地tool-location.json；说明链接指向同一份Tools文档。工具包本体需要留在原位置；源码包不包含机器专属位置记录。

解析器核对绝对路径、包名、版本、真实CLI位置和基础文档；这是位置检查，不证明代码可信。先检查来源，再执行。安装成功只证明文件已写入；宿主何时重新扫描取决于实际 Agent 环境。按宿主支持的方法刷新或开启新会话，确认其可发现 Skill 并调用正确版本。当前回合显式读取或 resolver 成功不能冒充宿主自动发现验收。

## 运行前提

最低 Node.js 22.12.0。普通诊断、help/version、Skill 安装和 resolver 不需要 XState/SQLite。Gameplay 另需在实际 Tools 根目录执行 `npm ci --ignore-scripts --no-audit --no-fund`，安装锁定 XState 5.33.2；直接运行 Gameplay CLI 时使用 `node --experimental-sqlite scripts/dol-dev.cjs ...`，兼容最低 Node 22.12 的 SQLite 启动条件。维护环境 Node 24 可直接加载内置 SQLite；显式带参数的示例同样可用。两个 Windows launcher 已包含参数，不需修改系统配置。

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

## 6.1.0 White Snake 候选安装与验货

本文当前入口对应 `6.1.0 — White Snake` 本地RC，尚未发布GitHub Release。拿到本地 `DoL-Dev-Tools-6.1.0.zip` 后核对SHA-256、manifest和validation；公开已发布包仍见 [6.0.0 Release](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/releases/tag/v6.0.0)，该包版本为6.0.0。保留旧Tools与Skill作为回退。

解压候选到新的长期保留目录。macOS在该目录运行 `node scripts/dol-dev.cjs --version` 和 `node scripts/dol-dev.cjs --help`；版本应为 `6.1.0`，help首行以 `DoL Dev Tools 6.1.0 — White Snake` 开头。Windows继续使用 `DoL-Dev.cmd` 或 `Paisley-Park.cmd`；本轮Mac验货不等于Windows重新实测。

普通诊断无需npm依赖。Gameplay在该目录执行 `npm ci --ignore-scripts --no-audit --no-fund`，仍锁定XState5.33.2。按本页现有命令向尚不存在的同名Skill目录安装，再执行resolver，确认版本6.1.0与本次解压根目录。先用隔离目录验货，不自动替换全局Skill。resolver通过只证明位置与安装完整性；宿主实际发现须在对应作用域另行验证。

6.1保留知识入口、专业参考、定向配方和既有诊断路径；[行为保持案例](../examples/behavior-preservation/README.md)也随包提供，但固定CE源码须自行取得并审查，不捆绑原Mod或派生切片。Patch观测仍需审查并显式启用。安装与升级不迁移Store，不清理历史Unknown。范围与限制见 [6.1收口](CLOSEOUT_6_1.md)；既有6.0证据见 [历史验收](CLOSEOUT_6_0.md)。

## 历史：5.1.0 安装与验货

本文对应 `5.1.0 — Paisley Park`；正式 ZIP、SHA-256 与来源清单见 [5.1.0 Release](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/releases/tag/v5.1.0)。保留原 Tools 和 Skill，向新目录安装，不覆盖已有安装。

核对 ZIP 的 SHA-256，解压到新的长期保留目录。`DoL-Dev.cmd --version` 应返回 `5.1.0`，help 首行应为 `DoL Dev Tools 5.1.0 — Paisley Park`。普通诊断不需 npm 依赖；Gameplay 在此目录运行 `npm ci --ignore-scripts --no-audit --no-fund`，保持锁定 XState 5.33.2。

macOS在Tools根目录使用同一Node入口（安装目标同样必须不存在）：

```sh
node scripts/dol-dev.cjs --version
node scripts/dol-dev.cjs --help
node scripts/dol-dev.cjs install-skill --out "$PWD/isolated-agent/.agents/skills/dol-dev-tools-paisley-park"
node "$PWD/isolated-agent/.agents/skills/dol-dev-tools-paisley-park/scripts/resolve.cjs"
```

这只建立隔离安装；宿主还需从该项目或对应Skill作用域实际发现，见 [Mac宿主验货](MAINTENANCE_5_1.md#p6-独立包与真实宿主)和 [Windows新进程验货](WINDOWS_5_1.md#validated)。

用本页现有安装命令向新的隔离 Skill 目录安装并运行 resolver，确认版本与 Tools 根目录；只有决定切换全局安装时才备份原 Skill，并向空的原目标安装。安装验货只使用自有临时 SQLite，不复制、迁移或清理旧 Store。5.0 未更改 4.0.1 的 GER/Unknown 合同。Source Link 与 Component Lab 的使用边界见 [5.0 入口](PAISLEY_PARK_5_0.md)。

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

旧 v3.0.0 Foundation 与[撤版记录](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/blob/cf405fdf132468a8ca9dbb8a3a2c7efbf8e874b1/docs/WITHDRAWAL_3.0.0.md)保留；3.0.3 [收口](CLOSEOUT_3_0_3.md)是历史依据，不代表 4.0 的新通过数。

移动Tools或恢复安装时，先核对新路径，再在当前进程设置`DOL_DEV_TOOLS_HOME`；它优先于安装记录和仓库相对位置。旧记录失效会停止，不扫描私有目录或自行下载替代包。搬迁后说明中的机器专属链接也可能过期，以解析结果中的docs为准；更新安装前保留旧目录，再向新的空目标安装。

当前机器已实际安装，并由独立任务使用安装副本完成已有WebView前后Evidence的比较和本地报告；没有重新连接设备、上传或复制Tools。该证明覆盖显式使用与定位，不保证每个自然语言提示都会触发Skill，也不代替游戏业务验收。

1.4已将原生和真实业务目标配方加入Skill路由，并保留证明边界。旧安装先移到独立本地备份，再向空目标安装；UTF-8模式quick_validate及resolver通过，定位1.4.0。原生/业务配方不是通用授权，不自动安装未知APK或修改另一项目的Runtime。

1.4独立前向任务使用安装副本完成真实业务设置CSS的两次比较和重启后Evidence报告，三条CLI均complete/exit0。它将“采集完整”“CSS无差异”和“业务/存档正确”区分，未连接设备或把目录名当作重启证明。

1.5安装已保留旧副本备份，UTF-8 quick_validate与resolve通过，定位1.5.0。新增“不重复造轮子”路由，优先复用可用android-cli/android-profiler、Chrome DevTools与目标项目既有流程；不把这些Skill装进Tools、不复制工具实现、不要求缺失时自动安装。独立前向验证使用已有trace与现有分析工具，结果见[VALIDATION](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/blob/cf405fdf132468a8ca9dbb8a3a2c7efbf8e874b1/docs/VALIDATION.md)。

[1.5.2](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/blob/cf405fdf132468a8ca9dbb8a3a2c7efbf8e874b1/docs/RELEASE_1.5.2.md)将实战后的标准能力优先、点击失败诊断、范围收窄和直接探针/Journey边界纳入同一源码包。更新时保留旧Tools与Skill，将新包解压到新的稳定目录，再按上方既有安装命令生成指向新包的Skill；不是只改旧安装的文字。解析器版本、说明链接和生成指引应同时匹配新目录，避免重装回退。
