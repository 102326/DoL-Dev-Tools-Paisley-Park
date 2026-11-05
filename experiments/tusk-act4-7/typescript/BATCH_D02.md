# TS First D02 — 通用Inspector与存储观察

2026-11-05。固定代码`88bb7dcea6d7ede5500d02935422346d70e25513`，基线`9409f2128d556ff45ab145144bf852e876f889b5`。沿用[D01双Program](BATCH_D01.md)，19Node+3DOM、26产物；新增browser Inspector运行文件计入98项清单，不隐去新增工作。

## Delivered

Inspector六种DOM模式和storage移入DOM-only权威CTS，Node保留原导出、expression、storageDiff和collect。只把独立函数文本注入原文档；selector-health、accessibility、overlays、scroll、ownership、hitboxes仍是原有限观察，不升级成业务成功或归属断言。

storage只读取键名哈希/计数和既有IndexedDB元数据，不读value；原8秒期限、unsupported/partial、升级竞态abort、迟到连接close、只读事务清理保持。Node storageDiff从unknown按既有校验进入局部合同；浏览器类型保留nullable section与模式字段，不冒称任意快照完整。未改业务注入源码、fingerprint、Store、receipt或Unknown恢复。独立只读审查未见新增阻断，未独立运行测试。

## Validated

- `build.cjs --check`19Node+3DOM/26产物一致；`check-types.cjs`37指定负例；构建5/5。
- DOM/CSS/Inspector/Hitbox/Evidence定向29/29；原Inspector4/4；冻结旧实现对照包括六DOM模式与storage输出/diff，另复用D01的12对DOM/CSS。
- `npm test`542项：541通过、0失败、1Windows跳过。
- 源码真实Chrome PC12/12；源码树祖先之外、无node_modules的固定包最低Node26.0.0父进程`--no-strip-types`PC12/12。包含Journey八类checkpoint，证明普通PC Debug不要求引入GER依赖，不代表GER全部已在此固定包再跑。
- 固定归档330文件逐一对应Git blob、CRC/导出集合一致；SHA-256`496f82793f7322832224ed08f0b7c296df2f851d1a0fb90020b419f2a27d06d4`。[逐文件清单](package-d02-manifest.json)、[结果](batch-d02-results.json)。真实Chrome环境同D01，全部中性自有内容。

## Not validated / Known limitations

Windows、Android/WebView、真实游戏仍未验。当前原32个静态插值命中处理DOM、CSS、Inspector三项；原生业务源码/摘要及其兼容恢复继续按专属合同逐项处理。没有以静态类型或合成观察证明完整行为保全，整体迁移未完成。
