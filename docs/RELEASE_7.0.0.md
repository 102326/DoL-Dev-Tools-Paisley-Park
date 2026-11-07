# DoL Dev Tools 7.0.0 — Gold Experience（黄金体验）

创造能力，赋予行动。

本页是本地候选的更新说明，7.0 尚未在 GitHub 发布。

原 Paisley Park 从这一版起使用新名称。你仍可以用原来的 Skill 标识和启动命令，不需要改名、搬迁或重建已有执行记录。

## 在电脑上调查和验证

现在可以选择已安装的 Chrome，在独立测试 Profile 中打开获准 HTML，并明确列出允许提供的资源。选中页面后，同一套 Action/Journey、Gameplay Runtime 和 Evidence 可以继续工作。页面重载后，旧文档绑定会被拒绝，需要重新建立绑定，避免把动作送到另一个现场。

这不是接管日常 Chrome 的入口，也不取消浏览器或宿主工具的访问限制。具体用法见 [PC Runtime](PC_RUNTIME.md)。

## 找到当前版本的游戏实现

`source-find` 可以在指定源码工作树或固定 Git revision 中组合 Passage、文字、符号和路径线索，返回候选位置、上下文与摘要。达到查找预算或缺少 Git 对象时，结果会保留未覆盖原因，不会自动联网补齐。

源码命中仍需要和现场核对，不能把上游代码直接当成平板当前加载的 Lyra、汉化或 Mod 版本。见 [源码查询](GAME_SOURCE.md)。

## 继续使用已有开发流程

Android CLI、ADB、CDP、Mod 研究经验、Debug 和受支持 Gameplay 都继续保留。旧目标的执行记录丢失时，恢复命令会明确停止，避免创建一个空库冒充旧记录；历史未知结果不会自动结清。

内部代码改用 TypeScript 维护，工具包仍运行预生成 CommonJS，使用者不需要 TypeScript 编译器。Kotlin 探针保留为实验，没有加入生产工具包，也没有新增 helper 安装要求。

## 升级

7.0 需要 Node.js 26.0.0 或更新版本。将经核对的候选包解压到新目录，保留旧 Tools 和 Skill，按 [安装指南](SKILL_INSTALL.md#gold-experience-install)切换。普通诊断不需要 npm 依赖；使用 Gameplay 时，在新的 Tools 根目录按锁文件安装 XState。

本版不承诺全设备、全 Mod 或完整自主游戏支持。后台截图、历史账本恢复与其它未覆盖范围见 [当前限制](CLOSEOUT_7_0.md#known-limitations)。构建成功、包已加载和游戏业务正确仍需要分别证明。
