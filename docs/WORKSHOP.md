# 修改、构建、部署与复验

Workshop 是 Skill 的开发闭环：用 Tools 观察现场，用目标项目自己的源码和构建/部署命令修改，最后回到同一问题复验。Tools 不新增通用 shell/业务脚本执行框架，也不接管 ModLoader 或项目 Runtime。

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
