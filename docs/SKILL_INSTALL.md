# DoL Dev Tools: Paisley Park — 独立 Skill 安装

Tools保存采集器、CLI和格式；Skill选择诊断/复现/开发路径，调用同一份Tools与目标项目自己的构建部署命令。仓库内Skill可直接使用，也可装入本机Codex Skill目录，不复制Runtime或第三方项目。

```powershell
node scripts/dol-dev.cjs install-skill --out C:/Users/YOUR_USER/.codex/skills/dol-dev-tools-paisley-park
node C:/Users/YOUR_USER/.codex/skills/dol-dev-tools-paisley-park/scripts/resolve.cjs
```

安装目标必须是尚不存在的`dol-dev-tools-paisley-park`目录。已有安装会拒绝覆盖；本命令不下载、删除或自动更新。安装内容为SKILL.md、位置解析器、显示名元数据agents/openai.yaml和本地tool-location.json；说明链接指向同一份Tools文档。工具包本体需要留在原位置；源码包不包含机器专属位置记录。

解析器核对绝对路径、包名、版本、真实CLI位置和基础文档；这是位置检查，不证明代码可信。先检查来源，再执行。安装后从下一次对话回合开始发现；当前回合显式读取可以验证行为，但不能冒充宿主自动发现验收。

当前安装版为 3.0.3 Gold Experience Requiem。先在新的稳定 Tools 目录准备 Gameplay 依赖；完整备份旧 Skill，再向空目标执行上方安装命令，核对 resolver、生成文档链接和实际 CLI 版本。旧 v3.0.0 Foundation 与[撤版记录](WITHDRAWAL_3.0.0.md)保留；新[收口](CLOSEOUT_3_0_3.md)与[工作流](GAMEPLAY.md)是本版本依据。安装不迁移旧私有 journal、不清共享 Store/未决 effect，也不保证每种自然语言提示都会自动触发 Skill。

移动Tools或恢复安装时，先核对新路径，再在当前进程设置`DOL_DEV_TOOLS_HOME`；它优先于安装记录和仓库相对位置。旧记录失效会停止，不扫描私有目录或自行下载替代包。搬迁后说明中的机器专属链接也可能过期，以解析结果中的docs为准；更新安装前保留旧目录，再向新的空目标安装。

当前机器已实际安装，并由独立任务使用安装副本完成已有WebView前后Evidence的比较和本地报告；没有重新连接设备、上传或复制Tools。该证明覆盖显式使用与定位，不保证每个自然语言提示都会触发Skill，也不代替游戏业务验收。

1.4已将原生和真实业务目标配方加入Skill路由，并保留证明边界。旧安装先移到独立本地备份，再向空目标安装；UTF-8模式quick_validate及resolver通过，定位1.4.0。原生/业务配方不是通用授权，不自动安装未知APK或修改另一项目的Runtime。

1.4独立前向任务使用安装副本完成真实业务设置CSS的两次比较和重启后Evidence报告，三条CLI均complete/exit0。它将“采集完整”“CSS无差异”和“业务/存档正确”区分，未连接设备或把目录名当作重启证明。

1.5安装已保留旧副本备份，UTF-8 quick_validate与resolve通过，定位1.5.0。新增“不重复造轮子”路由，优先复用可用android-cli/android-profiler、Chrome DevTools与目标项目既有流程；不把这些Skill装进Tools、不复制工具实现、不要求缺失时自动安装。独立前向验证使用已有trace与现有分析工具，结果见[VALIDATION](VALIDATION.md)。

[1.5.2](RELEASE_1.5.2.md)将实战后的标准能力优先、点击失败诊断、范围收窄和直接探针/Journey边界纳入同一源码包。更新时保留旧Tools与Skill，将新包解压到新的稳定目录，再按上方既有安装命令生成指向新包的Skill；不是只改旧安装的文字。解析器版本、说明链接和生成指引应同时匹配新目录，避免重装回退。
