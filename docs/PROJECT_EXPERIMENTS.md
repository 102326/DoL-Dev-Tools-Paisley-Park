# GER 项目实验 Recipe

4.0 开发线在现有 `game-goal-start` / `game-session` 中提供 `project-experiment`。复用同一个 Runtime、预算、事务预留、Action、Document 绑定和 Effect Ledger，不启动第二套执行器或长期服务。当前通用 Goal 完成判据复用原生 `reach-passage` / `native-state` / `native-knowledge`；项目准备动作和原生导航可共同参与，但只能选择本轮范围授权的 intent。

## 范围与真实目标

Scope 是宿主把已经获得的用户授权落实为工作区、设备、App、user、签名摘要、数据域和操作类别。它不替用户产生授权，也不能由页面、Recipe 返回值或模型叙事自行扩大。修改 Scope 要对应真实任务授权；不要让用户为范围内每个脚本迭代再次审批。Recipe 是审查过的本地 CJS 代码，拥有 Node 权限；工作区路径检查限制入口，**不是文件/网络权限沙箱**。

执行前核对 device/package/user，以及当前 Android PackageSignatures 的签名 hash。`signingHash` 是系统报告的身份摘要，不是证书 SHA256；Case 应另保留实际 APK 和证书 SHA256，并在部署更换制品后重新核对。不要将摘要匹配宣称为密码学身份认证。PID/Document 重建要求显式新绑定，同一授权范围继续使用；Scope 不取消旧 Pending/Unknown，也不构成新数据代次。

## Recipe 与请求

模块只导出 `schemaVersion: 1` 和最多 16 个 `operations`。每项提供 `id`、`label`、`intent` 和四个自包含页面函数：

| 函数 | 合同 |
| --- | --- |
| `read(inputs)` | 读取真实前/后态；返回有界 JSON 对象，覆盖副作用、价格及必要身份条件，不读取无关私人数据、不写入游戏。 |
| `quote(before, inputs)` | 返回真实非负整数报价。状态准备本身可以为零；购物不能把原价改成零，真实免费交易仍是购物。报价在派发前重查。 |
| `execute(inputs)` | 执行获准动作；需要等待的工作必须包含在返回 Promise 中。同步返回或 Promise resolve 只是执行确认，不是业务成功。 |
| `outcome(before, after, inputs)` | 独立读取后态后返回 `{occurred: true, spent: 实际花费}` 才生成 terminal；不根据 execute 的返回值下结论。无法证明时保留 started/Unknown。 |

函数在当前绑定页面执行，不支持 Node 闭包或模块外页面函数的未验证假设。异步执行要明确等待业务结束；未等待的后台工作不能宣称 remoteClosed。源码身份包含文件 SHA256 和实际函数内容摘要；既有未决动作继续使用原 binding/receipt，不能用修改后的 Recipe 追认旧动作。只读恢复不调用 execute，不用新源码修复缺失回执。

[项目状态准备示例](recipes/project-state.cjs) 只改获准测试进度中的虚拟货币。它记录为 preparation、花费为零，不伪造购买、库存或既有 Outcome。示例尚未在本轮真实游戏中执行。

```json
{
  "name": "case-prepare-currency",
  "mode": "development",
  "goal": {
    "kind": "project-experiment",
    "recipe": "ABSOLUTE_REVIEWED_WORKSPACE/docs/recipes/project-state.cjs",
    "inputs": { "amount": 10000 },
    "scope": {
      "workspace": "ABSOLUTE_REVIEWED_WORKSPACE",
      "serial": "SELECTED_DEVICE",
      "package": "SELECTED.APP.PACKAGE",
      "userId": "0",
      "signingHash": "OBSERVED_PACKAGE_SIGNING_HASH",
      "intents": ["experiment"],
      "dataDomain": "app-user-data"
    },
    "predicate": {
      "kind": "native-state",
      "conditions": [{ "field": "money", "op": "eq", "value": 10000 }]
    }
  },
  "budget": { "timeoutMs": 60000, "maxActions": 8, "maxObservations": 20 }
}
```

这些是待替换的明确占位符，不能直接运行；先落实真实授权、当前目标和审查后的 Recipe。省略 maxSpend 表示不设消费上限；显式零只允许真实零成本候选。实际花费仍持久记录。已有同目标 Unknown 必须按原合同处理，不换库或改 TargetKey 解锁。

