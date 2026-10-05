# 通用检查器与短时观察

这是开发工作区新增入口，尚未重新封装。所有 DOM 检查都不要求 Soft & Wet；每个输出使用新文件或目录，不覆盖旧证据。显式 CDP endpoint 的 App 关联由调用者核对；需要校验包/PID时使用 Evidence。短时观察不恢复历史。

```powershell
node scripts/dol-dev.cjs dom-inspect --mode selector-health --endpoint http://127.0.0.1:PORT --scope '#passages' --out artifacts/selector.json
node scripts/dol-dev.cjs dom-inspect --mode accessibility --endpoint http://127.0.0.1:PORT --scope '#passages' --out artifacts/accessibility.json
node scripts/dol-dev.cjs storage-snapshot --endpoint http://127.0.0.1:PORT --out artifacts/storage.json
node scripts/dol-dev.cjs storage-diff --before artifacts/storage.json --after artifacts/storage-after.json --out artifacts/storage-diff.json
node scripts/dol-dev.cjs timeline --endpoint http://127.0.0.1:PORT --scope '#passages' --milliseconds 1000 --out artifacts/timeline.json
node scripts/dol-dev.cjs evidence --serial DEVICE_SERIAL --package YOUR.APP.PACKAGE --out artifacts/inspectors --scope '#passages' --inspectors selector-health,accessibility,overlays,scroll,ownership,hitboxes --storage yes --timeline-ms 1000
```

| mode | 观察与限制 |
| --- | --- |
| selector-health | 匹配数量、唯一性，以及 nth-child/兄弟关系/长 class 链等脆弱性提示；零个或多个匹配仍返回数量。不是稳定性判决。 |
| accessibility | role、标签存在、hidden、tabIndex、可聚焦性、目标尺寸；仅简单不透明颜色属性计算对比估计，不读取标签正文，不验证图片/渐变/合成后对比或完整无障碍规范。 |
| overlays | position/z-index/opacity/transform/filter 的 stacking 提示与矩形；不推断全局绘制先后。 |
| scroll | overflow、scroll/client 尺寸和偏移、嵌套可滚动祖先。 |
| ownership | 缺少明确 Integration 时始终 unknown；不从类名猜作者。 |
| hitboxes | 矩形和最多 500 组相交关系；祖先与后代也可相交，不等于发生遮挡或点击失败。 |

除 selector-health 外，scope 必须唯一。最多 200 个节点、8 层，使用结构地址；不读 text/value/HTML。到达限额时标 truncated，不能把遗漏视作不存在。

Storage 只读 local/session 键集合与数量，名称使用 SHA-256；不调用 getItem。每区最多 200 个键、名称最多 128 字符。哈希是可关联标识，不能当作匿名化证明。IndexedDB 只枚举最多 10 个数据库、每库最多 50 个 store，记录名称哈希/版本/只读 count；不读取记录、游标或包体。枚举能力不可用时不猜库名。打开后发生升级竞态会 abort，结束或 8 秒截止时中止自有事务、关闭自有句柄。局部快照不完整时 Diff 标为 unobserved，不推断删除；不同时间的 count 变化也不能解释记录内容。

Timeline 为 1..10000ms 窗口，最多 500 条结构记录：click/pointer/input/change/focus/blur/submit，Mutation 种类/数量/属性名，Error 类别/行列，以及支持时的 Long Task。默认不保存事件正文、输入、文本、URL、错误消息或 rejection 正文。顺序是该页面窗口内的观察顺序，不证明因果。

`--observer-instrumentation yes` 才临时观察窗口内新建 Mutation/Resize/IntersectionObserver 的构造和方法调用。已有实例、callback 执行次数不追踪；不替换 callback、不 disconnect 项目 Observer。只在可安全覆盖数据描述符时包装，最多弱引用 128 个实例；结束后按完整描述符复原。第三方修改或 freeze 导致冲突时不覆盖，残留包装停用并记录 cleanupConflicts，采集失败/CLI 返回 1。初始化异常也清理已经登记的资源。CDP 断开不保证立刻撤销页面内观察；页面窗口的定时 finally 仍负责清理，页面导航/销毁则结束该上下文。

Evidence 可组合以上显式选项；缺失 CDP 保留其它资料。Journey checkpoint 的 capture 也可选择这些 mode、storage 和 timeline；timeline 需额外给 `timelineMs`，可给布尔 `observerInstrumentation`。观察窗口单独运行，不假设其涵盖此前或之后的动作。
