# Patch 执行来源实验

这是 White Snake 6.0 的按需研究配方，不是正式兼容判定器。执行固定上游的真实 TweeReplacer / Linker 类，使用无游戏内容的工作副本和发布替身；不访问游戏、浏览器、设备或存档，不修改上游源码。不把静态重叠或回调完成当成业务冲突/兼容结论。

先核对、审查并保留以下输入：

- TweeReplacer 源码提交 `5094160465b0c5ef034eb5acd3d4f8122bdf8e09`。
- Linker 源码提交 `bb045cb493b284cef33ddcdebb972ad846349a52`。
- 已安装的 TypeScript 编译器。仅转译实际代码，类型未在此证明通过。
- 独立实验依赖目录，固定 lodash 4.17.21、json5 2.2.3；它们来自上游依赖，不加入 Tools 的 package.json。无需全局安装。

上游仓库：

- [TweeReplacer 固定源码](https://github.com/Lyoko-Jeremie/Degrees-of-Lewdity_Mod_TweeReplacer/blob/5094160465b0c5ef034eb5acd3d4f8122bdf8e09/src/TweeReplacer.ts)。
- [Linker 固定源码](https://github.com/Lyoko-Jeremie/TweeReplacerLinkerAddon/blob/bb045cb493b284cef33ddcdebb972ad846349a52/src/TweeReplacerLinker.ts)。

```powershell
node examples/patch-provenance/verify.cjs REVIEWED_TWEE_ROOT REVIEWED_LINKER_ROOT TYPESCRIPT_JS_PATH ISOLATED_DEPENDENCY_ROOT NEW_OUTPUT_DIR
```

参数是五个路径，占位符不能直接运行。输出目录必须尚不存在；实验不会自动下载代码或安装依赖。上游模块有真实 Node 权限，这不是不可信插件沙箱。

脚本比较原构建与局部诊断构建的实际执行，覆盖十二个场景：独立叠加、锚点被前序移除、后序覆盖、正则多处匹配、匹配但字节不变、同 Mod 两条规则、混合客户端顺序、单回调拒绝后继续、发布同步抛错、发布替身未结束，以及记录容量/内容上限。保留真实上游日志、方法与规则边界，验证最终内容、异常和顺序相同，观测方法在结束时恢复。

诊断构建用 TypeScript AST 定位固定的参数循环和 okCount 标记，不重写替换算法。逐规则记录 applied/not-applied/threw、资源/输入/输出摘要及字节是否变化；不从 okCount 编造匹配次数，matchCount 保持 null。最多64条事件，截断数量显式保留，首个失败另存；超过128 KiB的内容不计算摘要，字节变化为 unknown。事件有界不表示原始日志或全部未知来源已完整覆盖。

插入 try/finally 保留原 continue 与抛错路径；外层包装返回所调用方法的原 Promise。诊断构建改变函数源码/身份与执行耗时，对照通过只证明这些固定夹具的结果、异常与顺序一致，不承诺完全无扰动。这里只支持已审的声明式输入，不是任意动态 JS 执行史。

局部序号只描述此串行实验；没有全局因果排序。TweeReplacer 的 okCount 在“正则替换三处”和“字节不变”场景都可能为 1，因此不是匹配数或变化量。混合客户端回调的顺序来自实际 Linker，不从 Manifest 顺序猜测。

异步发布是对抗性替身，用来防止把 callback resolve 当成发布终态；**它不证明原生 ModLoader 发布本来是异步的**。本地原生实现使用顺序 DOM 删除/追加，实际 DOM 的对照见下节。此脚本没有证明参数文件、任意动态 JS、真实 DoL 行为或长期记录器的完整生命周期。

2026-10-15 首次九场景通过；加入来源检查后第二次九场景通过；2026-10-16 逐规则诊断十场景、容量与内容边界扩展后的十二场景分别通过。实际使用 Windows Node 24.19.0、TypeScript 5.9.3。报告保留在本地忽略目录 `artifacts/patch-upstream-run-001` 至 `004`，没有覆盖旧结果，也不把受控成功计作真实 Mod 兼容成功。

## 原生发布方法与真实 DOM

```powershell
node examples/patch-provenance/publication-browser.cjs REVIEWED_UTILS_TS TYPESCRIPT_JS_PATH PLAYWRIGHT_ENTRY CHROME_EXE NEW_OUTPUT_DIR
```

它用 AST 提取经审查的 ModUtils.replaceFollowSC2DataInfo 原方法，仅转译类型，不另写发布算法。使用已有 Playwright 和明确的已安装 Chrome、独立 Profile、loopback 无游戏内容页面；不访问用户日常浏览器。

2026-10-16 成功、构造节点时失败、删除旧节点后追加失败三个场景在真实 Chrome 中通过有/无观测对照。构造阶段失败保留旧节点；追加阶段失败会留下新 script/style 而缺少 passage，缓存 flush 未发生。因此不能把“进入发布”或“有部分新节点”当成发布成功，也不承诺原生过程为原子事务。故障由自有夹具明确注入，不是某真实 Mod 的根因复现。

本次源码文件摘要 `9cfab006570e5f97560c67b86d827e2d4f263b90f67e4a7efa78d76836b03dce`，提取的方法摘要 `255bf4bec1a2017d11c70fc8dd8613903e798beba43adc28b81db79105c59aeb`。本地目录标识2.101.1，完整上游 commit 链尚未核实；源码摘要不自动证明当前 App 执行了同一方法。自有浏览器和服务器关闭，报告 `artifacts/publication-browser-001/report.json` 保留。

## 启动期局部观测原型

`observe.cjs` 是显式调用的实验模块，不会被 CLI、Skill 或普通 Integration 自动注入。调用者必须先审查实际方法、确认来源，再选择一至两个资源并提供当前文档标识；传入的 sourceSha256/documentId 只是来源标签，不是该模块自行验证的源码真实性或 CDP 文档绑定。

它包装实际 `do_patch` 与 `replaceFollowSC2DataInfo`，保留 this、参数、返回值和原异常。最多记录16次调用，每项资源最多32 KiB；保存摘要、不保存剧情文本。摘要尚未完成、容量溢出、内容超限、停止时未决分别保留。首个方法异常即使发生在容量之外也单独记录。显式 stop 或30秒到期恢复自有方法，保留卸载归属冲突；停止后的迟到结果不能改写记录。

实际首轮启动的16项记录另有3项因容量丢失。针对只调查少量Mod的任务，可在已审profile中给出可选 `mods: ['实际Mod名']`，最多两个精确名称；省略时仍记录全部。这个选择只过滤 do_patch 的摘要，不过滤原调用或发布方法，也不会吞掉未选Mod的原异常。`filtered` 表示主动未采集，`dropped` 表示容量丢失；序号保留调用间隔，不能把间隔补成完整执行史。两个计数不同，原容量没有扩大。

这里只能说明方法 resolved/rejected、工作副本摘要及同步发布 returned/threw。它不读出逐规则匹配数，也不把异步发布方法的返回当作终态。外加 Promise reaction 会改变拒绝追踪和时序，函数身份及属性描述符在安装期间也不同，因此仍属于有扰动的诊断实验。不要重复叠装；页面重建后使用新执行绑定，不沿用旧记录。

ModLoader 的 `registerAddonPlugin` 要求在 inject-early 阶段注册；`afterEarlyLoad` 在消费者注册前执行，`afterPatchModToGame` 按插件注册表顺序逐项 await。因此后续若接入启动生命周期，必须验证探针安装时机和停止 hook 的实际顺序，不能因为 hook 名称含 after 就认定已覆盖所有发布者。当前没有自动安装/卸载 Mod 的能力承诺。

2026-10-16，七项局部生命周期测试及十二组实际上游原构建/诊断构建/局部包装对照通过；后者报告 `artifacts/patch-upstream-run-006/report.json`。它们使用真实固定类与受控业务夹具，未证明真实 Mod 功能共存。后续部署必须另有真实目标身份、原始包备份和不带探针的对照。

## Android 启动期接入实验

`startup.cjs` 导出 `register(host, reviewed)`，供经过审查的自有临时 Mod 在 inject-early 脚本中调用。reviewed 明确包含实际 patch/publication 方法源码的两个 SHA-256 和选定资源；只接受本次 Android `https://localhost` 场景。它不自动下载、安装或替换任何 Mod。调用者可用目标工程已有打包方式把此入口和 `observe.cjs` 打进自己的诊断 Mod，不重新打包上游执行器。

注册后复用 Addon 生命周期；源码核验最多1秒且异步核验期间方法不能变化，不匹配就不安装包装。自己的 afterPatch hook 给摘要最多500ms排空，然后停止；这会增加诊断启动耗时。自己的 hook 之后若还有发布者，明确在覆盖区间之外。目标来源、注册/执行顺序和已加载制品必须另外核对。

本轮已构建并在获准平板安装一次自有临时包，实际取得16项方法记录、3项截断及原方法恢复证据；没有保存剧情内容或操作存档。随后通过原 ModLoader 接口删除本次自有记录并重启，新文档中全局/加载项不存在，原列表、隐藏项和两个资源摘要对照成立。原始记录留在忽略目录；详见[采集边界案例](../../docs/knowledge/patch-capture-boundary.md)。

现有七项局部测试加六项启动合同测试通过。`publication-browser-002` 另在真实 Chrome 对局部包装的原 Promise、原生 DOM 发布、WebCrypto 迟到摘要和恢复进行检查，原三组 DOM 故障对照仍通过。这些结果不等于逐规则完整执行史或真实业务兼容闭环。

## 接入现有 Evidence

显式启用 [patch-observation.cjs](../../integrations/examples/patch-observation.cjs) 即可通过现有 `evidence --integration-file` 入口读取已经存在的探针记录；它不会安装探针、执行 stop、重放 Patch 或延长 Integration 超时。探针不存在时 unavailable，记录的 nonce/当前 timeOrigin 或容量不符合合同则 unsupported，Generic Evidence 继续按原规则独立完成。

collect 只做一次同步页面求值，核对记录自带的文档标签；这不让 Integration Worker 自动获得原执行上下文的完整绑定，也不承诺 detect 和 collect 属于同一文档。需要连续身份时使用原 Execution Context，不拼接不同 Document。可用记录不代表完整记录、业务完成或兼容成功。此模块已做定向替身回归；真实设备记录使用原绑定直接读回，尚未用本模块重新采集，不把两者混算为新实机验收。

模块对公开结果再做字段投影：只保留选定资源摘要、局部阶段、容量/错误和恢复信息；Mod 名称转为摘要，不复制额外正文、异常或路径。资源名称由调用者显式选择，发布前仍需审阅自己的 Evidence。`publication-browser-003` 使用实际模块在独立 Chrome 夹具核对同文档 available、重载后旧记录 unsupported、桥不存在 unavailable；这包含真实 Chrome，但桥是受控替身，也没有冒充一次完整 Worker/Android Evidence 验收。

公开投影同时保留过滤数与被选Mod名的摘要；旧记录没有过滤字段时保持 null，不事后补造0。`patch-upstream-run-007` 在同十二个场景增加显式选择的第四组对照，仍使用真实固定上游类；最终内容、原异常、回调顺序和原发布结果与无观测一致。尚未以此宣布正式6.0或新的真实兼容正例完成。