```powershell
node scripts/dol-dev.cjs game-goal-start --file reviewed-request.json --serial SELECTED_DEVICE --package SELECTED.APP.PACKAGE --out NEW_GOAL_DIR --test-environment yes
node scripts/dol-dev.cjs game-session --goal NEW_GOAL_DIR --operation request --test-environment yes
node scripts/dol-dev.cjs game-session --goal NEW_GOAL_DIR --operation propose --file current-decision.json --test-environment yes
node scripts/dol-dev.cjs game-session --goal NEW_GOAL_DIR --operation dispatch --test-environment yes
```

使用当前 Request 的完整 Decision envelope 和 actionRef。改动源码后先重新观察，不用旧 ref 执行新函数。传输 acknowledgement、已观察副作用、当前 Goal predicate 分开显示；Goal 为真而 effect 未知仍不能完成。正常脚本结清但 Goal 尚未满足，可继续重规划。

## 当前验证边界

Windows Node/替身 Android-CDP 的 CLI request → propose → dispatch → receipt → 原生 Predicate 已验证；源码迭代、错目标/签名、未证明结果、显式零预算与有花费的结清均有回归。真实 Android 的 Recipe 业务派发、存档操作和独立数据代次尚未验收。宣告某项 intent 不等于所有对应游戏 API 已有可靠合同；加载/重建导致 Document 丢失时，缺失旧 terminal 保持 Unknown。详见 [4.0 进度](BITES_THE_DUST_4_0.md)。


## Native save experiment Recipe

`docs/recipes/dol-save-state.cjs` is a reviewed DoL 0.5.12.13 IndexedDB Recipe, not a generic browser storage API. Inputs record the observed game version, native API/callback source digest, native slot index (0 is autosave, 1..8 are numbered slots), distinct trial metadata and `operation: save|load|delete`. Use the existing scoped GER request/propose/dispatch flow. Do not use Save.autosave.save's boolean return as transaction proof: its IDB branch launches an asynchronous write and returns immediately. The Recipe captures the actual native method/receiver, checks source and callback identity at the asynchronous digest boundary, awaits the native Promise and independently rereads original slot data/metadata and current player state. It does not disable autosave or infer backup recoverability.

A Recipe quote may return `null` to omit a currently unavailable operation; numeric 0 still means a reviewed zero-cost operation. This does not change the meaning of an unset spending budget. An operation that intentionally replaces the native passage root may declare `sceneTransition: "passage"`; it uses `project-recipe-v2` and must prove a fresh connected original root agreeing with SugarCube after the operation. Ordinary Recipes remain v1 and reject root replacement. Namespace/Document replacement never silently qualifies: an old client still refuses a new document and a missing old terminal stays Unknown. Stored v1 receipts keep v1 validation.

Save Outcome requires a real changed record or new stored trial metadata, native saved money/time/passage matching the separately observed original marshal-for-save projection, and unchanged current state projection. Native archive history and current display variables are separate facts; their time fields can differ in transitional scenes. The Recipe decodes native delta records with the pinned original decoder, and pins marshal-for-save separately; it does not pretend an archive time equals the displayed time. Delete requires observed presence followed by native absence. Load requires unchanged stored data and current native money/time/passage matching that stored snapshot. These are representative projections, not assertions that every migration/Mod hook/player field was verified. A script ack without stored data never closes the Effect. The numeric native Goal predicate remains separate from this operation Outcome; a development checkpoint or continued Goal can assert additional original-state conditions. Do not call a save Goal complete merely because a numeric invariant already held.

Unsupported backends, mismatched API/hook digests or unexpected stored shapes are unavailable capabilities; do not install another backend or rewrite old receipts to make them pass. Scope comes from the actual user/host grant, including overwrite/delete/load and any indirect save effects. Native API metadata reads may update its in-memory metadata cache; they are not game actions or proof of purely immutable JavaScript.

A completed execution phase is retained when a subsequent state read fails, but it remains a started/Unknown receipt until an original independent Outcome is available. Neither a new reader version nor a source fix rewrites the old attempt. Replaced namespace/owned receipt records refuse terminal publication.
