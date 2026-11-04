# 回家后的真实 DoL 验证

状态：**未执行**。这里是接续配方，不是 Windows 或真实游戏通过记录。先用短流程验证接入，再决定下一版集成。使用本机已有、获准的游戏测试副本与测试数据；公司 Mac 不下载或打开这些资源。

## 1. 固定现场与输入

保留本轮实验目录和原 ACT4 历史提交 `52a8893910c57ed420587c137472ffb008567b18`。当前 6.1 正式源码没有旧 Chrome CLI，不要在错误仓库调用以下命令。先核对本机 Node、Chrome executable 与版本；在历史仓库执行 resolver，再按 lock 安装依赖。

记录：Windows/Chrome/Node、DoL/ModLoader/SugarCube、实际 HTML SHA256、Mod 名称/版本/顺序/启用状态、图片/汉化资源、是否附加调试器、页面来源/完整测试 URL、所用 Profile 与 target/document。选择明确可丢弃测试副本；有已有测试存档时留只读原件，测试仅用副本，个人存档不在范围内。

```powershell
# PowerShell 7，变量路径由本机现场核对
$History = 'C:\reviewed\ACT4-history'
$Lab = 'C:\reviewed\source\experiments\act4-pc-20261104'
$Chrome = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
$Run = 'C:\reviewed\runs\act4-real-NEW'
Test-Path -LiteralPath $Chrome
node --version
node "$History\.agents\skills\dol-dev-tools-paisley-park\scripts\resolve.cjs"
New-Item -ItemType Directory -Path $Run
```

## 2. 选择已允许的接入方式

优先参考 The Hand 已成功的**独立本机 HTTP 测试环境**，明确建立该环境后再测试。仅服务专门的游戏测试副本目录，监听 127.0.0.1；不服务用户主目录或工作资料。若需图片/外部资源，必须在该测试目录中保留相对路径并记录加载结果，不能用资源缺失版本冒充原环境。

```powershell
# 独立终端，$GameTestRoot 只包含获准的游戏/资源测试副本
$GameTestRoot = 'C:\reviewed\game-test-copy'
py -3 -m http.server 18765 --bind 127.0.0.1 --directory $GameTestRoot
```

先确认 Python 已安装；未安装时不擅自安装，使用现场已审且可用的本地服务器。HTTP 与 file 的 origin/storage 不同，旧 file 存档不会自动迁移，旧页面有游戏不等于新环境有相同存档。

Codex 当前若有 Chrome tab 入口，按它提供的文档接新测试页或既有获准 HTTP 页；若只有原生 Chrome UI，则使用当前 URL/可见页重新识别。任一入口若明确拒绝，保存错误与拒绝范围，停止该目标；不能为了完成被拒绝的同一操作改入口、改协议或间接重放。此前被拒绝的个人 file 页面不作为本配方接管对象。

原 ACT4 的可直接复跑路径：

```powershell
$Cli = "$History\scripts\dol-dev.cjs"
$GameUrl = 'http://127.0.0.1:18765/REVIEWED_GAME.html'
node $Cli chrome-launch --executable $Chrome --url $GameUrl --out "$Run\browser"
$HostJson = "$Run\browser\host.json"
node $Cli evidence --host chrome --host-file $HostJson --out "$Run\initial-evidence" --scope '#passages' --environment yes --window-ms 500
node $Cli game-observe --host chrome --host-file $HostJson --out "$Run\initial-state" --gameplay yes
```

原 launcher 是 headless，不能声称可见启动已交付。可通过其截图/DOM 做受控 Action；另用已允许的 Codex 可见浏览器检查相同输入，两次 Profile 的状态分开。若要同一可见标签交接给 ACT4，需要额外验证明确 owned 的可见启动/target 桥，不接日常 Profile，不把本轮 helper 当通用浏览器所有权证明。

## 3. 真实短流程

首选 **Bedroom → 原生衣柜入口 → Wardrobe → 原生退出 → Bedroom**，使用明确测试新档或复制测试存档，不买卖/穿脱，不覆盖/删除真实存档。若现场版本尚未处于 Bedroom，先通过实际游戏 UI 建立测试场景，不调用 `Engine.play`、直接改 `V` 或伪造存档把场景跳过去。The Hand 的启动测量/Engine.play 调查可参考接入方式，不能替代这里的实际交互。

每一步先对照原 `SugarCube.State.passage` 与唯一当前 `#passages > .passage`，再选择现场唯一可操作控件；只使用当前观察得到的 selector，不预填跨版本 selector。先由 Codex 完成一次独立可见 UI 对照，然后在 ACT4 的独立测试数据上执行同一流程。

