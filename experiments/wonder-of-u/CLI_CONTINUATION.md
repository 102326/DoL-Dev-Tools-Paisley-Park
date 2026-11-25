# Wonder of U · 正式 CLI 接续验证

从研究提交 `82487b6505db923d3340df42b188505ea60fc34e` 接续，正式基线为 `a8b1dfa235c6ece17d10ef4a3f47c5f658832449`。本轮使用 macOS ARM64、Node 26.13.0、Python 3.9.6 和独立 Chrome 157.0.8103.79。

## Delivered

- 研究分支的正式构建入口提供 [`dev-receipt`](../../docs/DEV_RECEIPT.md)，可从 CLI 帮助、Skill 和研发文档发现。原回执所有权移入 CLI，实验脚本保留薄入口。
- `status` 读取历史。两个只读 `verify` 分开核对源码与当前文档实载，返回下一步与清晰的退出码。源码需要重建时，保留旧制品和旧通过记录。
- 配方同时支持单 ZIP 与成对 ZIP。每个角色分别封存 ZIP 和成员字节，绑定原 Chrome 文档后对照选定脚本文本。派发意图、确认、实载和行为各自独占写入，使用 7.2 原有目标绑定与 Evidence。
- 核对现用的 7.2 CLI 构建流程 `node tools/typescript/build.cjs --write-production`。两个项目的浏览器脚本通过生成后的 `scripts/dol-dev.cjs` 实际调用回执入口。

## Validated

### Sticky Fingers 两轮

固定 E35 `ab94d07bf2a54d3635ac5731f4a5d00eafe1ad1b` 的诊断组件用项目 esbuild 构建至中性页面。第一轮修补收起诊断后未回焦的问题。第二轮让来自实际读取且成功刷新的诊断给出明确完成提示。两轮在同一隔离 Chrome Profile 和目标中完成，各只派发一次。

1. `source-find` 定位真实组件，原回调导致焦点未返回标题。构建第一份候选后，用 `dev-receipt deploy-begin` 记录、重载一次，按原目标 `pc-bind`。派发 ACK 模拟丢失，`check-load` 和 7.2 `pc-action` 仍能独立核对脚本与回焦。实载相同可直接进入行为核对。
2. 修改第二轮参与文件后，第一轮制品仍在旧文档运行。两次处于同一 HEAD 且均 dirty。显式 `verify-current` 退出 2，给出 `source: needs-rebuild`、`currentLoad: matched`、历史 `behavior: passed` 和新回执重建建议。验证过程没有重载或部署，第一轮的 build/load/behavior 文件逐字节一致。改未参与的 README 时源码仍为 matched，移走参与文件的负对照返回 unknown。尝试为漂移的旧候选建立派发意图时返回 `BUILD_SOURCE_DRIFT`，未写下意图。
3. 换临时 Codex 会话接手。它从正式 CLI 读第一份回执、核源码并直接创建第二份构建回执。隔离浏览器通过三个固定操作执行同一正式 CLI 的派发记录、实载核对和行为核对，实际观察到点刷新后出现「已刷新。」。第二份回执显示 source/load matched、behavior passed。该会话拥有本次测试输出目录的写权限；浏览器重载仍由夹具控制，操作接口保留真实 CLI 输出与标准 Evidence。

同时保留实载不明、旧制品、错代文档、中文反例和旧行为 Evidence 的拒绝验证。第一轮制品 SHA-256 为 `823d023071b9de41c76d4d2a63abd0da2a9f7b4f38154b1e0d2c9490bc633bb7`，第二轮为 `acfb79a17d0159e048c22cc6f26cb5b80fefe6c7a80712a7dab9044d879ce28c`。

### Soft & Wet 成对制品

对公开固定 UI 5.0 研发源码 `f24a0dfb0d03f015993899c2eb9bf09d924e62ae` 使用独立稀疏 checkout，跳过发布素材和文档媒体。该提交的 UI 包内版本仍为 `4.5.1`，Host 为 `0.1.5-experimental`。用锁定依赖、原项目 tooling 构建器、`scripts/build-framework.mjs` 和正式玩家包入口 `scripts/package.py` 产生两份原 ZIP。

