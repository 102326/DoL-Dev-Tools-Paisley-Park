# 修改、构建、部署与复验

Workshop 是 Skill 的开发闭环：用 Tools 观察现场，用目标项目自己的源码和构建/部署命令修改，最后回到同一问题复验。Tools 不新增通用 shell/业务脚本执行框架，也不接管 ModLoader 或项目 Runtime。

后续[原生与APK目标配方](NATIVE_RECREATE.md)已实机验证Activity及其WebView重建、真实游戏APK的同签名更新和自有sentinel保留。它使用独立离线包名，和以下DOM/隔离origin夹具分别证明；不替代真实业务Mod更新或全部存档验收。

1. 核对用户目标、测试设备/App、当前页面、版本与实际现场。先保存 scoped DOM/CSS、必要画面或日志；无法归属到源码时保留未知，先用公开 Integration 补证据。
2. 将观察关联到明确的源码路径和行为要求。保留无关修改；只改已定位的代码，使用项目既有检查。测试通过只证明其覆盖范围。
3. 使用目标项目既有构建命令，保存源码 revision/工作区变更与制品 SHA。构建成功与新包已加载是不同证据；不能把浏览器热更新视作 APK 已部署。
4. 按目标项目部署流程核对目标、版本、输出范围与恢复方法。记录部署制品 SHA、安装/加载结果。APK 更新需确认签名、包名和保留数据的方式；不为了部署卸载 App、清空正式数据或覆盖真实存档。
5. 回到同一页面/动作，确认新制品实际加载；用原问题的最小复验与前后 Evidence/Diff。失败保留 successful checkpoints，停止后续依赖步骤，不自动重试操作或改 Golden 来通过。

Activity/WebView 原生 recreate、凭据解锁或专有 Mod 热替换依赖目标项目自己的公开能力和权限；没有桥时报告 conditional/unsupported。不能用普通 Page.reload 冒充原生 WebView 重建。

## 可运行的独立夹具

仓库提供 [examples/workshop](../examples/workshop/verify.cjs)。它只复制自有 HTML/build/deploy 到调用者指定的新目录，使用已有 Chromium 浏览器和 localhost。无需 npm 依赖；不会修改任何真实 Mod 或 Android App。默认使用 Windows 已安装 Edge，可用进程环境 DOL_WORKSHOP_BROWSER 明确指定已有 Chromium 浏览器。

```powershell
node examples/workshop/verify.cjs artifacts/workshop-001
```

夹具按明确行为要求定位 20×20 按钮，修改复制出的源码为48×48，再执行该夹具自己的 build/deploy。源码、dist 和部署副本 SHA 一致；CDP 重载后读取实际矩形；保存 before/after Evidence-compatible manifest、CSS/DOM/Hitbox、私有截图、Compare、Issue Report 与 workshop.json。后者关联两个 incident 及阶段来源，不冒充普通 Evidence manifest。成功不是通用按钮尺寸规范或真实 DoL Mod 验收。

初次夹具运行在最终断言使用了错误的比较字段 name，保留 partial；诊断后修正为公共格式 step，再用新目录验证通过。没有覆盖失败结果，也没有通过自动重试掩盖问题。最新 Hitbox 扩展也在该夹具现场验证，20与48像素的前后截图已人工查看。

标准格式检查还发现旧夹具缺少必需privacy与step来源/时间字段；宽松消费器可读不代表Schema合格。已在真实采集前后记录这些元信息，最新新目录闭环及公共Schema通过；6份旧夹具manifest按预期拒绝并保留，不回填伪造采集时间。

```powershell
node scripts/dol-dev.cjs hitbox-overlay --input artifacts/workshop-001/before/hitboxes.json --out artifacts/workshop-001/before.svg
```

SVG 只画结构地址/数值矩形和明确标注的尺寸、中心采样提示，不写原文或图片。它与截图分别审查，未声称矩形就是全部点击区域。目标项目真机 Build→Deploy→Verify 的证明仍须由对应源码、制品、加载结果和现场复验形成；此夹具只证明 Tools/Skill 可完成受控浏览器开发闭环。

## 已授权 App 的临时 WebView 夹具

另有 [verify-webview.cjs](../examples/workshop/verify-webview.cjs)，只部署仓库固定 [webview-fixture.js](../examples/workshop/webview-fixture.js) 的复制品；不是任意脚本 runner。

```powershell
node examples/workshop/verify-webview.cjs DEVICE_SERIAL YOUR.APP.PACKAGE artifacts/webview-workshop-001 --test-environment=yes
```

要求明确测试环境、唯一App PID/标准page与已有ADB。它执行一次显式wake，创建自己的动态转发；按复制项目固定build/deploy命令形成SHA一致的制品，再通过CDP加载到随机唯一ID的自有节点。源码20→48的修改在实际WebView矩形上验证；前后只保存自有scope CSS和公共manifest，不采整个页面画面、日志或业务数据。

