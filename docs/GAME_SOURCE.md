# 游戏源码：按任务查找

调查原版引擎、widget、Passage或原生行为时使用。本页提供上游入口与查找方法；普通CSS、Console、安装排障或只需现有Evidence的问题，可直接走原有路线。

## 上游入口

- Vrelnir维护的[官方源码仓库](https://gitgud.io/Vrelnir/degrees-of-lewdity)。
- 公开Git地址：`https://gitgud.io/Vrelnir/degrees-of-lewdity.git`。

入口、分支和目录可能变化，按任务当时的上游状态核对。本页不固定“当前游戏版本”，不把默认分支HEAD、开发分支、发布附件和实际加载的游戏视为同一输入。入口迁移时修改本页及引用即可，无需向Runtime增加版本分支。

## 先确定正在解释哪份代码

1. 从用户已指定的测试目标、已有Evidence或获准的只读观察确认实际游戏版本及来源。Tools自身的`--version`、Android包装App版本和Mod版本不能代替游戏版本。版本来源缺失或冲突时保留unknown，参见[诊断说明](DIAGNOSTICS.md)。
2. 核对上游可用分支、tag和commit，再根据实际问题选择对应revision。查询HEAD可用：

   ```sh
   git ls-remote --symref https://gitgud.io/Vrelnir/degrees-of-lewdity.git HEAD
   ```

   该命令只读取引用，不获取工作树；它不能证明某个发布版本对应哪个commit。需要时另查上游tag、发布记录或构建来源。网页搜索索引和默认HEAD只提供线索；找不到版本对应关系时不猜。
3. 优先按固定commit在线查看必要文件，或复用一份已核对的本地源码。任务确需更多文件且环境允许时，再由Agent按需获取到独立目录。无需用户预先维护原版、Mod版两份源码；已有Mod项目按其自身来源调查即可。
4. 记录本次使用的仓库、revision、相关文件及与实际加载版本的已知关系。现有工程记录足够就直接引用，不新增全局源码索引、版本注册表或固定表单。拿不到精确版本时仍可进行独立Debug和源码调查，只限定对应结论。

不得因浏览网页遇到403或缺分支，就把第三方镜像静默替换成官方输入；说明访问限制，再选择已有授权源码或其它正常公开入口。不自动登录或绕过网络策略。

## 从问题找代码

从当前堆栈中的函数/文件、原控件handler、widget/Passage名、公开API或具体错误开始。先看所选revision实际文件列表，再按符号搜索；不要把某一版本的目录或全局对象当稳定接口。

以下占位符需替换为已核对的源码目录和符号；命令不要求建立第二份源码：

```sh
git -C "REVIEWED_SOURCE" status --short --branch
git -C "REVIEWED_SOURCE" rev-parse HEAD
rg --files "REVIEWED_SOURCE" -g '*.js' -g '*.twee' -g '*.ts'
rg -n --fixed-strings -g '*.js' -g '*.twee' -g '*.ts' -- "REVIEWED_SYMBOL" "REVIEWED_SOURCE"
```

按问题读取定义、调用点、注册/加载位置及相关测试；已有精确符号时不必先遍历全树。定位到原版实现后，再核对Mod覆盖、加载顺序和运行时实际采用的函数。源码存在、构建成功与现场实际执行分别举证，见[开发Reference](DEVELOPMENT_FLOW.md)及[Workshop](WORKSHOP.md)。

## 有界候选工具与接续

先核对已解析CLI的 `--help` 是否列出 `source-find`；旧发行包没有该入口时继续使用上述 `rg`，不为普通源码调查强制升级工具。本开发分支提供：

```sh
node RESOLVED_CLI source-find --root REVIEWED_ABSOLUTE_SOURCE --file QUERY_JSON --out NEW_JSON
node RESOLVED_CLI source-find --root REVIEWED_REPOSITORY_ROOT --revision REVIEWED_COMMIT --file QUERY_JSON --out OTHER_NEW_JSON
```

查询文件遵守 [Schema](../schemas/source-find-query-v1.schema.json)，只含 `schemaVersion`、`clues` 和可选 `limits`；root/revision由CLI明确提供，不在JSON中重复或覆盖。例如用工具本身的源码练习：

```json
{
  "schemaVersion": 1,
  "clues": [{"kind":"symbol","value":"getModListNameNoAlias"}],
  "limits": {"maxResults":20,"contextLines":1,"timeoutMs":10000}
}
```

支持 `passage`、`widget`、`text`、`selector`、`event`、`symbol`、`path` 七类字面线索。可组合最多8个线索，每项1–512个Unicode码点且非纯空白；不是正则或执行表达式。建议把查询文件和历史结果放在被检索源码根之外，避免把自身查询当作候选。必要时缩小源码根或线索；不把无结果认定为功能不存在。工具不下载源码，不执行构建/游戏，不要求设备或GER Goal。

- `NEW_JSON.selection` 保留所选绝对root、原revision及实际limits，`data.clues`保留线索，便于下一次任务接续；这些成功结果可能含私人路径和源码，不默认公开。固定revision以 `data.source.commit` 的已解析commit为身份，不把原分支名称当稳定输入。
- `data.candidates` 提供相对文件、1起始行/Unicode列、SHA-256、有界上下文、定义/引用/路径依据。分数只是启发式，源码命中不证明现场采用。上下文每行 `text` 最多240码点；长行的 `truncated` 表示原行被截断，`…` 标记省略的前后内容。命中行围绕最早的行内线索位置截取，仅有路径命中时从行首截取；其他上下文行从行首截取。路径和行内线索同时命中时，候选列仍保留路径命中的第1列；每行的 `column` 是所显示原文的1起始 Unicode 码点列（不含标记）。线索最长512码点，超过窗口时可能只显示部分匹配内容。
- `complete=true` 只表示所选合格文件范围的查找完整；不包括隐藏文件、依赖、产物、私人存档/日志或符号链接。编码不支持、读取/枚举/文件/字节/结果上限会保留partial原因。完整无匹配为 `outcome=none`。
- 成功完整查找退出0；`partial`仍保存可用结果、退出2，Agent必须读取 `partialReasons` 再决定是否缩小范围。输入、源码或输出失败退出1，有限错误给出发生阶段，不回显输入/原异常。不自动重试或换源码。
- 同父目录暂存与独占硬链接发布完整结果，已有文件/符号链接/并发占位不覆盖。父目录必须已存在；文件系统不支持硬链接时明确失败，不退回可能留下部分文件的拷贝。发布确认或清理未知时保留输出/无法确认的残留，不清理其它目录。

默认限制50结果、2000次文件尝试、8MiB读入、上下文前后各1行、10秒。上限和可选值见Schema。时间限制是协作式检查，不是OS硬实时抢占；工作树也不是跨文件原子快照。工作树commit只是基线，dirty保守包含ignored文件；候选摘要绑定实际读取字节。固定revision模式读取Git对象、禁用replace refs、不checkout/reset；需从仓库根调用。已有精确商店Source Link合同保持独立，候选结果不冒充matched。

此入口以严格检查的TS维护、以预生成CommonJS运行；运行无需TypeScript编译器、类型擦除、npm开发依赖或额外loader。开发/CI检查源码与运行产物一致，原生TS保留在实验对照中。Windows文件系统、真实Android和非商店真实游戏源码尚未由本轮Mac验收；普通源码定位可以先做，实际加载验证仍按目标项目合同执行。

## 内容与执行边界

游戏源码不随Tools或Skill分发，第三方许可不由Tools的MIT覆盖。链接和引用核对不等于授权下载全部资源、构建、部署或执行游戏；源码获取仍遵守任务的数据范围与当前环境限制。禁止游戏内容的环境只做允许的元数据/文档工作，不以研究为由下载剧情、图片或存档。

需要源码不能定位时，报告具体缺口及已查范围，不要求负责人反复搬日志或手工维护源码副本，也不以宽泛“请给更多信息”替代可由Agent完成的查找。
