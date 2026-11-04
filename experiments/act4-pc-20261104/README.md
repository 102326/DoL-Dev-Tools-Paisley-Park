# ACT4 PC 无内容实验

范围、证据和取舍见 [REPORT.md](REPORT.md)，Windows 真游戏步骤见 [WINDOWS.md](WINDOWS.md)。生产代码未改；需要另外取得固定 ACT4 历史仓库 `52a8893910c57ed420587c137472ffb008567b18`。该仓库私有，不随本目录复制其源码或游戏。

从当前工作区运行，`HISTORY_ROOT` 是已审历史仓库根目录（不是本实验目录）：

```sh
# 终端 1：只提供自建 fixture，不暴露工作区
node experiments/act4-pc-20261104/server.cjs 18764

# 终端 2：须有已安装 Chrome，输出目录不得存在，其父目录须存在
DOL_TUSK_CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' \
  node experiments/act4-pc-20261104/verify.cjs HISTORY_ROOT artifacts/act4-pc-NEW
```

Node 26.13.0 / Chrome 156.0.8078.73 是本次输入，不代表已测试全部版本。历史依赖按锁安装到历史目录：`npm ci --ignore-scripts --no-audit --no-fund`，缓存完整时可加 `--offline`。原样 M2：在历史目录设置同一 `DOL_TUSK_CHROME`，运行 `node --experimental-sqlite experiments/tusk-act4/verify-m2.cjs artifacts/NEW-M2`；先运行其 `.agents/skills/dol-dev-tools-paisley-park/scripts/resolve.cjs` 确认入口。

Codex 原生 UI 对照：新标签打开 `http://127.0.0.1:18764/?case=native`，进入工坊→制作一次→保存→重置→读取。确认 workshop/1。另开 `?case=decoy-native` 同标题标签，回到原页；刷新、读取、点击导航、再读取。每次用当前实际 URL/文档/AX 核对，不复用旧 AX 序号。页面状态 JSON 可直接对照可见数值。

新 helper 仅接原 launcher 创建的 owned 浏览器，同一明确 HTTP origin；不会接日常 Profile，不会自动换页或结清任何 effect：

```sh
node experiments/act4-pc-20261104/bind-owned.cjs \
  HISTORY_ROOT ABS_ORIGINAL_HOST_JSON EXACT_TARGET_ID EXACT_URL NEW_HOST_JSON
```

输出为**新** host.json，供原 ACT4 `--host chrome --host-file ABS_NEW_HOST_JSON` 使用。输入可从已有受控 host 的已审清单选择 target，不按标题猜选。重复 URL 的多个页面必须明确 ID；URL/target 不匹配时拒绝。重新绑定表示新文档观察/执行合同，不能把旧 GER Session pending 搬过来确认成功。

`results.json` 是经过本轮核对的轻量结果；完整 Profile/SQLite/PNG/失败日志留 ignored artifacts。测试页持久化仅用 `act4-neutral-v1:<case>` 键，`reset` 不清保存值；独立 Profile 留存供审计。退出服务用该服务终端 Ctrl+C；verify 结束仅关闭自身浏览器，不删除 Profile 或 pending。
