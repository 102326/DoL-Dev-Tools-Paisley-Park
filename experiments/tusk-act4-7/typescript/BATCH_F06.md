# TS First F06 — 回执协议与真实页面容量维护

2026-11-05。固定代码`b7cecdc43ebd3ff6dc5f7d6ef99fad4cb88f9875`，基线`7cfb359beffa1672e81131fa1be5c94623a2d339`。50原Node+8DOM strict/67产物，另1个冻结JS协议输入（2函数未类型化），104运行入口。

## Delivered

game-receipts Node协调与DOM-only initialize/read/retire拆分。Node recover仍返回unknown[]，由原Runtime逐条验证与结算，不把CDP数组冒称可靠业务回执；cleanup仅选择原settled+occurred，校验返回选集/容量/剩余计数。namespace与协议版本、原nonce、64批次上限、未决保留、原文档/资源/Provider围栏保持。

实际复现内部调用传入继承toJSON投影的binding时，旧验证通过，发送到页面却变成空对象，页面将其视为不同nonce并报告retired，实际terminal仍占槽。另旧digest数组/String对象被正则强制转换接受。两个回归先RED，现按原顺序逐字段读取并验证primitive string，返回已知四字段快照，避免getter/toJSON在序列化时改写。正常生产绑定的顺序与业务requestDigest不变；validate不再保留原对象引用或自定义原型，这是内部API明确收紧。未改旧Ledger/schema/动作合同，不把新binding转换用于结清旧未知。

独立审查7/7合成VM/SQLite测试通过，确认退役查询和确认事务仍限定已提交终态、Provider、目标/资源与Chrome文档，未决不进入退役、没有动作重派。本次未观察到普通JSON持久Store发生该投影问题。

## Validated

- `node tools/typescript/build.cjs --check`50Node+8DOM/67产物一致；`node tools/typescript/check-types.cjs`80指定负例（raw恢复元素仍unknown）；`node --test tools/typescript/test/build.test.cjs`5/5。
- `node --experimental-sqlite --test tests/game-receipts.test.cjs tests/game-receipts-compatibility.test.cjs tests/receipt-retirement-mixed.test.cjs tests/game-native-street-recovery.test.cjs tests/chrome-gameplay.test.cjs`13/13。5种固定旧namespace/恢复/退役行为相同；跨Provider队列、原Unknown保留、清理ACK丢失与已提交重复退役有既有真实临时SQLite/VM证据。
- `npm test`569项：568通过、0失败、1Windows跳过。
- `node experiments/tusk-act4-7/contracts/receipt-verify.cjs ABS_CHROME NEW_OUTPUT`真实隔离Chrome8/8、清理确认。在64槽中恢复63个合成终态，实际删除已提交63条并保留未决槽；空namespace恢复不初始化，pending在查询前拒绝退役，丢ACK后同一已提交终态核对、重复已提交退役均保持pending。全部记录为自写合成数据，没有真实业务操作或把构造的终态当真实Ledger验收。
- 源码真实Chrome GER/Evidence13/13；源码树外独立包按锁离线安装自有XState，最低Node26.0.0父进程`--no-strip-types --experimental-sqlite`定向13/13，真实Chrome回执维护8/8及GER13/13。
- ZIP350文件匹配Git blob/CRC/export集合，SHA-256`038703df49f302302d6ad4d8053e90096758276cae59dc81cd8e7800125cd7b2`。[清单](package-f06-manifest.json)、[结果](batch-f06-results.json)。Mac环境同F05，无游戏内容或设备。

## Not validated / Known limitations

Windows、Android设备/WebView、真实游戏未验证。实际页面的合成终态由夹具写入，只验证回执协议；真实业务发生/花费/SQLite提交仍依赖原Outcome及M4代表业务。页面instrumentation不是安全沙箱；没有自动清理未知记录、重买或重派。其余Runtime/Provider/CLI迁移仍继续，50/95原Node接入不代表7.0完整门槛完成。