节点只有行内样式、pointer-events:none/aria-hidden，未注册监听器、使用游戏对象/存储或修改全局CSS。已有同ID节点或自有内容身份冲突时拒绝覆盖。结束在原session中只移除自有节点并确认不存在，再核对转发映射后清理自建端口；不明则partial，不自动重试或猜删。

当前授权App的实际运行complete：20×20→48×48、制品SHA一致、节点确认不存在、转发移除；4份Manifest/Envelope标准Schema合格。这证明了真机WebView临时开发闭环，仍不是持久业务Mod安装、APK更新或游戏业务验收。

## 隔离的持久 Mod 制品验收

[verify-mod.cjs](../examples/workshop/verify-mod.cjs)使用调用者已有的带ModLoader游戏HTML、已有Chromium和Python标准库zipfile；它不下载或分发游戏/加载器。

```powershell
node examples/workshop/verify-mod.cjs PATH_TO_EXISTING_GAME_HTML artifacts/mod-workshop-001 --isolated-browser=yes
```

只创建独立localhost和全新浏览器profile，不打开现有profile、连接手机或改原HTML。在内存副本里只将唯一标准`window.modDataValueZipList = [...]`数据块替换为空数组，排除内置第三方Mod；其它结构不匹配就拒绝。CSP限制页面网络/资源，服务器不代理或提供游戏资产；这不是完整游戏表现测试。

固定自有[Mod源码](../examples/workshop/mod-fixture.js)与boot.json构建为真正`.mod.zip`，ZIP校验逐文件一致；通过公开ModLoadController仅向这个新profile持久存入自己的唯一Mod。确认新document loader ID后，公开ModInfo报告来源IndexDB、版本及自有preload源SHA；同scope CSS实测20×20→48×48，前后公共Manifest/Envelope和Compare保留。未知API、异常来源或其它存储条目会停止；不接管ModLoader初始化或使用lazy-register冒充安装。

实际运行complete / exit0，4份公共格式标准Schema通过。前期本地IP解析规则阻断页面，以及reload旧context竞态分别失败并保留；修复的是夹具隔离/等待条件，没有改加载器或自动重试操作。ZIP可在启动后释放，所以源SHA读取的是公开ModInfo内本夹具自己的preload源，只有SHA进入报告。

全新profile及自有Mod副本保留在指定输出目录作为本地证据，浏览器关闭；不清理或导入真实游戏存档。桌面持久Mod证明与Android临时节点证明分开，二者不能合并成Android持久Mod/APK安装验收。真实业务项目仍使用自己公开的构建、部署和业务复验路径。

## Android WebView 隔离 origin 的持久 Mod 夹具（1.2发布后开发）

[verify-android-mod.cjs](../examples/workshop/verify-android-mod.cjs)复用上面已完成的桌面Workshop制品与SHA，仅在明确测试App中创建自有iframe。需已有ADB、Python标准库、标准游戏page和支持`uniqueContextId`的CDP；不支持所需元信息/API就停止。

```powershell
node examples/workshop/verify-android-mod.cjs DEVICE_SERIAL YOUR.APP.PACKAGE PATH_TO_EXISTING_GAME_HTML COMPLETE_DESKTOP_WORKSHOP_DIR artifacts/android-mod-workshop-001 --test-environment=yes
```

一次wake后有界等待目标App进入前台；固定父frame/loader/URL及唯一执行context，不追随导航。自建HTTP服务器只提供随机路径的空白预检页和经过SHA核对的游戏内存副本。挂载前在实际执行表达式里排除父页面同源；完整游戏执行前读取local/session数量、数据库/cache/Service Worker数量与可见Cookie存在性，不保留名称/值。请求含Cookie（包括HttpOnly）时服务器拒绝提供页面。发现既有状态或能力未知即停止，不清空存储。空白预检只证明观测时状态为空，不证明该origin从未被使用或消除其它进程并发写入。

确认空白预检后，公开ModLoadController仅向此origin持久存入固定自有ZIP。每阶段新建frame document，确认IndexDB来源、版本、自有preload源SHA和20×20→48×48 CSS；不读主游戏Mod清单、存档、正文或日志。最新实机complete/exit0，4份公共格式及2份CSS payload通过标准Schema和SHA关联检查。此证据证明Android WebView隔离origin内的持久Mod重载，仍不是主游戏业务Mod、App重启、原生WebView重建或APK部署验收。

自有iframe、Runtime域、HTTP及转发分别记录清理；origin内自有夹具数据可保留，不清数据。Reverse使用`--no-rebind`，只有创建ACK确认且当前pair精确匹配才移除；未知ACK不猜删。所有Workshop/Evidence/Journey的Forward清理共用完整serial/动态port/remote socket匹配与移除后确认。ADB没有原子比较删除命令，调用者不得并发重绑这些临时映射；发现已变化则停止清理并保留unknown，不自动重试。
