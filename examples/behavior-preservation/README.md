# 重构行为保持：固定 Hook 生命周期案例

这是 White Snake 6.1 M3 的可复现研究配方，复用 Node `assert` / `vm`、现有源码调查与开发接续。只研究 DeepProxyHook 的注册代次和注销后行为，不是通用行为等价工具、CE R1 实现或可安装 Mod 补丁。普通编辑无需执行本配方。

## 输入与候选身份

旧实现为 chris81605 的 [CE-R0 固定源码](https://github.com/chris81605/Degrees-of-Lewdity_Cheat_Extended/blob/c36b23a6ab1899c7f780faa63945fe6e199a6355/scripts/CE_hookTool.js)，提交 `c36b23a6ab1899c7f780faa63945fe6e199a6355`，整个文件 SHA256 为 `e245c915183c29b53340c629c7a3b178bedbaebac64ab9583c6548ac652a8b9a`。执行的是实际文件中第一个 DeepProxyHook IIFE，不执行 RawHook/VarHook、游戏正文或其它脚本。whole-file门禁和唯一修改接缝限定此配方，不对未知版本盲套，也不自动下载。

本轮复用已有CE-R0静态审计的R01/H01/H03定位，再独立执行实际代码核对。2026-10-16另查作者最新Release为1.20.3；本案例刻意固定历史R0，未下载或执行最新Mod包，不推断其与本切片字节相同，更不宣称当前CE R1仍存在这些缺陷。

候选只在隔离切片中增加每路径的注册代次token：register在同一生命周期内保留代次；unregister使该代次失效；get/set/delete在已失效代次上直接Reflect透传。重新注册得到新token，旧代理不会因同名路径再次出现而复活。保留原注册表、Proxy缓存、开关、回调和原异常处理，不改变CE工作线或真实配置。

## 行为合同

| 分类 | 本案例约束 |
|---|---|
| Preserved | 活跃规则的before→transform→写入→after及次数；总/子开关、macroLock、忽略和深度边界；数组与缓存别名；删除否决/异常结果；回调异常后的实际部分状态；安装前同路径最后注册生效；其它路径不受注销影响；显式对象替换后的原passagestart重绑。 |
| Intentional Change | 注销返回后发起的新读/写/删不再执行该路径旧代次的回调（包括ignorePath），保留引用可透传、不revoke；注册表先被新配置覆盖也能停用已安装旧代理；注销再注册后只有新代次执行一次。 |
| Regression | 受控坏候选删除after调用：最终值不变，但业务回调丢失，必须拒绝。只是负对照，非已交付候选的故障。 |
| Unknown | SugarCube真实clone、存档/读档跨代、真实游戏/Android、其他引擎和任意Mod组合；没有执行就不算通过。 |

另有“只看registry[path]是否存在”的坏候选：注销后再次注册会让旧代理复活，最终数字仍相同却多一次after。它被有意修复的规范拒绝，不把这项旧缺陷当成应保持的正确行为。

观察投影读取自有raw对象并记录合成回调，不通过Proxy遍历全量状态来制造额外回调；对象身份比较仅用于此案例相关别名。配置更新但尚未注销时的原捕获行为不改，不借本研究替CE R1决定完整热更新策略。

## 复现

先审查上方固定源码，保存到自己的隔离目录；来源受审不等于只靠摘要就可信。使用当前项目Node（最低22.12）：

```sh
node examples/behavior-preservation/deep-proxy.cjs REVIEWED_CE_HOOK_FILE NEW_OUTPUT_DIRECTORY
```

输出父目录须存在，最终目录须不存在。未知源码在创建输出前拒绝；已有输出不覆盖。失败保留本轮输出与partial报告，不自动清理。`vm`不提供不可信代码的权限沙箱；必须先审查固定输入，不能替换成任意脚本。

输出为旧/候选切片、来源/许可NOTICE及`report.json`，供本地复核。用同一初态和动作执行实际旧/新代码，既比较状态也断言顺序、次数和返回；保留旧缺陷的结果，候选按修复约束验收。`status=passed`只表示本案例必需断言与负对照正确；Unknown记录`executed:false`，不是整体Mod通过。

## 本轮结果与边界

macOS27.0.1 ARM64、Node24.18.0：8组保持行为对照、3组有意修复约束、2个坏候选控制均符合预期。原注销后赋值7被旧规则改成14，候选保留7；注销再注册的最终数值都为10，但after由旧实现2次变成候选1次。未知源码拒绝与已有输出保全另有检查。

首次弱引用配置退役候选通过基础场景，却遗漏“先覆盖registry再注销”：停用的是新配置，旧代理仍活跃。保留该失败，再改为注册代次，未改变注销前原捕获行为。这一具体反例说明应跟踪实际持有关系，不能只看当前registry或最终数值。另一个初始探针有语法笔误，修正后才取得R01真实红测；笔误不计作产品Bug。

最终候选切片 SHA256 `f86ed5756f573d598ec49d75318b6184714684f8ffeee047b0aa619944d51e96`；该摘要只标识本候选输入，不是设备加载或业务证明。原始来源、失败及输出保留在本地ignored `artifacts/6.1-m3`，不分发上游源码或生成切片。

这个结果不能证明原始对象身份已恢复、正在执行的回调会被回滚、长期性能/内存、全部配置热更新或跨存档清算。连续passagestart在同一对象上的叠层、重入回调和其它Hook的所有权仍在本例之外。未进入M4故障缩减或Weather Report建模。

## 来源与许可

原作者为chris81605，原 [LICENSE.txt](https://github.com/chris81605/Degrees-of-Lewdity_Cheat_Extended/blob/c36b23a6ab1899c7f780faa63945fe6e199a6355/LICENSE.txt) 为CC BY-NC-SA4.0。本仓库只保存自己的复现配方与方法；运行后产生的原/派生切片保持上游许可和来源说明，不按Tools的MIT重新授权。候选已标记为Paisley Park M3的本地研究修改，不是作者发行。不包含原Mod包、游戏资源、私有存档或CE R1代码。
