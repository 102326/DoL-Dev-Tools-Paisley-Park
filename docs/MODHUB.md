# ModHub调查：先用已有检查，再补执行证据

适用于ModHub1.7.0，固定源码`5963b211c0243b9fd5468d65f18720fe1a7bd153`。本页依据下载的作者正式附件、固定源码，以及本轮平板的加载成员和菜单入口验证；见[来源记录](knowledge/latest-mod-sources.md)。下列检查器机制来自源码审查，本轮未运行整套兼容性扫描。

## 根据问题选入口

| 当前问题 | 优先复用 | 仍需补的证据 |
| --- | --- | --- |
| 包是否安装、启用、顺序与声明是否满足 | ModHub管理页、已有兼容性检查及原Loader列表 | 配置已保存不等于新文档已执行；另核对实际加载成员和功能。 |
| 哪些Mod声明修改同一目标 | ModHub兼容性检查中的目标、规则来源及未覆盖项 | 是否命中、变换次序、最后发布与双方功能需要现场证据。 |
| 具体界面无法使用 | Paisley Inspector、原生DOM/Console及相关原控件 | 结合加载的实际包缩小原因；不先做全量包扫描。 |
| 需要调查启动时发生过的修改 | 已有记录；必要时用受控的[启动观测实验](../examples/patch-provenance/README.md) | 先核对源码、选择条件、生命周期和扰动；普通Integration不能补造过去。 |

本轮原生管理页入口已通过，不等于市场安装、时间点恢复、AI或远程协助等功能已经验证。这些功能不是普通只读诊断的默认步骤。

## 检查器实际能说明什么

[modhub-compat.js](https://github.com/JohnLiao501/ModHub/blob/5963b211c0243b9fd5468d65f18720fe1a7bd153/src/javascript/modhub-compat.js)分析Manifest依赖、Addon声明、TweeReplacer内联/外置参数、原生ReplacePatch和ReplacePatcherAddon目标。它把无法读取、不支持的插件、重复声明及规则上限等情况放入coverage；同目标关系为review，不直接判兼容失败。相关错误日志是调查线索，不是因果证明。

`addonPlugin.modVersion`的插件接口版本与提供者包版本分开处理。加载器没有对应接口版本时保留未核对；只有保存配置、运行Manifest与提供者对应时，才尝试核对本次实际插件注册。不能用“加载阶段结束”替代初始化和功能证明。

源码会把拟安装组合标为projected，并比较保存配置与运行现场。拟安装报告没有执行补丁；不能把候选通过写成已经安装或业务成功。目标按资源类型和名称分组，不对动态JS推演成功。

本轮[共享侧栏负对照](knowledge/shared-caption-coexistence.md)给出了另一层实际证据：共享锚点仍保留、备用入口有意退让，最终两方原生入口可用。后续遇到类似声明，应先调查这些条件，不因目标相同就禁用某Mod。

## 脚本接续时的边界

当前内部入口为`window.modHubCompatibility.check/enrich/signature/assertCurrent`，不是Paisley或ModHub的稳定公共SDK承诺。调用前阅读所选版本及其依赖；不要凭函数名认为整个调用链天然只读。

`assertCurrent`依赖同一页面内WeakMap登记的原snapshot对象，并重新核对包体、启禁列表、顺序、候选和目录声明。序列化后再造的对象没有该记录；返回的signature也不能代替这次核对。它不是Paisley的Document/frame/loader绑定，不能据此让旧CDP持有者自动跟随重载。

整套检查会读取包体并计算摘要，也会关联日志和已有目录声明。局部DOM或两个已知资源已经足够时，不为形式统一重复扫描整个Mod集合。

核心检查脚本的固定源码SHA-256为`6f49be15e6f027b66eb2e7e93197bc88fb1a363cd6e53b850ba460da73dba33f`，正式附件及实际加载成员为`f8ec3a582886fce163c0828e5030958f4cbe1a6b77409c9dda7c5fc1d43c9711`。首次直接相等断言失败；逐字节对照确认附件多出410个CR，规范为LF后完全一致。源码与发行成员不是相同字节，不省略这项差异，也不凭同版本号宣称对应。该核对不保证未来版本行为。

现有标准检查已能覆盖声明调查时优先使用；只有执行、发布或业务证据不足时再补相应观测。无需把ModHub内部代码复制进Generic Diagnostics，缺少ModHub时通用工具仍照常工作。
