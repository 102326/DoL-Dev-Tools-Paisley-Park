# 独立 Skill 安装

Tools保存采集器、CLI和格式；Skill选择诊断/复现/开发路径，调用同一份Tools与目标项目自己的构建部署命令。仓库内Skill可直接使用，也可装入本机Codex Skill目录，不复制Runtime或第三方项目。

```powershell
node scripts/dol-dev.cjs install-skill --out C:/Users/YOUR_USER/.codex/skills/dol-dev-tools
node C:/Users/YOUR_USER/.codex/skills/dol-dev-tools/scripts/resolve.cjs
```

安装目标必须是尚不存在的`dol-dev-tools`目录。已有安装会拒绝覆盖；本命令不下载、删除或自动更新。安装内容只有SKILL.md、位置解析器和本地tool-location.json；说明链接指向同一份Tools文档。工具包本体需要留在原位置；源码包不包含机器专属位置记录。

解析器核对绝对路径、包名、版本、真实CLI位置和基础文档；这是位置检查，不证明代码可信。先检查来源，再执行。安装后从下一次对话回合开始发现；当前回合显式读取可以验证行为，但不能冒充宿主自动发现验收。

移动Tools或恢复安装时，先核对新路径，再在当前进程设置`DOL_DEV_TOOLS_HOME`；它优先于安装记录和仓库相对位置。旧记录失效会停止，不扫描私有目录或自行下载替代包。搬迁后说明中的机器专属链接也可能过期，以解析结果中的docs为准；更新安装前保留旧目录，再向新的空目标安装。

当前机器已实际安装，并由独立任务使用安装副本完成已有WebView前后Evidence的比较和本地报告；没有重新连接设备、上传或复制Tools。该证明覆盖显式使用与定位，不保证每个自然语言提示都会触发Skill，也不代替游戏业务验收。

1.4已将原生和真实业务目标配方加入Skill路由，并保留证明边界。旧安装先移到独立本地备份，再向空目标安装；UTF-8模式quick_validate及resolver通过，定位1.4.0。原生/业务配方不是通用授权，不自动安装未知APK或修改另一项目的Runtime。

1.4独立前向任务使用安装副本完成真实业务设置CSS的两次比较和重启后Evidence报告，三条CLI均complete/exit0。它将“采集完整”“CSS无差异”和“业务/存档正确”区分，未连接设备或把目录名当作重启证明。