创建小预算 Goal，示例请求保存到 `$Run\reach-wardrobe.json`：

```json
{
  "name": "pc-reach-wardrobe",
  "mode": "gameplay",
  "description": "从获准测试卧室经原生控件进入衣柜",
  "goal": {"kind": "reach-passage", "passage": "Wardrobe"},
  "budget": {"timeoutMs": 180000, "maxActions": 4, "maxObservations": 16, "maxReplans": 8, "maxSpend": 0}
}
```

```powershell
node --experimental-sqlite $Cli game-goal-start --host chrome --host-file $HostJson --file "$Run\reach-wardrobe.json" --store "$Run\sessions.sqlite" --out "$Run\goal-wardrobe" --test-environment yes
node --experimental-sqlite $Cli game-session --goal "$Run\goal-wardrobe" --operation request --test-environment yes
```

现场 Codex 从返回的当前 Decision 选择真实衣柜控件，复制其完整协议/版本/revision/binding/epoch/request/session 身份及 actionRef，写获审 proposal；按原 CLI propose→dispatch 一次。不可只改 actionRef 而沿用旧 Decision，也不猜测 label 或 handler 身份。

```powershell
node --experimental-sqlite $Cli game-session --goal "$Run\goal-wardrobe" --operation propose --file "$Run\CURRENT-reviewed-proposal.json" --test-environment yes
node --experimental-sqlite $Cli game-session --goal "$Run\goal-wardrobe" --operation dispatch --test-environment yes
node --experimental-sqlite $Cli game-session --goal "$Run\goal-wardrobe" --operation status
```

核对：当前 DOM 与原 Passage 都是 Wardrobe；原 history/moment/lifecycle/业务 terminal 能被匹配 provider 验证；动作次数只一次，spent 0，pending false。保存实际时间/金额等前后值，允许其按原游戏规则变化，不能仅截图相似判成功。若版本签名或业务合同拒绝，记录具体 guard/reader，不放松原校验。返回 Bedroom 用新 Goal/新鲜 Decision，仍用同一测试 Store/Profile。

## 4. 中断、恢复与重新绑定

先在已结清且无 pending 状态做断开/重连，核对原 target/document、场景和数据。再针对一次受审普通导航测试中断：

- **派发前**：未 dispatch 即退出协调进程，恢复后检查无 effect，读取当前 Scene 再决定。
- **派发后 ACK 前**：现场通过可观察的原效果/执行边界确认后终止该 CLI 子进程，保留 Session/Store。无法精确打到窗口就写“该窗口未命中”，不靠重复点击制造样本。
- 新进程先 `status`，再按原合同 `resume`，核对原 attempt/terminal；只有原证据足够才 settled。重复 dispatch 应被原 pending 拒绝。原回执不可取得就保留 Unknown，不新建 Store 绕开。
- **刷新/导航**：原 host 必须拒绝旧合同。新文档只做显式绑定和观察，不能用新页面结清旧 effect。

```powershell
node --experimental-sqlite $Cli game-session --goal "$Run\goal-wardrobe" --operation status
node --experimental-sqlite $Cli game-session --goal "$Run\goal-wardrobe" --operation resume --test-environment yes

# 仅当现场已核对同一 owned 浏览器、target、实际 URL 且需要新文档观察
node "$Lab\bind-owned.cjs" $History $HostJson 'REVIEWED_TARGET_ID' $GameUrl "$Run\NEW-host.json"
```

多标签再加一个同标题独立测试页；实际同 URL 的重复页必须按 ID 选择。关闭原目标应拒绝，不自动落到另一个游戏页。浏览器重启不复用旧 PID/socket/host.json；新浏览器/data continuity 需要新证据，旧 pending 不消失。

## 5. 结果记录与完成条件

在同一实验记录 Windows 的输入身份、接入方式、操作顺序、DOM/游戏原状态、attempt 与回执、Session pending/budget、清理和拒绝原文。先前 Mac 18 项、历史 Windows 15 组、The Hand 启动数据分列。

达到“识别真实游戏与场景→实际控件交互→原状态变化一致→一个确实命中的中断/恢复窗口”即可评价该 PC 流程，不扩为全 Mod/全玩法。若只完成启动/导航而没有命中中断窗口，准确记录已完成部分。游戏资源、保存内容、截图和原日志仅留本地；回传报告只含获审摘要。

若原 native provider 在 PC 真实场景通过，下一步把 owned attach/explicit rebind 与当前 6.1 执行上下文整合；若失败，按宿主准入、文档识别、业务 guard/terminal 分层修复，不直接推翻 PC 路线，也不原样搬回整个旧分支。
