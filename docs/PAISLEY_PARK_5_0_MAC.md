# Paisley Park 5.0 Mac 先行原型

2026-10-12。本轮已在指定 Mac 打通真实 Toolbar 同源 Vite 预览与薄 UI Source Link。可以快速编辑、热更新并把选定组件与当前源码快照关联；不是完整 5.0 发布或真实游戏自主修复闭环。

## 基线与路线

独立 clone：Tools `DoL-Dev-Tools-Paisley-Park-5.0-mac`，分支 `research/paisley-park-5.0-mac`，正式 4.0.1/tag/main 为 `cf405fdf132468a8ca9dbb8a3a2c7efbf8e874b1`，Bites the Dust。UI `DoL-Game-UI-5.0 Mac 原型`（本轮 clone 为真实空格/中文路径验收改名），分支 `experiment/paisley-park-component-lab`，组件基线 `1cf35e901cbb7c78aebc0555d40bb10c6eca6dfc`，2.5.0；未采用早期 main 或接管 UI 2.6。

旧 ACT4 本地工作区已按用户追加授权删除，未触及其远端、全局 Store/未知记录或私人 Profile。本轮不续写 ACT4/PC Gameplay Host；不改造 4.x GER、版本号、正式分支或全局 Skill。所用 Tools/Skill 是上述新 clone 的明确入口与 `.agents/skills/dol-dev-tools-paisley-park`，本地 resolver 已确认 4.0.1，无旧全局解析器重定向。

实际环境：macOS 27.0.1 / ARM64，Node 24.18.0 / arm64、npm 11.16.0、Apple Git 2.54.0、已安装 Chrome 155.0.8059.40。Python 3.12.14 选已有 Codex bundled runtime；系统 python3 是旧版本且无 python 别名，未升级全局工具。UI 锁定 Vue 3.5.43、Vite 7.3.6、Tailwind plugin 4.3.3、Playwright 1.63.0；Tools 仍 XState 5.33.2。两 clone 各自按锁 `npm ci --ignore-scripts`，未新增生产依赖或下载浏览器。

## 现在怎么用

在 UI 工作区运行 `npm run lab`，访问终端实际输出的 loopback URL（默认 127.0.0.1:5175）。切普通、窄/紧凑、长状态场景，改变默认分类或展开详情，内存回调在页面可见。编辑 `src/shop/Toolbar.vue` 或 `src/shop/style.css` 实际热更新，无须运行正式 main/startShop。UI 的 `component-lab/README.md` 有完整启动与 Windows 接续命令。

```
node /ABS/UI/component-lab/source-index.cjs --out NEW_INDEX.json
node /ABS/TOOLS/integrations/soft-and-wet/source-link.cjs --root /ABS/UI --index NEW_INDEX.json --clue CAPTURED_CLUE.json --out NEW_RESULT.json
```

CLUE 从 Lab 实际 owned host 的线索面板保存；INDEX/RESULT 必须新文件。Source Link 是可选 Soft & Wet 本地 Recipe，不是新通用 Inspector 或 Runtime Integration，不要求每次 Debug 都经过它。

一次真实联合成功输出（相对路径摘要）：

```json
{"status":"matched","reasons":[],"source":["src/shop/Toolbar.vue","src/ui/GameButton.vue"],"loadedArtifactIdentity":"not-attested"}
```

同 HEAD 修改 Toolbar 后，旧索引的结果：

```json
{"status":"stale","reasons":["covered-inputs-changed"],"changedInputs":["src/shop/Toolbar.vue"],"ordinaryDebug":"unaffected"}
```

新索引与旧 runtime clue 也报告 stale；刷新后恢复 matched。旧 Git revision 有独立负例。相同 HEAD 的不同 dirty 字节由明确输入摘要区分，不靠版本号证明一致。

## 新增、复用与生产边界

- UI 新增独立 HTML/App/Vite 配置和 producer；直接 import 正式 Toolbar/GameButton，三组输入全部来自真实 props。回调只更改内存，不写偏好、执行 Wikifier 或假造列表业务。
- 复用已有 toolbar role 语义及 theme/shop 样式；从 combat CSS 提取同源 `cu:*` utilities，不启动战斗逻辑。Lab 保留选定样式的生产相对顺序与祖先/theme 条件，不声称包含全游戏 CSS。
- 索引覆盖列明组件、候选样式、父层接线、Lab 与配置/锁文件，记录 Git revision、dirty、每文件原字节 SHA256、稳定 component ID、当前文档实例和回调候选。不归一化换行掩盖字节差异，不证明整个项目或运行制品。
- consumer 独立复算获准 root 的字节并核对 clue/index；限定相对路径、真实路径、文件数/大小，拒绝越根和敏感路径（包括符号链接）。不把共享索引变成外部路径读取指令；输出投影不携带任意 metadata 附加正文。
- `matched` 只说明所列输入与线索适用；组件归属依据 Lab-owned 标记，源码/样式为候选，事件仅证明 Lab 回调，运行制品 not-attested。解释属性仍需实际匹配规则/计算样式。Git 不可用时无字节差异为 partial；已知字节变化仍 stale 并保留事实，不弱化为匹配。
- 普通 Mod ZIP 仍显式白名单。Lab 构建输出位于 ignored `tests/artifacts/component-lab-dist`，不清理 dist。开发入口、源码、索引、大日志与 maps 不进入普通包。

