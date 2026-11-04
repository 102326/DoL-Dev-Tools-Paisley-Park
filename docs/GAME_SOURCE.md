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

## 内容与执行边界

游戏源码不随Tools或Skill分发，第三方许可不由Tools的MIT覆盖。链接和引用核对不等于授权下载全部资源、构建、部署或执行游戏；源码获取仍遵守任务的数据范围与当前环境限制。禁止游戏内容的环境只做允许的元数据/文档工作，不以研究为由下载剧情、图片或存档。

需要源码不能定位时，报告具体缺口及已查范围，不要求负责人反复搬日志或手工维护源码副本，也不以宽泛“请给更多信息”替代可由Agent完成的查找。