| 角色 | ZIP SHA-256 |
| --- | --- |
| StoneFreeHost | `977ca493629d1fd71ea47e04eae3b7ca7e1b9fdef6ba20a624fbe78993680369` |
| DoLGameUI | `3932a415a56d7f4564e1e51ace73bf7e7392843ed72be01dbf8fecf23d4c68ef` |

先运行 UI 自带的 `prototypes/host5/panel-budget/workspace-mixed.mts HOST_ZIP UI_ZIP`。其真实组件用例通过了窗口动效反向、拖动取消、焦点恢复、原生动作与释放等检查。随后同一项目原生的 `createLabServer` 提供中性起始文档，`readPackage` 读取 boot 所列的实际内容。用隔离的 Paisley Park HTTP 把两个真实脚本放到不同的可核对 URL，再用同一 `dev-receipt` 流程处理成对制品。

在 Host 正确、UI 文本有一个受控差异的负对照中，两个角色分别报告 matched 和 mismatch，整体不会通过。在原 Tab 重载并显式绑定后，两份真实代码均通过实载核对。通过 7.2 `pc-action` 打开真实设置、进入材质页并关闭玻璃模糊，探针读到开关为 false、面板滤镜从 `blur(24px) saturate(0.78)` 变为 `none`，Host surface 能力可用。该结果进入正式回执的独立行为验证。

### 复跑入口

先准备 Node 依赖和绝对路径。Sticky 使用本人新建的干净 E35 worktree，UI 使用固定提交的独立 checkout，选择空输出路径和空闲回环端口。UI checkout 应包含源码和正常打包所需的公开文档，打包槽位需为空，既有 ZIP 可以先保留到另一输出目录。构建器会拒绝覆盖。

```sh
node tools/typescript/build.cjs --check
node scripts/dol-dev.cjs dev-receipt --help
node --test tests/dev-receipt.test.cjs experiments/wonder-of-u/receipt.test.cjs experiments/wonder-of-u/android-shell/shell.test.cjs
WONDER_TWO_ROUNDS=1 WONDER_CODEX=ABS_CODEX node experiments/wonder-of-u/sticky-browser.cjs ABS_STICKY_WORKTREE ABS_PROJECT_WITH_ESBUILD ABS_CHROME NEW_ABS_OUT 18814 python3
node experiments/wonder-of-u/ui50-browser.cjs ABS_UI50_CHECKOUT ABS_CHROME NEW_ABS_OUT 18815 python3
```

CLI 漂移回归在旧入口缺少该能力时失败，生成正式入口后的用例通过。定向测试共 8/8，其中无关 README 与本地 Evidence 都纳入负对照。原 Node 全套 667 通过、1 跳过，TypeScript 产物一致性和类型合同检查均通过。两轮 Chrome、成对制品 Chrome 和回环服务均在实验结束后关闭。原始运行目录、浏览器 Profile、项目生成 ZIP 和临时对话保持本机。

## Known limitations and Not validated

- Sticky 的两处源码修补发生在验收工作树。回执实验的历史证据归属于固定组件与中性页面。UI 的配方以保守构建清单覆盖正式打包输入，包括实际收入包内的文档。这组证据未覆盖未声明的新输入、外部依赖安装字节变化或采样之间编辑后还原。
- 成对核对证明两个原 ZIP 的来源和绑定文档内的代表性脚本。UI 回合跑真实的设置组件，生命周期和设置证据属于此中性启动路径。真实 ModLoader 安装、早期脚本和补丁在实际游戏中的执行分别验收。
- Windows 路径与文件系统、实际 Android APK/设备和真实游戏加载链留到家庭端。[独立 Android 接续](android-shell/README.md)记录测试壳、同平板指标和 renderer 重建的验收步骤。