## Validated 与真实边界

入场 UI production build/typecheck 通过；Tools 明确入口 --version 返回 4.0.1，相关 CLI/Integration 基线检查通过。开发过程中实际遇到的 python ENOENT 已修：`scripts/package.cjs` 选择已有解释器，支持 DOL_PYTHON，验证 >=3.10；原打包单元测试复用同一选择，不修改全局配置。

实际检查：

- `npm run lab:check`、`npm run lab:build` 通过。没有用 preview 代替开发 HMR。
- `DOL_LAB_CHROME=EXPLICIT_CHROME DOL_LAB_TOOLS=SELECTED_TOOLS npm run lab:test`：13 项通过，实际 Vite + 隔离 Chrome、三场景、分类/展开参数、键盘/aria-controls/Escape、代表性 390/900 viewport、container 边界附近、组件/CSS 编辑→可见→恢复、index/clue stale→刷新、根外 fs 403、无游戏主入口。浏览器使用 Chromium sandbox，禁止外部 origin 请求。
- producer 两项合成 unit 通过，覆盖 same-HEAD dirty 和根外/敏感 symlink；consumer 与相关 CLI/Integration 共 12 项通过，含有效/旧 revision/dirty/丢文件/Git 缺失/Unicode 空格/非 root cwd/防覆盖/相对与 canonical 敏感路径/附加正文投影。没有测试真实凭据或公司文件。实际 UI clone 含空格/中文，并从非 root cwd 启动真实 Lab 验收，不只依赖模拟路径字符串。
- `npm run build` 与 `DOL_PYTHON=COMPATIBLE_PYTHON node scripts/test-unit.cjs`（原 10 个独立脚本）通过；`node scripts/package.cjs` 生成并检查 19 个 ZIP 文件。源码新旧 production JS/CSS **逐字节相同**：JS SHA256 `d97239e1638e722f1d5800da8bacf8980fa7104d21a54fdc8e05efebd5bb31be`，CSS SHA256 `160ab2dbcdedea5f8e59154a5c1253f81e70a921abff4e8f794e46918e79019e`；无 Lab/index/map/本机路径 payload。
- 只恢复本轮临时 component/style 编辑；测试关闭自身 browser/Vite，保留本地 ignored 截图、index/clue/results 与失败记录。依赖、dist 与测试证据本地保留，不公开上传。

初次实验观测：serverReady 265ms，首渲染含 browser/编译 2346ms，component HMR 103ms、恢复 75ms、style HMR 99ms。后续缓存运行有差异，最终验收 json 记录实际值；这是单机观测，不是统计性能承诺。普通 Vite build 阶段入场为 1.43s，不含全部类型/打包；没有测 Android 完整部署，不计算加速倍数。

独立代码审阅曾复现 consumer 同根敏感 symlink 与 producer 越根 symlink 两个 P2。新增合成测试先 red 再 green，在 hash 读取前校验 canonical 目标；已关闭。没有用 Vite 的 fs.allow 冒充 Node producer 的读取保护。

## Not validated / Known limitations

Windows 真启动/PowerShell/.cmd、Android WebView/触控/分屏、Safari/WebKit、其它 Mac 架构、真实游戏/Mod 加载与自主 Bug 修复未验收。手动 narrow/compact 只证明组件模式；滑杆与 viewport 证明几何，不证明正式父层自动宽度检测。Source Link 首轮只覆盖 Toolbar owned host，静态候选不能定位任意 DOM/第三方 handler，也不证明源码候选就是故障原因。

正式产品接口/业务未改；没有新的 UI Bug，不把 HMR 技术实验叫 Bug 修复。2.6 后续修改 Toolbar/样式时应比较上述输入，刷新索引并定向继承，不自动合并浮动分支。

## 交接与范围内 Done

本轮 Mac 两个有限原型可用，满足 scoped Done。两个本地研发分支和限定基线→提交 bundle 用于回家继续；提交身份在最终交接结果列明。bundle 仅源码历史，不含 node_modules、浏览器缓存、索引运行数据、Profile、SQLite、截图或公司文件。没有推送、PR、Tag、Release 或 5.0 版本冒名。

回家先检出本地提交，按锁安装本平台依赖，显式选 Chrome/Python，运行 Lab/局部测试与 Source Link；之后再在授权当前 UI/游戏目标验证实际父层、原生事件、加载制品和 Windows/Android 接缝。本轮不创建第二 Inspector/Runtime、Storybook 平台或游戏模拟器。
