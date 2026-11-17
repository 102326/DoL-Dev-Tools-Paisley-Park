# 7.2.0 正式包 · Mac 独立安装验收

日期：2026-11-17。结论：**本轮约定的 Mac 独立安装范围通过，可作为对应平台的补充证据。** 本次不修改生产代码、版本、安装器或正式发布资产；宿主自动发现、浏览器、设备和真实业务不在本轮执行范围。

## 固定对象

- 仓库：[DoL Dev Tools](https://github.com/102326/DoL-Dev-Tools-Paisley-Park)。
- [正式 Release v7.2.0](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/releases/tag/v7.2.0)，不是 GitHub 自动生成的 Source code 压缩包。
- 来源提交：`a8b1dfa235c6ece17d10ef4a3f47c5f658832449`；注解 Tag 对象：`f10ac0c306dd654b4a0970194d5b71671bf5e3fa`，解引用到同一提交。
- 成品：`DoL-Dev-Tools-7.2.0.zip`，1,193,824 字节，419 文件，1 份项目 Skill。
- ZIP SHA-256：`e76740b147557046bb0a07e208026ee51a22d981759b695875ec4d37a117881e`。
- 同一 Release 的 `artifact-manifest.json` 与 `SHA256SUMS.txt` 一起核对。manifest 对应本次来源与 ZIP，不以文档提交后的重新归档替代原成品。
- 结构化结果：[validation.json](validation.json)。

## 环境与隔离

macOS 27.2.1（26B131）、ARM64、Node v26.13.0、npm 11.20.0。解压及试装都在本轮独占的系统临时目录，路径包含中文与空格，位于源码树及其依赖祖先之外。没有替换全局 Skill，也没有将本轮试装目录加入宿主扫描配置。

子进程移除 `DOL_DEV_TOOLS_HOME`、`NODE_PATH`、`NODE_OPTIONS` 的继承值；负例单独设置明确的 Tools 覆盖。npm 使用本轮独立缓存、两份不同路径的空配置，并禁用 lifecycle scripts、audit、fund；未更改系统/用户 npm 配置、Node 或依赖。没有调用 Codex、app-server、diagnose-host、模型、浏览器、ADB、Android CLI 或设备。

## Delivered

交付的是这份成品验收记录及脱敏结果，不是新 Runtime 或新的测试平台。已有 Mac 开发分支与未跟踪文件保留，验收报告分支以正式 7.2 来源为父提交，不把旧实验分支的独有成果或私人草稿带入。

### 包体与文档

- CRC 通过；无重复路径、目录穿越或符号链接。
- ZIP 文件集合同时等于 manifest 与固定提交的 `export-ignore` 导出集合；检查包含父目录排除规则。
- 419 份文件的长度、SHA-256、Git blob 标识及实际内容全部匹配。
- 只有一份项目 `SKILL.md`；包内无 node_modules、artifacts、私人 Profile、SQLite、APK、截图或视频等运行产物。
- 284 个本地 Markdown 文件目标均存在；只检查目标文件，不验证外部网址和锚点语义。
- npm 安装及搬迁后再次逐文件确认原 payload 字节未改变。

### 安装、定位和搬迁

执行 19 项有断言的独立包检查，全部满足预期（包含应以 exit 1 拒绝的负例，不与下方 Node 测试数相加）：

| 检查 | 实际结果 |
| --- | --- |
| 包内 resolver；CLI version/help | 返回同一包根和 7.2.0；普通入口不需要 npm 依赖 |
| 安装到含中文、空格的全新目录 | 成功，四个 payload 文件与 install-manifest 摘要一致 |
| 独立已安装 resolver，禁用 TS stripping | 成功；只执行预生成 CJS，返回正确 root/CLI/docs/version |
| 再次安装到已有目录 | exit 1，`SKILL_TARGET_EXISTS`；原安装全部文件摘要不变 |
| 显式相对根 | exit 1，`RESOLVER_ROOT_INVALID` |
| 显式不存在根（已有有效安装仍保留） | exit 1，`RESOLVER_ROOT_UNAVAILABLE`，不回退 |
| 显式存在但不含本项目元数据的根 | exit 1，`RESOLVER_METADATA_INVALID` |
| 本轮复制的残缺安装，仍提供有效根覆盖 | exit 1，`RESOLVER_INSTALLATION_INVALID`，覆盖不能绕过文件完整性 |
| 包体搬迁，保留原安装记录 | 原 resolver exit 1，`RESOLVER_ROOT_UNAVAILABLE`，没有目录扫描或自动选包 |
| 显式设置搬迁后的 `DOL_DEV_TOOLS_HOME` | 原 resolver 成功定位新包；原安装文件未改变 |
| 搬迁后重新安装到另一空目标 | 成功；新 resolver 和重写的文档链接都指向新位置 |
| 仅搬动本轮安装的 Skill 目录 | 仍解析同一个 Tools 根；不改变 Tools/数据身份 |
| 安装暂存 | 正常路径无 `.dol-dev-tools-install-*` 残留 |

失败诊断没有回显测试路径、测试私密标记或原始异常。搬迁时旧 Skill 的绝对文档链接会失效：环境覆盖恢复的是工具定位，不会重写文档链接；需要保留旧安装并向新空目标完整安装。这是既有合同的准确边界，不报告成自动搬迁全部成功。

### Gameplay 包内依赖与 SQLite

1. npm 安装前，从解压包 `package.json` 建立 `createRequire`，`resolve('xstate')` 返回 `MODULE_NOT_FOUND`；确认没有借到源码树或全局依赖。
2. 内置 SQLite 可独立创建并关闭本轮合成库。针对自有 Session 链接调用真正的 `game-goal-status`，缺 XState 时 exit 1，错误为 `GAMEPLAY_RUNTIME_UNAVAILABLE`；该自有库字节不变。未使用旧 Store。
3. 在包根按原锁文件 `npm ci --ignore-scripts --no-audit --no-fund`，仅安装 1 个依赖。解析位置位于该包自己的 `node_modules/xstate`，版本 5.33.2。
4. 使用生产 `game-goal.open` / `game-runtime` 创建自有 SQLite Session，经 XState 从 observing 到取消后的 halted；随后关闭句柄。
5. 新 Node 进程通过真正 CLI `game-goal-status` 重开同一自有库：cancelled/halted，0 次动作、0 花费、0 pending。SQLite `integrity_check=ok`，1 个 Session、0 个 Effect；相关句柄关闭后无 WAL/SHM 残留。

这里只使用明确标为合成的 target 描述，没有现场连接、观察、动作派发、游戏状态或设备 I/O。它证明独立包的生产 Runtime 加载和本地状态持久性，不代表 Android 身份实测、Chrome GER 或真实业务恢复验收。

## Validated：命令与结果

下列 `PACKAGE` 为正式 ZIP 的独立解压根，`TASK` 为本轮自有临时目录，`SKILL` 为该目录中新建的同名 Skill 目标。变量是复现占位，不能指向日常安装或真实 Store。

```sh
shasum -a 256 "$ZIP"
node "$PACKAGE/.agents/skills/dol-dev-tools-paisley-park/scripts/resolve.cjs"
node "$PACKAGE/scripts/dol-dev.cjs" --version
node "$PACKAGE/scripts/dol-dev.cjs" --help
node "$PACKAGE/scripts/dol-dev.cjs" install-skill --out "$SKILL"
node --no-strip-types "$SKILL/scripts/resolve.cjs"
# 下列覆盖只对当前命令生效；相对/缺失/错误项目分别应拒绝
DOL_DEV_TOOLS_HOME=PRIVATE_RELATIVE node "$SKILL/scripts/resolve.cjs"
DOL_DEV_TOOLS_HOME="$TASK/PRIVATE_MISSING" node "$SKILL/scripts/resolve.cjs"
DOL_DEV_TOOLS_HOME="$TASK" node "$SKILL/scripts/resolve.cjs"
# 将本轮自有包搬迁后，分别验证无覆盖失败、显式新根成功
DOL_DEV_TOOLS_HOME="$MOVED_PACKAGE" node "$SKILL/scripts/resolve.cjs"
```

安装依赖的实际参数（`TASK` 中两份配置已创建为空文件）：

```sh
cd "$PACKAGE"
npm ci --ignore-scripts --no-audit --no-fund \
  --cache "$TASK/npm-cache" --registry=https://registry.npmjs.org \
  --userconfig "$TASK/npm-user-empty.rc" \
  --globalconfig "$TASK/npm-global-empty.rc" \
  --fetch-retries=0 --fetch-timeout=15000
node --experimental-sqlite --test --test-reporter=tap \
  tests/install-skill.test.cjs \
  tests/install-skill-failures.test.cjs \
  tests/skill-resolver.test.cjs
```

最后一条是成品包自带的原测试：**18 passed、0 failed、1 skipped、0 cancelled、0 todo**。跳过项是 Windows exclusive file handles；macOS 权限、hard link、并发占位、发布失败恢复和真实子进程中断用例通过。没有为文档交付重跑整套产品测试。

生产 Runtime smoke 的复现核心如下；只操作 `TASK` 中尚不存在的库：

```sh
node --experimental-sqlite - "$PACKAGE" "$TASK" <<'JS'
const assert=require('node:assert/strict');
const path=require('node:path');
const {createRequire}=require('node:module');
const [root,task]=process.argv.slice(2);
const req=createRequire(path.join(root,'package.json'));
assert.ok(req.resolve('xstate').startsWith(path.join(root,'node_modules','xstate')+path.sep));
assert.equal(req('xstate/package.json').version,'5.33.2');
const api=req('./scripts/lib/game-goal.cjs');
const file=path.join(task,'reproduce-runtime.sqlite');
const r=api.open(file);let id;
try {
  const s=r.start({serial:'synthetic-no-device',package:'com.example.neutral',userId:'0'},
    {mode:'gameplay',goal:{kind:'reach-passage',passage:'NeutralRoom',description:'Package-only smoke'},
     budget:{timeoutMs:60000,maxActions:1,maxObservations:2,maxReplans:2,maxSpend:0}});
  id=s.id;assert.equal(s.machine.value,'observing');
  r.stop(id,'cancelled');assert.equal(r.status(id).openEffects.length,0);
} finally { r.close(); }
const reopened=api.open(file);
try { assert.equal(reopened.status(id).machine.value,'halted'); }
finally { reopened.close(); }
JS
```

实际执行还写入本轮合成 `paisley-session-link`，由新的 CLI 进程重读并检查数据库完整性；结果见结构化记录。上方片段便于独立重现核心，不是又一套安装器或永久工具。

### 执行过程中的失败与处理

- 首个验货辅助检查没有纳入父目录的 `export-ignore`，断言失败；对照仓库现有 verify-package.py 的处理方式补齐后，成品实际集合正确。不是包体缺文件。
- 本轮辅助脚本出现 SQL 字符串引用、接续脚本 `__file__` 和已存在自有目录处理错误；修正测试调用后只接续相关未完成检查。没有把这些退出当成产品失败，也没有隐去为一次全绿运行。
- 文档扫描辅助脚本最初把大写文件名误当占位符；移除错误过滤后实际检查 284 个目标，无缺失。
- npm 最初将同一个 `/dev/null` 同时用作 user/global config，被 npm 拒绝；改为本轮两份独立空配置。
- 默认受限执行的下载返回 `ENOTFOUND registry.npmjs.org`。随后仅为本轮锁定 npm 依赖申请并获准网络执行，同一 registry 下载成功，未改代理、全局配置、宿主权限诊断或旧评测环境。

## Not validated

- Codex 的自动 Skill 发现、当前聊天热重载；没有调用 Codex/app-server，resolver 成功不冒充宿主发现。
- 模型、Judge、Skill A/B 或开发效率结论。
- Mac Chrome、CDP、GER 现场动作、标准 Evidence、Android CLI/ADB/WebView/真机、真实游戏及真实源码/存档。
- 本轮 Windows 行为、最低 Node 26.0.0、其它文件系统/架构；Windows 既有证据仍按原记录，不计成本轮新运行。
- 异常断电、完整 Gameplay 副作用恢复、历史 Unknown/旧账本迁移；本轮没有真实派发动作。
- 外部文档网址和 Markdown 锚点语义。

## Known limitations 与收口

这份结果支持 Node 26.13.0 / ARM64 Mac 上的独立成品安装、定位和包内 Gameplay 加载；不扩大为全部正式支持环境或业务验收。搬迁的文档链接处理沿用现有安装合同。正式包内原有“本轮未新增 Mac 安装实测”的文字描述原发行时证据，本报告是后续新增证据，不重写原资产。

临时目录只用于本轮，已清理自有解压包、两份临时 Skill、残缺副本、合成 SQLite、npm 缓存、Node 临时编译缓存和原始输出，并移除本轮下载的 ZIP 副本；保留脱敏结果及必要小型工作区保护记录。已有源码依赖、全局配置、未提交工作和旧证据不清理。清理实测见 validation.json；远端固定提交与 CI 结果由最终交接回复提供。

本轮范围 Scoped Done。没有发现需要修改 7.2 生产代码的问题；后续设备、浏览器或宿主验收按单独任务推进，不为填满清单扩充本轮。报告只同步验收分支，不合 main、不移动 Tag、不发布或替换 Release。
