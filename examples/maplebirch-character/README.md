# MapleBirch Character：固定源码的缓存合同实验

执行固定 MapleBirch5.4.3 提交 `4b4b6e26e934d2e848058f21dfa1df0f71cc455d` 的真实 `Character.use`、`patchCanvasModel`、`guarded` 和 object 工具函数。只用 TypeScript 转译类型；原生 CanvasModel、缓存及宿主 lodash 接口使用受控替身。没有构建整个框架、运行 SugarCube、渲染图片或访问设备。

```powershell
node examples/maplebirch-character/verify.cjs REVIEWED_MAPLE_ROOT TYPESCRIPT_JS DEPENDENCY_ROOT NEW_OUTPUT_DIR
```

四个参数都是路径，占位符不能直接运行。DEPENDENCY_ROOT 是已有独立实验依赖目录，含审查过的 lodash4.17.21；脚本不安装任何依赖。输出目录必须不存在。实际执行上游代码有 Node 权限，不是安全沙箱。

五项断言检查：新模型采用局部覆盖且保留原 showfn、已有缓存的同名层不被追认覆盖、迟到的缺失层可加入缓存、后续注册影响新模型、默认main目标不改变其它模型。输出固定提交、源码/方法摘要和替身边界；源码有未提交改动或提交不符即拒绝，不自动下载替代版本。

2026-10-16 在Windows Node24.19.0、TypeScript5.9.3运行通过，结果 `artifacts/maple-character-contract-001`。随后将输入未被修改的断言改为检查实际传给构造函数的同一对象，结果另存 `002`，不覆盖首次记录。它证明这些固定方法在明确替身下的语义，不证明真实原生缓存的全部生命周期，也不外推到平板上加载的MapleBirch5.4.2。

开发者入口见[MapleBirch专业参考](../../docs/MAPLEBIRCH.md)。本例不提供通用缓存清空、角色状态修改或自动修复接口。
