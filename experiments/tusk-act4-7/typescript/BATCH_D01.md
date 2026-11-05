# TS First D01 — DOM/CSS与独立浏览器编译边界

2026-11-05。代码`da5eacd4179d0ea1d6d4b3008bb163f0b47f094e`，基线`2a83b35a27f506fcb57098f0978d2b3baeeaf310`。原95个Node入口已有18个strict；新增2个DOM浏览器运行产物，当前运行清单97项，其中20个权威TS模块、23生成产物。不是完整D或7.0完成。

## Delivered

- `probes/typescript/dom.cts/css.cts`用独立DOM/DOM.Iterable、ES2022、types=[]完整Program。Node的dom/css保留原CJS路径、导出与contract/diff，从生成browser模块捕获函数。只有函数文本注入页面，不发送CJS包装；CSS允许属性作为显式页面参数，Node直调仍保留模块默认属性。
- 浏览器Program先在内存产生CJS与开发声明，Node Program消费内存声明而非DOM源码，不引入DOM ambient globals。两组完整检查通过才进入同一owned暂存/发布/回滚；检查模式只读，LF/权限/peer/协作锁边界保持。无bundler或运行时TS loader。
- 运行包新增2个必需browser CJS；权威CTS与生成声明只在源码仓库。冻结迁移前自有DOM/CSS夹具用于实际旧/新对照，不含游戏或第三方内容。
- 类型只承诺实际合同：DOM旧contract仅保证address等有限信息，其余字段unknown；CSS未验证limits/textAndValues就不承诺它们，style键可缺失。独立审查指出style过度承诺后改为Partial，并增加会拒绝不安全字符串读取的负例。
- 业务注入函数、game-*模块、profile、receipt指纹和持久化合同与基线无差异；没有更新旧未知副作用或替换回执。

## Validated

| 检查 | 实际结果 |
| --- | --- |
| build/check与类型负例 | 18Node+2DOM、23产物一致；36个指定错误被拒绝 |
| 构建保护 | 5/5，含双Program错误时无发布、浏览器禁止process/Buffer/require、Node禁止document、CRLF/漂移、partial写入/rollback、模式、peer数据和锁保留 |
| DOM/CSS/标准Evidence定向 | 23/23；冻结旧实现六种合成场景各比较DOM与CSS，共12对输出/diff；页面上下文没有Node globals，私密值getter禁止读取 |
| `npm test` | 541项：540通过、0失败、1Windows跳过 |
| 源码真实Chrome | Integration10/10，GER/Evidence13/13，串行执行 |
| 固定独立包 | 328文件匹配Git blob、CRC及导出集合；源码树祖先之外全新解压，独立npm ci仅原锁定XState，确认解析在包内；最低Node26.0.0父进程`--no-strip-types`GER/Evidence13/13 |

真实Chrome/SQLite覆盖原pending、中断恢复、不重复购买、同一文档身份、原terminal核对、reload/ABA/fencing、Evidence/Known Good/Compare。属于无游戏内容合成场景，不是业务游戏验收。构建5项最后通过后没有实现改变；定向及根测试证明的是实际生成JS。独立审查仅静态复核，未独立跑测试。

ZIP SHA-256：`a427a699d3cc7f20ba13c89743ed8fa9c0c236cc444bfea37135228dd348c492`。[逐文件清单](package-d01-manifest.json)、[脱敏结果](batch-d01-results.json)。编译复现沿用`tools/typescript/README.md`；真实Chrome脚本沿用`integration/verify.cjs`、`ger/verify.cjs`。实际环境同[C04/C05](BATCH_C04.md)。

## Not validated / Known limitations

Windows、Android/WebView真机、真实游戏未验证。本批只处理原32个源码插值命中的DOM/CSS两项，其他浏览器/业务源码指纹还须逐项处理，不能据这两个无副作用Probe推断整体安全。旧DOM运行时合同未被类型声明升级成完整观察保证。源码文本格式变化仅发生于这两个结构探针；未改变任何旧业务摘要合同。

完整Node TS、其余浏览器边界、CLI/Action/Journey/Evidence、GER与适合的开发工具仍继续。原始游戏JS、合成坏输入、Python/Kotlin/Markdown按职责保留，不能以改后缀充数。
