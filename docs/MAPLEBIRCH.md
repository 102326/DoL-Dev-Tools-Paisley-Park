# MapleBirch 消费者开发：先确认代码到了哪一层

适用于调查使用 MapleBirch 的 Mod。先分清你要构建框架本体，还是构建依赖它的消费者；现有消费者问题不要求先重建整套框架。

## 本页依据

| 证据 | 可以使用的结论 | 不能代替的验证 |
| --- | --- | --- |
| 公开MapleBirch5.4.3，固定提交 `4b4b6e26e934d2e848058f21dfa1df0f71cc455d` | 本页列出的Character接口与源码方法实验 | 当前设备执行的5.4.2、完整框架构建或真实Canvas生命周期。 |
| 本轮LyraMouthCompat0512130.1.2独立构建与原绑定读回 | 指定消费者成员、注册函数、侧栏采用、图片解码及路径函数结果 | 全部脸型、未来5.x、整个ZIP字节或5.4.3设备兼容。 |

第三方版本和生命周期会变化。先确认当前加载版本、源码及产物身份，再决定哪些事实仍适用。历史经过见[嘴部案例](knowledge/maplebirch-mouth.md)，本轮构建经过见[字节差异案例](knowledge/build-byte-drift.md)。

## 按问题选择下一步

| 现象 | 先核对 |
| --- | --- |
| 脚本没有接入 | Manifest依赖、真实加载版本、消费者自己的版本门禁、实际执行成员；安装不等于执行。 |
| 注册了，但模型没采用 | 目标模型名、注册时机、模型是否已缓存、后续是否有其它消费者覆盖。 |
| 模型采用了，但图片不显示 | 原 showfn、路径函数实际结果、资源是否来自当前游戏、图片是否解码；不要先改角色变量强制显示。 |
| 同版本重建摘要不同 | 根配置、锁文件、工具版本、调用CWD和真实差异；版本号相同不是制品相同。 |

原绑定失效时显式新绑定，不能沿用旧Document身份。使用现有Inspector/CDP和目标项目构建即可，不为一次读取创建GER Goal或安装新的框架管理平台。

## Character注册与缓存

在固定5.4.3源码中，`char.use(layers, target?, options?)` 注册图层，默认target为main，返回Character自身。它没有返回一个可调用destroy的图层句柄。target可为名字、名字数组或谓词；不要把某次内部layers数组的位置当成公共稳定ID。

`char.use('pre' | 'post', handler, target?)` 是另一种处理器入口，不等于图层注册。只替换资源路径时，沿用已验证消费者的局部字段方案；无需求时不要接管原 showfn、业务变量或原处理器。

源码中的 `patchCanvasModel` 对新构造的模型合并匹配图层，后注册的同字段可以覆盖先前值；原生pre/post之后再调用框架处理器。已有缓存另有路径：只补模型缺失的层，不把已有同名层一概覆盖。固定源码实验已经核对这一区别，不能把“注册成功”直接解释成“当前缓存已更新”。实际原生create/缓存实现仍需在目标版本确认。

本页没有提供清空 `Renderer.CanvasModelCaches` 的通用修复指令。先定位构造/复用边界，再按目标引擎原生方式验证；若需要缓存实验，单独记录它改变的条件，不能靠删除缓存让旧断言显得正确。

## 构建与结果证明

消费者沿用自己的源码、根配置、锁定工具和原打包脚本；类型引用不要求把框架Runtime复制进消费者。本轮消费者恰因遗漏根tsconfig导致JS字节不同，补齐真实输入后才对应现场。

固定5.4.3框架工程使用Bun/rslib，package.json里的build、package与verify有各自职责。本轮没有安装Bun或构建框架本体，不能把消费者构建成功写成框架构建通过。也不要把release、publish脚本当作普通验证命令执行。

验证由当前缺口决定：加载成员摘要、实际注册、最终模型采用、原生字段保留、资源解码和代表性结果各自证明一层。无需每次执行全部检查；某层未知时，明确停在哪一层，不用下一层猜测补齐。

## 源码与可复现实验

- [固定Character源码](https://github.com/MaplebirchLeaf/SCML-DOL-maplebirchFramework/blob/4b4b6e26e934d2e848058f21dfa1df0f71cc455d/src/modules/Character.ts)：use、guarded、patchCanvasModel。
- [固定package.json](https://github.com/MaplebirchLeaf/SCML-DOL-maplebirchFramework/blob/4b4b6e26e934d2e848058f21dfa1df0f71cc455d/package.json)：框架版本、工具与脚本；不是当前设备制品身份。
- [固定源码方法实验](../examples/maplebirch-character/README.md)：五项受控合同检查，明确原生模型替身、非框架构建的边界。

这些资料用于选择调查方法，不提供新的执行授权，也不结清历史Unknown。
